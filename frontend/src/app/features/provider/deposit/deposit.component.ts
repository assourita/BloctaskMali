import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { environment } from '../../../../environments/environment';
import { DepositFundingPanelComponent, DepositFundResult } from '../../../shared/components/deposit-funding-panel/deposit-funding-panel.component';

interface Deposit {
  id: string;
  amount: number;
  currency: string;
  status: string;
  locked_for_mission_title?: string;
  deposit_tx_hash?: string;
  created_at: string;
  locked_at?: string;
  released_at?: string;
}

@Component({
  selector: 'app-provider-deposit',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatProgressSpinnerModule, MatSnackBarModule,
    DepositFundingPanelComponent,
  ],
  template: `
    <div class="page-container">
      <!-- Header - Revolut Style -->
      <div class="page-header">
        <div class="header-content">
          <h1><mat-icon>account_balance_wallet</mat-icon> Caution</h1>
          <p>Gérez votre dépôt de garantie prestataire</p>
        </div>
        <button mat-stroked-button class="refresh-btn" (click)="load()">
          <mat-icon>refresh</mat-icon> Actualiser
        </button>
      </div>

      <!-- Balance Cards - Revolut Style -->
      <div class="balance-row" *ngIf="!loading">
        <div class="balance-card available">
          <div class="card-icon">
            <mat-icon>account_balance</mat-icon>
          </div>
          <div class="card-content">
            <span class="val">{{ profileBalance | number:'1.0-0' }} XOF</span>
            <span class="lbl">Solde disponible</span>
          </div>
        </div>
        <div class="balance-card locked">
          <div class="card-icon">
            <mat-icon>lock</mat-icon>
          </div>
          <div class="card-content">
            <span class="val">{{ profileLocked | number:'1.0-0' }} XOF</span>
            <span class="lbl">Caution bloquée</span>
          </div>
        </div>
      </div>

      <div class="loading" *ngIf="loading"><mat-spinner diameter="36"></mat-spinner></div>

      <!-- Fund Card -->
      <mat-card *ngIf="!loading" class="fund-card">
        <app-deposit-funding-panel
          title="Déposer une caution"
          hint="Débitez votre compte Mobile Money pour alimenter votre solde caution."
          submitLabel="Payer via Mobile Money"
          (funded)="onFunded($event)"
        />
      </mat-card>

      <!-- History Card -->
      <mat-card *ngIf="!loading" class="history-card">
        <mat-card-header>
          <mat-card-title>Historique des cautions</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="dep-item" *ngFor="let d of deposits">
            <div class="dep-main">
              <span class="amount">{{ d.amount | number:'1.0-0' }} {{ d.currency }}</span>
              <span class="meta" *ngIf="d.locked_for_mission_title">Mission : {{ d.locked_for_mission_title }}</span>
              <span class="meta">{{ d.created_at | date:'medium' }}</span>
              <code class="hash" *ngIf="d.deposit_tx_hash">{{ d.deposit_tx_hash | slice:0:16 }}...</code>
            </div>
            <mat-chip [class]="'st-' + d.status">{{ statusLabel(d.status) }}</mat-chip>
          </div>
          <p class="empty" *ngIf="!deposits.length">Aucune caution enregistrée</p>
        </mat-card-content>
      </mat-card>

      <!-- Info Card -->
      <mat-card class="info-card" *ngIf="!loading">
        <mat-card-content>
          <h3><mat-icon>info</mat-icon> À propos de la caution</h3>
          <p>La caution garantit la bonne exécution de vos missions. Elle peut être temporairement bloquée pendant une mission active et libérée à la fin si tout se passe bien.</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    @use '../../../core/design-system/spacing' as spacing;
    @use '../../../core/design-system/radius' as radius;
    @use '../../../core/design-system/colors' as colors;
    @use '../../../core/design-system/typography' as typography;
    @use '../../../core/design-system/shadows' as shadows;
    @use '../../../core/design-system/component-radius' as componentRadius;

    .page-container {
      max-width: 900px;
      margin: 0 auto;
      padding: 2rem;
      font-family: system-ui, -apple-system, sans-serif;
    }

    /* Header - Revolut Style */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .header-content h1 {
      margin: 0 0 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1.875rem;
      font-weight: 800;
      color: #111827;

      mat-icon {
        font-size: 2rem;
        width: 2rem;
        height: 2rem;
        color: #4f46e5;
      }
    }

    .header-content p {
      margin: 0;
      color: #9ca3af;
      font-size: 1rem;
    }

    .refresh-btn {
      border: 2px solid #e5e7eb;
      border-radius: 0.75rem;
      padding: 0.75rem 1.5rem;
      font-weight: 600;
      font-size: 0.875rem;
      transition: all 0.2s ease;

      &:hover {
        border-color: #6366f1;
        background: #f9fafb;
      }

      mat-icon {
        margin-right: 0.5rem;
      }
    }

    /* Balance Cards - Revolut Style */
    .balance-row {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .balance-card {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: radius.$size-2xl;
      padding: spacing.$space-6;
      display: flex;
      align-items: center;
      gap: spacing.$space-4;
      box-shadow: shadows.$base;
      transition: all 0.2s ease;

      &:hover {
        box-shadow: shadows.$lg;
        transform: translateY(-2px);
      }

      .card-icon {
        width: 3.5rem;
        height: 3.5rem;
        border-radius: radius.$lg;
        display: flex;
        align-items: center;
        justify-content: center;

        mat-icon {
          font-size: 1.75rem;
          width: 1.75rem;
          height: 1.75rem;
        }
      }

      .card-content {
        display: flex;
        flex-direction: column;
        gap: spacing.$space-1;
      }

      .val {
        font-size: typography.$font-size-2xl;
        font-weight: typography.$font-weight-extrabold;
        color: colors.$text-primary;
      }

      .lbl {
        font-size: typography.$font-size-sm;
        color: colors.$text-tertiary;
        font-weight: typography.$font-weight-medium;
      }

      &.available .card-icon {
        background: linear-gradient(135deg, colors.$success-400 0%, colors.$success-600 100%);
        color: colors.$text-inverse;
      }

      &.locked .card-icon {
        background: linear-gradient(135deg, colors.$warning-400 0%, colors.$warning-600 100%);
        color: colors.$text-primary;
      }
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: spacing.$space-16;
    }

    /* Cards */
    .fund-card, .history-card, .info-card {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: radius.$size-2xl;
      box-shadow: shadows.$base;
      margin-bottom: spacing.$space-6;

      ::ng-deep {
        .mat-mdc-card-header {
          padding: spacing.$space-6;
          border-bottom: 1px solid colors.$border-primary;
        }

        .mat-mdc-card-title {
          font-size: typography.$font-size-lg;
          font-weight: typography.$font-weight-semibold;
          color: colors.$text-primary;
        }

        .mat-mdc-card-content {
          padding: spacing.$space-6;
        }
      }
    }

    /* History Items */
    .dep-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: spacing.$space-4 0;
      border-bottom: 1px solid colors.$border-primary;

      &:last-child {
        border-bottom: none;
      }
    }

    .dep-main {
      display: flex;
      flex-direction: column;
      gap: spacing.$space-1;
    }

    .amount {
      font-size: typography.$font-size-lg;
      font-weight: typography.$font-weight-extrabold;
      color: colors.$text-primary;
    }

    .meta {
      font-size: typography.$font-size-sm;
      color: colors.$text-tertiary;
    }

    .hash {
      font-size: typography.$font-size-xs;
      color: colors.$text-tertiary;
      background: colors.$background-secondary;
      padding: 0.125rem 0.5rem;
      border-radius: radius.$md;
    }

    mat-chip {
      font-size: typography.$font-size-xs;
      font-weight: typography.$font-weight-semibold;
      padding: 0.375rem 0.875rem;
      border-radius: componentRadius.$full;
    }

    .st-available,
    .st-active {
      background: colors.$success-100;
      color: colors.$success-600;
    }

    .st-locked {
      background: colors.$warning-100;
      color: colors.$warning-600;
    }

    .st-released {
      background: colors.$info-100;
      color: colors.$info-600;
    }

    .st-pending {
      background: colors.$warning-100;
      color: colors.$warning-600;
    }

    .st-forfeited {
      background: colors.$error-50;
      color: colors.$error-600;
    }

    .empty {
      text-align: center;
      padding: spacing.$space-8;
      color: colors.$text-tertiary;
      font-size: typography.$font-size-sm;
      margin: 0;
    }

    /* Info Card */
    .info-card h3 {
      display: flex;
      align-items: center;
      gap: spacing.$space-2;
      font-size: typography.$font-size-base;
      font-weight: typography.$font-weight-semibold;
      color: colors.$text-primary;
      margin: 0 0 spacing.$space-3;

      mat-icon {
        color: colors.$info-600;
      }
    }

    .info-card p {
      margin: 0;
      font-size: typography.$font-size-sm;
      color: colors.$text-secondary;
      line-height: typography.$line-height-relaxed;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .page-container {
        padding: spacing.$space-4;
      }

      .page-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .balance-row {
        grid-template-columns: 1fr;
      }

      .dep-item {
        flex-direction: column;
        align-items: flex-start;
        gap: spacing.$space-3;
      }
    }
  `]
})

export class ProviderDepositComponent implements OnInit {
  private apiUrl = environment.apiUrl;
  deposits: Deposit[] = [];
  profileBalance = 0;
  profileLocked = 0;
  loading = true;

  constructor(private http: HttpClient, private snack: MatSnackBar) {}

  ngOnInit(): void { this.load(); }

  private h(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });
  }

  load(): void {
    this.loading = true;
    this.http.get<any>(`${this.apiUrl}/users/me/`, { headers: this.h() }).subscribe({
      next: (u) => {
        const p = u.provider_profile;
        if (p) {
          this.profileBalance = p.deposit_balance || 0;
          this.profileLocked = p.deposit_locked || 0;
        }
      },
    });
    this.http.get<any>(`${this.apiUrl}/escrow/deposits/`, { headers: this.h() }).subscribe({
      next: (r) => {
        this.deposits = (Array.isArray(r) ? r : r?.results ?? []) as Deposit[];
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  onFunded(res: DepositFundResult): void {
    this.profileBalance = res.deposit_balance;
    if (res.deposit_locked != null) this.profileLocked = res.deposit_locked;
    this.load();
  }

  statusLabel(s: string): string {
    const m: Record<string, string> = { active: 'Active', locked: 'Bloquée', released: 'Libérée', forfeited: 'Confisquée', pending: 'En attente' };
    return m[s] || s;
  }
}
