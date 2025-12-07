import { PorterConfig as config } from "../porter.config.ts";
import replyToTelegram from "@/core/telegram/replies";
import { replyToVk } from "@/core/vk/comments";
import postToTelegram from "@/core/telegram/posts";
import { vkGroupApi, tgApi, tgChannelId, tgChatId } from "@/core/api";
import { initDatabase, closeDatabase } from "@/lib/sequelize";
import { Post } from "@/models/post.schema";
import logger from "@/lib/logger";
import { appFiglet } from "@/utils/appFiglet";
import dotenv from "dotenv";
import type { Context as TelegrafContext } from "telegraf";
import { CommentContext, WallPostContext } from "vk-io";
import { TGDiscussionMessage } from "./types/Baseline";

dotenv.config();
const START_TIME = Math.floor(Date.now() / 1000);

if (
  !process.env.VK_TOKEN ||
  !process.env.TELEGRAM_TOKEN ||
  !process.env.TELEGRAM_CHANNEL_ID ||
  !process.env.TELEGRAM_CHANNEL_PUBLIC_LINK ||
  !process.env.TELEGRAM_CHAT_ID
) {
  logger.fatal(
    "Environment variables are not set or .env is missing. Exiting.",
  );
  process.exit(1);
}

if (!config.crosscommenting.enabled && !config.crossposting.enabled) {
  logger.fatal("And why would you do that?");
  process.exit(1);
}

async function main() {
  await initDatabase();
  await vkGroupApi.updates.start();
  tgApi.launch().then();
  appFiglet();

  try {
    if (config.crossposting.enabled) {
      if (
        config.crossposting.origin === "vk" ||
        config.crossposting.origin === "both"
      ) {
        vkGroupApi.updates.on(
          "wall_post_new",
          async (context: WallPostContext) => {
            if (!context) return;
            if (context.wall.createdAt ?? 0 > START_TIME) {
              logger.debug(
                "wall_post_new event:" + JSON.parse(JSON.stringify(context)),
              );
              await postToTelegram(context as WallPostContext);
            }
          },
        );
      }
    }

    // Unified Telegram message handler - handles both automatic forwards and user replies
    if (
      config.crosscommenting.enabled ||
      (config.crossposting.enabled &&
        (config.crossposting.origin === "tg" ||
          config.crossposting.origin === "both"))
    ) {
      tgApi.on("message", async (context: TelegrafContext) => {
        if (!context.message || !tgChatId) return;
        const msg = context.message as TGDiscussionMessage;

        // Skip bot's own messages
        if (msg.from?.id === tgApi.botInfo?.id) return;

        // Only process messages from the discussion group
        if (!msg.chat?.id || msg.chat.id.toString() !== tgChatId) return;

        try {
          // Automatic forward - link discussion_tg_id
          if (
            msg.is_automatic_forward &&
            msg.forward_from_chat?.id?.toString() ===
              "-100" + String(tgChannelId) &&
            config.crosscommenting.enabled
          ) {
            logger.debug(`[Auto-forward] Caught automatic forward:
        Discussion msg ID: ${msg.message_id}
        Original msg ID: ${msg.forward_from_message_id}
      `);

            try {
              const [affected] = await Post.update(
                { discussion_tg_id: msg.message_id },
                { where: { tg_id: msg.forward_from_message_id } },
              );

              if (affected === 0) {
                logger.warn(`[Auto-forward] No posts updated with discussion ID.
            Channel msg ID: ${msg.forward_from_message_id}
            Discussion msg ID: ${msg.message_id}
          `);
              } else {
                logger.info(`[Auto-forward] Successfully linked discussion message:
            Channel msg ID: ${msg.forward_from_message_id}
            Discussion msg ID: ${msg.message_id}
          `);
              }
            } catch (error: unknown) {
              const errMsg =
                error instanceof Error ? error.message : String(error);
              logger.error(`[Auto-forward] Error updating discussion ID: ${errMsg}
          Channel msg ID: ${msg.forward_from_message_id}
          Discussion msg ID: ${msg.message_id}
        `);
            }
            return;
          }

          // User reply - port to VK (if enabled)
          if (
            config.crosscommenting.enabled &&
            (config.crosscommenting.origin === "tg" ||
              config.crosscommenting.origin === "both")
          ) {
            // Skip automatic forwards for comment porting
            if (msg.is_automatic_forward) {
              return;
            }

            logger.debug({
              logctx: "TG->VK comment processing",
              msg_id: msg.message_id,
              chat_id: msg.chat?.id,
              from_id: msg.from?.id,
              has_thread_id: typeof msg.message_thread_id === "number",
            });

            // Resolve the root discussion message id (the auto-forward from the channel)
            let discussionRootId: number | null = null;

            // If the discussion group uses forum topics, the thread id is provided
            if (typeof msg.message_thread_id === "number") {
              discussionRootId = msg.message_thread_id;
              logger.debug(
                `[TG -> VK] Using message_thread_id as discussion root: ${discussionRootId}`,
              );
            }

            if (!discussionRootId) {
              // Not part of any tracked discussion thread
              logger.debug(
                `[TG -> VK] Message ${msg.message_id} is not part of tracked discussion thread`,
              );
              return;
            }

            logger.debug(
              `[TG -> VK] Looking up post with discussion_tg_id = ${discussionRootId}`,
            );

            // Find the mapped post by the discussion root
            const post = await Post.findOne({
              where: { discussion_tg_id: discussionRootId },
              attributes: ["vk_id", "vk_author_id", "discussion_tg_id"],
            });

            if (!post || !post.vk_id) {
              logger.warn(
                `[TG -> VK] No VK post found for discussion root ${discussionRootId}. Check if post exists in database with this discussion_tg_id.`,
              );
              return;
            }

            logger.info(
              `[TG -> VK] Found post mapping: discussion_tg_id=${discussionRootId} -> vk_id=${post.vk_id}`,
            );

            // Port the comment to VK
            const messageText =
              (msg as { text?: string; caption?: string }).text ||
              (msg as { text?: string; caption?: string }).caption;
            await replyToVk(
              msg as unknown as Parameters<typeof replyToVk>[0],
              post,
              messageText,
            );
          }
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          const errStack = err instanceof Error ? err.stack : undefined;
          logger.error(
            `[TG message handler] Failed to process message ${msg.message_id}: ${errMsg}`,
          );
          if (errStack) {
            logger.debug(`[TG message handler] Error stack: ${errStack}`);
          }
        }
      });
    }

    if (config.crosscommenting.enabled) {
      if (
        config.crosscommenting.origin === "vk" ||
        config.crosscommenting.origin === "both"
      ) {
        // Replies webhooks
        vkGroupApi.updates.on(
          [
            "wall_reply_new",
            "wall_reply_restore",
            "wall_reply_edit",
            "wall_reply_delete",
          ],
          async (context) => {
            const createdAt =
              (context as unknown as { createdAt?: number }).createdAt ?? 0;
            if (
              (context.isNew && createdAt > START_TIME) ||
              (context.isEdit && createdAt > START_TIME) ||
              context.isDelete ||
              context.isRestore
            ) {
              await replyToTelegram(context as CommentContext);
            }
          },
        );
      }
    }

    logger.debug("Logger level is set to debug");
    logger.info("Bot started successfully (･ω<)☆ \n");
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(`Runtime error: ${msg}`);
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  logger.error({ error });
});

["SIGKILL", "SIGINT", "SIGTERM", "SIGQUIT"].forEach((signal) => {
  try {
    process.on(signal as NodeJS.Signals, async () => {
      do {
        await vkGroupApi.updates.stop();
      } while (vkGroupApi.updates.isStarted);
      tgApi.stop(signal.toString());
      await closeDatabase();
      logger.warn(`Shutting down (${signal.toString()})`);
      process.exit(0);
    });
  } catch {
    // Ignore environments where this signal cannot be watched (e.g., Windows or limited runtimes)
  }
});
