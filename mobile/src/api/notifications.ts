import { apiRequest } from './client';

export interface AppNotification {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  action_url?: string;
  mission_id?: string;
  mission_title?: string;
  created_at: string;
}

export interface RegisterResponse {
  message: string;
  email_verification_required: boolean;
  email_sent: boolean;
  email: string;
  user: { id: string; email: string; email_verified: boolean };
}

function unwrapList<T>(data: T[] | { results: T[] }): T[] {
  return Array.isArray(data) ? data : data.results || [];
}

export async function getNotifications(unreadOnly = false): Promise<AppNotification[]> {
  const path = unreadOnly ? '/notifications/?unread=true' : '/notifications/';
  const data = await apiRequest<AppNotification[] | { results: AppNotification[] }>(path);
  return unwrapList(data);
}

export async function getUnreadCount(): Promise<number> {
  const data = await apiRequest<{ count: number }>('/notifications/unread_count/');
  return data.count ?? 0;
}

export async function markRead(id: string): Promise<AppNotification> {
  return apiRequest<AppNotification>(`/notifications/${id}/mark_read/`, { method: 'POST' });
}

export async function markAllRead(): Promise<number> {
  const data = await apiRequest<{ marked: number }>('/notifications/mark_all_read/', { method: 'POST' });
  return data.marked ?? 0;
}

export async function verifyEmail(uid: string, token: string): Promise<{ message: string }> {
  return apiRequest('/users/email/verify/', {
    method: 'POST',
    body: JSON.stringify({ uid, token }),
  });
}

export async function resendVerificationEmail(email: string): Promise<{ message: string }> {
  return apiRequest('/users/email/resend/', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function registerPushToken(pushToken: string): Promise<void> {
  await apiRequest('/notifications/register_push/', {
    method: 'POST',
    body: JSON.stringify({
      push_token: pushToken,
      device_type: 'mobile',
    }),
  });
}
