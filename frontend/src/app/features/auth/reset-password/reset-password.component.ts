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

@Component({
  selector: 'app-reset-password',
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
            <span class="logo-icon">⚡</span>
            <span class="logo-text">BlockTask</span>
          </div>
          <h1>Nouveau mot de passe</h1>
          <p>Choisissez un mot de passe sécurisé pour votre compte BlockTask.</p>
        </div>
      </aside>

      <main class="auth-panel">
        <div class="panel-inner">
          <div class="loading-box" *ngIf="validating">
            <mat-spinner diameter="36"></mat-spinner>
            <p>Vérification du lien…</p>
          </div>

          <div class="error-box" *ngIf="!validating && !linkValid">
            <mat-icon>error_outline</mat-icon>
            <div>
              <strong>Lien invalide ou expiré</strong>
              <p>Demandez un nouveau lien de réinitialisation.</p>
              <a mat-stroked-button routerLink="/forgot-password">Nouvelle demande</a>
            </div>
          </div>

          <ng-container *ngIf="!validating && linkValid && !resetDone">
            <div class="panel-header">
              <h2>Réinitialiser</h2>
              <p>Compte : {{ accountEmail }}</p>
            </div>

            <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Nouveau mot de passe</mat-label>
                <mat-icon matPrefix>lock</mat-icon>
                <input matInput formControlName="new_password" [type]="hidePassword ? 'password' : 'text'">
                <button mat-icon-button matSuffix type="button" (click)="hidePassword = !hidePassword" tabindex="-1">
                  <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
                <mat-hint>8 caractères minimum</mat-hint>
                <mat-error *ngIf="form.get('new_password')?.hasError('minlength')">8 caractères minimum</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Confirmer le mot de passe</mat-label>
                <mat-icon matPrefix>lock_reset</mat-icon>
                <input matInput formControlName="new_password_confirm" [type]="hidePassword ? 'password' : 'text'">
                <mat-error *ngIf="form.hasError('mismatch')">Les mots de passe ne correspondent pas</mat-error>
              </mat-form-field>

              <button mat-raised-button type="submit" class="submit-btn" [disabled]="form.invalid || isLoading">
                <mat-spinner diameter="20" *ngIf="isLoading"></mat-spinner>
                <span *ngIf="!isLoading">Enregistrer</span>
              </button>
            </form>
          </ng-container>

          <div class="success-box" *ngIf="resetDone">
            <mat-icon>check_circle</mat-icon>
            <div>
              <strong>Mot de passe mis à jour</strong>
              <p>Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
              <button mat-raised-button class="submit-btn" routerLink="/login">Se connecter</button>
            </div>
          </div>
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
    .panel-header p { margin: 0 0 24px; color: #64748b; font-size: 14px; }
    .loading-box, .error-box, .success-box {
      display: flex; flex-direction: column; align-items: center; text-align: center; gap: 12px; padding: 16px 0;
    }
    .error-box mat-icon { font-size: 48px; width: 48px; height: 48px; color: #ef4444; }
    .success-box mat-icon { font-size: 48px; width: 48px; height: 48px; color: #059669; }
    .error-box p, .success-box p { margin: 0; color: #64748b; font-size: 14px; }
    .auth-form { display: flex; flex-direction: column; gap: 4px; }
    .full-width { width: 100%; }
    .submit-btn {
      width: 100%; height: 52px !important; font-size: 16px !important; font-weight: 600 !important;
      border-radius: 12px !important; background: #3CB371 !important; color: white !important; margin-top: 12px;
    }
    @media (max-width: 900px) {
      .auth-page { grid-template-columns: 1fr; }
      .auth-brand { padding: 24px; }
      .panel-inner { padding: 32px 24px; box-shadow: none; border: none; background: transparent; }
      .auth-panel { background: white; }
    }
  `]
})
export class ResetPasswordComponent implements OnInit {
  form: FormGroup;
  uid = '';
  token = '';
  accountEmail = '';
  validating = true;
  linkValid = false;
  resetDone = false;
  hidePassword = true;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {
    this.form = this.fb.group({
      new_password: ['', [Validators.required, Validators.minLength(8)]],
      new_password_confirm: ['', Validators.required],
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.uid = params['uid'] || '';
      this.token = params['token'] || '';
      if (!this.uid || !this.token) {
        this.validating = false;
        this.linkValid = false;
        return;
      }
      this.authService.validatePasswordResetToken(this.uid, this.token).subscribe({
        next: (res) => {
          this.validating = false;
          this.linkValid = res.valid;
          this.accountEmail = res.email || '';
        },
        error: () => {
          this.validating = false;
          this.linkValid = false;
        },
      });
    });
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('new_password')?.value === g.get('new_password_confirm')?.value
      ? null : { mismatch: true };
  }

  onSubmit(): void {
    if (this.form.invalid || this.isLoading) return;
    this.isLoading = true;
    this.authService.confirmPasswordReset({
      uid: this.uid,
      token: this.token,
      new_password: this.form.value.new_password,
      new_password_confirm: this.form.value.new_password_confirm,
    }).subscribe({
      next: () => {
        this.isLoading = false;
        this.resetDone = true;
      },
      error: (err) => {
        this.isLoading = false;
        this.snackBar.open(err.error?.error || 'Erreur', 'Fermer', { duration: 5000 });
      },
    });
  }
}
