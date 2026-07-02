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
      <div class="page-header">
        <div>
          <h1><mat-icon>security</mat-icon> Caution</h1>
          <p>Gérez votre dépôt de garantie prestataire</p>
        </div>
        <button mat-stroked-button (click)="load()"><mat-icon>refresh</mat-icon> Actualiser</button>
      </div>

      <div class="balance-row" *ngIf="!loading">
        <div class="balance-card available">
          <mat-icon>account_balance</mat-icon>
          <span class="val">{{ profileBalance | number:'1.0-0' }} XOF</span>
          <span class="lbl">Solde disponible</span>
        </div>
        <div class="balance-card locked">
          <mat-icon>lock</mat-icon>
          <span class="val">{{ profileLocked | number:'1.0-0' }} XOF</span>
          <span class="lbl">Caution bloquée</span>
        </div>
      </div>

      <div class="loading" *ngIf="loading"><mat-spinner diameter="36"></mat-spinner></div>

      <mat-card *ngIf="!loading" class="fund-card">
        <app-deposit-funding-panel
          title="Déposer une caution"
          hint="Débitez votre compte Mobile Money pour alimenter votre solde caution."
          submitLabel="Payer via Mobile Money"
          (funded)="onFunded($event)"
        />
      </mat-card>

      <mat-card *ngIf="!loading">
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

      <mat-card class="info-card" *ngIf="!loading">
        <mat-card-content>
          <h3><mat-icon>info</mat-icon> À propos de la caution</h3>
          <p>La caution garantit la bonne exécution de vos missions. Elle peut être temporairement bloquée pendant une mission active et libérée à la fin si tout se passe bien.</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .page-container { max-width: 800px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;
      h1 { margin: 0 0 4px; display: flex; align-items: center; gap: 8px; font-size: 22px; }
      p { margin: 0; color: #6b7280; font-size: 14px; }
    }
    .balance-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .balance-card {
      border-radius: 16px; padding: 24px; display: flex; flex-direction: column; align-items: center; gap: 8px;
      &.available { background: #f0faf4; mat-icon { color: #00b894; } }
      &.locked { background: #fef3c7; mat-icon { color: #d97706; } }
      .val { font-size: 28px; font-weight: 800; } .lbl { font-size: 13px; color: #6b7280; }
    }
    .loading { display: flex; justify-content: center; padding: 40px; }
    .fund-card { margin-bottom: 16px; padding: 16px; }
    mat-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .dep-item { display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid #f3f4f6; gap: 12px; }
    .amount { font-weight: 700; font-size: 16px; display: block; }
    .meta, .hash { font-size: 12px; color: #9ca3af; display: block; }
    .st-active { background: #d1fae5 !important; color: #065f46 !important; }
    .st-locked { background: #fef3c7 !important; color: #92400e !important; }
    .st-released { background: #dbeafe !important; color: #1e40af !important; }
    .st-forfeited { background: #fee2e2 !important; color: #991b1b !important; }
    .empty { text-align: center; color: #9ca3af; padding: 24px; }
    .info-card h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 8px; font-size: 15px; }
    .info-card p { margin: 0; font-size: 14px; color: #6b7280; line-height: 1.5; }
    @media (max-width: 600px) { .balance-row { grid-template-columns: 1fr; } }
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
