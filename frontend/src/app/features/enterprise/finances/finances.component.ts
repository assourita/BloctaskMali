import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
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

type TabKey = 'missions' | 'invoices' | 'contracts';

@Component({
  selector: 'app-enterprise-finances',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, DepositFundingPanelComponent,
  ],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <p class="eyebrow">Trésorerie</p>
          <h1>Finances</h1>
          <p class="sub">Caution, dépenses missions, factures et contrats</p>
        </div>
        <button mat-stroked-button (click)="load()">
          <mat-icon>refresh</mat-icon> Actualiser
        </button>
      </header>

      <div class="metrics" *ngIf="!loading && summary">
        <div class="metric">
          <span class="metric-val">{{ depositBalance | number:'1.0-0' }}</span>
          <span class="metric-lbl">Solde caution</span>
        </div>
        <div class="metric">
          <span class="metric-val">{{ depositLocked | number:'1.0-0' }}</span>
          <span class="metric-lbl">Caution bloquée</span>
        </div>
        <div class="metric">
          <span class="metric-val">{{ summary.mission_spent_total | number:'1.0-0' }}</span>
          <span class="metric-lbl">Dépenses terminées</span>
        </div>
        <div class="metric">
          <span class="metric-val">{{ summary.mission_committed_total | number:'1.0-0' }}</span>
          <span class="metric-lbl">Engagé en cours</span>
        </div>
        <div class="metric">
          <span class="metric-val">{{ summary.total_invoiced | number:'1.0-0' }}</span>
          <span class="metric-lbl">Total facturé</span>
        </div>
        <div class="metric">
          <span class="metric-val">{{ summary.pending_invoices }}</span>
          <span class="metric-lbl">Factures en attente</span>
        </div>
      </div>

      <section class="panel payroll-cta" *ngIf="!loading">
        <div>
          <strong>Salaires des employés</strong>
          <p>Gérez la paie, les fiches individuelles, les stats de travail et l’historique des versements.</p>
        </div>
        <a mat-flat-button color="primary" routerLink="/enterprise/payroll">
          <mat-icon>payments</mat-icon> Ouvrir Salaires
        </a>
      </section>

      <section class="panel deposit" *ngIf="!loading">
        <app-deposit-funding-panel
          title="Alimenter le solde caution"
          hint="Le gérant paie via Mobile Money avant d'assigner un employé à une mission reçue."
          submitLabel="Payer via Mobile Money"
          (funded)="onFunded($event)"
        />
      </section>

      <div class="loading" *ngIf="loading"><mat-spinner diameter="36"></mat-spinner></div>

      <ng-container *ngIf="!loading && summary">
        <div class="tabs">
          <button type="button" [class.active]="tab === 'missions'" (click)="tab = 'missions'">
            Missions ({{ summary.missions_count }})
          </button>
          <button type="button" [class.active]="tab === 'invoices'" (click)="tab = 'invoices'">
            Factures ({{ invoices.length }})
          </button>
          <button type="button" [class.active]="tab === 'contracts'" (click)="tab = 'contracts'">
            Contrats ({{ contracts.length }})
          </button>
        </div>

        <section class="panel" *ngIf="tab === 'missions'">
          <div class="row" *ngFor="let m of summary.missions">
            <div>
              <strong>{{ m.title }}</strong>
              <span class="meta">{{ m.budget | number:'1.0-0' }} {{ m.currency }} · {{ m.created_at | date:'mediumDate' }}</span>
            </div>
            <span class="status" [attr.data-status]="m.status">{{ missionStatusLabel(m.status) }}</span>
          </div>
          <p class="empty" *ngIf="!summary.missions.length">Aucune mission</p>
        </section>

        <section class="panel" *ngIf="tab === 'invoices'">
          <div class="row" *ngFor="let inv of invoices">
            <div>
              <strong>{{ inv.invoice_number }}</strong>
              <span class="meta">{{ inv.total_amount | number:'1.0-0' }} XOF · Échéance {{ inv.due_date | date:'mediumDate' }}</span>
            </div>
            <span class="status" [attr.data-status]="inv.status">{{ invoiceStatusLabel(inv.status) }}</span>
          </div>
          <p class="empty" *ngIf="!invoices.length">Aucune facture</p>
        </section>

        <section class="panel" *ngIf="tab === 'contracts'">
          <div class="row" *ngFor="let c of contracts">
            <div>
              <strong>{{ contractTitle(c) }}</strong>
              <span class="meta">{{ c.start_date | date:'mediumDate' }} → {{ c.end_date | date:'mediumDate' }} · {{ c.monthly_fee | number:'1.0-0' }} XOF/mois</span>
            </div>
            <span class="status">{{ c.status }}</span>
          </div>
          <p class="empty" *ngIf="!contracts.length">Aucun contrat</p>
        </section>
      </ng-container>
    </div>
  `,
  styles: [`
    .page {
      max-width: 1080px; margin: 0 auto; padding: 28px 24px 56px; color: #0f172a;
    }
    .page-header {
      display: flex; justify-content: space-between; align-items: flex-end; gap: 16px;
      flex-wrap: wrap; margin-bottom: 20px;
    }
    .eyebrow {
      margin: 0 0 4px; font-size: 11px; font-weight: 600; letter-spacing: 0.08em;
      text-transform: uppercase; color: #64748b;
    }
    h1 { margin: 0 0 4px; font-size: 26px; font-weight: 700; letter-spacing: -0.02em; }
    .sub { margin: 0; color: #64748b; font-size: 14px; }

    .metrics {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px;
    }
    .metric {
      border: 1px solid #e2e8f0; background: #fff; border-radius: 10px; padding: 14px 16px;
    }
    .metric-val { display: block; font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
    .metric-lbl { display: block; margin-top: 4px; font-size: 12px; color: #64748b; }

    .panel {
      border: 1px solid #e2e8f0; background: #fff; border-radius: 12px; padding: 16px 18px; margin-bottom: 16px;
      &.deposit { padding: 8px 12px; }
      &.payroll-cta {
        display: flex; justify-content: space-between; gap: 16px; align-items: center; flex-wrap: wrap;
        background: #f8fafc;
        strong { display: block; font-size: 15px; margin-bottom: 4px; }
        p { margin: 0; color: #64748b; font-size: 13px; max-width: 520px; }
      }
    }
    .loading { display: flex; justify-content: center; padding: 40px; }

    .tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
    .tabs button {
      border: 1px solid #e2e8f0; background: #fff; color: #64748b;
      border-radius: 8px; padding: 8px 12px; font-size: 13px; font-weight: 600; cursor: pointer;
      &.active { background: #0f172a; border-color: #0f172a; color: #fff; }
    }

    .row {
      display: flex; justify-content: space-between; gap: 12px; align-items: center;
      padding: 12px 0; border-bottom: 1px solid #f1f5f9; flex-wrap: wrap;
      &:last-child { border-bottom: 0; }
      strong { display: block; font-size: 14px; font-weight: 650; }
      .meta { display: block; margin-top: 2px; font-size: 12px; color: #94a3b8; }
    }
    .status {
      display: inline-block; font-size: 11px; font-weight: 600; padding: 3px 8px;
      border-radius: 4px; background: #f1f5f9; color: #475569; text-transform: capitalize;
      &[data-status="completed"], &[data-status="paid"] { background: #ecfdf5; color: #166534; }
      &[data-status="in_progress"], &[data-status="accepted"], &[data-status="submitted"],
      &[data-status="funded"], &[data-status="sent"] { background: #f8fafc; color: #334155; border: 1px solid #e2e8f0; }
      &[data-status="pending"], &[data-status="draft"], &[data-status="overdue"] { background: #fff7ed; color: #9a3412; }
    }
    .empty { margin: 0; padding: 24px 4px; text-align: center; color: #94a3b8; font-size: 13px; }

    @media (max-width: 768px) {
      .page { padding: 16px 16px 40px; }
      .metrics { grid-template-columns: repeat(2, 1fr); }
      h1 { font-size: 22px; }
    }
  `],
})
export class EnterpriseFinancesComponent implements OnInit {
  summary: EnterpriseFinancesSummary | null = null;
  invoices: EnterpriseInvoice[] = [];
  contracts: EnterpriseContract[] = [];
  loading = true;
  depositBalance = 0;
  depositLocked = 0;
  tab: TabKey = 'missions';

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
      completed: 'Terminée', in_progress: 'En cours', accepted: 'Acceptée', submitted: 'Soumise',
      funded: 'Financée', pending: 'En attente', draft: 'Brouillon', cancelled: 'Annulée',
    };
    return m[s] || s;
  }

  invoiceStatusLabel(s: string): string {
    const m: Record<string, string> = {
      paid: 'Payée', sent: 'Envoyée', draft: 'Brouillon', overdue: 'En retard', cancelled: 'Annulée',
    };
    return m[s] || s;
  }
}
