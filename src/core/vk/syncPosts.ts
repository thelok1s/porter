import logger from "@/lib/logger";
import { Post as PostModel } from "@/models/post.schema";

import type { Post } from "@/types/Database";
import { Telegraf } from "telegraf";
import { API } from "vk-io";
import type { WallPostContext, CommentContext } from "vk-io";

export default async function syncRecentPosts(
  tgApi: Telegraf,
  vkGlobalApi: API,
  channelId: string,
) {
  try {
    // under construction, ai generated
    const recentPosts = (await PostModel.findAll({
      order: [["created_at", "DESC"]],
      limit: 5,
      raw: true,
    })) as unknown as Post[];

    for (const post of recentPosts) {
      try {
        const wallPost = await vkGlobalApi.wall.getById({
          posts: `${post.vk_author_id}_${post.vk_id}`,
        });
      } catch (error) {
        logger.error(`Failed to check VK post ${post.vk_id}: ${error}`);
      }
    }
  } catch (error) {
    logger.error("Failed to sync recent posts: ${error}");
  }
}
