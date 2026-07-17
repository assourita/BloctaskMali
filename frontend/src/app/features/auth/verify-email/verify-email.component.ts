import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-verify-email',
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
          <h1>Vérifiez votre email</h1>
          <p>Un lien de confirmation a été envoyé à votre adresse. Cliquez dessus pour activer votre compte.</p>
        </div>
      </aside>

      <main class="auth-panel">
        <div class="panel-inner">
          <div class="loading-box" *ngIf="verifying">
            <mat-spinner diameter="36"></mat-spinner>
            <p>Vérification en cours…</p>
          </div>

          <div class="success-box" *ngIf="verified">
            <mat-icon>mark_email_read</mat-icon>
            <div>
              <strong>Email confirmé !</strong>
              <p>Votre compte est activé. Vous pouvez vous connecter.</p>
              <button mat-raised-button class="submit-btn" routerLink="/login">Se connecter</button>
            </div>
          </div>

          <ng-container *ngIf="!verifying && !verified && !verifyFailed">
            <div class="panel-header">
              <h2>Confirmez votre adresse</h2>
              <p *ngIf="email">Email : <strong>{{ email }}</strong></p>
            </div>

            <div class="info-box">
              <mat-icon>mail_outline</mat-icon>
              <p>Ouvrez l'email BlockTask et cliquez sur le lien de confirmation. Vérifiez aussi vos spams.</p>
            </div>

            <form [formGroup]="form" (ngSubmit)="resend()" class="auth-form">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Renvoyer à</mat-label>
                <mat-icon matPrefix>email</mat-icon>
                <input matInput formControlName="email" type="email">
              </mat-form-field>
              <button mat-stroked-button type="submit" [disabled]="form.invalid || resending">
                <mat-spinner diameter="18" *ngIf="resending"></mat-spinner>
                <span *ngIf="!resending">Renvoyer l'email</span>
              </button>
            </form>
          </ng-container>

          <div class="error-box" *ngIf="verifyFailed">
            <mat-icon>error_outline</mat-icon>
            <div>
              <strong>{{ verifyError }}</strong>
              <p>Demandez un nouvel email de vérification.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .auth-page { min-height: 100vh; display: grid; grid-template-columns: 1fr 1fr; }
    .auth-brand {
      background: linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      color: #fff; padding: 2rem; display: flex; flex-direction: column;
    }
    .back-btn { color: rgba(255,255,255,0.85); align-self: flex-start; margin-bottom: 2rem; }
    .logo { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.5rem; }
    .logo-icon { font-size: 1.5rem; }
    .logo-text { font-size: 1.4rem; font-weight: 800; color: #3CB371; }
    .auth-brand h1 { font-size: 1.75rem; margin-bottom: 0.75rem; }
    .auth-brand p { opacity: 0.85; line-height: 1.6; max-width: 360px; }
    .auth-panel { display: flex; align-items: center; justify-content: center; padding: 2rem; background: #f4f6f9; }
    .panel-inner { width: 100%; max-width: 420px; }
    .panel-header h2 { font-size: 1.5rem; font-weight: 800; color: #1a1a2e; margin-bottom: 0.25rem; }
    .panel-header p { color: #6b7280; margin-bottom: 1.5rem; }
    .info-box, .success-box, .error-box, .loading-box {
      display: flex; gap: 1rem; align-items: flex-start; padding: 1rem; border-radius: 12px; margin-bottom: 1rem;
    }
    .info-box { background: #ecfdf3; color: #065f46; }
    .success-box { background: #ecfdf3; color: #065f46; }
    .error-box { background: #fee2e2; color: #991b1b; }
    .loading-box { flex-direction: column; align-items: center; color: #6b7280; }
    .auth-form { display: flex; flex-direction: column; gap: 1rem; }
    .full-width { width: 100%; }
    .submit-btn { background: #3CB371 !important; color: #fff !important; }
    @media (max-width: 768px) { .auth-page { grid-template-columns: 1fr; } .auth-brand { min-height: 200px; } }
  `],
})
export class VerifyEmailComponent implements OnInit {
  email = '';
  verifying = false;
  verified = false;
  verifyFailed = false;
  verifyError = '';
  resending = false;
  form: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private auth: AuthService,
    private snackBar: MatSnackBar,
  ) {
    this.form = this.fb.group({ email: ['', [Validators.required, Validators.email]] });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.email = params['email'] || '';
      if (this.email) this.form.patchValue({ email: this.email });
      const uid = params['uid'];
      const token = params['token'];
      if (uid && token) this.confirm(uid, token);
    });
  }

  confirm(uid: string, token: string): void {
    this.verifying = true;
    this.auth.verifyEmail(uid, token).subscribe({
      next: () => {
        this.verifying = false;
        this.verified = true;
      },
      error: (err) => {
        this.verifying = false;
        this.verifyFailed = true;
        this.verifyError = err.error?.error || err.error?.detail || 'Lien invalide ou expiré';
      },
    });
  }

  resend(): void {
    if (this.form.invalid) return;
    this.resending = true;
    this.auth.resendVerificationEmail(this.form.value.email).subscribe({
      next: () => {
        this.resending = false;
        this.snackBar.open('Email de vérification renvoyé.', 'Fermer', { duration: 5000 });
      },
      error: () => {
        this.resending = false;
        this.snackBar.open('Impossible d\'envoyer l\'email.', 'Fermer', { duration: 5000 });
      },
    });
  }
}
