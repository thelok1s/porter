import { Telegraf } from "telegraf";
import logger from "@/lib/logger";
import { db } from "@/lib/database";
import config from "../../porter.config";

export async function telegramPoster(post: any) {
  if (config.crossposting.parameters.ignoreReposts && post.isRepost) {
    logger.info("Reposts are ignored, skipping...");
    return;
  }
  if (db.query("SELECT * FROM posts WHERE vk_id = ?").get(post.wall.id)) {
    logger.warn(`Post ${post.wall.id} already in database, skipping...`);
    return;
  }

  try {
    // Check for attachments
    if (post.wall.attachments.toString().length > 0) {
      let textSent = false;
      const photoUrls = [];

      for (const attachment of post.wall.attachments) {
        logger.debug(`Attachment: ${attachment.type.toString()}`);
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
            // Store both IDs
            db.run(
              "INSERT INTO posts (vk_id, vk_owner_id, tg_id, tg_author_id, created_at, text, text_hash, attachments) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
              [
                post.wall.id,
                post.wall.ownerId,
                messages[0].message_id,
                JSON.stringify(messages[0].from),
                post.wall.createdAt,
                post.wall.text,
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

            // Store both IDs
            db.run(
              "INSERT INTO posts (vk_id, vk_owner_id, tg_id, tg_author_id, created_at, text, text_hash, attachments) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
              [
                post.wall.id,
                post.wall.ownerId,
                message.message_id,
                JSON.stringify(message.from),
                post.wall.createdAt,
                post.wall.text,
                textHash.digest("base64"),
                JSON.stringify(post.wall.attachments),
              ],
            );
          });
        textSent = true;
      }

      // Files
      for (const attachment of post.wall.attachments) {
        // File (gif specifically)
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
                "INSERT INTO posts (vk_id, vk_owner_id, tg_id, tg_author_id, created_at, text, text_hash, attachments) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [
                  post.wall.id,
                  post.wall.ownerId,
                  message.message_id,
                  JSON.stringify(message.from),
                  post.wall.createdAt,
                  post.wall.text,
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
          logger.warn("Audio detected: it will not be processed.");
          // TODO: Audio support audio.get
        }
      }
    } else {
      // Text only
      await tgApi.telegram
        .sendMessage(tgChannelPublicLink, post.wall.text)
        .then(async (message) => {
          const textHash = new Bun.CryptoHasher("md5");
          textHash.update(post.wall.text);

          // Store both IDs
          db.run(
            "INSERT INTO posts (vk_id, vk_owner_id, tg_id, tg_author_id, created_at, text, text_hash, attachments) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [
              post.wall.id,
              post.wall.ownerId,
              message.message_id,
              JSON.stringify(message.from),
              post.wall.createdAt,
              post.wall.text,
              textHash.digest("base64"),
              JSON.stringify(post.wall.attachments),
            ],
          );
        });
    }
    logger.info("Message sent to Telegram");
  } catch (error) {
    logger.error(
      `Error while sending message to Telegram:
          ${error.message}`,
    );
  }
}

export async function telegramCommenter(comment: any) {
  if (db.query("SELECT * FROM comments WHERE vk_id = ?").get(comment.id)) {
    logger.warn(`Comment ${comment.wall.id} already in database, skipping...`);
    return;
  }

  const [sender] = await vkGlobalApi.users.get({
    user_ids: comment.fromId,
  });

  // New (restored) comment
  if (comment.isNew || comment.isRestore) {
    await tgApi.telegram.sendMessage(
      tgChatId,
      `VK: ${sender.first_name} ${sender.last_name}: ${comment.toJSON().text}`,
      {
        reply_parameters: {
          chat_id: tgChatId,
          message_id: 1,
        },
      },
    );
  } else if (comment.isEdit) {
    // Comment is edited
    const originalPost = db
      .query("SELECT tg_id FROM posts WHERE vk_id = ?")
      .get(comment.objectId);
    if (!originalPost) {
      logger.warn(
        `No matching post found for VK post ID to EDIT: ${comment.toJSON().objectId}`,
      );
      return;
    }
    logger.debug(originalPost, originalPost.tg_id);

    await tgApi.telegram
      .editMessageText(
        tgChatId,
        originalPost.tg_id,
        null,
        `VK: ${sender.first_name} ${sender.last_name}: ${comment.toJSON().text}`,
      )
      .then((message) => {
        db.run("UPDATE comments SET text = ? WHERE tg_id = ?", [
          message.message_id,
          comment.toJSON().id,
        ]);
      });
  } else if (comment.isDelete) {
    // Comment is deleted
    const originalPost = db
      .query("SELECT tg_id FROM posts WHERE vk_id = ?")
      .get(comment.id);
    if (!originalPost) {
      logger.warn(
        `No matching post found for VK post ID to DELETE: ${comment.toJSON().objectId}`,
      );
      return;
    }

    await tgApi.telegram.deleteMessage(tgChatId, originalPost.tg_id);
  }
}