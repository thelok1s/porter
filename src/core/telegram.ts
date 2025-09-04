import config from "../../porter.config";
import logger from "@/lib/logger";

import {
  tgApi,
  tgChannelPublicLink as tgChannelPublicLinkRaw,
  tgChatId as tgChatIdRaw,
  vkGlobalApi,
} from "@/core/api";
import { getVkLink } from "@/core/vkontakte";
const tgChannelPublicLink = String(tgChannelPublicLinkRaw ?? "");
const tgChatId = String(tgChatIdRaw ?? "");

import { Post } from "@/models/post.schema";
import { Reply as ReplyModel } from "@/models/reply.schema";
import { InputMediaPhoto, Message } from "telegraf/types";
import type {
  WallPostContext,
  CommentContext,
  PhotoAttachment,
  DocumentAttachment,
  PollAttachment,
} from "vk-io";

function splitText(text: string, maxLength: number = 4096): string[] {
  if (!text || text.length <= maxLength) {
    return [text];
  }

  // find a paragraph break
  let splitPoint = text.lastIndexOf("\n\n", maxLength);
  if (splitPoint === -1 || splitPoint < maxLength * 0.8) {
    splitPoint = text.lastIndexOf("\n", maxLength);
  }
  if (splitPoint === -1 || splitPoint < maxLength * 0.8) {
    // try a sentence
    splitPoint = text.lastIndexOf(". ", maxLength);
  }
  if (splitPoint === -1 || splitPoint < maxLength * 0.8) {
    // split at max length
    splitPoint = maxLength;
  }

  const firstPart = text.substring(0, splitPoint).trim();
  const remainingPart = text.substring(splitPoint).trim();

  return [firstPart, ...splitText(remainingPart, maxLength)];
}

function convertVkLinksToHtml(text: string): string {
  if (!text) return "";

  // [url|title] pattern
  const linkPattern = /\[(?<url>[^[|]+)\|(?<title>[^\]]+)]/g;

  // [#alias|url1|url2] pattern
  const hashtagLinkPattern =
    /\[#(?<alias>[^[|]+)\|(?<url1>[^|]+)\|(?<url2>[^\]]+)]/g;

  const vkIdPattern = /^(id|club)\d+$/;
  const vkLinkPattern =
    /^(https?:\/\/)?(m\.)?vk\.com(\/[\w\-.~:/?#[\]@&()*+,;%="ёЁа-яА-Я]*)?$/;

  let safeText = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  safeText = safeText.replace(
    hashtagLinkPattern,
    (_match, _alias, url1, _url2) => {
      if (vkLinkPattern.test(url1)) {
        if (!url1.startsWith("http")) {
          url1 = "https://" + url1;
        }
        return `<a href="${url1}">${url1}</a>`;
      }
      return url1;
    },
  );

  safeText = safeText.replace(linkPattern, (_match, url, title) => {
    if (vkIdPattern.test(url)) {
      url = `https://vk.com/${url}`;
    }

    if (vkLinkPattern.test(url)) {
      if (!url.startsWith("http")) {
        url = "https://" + url;
      }
      return `<a href="${url}">${title}</a>`;
    }

    return `[${url}|${title}]`;
  });

  return safeText;
}

function getHtmlLink(url: string, text: string): string {
  if (url && !url.startsWith("http") && !url.startsWith("//")) {
    url = "https://" + url;
  }
  return `<a href="${url}">${text}</a>`;
}

function formatMessageText(text: string, useHtml: boolean = true): string {
  if (!text) return "";
  if (useHtml) {
    return convertVkLinksToHtml(text);
  } else {
    return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
  }
}

export async function postToTelegram(post: WallPostContext) {
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

    // Split text if it's too long
    const textParts = splitText(processedText);

    // Check for attachments
    if (post.wall.attachments.length > 0) {
      let textSent = false;
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
        }

        await Post.create({
          vk_id: post.wall.id,
          vk_author_id: post.wall.ownerId,
          tg_id: post_msg[0]?.message_id as number,
          discussion_tg_id: null,
          tg_author_id: JSON.stringify(post_msg[0]?.from?.id ?? null),
          created_at: post.wall.createdAt,

          attachments: JSON.stringify(post.wall.attachments),
        });
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
            if (!mainMsgId) mainMsgId = msgResult.message_id;
          }

          post_msg = await tgApi.telegram.sendPhoto(
            tgChannelPublicLink,
            photoUrls[0].media,
          );
        } else {
          post_msg = await tgApi.telegram.sendPhoto(
            tgChannelPublicLink,
            photoUrls[0].media,
            {
              caption: textParts[0],
              parse_mode: "HTML",
            },
          );
        }

        await Post.create({
          vk_id: post.wall.id,
          vk_author_id: post.wall.ownerId,
          tg_id: post_msg.message_id,
          discussion_tg_id: null,
          tg_author_id: JSON.stringify(post_msg.from?.id ?? null),
          created_at: post.wall.createdAt,

          attachments: JSON.stringify(post.wall.attachments),
        });
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
                if (!mainMsgId) mainMsgId = msgResult.message_id;
              }

              post_msg = await tgApi.telegram.sendAnimation(
                tgChannelPublicLink,
                String((attachment.toJSON() as DocumentAttachment).url ?? ""),
              );
            } else {
              post_msg = await tgApi.telegram.sendAnimation(
                tgChannelPublicLink,
                String((attachment.toJSON() as DocumentAttachment).url ?? ""),
                {
                  caption: textParts[0],
                  parse_mode: "HTML",
                },
              );
            }

            await Post.create({
              vk_id: post.wall.id,
              vk_author_id: post.wall.ownerId,
              tg_id: post_msg.message_id,
              discussion_tg_id: null,
              tg_author_id: JSON.stringify(post_msg.from?.id ?? null),
              created_at: post.wall.createdAt,

              attachments: JSON.stringify(post.wall.attachments),
            });
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
              if (!mainMsgId) mainMsgId = msgResult.message_id;
            }
          }

          const post_msg = await tgApi.telegram.sendPoll(
            tgChannelPublicLink,
            json.question ?? "Poll",
            pollOptions,
          );

          await Post.create({
            vk_id: post.wall.id,
            vk_author_id: post.wall.ownerId,
            tg_id: post_msg.message_id,
            discussion_tg_id: null,
            tg_author_id: JSON.stringify(post_msg.from?.id ?? null),
            created_at: post.wall.createdAt,

            attachments: JSON.stringify(post.wall.attachments),
          });
        }
      }
    } else {
      let mainMsgId = null;
      let post_msg: Message.TextMessage | undefined;

      for (const [index, part] of textParts.entries()) {
        post_msg = await tgApi.telegram.sendMessage(tgChannelPublicLink, part, {
          parse_mode: "HTML",
        });

        if (index === 0) {
          mainMsgId = post_msg.message_id;
        }
      }

      await Post.create({
        vk_id: post.wall.id,
        vk_author_id: post.wall.ownerId,
        tg_id: mainMsgId as number,
        discussion_tg_id: null,
        tg_author_id: JSON.stringify(post_msg?.from?.id ?? null),
        created_at: post.wall.createdAt,

        attachments: JSON.stringify(post.wall.attachments),
      });
    }
    logger.info(
      `[VK –> TG] Successfully ported: ${getVkLink(post.wall.id, post.wall.ownerId)}`,
    );
  } catch (error: unknown) {
    logger.error(
      `[VK -/-> TG] Error while porting: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function replyToTelegram(reply: CommentContext) {
  try {
    const post = await Post.findOne({
      where: { vk_id: reply.objectId },
      attributes: ["discussion_tg_id"],
    });

    if (!post?.discussion_tg_id) {
      logger.warn(`Discussion not found for msg id: ${reply.objectId}`);
      return;
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
                          message_id: post.discussion_tg_id,
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
                  message_id: Number(mainMsgId),
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
                  message_id: post.discussion_tg_id,
                },
              },
            );
          }

          await ReplyModel.create({
            vk_post_id: reply.objectId,
            vk_reply_id: reply.id,
            vk_author_id: reply.ownerId,
            tg_reply_id: reply_msg[0]?.message_id as number,
            discussion_tg_id: post.discussion_tg_id,
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
                          message_id: post.discussion_tg_id,
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
                  message_id: Number(mainMsgId),
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
                  message_id: post.discussion_tg_id,
                },
              },
            );
          }

          await ReplyModel.create({
            vk_post_id: reply.objectId,
            vk_reply_id: reply.id,
            vk_author_id: reply.ownerId,
            tg_reply_id: reply_msg.message_id,
            discussion_tg_id: post.discussion_tg_id,
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
                          message_id: post.discussion_tg_id,
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
                  message_id: Number(mainMsgId),
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
                  message_id: Number(post.discussion_tg_id),
                },
              },
            );
          }

          await ReplyModel.create({
            vk_post_id: reply.objectId,
            vk_reply_id: reply.id,
            vk_author_id: reply.ownerId,
            tg_reply_id: reply_msg.message_id,
            discussion_tg_id: post.discussion_tg_id,
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
                    message_id: post.discussion_tg_id,
                  }
                : undefined,
            link_preview_options: { is_disabled: true },
          });

          if (index === 0) {
            mainMsgId = reply_msg.message_id;
          }
        }

        await ReplyModel.create({
          vk_post_id: reply.objectId,
          vk_reply_id: reply.id,
          vk_author_id: reply.ownerId,
          tg_reply_id: mainMsgId as number,
          discussion_tg_id: post.discussion_tg_id,
          tg_author_id: reply_msg?.from?.id ?? null,
          created_at:
            typeof reply.createdAt === "number"
              ? new Date((reply.createdAt as number) * 1000)
              : reply.createdAt,

          attachments: JSON.stringify(reply.attachments || []),
        });
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

      logger.info(`[VK –> TG] Reply edited: ${reply.id}`);
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

      logger.info(`[VK –> TG] Reply deleted: ${reply.id}`);
    }
  } catch (error) {
    logger.error(`Error handling reply ${reply?.id}: ${error}`);
  }
}
