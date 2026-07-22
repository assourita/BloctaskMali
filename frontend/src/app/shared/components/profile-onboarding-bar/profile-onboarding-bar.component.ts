import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { profileFieldLabel } from '../../../core/constants/profile-fields.constants';

@Component({
  selector: 'app-profile-onboarding-bar',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="onboarding-bar" [class.visible]="visible" role="alert" aria-live="polite">
      <div class="bar-content">
        <mat-icon class="bar-icon">warning_amber</mat-icon>
        <div class="bar-text">
          <strong>{{ barTitle }}</strong>
          <p class="bar-msg-desktop">
            {{ barMessage }}
            <span *ngIf="missingLabels.length && kycAccessStatus === 'incomplete'">
              Manquant : <em>{{ missingLabels.join(', ') }}</em>
            </span>
          </p>
          <p class="bar-msg-mobile" *ngIf="missingLabels.length && kycAccessStatus === 'incomplete'">
            {{ missingLabels.length }} champ(s) manquant(s) — complétez puis soumettez le KYC.
          </p>
          <p class="bar-msg-mobile" *ngIf="!(missingLabels.length && kycAccessStatus === 'incomplete')">
            {{ shortBarMessage }}
          </p>
        </div>
        <button mat-stroked-button type="button" class="scroll-btn" (click)="scrollToForm()">
          <mat-icon>arrow_upward</mat-icon> Compléter
        </button>
      </div>
    </div>
  `,
  styles: [`
    .onboarding-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 1100;
      background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%);
      color: #fff;
      box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.18);
      transform: translateY(100%);
      transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: none;
    }
    .onboarding-bar.visible {
      transform: translateY(0);
      pointer-events: auto;
    }
    .bar-content {
      max-width: 900px;
      margin: 0 auto;
      padding: 14px 24px;
      display: flex;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
    }
    .bar-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: #fbbf24;
      flex-shrink: 0;
    }
    .bar-text {
      flex: 1;
      min-width: 200px;
      strong { display: block; font-size: 14px; margin-bottom: 2px; }
      p { margin: 0; font-size: 13px; opacity: 0.92; line-height: 1.4; }
      em { font-style: normal; font-weight: 600; color: #fde68a; }
    }
    .bar-msg-mobile { display: none; }
    .scroll-btn {
      color: #fff !important;
      border-color: rgba(255, 255, 255, 0.6) !important;
      flex-shrink: 0;
    }
    @media (max-width: 600px) {
      .bar-content {
        padding: 10px 14px;
        flex-wrap: nowrap;
        gap: 10px;
      }
      .bar-text { min-width: 0; }
      .bar-text strong { font-size: 13px; }
      .bar-msg-desktop { display: none; }
      .bar-msg-mobile { display: block; font-size: 12px; }
      .bar-icon { font-size: 22px; width: 22px; height: 22px; }
      .scroll-btn {
        width: auto;
        flex-shrink: 0;
        padding: 0 12px;
        min-height: 36px;
        font-size: 13px;
      }
    }
  `],
})
export class ProfileOnboardingBarComponent {
  @Input() visible = false;
  @Input() missingFields: string[] = [];
  @Input() kycAccessStatus: string | null = null;
  @Input() kycBlockMessage = '';

  get missingLabels(): string[] {
    return this.missingFields.map((f) => profileFieldLabel(f));
  }

  get barTitle(): string {
    if (this.kycAccessStatus === 'pending_review') return 'Identité en attente de validation';
    if (this.kycAccessStatus === 'rejected') return 'Vérification d\'identité rejetée';
    return 'Profil incomplet — accès restreint';
  }

  get barMessage(): string {
    if (this.kycBlockMessage) return this.kycBlockMessage;
    return 'Complétez votre vérification d\'identité et les champs du profil pour débloquer la plateforme.';
  }

  get shortBarMessage(): string {
    if (this.kycAccessStatus === 'pending_review') return 'En attente de validation admin.';
    if (this.kycAccessStatus === 'rejected') return 'Corrigez votre dossier KYC.';
    return 'Complétez identité + profil pour débloquer.';
  }

  scrollToForm(): void {
    const missing = this.missingFields[0];
    const selector = missing
      ? `[data-profile-field="${missing}"], .kyc-form .submit-row, .profile-tabs, .tab-content`
      : '.kyc-form .submit-row, .profile-tabs, .tab-content, .profile-container';
    document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}
