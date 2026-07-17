import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatStepperModule } from '@angular/material/stepper';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AuthService } from '../../../core/services/auth.service';
import { GoogleSignInButtonComponent } from '../../../shared/components/google-sign-in/google-sign-in.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatStepperModule,
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
            <span class="logo-text">BlockTask</span>
          </div>
          <h1>Rejoignez BlockTask</h1>
          <p>Client, prestataire ou entreprise — créez votre compte en 3 étapes simples.</p>
          <div class="steps-preview">
            <div class="step-item"><span>1</span> Type de compte</div>
            <div class="step-item"><span>2</span> Vos informations</div>
            <div class="step-item"><span>3</span> Sécurité</div>
          </div>
        </div>
      </aside>

      <main class="auth-panel">
        <div class="panel-inner">
          <div class="panel-header">
            <h2>Inscription</h2>
            <p>Créez votre compte gratuitement</p>
          </div>

          <mat-stepper linear #stepper class="auth-stepper" labelPosition="bottom">
            <!-- Étape 1 -->
            <mat-step [stepControl]="accountTypeForm">
              <ng-template matStepLabel>Profil</ng-template>
              <form [formGroup]="accountTypeForm" class="auth-form">
                <p class="step-intro">Choisissez le profil qui vous correspond :</p>
                <div class="account-types">
                  <button
                    type="button"
                    class="account-type-card"
                    [class.selected]="accountTypeForm.get('user_type')?.value === 'client'"
                    (click)="selectAccountType('client')">
                    <div class="card-icon client"><mat-icon>person</mat-icon></div>
                    <h4>Client</h4>
                    <p>Je délègue des missions</p>
                    <mat-icon class="check" *ngIf="accountTypeForm.get('user_type')?.value === 'client'">check_circle</mat-icon>
                  </button>
                  <button
                    type="button"
                    class="account-type-card"
                    [class.selected]="accountTypeForm.get('user_type')?.value === 'provider'"
                    (click)="selectAccountType('provider')">
                    <div class="card-icon provider"><mat-icon>work</mat-icon></div>
                    <h4>Prestataire</h4>
                    <p>Je réalise des missions</p>
                    <mat-icon class="check" *ngIf="accountTypeForm.get('user_type')?.value === 'provider'">check_circle</mat-icon>
                  </button>
                  <button
                    type="button"
                    class="account-type-card"
                    [class.selected]="accountTypeForm.get('user_type')?.value === 'enterprise'"
                    (click)="selectAccountType('enterprise')">
                    <div class="card-icon enterprise"><mat-icon>business</mat-icon></div>
                    <h4>Entreprise</h4>
                    <p>Je gère une équipe</p>
                    <mat-icon class="check" *ngIf="accountTypeForm.get('user_type')?.value === 'enterprise'">check_circle</mat-icon>
                  </button>
                </div>
                <input type="hidden" formControlName="user_type">
              </form>
              <div class="step-actions">
                <button mat-raised-button class="submit-btn" matStepperNext [disabled]="accountTypeForm.invalid">
                  Continuer <mat-icon>arrow_forward</mat-icon>
                </button>
              </div>
            </mat-step>

            <!-- Étape 2 -->
            <mat-step [stepControl]="personalInfoForm">
              <ng-template matStepLabel>Informations</ng-template>
              <form [formGroup]="personalInfoForm" class="auth-form">
                <div class="form-row">
                  <mat-form-field appearance="outline">
                    <mat-label>Prénom</mat-label>
                    <mat-icon matPrefix>badge</mat-icon>
                    <input matInput formControlName="first_name" placeholder="Amadou">
                    <mat-error>Prénom requis</mat-error>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Nom</mat-label>
                    <mat-icon matPrefix>badge</mat-icon>
                    <input matInput formControlName="last_name" placeholder="Diallo">
                    <mat-error>Nom requis</mat-error>
                  </mat-form-field>
                </div>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Nom d'utilisateur</mat-label>
                  <mat-icon matPrefix>alternate_email</mat-icon>
                  <input matInput formControlName="username" placeholder="amadou.diallo">
                  <mat-error>Nom d'utilisateur requis</mat-error>
                </mat-form-field>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Email</mat-label>
                  <mat-icon matPrefix>email</mat-icon>
                  <input matInput formControlName="email" type="email" placeholder="vous@exemple.com">
                  <mat-error>Email invalide</mat-error>
                </mat-form-field>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Téléphone</mat-label>
                  <mat-icon matPrefix>phone</mat-icon>
                  <input matInput formControlName="phone_number" placeholder="+223 70 00 00 00">
                  <mat-hint>Format Mali : +223 XX XX XX XX</mat-hint>
                </mat-form-field>
              </form>
              <div class="step-actions split">
                <button mat-button matStepperPrevious><mat-icon>arrow_back</mat-icon> Retour</button>
                <button mat-raised-button class="submit-btn" matStepperNext [disabled]="personalInfoForm.invalid">
                  Continuer <mat-icon>arrow_forward</mat-icon>
                </button>
              </div>
            </mat-step>

            <!-- Étape 3 -->
            <mat-step [stepControl]="securityForm">
              <ng-template matStepLabel>Sécurité</ng-template>
              <form [formGroup]="securityForm" class="auth-form">
                <p class="step-intro">Choisissez un mot de passe fort pour protéger votre compte.</p>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Mot de passe</mat-label>
                  <mat-icon matPrefix>lock</mat-icon>
                  <input matInput formControlName="password" [type]="hidePassword ? 'password' : 'text'">
                  <button mat-icon-button matSuffix type="button" (click)="hidePassword = !hidePassword" tabindex="-1">
                    <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
                  </button>
                  <mat-hint>8 caractères minimum</mat-hint>
                  <mat-error *ngIf="securityForm.get('password')?.hasError('required')">Mot de passe requis</mat-error>
                  <mat-error *ngIf="securityForm.get('password')?.hasError('minlength')">8 caractères minimum</mat-error>
                </mat-form-field>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Confirmer le mot de passe</mat-label>
                  <mat-icon matPrefix>lock_reset</mat-icon>
                  <input matInput formControlName="password_confirm" [type]="hidePassword ? 'password' : 'text'">
                  <mat-error *ngIf="securityForm.hasError('mismatch')">Les mots de passe ne correspondent pas</mat-error>
                </mat-form-field>
              </form>
              <div class="step-actions split">
                <button mat-button matStepperPrevious><mat-icon>arrow_back</mat-icon> Retour</button>
                <button mat-raised-button class="submit-btn" (click)="onSubmit()" [disabled]="securityForm.invalid || isLoading">
                  <mat-spinner diameter="20" *ngIf="isLoading"></mat-spinner>
                  <span *ngIf="!isLoading">Créer mon compte</span>
                </button>
              </div>
            </mat-step>
          </mat-stepper>

          <div class="auth-divider"><span>ou</span></div>
          <app-google-sign-in
            text="signup_with"
            (credential)="onGoogleCredential($event)">
          </app-google-sign-in>

          <p class="switch-auth">
            Déjà inscrit ?
            <a routerLink="/login" class="text-link strong">Se connecter</a>
          </p>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: 100vh;
      display: grid;
      grid-template-columns: 1fr 1.1fr;
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
      background: radial-gradient(circle at 20% 80%, rgba(255,255,255,0.12) 0%, transparent 50%);
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
      max-width: 400px;
      z-index: 1;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 28px;
    }

    .logo-icon { font-size: 32px; }
    .logo-text { font-size: 28px; font-weight: 800; }

    .brand-content h1 {
      font-size: 34px;
      font-weight: 700;
      margin: 0 0 14px;
      line-height: 1.15;
    }

    .brand-content > p {
      font-size: 16px;
      line-height: 1.6;
      opacity: 0.92;
      margin: 0 0 28px;
    }

    .steps-preview {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .step-item {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 14px;
      font-weight: 500;
    }

    .step-item span {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: rgba(255,255,255,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 13px;
    }

    .auth-panel {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 40px 24px;
      background: #f8fafc;
      overflow-y: auto;
    }

    .panel-inner {
      width: 100%;
      max-width: 520px;
      background: white;
      border-radius: 20px;
      padding: 36px 32px;
      box-shadow: 0 4px 24px rgba(15, 23, 42, 0.06);
      border: 1px solid #e2e8f0;
      margin: auto 0;
    }

    .panel-header {
      margin-bottom: 24px;
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

    .step-intro {
      color: #64748b;
      font-size: 14px;
      margin: 0 0 16px;
    }

    .account-types {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 8px;
    }

    .account-type-card {
      position: relative;
      padding: 20px 12px;
      border: 2px solid #e2e8f0;
      border-radius: 14px;
      text-align: center;
      cursor: pointer;
      background: #fafafa;
      transition: all 0.2s ease;
      font: inherit;
      color: inherit;
    }

    .account-type-card:hover {
      border-color: #3CB371;
      background: #f0fdf4;
    }

    .account-type-card.selected {
      border-color: #3CB371;
      background: #ecfdf5;
      box-shadow: 0 0 0 3px rgba(60, 179, 113, 0.15);
    }

    .card-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 12px;
    }

    .card-icon mat-icon { font-size: 26px; width: 26px; height: 26px; }
    .card-icon.client { background: #dbeafe; color: #2563eb; }
    .card-icon.provider { background: #d1fae5; color: #059669; }
    .card-icon.enterprise { background: #ede9fe; color: #7c3aed; }

    .account-type-card h4 {
      font-size: 15px;
      font-weight: 600;
      margin: 0 0 4px;
      color: #0f172a;
    }

    .account-type-card p {
      font-size: 11px;
      color: #64748b;
      margin: 0;
      line-height: 1.3;
    }

    .account-type-card .check {
      position: absolute;
      top: 8px;
      right: 8px;
      color: #3CB371;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding-top: 8px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .full-width { width: 100%; }

    .step-actions {
      margin-top: 24px;
      display: flex;
      justify-content: flex-end;
    }

    .step-actions.split {
      justify-content: space-between;
      align-items: center;
    }

    .submit-btn {
      height: 48px !important;
      font-weight: 600 !important;
      border-radius: 12px !important;
      background: #3CB371 !important;
      color: white !important;
      padding: 0 24px !important;
    }

    .submit-btn mat-icon {
      margin-left: 4px;
      font-size: 20px;
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

    .text-link {
      color: #3CB371;
      text-decoration: none;
      font-weight: 600;
    }

    .text-link:hover { text-decoration: underline; }

    ::ng-deep .auth-stepper .mat-step-header .mat-step-icon-selected,
    ::ng-deep .auth-stepper .mat-step-header .mat-step-icon-state-done,
    ::ng-deep .auth-stepper .mat-step-header .mat-step-icon-state-edit {
      background-color: #3CB371 !important;
    }

    ::ng-deep .auth-stepper .mat-step-label-selected {
      color: #3CB371 !important;
      font-weight: 600;
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
      .auth-page { grid-template-columns: 1fr; }
      .auth-brand { padding: 24px; }
      .brand-content { padding: 8px 0 16px; }
      .brand-content h1 { font-size: 26px; }
      .steps-preview { display: none; }
      .panel-inner {
        padding: 28px 20px;
        box-shadow: none;
        border: none;
        background: transparent;
      }
      .auth-panel { background: white; padding: 0 16px 32px; }
      .account-types { grid-template-columns: 1fr; }
      .form-row { grid-template-columns: 1fr; }
    }
  `]
})
export class RegisterComponent implements OnInit {
  accountTypeForm: FormGroup;
  personalInfoForm: FormGroup;
  securityForm: FormGroup;
  hidePassword = true;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {
    this.accountTypeForm = this.fb.group({
      user_type: ['', Validators.required]
    });

    this.personalInfoForm = this.fb.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone_number: ['']
    });

    this.securityForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8)]],
      password_confirm: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const type = params['type'];
      if (type === 'client' || type === 'provider' || type === 'enterprise') {
        this.selectAccountType(type);
      }
    });
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('password_confirm')?.value
      ? null : { mismatch: true };
  }

  selectAccountType(type: string): void {
    this.accountTypeForm.patchValue({ user_type: type });
  }

  onSubmit(): void {
    if (this.securityForm.invalid) return;

    this.isLoading = true;
    const formData = {
      ...this.accountTypeForm.value,
      ...this.personalInfoForm.value,
      ...this.securityForm.value
    };

    this.authService.register(formData).subscribe({
      next: (res) => {
        this.isLoading = false;
        const email = res?.email || formData.email;
        this.snackBar.open(
          res?.message || 'Compte créé. Vérifiez votre email pour activer votre compte.',
          'Fermer',
          { duration: 6000 }
        );
        this.router.navigate(['/verify-email'], { queryParams: { email } });
      },
      error: (error) => {
        this.isLoading = false;
        let errorMessage = 'Erreur lors de la création du compte';
        if (error.error) {
          if (typeof error.error === 'string') {
            errorMessage = error.error;
          } else if (error.error.message) {
            errorMessage = error.error.message;
          } else {
            const errors = Object.entries(error.error)
              .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
              .join('; ');
            if (errors) errorMessage = errors;
          }
        }
        this.snackBar.open(errorMessage, 'Fermer', { duration: 8000 });
      }
    });
  }

  onGoogleCredential(idToken: string): void {
    if (this.accountTypeForm.invalid) {
      this.snackBar.open('Choisissez d\'abord un type de compte (étape Profil)', 'Fermer', { duration: 4000 });
      return;
    }
    this.isLoading = true;
    const userType = this.accountTypeForm.value.user_type || 'client';
    this.authService.loginWithGoogle(idToken, userType).subscribe({
      next: () => {
        this.isLoading = false;
        this.snackBar.open('Compte Google créé / connecté', 'Fermer', { duration: 4000 });
        this.authService.navigateAfterAuth();
      },
      error: (error) => {
        this.isLoading = false;
        this.snackBar.open(error.error?.error || 'Inscription Google impossible', 'Fermer', { duration: 5000 });
      },
    });
  }
}
