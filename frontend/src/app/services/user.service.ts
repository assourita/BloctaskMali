import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface User {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  user_type: 'client' | 'provider' | 'enterprise' | 'admin';
  is_active: boolean;
  kyc_status: 'pending' | 'verified' | 'rejected' | 'not_submitted';
  created_at: string;
  last_login?: string;
  phone_number?: string;
  wallet_address?: string;
  is_email_verified: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  getUsers(): Observable<User[]> {
    console.log('Fetching users from:', `${this.apiUrl}/users/`);
    return this.http.get<User[]>(`${this.apiUrl}/users/`, {
      headers: this.getHeaders()
    }).pipe(
      catchError((error) => {
        console.error('Error fetching users from API:', error);
        console.log('Using mock data as fallback');
        return of(this.getMockUsers());
      })
    );
  }

  getUser(id: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/${id}/`, {
      headers: this.getHeaders()
    });
  }

  createUser(userData: Partial<User>): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/users/`, userData, {
      headers: this.getHeaders()
    });
  }

  updateUser(id: string, userData: Partial<User>): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/users/${id}/`, userData, {
      headers: this.getHeaders()
    });
  }

  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/users/${id}/`, {
      headers: this.getHeaders()
    });
  }

  toggleUserStatus(id: string, isActive: boolean): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/users/${id}/`, { is_active: isActive }, {
      headers: this.getHeaders()
    });
  }

  verifyKYC(id: string): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/users/${id}/`, { kyc_status: 'verified' }, {
      headers: this.getHeaders()
    });
  }

  rejectKYC(id: string): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/users/${id}/`, { kyc_status: 'rejected' }, {
      headers: this.getHeaders()
    });
  }

  private getMockUsers(): User[] {
    return [
      {
        id: '1',
        email: 'admin@blocktask.ci',
        username: 'admin',
        first_name: 'Admin',
        last_name: 'System',
        user_type: 'admin',
        is_active: true,
        kyc_status: 'verified',
        created_at: '2024-01-15T10:30:00Z',
        last_login: '2024-06-13T15:45:00Z',
        phone_number: '+225 01 02 03 04 05',
        is_email_verified: true
      },
      {
        id: '2',
        email: 'jean.dupont@email.com',
        username: 'jeandupont',
        first_name: 'Jean',
        last_name: 'Dupont',
        user_type: 'client',
        is_active: true,
        kyc_status: 'verified',
        created_at: '2024-02-20T14:15:00Z',
        last_login: '2024-06-12T09:20:00Z',
        phone_number: '+225 07 08 09 10 11',
        is_email_verified: true
      },
      {
        id: '3',
        email: 'marie.martin@email.com',
        username: 'mariemartin',
        first_name: 'Marie',
        last_name: 'Martin',
        user_type: 'provider',
        is_active: true,
        kyc_status: 'pending',
        created_at: '2024-03-10T11:00:00Z',
        last_login: '2024-06-13T08:30:00Z',
        phone_number: '+225 05 06 07 08 09',
        is_email_verified: true
      },
      {
        id: '4',
        email: 'tech.solutions@entreprise.com',
        username: 'techsolutions',
        first_name: 'Tech',
        last_name: 'Solutions',
        user_type: 'enterprise',
        is_active: true,
        kyc_status: 'verified',
        created_at: '2024-01-25T09:00:00Z',
        last_login: '2024-06-11T16:00:00Z',
        phone_number: '+225 02 03 04 05 06',
        is_email_verified: true
      }
    ];
  }
}
