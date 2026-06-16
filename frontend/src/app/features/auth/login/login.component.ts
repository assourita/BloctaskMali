import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDividerModule
  ],
  template: `
    <div class="login-container">
      <!-- Back Button -->
      <button mat-button class="back-btn" routerLink="/">
        <mat-icon>arrow_back</mat-icon>
        Retour à l'accueil
      </button>

      <mat-card class="login-card">
        <mat-card-header class="login-header">
          <div class="logo" routerLink="/" style="cursor: pointer;">
            <span class="logo-icon">⚡</span>
            <span class="logo-text">BlockTask</span>
          </div>
          <p class="subtitle">Connexion sécurisée</p>
        </mat-card-header>

        <!-- Session Expired Alert -->
        <div *ngIf="sessionExpired" class="session-alert">
          <mat-icon>access_time</mat-icon>
          <span>Votre session a expiré. Veuillez vous reconnecter pour continuer.</span>
        </div>

        <mat-card-content>
          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput formControlName="email" type="email" placeholder="votre@email.com">
              <mat-icon matPrefix class="field-icon">email</mat-icon>
              <mat-error *ngIf="loginForm.get('email')?.hasError('required')">
                L'email est requis
              </mat-error>
              <mat-error *ngIf="loginForm.get('email')?.hasError('email')">
                Format d'email invalide
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Mot de passe</mat-label>
              <input matInput formControlName="password" [type]="hidePassword ? 'password' : 'text'" placeholder="Votre mot de passe">
              <mat-icon matPrefix class="field-icon">lock</mat-icon>
              <button mat-icon-button matSuffix (click)="hidePassword = !hidePassword" type="button" class="visibility-btn">
                <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              <mat-error *ngIf="loginForm.get('password')?.hasError('required')">
                Le mot de passe est requis
              </mat-error>
            </mat-form-field>

            <div class="form-options">
              <a routerLink="/forgot-password" class="forgot-password">Mot de passe oublié ?</a>
            </div>

            <button 
              mat-raised-button 
              color="primary" 
              type="submit" 
              class="full-width login-btn"
              [disabled]="loginForm.invalid || isLoading"
            >
              <mat-spinner diameter="20" *ngIf="isLoading"></mat-spinner>
              <span *ngIf="!isLoading">Se connecter</span>
            </button>

            <div class="wallet-connect-section">
              <mat-divider></mat-divider>
              <span class="divider-text">ou</span>
              <button 
                mat-stroked-button 
                type="button" 
                class="wallet-btn"
                (click)="connectWallet()"
                [disabled]="isLoading"
              >
                <mat-icon>account_balance_wallet</mat-icon>
                Se connecter avec un Wallet
              </button>
            </div>
          </form>
        </mat-card-content>

        <mat-card-footer>
          <p class="register-link">
            Pas encore de compte ? 
            <a routerLink="/register" class="link">S'inscrire</a>
          </p>
        </mat-card-footer>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      padding: 20px;
      position: relative;
    }

    .back-btn {
      position: absolute;
      top: 24px;
      left: 24px;
      color: #6c757d;
      font-weight: 500;
    }

    .back-btn:hover {
      color: #3CB371;
    }

    .login-card {
      width: 100%;
      max-width: 440px;
      padding: 40px;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      border: none;
      background: white;
    }

    .login-header {
      text-align: center;
      margin-bottom: 32px;
    }

    .session-alert {
      display: flex;
      align-items: center;
      gap: 12px;
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 8px;
      padding: 16px;
      margin: 0 0 24px 0;
      color: #856404;
      font-size: 14px;
    }

    .session-alert mat-icon {
      color: #ffc107;
      flex-shrink: 0;
    }

    .logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      margin-bottom: 12px;
    }

    .logo-icon {
      font-size: 28px;
    }

    .logo-text {
      font-size: 26px;
      font-weight: 700;
      color: #3CB371;
    }

    .subtitle {
      color: #6c757d;
      font-size: 15px;
      font-weight: 500;
    }

    /* ===== CHAMPS DE SAISIE ===== */
    .full-width,
    mat-form-field {
      width: 100%;
      margin-bottom: 16px;
    }

    ::ng-deep .mat-mdc-form-field {
      width: 100%;
    }

    ::ng-deep .mat-mdc-text-field-wrapper {
      background: #f8fafc !important;
      border-radius: 16px !important;
    }

    ::ng-deep .mat-mdc-form-field-appearance-fill .mat-mdc-form-field-infix {
      padding-top: 20px !important;
      padding-bottom: 12px !important;
    }

    ::ng-deep .mat-mdc-form-field-appearance-fill .mat-mdc-floating-label {
      top: 28px !important;
    }

    ::ng-deep .mat-mdc-form-field-appearance-fill .mat-mdc-floating-label--float-above {
      top: 20px !important;
      transform: translateY(-50%) scale(0.85) !important;
      color: #3CB371 !important;
    }

    ::ng-deep .mat-mdc-form-field-appearance-fill .mat-mdc-form-field-subscript-wrapper {
      display: none;
    }

    ::ng-deep .mat-mdc-form-field-infix {
      min-height: 56px !important;
      padding-top: 16px !important;
      padding-bottom: 12px !important;
    }

    ::ng-deep .mdc-floating-label {
      font-size: 14px !important;
    }

    ::ng-deep .mat-mdc-form-field.mat-focused .mdc-floating-label {
      color: #3CB371 !important;
    }

    ::ng-deep .mat-mdc-form-field.mat-focused .mdc-notched-outline {
      border-color: #3CB371 !important;
    }

    ::ng-deep .mat-mdc-input-element {
      font-size: 15px !important;
    }

    ::ng-deep .mat-mdc-form-field-icon-prefix,
    ::ng-deep .mat-mdc-form-field-icon-suffix {
      color: #9ca3af;
    }

    ::ng-deep .mat-mdc-form-field-error {
      font-size: 12px;
    }

    ::ng-deep .mat-mdc-form-field-hint {
      font-size: 12px;
      color: #6c757d;
    }

    ::ng-deep .mat-mdc-form-field-subscript-wrapper {
      margin-top: 4px;
    }

    .field-icon {
      color: #adb5bd;
      margin-right: 8px;
    }

    .visibility-btn {
      color: #adb5bd;
    }

    .form-options {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 24px;
    }

    .forgot-password {
      color: #3CB371;
      font-size: 14px;
      text-decoration: none;
      font-weight: 500;
      transition: opacity 0.2s;
    }

    .forgot-password:hover {
      opacity: 0.8;
    }

    .login-btn {
      height: 52px;
      font-size: 16px;
      font-weight: 600;
      background: #3CB371 !important;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(60, 179, 113, 0.3);
      transition: all 0.2s ease;
    }

    .login-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(60, 179, 113, 0.4);
    }

    .login-btn:disabled {
      background: #adb5bd !important;
      transform: none;
      box-shadow: none;
    }

    .wallet-connect-section {
      margin-top: 28px;
      text-align: center;
      position: relative;
    }

    .divider-text {
      background: white;
      padding: 0 16px;
      color: #adb5bd;
      font-size: 14px;
      position: relative;
      top: -12px;
    }

    .wallet-btn {
      width: 100%;
      height: 48px;
      border-color: #3CB371;
      color: #3CB371;
      border-radius: 8px;
      font-weight: 500;
      transition: all 0.2s ease;
    }

    .wallet-btn:hover {
      background: rgba(60, 179, 113, 0.05);
    }

    .wallet-btn mat-icon {
      margin-right: 8px;
    }

    mat-card-footer {
      padding: 24px 0 0 0;
      text-align: center;
      margin: 0;
    }

    .register-link {
      color: #6c757d;
      font-size: 15px;
    }

    .link {
      color: #3CB371;
      font-weight: 600;
      text-decoration: none;
      transition: opacity 0.2s;
    }

    .link:hover {
      opacity: 0.8;
    }

    mat-spinner {
      display: inline-block;
      margin-right: 8px;
    }
  `]
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  hidePassword = true;
  isLoading = false;
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
      password: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    // Check for session expired message
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
    const { email, password } = this.loginForm.value;

    this.authService.login({ email, password }).subscribe({
      next: (user: any) => {
        this.isLoading = false;
        this.snackBar.open('Connexion réussie !', 'Fermer', { duration: 3000 });
        
        // Redirect to returnUrl if exists, otherwise to dashboard
        if (this.returnUrl && this.returnUrl !== '/') {
          console.log('Redirection vers:', this.returnUrl);
          this.router.navigate([this.returnUrl]);
        } else {
          // Rediriger vers le dashboard approprié
          const userType = user?.user_type || 'client';
          console.log('Navigation vers:', `/${userType}/dashboard`);
          this.router.navigate([`/${userType}/dashboard`]);
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.snackBar.open(
          error.error?.message || 'Erreur de connexion', 
          'Fermer', 
          { duration: 5000 }
        );
      }
    });
  }

  connectWallet(): void {
    this.router.navigate(['/wallet-connect']);
  }
}
