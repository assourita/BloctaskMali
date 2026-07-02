import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { PaymentMethodFlowService } from '../../../core/services/payment-method-flow.service';
import { MatDialog } from '@angular/material/dialog';
import { ProfileOnboardingBarComponent } from '../../../shared/components/profile-onboarding-bar/profile-onboarding-bar.component';
import { KycVerificationComponent } from '../../../shared/components/kyc-verification/kyc-verification.component';
import {
  PROVIDER_SKILL_OPTIONS,
  VEHICLE_TYPE_OPTIONS,
  SelectOption,
} from '../../../core/constants/provider-profile.constants';

interface MissionCategory {
  id: number;
  name: string;
  slug: string;
}

interface ProviderProfile {
  level: string;
  reputation_score: number;
  total_missions_completed: number;
  total_earnings: number;
  is_available: boolean;
  deposit_balance: number;
  deposit_locked: number;
  vehicle_type: string;
  vehicle_plate: string;
  skills: string[];
  categories: string[];
  working_hours_start: string;
  working_hours_end: string;
}

@Component({
  selector: 'app-provider-profile',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatTabsModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatSnackBarModule, MatDividerModule,
    MatChipsModule, MatSlideToggleModule, MatProgressBarModule,
    MatSelectModule,
    ProfileOnboardingBarComponent,
    KycVerificationComponent,
    RouterLink,
  ],
  template: `
    <div class="profile-container" *ngIf="user" [class.has-onboarding-bar]="showOnboarding">

      <!-- Header -->
      <div class="profile-header">
        <div class="avatar-section">
          <div class="avatar-wrap">
            <img *ngIf="user.profile_picture" [src]="user.profile_picture" class="avatar-img" alt="avatar"/>
            <div *ngIf="!user.profile_picture" class="avatar-initials">{{ initials }}</div>
            <button mat-mini-fab class="avatar-edit-btn" (click)="fileInput.click()">
              <mat-icon>camera_alt</mat-icon>
            </button>
            <input #fileInput type="file" accept="image/*" hidden (change)="onAvatarChange($event)"/>
          </div>
        </div>
        <div class="header-info">
          <h1>{{ user.first_name }} {{ user.last_name }}</h1>
          <span class="user-type-badge">PRESTATAIRE</span>
          <span class="level-badge" *ngIf="providerProfile">{{ levelLabel(providerProfile.level) }}</span>
          <div class="header-meta">
            <span><mat-icon>email</mat-icon> {{ user.email }}</span>
            <span><mat-icon>phone</mat-icon> {{ user.phone_number || 'Non renseigné' }}</span>
            <span><mat-icon>location_on</mat-icon> {{ user.city || 'Ville' }}, {{ user.country || 'Mali' }}</span>
          </div>
        </div>
      </div>

      <mat-tab-group class="profile-tabs" animationDuration="200ms" [(selectedIndex)]="activeTabIndex">

        <!-- Informations personnelles -->
        <mat-tab label="Informations personnelles">
          <div class="tab-content">
            <form [formGroup]="infoForm" (ngSubmit)="saveInfo()">
              <div class="form-grid">
                <div class="field-wrap">
                  <label class="field-label">Prénom <span class="req">*</span></label>
                  <input class="field-input" formControlName="first_name" placeholder="Votre prénom"/>
                </div>
                <div class="field-wrap">
                  <label class="field-label">Nom <span class="req">*</span></label>
                  <input class="field-input" formControlName="last_name" placeholder="Votre nom"/>
                </div>
                <div class="field-wrap" [class.field-missing]="isMissing('phone_number')" data-profile-field="phone_number">
                  <label class="field-label">Téléphone <span class="req" *ngIf="isMissing('phone_number')">*</span></label>
                  <input class="field-input" formControlName="phone_number" placeholder="+223..."/>
                </div>
                <div class="field-wrap" [class.field-missing]="isMissing('city')" data-profile-field="city">
                  <label class="field-label">Ville <span class="req" *ngIf="isMissing('city')">*</span></label>
                  <input class="field-input" formControlName="city" placeholder="Bamako"/>
                </div>
                <div class="field-wrap full-row" [class.field-missing]="isMissing('address')" data-profile-field="address">
                  <label class="field-label">Adresse <span class="req" *ngIf="isMissing('address')">*</span></label>
                  <input class="field-input" formControlName="address" placeholder="Votre adresse"/>
                </div>
              </div>
              <div class="field-wrap full-row">
                <label class="field-label">Bio / Présentation</label>
                <textarea class="field-input field-textarea" formControlName="bio" rows="4" placeholder="Décrivez vos compétences et votre expérience..."></textarea>
              </div>
              <div class="form-actions">
                <button mat-raised-button color="primary" type="submit" [disabled]="savingInfo">
                  <mat-icon>save</mat-icon> {{ savingInfo ? 'Enregistrement...' : 'Enregistrer' }}
                </button>
              </div>
            </form>
          </div>
        </mat-tab>

        <!-- Vérification identité -->
        <mat-tab label="Vérification identité">
          <div class="tab-content">
            <app-kyc-verification
              [user]="user"
              [missingFields]="missingFields"
              [showOnboarding]="showOnboarding"
              (kycUpdated)="onKycUpdated()">
            </app-kyc-verification>
          </div>
        </mat-tab>

        <!-- Profil prestataire -->
        <mat-tab label="Profil prestataire">
          <div class="tab-content">
            <form [formGroup]="providerForm" (ngSubmit)="saveProviderProfile()">
              <h3 class="section-title"><mat-icon>work</mat-icon> Compétences & véhicule</h3>
              <div class="form-grid">
                <div class="field-wrap full-row" [class.field-missing]="isMissing('skills')" data-profile-field="skills">
                  <label class="field-label">Compétences <span class="req" *ngIf="isMissing('skills')">*</span></label>
                  <mat-form-field appearance="outline" class="select-field">
                    <mat-select formControlName="skills" multiple placeholder="Sélectionnez vos compétences">
                      <mat-option *ngFor="let skill of skillOptions" [value]="skill.value">
                        {{ skill.label }}
                      </mat-option>
                    </mat-select>
                  </mat-form-field>
                  <p class="field-hint">Choisissez une ou plusieurs compétences.</p>
                </div>
                <div class="field-wrap full-row" [class.field-missing]="isMissing('categories')" data-profile-field="categories">
                  <label class="field-label">Catégories de missions <span class="req" *ngIf="isMissing('categories')">*</span></label>
                  <mat-form-field appearance="outline" class="select-field">
                    <mat-select formControlName="categories" multiple placeholder="Types de missions acceptées">
                      <mat-option *ngFor="let cat of missionCategories" [value]="cat.slug">
                        {{ cat.name }}
                      </mat-option>
                    </mat-select>
                  </mat-form-field>
                  <p class="field-hint">Missions que vous souhaitez recevoir sur la plateforme.</p>
                </div>
                <div class="field-wrap">
                  <label class="field-label">Type de véhicule</label>
                  <mat-form-field appearance="outline" class="select-field">
                    <mat-select formControlName="vehicle_type" placeholder="Choisir un véhicule">
                      <mat-option value="">— Aucun —</mat-option>
                      <mat-option *ngFor="let v of vehicleOptions" [value]="v.value">
                        {{ v.label }}
                      </mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>
                <div class="field-wrap">
                  <label class="field-label">Plaque d'immatriculation</label>
                  <input class="field-input" formControlName="vehicle_plate" placeholder="AB-123-CD"/>
                </div>
                <div class="field-wrap">
                  <label class="field-label">Heure début</label>
                  <input class="field-input" type="time" formControlName="working_hours_start"/>
                </div>
                <div class="field-wrap">
                  <label class="field-label">Heure fin</label>
                  <input class="field-input" type="time" formControlName="working_hours_end"/>
                </div>
              </div>

              <div class="payment-method-alert" *ngIf="isMissing('payment_method')" data-profile-field="payment_method">
                <mat-icon>payments</mat-icon>
                <div>
                  <strong>Méthode de paiement Mobile Money requise</strong>
                  <p>Ajoutez un numéro Orange Money ou Moov Money pour postuler aux missions.</p>
                </div>
                <button mat-stroked-button color="primary" type="button" (click)="setupPaymentMethod()">
                  Configurer
                </button>
              </div>

              <mat-divider class="section-divider"></mat-divider>

              <h3 class="section-title"><mat-icon>toggle_on</mat-icon> Disponibilité</h3>
              <div class="availability-box">
                <div>
                  <p class="avail-title">Accepter de nouvelles missions</p>
                  <p class="avail-desc">Désactivez temporairement si vous n'êtes pas disponible.</p>
                </div>
                <mat-slide-toggle [checked]="providerProfile?.is_available" (change)="toggleAvailability()" [disabled]="togglingAvailability">
                  {{ providerProfile?.is_available ? 'Disponible' : 'Indisponible' }}
                </mat-slide-toggle>
              </div>

              <div class="form-actions">
                <button mat-raised-button color="primary" type="submit" [disabled]="savingProvider">
                  <mat-icon>save</mat-icon> {{ savingProvider ? 'Enregistrement...' : 'Enregistrer le profil' }}
                </button>
              </div>
            </form>

            <mat-divider class="section-divider"></mat-divider>

            <h3 class="section-title"><mat-icon>security</mat-icon> Caution</h3>
            <div class="deposit-grid" *ngIf="providerProfile">
              <div class="deposit-card">
                <mat-icon>account_balance</mat-icon>
                <span class="dep-value">{{ providerProfile.deposit_balance | number:'1.0-0' }} XOF</span>
                <span class="dep-label">Solde caution</span>
              </div>
              <div class="deposit-card locked">
                <mat-icon>lock</mat-icon>
                <span class="dep-value">{{ providerProfile.deposit_locked | number:'1.0-0' }} XOF</span>
                <span class="dep-label">Caution bloquée</span>
              </div>
              <button mat-stroked-button color="primary" routerLink="/provider/deposit">
                <mat-icon>add</mat-icon> Gérer ma caution
              </button>
            </div>
          </div>
        </mat-tab>

        <!-- Sécurité -->
        <mat-tab label="Sécurité">
          <div class="tab-content">
            <h3 class="section-title"><mat-icon>lock</mat-icon> Changer le mot de passe</h3>
            <form [formGroup]="pwdForm" (ngSubmit)="changePassword()">
              <div class="pwd-fields">
                <div class="field-wrap">
                  <label class="field-label">Mot de passe actuel</label>
                  <input class="field-input" type="password" formControlName="old_password"/>
                </div>
                <div class="field-wrap">
                  <label class="field-label">Nouveau mot de passe</label>
                  <input class="field-input" type="password" formControlName="new_password"/>
                </div>
                <div class="field-wrap">
                  <label class="field-label">Confirmer</label>
                  <input class="field-input" type="password" formControlName="new_password_confirm"/>
                </div>
              </div>
              <div class="form-actions">
                <button mat-raised-button color="warn" type="submit" [disabled]="pwdForm.invalid || savingPwd">
                  <mat-icon>lock_reset</mat-icon> {{ savingPwd ? 'Modification...' : 'Modifier' }}
                </button>
              </div>
            </form>

            <mat-divider class="section-divider"></mat-divider>

            <h3 class="section-title"><mat-icon>account_balance_wallet</mat-icon> Wallet Ethereum</h3>
            <div class="wallet-section">
              <div *ngIf="user.wallet_address" class="wallet-connected">
                <mat-icon class="connected-icon">check_circle</mat-icon>
                <div>
                  <p class="wallet-label">Wallet connecté</p>
                  <code class="wallet-full">{{ user.wallet_address }}</code>
                </div>
                <button mat-stroked-button color="warn" (click)="disconnectWallet()">
                  <mat-icon>link_off</mat-icon> Déconnecter
                </button>
              </div>
              <div *ngIf="!user.wallet_address" class="wallet-disconnected">
                <mat-icon>account_balance_wallet</mat-icon>
                <p>Connectez MetaMask pour recevoir vos paiements on-chain.</p>
                <button mat-raised-button color="primary" (click)="connectWallet()">
                  <mat-icon>link</mat-icon> Connecter MetaMask
                </button>
              </div>
            </div>

            <mat-divider class="section-divider"></mat-divider>

            <h3 class="section-title"><mat-icon>swap_horiz</mat-icon> Espace Client</h3>
            <div class="client-space-box" *ngIf="user.secondary_role === 'client'">
              <mat-icon class="ok-icon">check_circle</mat-icon>
              <div>
                <p class="title">Espace client disponible</p>
                <p class="desc">Déléguez des tâches : créez des missions, payez via Mobile Money et suivez vos prestataires.</p>
              </div>
              <button mat-raised-button color="primary" (click)="goToClientSpace()">
                <mat-icon>open_in_new</mat-icon> Accéder à l'espace client
              </button>
            </div>

            <mat-divider class="section-divider"></mat-divider>

            <h3 class="section-title"><mat-icon>gps_fixed</mat-icon> Suivi GPS</h3>
            <div class="gps-section">
              <p class="gps-desc">Partagez votre position pendant les missions pour permettre au client de vous suivre en temps réel.</p>
              <button class="gps-toggle-btn" [class.active]="user.gps_tracking_enabled" (click)="toggleGPS()" [disabled]="savingGPS">
                <span class="gps-toggle-track"><span class="gps-toggle-thumb"></span></span>
                <span>{{ user.gps_tracking_enabled ? 'GPS activé' : 'GPS désactivé' }}</span>
              </button>
            </div>
          </div>
        </mat-tab>

        <!-- Activité -->
        <mat-tab label="Activité">
          <div class="tab-content">
            <div class="activity-stats">
              <div class="act-card">
                <mat-icon style="color:#6C5CE7">assignment</mat-icon>
                <span class="act-value">{{ stats.total_missions }}</span>
                <span class="act-label">Missions totales</span>
              </div>
              <div class="act-card">
                <mat-icon style="color:#00b894">check_circle</mat-icon>
                <span class="act-value">{{ stats.completed_missions }}</span>
                <span class="act-label">Terminées</span>
              </div>
              <div class="act-card">
                <mat-icon style="color:#fdcb6e">pending</mat-icon>
                <span class="act-value">{{ stats.active_missions }}</span>
                <span class="act-label">En cours</span>
              </div>
              <div class="act-card">
                <mat-icon style="color:#00b894">payments</mat-icon>
                <span class="act-value">{{ stats.total_earned | number:'1.0-0' }}</span>
                <span class="act-label">Revenus (XOF)</span>
              </div>
            </div>

            <mat-divider class="section-divider"></mat-divider>

            <h3 class="section-title"><mat-icon>verified</mat-icon> Réputation</h3>
            <div class="reputation-box" *ngIf="providerProfile">
              <div class="rep-score">
                <span class="rep-number">{{ providerProfile.reputation_score | number:'1.0-1' }}</span>
                <span class="rep-max">/100</span>
              </div>
              <mat-progress-bar mode="determinate" [value]="providerProfile.reputation_score" color="primary"></mat-progress-bar>
              <p class="rep-level">Niveau : <strong>{{ levelLabel(providerProfile.level) }}</strong></p>
              <button mat-stroked-button routerLink="/provider/reputation">
                <mat-icon>insights</mat-icon> Voir le détail
              </button>
            </div>

            <mat-divider class="section-divider"></mat-divider>

            <h3 class="section-title"><mat-icon>history</mat-icon> Informations du compte</h3>
            <div class="account-info-grid">
              <div class="info-row">
                <span class="info-key">Membre depuis</span>
                <span class="info-val">{{ user.created_at | date:'dd MMM yyyy' }}</span>
              </div>
              <div class="info-row">
                <span class="info-key">Email vérifié</span>
                <mat-icon [style.color]="user.email_verified ? '#00b894' : '#e17055'">
                  {{ user.email_verified ? 'check_circle' : 'cancel' }}
                </mat-icon>
              </div>
              <div class="info-row">
                <span class="info-key">NINA / ID nationale</span>
                <span class="info-val">{{ user.nina || 'Non renseigné' }}</span>
              </div>
            </div>
          </div>
        </mat-tab>

      </mat-tab-group>

      <app-profile-onboarding-bar
        [visible]="showOnboarding"
        [missingFields]="missingFields"
        [kycAccessStatus]="user?.kyc_access_status || null"
        [kycBlockMessage]="user?.kyc_block_message || ''">
      </app-profile-onboarding-bar>
    </div>
  `,
  styles: [`
    .profile-container { padding: 24px; max-width: 900px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; }
    .profile-container.has-onboarding-bar { padding-bottom: 100px; }

    .profile-header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%); color: #fff; border-radius: 16px; padding: 28px 32px; display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }
    .avatar-wrap { position: relative; width: 88px; height: 88px; }
    .avatar-img { width: 88px; height: 88px; border-radius: 50%; object-fit: cover; border: 3px solid #6C5CE7; }
    .avatar-initials { width: 88px; height: 88px; border-radius: 50%; background: linear-gradient(135deg, #6C5CE7, #00b894); display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 700; }
    .avatar-edit-btn { position: absolute; bottom: -4px; right: -4px; width: 28px; height: 28px; background: #6C5CE7 !important; mat-icon { font-size: 14px; width: 14px; height: 14px; } }

    .header-info { flex: 1; h1 { margin: 0 0 6px; font-size: 22px; font-weight: 700; } }
    .user-type-badge { background: rgba(108,92,231,0.25); border: 1px solid #6C5CE7; color: #a29bfe; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; letter-spacing: 1px; margin-right: 8px; }
    .level-badge { background: rgba(0,184,148,0.2); border: 1px solid #00b894; color: #00b894; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; }
    .header-meta { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 10px; font-size: 13px; opacity: 0.85; span { display: flex; align-items: center; gap: 4px; mat-icon { font-size: 14px; width: 14px; height: 14px; } } }

    .profile-tabs { background: #fff; border-radius: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); overflow: hidden; }
  :host ::ng-deep .profile-tabs .mat-mdc-tab.mdc-tab--active .mdc-tab__text-label { color: #6C5CE7 !important; }
  :host ::ng-deep .profile-tabs .mat-mdc-tab-indicator .mdc-tab-indicator__content--underline { border-color: #6C5CE7 !important; }
    .tab-content { padding: 24px; }

    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    .full-row { grid-column: 1 / -1; }
    .field-wrap { display: flex; flex-direction: column; gap: 6px; }
    .field-label { font-size: 13px; font-weight: 600; color: #374151; }
    .req { color: #e17055; }
    .field-input { width: 100%; box-sizing: border-box; padding: 10px 14px; border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 14px; outline: none; font-family: inherit; }
    .field-input:focus { border-color: #6C5CE7; box-shadow: 0 0 0 3px rgba(108,92,231,0.1); }
    .field-wrap.field-missing .field-label { color: #dc2626; }
    .field-wrap.field-missing .field-input { border-color: #dc2626; box-shadow: 0 0 0 3px rgba(220,38,38,0.12); }
    .field-wrap.field-missing::after { content: 'À compléter'; display: block; font-size: 11px; color: #dc2626; margin-top: 4px; font-weight: 600; }
    :host ::ng-deep .field-wrap.field-missing .mat-mdc-form-field .mdc-notched-outline__leading,
    :host ::ng-deep .field-wrap.field-missing .mat-mdc-form-field .mdc-notched-outline__notch,
    :host ::ng-deep .field-wrap.field-missing .mat-mdc-form-field .mdc-notched-outline__trailing { border-color: #dc2626 !important; }
    .payment-method-alert {
      display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
      background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 14px 16px; margin-bottom: 16px;
      mat-icon { color: #dc2626; }
      strong { display: block; font-size: 14px; color: #991b1b; }
      p { margin: 4px 0 0; font-size: 13px; color: #7f1d1d; }
    }
    .field-textarea { resize: vertical; min-height: 90px; }
    .field-hint { margin: 4px 0 0; font-size: 12px; color: #6b7280; }
    .select-field { width: 100%; }
    :host ::ng-deep .select-field .mat-mdc-form-field-subscript-wrapper { display: none; }
    :host ::ng-deep .select-field .mat-mdc-text-field-wrapper { background: #fff; border-radius: 8px; }
    .form-actions { display: flex; justify-content: flex-end; margin-top: 12px; }
    .pwd-fields { display: flex; flex-direction: column; gap: 16px; max-width: 480px; margin-bottom: 16px; }

    .section-title { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600; color: #1a1a2e; margin: 0 0 16px; mat-icon { color: #6C5CE7; } }
    .section-divider { margin: 24px 0; }

    .availability-box { display: flex; align-items: center; justify-content: space-between; gap: 16px; background: #f8fafc; border-radius: 12px; padding: 16px; flex-wrap: wrap; }
    .avail-title { margin: 0 0 4px; font-weight: 600; }
    .avail-desc { margin: 0; font-size: 13px; color: #6b7280; }

    .deposit-grid { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .deposit-card { background: #f0faf4; border-radius: 12px; padding: 16px 20px; display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 140px; mat-icon { color: #00b894; } &.locked { background: #fef3c7; mat-icon { color: #d97706; } } }
    .dep-value { font-size: 20px; font-weight: 700; color: #1a1a2e; }
    .dep-label { font-size: 12px; color: #6b7280; }

    .wallet-section, .kyc-section { background: #f8fafc; border-radius: 12px; padding: 16px; }
    .wallet-connected { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; .connected-icon { color: #00b894; font-size: 32px; width: 32px; height: 32px; } .wallet-label { margin: 0 0 4px; font-weight: 600; } .wallet-full { font-size: 12px; color: #6b7280; word-break: break-all; } }
    .wallet-disconnected { display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; color: #6b7280; mat-icon { font-size: 40px; width: 40px; height: 40px; color: #d1d5db; } }

    .client-space-box { display: flex; align-items: flex-start; gap: 16px; flex-wrap: wrap; background: #f8fafc; border-radius: 12px; padding: 16px; }
    .ok-icon { color: #00b894; font-size: 36px; width: 36px; height: 36px; flex-shrink: 0; }
    .title { font-weight: 600; margin: 0 0 8px; }
    .desc { color: #666; margin: 0; line-height: 1.5; font-size: 13px; }

    .kyc-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 20px; font-weight: 600; font-size: 13px; margin-bottom: 8px; }
    .kyc-badge-verified { background: #d1fae5; color: #065f46; } .kyc-badge-pending { background: #fef3c7; color: #92400e; } .kyc-badge-not_required, .kyc-badge-not_started { background: #f3f4f6; color: #6b7280; }
    .kyc-desc { font-size: 13px; color: #6b7280; margin: 0; }

    .gps-section { background: #f8fafc; border-radius: 12px; padding: 16px; }
    .gps-desc { font-size: 13px; color: #6b7280; margin: 0 0 12px; }
    .gps-toggle-btn { display: flex; align-items: center; gap: 10px; background: none; border: none; cursor: pointer; padding: 4px; }
    .gps-toggle-track { position: relative; width: 48px; height: 26px; background: #d1d5db; border-radius: 13px; display: block; }
    .gps-toggle-thumb { position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; background: #fff; border-radius: 50%; box-shadow: 0 1px 4px rgba(0,0,0,0.2); transition: transform 0.25s; display: block; }
    .gps-toggle-btn.active .gps-toggle-track { background: #00b894; }
    .gps-toggle-btn.active .gps-toggle-thumb { transform: translateX(22px); }

    .activity-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .act-card { background: #f8fafc; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; align-items: center; gap: 4px; mat-icon { font-size: 28px; width: 28px; height: 28px; } }
    .act-value { font-size: 22px; font-weight: 700; color: #1a1a2e; }
    .act-label { font-size: 12px; color: #6b7280; text-align: center; }

    .reputation-box { background: #f8fafc; border-radius: 12px; padding: 20px; max-width: 400px; }
    .rep-score { margin-bottom: 8px; }
    .rep-number { font-size: 36px; font-weight: 700; color: #6C5CE7; }
    .rep-max { font-size: 16px; color: #9ca3af; }
    .rep-level { font-size: 14px; color: #374151; margin: 12px 0; }

    .account-info-grid { display: flex; flex-direction: column; }
    .info-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
    .info-key { font-size: 14px; color: #6b7280; }
    .info-val { font-size: 14px; font-weight: 600; color: #1a1a2e; }

    @media (max-width: 600px) {
      .form-grid, .activity-stats { grid-template-columns: 1fr; }
      .profile-header { flex-direction: column; text-align: center; }
    }
  `]
})
export class ProviderProfileComponent implements OnInit {
  private apiUrl = environment.apiUrl;

  user: any = null;
  providerProfile: ProviderProfile | null = null;
  stats = { total_missions: 0, completed_missions: 0, active_missions: 0, total_earned: 0 };

  infoForm!: FormGroup;
  providerForm!: FormGroup;
  pwdForm!: FormGroup;

  savingInfo = false;
  savingProvider = false;
  savingPwd = false;
  savingGPS = false;
  togglingAvailability = false;
  showOnboarding = false;
  missingFields: string[] = [];
  activeTabIndex = 0;
  private readonly kycFields = ['nina', 'id_card_front', 'id_card_back', 'selfie_verification', 'phone_verified'];
  skillOptions: SelectOption[] = PROVIDER_SKILL_OPTIONS;
  vehicleOptions: SelectOption[] = VEHICLE_TYPE_OPTIONS;
  missionCategories: MissionCategory[] = [];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private snack: MatSnackBar,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private paymentMethodFlow: PaymentMethodFlowService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.infoForm = this.fb.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      phone_number: [''],
      city: [''],
      address: [''],
      bio: [''],
    });

    this.providerForm = this.fb.group({
      skills: [[] as string[]],
      categories: [[] as string[]],
      vehicle_type: [''],
      vehicle_plate: [''],
      working_hours_start: ['08:00'],
      working_hours_end: ['18:00'],
    });

    this.pwdForm = this.fb.group({
      old_password: ['', Validators.required],
      new_password: ['', [Validators.required, Validators.minLength(8)]],
      new_password_confirm: ['', Validators.required],
    }, { validators: this.passwordMatch });

    this.loadStats();
    this.loadMissionCategories();

    this.route.queryParams.subscribe((params) => {
      if (params['complete'] === '1' || params['kyc']) {
        this.activeTabIndex = 1;
      }
    });
  }

  private loadMissionCategories(): void {
    this.http.get<any>(`${this.apiUrl}/categories/`, { headers: this.h() }).subscribe({
      next: (response) => {
        this.missionCategories = Array.isArray(response) ? response : (response.results || []);
        this.loadProfile();
      },
      error: () => this.loadProfile(),
    });
  }

  get initials(): string {
    if (!this.user) return '?';
    return ((this.user.first_name?.[0] || '') + (this.user.last_name?.[0] || '')).toUpperCase() || '?';
  }

  private h(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });
  }

  private mergeLegacyOptions(values: string[], options: SelectOption[]): void {
    for (const value of values) {
      if (!value || options.some((o) => o.value === value)) continue;
      options.push({ value, label: value });
    }
  }

  private mergeLegacyCategoryOptions(values: string[]): void {
    for (const value of values) {
      if (!value || this.missionCategories.some((c) => c.slug === value)) continue;
      this.missionCategories.push({ id: 0, name: value, slug: value });
    }
  }

  loadProfile(): void {
    this.http.get<any>(`${this.apiUrl}/users/me/`, { headers: this.h() }).subscribe({
      next: (u) => {
        this.user = u;
        this.providerProfile = u.provider_profile || null;
        this.missingFields = u.profile_missing_fields || [];
        this.updateOnboardingState(u);
        this.infoForm.patchValue({
          first_name: u.first_name || '',
          last_name: u.last_name || '',
          phone_number: u.phone_number || '',
          city: u.city || '',
          address: u.address || '',
          bio: u.bio || '',
        });
        if (this.providerProfile) {
          this.mergeLegacyOptions(this.providerProfile.skills || [], this.skillOptions);
          this.mergeLegacyCategoryOptions(this.providerProfile.categories || []);
          this.providerForm.patchValue({
            skills: this.providerProfile.skills || [],
            categories: this.providerProfile.categories || [],
            vehicle_type: this.providerProfile.vehicle_type || '',
            vehicle_plate: this.providerProfile.vehicle_plate || '',
            working_hours_start: this.providerProfile.working_hours_start || '08:00',
            working_hours_end: this.providerProfile.working_hours_end || '18:00',
          });
        }
      },
      error: () => this.snack.open('Erreur chargement profil', 'Fermer', { duration: 3000 }),
    });
  }

  loadStats(): void {
    this.http.get<any>(`${this.apiUrl}/users/stats/`, { headers: this.h() }).subscribe({
      next: (s) => {
        this.stats.total_missions = s.total_missions || 0;
        this.stats.completed_missions = s.completed_missions || 0;
        this.stats.active_missions = s.active_missions || 0;
        this.stats.total_earned = s.total_earned || 0;
      },
    });
    this.http.get<any>(`${this.apiUrl}/missions/my_missions/`, { headers: this.h() }).subscribe({
      next: (r) => {
        const missions = Array.isArray(r) ? r : (r?.results ?? []);
        if (!this.stats.total_missions) {
          this.stats.total_missions = missions.length;
          this.stats.completed_missions = missions.filter((m: any) => m.status === 'completed').length;
          this.stats.active_missions = missions.filter((m: any) => ['in_progress', 'accepted'].includes(m.status)).length;
        }
      },
    });
  }

  saveInfo(): void {
    if (this.infoForm.invalid) return;
    this.savingInfo = true;
    this.http.patch<any>(`${this.apiUrl}/users/me/`, this.infoForm.value, { headers: this.h() }).subscribe({
      next: (u) => {
        this.user = { ...this.user, ...u };
        this.savingInfo = false;
        this.snack.open('Profil mis à jour', 'Fermer', { duration: 3000 });
        this.afterProfileSave();
      },
      error: () => { this.savingInfo = false; this.snack.open('Erreur', 'Fermer', { duration: 3000 }); },
    });
  }

  saveProviderProfile(): void {
    this.savingProvider = true;
    const v = this.providerForm.value;
    const payload = {
      skills: v.skills || [],
      categories: v.categories || [],
      vehicle_type: v.vehicle_type || '',
      vehicle_plate: v.vehicle_plate || '',
      working_hours_start: v.working_hours_start || '08:00',
      working_hours_end: v.working_hours_end || '18:00',
    };
    this.http.patch<any>(`${this.apiUrl}/users/provider/profile/`, payload, { headers: this.h() }).subscribe({
      next: (p) => {
        this.providerProfile = { ...this.providerProfile!, ...p };
        this.savingProvider = false;
        this.snack.open('Profil prestataire mis à jour', 'Fermer', { duration: 3000 });
        this.afterProfileSave();
      },
      error: () => { this.savingProvider = false; this.snack.open('Erreur', 'Fermer', { duration: 3000 }); },
    });
  }

  private updateOnboardingState(u: any): void {
    this.showOnboarding = u.can_access_platform === false;
    const providerFields = ['skills', 'categories', 'payment_method'];
    if (this.showOnboarding && this.missingFields.some((f) => this.kycFields.includes(f))) {
      this.activeTabIndex = 1;
    } else if (this.showOnboarding && this.missingFields.some((f) => providerFields.includes(f))) {
      this.activeTabIndex = 2;
    }
  }

  onKycUpdated(): void {
    this.afterProfileSave();
  }

  isMissing(field: string): boolean {
    return this.showOnboarding && this.missingFields.includes(field);
  }

  setupPaymentMethod(): void {
    this.paymentMethodFlow.ensurePaymentMethod(this.dialog).subscribe((ok) => {
      if (ok) this.afterProfileSave();
    });
  }

  private afterProfileSave(): void {
    this.authService.refreshUserProfile().subscribe((u) => {
      this.user = u;
      this.missingFields = u.profile_missing_fields || [];
      this.updateOnboardingState(u);
      if (u.can_access_platform) {
        this.authService.navigateAfterAuth();
      }
    });
  }

  toggleAvailability(): void {
    this.togglingAvailability = true;
    this.http.post<any>(`${this.apiUrl}/users/toggle-availability/`, {}, { headers: this.h() }).subscribe({
      next: (res) => {
        if (this.providerProfile) this.providerProfile.is_available = res.is_available;
        this.togglingAvailability = false;
        this.snack.open(res.message, 'Fermer', { duration: 3000 });
      },
      error: () => { this.togglingAvailability = false; },
    });
  }

  changePassword(): void {
    if (this.pwdForm.invalid) return;
    this.savingPwd = true;
    this.http.post(`${this.apiUrl}/users/change-password/`, this.pwdForm.value, { headers: this.h() }).subscribe({
      next: () => {
        this.savingPwd = false;
        this.pwdForm.reset();
        this.snack.open('Mot de passe modifié', 'Fermer', { duration: 3000 });
      },
      error: (e) => {
        this.savingPwd = false;
        this.snack.open(e.error?.detail || 'Erreur', 'Fermer', { duration: 4000 });
      },
    });
  }

  onAvatarChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('profile_picture', file);
    this.http.patch<any>(`${this.apiUrl}/users/me/`, fd, { headers: new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('access_token')}` }) }).subscribe({
      next: (u) => { this.user = { ...this.user, profile_picture: u.profile_picture }; },
    });
  }

  connectWallet(): void {
    if (!(window as any).ethereum) {
      this.snack.open('MetaMask non détecté', 'Fermer', { duration: 4000 });
      return;
    }
    (window as any).ethereum.request({ method: 'eth_requestAccounts' }).then((accounts: string[]) => {
      const wallet_address = accounts[0];
      this.http.post(`${this.apiUrl}/users/wallet/connect/`, { wallet_address, signature: 'pending' }, { headers: this.h() }).subscribe({
        next: () => { this.user = { ...this.user, wallet_address }; },
        error: () => { this.user = { ...this.user, wallet_address }; },
      });
    });
  }

  disconnectWallet(): void {
    this.http.patch(`${this.apiUrl}/users/me/`, { wallet_address: null }, { headers: this.h() }).subscribe({
      next: () => { this.user = { ...this.user, wallet_address: null }; },
    });
  }

  goToClientSpace(): void {
    this.authService.switchRole('client').subscribe({
      error: () => this.router.navigate(['/client/dashboard']),
    });
  }

  toggleGPS(): void {
    this.savingGPS = true;
    this.http.post<any>(`${this.apiUrl}/users/toggle-gps/`, {}, { headers: this.h() }).subscribe({
      next: (res) => {
        this.user = { ...this.user, gps_tracking_enabled: res.gps_tracking_enabled };
        this.savingGPS = false;
      },
      error: () => { this.savingGPS = false; },
    });
  }

  levelLabel(level: string): string {
    const map: Record<string, string> = { bronze: 'Bronze', silver: 'Argent', gold: 'Or', platinum: 'Platine' };
    return map[level] || level;
  }

  kycLabel(status?: string): string {
    const map: Record<string, string> = { verified: 'Vérifié', pending: 'En attente', rejected: 'Rejeté', not_required: 'Non requis' };
    return map[status || ''] || 'Non vérifié';
  }

  kycIcon(status?: string): string {
    const map: Record<string, string> = { verified: 'verified', pending: 'hourglass_empty', rejected: 'cancel' };
    return map[status || ''] || 'badge';
  }

  kycDesc(status?: string): string {
    const map: Record<string, string> = {
      verified: 'Votre identité a été vérifiée.',
      pending: 'Votre dossier KYC est en cours d\'examen.',
      not_required: 'Complétez votre KYC pour accéder à plus de missions.',
    };
    return map[status || ''] || '';
  }

  private passwordMatch(g: FormGroup) {
    return g.get('new_password')?.value === g.get('new_password_confirm')?.value ? null : { mismatch: true };
  }
}
