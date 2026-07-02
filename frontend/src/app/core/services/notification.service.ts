import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

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

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private apiUrl = `${environment.apiUrl}/notifications`;

  constructor(private http: HttpClient) {}

  private headers(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('access_token') || ''}`
    });
  }

  getNotifications(unreadOnly = false): Observable<AppNotification[]> {
    const url = unreadOnly ? `${this.apiUrl}/?unread=true` : `${this.apiUrl}/`;
    return this.http.get<AppNotification[] | { results: AppNotification[] }>(url, { headers: this.headers() }).pipe(
      map(r => Array.isArray(r) ? r : (r.results || []))
    );
  }

  getUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/unread_count/`, { headers: this.headers() });
  }

  markRead(id: string): Observable<AppNotification> {
    return this.http.post<AppNotification>(`${this.apiUrl}/${id}/mark_read/`, {}, { headers: this.headers() });
  }

  markAllRead(): Observable<{ marked: number }> {
    return this.http.post<{ marked: number }>(`${this.apiUrl}/mark_all_read/`, {}, { headers: this.headers() });
  }
}
