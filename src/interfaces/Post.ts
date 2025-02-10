export interface Post {
  id: number;
  vk_id: number;
  vk_owner_id: number;
  tg_id: number;
  discussion_tg_id: number;
  tg_author_id: string;
  created_at: string;
  text: string;
  text_hash: string;
  attachments: string;
}

