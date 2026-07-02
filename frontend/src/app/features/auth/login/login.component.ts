import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AuthService } from '../../../core/services/auth.service';
import { GoogleSignInButtonComponent } from '../../../shared/components/google-sign-in/google-sign-in.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    GoogleSignInButtonComponent,
  ],
  template: `
    <div class="auth-page">
      <aside class="auth-brand">
        <button mat-button class="back-btn" routerLink="/">
          <mat-icon>arrow_back</mat-icon> Accueil
        </button>
        <div class="brand-content">
          <div class="logo">
            <span class="logo-icon">⚡</span>
            <span class="logo-text">BlockTask</span>
          </div>
          <h1>Bienvenue</h1>
          <p>Connectez-vous pour gérer vos missions, suivre vos prestataires et sécuriser vos paiements en FCFA.</p>
          <ul class="brand-features">
            <li><mat-icon>shield</mat-icon> Escrow sécurisé</li>
            <li><mat-icon>my_location</mat-icon> Suivi GPS en temps réel</li>
            <li><mat-icon>verified</mat-icon> Prestataires vérifiés KYC</li>
          </ul>
        </div>
      </aside>

      <main class="auth-panel">
        <div class="panel-inner">
          <div class="panel-header">
            <h2>Connexion</h2>
            <p>Accédez à votre espace BlockTask</p>
          </div>

          <div *ngIf="sessionExpired" class="alert alert-warn">
            <mat-icon>access_time</mat-icon>
            <span>Votre session a expiré. Reconnectez-vous pour continuer.</span>
          </div>

          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="auth-form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Adresse email</mat-label>
              <mat-icon matPrefix>email</mat-icon>
              <input matInput formControlName="email" type="email" placeholder="vous@exemple.com" autocomplete="email">
              <mat-error *ngIf="loginForm.get('email')?.hasError('required')">Email requis</mat-error>
              <mat-error *ngIf="loginForm.get('email')?.hasError('email')">Format invalide</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Mot de passe</mat-label>
              <mat-icon matPrefix>lock</mat-icon>
              <input matInput formControlName="password" [type]="hidePassword ? 'password' : 'text'" autocomplete="current-password">
              <button mat-icon-button matSuffix type="button" (click)="hidePassword = !hidePassword" tabindex="-1">
                <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              <mat-error *ngIf="loginForm.get('password')?.hasError('required')">Mot de passe requis</mat-error>
            </mat-form-field>

            <div class="form-row-end">
              <a routerLink="/forgot-password" class="text-link">Mot de passe oublié ?</a>
            </div>

            <mat-form-field appearance="outline" class="full-width" *ngIf="needs2fa">
              <mat-label>Code 2FA (6 chiffres)</mat-label>
              <mat-icon matPrefix>pin</mat-icon>
              <input matInput formControlName="otp" inputmode="numeric" maxlength="6" placeholder="123456">
            </mat-form-field>

            <button mat-raised-button type="submit" class="submit-btn" [disabled]="loginForm.invalid || isLoading">
              <mat-spinner diameter="20" *ngIf="isLoading"></mat-spinner>
              <span *ngIf="!isLoading">Se connecter</span>
            </button>
          </form>

          <div class="auth-divider"><span>ou</span></div>
          <app-google-sign-in text="signin_with" (credential)="onGoogleCredential($event)"></app-google-sign-in>

          <p class="switch-auth">
            Pas encore de compte ?
            <a routerLink="/register" class="text-link strong">Créer un compte</a>
          </p>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: 100vh;
      display: grid;
      grid-template-columns: 1fr 1fr;
    }

    .auth-brand {
      background: linear-gradient(145deg, #059669 0%, #3CB371 45%, #047857 100%);
      color: white;
      padding: 32px 48px;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
    }

    .auth-brand::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 20% 80%, rgba(255,255,255,0.12) 0%, transparent 50%),
                  radial-gradient(circle at 80% 20%, rgba(255,255,255,0.08) 0%, transparent 40%);
      pointer-events: none;
    }

    .back-btn {
      align-self: flex-start;
      color: rgba(255,255,255,0.9) !important;
      z-index: 1;
    }

    .brand-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      max-width: 420px;
      z-index: 1;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 32px;
    }

    .logo-icon { font-size: 32px; }

    .logo-text {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }

    .brand-content h1 {
      font-size: 36px;
      font-weight: 700;
      margin: 0 0 16px;
      line-height: 1.15;
    }

    .brand-content > p {
      font-size: 16px;
      line-height: 1.6;
      opacity: 0.92;
      margin: 0 0 32px;
    }

    .brand-features {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .brand-features li {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 15px;
      font-weight: 500;
    }

    .brand-features mat-icon {
      font-size: 22px;
      width: 22px;
      height: 22px;
      opacity: 0.95;
    }

    .auth-panel {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px 24px;
      background: #f8fafc;
    }

    .panel-inner {
      width: 100%;
      max-width: 420px;
      background: white;
      border-radius: 20px;
      padding: 40px 36px;
      box-shadow: 0 4px 24px rgba(15, 23, 42, 0.06);
      border: 1px solid #e2e8f0;
    }

    .panel-header {
      margin-bottom: 28px;
    }

    .panel-header h2 {
      margin: 0 0 6px;
      font-size: 26px;
      font-weight: 700;
      color: #0f172a;
    }

    .panel-header p {
      margin: 0;
      color: #64748b;
      font-size: 15px;
    }

    .alert {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 14px 16px;
      border-radius: 12px;
      font-size: 14px;
      margin-bottom: 20px;
    }

    .alert-warn {
      background: #fffbeb;
      border: 1px solid #fde68a;
      color: #92400e;
    }

    .alert-warn mat-icon {
      color: #f59e0b;
      flex-shrink: 0;
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .full-width { width: 100%; }

    .form-row-end {
      display: flex;
      justify-content: flex-end;
      margin: -4px 0 12px;
    }

    .text-link {
      color: #3CB371;
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
    }

    .text-link:hover { text-decoration: underline; }
    .text-link.strong { font-weight: 600; }

    .submit-btn {
      width: 100%;
      height: 52px !important;
      font-size: 16px !important;
      font-weight: 600 !important;
      border-radius: 12px !important;
      background: #3CB371 !important;
      color: white !important;
      margin-top: 8px;
      box-shadow: 0 4px 14px rgba(60, 179, 113, 0.35);
    }

    .submit-btn:disabled {
      background: #cbd5e1 !important;
      box-shadow: none;
    }

    .auth-divider {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 20px 0 16px;
      color: #94a3b8;
      font-size: 13px;
    }

    .auth-divider::before,
    .auth-divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: #e2e8f0;
    }

    .switch-auth {
      text-align: center;
      margin: 28px 0 0;
      color: #64748b;
      font-size: 15px;
    }

    ::ng-deep .auth-form .mat-mdc-form-field-icon-prefix {
      padding-right: 8px;
      color: #94a3b8;
    }

    ::ng-deep .auth-form .mat-mdc-form-field.mat-focused .mat-mdc-form-field-icon-prefix {
      color: #3CB371;
    }

    ::ng-deep .auth-form .mdc-notched-outline__leading,
    ::ng-deep .auth-form .mdc-notched-outline__notch,
    ::ng-deep .auth-form .mdc-notched-outline__trailing {
      border-color: #e2e8f0 !important;
    }

    ::ng-deep .auth-form .mat-mdc-form-field.mat-focused .mdc-notched-outline__leading,
    ::ng-deep .auth-form .mat-mdc-form-field.mat-focused .mdc-notched-outline__notch,
    ::ng-deep .auth-form .mat-mdc-form-field.mat-focused .mdc-notched-outline__trailing {
      border-color: #3CB371 !important;
      border-width: 2px !important;
    }

    @media (max-width: 900px) {
      .auth-page {
        grid-template-columns: 1fr;
      }

      .auth-brand {
        padding: 24px;
        min-height: auto;
      }

      .brand-content {
        padding: 16px 0 24px;
      }

      .brand-content h1 { font-size: 28px; }
      .brand-features { display: none; }

      .panel-inner {
        padding: 32px 24px;
        box-shadow: none;
        border: none;
        background: transparent;
      }

      .auth-panel { padding: 0 16px 32px; background: white; }
    }
  `]
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  hidePassword = true;
  isLoading = false;
  needs2fa = false;
  sessionExpired = false;
  returnUrl: string = '/client/dashboard';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      otp: [''],
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.sessionExpired = params['message'] === 'session_expired';
      if (params['returnUrl']) {
        this.returnUrl = params['returnUrl'];
      }
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.isLoading = true;
    const { email, password, otp } = this.loginForm.value;

    this.authService.login({ email, password, otp: otp || undefined }).subscribe({
      next: () => {
        this.isLoading = false;
        this.snackBar.open('Connexion réussie !', 'Fermer', { duration: 3000 });
        if (this.returnUrl && this.returnUrl !== '/') {
          this.router.navigate([this.returnUrl]);
        } else {
          this.authService.navigateAfterAuth();
        }
      },
      error: (error) => {
        this.isLoading = false;
        if (error.status === 401 && error.error?.code === '2fa_required') {
          this.needs2fa = true;
          this.loginForm.get('otp')?.setValidators([Validators.required, Validators.minLength(6)]);
          this.loginForm.get('otp')?.updateValueAndValidity();
          this.snackBar.open('Saisissez le code de votre application d\'authentification.', 'Fermer', { duration: 5000 });
          return;
        }
        if (error.status === 403 && error.error?.code === 'email_not_verified') {
          this.snackBar.open('Vérifiez votre email avant de vous connecter.', 'Fermer', { duration: 6000 });
          this.router.navigate(['/verify-email'], {
            queryParams: { email: error.error?.email || this.loginForm.value.email },
          });
          return;
        }
        this.snackBar.open(
          error.error?.detail || error.error?.message || 'Erreur de connexion',
          'Fermer',
          { duration: 5000 }
        );
      }
    });
  }

  onGoogleCredential(idToken: string): void {
    this.isLoading = true;
    this.authService.loginWithGoogle(idToken).subscribe({
      next: () => {
        this.isLoading = false;
        this.snackBar.open('Connexion Google réussie', 'Fermer', { duration: 3000 });
        if (this.returnUrl && this.returnUrl !== '/') {
          this.router.navigate([this.returnUrl]);
        } else {
          this.authService.navigateAfterAuth();
        }
      },
      error: (error) => {
        this.isLoading = false;
        const msg =
          error.error?.error ||
          error.error?.detail ||
          error.message ||
          'Connexion Google impossible';
        this.snackBar.open(msg, 'Fermer', { duration: 7000 });
      },
    });
  }
}
