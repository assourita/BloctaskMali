import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, switchMap } from 'rxjs';
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
  nina?: string;
  kyc_submitted_at?: string;
  id_card_front_url?: string;
  id_card_back_url?: string;
  selfie_verification_url?: string;
  has_id_card_front?: boolean;
  has_id_card_back?: boolean;
  has_selfie_verification?: boolean;
  created_at: string;
  profile_complete?: boolean;
  profile_missing_fields?: string[];
  kyc_access_status?: 'incomplete' | 'pending_review' | 'rejected' | 'approved';
  can_access_platform?: boolean;
  kyc_block_message?: string;
  kyc_rejection_reason?: string;
  provider_profile?: any;
  enterprise_profile?: any;
}

export interface LoginCredentials {
  email: string;
  password: string;
  otp?: string;
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
    const body: Record<string, string> = {
      email: credentials.email,
      password: credentials.password,
    };
    if (credentials.otp) body['otp'] = credentials.otp;
    return this.http.post(`${this.apiUrl}/auth/token/`, body).pipe(
      switchMap((response: any) => {
        this.setSession(response);
        return this.loadUserProfile();
      })
    );
  }

  loginWithGoogle(idToken: string, userType = 'client'): Observable<User> {
    return this.http.post<any>(`${this.apiUrl}/auth/google/`, {
      id_token: idToken,
      user_type: userType,
    }).pipe(
      switchMap((response) => {
        this.setSession(response);
        return this.loadUserProfile();
      })
    );
  }
  
  register(data: RegisterData): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/register/`, data);
  }

  verifyEmail(uid: string, token: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/email/verify/`, { uid, token });
  }

  resendVerificationEmail(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/email/resend/`, { email });
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
  
  refreshUserProfile(): Observable<User> {
    return this.loadUserProfile();
  }

  getProfilePath(): string {
    const role = this.getActiveRole();
    return `/${role}/profile`;
  }

  getPostAuthPath(): string {
    const role = this.getActiveRole();
    const user = this.getCurrentUser();
    if (user?.can_access_platform === false) {
      return `/${role}/profile`;
    }
    return `/${role}/dashboard`;
  }

  /** Après connexion ou inscription : dashboard si KYC approuvé, sinon profil. */
  navigateAfterAuth(returnUrl?: string | null): void {
    if (returnUrl && returnUrl !== '/') {
      this.router.navigateByUrl(returnUrl);
      return;
    }
    const user = this.getCurrentUser();
    const role = user?.active_role || this.getActiveRole();
    if (user?.can_access_platform === false) {
      this.router.navigate([`/${role}/profile`], {
        queryParams: this.getProfileQueryParams(user),
      });
    } else {
      this.router.navigate([`/${role}/dashboard`]);
    }
  }

  /** Après changement d'espace : dashboard si KYC approuvé, sinon profil. */
  navigateAfterRoleSwitch(user: User): void {
    const role = user.active_role || this.getActiveRole();
    if (user.can_access_platform === false) {
      this.router.navigate([`/${role}/profile`], {
        queryParams: this.getProfileQueryParams(user),
      });
    } else {
      this.router.navigate([`/${role}/dashboard`]);
    }
  }

  getProfileQueryParams(user: User | null): Record<string, string> {
    if (!user) return { complete: '1' };
    if (!user.profile_complete) return { complete: '1' };
    if (user.kyc_access_status === 'pending_review') return { kyc: 'pending' };
    if (user.kyc_access_status === 'rejected') return { kyc: 'rejected' };
    return { complete: '1' };
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
    return this.activeRoleSubject.value || this.currentUserSubject.value?.active_role || this.currentUserSubject.value?.user_type || 'client';
  }

  getAvailableRoles(): string[] {
    const user = this.currentUserSubject.value;
    if (!user) return [];
    const roles = [user.user_type];
    if (user.secondary_role && !roles.includes(user.secondary_role)) {
      roles.push(user.secondary_role);
    }
    return roles;
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

  switchRole(role: string): Observable<User> {
    return this.http.post<any>(`${this.apiUrl}/users/switch-role/`, { role }).pipe(
      switchMap((res) => {
        this.activeRoleSubject.next(res.active_role || role);
        return this.loadUserProfile();
      }),
      tap((user) => this.navigateAfterRoleSwitch(user)),
    );
  }
  
  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  /** Rafraîchit le JWT access (rotation du refresh côté backend). */
  async refreshAccessToken(): Promise<string | null> {
    const refresh = this.getRefreshToken();
    if (!refresh) return null;

    try {
      const res = await fetch(`${this.apiUrl}/auth/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      localStorage.setItem('access_token', data.access);
      if (data.refresh) {
        localStorage.setItem('refresh_token', data.refresh);
      }
      return data.access as string;
    } catch {
      return null;
    }
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

  requestPasswordReset(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/users/password/reset/`, { email });
  }

  validatePasswordResetToken(uid: string, token: string): Observable<{ valid: boolean; email?: string }> {
    return this.http.get<{ valid: boolean; email?: string }>(
      `${this.apiUrl}/users/password/reset/validate/`,
      { params: { uid, token } },
    );
  }

  confirmPasswordReset(data: {
    uid: string;
    token: string;
    new_password: string;
    new_password_confirm: string;
  }): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/users/password/reset/confirm/`, data);
  }
  
  hasRole(role: string): boolean {
    return this.getAvailableRoles().includes(role);
  }

  isClient(): boolean {
    return this.getActiveRole() === 'client';
  }

  isProvider(): boolean {
    return this.getActiveRole() === 'provider';
  }
  
  syncActiveRoleFromRoute(role: string): void {
    const user = this.currentUserSubject.value;
    if (!user || !role || !this.hasRole(role)) return;

    this.activeRoleSubject.next(role);

    if (user.active_role === role) {
      return;
    }

    this.http.post<any>(`${this.apiUrl}/users/switch-role/`, { role }).subscribe({
      next: () => {
        this.refreshUserProfile().subscribe();
      },
    });
  }

  getDashboardPath(): string {
    const role = this.getActiveRole();
    return `/${role}/dashboard`;
  }

  isEnterprise(): boolean {
    return this.getActiveRole() === 'enterprise';
  }
  
  isAdmin(): boolean {
    return this.hasRole('admin');
  }
}
