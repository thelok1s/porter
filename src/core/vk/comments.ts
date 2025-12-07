import logger from "@/lib/logger";
import { vkGlobalApi } from "@/core/api";
import { Post as PostModel } from "@/models/post.schema";
import { Reply as ReplyModel } from "@/models/reply.schema";
import { Message, Update } from "telegraf/types";

/**
 * Converts Telegram message to VK comment format
 * VK uses [url|text] format for links
 */
function formatTelegramToVkText(text: string): string {
  if (!text) return "";
  let vkText = text;
  vkText = vkText.replace(/<br\s*\/?>/gi, "\n");
  vkText = vkText.replace(/<[^>]+>/g, "");
  return vkText;
}

/**
 * Ports a Telegram discussion message to VK as a comment
 */
export async function replyToVk(
  msg: Update.New & (Update.NonChannel & Message),
  post: PostModel,
  messageText?: string,
): Promise<void> {
  logger.debug({
    logctx: "replyToVk",
    logtype: "raw context",
    msg_id: msg.message_id,
    from_id: msg.from?.id,
    post_vk_id: post.vk_id,
    text: messageText,
  });

  try {
    // Check if this message was already ported
    const existingReply = await ReplyModel.findOne({
      where: { tg_reply_id: msg.message_id },
      attributes: ["id"],
    });

    if (existingReply) {
      logger.warn(
        `[TG -> VK] Comment already ported: TG msg ${msg.message_id}`,
      );
      return;
    }

    const tgUsername = msg.from?.username;
    if (!tgUsername) {
      logger.warn("[TG -> VK] Message has no sender ID, skipping");
      return;
    }

    const userLink = `t.me/${tgUsername}`;
    const userDisplayName = `${msg.from.first_name} ${msg.from?.last_name || ""}`;

    const text = messageText || (msg as { text?: string }).text || "";
    if (!text) {
      logger.warn("[TG -> VK] Message has no text content, skipping");
      return;
    }

    const processedText = formatTelegramToVkText(text);
    const commentText = `${userDisplayName}(${userLink}): ${processedText}\n\n(Автоматически перенесено из tg)`;

    // Create the VK comment
    const vkComment = await vkGlobalApi.wall.createComment({
      owner_id: post.vk_author_id as number,
      post_id: post.vk_id as number,
      message: commentText,
      from_group:
        post.vk_author_id && post.vk_author_id < 0
          ? Math.abs(post.vk_author_id)
          : undefined,
    });

    if (!vkComment.comment_id) {
      logger.error(
        "[TG -> VK] Failed to create VK comment: no comment_id returned",
      );
      return;
    }

    // Save to database
    try {
      await ReplyModel.create({
        vk_post_id: post.vk_id,
        vk_reply_id: vkComment.comment_id,
        vk_author_id: post.vk_author_id,
        tg_reply_id: msg.message_id,
        discussion_tg_id: post.discussion_tg_id,
        tg_author_id: msg.from?.id,
        created_at: new Date(),
        attachments: JSON.stringify([]),
      });

      logger.info(
        `[TG -> VK] Comment ported successfully: TG msg ${msg.message_id} -> VK comment ${vkComment.comment_id}`,
      );
    } catch (error) {
      logger.error(
        `[TG -> VK] Failed to create reply record: ${String(error)}`,
      );
    }
  } catch (error) {
    logger.error(
      `[TG -> VK] Error handling comment from TG msg ${msg.message_id}: ${String(error)}`,
    );
    if (error instanceof Error && error.stack) {
      logger.debug(`[TG -> VK] Error stack: ${error.stack}`);
    }
  }
}
