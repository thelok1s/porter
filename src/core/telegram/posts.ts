import { PorterConfig as config } from "../../../porter.config";
import { getVkLink } from "../utils";
const tgChannelPublicLink = String(tgChannelPublicLinkRaw ?? "");
import logger from "@/lib/logger";
import {
  tgApi,
  tgChannelPublicLink as tgChannelPublicLinkRaw,
} from "@/core/api";
import { Post } from "@/models/post.schema";
import { InputMediaPhoto, InputMediaDocument, Message } from "telegraf/types";
import type {
  WallPostContext,
  PhotoAttachment,
  DocumentAttachment,
  PollAttachment,
} from "vk-io";
import { formatMessageText, splitText } from "../utils";

const lastPostMsg: Message.TextMessage | null | undefined = null;

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
    logger.info(
      `Already ported post (${getVkLink(post.wall.id, post.wall.ownerId)})`,
    );
    return;
  }

  try {
    // HTML formatting
    const processedText = formatMessageText(post.wall.text || "");
    const sentMessageIds: number[] = [];

    // Build attachment buckets: photos -> text -> files -> poll
    const photos: InputMediaPhoto[] = [];
    const documents: InputMediaDocument[] = [];
    let pollQuestion: string | null = null;
    let pollOptions: string[] = [];

    for (const attachment of post.wall.attachments) {
      const json = attachment.toJSON() as
        | PhotoAttachment
        | DocumentAttachment
        | PollAttachment;

      const purl =
        (json as PhotoAttachment).largeSizeUrl ??
        (json as PhotoAttachment).mediumSizeUrl ??
        (json as PhotoAttachment).smallSizeUrl;
      if (purl) {
        photos.push({ type: "photo", media: purl });
        continue;
      }

      if (Object.prototype.hasOwnProperty.call(json, "extension")) {
        const url = (json as DocumentAttachment).url;
        if (url) {
          documents.push({ type: "document", media: String(url) });
        }
        continue;
      }

      if (
        Object.prototype.hasOwnProperty.call(json, "question") &&
        !config.crossposting.parameters.ignorePolls
      ) {
        pollQuestion = (json as PollAttachment).question ?? "Poll";
        pollOptions = ((json as PollAttachment).answers ?? []).map(
          (a) => a.text,
        );
      }
    }

    let recordCreated = false;
    let firstFrom: string | null = null;

    // 1) Photos first (caption up to 1024)
    let remainingText = processedText;
    if (photos.length > 0) {
      let caption = "";
      if (remainingText) {
        caption = remainingText.slice(0, 1024);
        remainingText = remainingText.slice(caption.length).trim();
      }
      if (caption) {
        photos[0].caption = caption;
        photos[0].parse_mode = "HTML";
      }

      const group = await tgApi.telegram.sendMediaGroup(
        tgChannelPublicLink,
        photos,
      );
      for (const m of group) sentMessageIds.push(m.message_id);
      if (!firstFrom) firstFrom = JSON.stringify(group[0]?.from?.id ?? null);

      if (!recordCreated) {
        await Post.create({
          vk_id: post.wall.id,
          vk_author_id: post.wall.ownerId,
          tg_id: sentMessageIds[0] as number,
          tg_ids: sentMessageIds,
          discussion_tg_id: null,
          tg_author_id: firstFrom,
          created_at: post.wall.createdAt,
          attachments: JSON.stringify(post.wall.attachments),
        });
        recordCreated = true;
      }
    }

    // 2) Remaining text chunks
    const remainingParts = remainingText ? splitText(remainingText) : [];
    for (const part of remainingParts) {
      const msg = await tgApi.telegram.sendMessage(tgChannelPublicLink, part, {
        parse_mode: "HTML",
      });
      sentMessageIds.push(msg.message_id);
      if (!firstFrom) firstFrom = JSON.stringify(msg.from?.id ?? null);

      if (!recordCreated) {
        await Post.create({
          vk_id: post.wall.id,
          vk_author_id: post.wall.ownerId,
          tg_id: sentMessageIds[0] as number,
          tg_ids: sentMessageIds,
          discussion_tg_id: null,
          tg_author_id: firstFrom,
          created_at: post.wall.createdAt,
          attachments: JSON.stringify(post.wall.attachments),
        });
        recordCreated = true;
      }
    }

    // 3) Files (documents) as the last content block
    if (documents.length > 0) {
      if (documents.length > 1) {
        const group = await tgApi.telegram.sendMediaGroup(
          tgChannelPublicLink,
          documents,
        );
        for (const m of group) sentMessageIds.push(m.message_id);
        if (!firstFrom) firstFrom = JSON.stringify(group[0]?.from?.id ?? null);
      } else {
        const docMsg = await tgApi.telegram.sendDocument(
          tgChannelPublicLink,
          documents[0].media,
        );
        const docId = (docMsg as unknown as Message.DocumentMessage).message_id;
        sentMessageIds.push(docId);
        if (!firstFrom)
          firstFrom = JSON.stringify(
            (docMsg as unknown as Message.DocumentMessage).from?.id ?? null,
          );
      }

      if (!recordCreated) {
        await Post.create({
          vk_id: post.wall.id,
          vk_author_id: post.wall.ownerId,
          tg_id: sentMessageIds[0] as number,
          tg_ids: sentMessageIds,
          discussion_tg_id: null,
          tg_author_id: firstFrom,
          created_at: post.wall.createdAt,
          attachments: JSON.stringify(post.wall.attachments),
        });
        recordCreated = true;
      }
    }

    // 4) Poll at the very end
    if (pollQuestion && pollOptions.length > 0) {
      const pollMsg = await tgApi.telegram.sendPoll(
        tgChannelPublicLink,
        pollQuestion,
        pollOptions,
      );
      sentMessageIds.push(pollMsg.message_id);
      if (!firstFrom) firstFrom = JSON.stringify(pollMsg.from?.id ?? null);

      if (!recordCreated) {
        await Post.create({
          vk_id: post.wall.id,
          vk_author_id: post.wall.ownerId,
          tg_id: sentMessageIds[0] as number,
          tg_ids: sentMessageIds,
          discussion_tg_id: null,
          tg_author_id: firstFrom,
          created_at: post.wall.createdAt,
          attachments: JSON.stringify(post.wall.attachments),
        });
        recordCreated = true;
      }
    }

    // If nothing sent yet and there is text, send it now
    if (sentMessageIds.length === 0 && processedText) {
      const parts = splitText(processedText);
      for (const part of parts) {
        const msg = await tgApi.telegram.sendMessage(
          tgChannelPublicLink,
          part,
          { parse_mode: "HTML" },
        );
        sentMessageIds.push(msg.message_id);
        if (!firstFrom) firstFrom = JSON.stringify(msg.from?.id ?? null);
      }

      if (!recordCreated && sentMessageIds.length > 0) {
        await Post.create({
          vk_id: post.wall.id,
          vk_author_id: post.wall.ownerId,
          tg_id: sentMessageIds[0] as number,
          tg_ids: sentMessageIds,
          discussion_tg_id: null,
          tg_author_id: firstFrom,
          created_at: post.wall.createdAt,
          attachments: JSON.stringify(post.wall.attachments),
        });
        recordCreated = true;
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
      logger.error(`[VK -X-> TG] Error while porting: ${error}`);
      logger.debug(`Error traceback: ${JSON.stringify(errorTraceback)}`);
    }
  }
}
