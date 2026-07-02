import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import {
  KycReviewDialogComponent,
  KycReviewDialogResult,
  KycReviewUser,
} from './kyc-review-dialog.component';

type KycFilterStatus = 'pending' | 'verified' | 'rejected';

@Component({
  selector: 'app-admin-kyc',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
  ],
  template: `
    <div class="kyc-container">
      <div class="page-header">
        <h1>Vérifications KYC</h1>
        <p>Consultez les pièces justificatives avant d'approuver ou de rejeter</p>
      </div>

      <div class="stats-row">
        <mat-card
          class="stat-card pending"
          [class.active]="activeFilter === 'pending'"
          (click)="setFilter('pending')">
          <mat-icon>pending_actions</mat-icon>
          <div class="stat-content">
            <span class="stat-value">{{ pendingCount }}</span>
            <span class="stat-label">En attente</span>
          </div>
        </mat-card>
        <mat-card
          class="stat-card verified"
          [class.active]="activeFilter === 'verified'"
          (click)="setFilter('verified')">
          <mat-icon>verified_user</mat-icon>
          <div class="stat-content">
            <span class="stat-value">{{ verifiedCount }}</span>
            <span class="stat-label">Vérifiés</span>
          </div>
        </mat-card>
        <mat-card
          class="stat-card rejected"
          [class.active]="activeFilter === 'rejected'"
          (click)="setFilter('rejected')">
          <mat-icon>cancel</mat-icon>
          <div class="stat-content">
            <span class="stat-value">{{ rejectedCount }}</span>
            <span class="stat-label">Rejetés</span>
          </div>
        </mat-card>
      </div>

      <div class="list-header" *ngIf="!loading">
        <h2>{{ listTitle }}</h2>
        <span class="list-count">{{ kycUsers.length }} affiché{{ kycUsers.length > 1 ? 's' : '' }}</span>
      </div>

      <div class="loading-container" *ngIf="loading">
        <mat-spinner diameter="40"></mat-spinner>
        <p>Chargement...</p>
      </div>

      <div class="kyc-list" *ngIf="!loading">
        <mat-card class="kyc-card" *ngFor="let user of kycUsers">
          <div class="kyc-header">
            <div class="user-info">
              <h3>{{ user.first_name }} {{ user.last_name }}</h3>
              <p>
                {{ user.email }} · {{ getUserTypeLabel(user.user_type) }}
                <span *ngIf="user.company_name"> · {{ user.company_name }}</span>
              </p>
            </div>
            <mat-chip [class]="user.kyc_status">{{ getStatusLabel(user.kyc_status) }}</mat-chip>
          </div>

          <div class="kyc-details">
            <div class="detail" *ngIf="user.nina">
              <mat-icon>badge</mat-icon>
              <span>NINA : {{ user.nina }}</span>
            </div>
            <div class="detail" *ngIf="user.phone_number">
              <mat-icon>phone</mat-icon>
              <span>{{ user.phone_number }}</span>
            </div>
            <div class="detail" *ngIf="user.kyc_submitted_at">
              <mat-icon>schedule</mat-icon>
              <span>Soumis le {{ user.kyc_submitted_at | date:'dd/MM/yyyy HH:mm' }}</span>
            </div>
            <div class="detail docs-count">
              <mat-icon>photo_library</mat-icon>
              <span>{{ countDocs(user) }}/3 pièces</span>
            </div>
          </div>

          <div class="rejection-reason" *ngIf="user.kyc_rejection_reason && user.kyc_status === 'rejected'">
            <mat-icon>report</mat-icon>
            <span><strong>Motif :</strong> {{ user.kyc_rejection_reason }}</span>
          </div>

          <div class="doc-previews" *ngIf="hasAnyDoc(user)">
            <img *ngIf="user.id_card_front_url" [src]="user.id_card_front_url" alt="Recto" title="Recto" />
            <img *ngIf="user.id_card_back_url" [src]="user.id_card_back_url" alt="Verso" title="Verso" />
            <img *ngIf="user.selfie_verification_url" [src]="user.selfie_verification_url" alt="Selfie" title="Selfie" />
          </div>

          <div class="kyc-actions">
            <button mat-stroked-button color="primary" (click)="openReview(user)">
              <mat-icon>visibility</mat-icon>
              {{ user.kyc_status === 'pending' ? 'Examiner le dossier' : 'Voir le dossier' }}
            </button>
          </div>
        </mat-card>
        <p class="empty" *ngIf="!kycUsers.length">{{ emptyMessage }}</p>
      </div>
    </div>
  `,
  styles: [`
    .kyc-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: white;
      padding: 32px;
      border-radius: 16px;
      margin-bottom: 24px;

      h1 {
        margin: 0 0 8px 0;
        font-size: 28px;
        font-weight: 700;
      }

      p {
        margin: 0;
        font-size: 16px;
        opacity: 0.9;
      }
    }

    .stats-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      cursor: pointer;
      transition: box-shadow 0.2s, transform 0.15s;
    }

    .stat-card:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      transform: translateY(-1px);
    }

    .stat-card.active {
      box-shadow: 0 0 0 2px #3b82f6;
    }

    .stat-card.pending { border-left: 4px solid #d97706; }
    .stat-card.verified { border-left: 4px solid #059669; }
    .stat-card.rejected { border-left: 4px solid #dc2626; }

    .stat-card.pending.active { background: #fffbeb; }
    .stat-card.verified.active { background: #ecfdf5; }
    .stat-card.rejected.active { background: #fef2f2; }

    .stat-content {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: #1f2937;
    }

    .stat-label {
      font-size: 14px;
      color: #6b7280;
    }

    .list-header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      margin-bottom: 16px;
      gap: 12px;
    }

    .list-header h2 {
      margin: 0;
      font-size: 18px;
      color: #111827;
    }

    .list-count {
      font-size: 13px;
      color: #6b7280;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px;
      gap: 16px;
    }

    .kyc-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .kyc-card {
      padding: 20px;
    }

    .kyc-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;

      .user-info {
        h3 {
          margin: 0 0 4px 0;
          font-size: 18px;
        }
        p {
          margin: 0;
          color: #6b7280;
          font-size: 14px;
        }
      }
    }

    mat-chip.pending { background: #fef3c7; color: #d97706; }
    mat-chip.verified { background: #d1fae5; color: #059669; }
    mat-chip.rejected { background: #fee2e2; color: #dc2626; }

    .kyc-details {
      display: flex;
      flex-wrap: wrap;
      gap: 24px;
      margin-bottom: 12px;

      .detail {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #6b7280;
        font-size: 14px;

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }

      .docs-count { color: #3b82f6; font-weight: 500; }
    }

    .rejection-reason {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 12px;
      margin-bottom: 12px;
      border-radius: 10px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
      font-size: 13px;
      line-height: 1.5;
    }

    .rejection-reason mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .doc-previews {
      display: flex;
      gap: 8px;
      margin-bottom: 14px;
      flex-wrap: wrap;
    }

    .doc-previews img {
      width: 72px;
      height: 72px;
      object-fit: cover;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      cursor: pointer;
    }

    .kyc-actions {
      display: flex;
      gap: 12px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
    }

    .empty { text-align: center; color: #9ca3af; padding: 40px; }

    @media (max-width: 768px) {
      .stats-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class AdminKycComponent implements OnInit {
  kycUsers: KycReviewUser[] = [];
  loading = true;
  activeFilter: KycFilterStatus = 'pending';
  pendingCount = 0;
  verifiedCount = 0;
  rejectedCount = 0;

  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private snack: MatSnackBar,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadKycList();
  }

  get listTitle(): string {
    const titles: Record<KycFilterStatus, string> = {
      pending: 'Demandes en attente',
      verified: 'Comptes vérifiés',
      rejected: 'Demandes rejetées',
    };
    return titles[this.activeFilter];
  }

  get emptyMessage(): string {
    const messages: Record<KycFilterStatus, string> = {
      pending: 'Aucune demande KYC en attente',
      verified: 'Aucun compte KYC vérifié',
      rejected: 'Aucune demande KYC rejetée',
    };
    return messages[this.activeFilter];
  }

  private h(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });
  }

  setFilter(status: KycFilterStatus): void {
    if (this.activeFilter === status) return;
    this.activeFilter = status;
    this.loadKycList();
  }

  loadStats(): void {
    this.http.get<any>(`${this.apiUrl}/users/admin/stats/`, { headers: this.h() }).subscribe({
      next: (s) => {
        this.pendingCount = s.pending_kyc ?? 0;
        this.verifiedCount = s.verified_kyc ?? 0;
        this.rejectedCount = s.rejected_kyc ?? 0;
      },
    });
  }

  loadKycList(): void {
    this.loading = true;
    const params = new HttpParams()
      .set('kyc_status', this.activeFilter)
      .set('page_size', '200');

    this.http.get<any>(`${this.apiUrl}/users/`, { headers: this.h(), params }).subscribe({
      next: (r) => {
        this.kycUsers = (Array.isArray(r) ? r : r?.results ?? []) as KycReviewUser[];
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  countDocs(user: KycReviewUser): number {
    let n = 0;
    if (user.has_id_card_front) n++;
    if (user.has_id_card_back) n++;
    if (user.has_selfie_verification) n++;
    return n;
  }

  hasAnyDoc(user: KycReviewUser): boolean {
    return this.countDocs(user) > 0;
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'En attente',
      verified: 'Vérifié',
      rejected: 'Rejeté',
    };
    return labels[status] || status;
  }

  getUserTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      client: 'Client',
      provider: 'Prestataire',
      enterprise: 'Entreprise',
      admin: 'Admin',
    };
    return labels[type] || type;
  }

  openReview(user: KycReviewUser): void {
    const ref = this.dialog.open(KycReviewDialogComponent, {
      width: '900px',
      maxWidth: '96vw',
      maxHeight: '92vh',
      autoFocus: false,
      data: {
        user,
        canDecide: user.kyc_status === 'pending',
      },
    });

    ref.afterClosed().subscribe((result: KycReviewDialogResult | null) => {
      if (result?.action === 'approve') {
        this.approveKyc(user);
      } else if (result?.action === 'reject' && result.reason) {
        this.rejectKyc(user, result.reason);
      }
    });
  }

  approveKyc(user: KycReviewUser): void {
    this.http.patch(`${this.apiUrl}/users/${user.id}/`, { kyc_status: 'verified' }, { headers: this.h() }).subscribe({
      next: () => {
        this.snack.open('KYC approuvé', 'Fermer', { duration: 3000 });
        this.loadStats();
        this.loadKycList();
      },
      error: () => this.snack.open('Erreur', 'Fermer', { duration: 3000 }),
    });
  }

  rejectKyc(user: KycReviewUser, reason: string): void {
    this.http.patch(
      `${this.apiUrl}/users/${user.id}/`,
      { kyc_status: 'rejected', kyc_rejection_reason: reason.trim() },
      { headers: this.h() },
    ).subscribe({
      next: () => {
        this.snack.open('KYC rejeté', 'Fermer', { duration: 3000 });
        this.loadStats();
        this.loadKycList();
      },
      error: () => this.snack.open('Erreur', 'Fermer', { duration: 3000 }),
    });
  }
}
