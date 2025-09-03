import config from "../porter.config";
import { replyToTelegram, postToTelegram } from "@/core/telegram";
import { vkGroupApi, tgApi, tgChannelId } from "@/core/api";
import { initDatabase, closeDatabase } from "@/lib/sequelize";
import { Post } from "@/models/post.schema";
import logger from "@/lib/logger";
import { appFiglet } from "@/utils/appFiglet";
import dotenv from "dotenv";
import { NarrowedContext } from "telegraf";

dotenv.config();

if (!process.versions.bun) {
  logger.fatal("Current environment is not Bun. Check README");
  process.exit(1);
}

if (
  !process.env.VK_TOKEN ||
  !process.env.TELEGRAM_TOKEN ||
  !process.env.TELEGRAM_CHANNEL_ID ||
  !process.env.TELEGRAM_CHANNEL_PUBLIC_LINK ||
  !process.env.TELEGRAM_CHAT_ID
) {
  logger.fatal("Environment variables are not set or .env is missing");
  process.exit(1);
}

async function main() {
  appFiglet();

  await initDatabase();
  const START_TIME = Math.floor(Date.now() / 1000);
  await vkGroupApi.updates.start();
  tgApi.launch().then();

  try {
    if (config.crossposting.enabled) {
      if (config.crossposting.useOrigin.vk) {
        // New VK posts webhook
        vkGroupApi.updates.on("wall_post_new", async (context: any) => {
          if (context.wall.createdAt > START_TIME) {
            logger.debug(context);
            await postToTelegram(context);
          }
        });
      }
      if (config.crossposting.useOrigin.tg) {
        // TODO: Crosspost from tg
        //  tgApi.on("message", async (context) => {});
      }
    }
    if (config.crosscommenting.enabled) {
      tgApi.on("message", async (context: any) => {
        logger.debug(context);
        if (
          context.message.is_automatic_forward &&
          context.message.forward_from_chat?.id.toString() ===
            "-100" + String(tgChannelId)
        ) {
          logger.debug(`Caught automatic forward:
        Discussion msg ID: ${context.message.message_id}
        Original msg ID: ${context.message.forward_from_message_id}
      `);

          try {
            const [affected] = await Post.update(
              { discussion_tg_id: context.message.message_id },
              { where: { tg_id: context.message.forward_from_message_id } },
            );

            if (affected === 0) {
              logger.warn(`No posts updated with discussion ID.
            Channel msg ID: ${context.message.forward_from_message_id}
            Discussion msg ID: ${context.message.message_id}
          `);
            } else {
              logger.info(`[VK -> TG] Successfully linked discussion message:
            Channel msg ID: ${context.message.forward_from_message_id}
            Discussion msg ID: ${context.message.message_id}
          `);
            }
          } catch (error: any) {
            logger.error(`Error updating discussion ID: ${error.message}
          Channel msg ID: ${context.message.forward_from_message_id}
          Discussion msg ID: ${context.message.message_id}
        `);
          }
        }
      });

      if (config.crosscommenting.useOrigin.vk) {
        // Replies webhooks
        vkGroupApi.updates.on(
          [
            "wall_reply_new",
            "wall_reply_restore",
            "wall_reply_edit",
            "wall_reply_delete",
          ],
          async (context: any) => {
            if (context.createdAt > START_TIME) {
              await replyToTelegram(context);
            }
          },
        );
      }
      if (config.crosscommenting.useOrigin.tg) {
        // TODO: IMPORTANT!! Crosscomment from tg to vk
      }
    }

    logger.debug("Logger level is set to debug");
    logger.info("Bot started successfully (･ω<)☆ \n");

    //  const sync = setInterval(() => {syncRecentPosts()}, 1000*60*10);
  } catch (error: any) {
    logger.error(`Runtime error: ${error.message}`);
    process.exit(1);
  }
}

main().catch((error: any) => {
  logger.error({ error });
});

["SIGINT", "SIGTERM", "SIGQUIT", "SIGKILL"].forEach((signal) => {
  process.on(signal, async () => {
    do {
      await vkGroupApi.updates.stop();
    } while (vkGroupApi.updates.isStarted);
    tgApi.stop(signal.toString());
    await closeDatabase();
    logger.warn(`Shutting down (${signal.toString()})`);
    process.exit(0);
  });
});
