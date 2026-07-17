import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule, RouterModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatProgressSpinnerModule, MatSnackBarModule,
  ],
  template: `
    <div class="auth-page">
      <aside class="auth-brand">
        <button mat-button class="back-btn" routerLink="/login">
          <mat-icon>arrow_back</mat-icon> Connexion
        </button>
        <div class="brand-content">
          <div class="logo">
            <span class="logo-text">BlockTask</span>
          </div>
          <h1>Mot de passe oublié</h1>
          <p>Nous vous enverrons un lien sécurisé pour choisir un nouveau mot de passe.</p>
        </div>
      </aside>

      <main class="auth-panel">
        <div class="panel-inner">
          <div class="panel-header">
            <h2>Réinitialisation</h2>
            <p>Saisissez l'email associé à votre compte</p>
          </div>

          <div class="success-box" *ngIf="emailSent">
            <mat-icon>mark_email_read</mat-icon>
            <div>
              <strong>Email envoyé</strong>
              <p>
                Si un compte existe avec <strong>{{ form.value.email }}</strong>,
                vous recevrez un lien de réinitialisation sous peu.
              </p>
              <p class="hint">Vérifiez aussi vos spams. En développement, le lien apparaît dans la console du serveur Django.</p>
            </div>
          </div>

          <form *ngIf="!emailSent" [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Adresse email</mat-label>
              <mat-icon matPrefix>email</mat-icon>
              <input matInput formControlName="email" type="email" autocomplete="email">
              <mat-error *ngIf="form.get('email')?.hasError('required')">Email requis</mat-error>
              <mat-error *ngIf="form.get('email')?.hasError('email')">Format invalide</mat-error>
            </mat-form-field>

            <button mat-raised-button type="submit" class="submit-btn" [disabled]="form.invalid || isLoading">
              <mat-spinner diameter="20" *ngIf="isLoading"></mat-spinner>
              <span *ngIf="!isLoading">Envoyer le lien</span>
            </button>
          </form>

          <p class="switch-auth">
            <a routerLink="/login" class="text-link strong">Retour à la connexion</a>
          </p>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .auth-page { min-height: 100vh; display: grid; grid-template-columns: 1fr 1fr; }
    .auth-brand {
      background: linear-gradient(145deg, #059669 0%, #3CB371 45%, #047857 100%);
      color: white; padding: 32px 48px; display: flex; flex-direction: column;
    }
    .back-btn { align-self: flex-start; color: rgba(255,255,255,0.9) !important; }
    .brand-content { flex: 1; display: flex; flex-direction: column; justify-content: center; max-width: 420px; }
    .logo { display: flex; align-items: center; gap: 10px; margin-bottom: 32px; }
    .logo-icon { font-size: 32px; }
    .logo-text { font-size: 28px; font-weight: 800; }
    .brand-content h1 { font-size: 32px; margin: 0 0 16px; }
    .brand-content > p { margin: 0; line-height: 1.6; opacity: 0.92; }
    .auth-panel { display: flex; align-items: center; justify-content: center; padding: 40px 24px; background: #f8fafc; }
    .panel-inner {
      width: 100%; max-width: 420px; background: white; border-radius: 20px;
      padding: 40px 36px; box-shadow: 0 4px 24px rgba(15, 23, 42, 0.06); border: 1px solid #e2e8f0;
    }
    .panel-header h2 { margin: 0 0 6px; font-size: 26px; color: #0f172a; }
    .panel-header p { margin: 0 0 24px; color: #64748b; }
    .success-box {
      display: flex; gap: 14px; padding: 16px; border-radius: 12px;
      background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; margin-bottom: 20px;
    }
    .success-box mat-icon { flex-shrink: 0; color: #059669; }
    .success-box p { margin: 6px 0 0; font-size: 14px; line-height: 1.5; }
    .success-box .hint { font-size: 12px; color: #047857; margin-top: 10px; }
    .auth-form { display: flex; flex-direction: column; gap: 8px; }
    .full-width { width: 100%; }
    .submit-btn {
      width: 100%; height: 52px !important; font-size: 16px !important; font-weight: 600 !important;
      border-radius: 12px !important; background: #3CB371 !important; color: white !important; margin-top: 8px;
    }
    .switch-auth { text-align: center; margin-top: 24px; }
    .text-link { color: #3CB371; text-decoration: none; font-weight: 600; }
    .text-link:hover { text-decoration: underline; }
    @media (max-width: 900px) {
      .auth-page { grid-template-columns: 1fr; }
      .auth-brand { padding: 24px; }
      .panel-inner { padding: 32px 24px; box-shadow: none; border: none; background: transparent; }
      .auth-panel { background: white; }
    }
  `]
})
export class ForgotPasswordComponent {
  form: FormGroup;
  isLoading = false;
  emailSent = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private snackBar: MatSnackBar,
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  onSubmit(): void {
    if (this.form.invalid || this.isLoading) return;
    this.isLoading = true;
    this.authService.requestPasswordReset(this.form.value.email).subscribe({
      next: () => {
        this.isLoading = false;
        this.emailSent = true;
      },
      error: (err) => {
        this.isLoading = false;
        this.snackBar.open(err.error?.error || 'Erreur lors de l\'envoi', 'Fermer', { duration: 5000 });
      },
    });
  }
}
