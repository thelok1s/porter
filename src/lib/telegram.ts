import logger from "@/lib/logger";
import { db } from "@/lib/database";
import config from "../../porter.config";
import { tgApi, tgChannelPublicLink, tgChatId, vkGlobalApi } from "@/lib/api";
import { getVkLink } from "@/lib/vkontakte";

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}

export async function telegramPoster(post: any) {
  if (config.crossposting.parameters.ignoreReposts && post.isRepost) {
    logger.info(
      `Reposts are ignored, skipping (${getVkLink(post.wall.id, post.wall.ownerId)})`,
    );
    return;
  }
  if (db.query("SELECT * FROM posts WHERE vk_id = ?").get(post.wall.id)) {
    logger.warn(
      `Post already in db, skipping (${getVkLink(post.wall.id, post.wall.ownerId)})`,
    );
    return;
  }

  try {
    // Check for attachments
    if (post.wall.attachments.toString().length > 0) {
      let textSent = false;
      const photoUrls = [];

      for (const attachment of post.wall.attachments) {
        if (
          attachment.toJSON().largeSizeUrl ||
          attachment.toJSON().mediumSizeUrl ||
          attachment.toJSON().smallSizeUrl
        ) {
          const url =
            attachment.toJSON().largeSizeUrl ||
            attachment.toJSON().mediumSizeUrl ||
            attachment.toJSON().smallSizeUrl;
          photoUrls.push({
            type: "photo",
            media: url,
          });
        }
      }

      // Multiple photos
      if (photoUrls.length > 1) {
        photoUrls[0].caption = post.wall.text;
        await tgApi.telegram
          .sendMediaGroup(tgChannelPublicLink, photoUrls)
          .then(async (messages) => {
            const textHash = new Bun.CryptoHasher("md5");
            textHash.update(post.wall.text);
            db.run(
              "INSERT INTO posts (vk_id, vk_owner_id, tg_id, discussion_tg_id, tg_author_id, created_at, text_hash, attachments) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
              [
                post.wall.id,
                post.wall.ownerId,
                messages[0].message_id,
                null,
                JSON.stringify(messages[0].from.id),
                post.wall.createdAt,
                textHash.digest("base64"),
                JSON.stringify(post.wall.attachments),
              ],
            );
          });
        textSent = true;

        // One photo
      } else if (photoUrls.length === 1) {
        await tgApi.telegram
          .sendPhoto(tgChannelPublicLink, photoUrls[0].media, {
            caption: post.wall.text,
          })
          .then(async (message) => {
            const textHash = new Bun.CryptoHasher("md5");
            textHash.update(post.wall.text);
            db.run(
              "INSERT INTO posts (vk_id, vk_owner_id, tg_id, discussion_tg_id, tg_author_id, created_at, text_hash, attachments) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
              [
                post.wall.id,
                post.wall.ownerId,
                message.message_id,
                null,
                JSON.stringify(message.from.id),
                post.wall.createdAt,
                textHash.digest("base64"),
                JSON.stringify(post.wall.attachments),
              ],
            );
          });
        textSent = true;
      }

      // Files
      for (const attachment of post.wall.attachments) {
        // File (GIF specifically)
        if (
          Object.prototype.hasOwnProperty.call(attachment.toJSON(), "extension")
        ) {
          logger.info("Adding a file");
          await tgApi.telegram
            .sendAnimation(
              tgChannelPublicLink,
              attachment.toJSON().url,
              !textSent ? { caption: post.wall.text } : {},
            )
            .then(async (message) => {
              const textHash = new Bun.CryptoHasher("md5");
              textHash.update(post.wall.text);
              // Store both IDs
              db.run(
                "INSERT INTO posts (vk_id, vk_owner_id, tg_id, discussion_tg_id, tg_author_id, created_at, text_hash, attachments) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [
                  post.wall.id,
                  post.wall.ownerId,
                  message.message_id,
                  null,
                  JSON.stringify(message.from.id),
                  post.wall.createdAt,
                  textHash.digest("base64"),
                  JSON.stringify(post.wall.attachments),
                ],
              );
            });
          textSent = true;
        }
        // Audio
        if (
          Object.prototype.hasOwnProperty.call(attachment.toJSON(), "genreId")
        ) {
          logger.warn("Audio detected: it will not be processed");
          // TODO: Audio support (audio.get)
        }
      }
    } else {
      // If no attachments
      await tgApi.telegram
        .sendMessage(tgChannelPublicLink, post.wall.text)
        .then(async (message) => {
          const textHash = new Bun.CryptoHasher("md5");
          textHash.update(post.wall.text);
          db.run(
            "INSERT INTO posts (vk_id, vk_owner_id, tg_id, discussion_tg_id, tg_author_id, created_at, text_hash, attachments) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [
              post.wall.id,
              post.wall.ownerId,
              message.message_id,
              null,
              JSON.stringify(message.from.id),
              post.wall.createdAt,
              textHash.digest("base64"),
              JSON.stringify(post.wall.attachments),
            ],
          );
        });
    }
    logger.info(
      `Successful crosspost: (${getVkLink(post.wall.id, post.wall.ownerId)}) to Telegram`,
    );
  } catch (error) {
    logger.error(
      `Error while crossposting to Telegram:
          ${error.message}`,
    );
  }
}

export async function telegramCommenter(comment: any) {
  try {
    // Check if comment already exists
    const existingComment = db
      .query("SELECT * FROM comments WHERE vk_comment_id = ?")
      .get(comment.id);

    const post = db
      .query("SELECT discussion_tg_id FROM posts WHERE vk_id = ?")
      .get(comment.objectId);

    if (!post?.discussion_tg_id) {
      logger.warn(`Discussion not found for msg id: ${comment.objectId}`);
      return;
    }

    const [sender] = await vkGlobalApi.users.get({
      user_ids: comment.fromId,
    });

    if (comment.isNew || comment.isRestore) {
      if (existingComment) {
        logger.warn(`Comment already processed: ${comment.id} `);
        return;
      }
      const mdText = escapeMarkdown(comment.toJSON().text);
      const message = await tgApi.telegram.sendMessage(
        tgChatId,
        `[${sender.first_name} ${sender.last_name}](https://www.vk.com/id${sender.id}): ${mdText}`,
        {
          reply_parameters: {
            chat_id: tgChatId,
            message_id: post.discussion_tg_id,
          },
          parse_mode: "MarkdownV2",
          link_preview_options: { is_disabled: true },
        },
      );

      const textHash = new Bun.CryptoHasher("md5");
      textHash.update(comment.text);

      db.run(
        `INSERT INTO comments (
            vk_post_id,
            vk_comment_id,
            vk_owner_id,
            tg_comment_id,
            discussion_tg_id,
            tg_author_id,
            created_at,
            text_hash,
            attachments
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          comment.objectId,
          comment.id,
          comment.ownerId,
          message.message_id,
          post.discussion_tg_id,
          message.from.id,
          comment.toJSON().createdAt,
          textHash.digest("base64"),
          JSON.stringify(comment.toJSON().attachments),
        ],
      );
      logger.info(`Comment added: ${comment.id} (for msg: ${post.tg_id})`);
    } else if (comment.isEdit) {
      const commentRecord = db
        .query("SELECT tg_comment_id FROM comments WHERE vk_comment_id = ?")
        .get(comment.id);

      if (!commentRecord?.tg_comment_id) {
        logger.error(`Cannot find comment to edit: ${comment.id}`);
        return;
      }

      const mdText = escapeMarkdown(comment.toJSON().text);

      await tgApi.telegram.editMessageText(
        tgChatId,
        commentRecord.tg_comment_id,
        undefined,
        `[${sender.first_name} ${sender.last_name}](https://www.vk.com/id${sender.id}): ${mdText}`,
        {
          parse_mode: "MarkdownV2",
          link_preview_options: { is_disabled: true },
        },
      );

      const textHash = new Bun.CryptoHasher("md5");
      textHash.update(comment.text);
      db.run("UPDATE comments SET text_hash = ? WHERE vk_comment_id = ?", [
        textHash.digest("base64"),
        comment.id,
      ]);
    } else if (comment.isDelete) {
      const commentRecord = db
        .query("SELECT tg_comment_id FROM comments WHERE vk_comment_id = ?")
        .get(comment.id);

      if (!commentRecord?.tg_comment_id) {
        logger.error(`Cannot find comment to delete: ${comment.id}`);
        return;
      }

      await tgApi.telegram.deleteMessage(tgChatId, commentRecord.tg_comment_id);
      db.run("DELETE FROM comments WHERE vk_comment_id = ?", [comment.id]);
    }
  } catch (error) {
    logger.error(`Error handling comment ${comment?.id}: ${error}`);
  }
}
