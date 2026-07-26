import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  EnterpriseService,
  EnterprisePayrollSettings,
  PayrollDashboard,
  PayrollEmployeeStats,
  PayrollPeriod,
} from '../../../core/services/enterprise.service';

type TabKey = 'employees' | 'history' | 'periods' | 'settings';

@Component({
  selector: 'app-enterprise-payroll',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
  ],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <p class="eyebrow">Ressources humaines</p>
          <h1>Salaires & paie</h1>
          <p class="sub">Gains par mission, périodes, historique et fiches employés</p>
        </div>
        <div class="header-actions">
          <button mat-stroked-button (click)="load()" [disabled]="loading">
            <mat-icon>refresh</mat-icon> Actualiser
          </button>
          <button mat-flat-button color="primary" (click)="generatePeriod()" [disabled]="busy">
            <mat-icon>playlist_add_check</mat-icon> Générer la période
          </button>
        </div>
      </header>

      <div class="loading" *ngIf="loading"><mat-spinner diameter="36"></mat-spinner></div>

      <ng-container *ngIf="!loading && dash">
        <div class="metrics">
          <div class="metric">
            <span class="metric-val">{{ dash.summary.pending_total | number:'1.0-0' }}</span>
            <span class="metric-lbl">À verser (XOF)</span>
          </div>
          <div class="metric">
            <span class="metric-val">{{ dash.summary.paid_total | number:'1.0-0' }}</span>
            <span class="metric-lbl">Déjà payé</span>
          </div>
          <div class="metric">
            <span class="metric-val">{{ dash.summary.lifetime_total | number:'1.0-0' }}</span>
            <span class="metric-lbl">Total cumulé</span>
          </div>
          <div class="metric">
            <span class="metric-val">{{ dash.summary.active_employees }}</span>
            <span class="metric-lbl">Employés actifs</span>
          </div>
          <div class="metric">
            <span class="metric-val">{{ dash.summary.pending_earnings_count }}</span>
            <span class="metric-lbl">Gains en attente</span>
          </div>
          <div class="metric">
            <span class="metric-val">{{ dash.summary.periods_count }}</span>
            <span class="metric-lbl">Périodes</span>
          </div>
        </div>

        <p class="flash error" *ngIf="error">{{ error }}</p>
        <p class="flash ok" *ngIf="ok">{{ ok }}</p>

        <div class="tabs">
          <button type="button" [class.active]="tab === 'employees'" (click)="tab = 'employees'">Employés</button>
          <button type="button" [class.active]="tab === 'history'" (click)="tab = 'history'">Historique paiements</button>
          <button type="button" [class.active]="tab === 'periods'" (click)="tab = 'periods'">Périodes</button>
          <button type="button" [class.active]="tab === 'settings'" (click)="tab = 'settings'">Règles</button>
        </div>

        <section class="panel" *ngIf="tab === 'employees'">
          <div class="toolbar">
            <input class="search" [(ngModel)]="search" placeholder="Rechercher un employé…" />
          </div>
          <div class="table-head">
            <span>Employé</span>
            <span>Missions</span>
            <span>Solo / Équipe</span>
            <span>En attente</span>
            <span>Payé</span>
            <span></span>
          </div>
          <div class="table-row" *ngFor="let e of filteredEmployees()">
            <div>
              <strong>{{ e.first_name }} {{ e.last_name }}</strong>
              <span class="meta">{{ e.position || 'Agent' }} · coef. {{ e.pay_weight }}</span>
            </div>
            <div>{{ e.missions_completed_assignments || e.missions_completed_profile }}</div>
            <div>{{ e.solo_missions }} / {{ e.team_missions }}</div>
            <div class="pending">{{ e.earnings_pending | number:'1.0-0' }}</div>
            <div>{{ e.earnings_paid | number:'1.0-0' }}</div>
            <div class="row-actions">
              <a mat-stroked-button [routerLink]="['/enterprise/payroll', e.employee_id]">
                Fiche salaire
              </a>
            </div>
          </div>
          <p class="empty" *ngIf="!filteredEmployees().length">Aucun employé</p>
        </section>

        <section class="panel" *ngIf="tab === 'history'">
          <div class="table-head history">
            <span>Employé</span>
            <span>Période</span>
            <span>Missions</span>
            <span>Montant</span>
            <span>Payé le</span>
            <span>Référence</span>
          </div>
          <div class="table-row history" *ngFor="let h of dash.payment_history">
            <div>
              <strong>{{ h.employee_name }}</strong>
              <a class="meta link" [routerLink]="['/enterprise/payroll', h.employee_id]">Voir fiche</a>
            </div>
            <div>{{ h.period_start | date:'mediumDate' }} → {{ h.period_end | date:'mediumDate' }}</div>
            <div>{{ h.missions_count }} (S{{ h.solo_missions }}/E{{ h.team_missions }})</div>
            <div><strong>{{ h.net_amount | number:'1.0-0' }} XOF</strong></div>
            <div>{{ h.paid_at ? (h.paid_at | date:'short') : '—' }}</div>
            <div class="ref">{{ h.payment_reference || '—' }}</div>
          </div>
          <p class="empty" *ngIf="!dash.payment_history.length">Aucun paiement enregistré</p>
        </section>

        <section class="panel" *ngIf="tab === 'periods'">
          <div class="period" *ngFor="let p of periods">
            <div class="period-head">
              <div>
                <strong>{{ p.period_start | date:'mediumDate' }} → {{ p.period_end | date:'mediumDate' }}</strong>
                <span class="meta">
                  {{ freqLabel(p.frequency) }} · {{ modeLabel(p.payment_mode) }} ·
                  {{ p.employees_count }} employé(s) · {{ p.missions_count }} mission(s)
                </span>
              </div>
              <div class="period-actions">
                <span class="status" [attr.data-status]="p.status">{{ statusLabel(p.status) }}</span>
                <strong>{{ p.total_amount | number:'1.0-0' }} XOF</strong>
                <button mat-stroked-button *ngIf="canEditPeriod(p)" (click)="startEdit(p)" [disabled]="busy">
                  Modifier
                </button>
                <button mat-stroked-button *ngIf="p.status === 'pending_approval'" (click)="approve(p)" [disabled]="busy">
                  Approuver
                </button>
                <button mat-flat-button color="primary"
                  *ngIf="p.status === 'approved' || p.status === 'pending_approval'"
                  (click)="pay(p)" [disabled]="busy">
                  Payer
                </button>
                <button mat-stroked-button color="warn" *ngIf="p.status !== 'cancelled'" (click)="removePeriod(p)" [disabled]="busy">
                  Supprimer
                </button>
              </div>
            </div>

            <div class="edit-box" *ngIf="editingPeriodId === p.id">
              <div class="form-grid">
                <label>
                  <span>Début</span>
                  <input type="date" [(ngModel)]="editForm.period_start" />
                </label>
                <label>
                  <span>Fin</span>
                  <input type="date" [(ngModel)]="editForm.period_end" />
                </label>
                <label>
                  <span>Fréquence</span>
                  <select [(ngModel)]="editForm.frequency">
                    <option value="weekly">Hebdomadaire</option>
                    <option value="monthly">Mensuelle</option>
                  </select>
                </label>
                <label>
                  <span>Mode</span>
                  <select [(ngModel)]="editForm.payment_mode">
                    <option value="manual">Manuel</option>
                    <option value="automatic">Automatique</option>
                  </select>
                </label>
                <label class="full">
                  <span>Notes</span>
                  <input type="text" [(ngModel)]="editForm.notes" placeholder="Notes internes" />
                </label>
              </div>
              <div class="actions">
                <button mat-flat-button color="primary" (click)="savePeriod(p)" [disabled]="busy">Enregistrer</button>
                <button mat-stroked-button (click)="cancelEdit()" [disabled]="busy">Annuler</button>
              </div>
            </div>

            <div class="line" *ngFor="let line of p.lines || []">
              <a [routerLink]="['/enterprise/payroll', line.employee_id]">{{ line.employee_name }}</a>
              <span>{{ line.missions_count }} mission(s)</span>
              <span>{{ line.net_amount | number:'1.0-0' }} XOF</span>
              <span class="status" [attr.data-status]="line.status">{{ line.status }}</span>
            </div>
          </div>
          <p class="empty" *ngIf="!periods.length">Aucune période — générez-en une</p>
        </section>

        <section class="panel" *ngIf="tab === 'settings' && settings">
          <h3>Règles de calcul</h3>
          <p class="hint">
            Pool employés = net mission × %. En équipe, le lead a un poids multiplié.
            Chaque employé a aussi un coefficient individuel sur sa fiche.
          </p>
          <div class="form-grid">
            <label>
              <span>Paie activée</span>
              <select [(ngModel)]="settings.is_enabled">
                <option [ngValue]="true">Oui</option>
                <option [ngValue]="false">Non</option>
              </select>
            </label>
            <label>
              <span>Fréquence</span>
              <select [(ngModel)]="settings.frequency">
                <option value="weekly">Hebdomadaire</option>
                <option value="monthly">Mensuelle</option>
              </select>
            </label>
            <label>
              <span>Mode de paiement</span>
              <select [(ngModel)]="settings.payment_mode">
                <option value="manual">Manuel (validation gérant)</option>
                <option value="automatic">Automatique</option>
              </select>
            </label>
            <label>
              <span>% redistribué aux employés</span>
              <input type="number" min="1" max="100" [(ngModel)]="settings.employee_pool_percent" />
            </label>
            <label>
              <span>Multiplicateur lead (équipe)</span>
              <input type="number" min="1" max="5" step="0.1" [(ngModel)]="settings.lead_weight_multiplier" />
            </label>
            <label class="full">
              <span>Notes</span>
              <input type="text" [(ngModel)]="settings.notes" placeholder="Notes sur les règles" />
            </label>
          </div>
          <div class="actions">
            <button mat-flat-button color="primary" (click)="saveSettings()" [disabled]="busy">
              Enregistrer les règles
            </button>
            <button mat-stroked-button color="warn" (click)="resetSettings()" [disabled]="busy">
              Réinitialiser / supprimer règles
            </button>
          </div>
        </section>
      </ng-container>
    </div>
  `,
  styles: [`
    .page { max-width: 1120px; margin: 0 auto; padding: 28px 24px 56px; color: #0f172a; }
    .page-header {
      display: flex; justify-content: space-between; align-items: flex-end; gap: 16px;
      flex-wrap: wrap; margin-bottom: 20px;
    }
    .eyebrow {
      margin: 0 0 4px; font-size: 11px; font-weight: 600; letter-spacing: 0.08em;
      text-transform: uppercase; color: #64748b;
    }
    h1 { margin: 0 0 4px; font-size: 26px; font-weight: 700; letter-spacing: -0.02em; }
    h3 { margin: 0 0 8px; font-size: 15px; font-weight: 700; }
    .sub, .hint, .meta { color: #64748b; font-size: 13px; }
    .sub { margin: 0; font-size: 14px; }
    .hint { margin: 0 0 14px; line-height: 1.45; }
    .header-actions { display: flex; flex-wrap: wrap; gap: 8px; }
    .loading { display: flex; justify-content: center; padding: 48px; }

    .metrics {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px;
    }
    .metric {
      border: 1px solid #e2e8f0; background: #fff; border-radius: 10px; padding: 14px 16px;
    }
    .metric-val { display: block; font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
    .metric-lbl { display: block; margin-top: 4px; font-size: 12px; color: #64748b; }

    .tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
    .tabs button {
      border: 1px solid #e2e8f0; background: #fff; color: #64748b;
      border-radius: 8px; padding: 8px 12px; font-size: 13px; font-weight: 600; cursor: pointer;
      &.active { background: #0f172a; border-color: #0f172a; color: #fff; }
    }

    .panel {
      border: 1px solid #e2e8f0; background: #fff; border-radius: 12px; padding: 16px 18px;
    }
    .toolbar { margin-bottom: 12px; }
    .search {
      width: 100%; max-width: 320px; border: 1px solid #e2e8f0; border-radius: 8px;
      padding: 9px 12px; font-size: 14px;
    }

    .table-head, .table-row {
      display: grid; grid-template-columns: 1.6fr 0.7fr 0.9fr 0.8fr 0.8fr auto;
      gap: 10px; align-items: center; padding: 10px 0; border-bottom: 1px solid #f1f5f9;
    }
    .table-head.history, .table-row.history {
      grid-template-columns: 1.3fr 1.2fr 0.9fr 0.8fr 0.9fr 1fr;
    }
    .table-head { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #94a3b8; }
    .table-row strong { display: block; font-size: 14px; }
    .table-row .meta { display: block; margin-top: 2px; font-size: 12px; }
    .table-row .pending { color: #9a3412; font-weight: 650; }
    .row-actions { display: flex; justify-content: flex-end; }
    .link { color: #166534; text-decoration: none; }
    .ref { font-size: 11px; color: #94a3b8; word-break: break-all; }

    .period {
      border: 1px solid #f1f5f9; border-radius: 10px; padding: 12px; margin-bottom: 10px; background: #fafafa;
    }
    .period-head {
      display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; align-items: center;
      margin-bottom: 8px;
    }
    .period-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .line {
      display: grid; grid-template-columns: 1.4fr 1fr 1fr auto; gap: 8px; padding: 6px 0;
      border-top: 1px solid #f1f5f9; font-size: 13px; align-items: center;
      a { color: #0f172a; font-weight: 600; text-decoration: none; }
    }

    .form-grid {
      display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 14px;
    }
    .form-grid label { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: #64748b; }
    .form-grid label.full { grid-column: 1 / -1; }
    .form-grid input, .form-grid select {
      border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; font-size: 14px; color: #0f172a;
    }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; }
    .edit-box {
      margin: 8px 0 12px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff;
    }

    .status {
      display: inline-block; font-size: 11px; font-weight: 600; padding: 3px 8px;
      border-radius: 4px; background: #f1f5f9; color: #475569; text-transform: capitalize;
      &[data-status="paid"], &[data-status="approved"] { background: #ecfdf5; color: #166534; }
      &[data-status="pending_approval"], &[data-status="pending"] { background: #fff7ed; color: #9a3412; }
      &[data-status="cancelled"] { background: #f1f5f9; color: #64748b; }
    }
    .empty { margin: 0; padding: 28px 4px; text-align: center; color: #94a3b8; font-size: 13px; }
    .flash { margin: 0 0 12px; font-size: 13px; }
    .flash.error { color: #b91c1c; }
    .flash.ok { color: #166534; }

    @media (max-width: 900px) {
      .metrics { grid-template-columns: repeat(2, 1fr); }
      .table-head { display: none; }
      .table-row, .table-row.history {
        grid-template-columns: 1fr; gap: 4px; padding: 14px 0;
      }
      .form-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class EnterprisePayrollComponent implements OnInit {
  loading = true;
  busy = false;
  tab: TabKey = 'employees';
  search = '';
  error = '';
  ok = '';

  dash: PayrollDashboard | null = null;
  settings: EnterprisePayrollSettings | null = null;
  periods: PayrollPeriod[] = [];
  editingPeriodId: string | null = null;
  editForm = {
    period_start: '',
    period_end: '',
    frequency: 'weekly',
    payment_mode: 'manual',
    notes: '',
  };

  constructor(private enterpriseService: EnterpriseService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.enterpriseService.getPayrollDashboard().subscribe({
      next: (d) => {
        this.dash = d;
        this.settings = { ...d.settings };
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = 'Impossible de charger la paie';
      },
    });
    this.enterpriseService.getPayrollPeriods().subscribe({
      next: (p) => { this.periods = p; },
    });
  }

  filteredEmployees(): PayrollEmployeeStats[] {
    const list = this.dash?.employees || [];
    const q = this.search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((e) =>
      `${e.first_name} ${e.last_name} ${e.email} ${e.position}`.toLowerCase().includes(q),
    );
  }

  canEditPeriod(p: PayrollPeriod): boolean {
    return p.status !== 'paid' && p.status !== 'cancelled';
  }

  startEdit(p: PayrollPeriod): void {
    this.editingPeriodId = p.id;
    this.editForm = {
      period_start: (p.period_start || '').slice(0, 10),
      period_end: (p.period_end || '').slice(0, 10),
      frequency: p.frequency || 'weekly',
      payment_mode: p.payment_mode || 'manual',
      notes: p.notes || '',
    };
  }

  cancelEdit(): void {
    this.editingPeriodId = null;
  }

  savePeriod(p: PayrollPeriod): void {
    this.busy = true;
    this.error = '';
    this.ok = '';
    this.enterpriseService.updatePayrollPeriod(p.id, { ...this.editForm }).subscribe({
      next: () => {
        this.busy = false;
        this.editingPeriodId = null;
        this.ok = 'Période mise à jour';
        this.load();
      },
      error: (err) => {
        this.busy = false;
        this.error = err?.error?.error || 'Modification impossible';
      },
    });
  }

  removePeriod(p: PayrollPeriod): void {
    const paid = p.status === 'paid';
    const msg = paid
      ? 'Cette période est déjà payée. Annuler sans rembourser les wallets ?'
      : 'Supprimer cette période ? Les gains reviendront en « à verser ».';
    if (!confirm(msg)) return;

    this.busy = true;
    this.error = '';
    this.ok = '';
    this.enterpriseService.deletePayrollPeriod(p.id, paid).subscribe({
      next: (res) => {
        this.busy = false;
        this.ok = res.deleted ? 'Période supprimée' : 'Période annulée';
        if (this.editingPeriodId === p.id) this.editingPeriodId = null;
        this.load();
      },
      error: (err) => {
        this.busy = false;
        this.error = err?.error?.error || 'Suppression impossible';
      },
    });
  }

  saveSettings(): void {
    if (!this.settings) return;
    this.busy = true;
    this.error = '';
    this.ok = '';
    this.enterpriseService.updatePayrollSettings(this.settings).subscribe({
      next: (s) => {
        this.settings = s;
        this.busy = false;
        this.ok = 'Règles enregistrées';
        this.load();
      },
      error: (err) => {
        this.busy = false;
        this.error = err?.error?.error || 'Enregistrement impossible';
      },
    });
  }

  resetSettings(): void {
    if (!confirm('Réinitialiser les règles aux valeurs par défaut ?')) return;
    this.busy = true;
    this.error = '';
    this.ok = '';
    this.enterpriseService.resetPayrollSettings().subscribe({
      next: (s) => {
        this.settings = s;
        this.busy = false;
        this.ok = 'Règles réinitialisées';
        this.load();
      },
      error: (err) => {
        this.busy = false;
        this.error = err?.error?.error || 'Réinitialisation impossible';
      },
    });
  }

  generatePeriod(): void {
    this.busy = true;
    this.error = '';
    this.ok = '';
    this.enterpriseService.generatePayrollPeriod().subscribe({
      next: () => {
        this.busy = false;
        this.ok = 'Période générée';
        this.tab = 'periods';
        this.load();
      },
      error: (err) => {
        this.busy = false;
        this.error = err?.error?.error || 'Génération impossible';
      },
    });
  }

  approve(p: PayrollPeriod): void {
    this.busy = true;
    this.enterpriseService.approvePayrollPeriod(p.id).subscribe({
      next: () => { this.busy = false; this.ok = 'Période approuvée'; this.load(); },
      error: (err) => { this.busy = false; this.error = err?.error?.error || 'Approbation impossible'; },
    });
  }

  pay(p: PayrollPeriod): void {
    this.busy = true;
    this.enterpriseService.payPayrollPeriod(p.id).subscribe({
      next: () => { this.busy = false; this.ok = 'Paie versée'; this.tab = 'history'; this.load(); },
      error: (err) => { this.busy = false; this.error = err?.error?.error || 'Paiement impossible'; },
    });
  }

  freqLabel(s: string): string {
    return s === 'monthly' ? 'Mensuelle' : 'Hebdomadaire';
  }

  modeLabel(s: string): string {
    return s === 'automatic' ? 'Auto' : 'Manuel';
  }

  statusLabel(s: string): string {
    const m: Record<string, string> = {
      draft: 'Brouillon',
      pending_approval: 'À valider',
      approved: 'Approuvée',
      paid: 'Payée',
      cancelled: 'Annulée',
    };
    return m[s] || s;
  }
}
