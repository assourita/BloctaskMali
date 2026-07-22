import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { EnterpriseService, EnterpriseProfile } from '../../../core/services/enterprise.service';
import { ProfileOnboardingBarComponent } from '../../../shared/components/profile-onboarding-bar/profile-onboarding-bar.component';
import { KycVerificationComponent } from '../../../shared/components/kyc-verification/kyc-verification.component';
import { TwoFactorSettingsComponent } from '../../../shared/components/two-factor-settings/two-factor-settings.component';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-enterprise-profile',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatTabsModule, MatButtonModule, MatIconModule, MatSnackBarModule, MatDividerModule,
    ProfileOnboardingBarComponent, KycVerificationComponent, TwoFactorSettingsComponent,
  ],
  template: `
    <div class="profile-container" *ngIf="user" [class.has-onboarding-bar]="showOnboarding">

      <div class="profile-header">
        <div class="avatar-initials">{{ initials }}</div>
        <div class="header-info">
          <h1>{{ enterpriseProfile?.company_name || user.first_name }}</h1>
          <span class="user-type-badge">ENTREPRISE</span>
          <div class="header-meta">
            <span><mat-icon>email</mat-icon> {{ enterpriseProfile?.company_email || user.email }}</span>
            <span><mat-icon>phone</mat-icon> {{ enterpriseProfile?.company_phone || user.phone_number || 'Non renseigné' }}</span>
            <span><mat-icon>location_on</mat-icon> {{ enterpriseProfile?.city || 'Ville' }}, {{ user.country || 'Mali' }}</span>
          </div>
        </div>
        <div class="verified-badge" *ngIf="enterpriseProfile?.is_verified">
          <mat-icon>verified</mat-icon> Entreprise vérifiée
        </div>
      </div>

      <mat-tab-group class="profile-tabs" animationDuration="200ms" [(selectedIndex)]="activeTabIndex">
        <mat-tab label="Informations entreprise">
          <div class="tab-content">
            <form [formGroup]="companyForm" (ngSubmit)="saveCompany()">
              <div class="form-grid">
                <div class="field-wrap full-row" [class.field-missing]="isMissing('company_name')" data-profile-field="company_name">
                  <label class="field-label">Nom de l'entreprise <span class="req">*</span></label>
                  <input class="field-input" formControlName="company_name" placeholder="Ex. Bamako Logistics SARL"/>
                </div>
                <div class="field-wrap">
                  <label class="field-label">RCCM</label>
                  <input class="field-input" formControlName="rccm" placeholder="Numéro RCCM"/>
                </div>
                <div class="field-wrap">
                  <label class="field-label">IFU</label>
                  <input class="field-input" formControlName="ifu" placeholder="Identifiant fiscal"/>
                </div>
                <div class="field-wrap" [class.field-missing]="isMissing('company_phone')" data-profile-field="company_phone">
                  <label class="field-label">Téléphone entreprise <span class="req" *ngIf="isMissing('company_phone')">*</span></label>
                  <input class="field-input" formControlName="company_phone" placeholder="+223..."/>
                </div>
                <div class="field-wrap">
                  <label class="field-label">Email entreprise</label>
                  <input class="field-input" type="email" formControlName="company_email" placeholder="contact@entreprise.ml"/>
                </div>
                <div class="field-wrap">
                  <label class="field-label">Site web</label>
                  <input class="field-input" formControlName="website" placeholder="https://..."/>
                </div>
                <div class="field-wrap" [class.field-missing]="isMissing('city')" data-profile-field="city">
                  <label class="field-label">Ville <span class="req">*</span></label>
                  <input class="field-input" formControlName="city" placeholder="Bamako"/>
                </div>
                <div class="field-wrap full-row" [class.field-missing]="isMissing('address')" data-profile-field="address">
                  <label class="field-label">Adresse siège <span class="req">*</span></label>
                  <input class="field-input" formControlName="address" placeholder="Adresse complète"/>
                </div>
              </div>
              <div class="form-actions">
                <button mat-raised-button color="primary" type="submit" [disabled]="savingCompany || companyForm.invalid">
                  <mat-icon>save</mat-icon> {{ savingCompany ? 'Enregistrement...' : 'Enregistrer' }}
                </button>
              </div>
            </form>
          </div>
        </mat-tab>

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

        <mat-tab label="Compte administrateur">
          <div class="tab-content">
            <form [formGroup]="accountForm" (ngSubmit)="saveAccount()">
              <div class="form-grid">
                <div class="field-wrap">
                  <label class="field-label">Prénom</label>
                  <input class="field-input" formControlName="first_name"/>
                </div>
                <div class="field-wrap">
                  <label class="field-label">Nom</label>
                  <input class="field-input" formControlName="last_name"/>
                </div>
                <div class="field-wrap">
                  <label class="field-label">Téléphone personnel</label>
                  <input class="field-input" formControlName="phone_number" placeholder="+223..."/>
                </div>
              </div>
              <div class="form-actions">
                <button mat-raised-button color="primary" type="submit" [disabled]="savingAccount">
                  <mat-icon>save</mat-icon> {{ savingAccount ? 'Enregistrement...' : 'Enregistrer' }}
                </button>
              </div>
            </form>
          </div>
        </mat-tab>

        <mat-tab label="Sécurité">
          <div class="tab-content">
            <h3 class="section-title"><mat-icon>lock</mat-icon> Changer le mot de passe</h3>
            <form [formGroup]="pwdForm" (ngSubmit)="changePassword()">
              <div class="form-grid">
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
            <app-two-factor-settings></app-two-factor-settings>
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
    @media (max-width: 600px) {
      .profile-container.has-onboarding-bar { padding-bottom: 160px; }
    }
    .profile-header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%);
      color: #fff; border-radius: 16px; padding: 28px 32px;
      display: flex; align-items: center; gap: 24px; flex-wrap: wrap;
    }
    .avatar-initials {
      width: 72px; height: 72px; border-radius: 16px;
      background: linear-gradient(135deg, #f59e0b, #d97706);
      display: flex; align-items: center; justify-content: center;
      font-size: 24px; font-weight: 700;
    }
    .header-info { flex: 1; h1 { margin: 0 0 6px; font-size: 22px; } }
    .user-type-badge {
      background: rgba(245,158,11,0.2); border: 1px solid #f59e0b; color: #fbbf24;
      padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 700;
    }
    .header-meta {
      display: flex; flex-wrap: wrap; gap: 12px; margin-top: 10px; font-size: 13px; opacity: 0.85;
      span { display: flex; align-items: center; gap: 4px; mat-icon { font-size: 14px; width: 14px; height: 14px; } }
    }
    .verified-badge {
      display: flex; align-items: center; gap: 6px; background: rgba(16,185,129,0.2);
      border: 1px solid #10b981; color: #6ee7b7; padding: 8px 14px; border-radius: 12px; font-size: 13px;
    }
    .profile-tabs { background: #fff; border-radius: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); overflow: hidden; }
    :host ::ng-deep .profile-tabs .mat-mdc-tab.mdc-tab--active .mdc-tab__text-label { color: #d97706 !important; }
    :host ::ng-deep .profile-tabs .mat-mdc-tab-indicator .mdc-tab-indicator__content--underline { border-color: #d97706 !important; }
    .tab-content { padding: 24px; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    .full-row { grid-column: 1 / -1; }
    .field-wrap { display: flex; flex-direction: column; gap: 6px; }
    .field-label { font-size: 13px; font-weight: 600; color: #374151; }
    .req { color: #e17055; }
    .field-input {
      width: 100%; box-sizing: border-box; padding: 10px 14px;
      border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 14px; outline: none; font-family: inherit;
    }
    .field-input:focus { border-color: #d97706; box-shadow: 0 0 0 3px rgba(217,119,6,0.1); }
    .field-wrap.field-missing .field-label { color: #dc2626; }
    .field-wrap.field-missing .field-input { border-color: #dc2626; box-shadow: 0 0 0 3px rgba(220,38,38,0.12); }
    .field-wrap.field-missing::after { content: 'À compléter'; display: block; font-size: 11px; color: #dc2626; margin-top: 4px; font-weight: 600; }
    .form-actions { display: flex; justify-content: flex-end; margin-top: 12px; }
    .section-title { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 700; margin: 0 0 16px; color: #1f2937; }
    .section-divider { margin: 24px 0; }
    @media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } }
  `],
})
export class EnterpriseProfileComponent implements OnInit {
  private apiUrl = environment.apiUrl;

  user: any = null;
  enterpriseProfile: EnterpriseProfile | null = null;
  companyForm!: FormGroup;
  accountForm!: FormGroup;
  pwdForm!: FormGroup;
  savingCompany = false;
  savingAccount = false;
  savingPwd = false;
  showOnboarding = false;
  missingFields: string[] = [];
  activeTabIndex = 0;
  private readonly kycFields = ['nina', 'id_card_front', 'id_card_back', 'selfie_verification', 'phone_verified'];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private snack: MatSnackBar,
    private authService: AuthService,
    private enterpriseService: EnterpriseService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.companyForm = this.fb.group({
      company_name: ['', Validators.required],
      rccm: [''],
      ifu: [''],
      company_phone: [''],
      company_email: [''],
      website: [''],
      city: ['', Validators.required],
      address: ['', Validators.required],
    });

    this.accountForm = this.fb.group({
      first_name: [''],
      last_name: [''],
      phone_number: [''],
    });

    this.pwdForm = this.fb.group({
      old_password: ['', Validators.required],
      new_password: ['', [Validators.required, Validators.minLength(8)]],
      new_password_confirm: ['', Validators.required],
    }, { validators: this.passwordMatchValidator });

    this.loadProfile();

    this.route.queryParams.subscribe((params) => {
      if (params['complete'] === '1' || params['kyc']) {
        this.activeTabIndex = 1;
      }
    });
  }

  get initials(): string {
    const name = this.enterpriseProfile?.company_name || this.user?.first_name || '?';
    return name.slice(0, 2).toUpperCase();
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
        this.accountForm.patchValue({
          first_name: u.first_name || '',
          last_name: u.last_name || '',
          phone_number: u.phone_number || '',
        });
      },
    });

    this.enterpriseService.getProfile().subscribe({
      next: (p) => {
        this.enterpriseProfile = p;
        this.companyForm.patchValue({
          company_name: p.company_name || '',
          rccm: p.rccm || '',
          ifu: p.ifu || '',
          company_phone: p.company_phone || '',
          company_email: p.company_email || '',
          website: p.website || '',
          city: p.city || '',
          address: p.address || '',
        });
      },
      error: () => this.snack.open('Erreur chargement profil entreprise', 'Fermer', { duration: 3000 }),
    });
  }

  saveCompany(): void {
    if (this.companyForm.invalid) {
      this.companyForm.markAllAsTouched();
      this.snack.open('Veuillez remplir le nom de l\'entreprise, la ville et l\'adresse', 'Fermer', { duration: 4000 });
      document.querySelector('[data-profile-field="company_name"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    this.savingCompany = true;
    const payload = { ...this.companyForm.value };
    if (!payload.website) delete payload.website;
    if (!payload.company_email) delete payload.company_email;
    this.enterpriseService.updateProfile(payload).subscribe({
      next: (p) => {
        this.enterpriseProfile = p;
        this.savingCompany = false;
        this.snack.open('Profil entreprise mis à jour', 'Fermer', { duration: 3000 });
        this.afterProfileSave();
      },
      error: (err) => {
        this.savingCompany = false;
        const msg = err.error?.company_name?.[0]
          || err.error?.detail
          || 'Erreur enregistrement — vérifiez les champs';
        this.snack.open(msg, 'Fermer', { duration: 5000 });
      },
    });
  }

  saveAccount(): void {
    this.savingAccount = true;
    this.http.patch<any>(`${this.apiUrl}/users/me/`, this.accountForm.value, { headers: this.h() }).subscribe({
      next: (u) => {
        this.user = { ...this.user, ...u };
        this.savingAccount = false;
        this.snack.open('Compte mis à jour', 'Fermer', { duration: 3000 });
        this.afterProfileSave();
      },
      error: () => {
        this.savingAccount = false;
        this.snack.open('Erreur enregistrement', 'Fermer', { duration: 3000 });
      },
    });
  }

  private passwordMatchValidator(group: FormGroup) {
    const pwd = group.get('new_password')?.value;
    const confirm = group.get('new_password_confirm')?.value;
    return pwd && confirm && pwd !== confirm ? { mismatch: true } : null;
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
      error: (err) => {
        this.savingPwd = false;
        const msg = err.error?.old_password?.[0] || err.error?.detail || 'Erreur lors du changement';
        this.snack.open(msg, 'Fermer', { duration: 4000 });
      },
    });
  }

  private updateOnboardingState(u: any): void {
    this.showOnboarding = u.can_access_platform === false;
    if (this.showOnboarding && this.missingFields.some((f) => this.kycFields.includes(f))) {
      this.activeTabIndex = 1;
    } else if (this.showOnboarding && this.missingFields.includes('company_name')) {
      setTimeout(() => {
        document.querySelector('[data-profile-field="company_name"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
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
}
