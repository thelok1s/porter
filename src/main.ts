import dotenv from "dotenv";
import logger from "@/lib/logger";
import { db } from "@/lib/database";
import { vkGroupApi, tgApi, tgChannelId } from "@/lib/api";
import { appFiglet } from "@/misc/appFiglet";
import { telegramCommenter, telegramPoster } from "@/lib/telegram";
import config from "../porter.config";

dotenv.config();

if (!process.versions.bun) {
  logger.fatal("Current environment is not Bun. Check README");
  process.exit(1);
}

if (!process.env.VK_TOKEN || !process.env.TELEGRAM_TOKEN) {
  logger.fatal("Environment variables are not set or .env is missing");
  process.exit(1);
}

async function main() {
  appFiglet();

  tgApi.on("message", async (context) => {
    if (
      context.message.is_automatic_forward &&
      context.message.forward_from_chat?.id.toString() === tgChannelId
    ) {
      logger.info("Caught discussion forward");
    }
    db.run(
      `UPDATE posts
       SET discussion_tg_id = ?
       WHERE tg_id = ?`,
      [context.message.message_id, context.message.forward_origin.message_id],
    );

    try {
      if (!context.message.forward_origin?.message_id) {
        logger.warn("No forward origin message ID found");
        return;
      }

      const result = db.run(
        `UPDATE posts
         SET discussion_tg_id = ?
         WHERE tg_id = ?`,
        [context.message.message_id, context.message.forward_origin.message_id],
      );

      if (result.changes === 0) {
        logger.warn("No posts updated with discussion ID");
      }
    } catch (error) {
      logger.error("Error updating discussion ID:", error);
    }
  });
  await vkGroupApi.updates.start();
  tgApi.launch();
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

    logger.debug("Logger level is set to debug");
    logger.info("Bot started successfully\n");

    //  const sync = setInterval(() => {syncRecentPosts()}, 1000*60*10);
  } catch (error) {
    logger.error(`Runtime error: ${error.message}`);
    process.exit(1);
  }
}

main().catch((error) => {
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
