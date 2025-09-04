import logger from "@/lib/logger";
import { Post as PostModel } from "@/models/post.schema";

import type { Post } from "@/types/Database";
import { Telegraf } from "telegraf";
import { API } from "vk-io";
import type { WallPostContext, CommentContext } from "vk-io";

export function replyToVk(message: CommentContext) {
  // TODO VK reply logic
}
