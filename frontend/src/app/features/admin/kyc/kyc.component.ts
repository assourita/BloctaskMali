import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
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
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
  ],
  template: `
    <div class="kyc-page">
      <header class="hero">
        <div>
          <p class="eyebrow">Contrôle d'identité</p>
          <h1>Vérifications KYC</h1>
          <p class="lead">Examinez les pièces avant d'approuver ou de rejeter un compte.</p>
        </div>
        <button type="button" class="btn-refresh" (click)="loadStats(); loadKycList()">
          <mat-icon>refresh</mat-icon> Actualiser
        </button>
      </header>

      <div class="stats-row">
        <button
          type="button"
          class="stat-card pending"
          [class.active]="activeFilter === 'pending'"
          (click)="setFilter('pending')">
          <div class="stat-icon"><mat-icon>hourglass_top</mat-icon></div>
          <div class="stat-content">
            <span class="stat-value">{{ pendingCount }}</span>
            <span class="stat-label">En attente</span>
          </div>
        </button>
        <button
          type="button"
          class="stat-card verified"
          [class.active]="activeFilter === 'verified'"
          (click)="setFilter('verified')">
          <div class="stat-icon"><mat-icon>verified_user</mat-icon></div>
          <div class="stat-content">
            <span class="stat-value">{{ verifiedCount }}</span>
            <span class="stat-label">Vérifiés</span>
          </div>
        </button>
        <button
          type="button"
          class="stat-card rejected"
          [class.active]="activeFilter === 'rejected'"
          (click)="setFilter('rejected')">
          <div class="stat-icon"><mat-icon>cancel</mat-icon></div>
          <div class="stat-content">
            <span class="stat-value">{{ rejectedCount }}</span>
            <span class="stat-label">Rejetés</span>
          </div>
        </button>
      </div>

      <div class="list-header" *ngIf="!loading">
        <h2>{{ listTitle }}</h2>
        <span class="list-count">{{ kycUsers.length }} dossier{{ kycUsers.length > 1 ? 's' : '' }}</span>
      </div>

      <div class="loading-container" *ngIf="loading">
        <mat-spinner diameter="40"></mat-spinner>
        <p>Chargement des dossiers…</p>
      </div>

      <div class="kyc-list" *ngIf="!loading">
        <article class="kyc-card" *ngFor="let user of kycUsers">
          <div class="card-top">
            <div class="avatar">{{ initials(user) }}</div>
            <div class="user-info">
              <h3>{{ user.first_name }} {{ user.last_name }}</h3>
              <p>
                {{ user.email }}
                <span class="dot">·</span> {{ getUserTypeLabel(user.user_type) }}
                <span *ngIf="user.company_name"><span class="dot">·</span> {{ user.company_name }}</span>
              </p>
            </div>
            <span class="status-chip" [class]="user.kyc_status">{{ getStatusLabel(user.kyc_status) }}</span>
          </div>

          <div class="kyc-details">
            <div class="detail" *ngIf="user.nina">
              <mat-icon>badge</mat-icon>
              <span>NINA {{ user.nina }}</span>
            </div>
            <div class="detail" *ngIf="user.phone_number">
              <mat-icon>phone</mat-icon>
              <span>{{ user.phone_number }}</span>
            </div>
            <div class="detail" *ngIf="user.kyc_submitted_at">
              <mat-icon>schedule</mat-icon>
              <span>{{ user.kyc_submitted_at | date:'dd MMM yyyy, HH:mm' }}</span>
            </div>
            <div class="detail docs-count" [class.ok]="countDocs(user) === 3" [class.warn]="countDocs(user) < 3">
              <mat-icon>photo_library</mat-icon>
              <span>{{ countDocs(user) }}/3 pièces</span>
            </div>
          </div>

          <div class="rejection-reason" *ngIf="user.kyc_rejection_reason && user.kyc_status === 'rejected'">
            <mat-icon>report</mat-icon>
            <span><strong>Motif :</strong> {{ user.kyc_rejection_reason }}</span>
          </div>

          <div class="doc-previews" *ngIf="hasAnyDoc(user)">
            <figure *ngIf="user.id_card_front_url">
              <img [src]="user.id_card_front_url" alt="Recto" />
              <figcaption>Recto</figcaption>
            </figure>
            <figure *ngIf="user.id_card_back_url">
              <img [src]="user.id_card_back_url" alt="Verso" />
              <figcaption>Verso</figcaption>
            </figure>
            <figure *ngIf="user.selfie_verification_url">
              <img [src]="user.selfie_verification_url" alt="Selfie" />
              <figcaption>Selfie</figcaption>
            </figure>
          </div>
          <p class="no-docs" *ngIf="!hasAnyDoc(user)">Aucune pièce jointe pour le moment.</p>

          <div class="kyc-actions">
            <button mat-flat-button color="primary" type="button" (click)="openReview(user)">
              <mat-icon>visibility</mat-icon>
              {{ user.kyc_status === 'pending' ? 'Examiner le dossier' : 'Voir le dossier' }}
            </button>
          </div>
        </article>

        <div class="empty" *ngIf="!kycUsers.length">
          <mat-icon>folder_off</mat-icon>
          <p>{{ emptyMessage }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .kyc-page { max-width: 1080px; margin: 0 auto; padding: 8px 0 40px; }

    .hero {
      display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; flex-wrap: wrap;
      background: linear-gradient(145deg, #064e3b 0%, #059669 60%, #10b981 120%);
      color: #fff; border-radius: 18px; padding: 24px 26px; margin-bottom: 18px;
    }
    .eyebrow { margin: 0 0 4px; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; opacity: .8; font-weight: 700; }
    .hero h1 { margin: 0 0 6px; font-size: 1.6rem; }
    .lead { margin: 0; opacity: .9; font-size: 14px; max-width: 42ch; }
    .btn-refresh {
      display: inline-flex; align-items: center; gap: 6px; border-radius: 10px; border: 1px solid rgba(255,255,255,.35);
      background: rgba(255,255,255,.12); color: #fff; padding: 8px 14px; font-weight: 600; cursor: pointer;
    }

    .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
    .stat-card {
      display: flex; align-items: center; gap: 14px; padding: 16px 18px; border-radius: 14px;
      border: 1px solid #e5e7eb; background: #fff; cursor: pointer; text-align: left;
      transition: box-shadow .15s, border-color .15s, transform .15s;
    }
    .stat-card:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(0,0,0,.06); }
    .stat-card.active { border-color: #059669; box-shadow: 0 0 0 2px rgba(5,150,105,.2); }
    .stat-icon {
      width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center;
    }
    .stat-card.pending .stat-icon { background: #fef3c7; color: #b45309; }
    .stat-card.verified .stat-icon { background: #d1fae5; color: #047857; }
    .stat-card.rejected .stat-icon { background: #fee2e2; color: #b91c1c; }
    .stat-value { display: block; font-size: 1.4rem; font-weight: 800; color: #111827; line-height: 1; }
    .stat-label { font-size: 13px; color: #6b7280; }

    .list-header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 12px; }
    .list-header h2 { margin: 0; font-size: 1.05rem; color: #111827; }
    .list-count { font-size: 13px; color: #6b7280; }

    .loading-container { display: flex; flex-direction: column; align-items: center; padding: 48px; gap: 12px; color: #6b7280; }

    .kyc-list { display: flex; flex-direction: column; gap: 12px; }
    .kyc-card {
      background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 18px 18px 14px;
      box-shadow: 0 1px 2px rgba(0,0,0,.03);
    }
    .card-top { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 14px; }
    .avatar {
      width: 44px; height: 44px; border-radius: 12px; background: #d1fae5; color: #047857;
      display: flex; align-items: center; justify-content: center; font-weight: 800; flex-shrink: 0;
    }
    .user-info { flex: 1; min-width: 0; }
    .user-info h3 { margin: 0 0 4px; font-size: 1rem; }
    .user-info p { margin: 0; color: #6b7280; font-size: 13px; }
    .dot { margin: 0 4px; opacity: .6; }
    .status-chip {
      border-radius: 999px; padding: 4px 10px; font-size: 12px; font-weight: 700; white-space: nowrap;
    }
    .status-chip.pending { background: #fef3c7; color: #b45309; }
    .status-chip.verified { background: #d1fae5; color: #047857; }
    .status-chip.rejected { background: #fee2e2; color: #b91c1c; }

    .kyc-details { display: flex; flex-wrap: wrap; gap: 10px 18px; margin-bottom: 10px; }
    .detail { display: flex; align-items: center; gap: 6px; color: #6b7280; font-size: 13px; }
    .detail mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .docs-count.ok { color: #047857; font-weight: 600; }
    .docs-count.warn { color: #b45309; font-weight: 600; }

    .rejection-reason {
      display: flex; gap: 8px; align-items: flex-start; padding: 10px 12px; margin-bottom: 10px;
      border-radius: 10px; background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; font-size: 13px;
    }
    .rejection-reason mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .doc-previews { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 8px; }
    .doc-previews figure { margin: 0; }
    .doc-previews img {
      width: 84px; height: 84px; object-fit: cover; border-radius: 10px; border: 1px solid #e5e7eb; display: block;
    }
    .doc-previews figcaption { text-align: center; font-size: 11px; color: #9ca3af; margin-top: 4px; }
    .no-docs { margin: 0 0 8px; color: #9ca3af; font-size: 13px; font-style: italic; }

    .kyc-actions { padding-top: 12px; border-top: 1px solid #f3f4f6; }
    .empty { text-align: center; padding: 48px 16px; color: #9ca3af; }
    .empty mat-icon { font-size: 40px; width: 40px; height: 40px; margin-bottom: 8px; }

    @media (max-width: 768px) {
      .stats-row { grid-template-columns: 1fr; }
      .card-top { flex-wrap: wrap; }
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

  initials(user: KycReviewUser): string {
    return `${(user.first_name || ' ').charAt(0)}${(user.last_name || ' ').charAt(0)}`.toUpperCase().trim();
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
