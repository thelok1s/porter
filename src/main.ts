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
      if (
        config.crossposting.origin === "tg" ||
        config.crossposting.origin === "both"
      ) {
        tgApi.on("message", async (context: TelegrafContext) => {
          if (!context) return;
          const msg = context.message as TGDiscussionMessage;
          const chatType = msg.chat?.type;
          if (chatType !== "group") return;
          // Skip the automatic forward itself
          if (msg.is_automatic_forward) return;

          try {
            // Resolve the root discussion message id (the auto-forward from the channel)
            let discussionRootId: number | null = null;

            // If the discussion group uses forum topics, the thread id is provided
            if (typeof msg.message_thread_id === "number") {
              discussionRootId = msg.message_thread_id;
            }

            // Fallback for non-forum discussions: climb reply chain to the auto-forward
            if (!discussionRootId && msg.reply_to_message) {
              let root: TGDiscussionMessage | undefined = msg.reply_to_message;
              while (root?.reply_to_message && !root.is_automatic_forward) {
                root = root.reply_to_message;
              }
              if (
                root?.is_automatic_forward &&
                root.forward_from_chat?.id?.toString() ===
                  "-100" + String(tgChannelId)
              ) {
                discussionRootId = root.message_id;
              }
            }

            if (!discussionRootId) {
              // Not part of any tracked discussion thread
              return;
            }

            // Find the mapped post by the discussion root
            const post = await Post.findOne({
              where: { discussion_tg_id: discussionRootId },
            });
            if (!post) {
              logger.warn(
                `No post found for discussion root ${discussionRootId}`,
              );
              return;
            }

            // TODO: Persist the comment or crosspost to VK here
            logger.info(
              `[TG discussion] post.tg_id=${post.tg_id}, thread=${discussionRootId}, msg=${msg.message_id}, from=${msg.from?.id}`,
            );

            // Example: call your future VK cross-comment function
            // await replyToVk({ post, msg });
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            logger.error(`Failed to process TG discussion message: ${msg}`);
          }
        });
      }
    }
    if (config.crosscommenting.enabled) {
      // Automatic forward detection - links discussion_tg_id when post is forwarded to discussion group
      tgApi.on("message", async (context: TelegrafContext) => {
        if (!context.message) return;
        const cm = context.message as TGDiscussionMessage | undefined;
        if (
          cm &&
          cm.is_automatic_forward &&
          cm.forward_from_chat?.id?.toString() === "-100" + String(tgChannelId)
        ) {
          logger.debug(`Caught automatic forward:
        Discussion msg ID: ${cm.message_id}
        Original msg ID: ${cm.forward_from_message_id}
      `);

          try {
            const [affected] = await Post.update(
              { discussion_tg_id: cm.message_id },
              { where: { tg_id: cm.forward_from_message_id } },
            );

            if (affected === 0) {
              logger.warn(`No posts updated with discussion ID.
            Channel msg ID: ${cm.forward_from_message_id}
            Discussion msg ID: ${cm.message_id}
          `);
            } else {
              logger.info(`[VK -> TG] Successfully linked discussion message:
            Channel msg ID: ${cm.forward_from_message_id}
            Discussion msg ID: ${cm.message_id}
          `);
            }
          } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            logger.error(`Error updating discussion ID: ${msg}
          Channel msg ID: ${cm.forward_from_message_id}
          Discussion msg ID: ${cm.message_id}
        `);
          }
        }
      });

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
      if (
        config.crosscommenting.origin === "tg" ||
        config.crosscommenting.origin === "both"
      ) {
        tgApi.on("message", async (context: TelegrafContext) => {
          if (!context.message || !tgChatId) return;
          const msg = context.message;

          // Skip automatic forwards and bot's own messages
          if (context.message.from?.id === tgApi.botInfo?.id) return;
          if (!(context.message.chat.id.toString() === tgChatId)) return;

          try {
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
            await replyToVk(msg, post, messageText);
          } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : String(err);
            const errStack = err instanceof Error ? err.stack : undefined;
            logger.error(
              `[TG -> VK] Failed to process discussion message ${msg.message_id}: ${errMsg}`,
            );
            if (errStack) {
              logger.debug(`[TG -> VK] Error stack: ${errStack}`);
            }
          }
        });
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
