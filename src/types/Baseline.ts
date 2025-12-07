export type TGDiscussionMessage = {
  message_id: number;
  from?: { id?: number; first_name?: string; last_name?: string };
  chat?: { id?: number; type?: string };
  is_automatic_forward?: boolean;
  forward_from_chat?: { id?: number };
  forward_from_message_id?: number;
  message_thread_id?: number;
  reply_to_message?: TGDiscussionMessage;
  text?: string;
  caption?: string;
  date?: number;
};
