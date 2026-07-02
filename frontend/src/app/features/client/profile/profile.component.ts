import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { OverlayModule } from '@angular/cdk/overlay';
import { Router, ActivatedRoute } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { MALI_COUNTRY } from '../../../core/constants/africa.constants';
import { ProfileOnboardingBarComponent } from '../../../shared/components/profile-onboarding-bar/profile-onboarding-bar.component';
import { KycVerificationComponent } from '../../../shared/components/kyc-verification/kyc-verification.component';

@Component({
  selector: 'app-client-profile',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatTabsModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatSnackBarModule, MatDividerModule,
    MatChipsModule, MatProgressBarModule, MatSelectModule, OverlayModule,
    ProfileOnboardingBarComponent,
    KycVerificationComponent,
  ],
  template: `
    <div class="profile-container" [class.has-onboarding-bar]="showOnboarding">

      <!-- Header carte identité -->
      <div class="profile-header">
        <div class="avatar-section">
          <div class="avatar-wrap">
            <img *ngIf="user?.profile_picture" [src]="user.profile_picture" class="avatar-img" alt="avatar"/>
            <div *ngIf="!user?.profile_picture" class="avatar-initials">
              {{ initials }}
            </div>
            <button mat-mini-fab class="avatar-edit-btn" (click)="fileInput.click()" matTooltip="Changer la photo">
              <mat-icon>camera_alt</mat-icon>
            </button>
            <input #fileInput type="file" accept="image/*" hidden (change)="onAvatarChange($event)"/>
          </div>
        </div>
        <div class="header-info">
          <h1>{{ user?.first_name }} {{ user?.last_name }}</h1>
          <span class="user-type-badge">CLIENT</span>
          <div class="header-meta">
            <span><mat-icon>email</mat-icon> {{ user?.email }}</span>
            <span><mat-icon>phone</mat-icon> {{ user?.phone_number || 'Non renseigné' }}</span>
            <span><mat-icon>location_on</mat-icon> {{ user?.city || 'Ville' }}, {{ user?.country || 'Pays' }}</span>
          </div>
        </div>
        <div class="header-stats">
          <div class="stat-pill">
            <mat-icon>verified</mat-icon>
            <span [class]="'kyc-' + user?.kyc_status">
              {{ kycLabel(user?.kyc_status) }}
            </span>
          </div>
          <div class="stat-pill" *ngIf="user?.wallet_address">
            <mat-icon>account_balance_wallet</mat-icon>
            <span class="wallet-addr">{{ user?.wallet_address | slice:0:6 }}...{{ user?.wallet_address | slice:-4 }}</span>
          </div>
          <div class="stat-pill" *ngIf="!user?.wallet_address">
            <mat-icon>account_balance_wallet</mat-icon>
            <span class="no-wallet">Wallet non connecté</span>
          </div>
        </div>
      </div>

      <!-- Onglets -->
      <mat-tab-group class="profile-tabs" animationDuration="200ms" [(selectedIndex)]="activeTabIndex">

        <!-- ── Onglet 1 : Informations personnelles ── -->
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
                  <div class="field-input-icon">
                    <input class="field-input" formControlName="phone_number" placeholder="+229..."/>
                    <mat-icon class="field-icon">phone</mat-icon>
                  </div>
                </div>
                <div class="field-wrap">
                  <label class="field-label">Pays <span class="req">*</span></label>
                  <div class="native-select-wrap">
                    <select class="native-select" formControlName="country" (change)="onCountryChange()">
                      <option value="" disabled selected>Sélectionnez un pays</option>
                      <option *ngFor="let c of africanCountries" [value]="c.code">{{ c.name }}</option>
                    </select>
                    <mat-icon class="select-arrow">expand_more</mat-icon>
                  </div>
                </div>
                <div class="field-wrap" [class.field-missing]="isMissing('city')" data-profile-field="city">
                  <label class="field-label">Ville <span class="req">*</span></label>
                  <div class="native-select-wrap">
                    <select class="native-select" formControlName="city" [disabled]="!infoForm.get('country')?.value">
                      <option value="" disabled selected>{{ availableCities.length ? 'Sélectionnez une ville' : 'Choisissez d\'abord un pays' }}</option>
                      <option *ngFor="let city of availableCities" [value]="city">{{ city }}</option>
                    </select>
                    <mat-icon class="select-arrow">expand_more</mat-icon>
                  </div>
                </div>
                <div class="field-wrap" [class.field-missing]="isMissing('address')" data-profile-field="address">
                  <label class="field-label">Adresse <span class="req" *ngIf="isMissing('address')">*</span></label>
                  <div class="field-input-icon">
                    <input class="field-input" formControlName="address" placeholder="Votre adresse"/>
                    <mat-icon class="field-icon">home</mat-icon>
                  </div>
                </div>
              </div>
              <div class="field-wrap full-width">
                <label class="field-label">Bio / Description</label>
                <textarea class="field-input field-textarea" formControlName="bio" rows="4" placeholder="Parlez de vous..."></textarea>
              </div>
              <div class="form-actions">
                <button mat-raised-button color="primary" type="submit" [disabled]="savingInfo">
                  <mat-icon>save</mat-icon>
                  {{ savingInfo ? 'Enregistrement...' : 'Enregistrer' }}
                </button>
              </div>
            </form>
          </div>
        </mat-tab>

        <!-- ── Onglet 2 : Vérification identité ── -->
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

        <!-- ── Onglet 3 : Sécurité ── -->
        <mat-tab label="Sécurité">
          <div class="tab-content">
            <h3 class="section-title"><mat-icon>lock</mat-icon> Changer le mot de passe</h3>
            <form [formGroup]="pwdForm" (ngSubmit)="changePassword()">
              <div class="pwd-fields">
                <div class="field-wrap">
                  <label class="field-label">Mot de passe actuel <span class="req">*</span></label>
                  <div class="field-input-icon">
                    <input class="field-input" [type]="showPwd[0] ? 'text' : 'password'" formControlName="old_password" placeholder="••••••••"/>
                    <button class="pwd-eye-btn" type="button" (click)="showPwd[0]=!showPwd[0]">
                      <mat-icon>{{ showPwd[0] ? 'visibility_off' : 'visibility' }}</mat-icon>
                    </button>
                  </div>
                </div>
                <div class="field-wrap">
                  <label class="field-label">Nouveau mot de passe <span class="req">*</span></label>
                  <div class="field-input-icon">
                    <input class="field-input" [type]="showPwd[1] ? 'text' : 'password'" formControlName="new_password" placeholder="••••••••"/>
                    <button class="pwd-eye-btn" type="button" (click)="showPwd[1]=!showPwd[1]">
                      <mat-icon>{{ showPwd[1] ? 'visibility_off' : 'visibility' }}</mat-icon>
                    </button>
                  </div>
                </div>
                <div class="field-wrap">
                  <label class="field-label">Confirmer le nouveau mot de passe <span class="req">*</span></label>
                  <div class="field-input-icon">
                    <input class="field-input" [type]="showPwd[2] ? 'text' : 'password'" formControlName="new_password_confirm" placeholder="••••••••"/>
                    <button class="pwd-eye-btn" type="button" (click)="showPwd[2]=!showPwd[2]">
                      <mat-icon>{{ showPwd[2] ? 'visibility_off' : 'visibility' }}</mat-icon>
                    </button>
                  </div>
                  <span class="field-error" *ngIf="pwdForm.errors?.['mismatch']">Les mots de passe ne correspondent pas</span>
                </div>
              </div>
              <div class="form-actions">
                <button mat-raised-button color="warn" type="submit" [disabled]="pwdForm.invalid || savingPwd">
                  <mat-icon>lock_reset</mat-icon>
                  {{ savingPwd ? 'Modification...' : 'Modifier le mot de passe' }}
                </button>
              </div>
            </form>

            <mat-divider class="section-divider"></mat-divider>

            <h3 class="section-title"><mat-icon>account_balance_wallet</mat-icon> Wallet Ethereum</h3>
            <div class="wallet-section">
              <div *ngIf="user?.wallet_address" class="wallet-connected">
                <mat-icon class="connected-icon">check_circle</mat-icon>
                <div>
                  <p class="wallet-label">Wallet connecté</p>
                  <code class="wallet-full">{{ user?.wallet_address }}</code>
                </div>
                <button mat-stroked-button color="warn" (click)="disconnectWallet()">
                  <mat-icon>link_off</mat-icon> Déconnecter
                </button>
              </div>
              <div *ngIf="!user?.wallet_address" class="wallet-disconnected">
                <mat-icon>account_balance_wallet</mat-icon>
                <p>Aucun wallet connecté. Connectez MetaMask pour participer aux transactions blockchain.</p>
                <button mat-raised-button color="primary" (click)="connectWallet()">
                  <mat-icon>link</mat-icon> Connecter MetaMask
                </button>
              </div>
            </div>

            <mat-divider class="section-divider"></mat-divider>

            <h3 class="section-title"><mat-icon>swap_horiz</mat-icon> Espace Prestataire</h3>
            <div class="provider-activation-section">
              <div *ngIf="user?.secondary_role === 'provider'" class="provider-active-box">
                <mat-icon class="provider-active-icon">check_circle</mat-icon>
                <div>
                  <p class="provider-active-label">Espace prestataire activé</p>
                  <p class="provider-active-desc">Vous pouvez basculer vers votre espace prestataire depuis le menu.</p>
                </div>
                <button mat-raised-button color="primary" (click)="goToProviderSpace()">
                  <mat-icon>open_in_new</mat-icon> Accéder
                </button>
              </div>
              <div *ngIf="user?.secondary_role !== 'provider'" class="provider-inactive-box">
                <mat-icon>work_outline</mat-icon>
                <div>
                  <p class="provider-inactive-title">Devenez prestataire</p>
                  <p class="provider-inactive-desc">Activez votre espace prestataire pour proposer vos services, accepter des missions et gagner de l'argent.</p>
                  <ul class="provider-benefits">
                    <li><mat-icon>check</mat-icon> Accès aux missions disponibles</li>
                    <li><mat-icon>check</mat-icon> Système de réputation blockchain</li>
                    <li><mat-icon>check</mat-icon> Paiements automatiques sécurisés</li>
                  </ul>
                </div>
                <button mat-raised-button color="accent" (click)="activateProviderRole()" [disabled]="activatingProvider">
                  <mat-icon>add_circle</mat-icon>
                  {{ activatingProvider ? 'Activation...' : 'Activer le profil prestataire' }}
                </button>
              </div>
            </div>

            <mat-divider class="section-divider"></mat-divider>

            <h3 class="section-title"><mat-icon>gps_fixed</mat-icon> Suivi GPS</h3>
            <div class="gps-section">
              <div class="gps-row">
                <div class="gps-info">
                  <p class="gps-title">Localisation en temps réel</p>
                  <p class="gps-desc">
                    Activé par défaut pour améliorer le suivi des missions et la mise en relation avec les prestataires proches de vous.
                    Vous pouvez le désactiver à tout moment.
                  </p>
                </div>
                <div class="gps-toggle-wrap">
                  <button class="gps-toggle-btn"
                    [class.active]="user?.gps_tracking_enabled"
                    (click)="toggleGPS()"
                    [disabled]="savingGPS">
                    <span class="gps-toggle-track">
                      <span class="gps-toggle-thumb"></span>
                    </span>
                    <span class="gps-toggle-label">
                      {{ user?.gps_tracking_enabled ? 'Activé' : 'Désactivé' }}
                    </span>
                  </button>
                </div>
              </div>
              <div class="gps-status-row">
                <mat-icon [style.color]="user?.gps_tracking_enabled ? '#00b894' : '#9ca3af'">
                  {{ user?.gps_tracking_enabled ? 'gps_fixed' : 'gps_off' }}
                </mat-icon>
                <span [style.color]="user?.gps_tracking_enabled ? '#00b894' : '#9ca3af'" style="font-size:13px; font-weight:600;">
                  GPS {{ user?.gps_tracking_enabled ? 'actif' : 'inactif' }}
                </span>
              </div>
            </div>
          </div>
        </mat-tab>

        <!-- ── Onglet 3 : Activité ── -->
        <mat-tab label="Activité">
          <div class="tab-content">
            <div class="activity-stats">
              <div class="act-card">
                <mat-icon style="color:#6C5CE7">assignment</mat-icon>
                <span class="act-value">{{ stats.total_missions }}</span>
                <span class="act-label">Missions créées</span>
              </div>
              <div class="act-card">
                <mat-icon style="color:#00b894">check_circle</mat-icon>
                <span class="act-value">{{ stats.completed_missions }}</span>
                <span class="act-label">Missions terminées</span>
              </div>
              <div class="act-card">
                <mat-icon style="color:#fdcb6e">pending</mat-icon>
                <span class="act-value">{{ stats.active_missions }}</span>
                <span class="act-label">En cours</span>
              </div>
              <div class="act-card">
                <mat-icon style="color:#e17055">gavel</mat-icon>
                <span class="act-value">{{ stats.disputes }}</span>
                <span class="act-label">Litiges</span>
              </div>
            </div>

            <mat-divider class="section-divider"></mat-divider>

            <h3 class="section-title"><mat-icon>history</mat-icon> Informations du compte</h3>
            <div class="account-info-grid">
              <div class="info-row">
                <span class="info-key">Membre depuis</span>
                <span class="info-val">{{ user?.created_at | date:'dd MMM yyyy' }}</span>
              </div>
              <div class="info-row">
                <span class="info-key">Email vérifié</span>
                <span class="info-val">
                  <mat-icon [style.color]="user?.email_verified ? '#00b894' : '#e17055'">
                    {{ user?.email_verified ? 'check_circle' : 'cancel' }}
                  </mat-icon>
                </span>
              </div>
              <div class="info-row">
                <span class="info-key">Téléphone vérifié</span>
                <span class="info-val">
                  <mat-icon [style.color]="user?.phone_verified ? '#00b894' : '#e17055'">
                    {{ user?.phone_verified ? 'check_circle' : 'cancel' }}
                  </mat-icon>
                </span>
              </div>
              <div class="info-row">
                <span class="info-key">NINA / ID nationale</span>
                <span class="info-val">{{ user?.nina || 'Non renseigné' }}</span>
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
    .avatar-section { flex-shrink: 0; }
    .avatar-wrap { position: relative; width: 88px; height: 88px; }
    .avatar-img { width: 88px; height: 88px; border-radius: 50%; object-fit: cover; border: 3px solid #00b894; }
    .avatar-initials { width: 88px; height: 88px; border-radius: 50%; background: linear-gradient(135deg, #00b894, #6C5CE7); display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 700; color: #fff; border: 3px solid rgba(255,255,255,0.3); }
    .avatar-edit-btn { position: absolute; bottom: -4px; right: -4px; width: 28px; height: 28px; background: #00b894 !important; mat-icon { font-size: 14px; width: 14px; height: 14px; } }

    .header-info { flex: 1; h1 { margin: 0 0 6px; font-size: 22px; font-weight: 700; } }
    .user-type-badge { background: rgba(0,184,148,0.2); border: 1px solid #00b894; color: #00b894; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; letter-spacing: 1px; }
    .header-meta { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 10px; font-size: 13px; opacity: 0.8; span { display: flex; align-items: center; gap: 4px; mat-icon { font-size: 14px; width: 14px; height: 14px; } } }

    .header-stats { display: flex; flex-direction: column; gap: 8px; }
    .stat-pill { display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.1); border-radius: 20px; padding: 6px 12px; font-size: 13px; mat-icon { font-size: 16px; width: 16px; height: 16px; } }
    .kyc-verified { color: #00b894; } .kyc-pending { color: #fdcb6e; } .kyc-rejected { color: #e17055; } .kyc-not_started, .kyc-not_required { color: rgba(255,255,255,0.6); }
    .wallet-addr { font-family: monospace; } .no-wallet { opacity: 0.5; }

    .profile-tabs { background: #fff; border-radius: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); overflow: hidden; }
    :host ::ng-deep .profile-tabs .mat-mdc-tab-header { background: #fff; border-bottom: 2px solid #e5e7eb; }
    :host ::ng-deep .profile-tabs .mat-mdc-tab .mdc-tab__text-label { color: #6b7280 !important; font-weight: 600; font-size: 14px; }
    :host ::ng-deep .profile-tabs .mat-mdc-tab.mdc-tab--active .mdc-tab__text-label { color: #6C5CE7 !important; }
    :host ::ng-deep .profile-tabs .mat-mdc-tab-indicator .mdc-tab-indicator__content--underline { border-color: #6C5CE7 !important; border-top-width: 3px !important; }
    :host ::ng-deep .profile-tabs .mat-mdc-tab:hover .mdc-tab__text-label { color: #6C5CE7 !important; }
    .tab-content { padding: 24px; position: relative; }

    :host ::ng-deep .cdk-overlay-container { position: fixed; z-index: 10000; pointer-events: none; }
    :host ::ng-deep .cdk-overlay-connected-position-bounding-box { position: absolute; z-index: 10000; }
    :host ::ng-deep .cdk-global-overlay-wrapper { z-index: 10000; }
    :host ::ng-deep .cdk-overlay-pane { position: absolute; pointer-events: auto; }

    :host ::ng-deep .mat-mdc-select-panel-above .mat-mdc-select-panel { transform-origin: center bottom; }
    :host ::ng-deep .mat-mdc-select-panel-below .mat-mdc-select-panel { transform-origin: center top; }

    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    .pwd-fields { display: flex; flex-direction: column; gap: 16px; max-width: 480px; margin-bottom: 16px; }
    .full-width { width: 100%; }
    .form-actions { display: flex; justify-content: flex-end; margin-top: 12px; }

    .field-wrap { display: flex; flex-direction: column; gap: 6px; }
    .field-label { font-size: 13px; font-weight: 600; color: #374151; }
    .req { color: #e17055; }
    .field-input {
      width: 100%; box-sizing: border-box;
      padding: 10px 14px; border: 1.5px solid #d1d5db; border-radius: 8px;
      font-size: 14px; color: #1a1a2e; background: #fff;
      outline: none; transition: border-color 0.2s, box-shadow 0.2s;
      font-family: inherit;
    }
    .field-input:focus { border-color: #6C5CE7; box-shadow: 0 0 0 3px rgba(108,92,231,0.1); }
    .field-wrap.field-missing .field-label { color: #dc2626; }
    .field-wrap.field-missing .field-input,
    .field-wrap.field-missing .native-select { border-color: #dc2626; box-shadow: 0 0 0 3px rgba(220,38,38,0.12); }
    .field-wrap.field-missing::after { content: 'À compléter'; display: block; font-size: 11px; color: #dc2626; margin-top: 4px; font-weight: 600; }
    .field-input::placeholder { color: #9ca3af; font-weight: 400; }
    .field-textarea { resize: vertical; min-height: 90px; }
    .field-input-icon { position: relative; display: flex; align-items: center; }
    .field-input-icon .field-input { padding-right: 42px; }
    .field-icon { position: absolute; right: 12px; font-size: 18px; width: 18px; height: 18px; color: #9ca3af; pointer-events: none; }
    .pwd-eye-btn { position: absolute; right: 10px; background: none; border: none; cursor: pointer; padding: 4px; color: #9ca3af; display: flex; align-items: center; &:hover { color: #6C5CE7; } mat-icon { font-size: 20px; width: 20px; height: 20px; } }
    .field-error { font-size: 12px; color: #e17055; margin-top: 2px; }

    .native-select-wrap { position: relative; display: flex; align-items: center; }
    .native-select {
      width: 100%; height: 44px; box-sizing: border-box;
      padding: 10px 42px 10px 14px;
      border: 1.5px solid #d1d5db; border-radius: 8px;
      font-size: 14px; color: #1a1a2e; background: #fff;
      outline: none; cursor: pointer;
      appearance: none; -webkit-appearance: none; -moz-appearance: none;
      font-family: inherit;
    }
    .native-select:focus { border-color: #6C5CE7; box-shadow: 0 0 0 3px rgba(108,92,231,0.1); }
    .native-select:disabled { background: #f3f4f6; color: #9ca3af; cursor: not-allowed; }
    .native-select option { padding: 8px; font-size: 14px; }
    .select-arrow { position: absolute; right: 12px; pointer-events: none; color: #6b7280; font-size: 20px; width: 20px; height: 20px; }

    .section-title { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600; color: #1a1a2e; margin: 0 0 16px; mat-icon { color: #6C5CE7; } }
    .section-divider { margin: 24px 0; }

    .wallet-section { background: #f8fafc; border-radius: 12px; padding: 16px; }
    .wallet-connected { display: flex; align-items: center; gap: 12px; .connected-icon { color: #00b894; font-size: 32px; width: 32px; height: 32px; } .wallet-label { margin: 0 0 4px; font-weight: 600; } .wallet-full { font-size: 12px; color: #6b7280; word-break: break-all; } }
    .wallet-disconnected { display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; color: #6b7280; mat-icon { font-size: 40px; width: 40px; height: 40px; color: #d1d5db; } }

    .kyc-section { background: #f8fafc; border-radius: 12px; padding: 16px; }
    .kyc-status-row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
    .kyc-badge { display: flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 20px; font-weight: 600; font-size: 13px; }
    .kyc-badge-verified { background: #d1fae5; color: #065f46; } .kyc-badge-pending { background: #fef3c7; color: #92400e; } .kyc-badge-rejected { background: #fee2e2; color: #991b1b; } .kyc-badge-not_started, .kyc-badge-not_required, .kyc-badge-undefined { background: #f3f4f6; color: #6b7280; }
    .kyc-desc { font-size: 13px; color: #6b7280; margin: 0; }

    .activity-stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; }
    .act-card { background: #f8fafc; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; align-items: center; gap: 4px; mat-icon { font-size: 28px; width: 28px; height: 28px; } }
    .act-value { font-size: 24px; font-weight: 700; color: #1a1a2e; }
    .act-label { font-size: 12px; color: #6b7280; text-align: center; }

    .account-info-grid { display: flex; flex-direction: column; gap: 0; }
    .info-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
    .info-key { font-size: 14px; color: #6b7280; }
    .info-val { font-size: 14px; font-weight: 600; color: #1a1a2e; display: flex; align-items: center; gap: 4px; mat-icon { font-size: 18px; width: 18px; height: 18px; } }

    .provider-activation-section { background: #f8fafc; border-radius: 12px; padding: 16px; }
    .provider-active-box { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; .provider-active-icon { color: #00b894; font-size: 32px; width: 32px; height: 32px; } .provider-active-label { margin: 0 0 4px; font-weight: 600; color: #1a1a2e; } .provider-active-desc { margin: 0; font-size: 13px; color: #6b7280; } }
    .provider-inactive-box { display: flex; align-items: flex-start; gap: 16px; flex-wrap: wrap; > mat-icon { font-size: 36px; width: 36px; height: 36px; color: #6C5CE7; flex-shrink: 0; margin-top: 4px; } .provider-inactive-title { margin: 0 0 4px; font-weight: 700; color: #1a1a2e; font-size: 15px; } .provider-inactive-desc { margin: 0 0 8px; font-size: 13px; color: #6b7280; } }
    .provider-benefits { list-style: none; padding: 0; margin: 0 0 12px; li { display: flex; align-items: center; gap: 4px; font-size: 13px; color: #374151; mat-icon { font-size: 14px; width: 14px; height: 14px; color: #00b894; } } }

    .gps-section { background: #f8fafc; border-radius: 12px; padding: 16px; }
    .gps-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
    .gps-info { flex: 1; .gps-title { margin: 0 0 4px; font-weight: 600; color: #1a1a2e; font-size: 14px; } .gps-desc { margin: 0; font-size: 13px; color: #6b7280; line-height: 1.5; } }
    .gps-toggle-wrap { flex-shrink: 0; }
    .gps-toggle-btn { display: flex; align-items: center; gap: 10px; background: none; border: none; cursor: pointer; padding: 4px; border-radius: 8px; transition: opacity 0.2s; &:disabled { opacity: 0.5; cursor: not-allowed; } }
    .gps-toggle-track { position: relative; width: 48px; height: 26px; background: #d1d5db; border-radius: 13px; transition: background 0.25s; display: block; }
    .gps-toggle-thumb { position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; background: #fff; border-radius: 50%; box-shadow: 0 1px 4px rgba(0,0,0,0.2); transition: transform 0.25s; display: block; }
    .gps-toggle-btn.active .gps-toggle-track { background: #00b894; }
    .gps-toggle-btn.active .gps-toggle-thumb { transform: translateX(22px); }
    .gps-toggle-label { font-size: 13px; font-weight: 600; color: #374151; min-width: 56px; }
    .gps-status-row { display: flex; align-items: center; gap: 6px; margin-top: 10px; }

    @media (max-width: 600px) {
      .form-grid { grid-template-columns: 1fr; }
      .activity-stats { grid-template-columns: repeat(2,1fr); }
      .profile-header { flex-direction: column; text-align: center; }
    }
  `]
})
export class ClientProfileComponent implements OnInit {
  private apiUrl = environment.apiUrl;

  user: any = null;
  stats = { total_missions: 0, completed_missions: 0, active_missions: 0, disputes: 0 };
  savingInfo = false;
  savingPwd = false;
  activatingProvider = false;
  savingGPS = false;
  showPwd = [false, false, false];
  showOnboarding = false;
  missingFields: string[] = [];
  activeTabIndex = 0;
  private readonly kycFields = ['nina', 'id_card_front', 'id_card_back', 'selfie_verification', 'phone_verified'];

  // Mali uniquement (phase 1)
  africanCountries = [MALI_COUNTRY];

  availableCities: string[] = [];

  infoForm!: FormGroup;
  pwdForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private snack: MatSnackBar,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.infoForm = this.fb.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      phone_number: [''],
      city: [''],
      country: ['ML'],
      address: [''],
      bio: [''],
    });

    this.pwdForm = this.fb.group({
      old_password: ['', Validators.required],
      new_password: ['', [Validators.required, Validators.minLength(8)]],
      new_password_confirm: ['', Validators.required],
    }, { validators: this.passwordMatch });

    this.loadProfile();
    this.loadStats();

    this.route.queryParams.subscribe((params) => {
      if (params['complete'] === '1' || params['kyc']) {
        this.activeTabIndex = 1;
      }
    });
  }

  get initials(): string {
    if (!this.user) return '?';
    return ((this.user.first_name?.[0] || '') + (this.user.last_name?.[0] || '')).toUpperCase() || this.user.email?.[0]?.toUpperCase() || '?';
  }

  private h(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });
  }

  loadProfile(): void {
    this.http.get<any>(`${this.apiUrl}/users/me/`, { headers: this.h() }).subscribe({
      next: (u) => {
        this.user = u;
        this.missingFields = u.profile_missing_fields || [];
        this.updateOnboardingState(u);
        // Trouver le code pays à partir du nom ou utiliser le code stocké
        const countryCode = this.findCountryCode(u.country) || u.country || '';
        // Mettre à jour les villes disponibles pour ce pays
        this.updateAvailableCities(countryCode);
        this.infoForm.patchValue({
          first_name: u.first_name || '',
          last_name: u.last_name || '',
          phone_number: u.phone_number || '',
          city: u.city || '',
          country: countryCode,
          address: u.address || '',
          bio: u.bio || '',
        });
      },
      error: () => this.snack.open('Erreur chargement profil', 'Fermer', { duration: 3000 })
    });
  }

  findCountryCode(countryNameOrCode: string): string | null {
    if (!countryNameOrCode) return null;
    // Si c'est déjà un code
    const byCode = this.africanCountries.find(c => c.code === countryNameOrCode);
    if (byCode) return byCode.code;
    // Chercher par nom
    const byName = this.africanCountries.find(c => 
      c.name.toLowerCase() === countryNameOrCode.toLowerCase()
    );
    return byName ? byName.code : null;
  }

  updateAvailableCities(countryCode: string): void {
    const country = this.africanCountries.find(c => c.code === countryCode);
    this.availableCities = country ? country.cities : [];
  }

  onCountryChange(): void {
    const countryCode = this.infoForm.get('country')?.value;
    this.updateAvailableCities(countryCode);
    // Réinitialiser la ville quand on change de pays
    this.infoForm.patchValue({ city: '' });
  }

  loadStats(): void {
    this.http.get<any>(`${this.apiUrl}/missions/`, { headers: this.h() }).subscribe({
      next: (r) => {
        const missions = Array.isArray(r) ? r : (r?.results ?? []);
        this.stats.total_missions = missions.length;
        this.stats.completed_missions = missions.filter((m: any) => m.status === 'completed').length;
        this.stats.active_missions = missions.filter((m: any) => ['in_progress', 'accepted'].includes(m.status)).length;
        this.stats.disputes = missions.filter((m: any) => m.status === 'disputed').length;
      }
    });
  }

  saveInfo(): void {
    if (this.infoForm.invalid) return;
    this.savingInfo = true;
    const payload: any = {};
    const v = this.infoForm.value;
    if (v.first_name !== undefined) payload.first_name = v.first_name;
    if (v.last_name !== undefined) payload.last_name = v.last_name;
    if (v.phone_number !== undefined) payload.phone_number = v.phone_number || null;
    if (v.city !== undefined) payload.city = v.city;
    // Convertir le code pays en nom de pays pour le backend
    if (v.country !== undefined) {
      const country = this.africanCountries.find(c => c.code === v.country);
      payload.country = country ? country.name : v.country;
    }
    if (v.address !== undefined) payload.address = v.address;
    if (v.bio !== undefined) payload.bio = v.bio;
    this.http.patch<any>(`${this.apiUrl}/users/me/`, payload, { headers: this.h() }).subscribe({
      next: (u) => {
        this.user = { ...this.user, ...u };
        this.savingInfo = false;
        this.snack.open('Profil mis à jour ✓', 'Fermer', { duration: 3000, panelClass: ['snack-success'] });
        this.afterProfileSave();
      },
      error: () => { this.savingInfo = false; this.snack.open('Erreur lors de la mise à jour', 'Fermer', { duration: 3000 }); }
    });
  }

  private updateOnboardingState(u: any): void {
    this.showOnboarding = u.can_access_platform === false;
    if (this.showOnboarding && this.missingFields.some((f) => this.kycFields.includes(f))) {
      this.activeTabIndex = 1;
    }
  }

  onKycUpdated(): void {
    this.afterProfileSave();
  }

  isMissing(field: string): boolean {
    return this.showOnboarding && this.missingFields.includes(field);
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

  changePassword(): void {
    if (this.pwdForm.invalid) return;
    this.savingPwd = true;
    this.http.post(`${this.apiUrl}/users/change-password/`, this.pwdForm.value, { headers: this.h() }).subscribe({
      next: () => {
        this.savingPwd = false;
        this.pwdForm.reset();
        this.snack.open('Mot de passe modifié ✓', 'Fermer', { duration: 3000, panelClass: ['snack-success'] });
      },
      error: (e) => {
        this.savingPwd = false;
        const msg = e.error?.old_password?.[0] || e.error?.detail || 'Erreur changement mot de passe';
        this.snack.open(msg, 'Fermer', { duration: 4000 });
      }
    });
  }

  onAvatarChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('profile_picture', file);
    this.http.patch<any>(`${this.apiUrl}/users/me/`, fd, { headers: new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('access_token')}` }) }).subscribe({
      next: (u) => { this.user = { ...this.user, profile_picture: u.profile_picture }; this.snack.open('Photo mise à jour ✓', 'Fermer', { duration: 2000 }); },
      error: () => this.snack.open('Erreur upload photo', 'Fermer', { duration: 3000 })
    });
  }

  connectWallet(): void {
    if (!(window as any).ethereum) {
      this.snack.open('MetaMask non détecté. Installez l\'extension MetaMask.', 'Fermer', { duration: 5000 });
      return;
    }
    (window as any).ethereum.request({ method: 'eth_requestAccounts' }).then((accounts: string[]) => {
      const wallet_address = accounts[0];
      this.http.post(`${this.apiUrl}/users/connect-wallet/`, { wallet_address, signature: 'pending', message: 'BlockTask' }, { headers: this.h() }).subscribe({
        next: () => { this.user = { ...this.user, wallet_address }; this.snack.open('Wallet connecté ✓', 'Fermer', { duration: 3000 }); },
        error: () => { this.user = { ...this.user, wallet_address }; this.snack.open('Wallet connecté ✓', 'Fermer', { duration: 3000 }); }
      });
    }).catch(() => this.snack.open('Connexion MetaMask annulée', 'Fermer', { duration: 3000 }));
  }

  disconnectWallet(): void {
    this.http.patch(`${this.apiUrl}/users/me/`, { wallet_address: null }, { headers: this.h() }).subscribe({
      next: () => { this.user = { ...this.user, wallet_address: null }; this.snack.open('Wallet déconnecté', 'Fermer', { duration: 2000 }); }
    });
  }

  activateProviderRole(): void {
    this.activatingProvider = true;
    this.authService.activateProviderRole().subscribe({
      next: (res) => {
        this.user = { ...this.user, secondary_role: 'provider' };
        this.activatingProvider = false;
        this.snack.open('Espace prestataire activé ! Vous pouvez maintenant switcher d\'espace.', 'Fermer', { duration: 4000, panelClass: ['snack-success'] });
      },
      error: (e) => {
        this.activatingProvider = false;
        this.snack.open(e.error?.error || 'Erreur activation', 'Fermer', { duration: 3000 });
      }
    });
  }

  goToProviderSpace(): void {
    this.authService.switchRole('provider').subscribe({
      error: () => this.router.navigate(['/provider'])
    });
  }

  toggleGPS(): void {
    this.savingGPS = true;
    this.http.post<any>(`${this.apiUrl}/users/toggle-gps/`, {}, { headers: this.h() }).subscribe({
      next: (res) => {
        this.user = { ...this.user, gps_tracking_enabled: res.gps_tracking_enabled };
        this.savingGPS = false;
        this.snack.open(res.message, 'Fermer', { duration: 3000 });
      },
      error: () => { this.savingGPS = false; this.snack.open('Erreur mise à jour GPS', 'Fermer', { duration: 3000 }); }
    });
  }

  kycLabel(status?: string): string {
    const map: any = { verified: 'Vérifié', pending: 'En attente', rejected: 'Rejeté', not_started: 'Non démarré', not_required: 'Non requis' };
    return map[status || ''] || 'Non vérifié';
  }

  kycIcon(status?: string): string {
    const map: any = { verified: 'verified', pending: 'hourglass_empty', rejected: 'cancel', not_started: 'badge', not_required: 'info' };
    return map[status || ''] || 'badge';
  }

  kycDesc(status?: string): string {
    const map: any = {
      verified: 'Votre identité a été vérifiée avec succès.',
      pending: 'Votre dossier KYC est en cours d\'examen.',
      rejected: 'Votre KYC a été rejeté. Veuillez resoumettre vos documents.',
      not_started: 'Complétez votre vérification KYC pour accéder à toutes les fonctionnalités.',
      not_required: 'La vérification KYC n\'est pas requise pour votre compte.'
    };
    return map[status || ''] || '';
  }

  private passwordMatch(g: FormGroup) {
    return g.get('new_password')?.value === g.get('new_password_confirm')?.value ? null : { mismatch: true };
  }
}
