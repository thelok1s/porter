export interface Reply {
  id: number;
  vk_post_id: number;
  vk_reply_id: number;
  vk_author_id: number;
  tg_reply_id: number;
  discussion_tg_id: number;
  tg_author_id: number;
  created_at: number;
  text_hash: number;
  attachments: any;
}
