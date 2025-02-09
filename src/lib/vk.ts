import { db } from "@/lib/database";
import { API } from "vk-io";
import { Telegraf } from "telegraf";
import logger from "@/lib/logger";

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
  const recentPosts = db
    .query("SELECT * FROM posts ORDER BY created_at DESC LIMIT 10")
    .all();

  for (const post of recentPosts) {
    const wallPost = await vkGlobalApi.wall.getById({
      posts: `${post.vk_owner_id}_${post.vk_id}`,
    });

    if (wallPost && wallPost.length > 0) {
      logger.debug(`Post ${post.vk_id} still exists`);
      continue;
    }

    logger.info(`VK post ${post.vk_id} was deleted, removing from Telegram...`);
    await tgApi.telegram
      .deleteMessage(tgChannelPublicLink, post.tg_id)
      .catch((error) => {
        if (error.description === "Message to delete not found") {
          logger.warn(`Telegram message ${post.tg_id} already deleted`);
        } else {
          throw error;
        }
      });

    db.run("DELETE FROM posts WHERE vk_id = ? AND vk_owner_id = ?", [
      post.vk_id,
      post.vk_owner_id,
    ]);
  }
}
