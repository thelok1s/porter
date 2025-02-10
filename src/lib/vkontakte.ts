import logger from "@/lib/logger";
import { db } from "@/lib/database";
import { API } from "vk-io";
import { Telegraf } from "telegraf";
import { Post } from "@/interfaces/Post";

export function getVkLink(id: number, ownerId: number): string {
  return `https://vk.com/wall${ownerId}_${id}`;
}

export function vkCommenter(message: any) {
  // VK commenting logic
}

export async function vkPoster(message: any) {
  // VK posting logic
}

export async function syncRecentPosts(
  tgApi: Telegraf,
  vkGlobalApi: API,
  channelId: string,
) {
  try {
    const recentPosts: Post[] = db
      .query("SELECT * FROM posts ORDER BY created_at DESC LIMIT 10")
      .all() as Post[];

    for (const post of recentPosts) {
      try {
        const wallPost = await vkGlobalApi.wall.getById({
          posts: `${post.vk_owner_id}_${post.vk_id}`,
        });
        // ...
      } catch (error) {
        logger.error(`Failed to check VK post ${post.vk_id}:`, error);
        continue;
      }
    }
  } catch (error) {
    logger.error("Failed to sync recent posts:", error);
  }
}
