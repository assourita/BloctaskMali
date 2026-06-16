import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, map, of, switchMap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export interface User {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  user_type: 'client' | 'provider' | 'enterprise' | 'admin';
  secondary_role?: 'client' | 'provider' | null;
  active_role?: 'client' | 'provider' | 'enterprise' | 'admin';
  gps_tracking_enabled?: boolean;
  profile_picture?: string;
  wallet_address?: string;
  kyc_status: string;
  is_active: boolean;
  email_verified: boolean;
  phone_verified: boolean;
  phone_number?: string;
  created_at: string;
  provider_profile?: any;
  enterprise_profile?: any;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  user_type: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  /** Rôle actif dans l'interface (primaire ou secondaire) */
  private activeRoleSubject = new BehaviorSubject<string | null>(null);
  public activeRole$ = this.activeRoleSubject.asObservable();
  
  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.loadUserFromStorage();
  }
  
  private loadUserFromStorage(): void {
    const token = localStorage.getItem('access_token');
    const user = localStorage.getItem('user');
    if (token && user) {
      const parsed: User = JSON.parse(user);
      this.currentUserSubject.next(parsed);
      this.isAuthenticatedSubject.next(true);
      this.activeRoleSubject.next(parsed.active_role || parsed.user_type);
    }
  }
  
  login(credentials: LoginCredentials): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/token/`, credentials).pipe(
      switchMap((response: any) => {
        this.setSession(response);
        return this.loadUserProfile();
      })
    );
  }
  
  register(data: RegisterData): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/register/`, data).pipe(
      tap((response: any) => {
        this.setSession(response);
        this.currentUserSubject.next(response.user);
      })
    );
  }
  
  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    this.router.navigate(['/login']);
  }
  
  private setSession(authResult: any): void {
    localStorage.setItem('access_token', authResult.access);
    localStorage.setItem('refresh_token', authResult.refresh);
    if (authResult.user) {
      localStorage.setItem('user', JSON.stringify(authResult.user));
    }
    this.isAuthenticatedSubject.next(true);
  }
  
  private loadUserProfile(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/me/`).pipe(
      tap((user: User) => {
        localStorage.setItem('user', JSON.stringify(user));
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);
        this.activeRoleSubject.next(user.active_role || user.user_type);
      })
    );
  }

  getActiveRole(): string {
    return this.activeRoleSubject.value || this.currentUserSubject.value?.user_type || 'client';
  }

  activateProviderRole(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/users/activate-provider-role/`, {}).pipe(
      tap((res) => {
        if (res.user) {
          const updated = { ...this.currentUserSubject.value!, ...res.user };
          localStorage.setItem('user', JSON.stringify(updated));
          this.currentUserSubject.next(updated);
        }
      })
    );
  }

  switchRole(role: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/users/switch-role/`, { role }).pipe(
      tap((res) => {
        const updated = { ...this.currentUserSubject.value!, active_role: res.active_role };
        localStorage.setItem('user', JSON.stringify(updated));
        this.currentUserSubject.next(updated);
        this.activeRoleSubject.next(res.active_role);
        this.router.navigate([`/${res.active_role}`]);
      })
    );
  }
  
  getToken(): string | null {
    return localStorage.getItem('access_token');
  }
  
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }
  
  updateProfile(data: Partial<User>): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/users/me/`, data).pipe(
      tap(user => {
        localStorage.setItem('user', JSON.stringify(user));
        this.currentUserSubject.next(user);
      })
    );
  }
  
  connectWallet(walletAddress: string, signature: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/wallet/connect/`, {
      wallet_address: walletAddress,
      signature: signature,
      message: 'Connect wallet to BlockTask'
    }).pipe(
      tap(() => this.loadUserProfile())
    );
  }
  
  changePassword(oldPassword: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/password/change/`, {
      old_password: oldPassword,
      new_password: newPassword,
      new_password_confirm: newPassword
    });
  }
  
  hasRole(role: string): boolean {
    const user = this.currentUserSubject.value;
    return user ? user.user_type === role : false;
  }
  
  isClient(): boolean {
    return this.hasRole('client');
  }
  
  isProvider(): boolean {
    return this.hasRole('provider');
  }
  
  isEnterprise(): boolean {
    return this.hasRole('enterprise');
  }
  
  isAdmin(): boolean {
    return this.hasRole('admin');
  }
}
