import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { KycService } from '../../../core/services/kyc.service';
import { DEFAULT_PHONE_PREFIX } from '../../../core/constants/africa.constants';

@Component({
  selector: 'app-kyc-verification',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="kyc-form" data-profile-field="nina">
      <p class="kyc-intro">
        La vérification d'identité est <strong>obligatoire</strong> pour débloquer le dashboard.
        Votre NINA, votre téléphone et vos documents seront vérifiés.
      </p>

      <div class="kyc-status-banner" [class]="'status-' + (user?.kyc_status || 'pending')">
        <mat-icon>{{ statusIcon }}</mat-icon>
        <div>
          <strong>{{ statusLabel }}</strong>
          <p>{{ statusDescription }}</p>
        </div>
      </div>

      <!-- Étape 1 : NINA + téléphone -->
      <section class="kyc-section" [class.field-missing]="isMissing('nina') || isMissing('phone_verified')">
        <h4><mat-icon>badge</mat-icon> NINA et téléphone</h4>
        <form [formGroup]="phoneForm" class="form-grid">
          <div class="field-wrap" data-profile-field="nina">
            <label class="field-label">NINA / ID nationale <span class="req">*</span></label>
            <input class="field-input" formControlName="nina" placeholder="Ex. ML1234567890" [readonly]="user?.phone_verified"/>
            <p class="field-hint">Simulation : les 4 derniers chiffres du NINA doivent correspondre aux 4 derniers du téléphone.</p>
          </div>
          <div class="field-wrap" data-profile-field="phone_verified">
            <label class="field-label">Numéro de téléphone <span class="req">*</span></label>
            <input class="field-input" formControlName="phone_number" [placeholder]="phonePlaceholder" [readonly]="user?.phone_verified"/>
          </div>
        </form>

        <div class="phone-verified-row" *ngIf="user?.phone_verified">
          <mat-icon class="ok-icon">verified</mat-icon>
          <span>Téléphone vérifié et lié au NINA</span>
        </div>

        <div class="otp-block" *ngIf="otpSent && !user?.phone_verified">
          <label class="field-label">Code reçu par SMS</label>
          <div class="otp-row">
            <input class="field-input otp-input" [(ngModel)]="otpCode" [ngModelOptions]="{standalone: true}" maxlength="6" placeholder="000000"/>
            <button mat-raised-button color="primary" type="button" (click)="confirmOtp()" [disabled]="confirmingOtp || otpCode.length < 6">
              Confirmer
            </button>
          </div>
          <p class="sim-otp" *ngIf="simulationOtp">
            <mat-icon>info</mat-icon> Mode simulation — code : <strong>{{ simulationOtp }}</strong>
          </p>
        </div>

        <div class="section-actions" *ngIf="!user?.phone_verified">
          <button mat-raised-button color="accent" type="button" (click)="sendOtp()" [disabled]="sendingOtp || phoneForm.invalid">
            <mat-spinner *ngIf="sendingOtp" diameter="18"></mat-spinner>
            <mat-icon *ngIf="!sendingOtp">sms</mat-icon>
            {{ sendingOtp ? 'Envoi...' : (otpSent ? 'Renvoyer le code' : 'Vérifier le téléphone') }}
          </button>
        </div>
      </section>

      <!-- Étape 2 : Documents -->
      <section class="kyc-section">
        <h4><mat-icon>upload_file</mat-icon> Pièces d'identité</h4>

        <div class="upload-grid">
          <div class="upload-card" [class.field-missing]="isMissing('id_card_front')" data-profile-field="id_card_front">
            <label class="field-label">Recto (obligatoire)</label>
            <div class="preview" *ngIf="idFrontPreview || user?.id_card_front_url">
              <img [src]="idFrontPreview || user?.id_card_front_url" alt="Recto"/>
            </div>
            <button mat-stroked-button type="button" (click)="idFrontInput.click()">
              <mat-icon>photo_camera</mat-icon> {{ user?.has_id_card_front ? 'Remplacer' : 'Choisir' }}
            </button>
            <input #idFrontInput type="file" accept="image/*" hidden (change)="onFile($event, 'front')"/>
          </div>

          <div class="upload-card" [class.field-missing]="isMissing('id_card_back')" data-profile-field="id_card_back">
            <label class="field-label">Verso (obligatoire)</label>
            <div class="preview" *ngIf="idBackPreview || user?.id_card_back_url">
              <img [src]="idBackPreview || user?.id_card_back_url" alt="Verso"/>
            </div>
            <button mat-stroked-button type="button" (click)="idBackInput.click()">
              <mat-icon>photo_camera</mat-icon> {{ user?.has_id_card_back ? 'Remplacer' : 'Choisir' }}
            </button>
            <input #idBackInput type="file" accept="image/*" hidden (change)="onFile($event, 'back')"/>
          </div>

          <div class="upload-card" [class.field-missing]="isMissing('selfie_verification')" data-profile-field="selfie_verification">
            <label class="field-label">Selfie avec pièce (obligatoire)</label>
            <div class="preview" *ngIf="selfiePreview || user?.selfie_verification_url">
              <img [src]="selfiePreview || user?.selfie_verification_url" alt="Selfie"/>
            </div>
            <button mat-stroked-button type="button" (click)="selfieInput.click()">
              <mat-icon>face</mat-icon> {{ user?.has_selfie_verification ? 'Remplacer' : 'Choisir' }}
            </button>
            <input #selfieInput type="file" accept="image/*" hidden (change)="onFile($event, 'selfie')"/>
          </div>
        </div>
      </section>

      <div class="submit-row">
        <button mat-raised-button color="primary" type="button" (click)="submitKyc()" [disabled]="submitting || !canSubmit">
          <mat-spinner *ngIf="submitting" diameter="18"></mat-spinner>
          <mat-icon *ngIf="!submitting">send</mat-icon>
          {{ submitting ? 'Soumission...' : 'Soumettre le dossier KYC' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .kyc-form { display: flex; flex-direction: column; gap: 20px; }
    .kyc-intro { margin: 0; color: #4b5563; font-size: 14px; line-height: 1.5; }
    .kyc-status-banner {
      display: flex; gap: 12px; align-items: flex-start; padding: 14px 16px;
      border-radius: 12px; background: #f8fafc; border: 1px solid #e5e7eb;
    }
    .kyc-status-banner mat-icon { color: #6b7280; }
    .status-pending mat-icon, .status-verified mat-icon { color: #059669; }
    .status-rejected mat-icon { color: #dc2626; }
    .kyc-status-banner p { margin: 4px 0 0; font-size: 13px; color: #6b7280; }
    .kyc-section {
      background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px;
    }
    .kyc-section.field-missing { border-color: #f59e0b; box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.25); }
    .kyc-section h4 {
      display: flex; align-items: center; gap: 8px; margin: 0 0 14px;
      font-size: 15px; color: #111827;
    }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    @media (max-width: 700px) { .form-grid { grid-template-columns: 1fr; } }
    .field-wrap { display: flex; flex-direction: column; gap: 6px; }
    .field-label { font-size: 13px; font-weight: 600; color: #374151; }
    .req { color: #ef4444; }
    .field-input {
      border: 1px solid #d1d5db; border-radius: 8px; padding: 10px 12px; font-size: 14px;
    }
    .field-hint { margin: 0; font-size: 12px; color: #9ca3af; }
    .phone-verified-row {
      display: flex; align-items: center; gap: 8px; margin-top: 12px;
      color: #059669; font-weight: 600; font-size: 14px;
    }
    .ok-icon { color: #059669; }
    .otp-block { margin-top: 14px; }
    .otp-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .otp-input { max-width: 140px; letter-spacing: 4px; text-align: center; }
    .sim-otp {
      display: flex; align-items: center; gap: 6px; margin: 10px 0 0;
      font-size: 13px; color: #92400e; background: #fef3c7; padding: 8px 12px; border-radius: 8px;
    }
    .section-actions, .submit-row { margin-top: 12px; }
    .submit-row {
      position: sticky;
      bottom: 72px;
      z-index: 5;
      padding: 12px 0 8px;
      background: linear-gradient(180deg, rgba(255,255,255,0) 0%, #fff 28%);
    }
    @media (max-width: 600px) {
      .kyc-form { padding-bottom: 96px; }
      .submit-row {
        bottom: 64px;
        margin-left: -4px;
        margin-right: -4px;
        padding: 12px 4px 16px;
      }
      .submit-row button {
        width: 100%;
      }
    }
    .upload-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    @media (max-width: 900px) { .upload-grid { grid-template-columns: 1fr; } }
    .upload-card {
      border: 1px dashed #d1d5db; border-radius: 10px; padding: 12px;
      display: flex; flex-direction: column; gap: 10px; align-items: stretch;
    }
    .upload-card.field-missing { border-color: #f59e0b; background: #fffbeb; }
    .preview img {
      width: 100%; max-height: 120px; object-fit: cover; border-radius: 8px;
      border: 1px solid #e5e7eb;
    }
  `],
})
export class KycVerificationComponent implements OnChanges {
  @Input() user: any;
  @Input() missingFields: string[] = [];
  @Input() showOnboarding = false;
  @Output() kycUpdated = new EventEmitter<void>();

  phoneForm!: FormGroup;
  phonePlaceholder = DEFAULT_PHONE_PREFIX + '70123456';

  sendingOtp = false;
  confirmingOtp = false;
  submitting = false;
  otpSent = false;
  otpCode = '';
  simulationOtp = '';

  idFrontFile: File | null = null;
  idBackFile: File | null = null;
  selfieFile: File | null = null;
  idFrontPreview = '';
  idBackPreview = '';
  selfiePreview = '';

  constructor(
    private fb: FormBuilder,
    private kycService: KycService,
    private snack: MatSnackBar,
  ) {
    this.phoneForm = this.fb.group({
      nina: ['', [Validators.required, Validators.minLength(8)]],
      phone_number: ['', Validators.required],
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['user'] && this.user) {
      this.phoneForm.patchValue({
        nina: this.user.nina || '',
        phone_number: this.user.phone_number || '',
      });
    }
  }

  get statusIcon(): string {
    const s = this.user?.kyc_status;
    if (s === 'verified') return 'verified_user';
    if (s === 'rejected') return 'error';
    if (s === 'pending') return 'hourglass_top';
    return 'info';
  }

  get statusLabel(): string {
    const labels: Record<string, string> = {
      verified: 'Identité vérifiée',
      pending: 'Dossier en attente de validation',
      rejected: 'Dossier rejeté — veuillez resoumettre',
    };
    return labels[this.user?.kyc_status] || 'Vérification requise';
  }

  get statusDescription(): string {
    const s = this.user?.kyc_status;
    if (s === 'verified') return 'Votre identité a été validée par l\'équipe BlockTask. Badge visible sur vos candidatures.';
    if (s === 'pending' && this.documentsComplete) {
      return 'Dossier soumis. L\'accès à la plateforme sera débloqué après validation admin (24-48h).';
    }
    if (s === 'rejected') {
      const reason = (this.user?.kyc_rejection_reason || '').trim();
      if (reason) {
        return `Motif du rejet : ${reason}. Corrigez vos documents puis resoumettez votre dossier.`;
      }
      return this.user?.kyc_block_message
        || 'Dossier rejeté : corrigez vos documents et resoumettez. L\'accès missions reste bloqué.';
    }
    return 'Complétez le NINA, vérifiez votre téléphone et uploadez vos documents.';
  }

  get documentsComplete(): boolean {
    return !!(this.user?.has_id_card_front && this.user?.has_id_card_back && this.user?.has_selfie_verification);
  }

  get canSubmit(): boolean {
    const hasDocs = (this.idFrontFile || this.user?.has_id_card_front)
      && (this.idBackFile || this.user?.has_id_card_back)
      && (this.selfieFile || this.user?.has_selfie_verification);
    return !!this.user?.phone_verified && hasDocs && !!this.phoneForm.value.nina;
  }

  isMissing(field: string): boolean {
    return this.showOnboarding && this.missingFields.includes(field);
  }

  sendOtp(): void {
    if (this.phoneForm.invalid) return;
    this.sendingOtp = true;
    const { nina, phone_number } = this.phoneForm.value;
    this.kycService.requestPhoneVerification(nina, phone_number).subscribe({
      next: (res) => {
        this.sendingOtp = false;
        this.otpSent = true;
        this.simulationOtp = res.simulation_otp || '';
        this.snack.open(res.message, 'Fermer', { duration: 5000 });
      },
      error: (e) => {
        this.sendingOtp = false;
        this.snack.open(e.error?.error || 'Erreur vérification téléphone', 'Fermer', { duration: 5000 });
      },
    });
  }

  confirmOtp(): void {
    if (this.otpCode.length < 6) return;
    this.confirmingOtp = true;
    this.kycService.confirmPhoneOtp(this.otpCode).subscribe({
      next: (res) => {
        this.confirmingOtp = false;
        this.snack.open(res.message, 'Fermer', { duration: 4000 });
        this.kycUpdated.emit();
      },
      error: (e) => {
        this.confirmingOtp = false;
        this.snack.open(e.error?.error || 'Code incorrect', 'Fermer', { duration: 4000 });
      },
    });
  }

  onFile(event: Event, kind: 'front' | 'back' | 'selfie'): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (kind === 'front') { this.idFrontFile = file; this.idFrontPreview = url; }
    if (kind === 'back') { this.idBackFile = file; this.idBackPreview = url; }
    if (kind === 'selfie') { this.selfieFile = file; this.selfiePreview = url; }
  }

  submitKyc(): void {
    if (!this.canSubmit) {
      this.snack.open('Vérifiez d\'abord votre téléphone et ajoutez tous les documents.', 'Fermer', { duration: 4000 });
      return;
    }
    const fd = new FormData();
    fd.append('nina', this.phoneForm.value.nina);
    if (this.idFrontFile) fd.append('id_card_front', this.idFrontFile);
    if (this.idBackFile) fd.append('id_card_back', this.idBackFile);
    if (this.selfieFile) fd.append('selfie_verification', this.selfieFile);

    this.submitting = true;
    this.kycService.submitKyc(fd).subscribe({
      next: () => {
        this.submitting = false;
        this.snack.open('Dossier KYC soumis avec succès', 'Fermer', { duration: 4000 });
        this.kycUpdated.emit();
      },
      error: (e) => {
        this.submitting = false;
        const err = e.error;
        const msg = typeof err === 'string' ? err : (err?.error || err?.nina?.[0] || 'Erreur soumission KYC');
        this.snack.open(msg, 'Fermer', { duration: 5000 });
      },
    });
  }
}
