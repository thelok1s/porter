import config from "../../porter.config";
import logger from "@/lib/logger";
import { db } from "@/db/database";
import { tgApi, tgChannelPublicLink, tgChatId, vkGlobalApi } from "@/lib/api";
import { getVkLink } from "@/lib/vkontakte";
import { Post } from "@/interfaces/Post";
import { Reply } from "@/interfaces/Reply";
import { InputMediaPhoto } from "telegraf/types";

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}

export async function postToTelegram(post: any) {
  logger.debug(post.toJSON());
  // Check if repost
  if (config.crossposting.parameters.ignoreReposts && post.isRepost) {
    logger.info(
      `Reposts are ignored, skipping (${getVkLink(post.wall.id, post.wall.ownerId)})`,
    );
    return;
  }
  // Check if duplicate
  if (db.query("SELECT * FROM posts WHERE vk_id = ?").get(post.wall.id)) {
    logger.warn(
      `Already ported post (${getVkLink(post.wall.id, post.wall.ownerId)})`,
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
      `[VK –> TG] Successfully ported: ${getVkLink(post.wall.id, post.wall.ownerId)}`,
    );
  } catch (error) {
    logger.error(`[VK -/-> TG] Error while porting: ${error.message}`);
  }
}

export async function replyToTelegram(reply: any) {
  logger.debug(reply.toJSON());
  try {
    const post: Post = db
      .query("SELECT discussion_tg_id FROM posts WHERE vk_id = ?")
      .get(reply.objectId) as Post;

    if (!post?.discussion_tg_id) {
      logger.warn(`Discussion not found for msg id: ${reply.objectId}`);
      return;
    }

    const [sender] = await vkGlobalApi.users.get({
      user_ids: reply.fromId,
    });

    if (reply.isNew || reply.isRestore) {
      // Prevent known duplicates
      if (
        db.query("SELECT * FROM replies WHERE vk_reply_id = ?").get(reply.id)
      ) {
        logger.warn(`Reply already ported: ${reply.id} `);
        return;
      }

      const mdText = escapeMarkdown(reply.toJSON().text);

      // Check for attachments
      if (reply.attachments.toString().length > 0) {
        const photoUrls = [];

        for (const attachment of reply.attachments) {
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
          const mediaGroup: InputMediaPhoto[] = photoUrls.map((photo, index) => ({
            type: 'photo' as const,
            media: photo.media,
            ...(index === 0 ? {
              caption: `[${sender.first_name} ${sender.last_name}](https://www.vk.com/id${sender.id}): ${mdText}`,
              parse_mode: "MarkdownV2"
            } : {})
          }));

          const reply_msg = await tgApi.telegram.sendMediaGroup(
            tgChatId,
            mediaGroup,
            {
              reply_parameters: {
                chat_id: tgChatId,
                message_id: post.discussion_tg_id,
              }
            },
          );

          const textHash = new Bun.CryptoHasher("md5");
          textHash.update(reply.text);

          db.run(
            `INSERT INTO replies (
            vk_post_id,
            vk_reply_id,
            vk_owner_id,
            tg_reply_id,
            discussion_tg_id,
            tg_author_id,
            created_at,
            text_hash,
            attachments
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              reply.objectId,
              reply.id,
              reply.ownerId,
              reply_msg[0].message_id,
              post.discussion_tg_id,
              reply_msg[0].from.id,
              reply.toJSON().createdAt,
              textHash.digest("base64"),
              JSON.stringify(reply.toJSON().attachments),
            ],
          );

          // One photo
        } else if (photoUrls.length === 1) {
          const reply_msg = await tgApi.telegram.sendPhoto(
            tgChatId,
            photoUrls[0].media,
            {
              caption: `[${sender.first_name} ${sender.last_name}](https://www.vk.com/id${sender.id}): ${mdText}`,
              parse_mode: "MarkdownV2",
              reply_parameters: {
                chat_id: tgChatId,
                message_id: post.discussion_tg_id,
              },
            },
          );

          const textHash = new Bun.CryptoHasher("md5");
          textHash.update(reply.text);

          db.run(
            `INSERT INTO replies (
            vk_post_id,
            vk_reply_id,
            vk_owner_id,
            tg_reply_id,
            discussion_tg_id,
            tg_author_id,
            created_at,
            text_hash,
            attachments
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              reply.objectId,
              reply.id,
              reply.ownerId,
              reply_msg.message_id,
              post.discussion_tg_id,
              reply_msg.from.id,
              reply.toJSON().createdAt,
              textHash.digest("base64"),
              JSON.stringify(reply.toJSON().attachments),
            ],
          );

          // File (GIF specifically)
        } else if (
          Object.prototype.hasOwnProperty.call(
            reply.attachments[0].toJSON(),
            "extension",
          )
        ) {
          const reply_msg = await tgApi.telegram.sendAnimation(
            tgChatId,
            reply.attachments[0].toJSON().url,
            {
              caption: `[${sender.first_name} ${sender.last_name}](https://www.vk.com/id${sender.id}): ${mdText}`,
              reply_parameters: {
                chat_id: tgChatId,
                message_id: post.discussion_tg_id,
              },
              parse_mode: "MarkdownV2",
            },
          );

          const textHash = new Bun.CryptoHasher("md5");
          textHash.update(reply.text);

          db.run(
            `INSERT INTO replies (
                vk_post_id,
                vk_reply_id,
                vk_owner_id,
                tg_reply_id,
                discussion_tg_id,
                tg_author_id,
                created_at,
                text_hash,
                attachments
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              reply.objectId,
              reply.id,
              reply.ownerId,
              reply_msg.message_id,
              post.discussion_tg_id,
              reply_msg.from.id,
              reply.toJSON().createdAt,
              textHash.digest("base64"),
              JSON.stringify(reply.toJSON().attachments),
            ],
          );
        }
      } else {
        // If no attachments
        const reply_msg = await tgApi.telegram.sendMessage(
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
        textHash.update(reply.text);

        db.run(
          `INSERT INTO replies (
            vk_post_id,
            vk_reply_id,
            vk_owner_id,
            tg_reply_id,
            discussion_tg_id,
            tg_author_id,
            created_at,
            text_hash,
            attachments
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            reply.objectId,
            reply.id,
            reply.ownerId,
            reply_msg.message_id,
            post.discussion_tg_id,
            reply_msg.from.id,
            reply.toJSON().createdAt,
            textHash.digest("base64"),
            JSON.stringify(reply.toJSON().attachments),
          ],
        );
        logger.info(
          `[VK –> TG] Reply ported: ${reply.id} (for msg: ${reply_msg.message_id})`,
        );
      }
    } else if (reply.isEdit) {
      const replyRecord: Reply = db
        .query("SELECT tg_reply_id FROM replies WHERE vk_reply_id = ?")
        .get(reply.id) as Reply;

      if (!replyRecord?.tg_reply_id) {
        logger.error(`Cannot find reply to edit: ${reply.id}`);
        return;
      }

      const mdText = escapeMarkdown(reply.toJSON().text);

      await tgApi.telegram.editMessageText(
        tgChatId,
        replyRecord.tg_reply_id,
        undefined,
        `[${sender.first_name} ${sender.last_name}](https://www.vk.com/id${sender.id}): ${mdText}`,
        {
          parse_mode: "MarkdownV2",
          link_preview_options: { is_disabled: true },
        },
      );

      const textHash = new Bun.CryptoHasher("md5");
      textHash.update(reply.text);
      db.run("UPDATE replies SET text_hash = ? WHERE vk_reply_id = ?", [
        textHash.digest("base64"),
        reply.id,
      ]);
    } else if (reply.isDelete) {
      const replyRecord: Reply = db
        .query("SELECT tg_reply_id FROM replies WHERE vk_reply_id = ?")
        .get(reply.id) as Reply;

      if (!replyRecord?.tg_reply_id) {
        logger.error(`Cannot find reply to delete: ${reply.id}`);
        return;
      }

      await tgApi.telegram.deleteMessage(tgChatId, replyRecord.tg_reply_id);
      db.run("DELETE FROM replies WHERE vk_reply_id = ?", [reply.id]);
    }
  } catch (error) {
    logger.error(`Error handling reply ${reply?.id}: ${error}`);
  }
}
