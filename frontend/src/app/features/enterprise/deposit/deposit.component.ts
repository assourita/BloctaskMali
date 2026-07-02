import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EnterpriseService } from '../../../core/services/enterprise.service';
import {
  DepositFundingPanelComponent,
  DepositFundResult,
} from '../../../shared/components/deposit-funding-panel/deposit-funding-panel.component';

@Component({
  selector: 'app-enterprise-deposit',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, DepositFundingPanelComponent,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1><mat-icon>security</mat-icon> Caution entreprise</h1>
          <p>Alimentez le solde caution avant d'accepter des missions reçues</p>
        </div>
        <button mat-stroked-button (click)="load()"><mat-icon>refresh</mat-icon> Actualiser</button>
      </div>

      <div class="balance-row" *ngIf="!loading">
        <div class="balance-card available">
          <mat-icon>account_balance</mat-icon>
          <span class="val">{{ depositBalance | number:'1.0-0' }} XOF</span>
          <span class="lbl">Solde disponible</span>
        </div>
        <div class="balance-card locked">
          <mat-icon>lock</mat-icon>
          <span class="val">{{ depositLocked | number:'1.0-0' }} XOF</span>
          <span class="lbl">Caution bloquée</span>
        </div>
      </div>

      <div class="loading" *ngIf="loading"><mat-spinner diameter="36"></mat-spinner></div>

      <mat-card *ngIf="!loading" class="fund-card">
        <app-deposit-funding-panel
          title="Alimenter le solde caution"
          hint="Le gérant paie via Mobile Money avant d'assigner un employé à une mission reçue."
          submitLabel="Payer via Mobile Money"
          (funded)="onFunded($event)"
        />
      </mat-card>
    </div>
  `,
  styles: [`
    .page-container { padding: 24px; max-width: 720px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
    .page-header h1 { margin: 0; display: flex; align-items: center; gap: 8px; font-size: 24px; }
    .page-header p { margin: 4px 0 0; color: #6b7280; }
    .balance-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .balance-card { padding: 20px; border-radius: 12px; display: flex; flex-direction: column; gap: 4px; }
    .balance-card.available { background: #ecfdf5; border: 1px solid #6ee7b7; }
    .balance-card.locked { background: #fffbeb; border: 1px solid #fcd34d; }
    .balance-card mat-icon { color: #6b7280; }
    .val { font-size: 24px; font-weight: 800; color: #111827; }
    .lbl { font-size: 13px; color: #6b7280; }
    .loading { text-align: center; padding: 40px; }
    .fund-card { padding: 20px; }
    @media (max-width: 520px) { .balance-row { grid-template-columns: 1fr; } }
  `],
})
export class EnterpriseDepositComponent implements OnInit {
  loading = true;
  depositBalance = 0;
  depositLocked = 0;

  constructor(private enterpriseService: EnterpriseService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.enterpriseService.getProfile().subscribe({
      next: (p) => {
        this.depositBalance = Number(p.deposit_balance ?? 0);
        this.depositLocked = Number(p.deposit_locked ?? 0);
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  onFunded(result: DepositFundResult): void {
    this.depositBalance = result.deposit_balance;
    if (result.deposit_locked != null) this.depositLocked = result.deposit_locked;
    this.load();
  }
}
