import { PorterConfig as config } from "../../../porter.config";
import { getVkLink } from "../utils";
const tgChannelPublicLink = String(tgChannelPublicLinkRaw ?? "");
import logger from "@/lib/logger";
import {
  tgApi,
  tgChannelPublicLink as tgChannelPublicLinkRaw,
} from "@/core/api";
import { Post } from "@/models/post.schema";
import { InputMediaPhoto, Message } from "telegraf/types";
import type {
  WallPostContext,
  PhotoAttachment,
  DocumentAttachment,
  PollAttachment,
} from "vk-io";
import { formatMessageText, splitText } from "../utils";
import { BaseError, DatabaseError, SequelizeScopeError } from "sequelize";

let lastPostMsg: Message.TextMessage | null | undefined = null;

export default async function postToTelegram(post: WallPostContext) {
  // Check if repost
  if (config.crossposting.parameters.ignoreReposts && post.isRepost) {
    logger.info(
      `Reposts are ignored, skipping (${getVkLink(post.wall.id, post.wall.ownerId)})`,
    );
    return;
  }

  // Check if duplicate
  const exists = await Post.findOne({
    where: { vk_id: post.wall.id },
    attributes: ["id"],
  });
  if (exists) {
    logger.warn(
      `Already ported post (${getVkLink(post.wall.id, post.wall.ownerId)})`,
    );
    return;
  }

  try {
    // HTML formatting
    const processedText = formatMessageText(post.wall.text || "");
    const sentMessageIds: number[] = [];

    // Split text if it's too long
    const textParts = splitText(processedText);

    // Check for attachments
    if (post.wall.attachments.length > 0) {
      let textSent = false;
      let recordCreated = false;
      const photoUrls: InputMediaPhoto[] = [];

      for (const attachment of post.wall.attachments) {
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
        // If text is too long, send it as a separate message
        let post_msg: (
          | Message.DocumentMessage
          | Message.AudioMessage
          | Message.PhotoMessage
          | Message.VideoMessage
        )[];

        if (textParts.length > 1 || textParts[0].length > 1024) {
          let mainMsgId = null;
          for (const part of textParts) {
            const msgResult = await tgApi.telegram.sendMessage(
              tgChannelPublicLink,
              part,
              { parse_mode: "HTML" },
            );
            sentMessageIds.push(msgResult.message_id);
            if (!mainMsgId) mainMsgId = msgResult.message_id;
          }

          post_msg = await tgApi.telegram.sendMediaGroup(
            tgChannelPublicLink,
            photoUrls,
          );
        } else {
          // Text fits in caption
          photoUrls[0].caption = textParts[0];
          photoUrls[0].parse_mode = "HTML";
          post_msg = await tgApi.telegram.sendMediaGroup(
            tgChannelPublicLink,
            photoUrls,
          );
          for (const m of post_msg) sentMessageIds.push(m.message_id);
          for (const m of post_msg) sentMessageIds.push(m.message_id);
        }

        if (!recordCreated) {
          await Post.create({
            vk_id: post.wall.id,
            vk_author_id: post.wall.ownerId,
            tg_id: sentMessageIds[0] as number,
            tg_ids: sentMessageIds,
            discussion_tg_id: null,
            tg_author_id: JSON.stringify(post_msg[0]?.from?.id ?? null),
            created_at: post.wall.createdAt,

            attachments: JSON.stringify(post.wall.attachments),
          });
          recordCreated = true;
        }
        textSent = true;

        // One photo
      } else if (photoUrls.length === 1) {
        let post_msg: Message.PhotoMessage;

        if (textParts.length > 1 || textParts[0].length > 1024) {
          // Send text as separate message
          let mainMsgId = null;
          for (const part of textParts) {
            const msgResult = await tgApi.telegram.sendMessage(
              tgChannelPublicLink,
              part,
              { parse_mode: "HTML" },
            );
            sentMessageIds.push(msgResult.message_id);
            if (!mainMsgId) mainMsgId = msgResult.message_id;
          }

          post_msg = await tgApi.telegram.sendPhoto(
            tgChannelPublicLink,
            photoUrls[0].media,
          );
          sentMessageIds.push(post_msg.message_id);
        } else {
          post_msg = await tgApi.telegram.sendPhoto(
            tgChannelPublicLink,
            photoUrls[0].media,
            {
              caption: textParts[0],
              parse_mode: "HTML",
            },
          );
          sentMessageIds.push(post_msg.message_id);
        }

        if (!recordCreated) {
          await Post.create({
            vk_id: post.wall.id,
            vk_author_id: post.wall.ownerId,
            tg_id: sentMessageIds[0] as number,
            tg_ids: sentMessageIds,
            discussion_tg_id: null,
            tg_author_id: JSON.stringify(post_msg.from?.id ?? null),
            created_at: post.wall.createdAt,

            attachments: JSON.stringify(post.wall.attachments),
          });
          recordCreated = true;
        }
        textSent = true;
      }

      // Files
      for (const attachment of post.wall.attachments) {
        // File (GIF specifically)
        if (
          Object.prototype.hasOwnProperty.call(attachment.toJSON(), "extension")
        ) {
          let post_msg: Message.AnimationMessage;

          if (!textSent) {
            if (textParts.length > 1 || textParts[0].length > 1024) {
              let mainMsgId = null;
              for (const part of textParts) {
                const msgResult = await tgApi.telegram.sendMessage(
                  tgChannelPublicLink,
                  part,
                  { parse_mode: "HTML" },
                );
                sentMessageIds.push(msgResult.message_id);
                if (!mainMsgId) mainMsgId = msgResult.message_id;
              }

              post_msg = await tgApi.telegram.sendAnimation(
                tgChannelPublicLink,
                String((attachment.toJSON() as DocumentAttachment).url ?? ""),
              );
              sentMessageIds.push(post_msg.message_id);
            } else {
              post_msg = await tgApi.telegram.sendAnimation(
                tgChannelPublicLink,
                String((attachment.toJSON() as DocumentAttachment).url ?? ""),
                {
                  caption: textParts[0],
                  parse_mode: "HTML",
                },
              );
              sentMessageIds.push(post_msg.message_id);
            }

            if (!recordCreated) {
              await Post.create({
                vk_id: post.wall.id,
                vk_author_id: post.wall.ownerId,
                tg_id: sentMessageIds[0] as number,
                tg_ids: sentMessageIds,
                discussion_tg_id: null,
                tg_author_id: JSON.stringify(post_msg.from?.id ?? null),
                created_at: post.wall.createdAt,

                attachments: JSON.stringify(post.wall.attachments),
              });
              recordCreated = true;
            }
            textSent = true;
          }
        }

        if (
          Object.prototype.hasOwnProperty.call(attachment.toJSON(), "genreId")
        ) {
          logger.warn("Audio detected: it will not be processed");
        }

        if (
          Object.prototype.hasOwnProperty.call(
            attachment.toJSON(),
            "question",
          ) &&
          !config.crossposting.parameters.ignorePolls
        ) {
          const json = attachment.toJSON() as PollAttachment;
          const pollOptions: string[] = (json.answers ?? []).map(
            (answer) => answer.text,
          );

          if (!textSent) {
            let mainMsgId = null;
            for (const part of textParts) {
              const msgResult = await tgApi.telegram.sendMessage(
                tgChannelPublicLink,
                part,
                { parse_mode: "HTML" },
              );
              sentMessageIds.push(msgResult.message_id);
              if (!mainMsgId) mainMsgId = msgResult.message_id;
            }
          }

          const post_msg = await tgApi.telegram.sendPoll(
            tgChannelPublicLink,
            json.question ?? "Poll",
            pollOptions,
          );
          sentMessageIds.push(post_msg.message_id);

          if (!recordCreated) {
            await Post.create({
              vk_id: post.wall.id,
              vk_author_id: post.wall.ownerId,
              tg_id: sentMessageIds[0] as number,
              tg_ids: sentMessageIds,
              discussion_tg_id: null,
              tg_author_id: JSON.stringify(post_msg.from?.id ?? null),
              created_at: post.wall.createdAt,

              attachments: JSON.stringify(post.wall.attachments),
            });
            recordCreated = true;
          }
        }
      }
    } else {
      let mainMsgId = null;
      let post_msg: Message.TextMessage | undefined;
      lastPostMsg = post_msg;

      for (const [index, part] of textParts.entries()) {
        post_msg = await tgApi.telegram.sendMessage(tgChannelPublicLink, part, {
          parse_mode: "HTML",
        });
        sentMessageIds.push(post_msg.message_id);

        if (index === 0) {
          mainMsgId = post_msg.message_id;
        }
      }
      try {
        await Post.create({
          vk_id: post.wall.id,
          vk_author_id: post.wall.ownerId,
          tg_id: sentMessageIds[0] as number,
          tg_ids: sentMessageIds,
          discussion_tg_id: null,
          tg_author_id: JSON.stringify(post_msg?.from?.id ?? null),
          created_at: post.wall.createdAt,
          attachments: JSON.stringify(post.wall.attachments),
        });
      } catch (error: unknown) {
        if (error instanceof BaseError) {
          logger.error(
            `[VK -!-> TG] Ported, but binding has failed: ${String(error)}`,
          );
        }
        logger.error(
          `[VK -!-> TG] Ported, but unknown database error appeared: ${String(error)}`,
        );
        return;
      }
    }
    logger.info(
      `[VK –> TG] Successfully ported: ${getVkLink(post.wall.id, post.wall.ownerId)}`,
    );
  } catch (error: unknown) {
    if (error) {
      const errorTraceback = {
        message: String(error),
        stack: error instanceof Error ? error.stack : undefined,
        context: JSON.stringify(post),
        db_context: {
          vk_id: post.wall.id,
          vk_author_id: post.wall.ownerId,
          tg_id: lastPostMsg?.message_id as number,
          discussion_tg_id: null,
          tg_author_id: JSON.stringify(lastPostMsg?.from?.id ?? null),
          created_at: post.wall.createdAt,
          attachments: JSON.stringify(post.wall.attachments),
        },
      };
      logger.error(`[VK -/-> TG] Error while porting: ${error}`);
      logger.debug(`Error traceback: ${JSON.stringify(errorTraceback)}`);
    }
  }
}
