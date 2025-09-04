export interface Post {
  id: number;
  vk_id: number;
  vk_author_id: number;
  tg_id: number;
  discussion_tg_id: number;
  tg_author_id: number;
  created_at: number;
  text_hash: string;
  attachments: any;
}
