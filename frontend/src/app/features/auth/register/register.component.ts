import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatStepperModule } from '@angular/material/stepper';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
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
    MatSelectModule,
    MatStepperModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  template: `
    <div class="register-container">
      <!-- Back Button -->
      <button mat-button class="back-btn" routerLink="/">
        <mat-icon>arrow_back</mat-icon>
        Retour à l'accueil
      </button>

      <mat-card class="register-card">
        <mat-card-header class="register-header">
          <div class="logo" routerLink="/" style="cursor: pointer;">
            <span class="logo-icon">⚡</span>
            <span class="logo-text">BlockTask</span>
          </div>
          <p class="subtitle">Créez votre compte</p>
        </mat-card-header>

        <mat-card-content>
          <mat-stepper linear #stepper>
            <!-- Étape 1: Type de compte -->
            <mat-step [stepControl]="accountTypeForm">
              <ng-template matStepLabel>Type</ng-template>
              <form [formGroup]="accountTypeForm">
                <h3>Je suis...</h3>
                <div class="account-types">
                  <div 
                    class="account-type-card" 
                    [class.selected]="accountTypeForm.get('user_type')?.value === 'client'"
                    (click)="selectAccountType('client')"
                  >
                    <mat-icon>person</mat-icon>
                    <h4>Client</h4>
                    <p>Je veux déléguer des tâches</p>
                  </div>
                  
                  <div 
                    class="account-type-card" 
                    [class.selected]="accountTypeForm.get('user_type')?.value === 'provider'"
                    (click)="selectAccountType('provider')"
                  >
                    <mat-icon>work</mat-icon>
                    <h4>Prestataire</h4>
                    <p>Je veux réaliser des missions</p>
                  </div>
                  
                  <div 
                    class="account-type-card" 
                    [class.selected]="accountTypeForm.get('user_type')?.value === 'enterprise'"
                    (click)="selectAccountType('enterprise')"
                  >
                    <mat-icon>business</mat-icon>
                    <h4>Entreprise</h4>
                    <p>Je gère une équipe</p>
                  </div>
                </div>
                
                <input type="hidden" formControlName="user_type">
                <mat-error *ngIf="accountTypeForm.get('user_type')?.hasError('required') && stepper.selectedIndex === 0">
                  Sélectionnez un type de compte
                </mat-error>
              </form>
              
              <div class="step-actions">
                <button mat-raised-button color="primary" matStepperNext [disabled]="accountTypeForm.invalid">
                  Continuer
                </button>
              </div>
            </mat-step>

            <!-- Étape 2: Informations personnelles -->
            <mat-step [stepControl]="personalInfoForm">
              <ng-template matStepLabel>Profil</ng-template>
              <form [formGroup]="personalInfoForm">
                <div class="form-row">
                  <mat-form-field appearance="fill">
                    <mat-label>Prénom</mat-label>
                    <input matInput formControlName="first_name" placeholder="Jean">
                    <mat-error *ngIf="personalInfoForm.get('first_name')?.hasError('required')">
                      Prénom requis
                    </mat-error>
                  </mat-form-field>

                  <mat-form-field appearance="fill">
                    <mat-label>Nom</mat-label>
                    <input matInput formControlName="last_name" placeholder="Dupont">
                    <mat-error *ngIf="personalInfoForm.get('last_name')?.hasError('required')">
                      Nom requis
                    </mat-error>
                  </mat-form-field>
                </div>

                <mat-form-field appearance="fill" class="full-width">
                  <mat-label>Nom d'utilisateur</mat-label>
                  <input matInput formControlName="username" placeholder="jeandupont">
                  <mat-error *ngIf="personalInfoForm.get('username')?.hasError('required')">
                    Nom d'utilisateur requis
                  </mat-error>
                </mat-form-field>

                <mat-form-field appearance="fill" class="full-width">
                  <mat-label>Email</mat-label>
                  <input matInput formControlName="email" type="email" placeholder="jean@exemple.com">
                  <mat-error *ngIf="personalInfoForm.get('email')?.hasError('required')">
                    Email requis
                  </mat-error>
                  <mat-error *ngIf="personalInfoForm.get('email')?.hasError('email')">
                    Format invalide
                  </mat-error>
                </mat-form-field>

                <mat-form-field appearance="fill" class="full-width">
                  <mat-label>Téléphone</mat-label>
                  <input matInput formControlName="phone_number" placeholder="+225 01 02 03 04 05">
                </mat-form-field>
              </form>
              
              <div class="step-actions">
                <button mat-button matStepperPrevious>Retour</button>
                <button mat-raised-button color="primary" matStepperNext [disabled]="personalInfoForm.invalid">
                  Continuer
                </button>
              </div>
            </mat-step>

            <!-- Étape 3: Sécurité -->
            <mat-step [stepControl]="securityForm">
              <ng-template matStepLabel>Sécurité</ng-template>
              <form [formGroup]="securityForm">
                <mat-form-field appearance="fill" class="full-width">
                  <mat-label>Mot de passe</mat-label>
                  <input matInput formControlName="password" [type]="hidePassword ? 'password' : 'text'">
                  <button mat-icon-button matSuffix (click)="hidePassword = !hidePassword" type="button">
                    <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
                  </button>
                  <mat-hint>Min. 8 caractères, 1 majuscule, 1 chiffre</mat-hint>
                  <mat-error *ngIf="securityForm.get('password')?.hasError('required')">
                    Mot de passe requis
                  </mat-error>
                  <mat-error *ngIf="securityForm.get('password')?.hasError('minlength')">
                    Min. 8 caractères
                  </mat-error>
                </mat-form-field>

                <mat-form-field appearance="fill" class="full-width">
                  <mat-label>Confirmer le mot de passe</mat-label>
                  <input matInput formControlName="password_confirm" [type]="hidePassword ? 'password' : 'text'">
                  <mat-error *ngIf="securityForm.get('password_confirm')?.hasError('required')">
                    Confirmation requise
                  </mat-error>
                  <mat-error *ngIf="securityForm.hasError('mismatch')">
                    Les mots de passe ne correspondent pas
                  </mat-error>
                </mat-form-field>
              </form>
              
              <div class="step-actions">
                <button mat-button matStepperPrevious>Retour</button>
                <button 
                  mat-raised-button 
                  color="primary" 
                  (click)="onSubmit()"
                  [disabled]="securityForm.invalid || isLoading"
                >
                  <mat-spinner diameter="20" *ngIf="isLoading"></mat-spinner>
                  <span *ngIf="!isLoading">Créer mon compte</span>
                </button>
              </div>
            </mat-step>
          </mat-stepper>
        </mat-card-content>

        <mat-card-footer>
          <p class="login-link">
            Déjà un compte ? 
            <a routerLink="/login" class="link">Se connecter</a>
          </p>
        </mat-card-footer>
      </mat-card>
    </div>
  `,
  styles: [`
    .register-container {
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

    .register-card {
      width: 100%;
      max-width: 540px;
      padding: 40px;
      border-radius: 16px;
      background: white;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    }

    .register-header {
      text-align: center;
      margin-bottom: 32px;
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

    h3 {
      margin-bottom: 20px;
      color: #1a1a1a;
      font-weight: 600;
    }

    .account-types {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }

    .account-type-card {
      padding: 24px 16px;
      border: 2px solid #e9ecef;
      border-radius: 12px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s ease;
      background: white;
    }

    .account-type-card:hover {
      border-color: #3CB371;
      background: rgba(60, 179, 113, 0.05);
    }

    .account-type-card.selected {
      border-color: #3CB371;
      background: rgba(60, 179, 113, 0.1);
    }

    .account-type-card mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: #3CB371;
      margin-bottom: 12px;
    }

    .account-type-card h4 {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 8px;
      color: #1a1a1a;
    }

    .account-type-card p {
      font-size: 12px;
      color: #6c757d;
      margin: 0;
    }

    /* ===== CHAMPS DE SAISIE ===== */
    .form-row {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-bottom: 8px;
    }

    .full-width {
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

    ::ng-deep .mat-step-header .mat-step-icon-selected {
      background-color: #3CB371;
    }

    ::ng-deep .mat-step-header .mat-step-icon-state-edit {
      background-color: #3CB371;
    }

    .step-actions {
      display: flex;
      justify-content: space-between;
      margin-top: 24px;
    }

    .step-actions button[mat-raised-button] {
      background: #3CB371 !important;
      color: white !important;
    }

    mat-card-footer {
      padding: 24px 0 0 0;
      text-align: center;
    }

    .login-link {
      color: #6c757d;
      font-size: 15px;
    }

    .link {
      color: #3CB371;
      font-weight: 600;
      text-decoration: none;
    }

    @media (max-width: 600px) {
      .account-types {
        grid-template-columns: 1fr;
      }
      
      .form-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class RegisterComponent {
  accountTypeForm: FormGroup;
  personalInfoForm: FormGroup;
  securityForm: FormGroup;
  hidePassword = true;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
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
      next: (response: any) => {
        this.isLoading = false;
        this.snackBar.open('Compte créé avec succès ! Redirection...', 'Fermer', { duration: 2000 });
        
        // Redirection automatique vers le dashboard
        const userType = response?.user?.user_type || formData.user_type || 'client';
        console.log('Inscription réussie - Redirection vers:', `/${userType}/dashboard`);
        
        // Délai court pour que l'utilisateur voie le message
        setTimeout(() => {
          this.router.navigate([`/${userType}/dashboard`]);
        }, 500);
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Registration error:', error);
        
        // Afficher les erreurs de validation détaillées
        let errorMessage = 'Erreur lors de la création du compte';
        if (error.error) {
          if (typeof error.error === 'string') {
            errorMessage = error.error;
          } else if (error.error.message) {
            errorMessage = error.error.message;
          } else if (error.error.email) {
            errorMessage = `Email: ${error.error.email.join(', ')}`;
          } else if (error.error.username) {
            errorMessage = `Username: ${error.error.username.join(', ')}`;
          } else if (error.error.password) {
            errorMessage = `Password: ${error.error.password.join(', ')}`;
          } else {
            // Afficher toutes les erreurs
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
}
