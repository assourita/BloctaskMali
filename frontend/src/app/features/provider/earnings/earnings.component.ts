import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { PaymentService, Payment } from '../../../core/services/payment.service';
import { environment } from '../../../../environments/environment';

interface WalletTx {
  id: string;
  transaction_type: string;
  amount: number;
  currency: string;
  description: string;
  status: string;
  created_at: string;
}

@Component({
  selector: 'app-provider-earnings',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatProgressSpinnerModule, MatDividerModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1><mat-icon>attach_money</mat-icon> Mes revenus</h1>
          <p>Paiements reçus et historique wallet</p>
        </div>
        <button mat-stroked-button (click)="load()"><mat-icon>refresh</mat-icon> Actualiser</button>
      </div>

      <div class="kpi-row" *ngIf="!loading">
        <div class="kpi highlight">
          <mat-icon>payments</mat-icon>
          <span class="val">{{ stats.total_earned | number:'1.0-0' }}</span>
          <span class="lbl">Total gagné (XOF)</span>
        </div>
        <div class="kpi">
          <mat-icon>check_circle</mat-icon>
          <span class="val">{{ stats.completed_missions }}</span>
          <span class="lbl">Missions terminées</span>
        </div>
        <div class="kpi">
          <mat-icon>pending</mat-icon>
          <span class="val">{{ stats.active_missions }}</span>
          <span class="lbl">En cours</span>
        </div>
        <div class="kpi">
          <mat-icon>account_balance_wallet</mat-icon>
          <span class="val">{{ walletTxs.length }}</span>
          <span class="lbl">Transactions wallet</span>
        </div>
      </div>

      <div class="loading" *ngIf="loading"><mat-spinner diameter="36"></mat-spinner></div>

      <div class="grid" *ngIf="!loading">
        <mat-card>
          <mat-card-header><mat-card-title>Paiements missions</mat-card-title></mat-card-header>
          <mat-card-content>
            <div class="tx-item" *ngFor="let p of payments">
              <div>
                <span class="amount">+{{ p.provider_amount | number:'1.0-0' }} {{ p.currency }}</span>
                <span class="meta">Mission · {{ p.created_at | date:'short' }}</span>
              </div>
              <mat-chip [class]="'st-' + p.status">{{ p.status }}</mat-chip>
            </div>
            <p class="empty" *ngIf="!payments.length">Aucun paiement pour le moment</p>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-header><mat-card-title>Transactions wallet</mat-card-title></mat-card-header>
          <mat-card-content>
            <div class="tx-item" *ngFor="let t of walletTxs">
              <div>
                <span class="amount">{{ t.amount | number:'1.0-0' }} {{ t.currency }}</span>
                <span class="meta">{{ t.description || t.transaction_type }} · {{ t.created_at | date:'short' }}</span>
              </div>
              <mat-chip>{{ t.status }}</mat-chip>
            </div>
            <p class="empty" *ngIf="!walletTxs.length">Aucune transaction wallet</p>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .page-container { max-width: 1100px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;
      h1 { margin: 0 0 4px; display: flex; align-items: center; gap: 8px; font-size: 22px; }
      p { margin: 0; color: #6b7280; font-size: 14px; }
    }
    .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .kpi { background: #fff; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; align-items: center; gap: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      mat-icon { color: #6C5CE7; } &.highlight { background: linear-gradient(135deg, #1a1a2e, #0f3460); color: #fff;
        mat-icon { color: #00b894; } .lbl { color: rgba(255,255,255,0.7); }
      }
      .val { font-size: 22px; font-weight: 700; } .lbl { font-size: 12px; color: #6b7280; }
    }
    .loading { display: flex; justify-content: center; padding: 40px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .tx-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f3f4f6; }
    .amount { font-weight: 700; display: block; color: #00b894; }
    .meta { font-size: 12px; color: #9ca3af; }
    .st-completed { background: #d1fae5 !important; color: #065f46 !important; }
    .empty { text-align: center; color: #9ca3af; padding: 24px; }
    @media (max-width: 768px) { .grid, .kpi-row { grid-template-columns: 1fr; } }
  `]
})
export class ProviderEarningsComponent implements OnInit {
  private apiUrl = environment.apiUrl;
  payments: Payment[] = [];
  walletTxs: WalletTx[] = [];
  loading = true;
  stats = { total_earned: 0, completed_missions: 0, active_missions: 0 };

  constructor(private http: HttpClient, private paymentService: PaymentService) {}

  ngOnInit(): void { this.load(); }

  private h(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });
  }

  load(): void {
    this.loading = true;
    // Même source que le dashboard analytics : missions réelles (final_price || budget)
    this.http.get<any>(`${this.apiUrl}/analytics/dashboard/?role=provider`, { headers: this.h() }).subscribe({
      next: (s) => {
        this.stats.total_earned = Number(s.total_earned) || 0;
        this.stats.completed_missions = s.completed_missions || 0;
        this.stats.active_missions = s.active_missions || 0;
      },
      error: () => {
        this.http.get<any>(`${this.apiUrl}/users/stats/`, { headers: this.h() }).subscribe({
          next: (s) => {
            this.stats.total_earned = s.total_earned || 0;
            this.stats.completed_missions = s.completed_missions || 0;
            this.stats.active_missions = s.active_missions || 0;
          },
        });
      },
    });
    this.paymentService.getPayments().subscribe({
      next: (r) => {
        this.payments = (Array.isArray(r) ? r : (r as any)?.results ?? []) as Payment[];
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
    this.http.get<WalletTx[]>(`${this.apiUrl}/users/wallet/transactions/`, { headers: this.h() }).subscribe({
      next: (r) => { this.walletTxs = Array.isArray(r) ? r : (r as any)?.results ?? []; },
    });
  }
}
