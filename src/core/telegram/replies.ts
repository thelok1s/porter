import logger from "@/lib/logger";
import { tgApi, tgChatId as tgChatIdRaw, vkGlobalApi } from "@/core/api";
import { Post } from "@/models/post.schema";
import { Reply as ReplyModel } from "@/models/reply.schema";
import { InputMediaPhoto, Message } from "telegraf/types";
import type {
  CommentContext,
  PhotoAttachment,
  DocumentAttachment,
} from "vk-io";
import { formatMessageText, getHtmlLink, splitText } from "../utils";
const tgChatId = String(tgChatIdRaw ?? "");

export default async function replyToTelegram(reply: CommentContext) {
  logger.debug({
    logctx: "replyToTelegram",
    logtype: "raw context",
    reply: reply.toJSON(),
  });
  try {
    const post = await Post.findOne({
      where: { vk_id: reply.objectId },
      attributes: ["discussion_tg_id", "tg_id", "vk_id"],
    });

    if (!post) {
      logger.warn(`[VK -> TG] Post not found for VK ID ${reply.objectId}`);
      return;
    }

    // We need the discussion_tg_id (the automatic forward in discussion group)
    // If it's not set yet, we must wait for it
    if (!post.discussion_tg_id) {
      logger.warn(
        `[VK -> TG] Discussion thread not linked yet for VK post ${reply.objectId}. ` +
          `Comment ${reply.id} will be skipped. Wait for automatic forward to be detected.`,
      );
      return;
    }

    const threadMsgId = post.discussion_tg_id;

    // Check if this is a reply to another comment
    let replyToMessageId = threadMsgId;
    if (reply.replyId) {
      const targetComment = await ReplyModel.findOne({
        where: { vk_reply_id: reply.replyId },
        attributes: ["tg_reply_id", "vk_post_id"],
      });

      if (targetComment?.tg_reply_id) {
        // verify the target comment belongs to the same VK post/thread
        if (targetComment.vk_post_id === reply.objectId) {
          replyToMessageId = targetComment.tg_reply_id;
          logger.info(
            `[VK –> TG] Replying to VK comment ${reply.replyId} -> TG message ${replyToMessageId}`,
          );
        } else {
          logger.warn(
            `Target comment ${reply.replyId} belongs to different post (${targetComment.vk_post_id} vs ${reply.objectId}), replying to thread instead`,
          );
        }
      } else {
        logger.warn(
          `Target comment ${reply.replyId} not found in database, replying to thread instead`,
        );
      }
    }

    const [sender] = (await vkGlobalApi.users.get({
      user_ids: [reply.fromId],
    })) as unknown as Array<{
      id: number;
      first_name: string;
      last_name: string;
    }>;

    if (reply.isNew || reply.isRestore) {
      const existingReply = await ReplyModel.findOne({
        where: { vk_reply_id: reply.id },
        attributes: ["id"],
      });

      if (existingReply) {
        logger.warn(`Reply already ported: ${reply.id} `);
        return;
      }

      //  HTML formatting
      const processedText = formatMessageText(reply.text || "");
      const authorLink = getHtmlLink(
        `https://www.vk.com/id${sender.id}`,
        `${sender.first_name} ${sender.last_name}`,
      );
      const messageText = `${authorLink}: ${processedText}`;

      // Split if needed
      const textParts = splitText(messageText, 4096);

      // Check for attachments
      if (reply.attachments.toString().length > 0) {
        const photoUrls: InputMediaPhoto[] = [];

        for (const attachment of reply.attachments) {
          const json = attachment.toJSON() as PhotoAttachment;
          const url =
            json.largeSizeUrl ?? json.mediumSizeUrl ?? json.smallSizeUrl;
          if (url) {
            photoUrls.push({
              type: "photo",
              media: url,
            });
          }
        }

        // Multiple photos
        if (photoUrls.length > 1) {
          let reply_msg: (
            | Message.DocumentMessage
            | Message.AudioMessage
            | Message.PhotoMessage
            | Message.VideoMessage
          )[];

          if (textParts.length > 1 || textParts[0].length > 1024) {
            // Text is too long
            let mainMsgId = null;
            for (const [index, part] of textParts.entries()) {
              const msgResult = await tgApi.telegram.sendMessage(
                tgChatId,
                part,
                {
                  parse_mode: "HTML",
                  reply_parameters:
                    index === 0
                      ? {
                          chat_id: tgChatId,
                          message_id: replyToMessageId,
                        }
                      : undefined,
                  link_preview_options: { is_disabled: true },
                },
              );
              if (!mainMsgId) mainMsgId = msgResult.message_id;
            }

            // send media
            reply_msg = await tgApi.telegram.sendMediaGroup(
              tgChatId,
              photoUrls,
              {
                reply_parameters: {
                  chat_id: tgChatId,
                  message_id: mainMsgId ?? replyToMessageId,
                },
              },
            );
          } else {
            const mediaGroup: InputMediaPhoto[] = photoUrls.map(
              (photo, index) => ({
                type: "photo" as const,
                media: photo.media,
                ...(index === 0
                  ? {
                      caption: textParts[0],
                      parse_mode: "HTML",
                    }
                  : {}),
              }),
            );

            reply_msg = await tgApi.telegram.sendMediaGroup(
              tgChatId,
              mediaGroup,
              {
                reply_parameters: {
                  chat_id: tgChatId,
                  message_id: replyToMessageId,
                },
              },
            );
          }

          await ReplyModel.create({
            vk_post_id: reply.objectId,
            vk_reply_id: reply.id,
            vk_author_id: reply.ownerId,
            tg_reply_id: reply_msg[0]?.message_id as number,
            discussion_tg_id: threadMsgId,
            tg_author_id: reply_msg[0]?.from?.id ?? null,
            created_at:
              typeof reply.createdAt === "number"
                ? new Date(reply.createdAt * 1000)
                : reply.createdAt,

            attachments: JSON.stringify(reply.attachments),
          });

          // One photo
        } else if (photoUrls.length === 1) {
          let reply_msg: Message.PhotoMessage;

          if (textParts.length > 1 || textParts[0].length > 1024) {
            // Send text as separate message
            let mainMsgId = null;
            for (const [index, part] of textParts.entries()) {
              const msgResult = await tgApi.telegram.sendMessage(
                tgChatId,
                part,
                {
                  parse_mode: "HTML",
                  reply_parameters:
                    index === 0
                      ? {
                          chat_id: tgChatId,
                          message_id: replyToMessageId,
                        }
                      : undefined,
                  link_preview_options: { is_disabled: true },
                },
              );
              if (!mainMsgId) mainMsgId = msgResult.message_id;
            }

            reply_msg = await tgApi.telegram.sendPhoto(
              tgChatId,
              photoUrls[0].media,
              {
                reply_parameters: {
                  chat_id: tgChatId,
                  message_id: mainMsgId ?? replyToMessageId,
                },
              },
            );
          } else {
            // Text fits in limit
            reply_msg = await tgApi.telegram.sendPhoto(
              tgChatId,
              photoUrls[0].media,
              {
                caption: textParts[0],
                parse_mode: "HTML",
                reply_parameters: {
                  chat_id: tgChatId,
                  message_id: replyToMessageId,
                },
              },
            );
          }

          await ReplyModel.create({
            vk_post_id: reply.objectId,
            vk_reply_id: reply.id,
            vk_author_id: reply.ownerId,
            tg_reply_id: reply_msg.message_id,
            discussion_tg_id: threadMsgId,
            tg_author_id: reply_msg?.from?.id ?? null,
            created_at:
              typeof reply.createdAt === "number"
                ? new Date(reply.createdAt * 1000)
                : reply.createdAt,

            attachments: JSON.stringify(reply.attachments),
          });

          // File (GIF specifically)
        } else if (
          Object.prototype.hasOwnProperty.call(
            reply.attachments[0].toJSON(),
            "extension",
          )
        ) {
          let reply_msg: Message.AnimationMessage;

          if (textParts.length > 1 || textParts[0].length > 1024) {
            // Send text as separate message
            let mainMsgId = null;
            for (const [index, part] of textParts.entries()) {
              const msgResult = await tgApi.telegram.sendMessage(
                tgChatId,
                part,
                {
                  parse_mode: "HTML",
                  reply_parameters:
                    index === 0
                      ? {
                          chat_id: tgChatId,
                          message_id: replyToMessageId,
                        }
                      : undefined,
                  link_preview_options: { is_disabled: true },
                },
              );
              if (!mainMsgId) mainMsgId = msgResult.message_id;
            }

            reply_msg = await tgApi.telegram.sendAnimation(
              tgChatId,
              String(
                (reply.attachments[0].toJSON() as DocumentAttachment).url ?? "",
              ),
              {
                reply_parameters: {
                  chat_id: tgChatId,
                  message_id: mainMsgId ?? replyToMessageId,
                },
              },
            );
          } else {
            // Text fits in caption
            reply_msg = await tgApi.telegram.sendAnimation(
              tgChatId,
              String(
                (reply.attachments[0].toJSON() as DocumentAttachment).url ?? "",
              ),
              {
                caption: textParts[0],
                parse_mode: "HTML",
                reply_parameters: {
                  chat_id: tgChatId,
                  message_id: replyToMessageId,
                },
              },
            );
          }

          await ReplyModel.create({
            vk_post_id: reply.objectId,
            vk_reply_id: reply.id,
            vk_author_id: reply.ownerId,
            tg_reply_id: reply_msg.message_id,
            discussion_tg_id: threadMsgId,
            tg_author_id: reply_msg?.from?.id ?? null,
            created_at:
              typeof reply.createdAt === "number"
                ? new Date(reply.createdAt * 1000)
                : reply.createdAt,

            attachments: JSON.stringify(reply.attachments),
          });
        }
      } else {
        let mainMsgId = null;
        let reply_msg: Message.TextMessage | undefined;

        for (const [index, part] of textParts.entries()) {
          reply_msg = await tgApi.telegram.sendMessage(tgChatId, part, {
            parse_mode: "HTML",
            reply_parameters:
              index === 0
                ? {
                    chat_id: tgChatId,
                    message_id: replyToMessageId,
                  }
                : undefined,
            link_preview_options: { is_disabled: true },
          });

          if (index === 0) {
            mainMsgId = reply_msg.message_id;
          }
        }
        try {
          await ReplyModel.create({
            vk_post_id: reply.objectId,
            vk_reply_id: reply.id,
            vk_author_id: reply.ownerId,
            tg_reply_id: mainMsgId as number,
            discussion_tg_id: threadMsgId,
            tg_author_id: reply_msg?.from?.id ?? null,
            created_at:
              typeof reply.createdAt === "number"
                ? new Date((reply.createdAt as number) * 1000)
                : reply.createdAt,

            attachments: JSON.stringify(reply.attachments || []),
          });
        } catch (error) {
          logger.error(`Failed to create reply record: ${String(error)}`);
        }

        logger.info(
          `[VK –> TG] Reply ported: ${reply.id} (for msg: ${mainMsgId})`,
        );
      }
    } else if (reply.isEdit) {
      const replyRecord = await ReplyModel.findOne({
        where: { vk_reply_id: reply.id },
        attributes: ["tg_reply_id"],
      });

      if (!replyRecord?.tg_reply_id) {
        logger.error(`Cannot find reply to edit: ${reply.id}`);
        return;
      }

      // Process the reply text with HTML formatting
      const processedText = formatMessageText(reply.text || "");
      const authorLink = getHtmlLink(
        `https://www.vk.com/id${sender.id}`,
        `${sender.first_name} ${sender.last_name}`,
      );
      const messageText = `${authorLink}: ${processedText}`;

      await tgApi.telegram.editMessageText(
        tgChatId,
        replyRecord.tg_reply_id,
        undefined,
        messageText,
        {
          parse_mode: "HTML",
          link_preview_options: { is_disabled: true },
        },
      );

      logger.info(`[VK –>] TG] Reply edited: ${reply.id}`);
    } else if (reply.isDelete) {
      const replyRecord = await ReplyModel.findOne({
        where: { vk_reply_id: reply.id },
        attributes: ["tg_reply_id"],
      });

      if (!replyRecord?.tg_reply_id) {
        logger.error(`Cannot find reply to delete: ${reply.id}`);
        return;
      }

      await tgApi.telegram.deleteMessage(tgChatId, replyRecord.tg_reply_id);
      await ReplyModel.destroy({
        where: { vk_reply_id: reply.id },
      });

      logger.info(`[VK –>X TG] Reply deleted: ${reply.id}`);
    }
  } catch (error) {
    logger.error(`Error handling reply ${reply?.id}: ${String(error)}`);
  }
}
