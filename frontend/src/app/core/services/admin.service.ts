import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AdminStats {
  total_users: number;
  total_clients: number;
  total_providers: number;
  total_enterprises: number;
  total_missions: number;
  pending_kyc: number;
  pending_disputes: number;
  active_missions: number;
  completed_missions: number;
}

export interface AdminActivity {
  type: string;
  icon: string;
  text: string;
  time: string;
  time_display: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getStats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${this.apiUrl}/users/admin/stats/`);
  }

  getRecentActivity(): Observable<AdminActivity[]> {
    return this.http.get<AdminActivity[]>(`${this.apiUrl}/users/admin/activity/`);
  }
}
