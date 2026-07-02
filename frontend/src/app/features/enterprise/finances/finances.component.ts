import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import {
  EnterpriseService,
  EnterpriseContract,
  EnterpriseInvoice,
  EnterpriseFinancesSummary,
} from '../../../core/services/enterprise.service';
import {
  DepositFundingPanelComponent,
  DepositFundResult,
} from '../../../shared/components/deposit-funding-panel/deposit-funding-panel.component';

@Component({
  selector: 'app-enterprise-finances',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatProgressSpinnerModule, MatTabsModule,
    DepositFundingPanelComponent,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1><mat-icon>account_balance</mat-icon> Finances</h1>
          <p>Depenses missions, factures et contrats</p>
        </div>
        <button mat-stroked-button (click)="load()"><mat-icon>refresh</mat-icon> Actualiser</button>
      </div>

      <div class="kpi-row" *ngIf="!loading && summary">
        <div class="kpi deposit">
          <span class="val">{{ depositBalance | number:'1.0-0' }}</span>
          <span class="lbl">Solde caution (XOF)</span>
        </div>
        <div class="kpi locked">
          <span class="val">{{ depositLocked | number:'1.0-0' }}</span>
          <span class="lbl">Caution bloquée (XOF)</span>
        </div>
        <div class="kpi spent">
          <span class="val">{{ summary.mission_spent_total | number:'1.0-0' }}</span>
          <span class="lbl">Depenses terminees (XOF)</span>
        </div>
        <div class="kpi committed">
          <span class="val">{{ summary.mission_committed_total | number:'1.0-0' }}</span>
          <span class="lbl">Missions en cours (XOF)</span>
        </div>
        <div class="kpi">
          <span class="val">{{ summary.total_invoiced | number:'1.0-0' }}</span>
          <span class="lbl">Total facture (XOF)</span>
        </div>
        <div class="kpi pending">
          <span class="val">{{ summary.pending_invoices }}</span>
          <span class="lbl">Factures en attente</span>
        </div>
      </div>

      <mat-card class="deposit-card" *ngIf="!loading">
        <app-deposit-funding-panel
          title="Alimenter le solde caution"
          hint="Le gérant paie via Mobile Money avant d'assigner un employé à une mission reçue."
          submitLabel="Payer via Mobile Money"
          (funded)="onFunded($event)"
        />
      </mat-card>

      <div class="loading" *ngIf="loading"><mat-spinner diameter="36"></mat-spinner></div>

      <mat-tab-group *ngIf="!loading && summary">
        <mat-tab label="Missions ({{ summary.missions_count }})">
          <div class="tab-content">
            <mat-card class="item-card" *ngFor="let m of summary.missions">
              <div>
                <strong>{{ m.title }}</strong>
                <span class="meta">{{ m.budget | number:'1.0-0' }} {{ m.currency }} · {{ m.created_at | date:'shortDate' }}</span>
              </div>
              <mat-chip [class]="'st-' + m.status">{{ missionStatusLabel(m.status) }}</mat-chip>
            </mat-card>
            <p class="empty" *ngIf="!summary.missions.length">Aucune mission</p>
          </div>
        </mat-tab>
        <mat-tab label="Factures ({{ invoices.length }})">
          <div class="tab-content">
            <mat-card class="item-card" *ngFor="let inv of invoices">
              <div>
                <strong>{{ inv.invoice_number }}</strong>
                <span class="meta">{{ inv.total_amount | number:'1.0-0' }} XOF · Echeance {{ inv.due_date | date:'shortDate' }}</span>
              </div>
              <mat-chip [class]="'inv-' + inv.status">{{ invoiceStatusLabel(inv.status) }}</mat-chip>
            </mat-card>
            <p class="empty" *ngIf="!invoices.length">Aucune facture</p>
          </div>
        </mat-tab>
        <mat-tab label="Contrats ({{ contracts.length }})">
          <div class="tab-content">
            <mat-card class="item-card" *ngFor="let c of contracts">
              <div>
                <strong>{{ contractTitle(c) }}</strong>
                <span class="meta">{{ c.start_date | date:'shortDate' }} → {{ c.end_date | date:'shortDate' }} · {{ c.monthly_fee | number:'1.0-0' }} XOF/mois</span>
              </div>
              <mat-chip>{{ c.status }}</mat-chip>
            </mat-card>
            <p class="empty" *ngIf="!contracts.length">Aucun contrat</p>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .page-container { max-width: 960px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;
      h1 { margin: 0 0 4px; display: flex; align-items: center; gap: 8px; font-size: 22px; }
      p { margin: 0; color: #6b7280; font-size: 14px; }
    }
    .kpi-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
    .kpi { background: #fff; border-radius: 12px; padding: 16px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      .val { font-size: 20px; font-weight: 700; display: block; } .lbl { font-size: 11px; color: #6b7280; }
      &.deposit .val { color: #3CB371; } &.locked .val { color: #6C5CE7; }
      &.spent .val { color: #00b894; } &.committed .val { color: #6C5CE7; }
      &.pending .val { color: #f59e0b; }
    }
    .deposit-card { padding: 20px; margin-bottom: 24px;
      h3 { margin: 0 0 8px; display: flex; align-items: center; gap: 8px; font-size: 16px; }
      .hint { margin: 0 0 16px; color: #6b7280; font-size: 13px; }
    }
    .deposit-form { display: flex; gap: 12px; flex-wrap: wrap; align-items: center;
      .field { flex: 1; min-width: 200px; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; }
    }
    .loading { display: flex; justify-content: center; padding: 40px; }
    .tab-content { padding: 20px 0; }
    .item-card { padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;
      strong { display: block; } .meta { font-size: 12px; color: #9ca3af; }
    }
    .st-completed, .inv-paid { background: #d1fae5 !important; color: #065f46 !important; }
    .st-in_progress, .st-accepted, .st-submitted, .st-funded, .inv-sent { background: #dbeafe !important; color: #1e40af !important; }
    .st-pending, .st-draft, .inv-draft { background: #fef3c7 !important; color: #92400e !important; }
    .empty { text-align: center; color: #9ca3af; padding: 32px; }
    @media (max-width: 768px) { .kpi-row { grid-template-columns: repeat(2, 1fr); } }
  `]
})
export class EnterpriseFinancesComponent implements OnInit {
  summary: EnterpriseFinancesSummary | null = null;
  invoices: EnterpriseInvoice[] = [];
  contracts: EnterpriseContract[] = [];
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
      },
    });
    this.enterpriseService.getFinancesSummary().subscribe({
      next: (data) => {
        this.summary = data;
        this.invoices = data.invoices;
        this.contracts = data.contracts;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  onFunded(res: DepositFundResult): void {
    this.depositBalance = res.deposit_balance;
    if (res.deposit_locked != null) this.depositLocked = res.deposit_locked;
  }

  contractTitle(c: EnterpriseContract): string {
    const types: Record<string, string> = {
      standard: 'Contrat Standard', premium: 'Contrat Premium', enterprise: 'Contrat Entreprise',
    };
    return types[c.contract_type] || c.company_name || c.contract_type || 'Contrat';
  }

  missionStatusLabel(s: string): string {
    const m: Record<string, string> = {
      completed: 'Terminee', in_progress: 'En cours', accepted: 'Acceptee', submitted: 'Soumise',
      funded: 'Financee', pending: 'En attente', draft: 'Brouillon', cancelled: 'Annulee',
    };
    return m[s] || s;
  }

  invoiceStatusLabel(s: string): string {
    const m: Record<string, string> = {
      paid: 'Payee', sent: 'Envoyee', draft: 'Brouillon', overdue: 'En retard', cancelled: 'Annulee',
    };
    return m[s] || s;
  }
}
