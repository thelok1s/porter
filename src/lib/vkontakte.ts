import logger from "@/lib/logger";
import { db } from "@/db/database";
import { Post } from "@/interfaces/Post";
import { Telegraf } from "telegraf";
import { API } from "vk-io";

export function getVkLink(id: number, ownerId: number): string {
  return `https://vk.com/wall${ownerId}_${id}`;
}

export async function postToVk(message: any) {
  // TODO VK posting logic
}

export function replyToVk(message: any) {
  // TODO VK reply logic
}

export async function syncRecentPosts(
  tgApi: Telegraf,
  vkGlobalApi: API,
  channelId: string,
) {
  try {
    // under construction, ai generated
    const recentPosts: Post[] = db
      .query("SELECT * FROM posts ORDER BY created_at DESC LIMIT 5")
      .all() as Post[];

    for (const post of recentPosts) {
      try {
        const wallPost = await vkGlobalApi.wall.getById({
          posts: `${post.vk_owner_id}_${post.vk_id}`,
        });
      } catch (error) {
        logger.error(`Failed to check VK post ${post.vk_id}:`, error);
      }
    }
  } catch (error) {
    logger.error("Failed to sync recent posts:", error);
  }
}
