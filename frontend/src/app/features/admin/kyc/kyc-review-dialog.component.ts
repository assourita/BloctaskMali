import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface KycReviewUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  kyc_status: string;
  kyc_submitted_at?: string;
  kyc_rejection_reason?: string;
  nina?: string;
  user_type: string;
  phone_number?: string;
  phone_verified?: boolean;
  email_verified?: boolean;
  city?: string;
  country?: string;
  company_name?: string;
  id_card_front_url?: string | null;
  id_card_back_url?: string | null;
  selfie_verification_url?: string | null;
  has_id_card_front?: boolean;
  has_id_card_back?: boolean;
  has_selfie_verification?: boolean;
}

export interface KycReviewDialogResult {
  action: 'approve' | 'reject';
  reason?: string;
}

export interface KycReviewDialogData {
  user: KycReviewUser;
  canDecide: boolean;
}

@Component({
  selector: 'app-kyc-review-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatDialogModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatFormFieldModule, MatInputModule,
  ],
  template: `
    <div class="dialog-header">
      <div>
        <h2>Dossier KYC</h2>
        <p>{{ data.user.first_name }} {{ data.user.last_name }} · {{ data.user.email }}</p>
      </div>
      <button mat-icon-button (click)="close()" aria-label="Fermer">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <mat-dialog-content>
      <div class="info-grid">
        <div class="info-item">
          <span class="label">Profil</span>
          <strong>{{ getUserTypeLabel(data.user.user_type) }}</strong>
        </div>
        <div class="info-item" *ngIf="data.user.company_name">
          <span class="label">Entreprise</span>
          <strong>{{ data.user.company_name }}</strong>
        </div>
        <div class="info-item">
          <span class="label">NINA</span>
          <strong>{{ data.user.nina || '—' }}</strong>
        </div>
        <div class="info-item">
          <span class="label">Téléphone</span>
          <strong>
            {{ data.user.phone_number || '—' }}
            <mat-chip class="mini-chip ok" *ngIf="data.user.phone_verified">Vérifié</mat-chip>
          </strong>
        </div>
        <div class="info-item">
          <span class="label">Email</span>
          <strong>
            {{ data.user.email }}
            <mat-chip class="mini-chip ok" *ngIf="data.user.email_verified">Vérifié</mat-chip>
          </strong>
        </div>
        <div class="info-item" *ngIf="data.user.city">
          <span class="label">Ville</span>
          <strong>{{ data.user.city }}{{ data.user.country ? ', ' + data.user.country : '' }}</strong>
        </div>
        <div class="info-item" *ngIf="data.user.kyc_submitted_at">
          <span class="label">Soumis le</span>
          <strong>{{ data.user.kyc_submitted_at | date:'dd/MM/yyyy HH:mm' }}</strong>
        </div>
      </div>

      <h3><mat-icon>folder_open</mat-icon> Pièces fournies</h3>
      <div class="docs-grid">
        <div class="doc-card">
          <span class="doc-label">Pièce d'identité (recto)</span>
          <a *ngIf="data.user.id_card_front_url" [href]="data.user.id_card_front_url" target="_blank" rel="noopener">
            <img [src]="data.user.id_card_front_url" alt="Recto pièce d'identité" />
          </a>
          <div class="doc-missing" *ngIf="!data.user.id_card_front_url">
            <mat-icon>hide_image</mat-icon> Non fourni
          </div>
        </div>
        <div class="doc-card">
          <span class="doc-label">Pièce d'identité (verso)</span>
          <a *ngIf="data.user.id_card_back_url" [href]="data.user.id_card_back_url" target="_blank" rel="noopener">
            <img [src]="data.user.id_card_back_url" alt="Verso pièce d'identité" />
          </a>
          <div class="doc-missing" *ngIf="!data.user.id_card_back_url">
            <mat-icon>hide_image</mat-icon> Non fourni
          </div>
        </div>
        <div class="doc-card">
          <span class="doc-label">Selfie de vérification</span>
          <a *ngIf="data.user.selfie_verification_url" [href]="data.user.selfie_verification_url" target="_blank" rel="noopener">
            <img [src]="data.user.selfie_verification_url" alt="Selfie vérification" />
          </a>
          <div class="doc-missing" *ngIf="!data.user.selfie_verification_url">
            <mat-icon>hide_image</mat-icon> Non fourni
          </div>
        </div>
      </div>
      <p class="hint" *ngIf="!rejectMode">Cliquez sur une image pour l'ouvrir en plein écran dans un nouvel onglet.</p>

      <div class="reject-box" *ngIf="rejectMode">
        <h3><mat-icon>report</mat-icon> Motif du rejet</h3>
        <p>Expliquez clairement ce qui doit être corrigé. L'utilisateur recevra ce message.</p>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Motif de rejet</mat-label>
          <textarea
            matInput
            [(ngModel)]="rejectionReason"
            rows="4"
            placeholder="Ex. : Photo floue, NINA illisible, selfie ne correspond pas à la pièce…"></textarea>
        </mat-form-field>
      </div>

      <div class="reject-display" *ngIf="!data.canDecide && data.user.kyc_rejection_reason">
        <h3><mat-icon>report</mat-icon> Motif du rejet</h3>
        <p>{{ data.user.kyc_rejection_reason }}</p>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end" *ngIf="data.canDecide && !rejectMode">
      <button mat-stroked-button color="warn" (click)="startReject()">
        <mat-icon>close</mat-icon> Rejeter
      </button>
      <button mat-raised-button color="primary" (click)="decide('approve')" [disabled]="!canApprove()">
        <mat-icon>check</mat-icon> Approuver
      </button>
    </mat-dialog-actions>

    <mat-dialog-actions align="end" *ngIf="data.canDecide && rejectMode">
      <button mat-button (click)="cancelReject()">Retour</button>
      <button mat-raised-button color="warn" (click)="confirmReject()" [disabled]="!rejectionReason.trim()">
        <mat-icon>send</mat-icon> Confirmer le rejet
      </button>
    </mat-dialog-actions>

    <mat-dialog-actions align="end" *ngIf="!data.canDecide">
      <button mat-button (click)="close()">Fermer</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      padding: 20px 24px 0; gap: 12px;
    }
    .dialog-header h2 { margin: 0 0 4px; font-size: 22px; color: #111827; }
    .dialog-header p { margin: 0; font-size: 14px; color: #6b7280; }

    mat-dialog-content {
      padding: 16px 24px !important;
      max-height: min(75vh, 720px);
      overflow-y: auto;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px 20px;
      margin-bottom: 24px;
      padding: 16px;
      background: #f9fafb;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
    }

    .info-item .label {
      display: block;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #9ca3af;
      margin-bottom: 2px;
    }

    .info-item strong {
      font-size: 14px;
      color: #111827;
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .mini-chip {
      font-size: 10px !important;
      min-height: 20px !important;
      padding: 0 8px !important;
    }

    .mini-chip.ok { background: #d1fae5 !important; color: #065f46 !important; }

    h3 {
      display: flex; align-items: center; gap: 8px;
      margin: 0 0 12px; font-size: 16px; color: #374151;
    }

    h3 mat-icon { color: #3b82f6; font-size: 20px; width: 20px; height: 20px; }

    .docs-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }

    .doc-card {
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
      background: #fff;
    }

    .doc-label {
      display: block;
      padding: 8px 10px;
      font-size: 12px;
      font-weight: 600;
      color: #475569;
      background: #f8fafc;
      border-bottom: 1px solid #e5e7eb;
    }

    .doc-card a { display: block; line-height: 0; }
    .doc-card img {
      width: 100%;
      height: 160px;
      object-fit: cover;
      cursor: zoom-in;
      background: #f1f5f9;
    }

    .doc-card a:hover img { opacity: 0.92; }

    .doc-missing {
      height: 160px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      color: #94a3b8;
      font-size: 13px;
      background: #fafafa;
    }

    .doc-missing mat-icon { font-size: 32px; width: 32px; height: 32px; }

    .hint {
      margin: 12px 0 0;
      font-size: 12px;
      color: #9ca3af;
      text-align: center;
    }

    .reject-box, .reject-display {
      margin-top: 20px;
      padding: 16px;
      border-radius: 12px;
      border: 1px solid #fecaca;
      background: #fef2f2;
    }

    .reject-box h3, .reject-display h3 {
      display: flex; align-items: center; gap: 8px;
      margin: 0 0 8px; font-size: 15px; color: #991b1b;
    }

    .reject-box h3 mat-icon, .reject-display h3 mat-icon {
      font-size: 20px; width: 20px; height: 20px;
    }

    .reject-box p, .reject-display p {
      margin: 0 0 12px; font-size: 13px; color: #7f1d1d; line-height: 1.5;
    }

    .reject-display p { margin: 0; white-space: pre-wrap; }

    .full-width { width: 100%; }

    mat-dialog-actions {
      padding: 8px 16px 16px !important;
      gap: 8px;
    }

    @media (max-width: 768px) {
      .info-grid { grid-template-columns: 1fr; }
      .docs-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class KycReviewDialogComponent {
  rejectMode = false;
  rejectionReason = '';

  constructor(
    private dialogRef: MatDialogRef<KycReviewDialogComponent, KycReviewDialogResult | null>,
    @Inject(MAT_DIALOG_DATA) public data: KycReviewDialogData,
  ) {}

  getUserTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      client: 'Client',
      provider: 'Prestataire',
      enterprise: 'Entreprise',
      admin: 'Admin',
    };
    return labels[type] || type;
  }

  canApprove(): boolean {
    const u = this.data.user;
    return !!(u.has_id_card_front && u.has_id_card_back && u.has_selfie_verification && u.nina);
  }

  decide(action: 'approve'): void {
    this.dialogRef.close({ action });
  }

  startReject(): void {
    this.rejectMode = true;
  }

  cancelReject(): void {
    this.rejectMode = false;
    this.rejectionReason = '';
  }

  confirmReject(): void {
    const reason = this.rejectionReason.trim();
    if (!reason) return;
    this.dialogRef.close({ action: 'reject', reason });
  }

  close(): void {
    this.dialogRef.close(null);
  }
}
