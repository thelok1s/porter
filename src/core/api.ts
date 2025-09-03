import { API, VK } from "vk-io";
import { Telegraf } from "telegraf";
import dotenv from "dotenv";
dotenv.config();

export const tgChannelId = process.env.TELEGRAM_CHANNEL_ID;
export const tgChatId = process.env.TELEGRAM_CHAT_ID;
export const tgChannelPublicLink = process.env.TELEGRAM_CHANNEL_PUBLIC_LINK;

if (
  process.env.VK_TOKEN === undefined ||
  process.env.TELEGRAM_TOKEN === undefined
) {
  throw new Error("Tokens are not provided");
}

export const vkGroupApi = new VK({
  token: process.env.VK_TOKEN,
});
export const vkGlobalApi = new API({
  token: process.env.VK_TOKEN,
});

export const tgApi = new Telegraf(process.env.TELEGRAM_TOKEN);
