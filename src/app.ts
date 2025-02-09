import { Telegraf } from "telegraf";
import { VK, API } from "vk-io";
import { Database } from "bun:sqlite";
import dotenv from "dotenv";
import figlet from "figlet";

import logger from "@/lib/logger";
import config from "../porter.config";
dotenv.config();

const db = new Database("./src/lib/persistence.sqlite");
db.run(`
CREATE TABLE IF NOT EXISTS posts (
id INTEGER PRIMARY KEY,
vk_id INTEGER,
vk_owner_id INTEGER,
tg_id INTEGER,
discussion_tg_id INTEGER,
tg_author_id TEXT,
created_at TIMESTAMP,
text TEXT,
text_hash TEXT,
attachments TEXT,
UNIQUE(vk_id, tg_id, discussion_tg_id)
)
`);
db.run(`
CREATE TABLE IF NOT EXISTS comments (
id INTEGER PRIMARY KEY, state TEXT,
vk_id INTEGER,
vk_owner_id INTEGER,
tg_id INTEGER,
tg_author_id INTEGER,
created_at TIMESTAMP,
text TEXT,
text_hash TEXT,
attachments anyarray[]
)
`);

if (!process.versions.bun) {
  logger.fatal("Current environment is not Bun. Check README");
  process.exit(1);
}

if (!process.env.VK_TOKEN || !process.env.TELEGRAM_TOKEN) {
  logger.fatal("Environment variables are not set or .env is missing");
  process.exit(1);
}

const vkGroupApi = new VK({
  token: process.env.VK_TOKEN,
});
const vkGlobalApi = new API({
  token: process.env.VK_TOKEN,
});
const tgApi = new Telegraf(process.env.TELEGRAM_TOKEN);

const tgChannelId = process.env.TELEGRAM_CHANNEL_ID;
const tgChatId = process.env.TELEGRAM_CHAT_ID;
const tgChannelPublicLink = process.env.TELEGRAM_CHANNEL_PUBLIC_LINK;

async function telegramPoster(post: any) {
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
            db.run(
              "INSERT INTO posts (vk_id, vk_owner_id, tg_id, discussion_tg_id, tg_author_id, created_at, text, text_hash, attachments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
              [
                post.wall.id,
                post.wall.ownerId,
                messages[0].message_id,
                null,
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
            db.run(
              "INSERT INTO posts (vk_id, vk_owner_id, tg_id, discussion_tg_id, tg_author_id, created_at, text, text_hash, attachments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
              [
                post.wall.id,
                post.wall.ownerId,
                message.message_id,
                null,
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
                "INSERT INTO posts (vk_id, vk_owner_id, tg_id, discussion_tg_id, tg_author_id, created_at, text, text_hash, attachments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [
                  post.wall.id,
                  post.wall.ownerId,
                  message.message_id,
                  null,
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
          db.run(
            "INSERT INTO posts (vk_id, vk_owner_id, tg_id, discussion_tg_id, tg_author_id, created_at, text, text_hash, attachments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
              post.wall.id,
              post.wall.ownerId,
              message.message_id,
              null,
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

async function telegramCommenter(comment: any) {
  if (db.query("SELECT * FROM comments WHERE vk_id = ?").get(comment.id)) {
    logger.warn(`Comment ${comment.wall.id} already in database, skipping...`);
    return;
  }
  const discussionMsgId = db.query('SELECT discussion_tg_id FROM posts WHERE vk_id = ?').get(comment.objectId);

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
          message_id: discussionMsgId.discussion_tg_id,
        },
      },
    );
  } else if (comment.isEdit) {
    // Comment is edited
    const originalPost = db
      .query("SELECT tg_id FROM comments WHERE vk_id = ?")
      .get(comment.objectId);
    if (!originalPost) {
      logger.warn(
        `No matching comment found to EDIT by vk_id: ${comment.toJSON().objectId}`,
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
        `No matching comment found to DELETE by vk_id: ${comment.toJSON().objectId}`,
      );
      return;
    }

    await tgApi.telegram.deleteMessage(tgChatId, originalPost.tg_id);
  }
}

async function Main() {
  // startup figlet
  console.log(
    "\x1b[38;5;141m" +
      figlet.textSync("porter", {
        font: "Slant",
      }) +
      "\x1b[0m",
  );

  tgApi.launch();
  await vkGroupApi.updates.start();

  try {
    if (config.crossposting.enabled) {
      if (config.crossposting.useOrigin.vk) {
        // New VK posts webhook
        vkGroupApi.updates.on("wall_post_new", async (context) => {
          await telegramPoster(context);
        });
      }
      if (config.crossposting.useOrigin.tg) {
        // TODO: Crosspost from tg
        //  tgApi.on("message", async (context) => {});
      }
    }
    if (config.crosscommenting.enabled) {
      if (config.crosscommenting.useOrigin.vk) {
        vkGroupApi.updates.on("wall_reply_new", async (context) => {
          await telegramCommenter(context);
        });

        vkGroupApi.updates.on("wall_reply_edit", async (context) => {
          await telegramCommenter(context);
        });

        vkGroupApi.updates.on("wall_reply_delete", async (context) => {
          await telegramCommenter(context);
        });

        vkGroupApi.updates.on("wall_reply_restore", async (context) => {
          await telegramCommenter(context);
        });
      }
      if (config.crosscommenting.useOrigin.tg) {
        // TODO: IMPORTANT!! Crosscomment from tg to vk
      }
    }
    tgApi.on("message", async (context) => {
      if (
        context.message.is_automatic_forward &&
        context.message.forward_from_chat?.id.toString() === tgChannelId
      ) {
        logger.info("Caught discussion forward");
      }
      const result = db.run(
        `UPDATE posts 
           SET discussion_tg_id = ? 
           WHERE tg_id = ?`,
        [
          context.message.message_id,
          context.message.forward_origin.message_id,
        ]
      );
    });

    logger.debug("Logger level is set to debug");
    logger.info("Bot started successfully\n");

    //  const sync = setInterval(() => {syncRecentPosts()}, 1000*60*10);
  } catch (error) {
    logger.error(`Runtime error: ${error.message}`);
    process.exit(1);
  }
  tgApi.on("message", async (context) => {
    if (context.message.is_automatic_forward) {
      db.run();
    }
  });
}

Main().catch((error) => {
  logger.error({ error });
});

["SIGINT", "SIGTERM", "SIGQUIT", "SIGKILL"].forEach((signal) => {
  process.on(signal, async () => {
    do {
      await vkGroupApi.updates.stop();
    } while (vkGroupApi.updates.isStarted);
    tgApi.stop(signal.toString());
    db.close();
    logger.warn(`Shutting down (${signal.toString()})`);
    logger.flush();
    process.exit(0);
  });
});
