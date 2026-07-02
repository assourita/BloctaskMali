import { apiRequest } from './client';

export interface ChatMessage {
  id: string;
  sender: {
    id: string;
    first_name: string;
    last_name: string;
    profile_picture?: string;
  };
  content: string;
  message_type: 'text' | 'image' | 'location' | 'system';
  is_read: boolean;
  delivered_at?: string | null;
  delivery_status?: 'sent' | 'delivered' | 'read' | null;
  created_at: string;
}

export interface ChatConversation {
  id: string;
  mission?: { id: string; title: string; status: string };
  other_participant: {
    id: string;
    first_name: string;
    last_name: string;
    profile_picture?: string;
  };
  can_write?: boolean;
  is_closed?: boolean;
  unread_count: number;
  updated_at: string;
}

function unwrapList<T>(data: T[] | { results: T[] }): T[] {
  return Array.isArray(data) ? data : data.results || [];
}

export async function getMissionConversation(missionId: string): Promise<ChatConversation | null> {
  const data = await apiRequest<ChatConversation[] | { results: ChatConversation[] }>(
    `/chat/conversations/?mission_id=${missionId}`,
  );
  const list = unwrapList(data);
  return list[0] || null;
}

export async function getMessages(conversationId: string): Promise<ChatMessage[]> {
  const data = await apiRequest<ChatMessage[] | { results: ChatMessage[] }>(
    `/chat/conversations/${conversationId}/messages/`,
  );
  return unwrapList(data);
}

export async function sendMessage(conversationId: string, content: string): Promise<ChatMessage> {
  return apiRequest<ChatMessage>(`/chat/conversations/${conversationId}/messages/`, {
    method: 'POST',
    body: JSON.stringify({ content, message_type: 'text' }),
  });
}

export async function markConversationRead(conversationId: string): Promise<void> {
  await apiRequest(`/chat/conversations/${conversationId}/mark-read/`, { method: 'POST' });
}
