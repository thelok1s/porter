export type Reply = {
  id: number;
  vk_post_id: number | null;
  vk_reply_id: number | null;
  vk_author_id: number | null;
  tg_reply_id: number | null;
  discussion_tg_id: number | null;
  tg_author_id: number | null;
  created_at: Date | null;
  attachments: unknown | null;
};

export type Post = {
  id: number;
  vk_id: number;
  vk_author_id: number | null;
  tg_id: number;
  discussion_tg_id: number | null;
  tg_author_id: string | null;
  created_at: number | null;
  attachments: string | null;
};
