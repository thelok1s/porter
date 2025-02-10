export interface Comment {
  id: number;
  state: string;
  vk_id: number;
  vk_owner_id: number;
  tg_id: number;
  tg_author_id: number;
  created_at: string;
  text: string;
  text_hash: string;
  attachments: any[];
}