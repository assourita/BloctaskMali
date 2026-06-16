import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { DashboardHeaderComponent } from '../../../shared/components/dashboard-header/dashboard-header.component';

interface KycRequest {
  id: string;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  status: string;
  document_type: string;
  submitted_at: string;
}

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
    MatProgressSpinnerModule
  ],
  template: `
    <div class="kyc-container">
      <div class="page-header">
        <h1>Vérifications KYC</h1>
        <p>Gestion des vérifications d'identité</p>
      </div>

      <!-- Stats -->
      <div class="stats-row">
        <mat-card class="stat-card pending">
          <mat-icon>pending_actions</mat-icon>
          <div class="stat-content">
            <span class="stat-value">{{ pendingCount }}</span>
            <span class="stat-label">En attente</span>
          </div>
        </mat-card>
        <mat-card class="stat-card verified">
          <mat-icon>verified_user</mat-icon>
          <div class="stat-content">
            <span class="stat-value">{{ verifiedCount }}</span>
            <span class="stat-label">Vérifiés</span>
          </div>
        </mat-card>
        <mat-card class="stat-card rejected">
          <mat-icon>cancel</mat-icon>
          <div class="stat-content">
            <span class="stat-value">{{ rejectedCount }}</span>
            <span class="stat-label">Rejetés</span>
          </div>
        </mat-card>
      </div>

      <!-- Loading -->
      <div class="loading-container" *ngIf="loading">
        <mat-spinner diameter="40"></mat-spinner>
        <p>Chargement...</p>
      </div>

      <!-- KYC List -->
      <div class="kyc-list" *ngIf="!loading">
        <mat-card class="kyc-card" *ngFor="let kyc of kycRequests">
          <div class="kyc-header">
            <div class="user-info">
              <h3>{{ kyc.user.first_name }} {{ kyc.user.last_name }}</h3>
              <p>{{ kyc.user.email }}</p>
            </div>
            <mat-chip-listbox>
              <mat-chip [class]="kyc.status">{{ getStatusLabel(kyc.status) }}</mat-chip>
            </mat-chip-listbox>
          </div>
          
          <div class="kyc-details">
            <div class="detail">
              <mat-icon>description</mat-icon>
              <span>{{ kyc.document_type }}</span>
            </div>
            <div class="detail">
              <mat-icon>schedule</mat-icon>
              <span>{{ kyc.submitted_at | date:'dd/MM/yyyy HH:mm' }}</span>
            </div>
          </div>

          <div class="kyc-actions" *ngIf="kyc.status === 'pending'">
            <button mat-raised-button color="primary" (click)="approveKyc(kyc)">
              <mat-icon>check</mat-icon>
              Approuver
            </button>
            <button mat-stroked-button color="warn" (click)="rejectKyc(kyc)">
              <mat-icon>close</mat-icon>
              Rejeter
            </button>
          </div>
        </mat-card>
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
    }

    .stat-card.pending { border-left: 4px solid #d97706; }
    .stat-card.verified { border-left: 4px solid #059669; }
    .stat-card.rejected { border-left: 4px solid #dc2626; }

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
      gap: 24px;
      margin-bottom: 16px;

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
    }

    .kyc-actions {
      display: flex;
      gap: 12px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
    }
  `]
})
export class AdminKycComponent implements OnInit {
  kycRequests: KycRequest[] = [];
  loading = true;
  pendingCount = 0;
  verifiedCount = 0;
  rejectedCount = 0;

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadKycRequests();
  }

  loadKycRequests(): void {
    this.loading = true;
    // TODO: Replace with actual API endpoint
    setTimeout(() => {
      this.kycRequests = [
        {
          id: '1',
          user: { id: 'u1', email: 'user1@test.com', first_name: 'Jean', last_name: 'Dupont' },
          status: 'pending',
          document_type: 'Passeport',
          submitted_at: '2026-06-12T10:00:00Z'
        },
        {
          id: '2',
          user: { id: 'u2', email: 'user2@test.com', first_name: 'Marie', last_name: 'Martin' },
          status: 'pending',
          document_type: 'Carte d\'identité',
          submitted_at: '2026-06-12T09:30:00Z'
        }
      ];
      this.updateCounts();
      this.loading = false;
    }, 500);
  }

  updateCounts(): void {
    this.pendingCount = this.kycRequests.filter(k => k.status === 'pending').length;
    this.verifiedCount = this.kycRequests.filter(k => k.status === 'verified').length;
    this.rejectedCount = this.kycRequests.filter(k => k.status === 'rejected').length;
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'pending': 'En attente',
      'verified': 'Vérifié',
      'rejected': 'Rejeté'
    };
    return labels[status] || status;
  }

  approveKyc(kyc: KycRequest): void {
    console.log('Approving KYC:', kyc);
    kyc.status = 'verified';
    this.updateCounts();
  }

  rejectKyc(kyc: KycRequest): void {
    console.log('Rejecting KYC:', kyc);
    kyc.status = 'rejected';
    this.updateCounts();
  }
}
