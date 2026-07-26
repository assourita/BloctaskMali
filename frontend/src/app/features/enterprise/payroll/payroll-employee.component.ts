import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  EnterpriseService,
  PayrollEmployeeDetail,
} from '../../../core/services/enterprise.service';

type DetailTab = 'stats' | 'earnings' | 'payments' | 'missions';

@Component({
  selector: 'app-enterprise-payroll-employee',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
  ],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <a class="back" routerLink="/enterprise/payroll"><mat-icon>arrow_back</mat-icon> Retour aux salaires</a>
          <ng-container *ngIf="detail">
            <h1>{{ detail.employee.first_name }} {{ detail.employee.last_name }}</h1>
            <p class="sub">
              {{ detail.employee.position || 'Agent' }} ·
              coef. {{ detail.employee.pay_weight }} ·
              {{ detail.employee.is_active ? 'Actif' : 'Inactif' }}
            </p>
          </ng-container>
        </div>
        <button mat-stroked-button (click)="load()" [disabled]="loading">
          <mat-icon>refresh</mat-icon> Actualiser
        </button>
      </header>

      <div class="loading" *ngIf="loading"><mat-spinner diameter="36"></mat-spinner></div>
      <p class="error" *ngIf="error">{{ error }}</p>

      <ng-container *ngIf="!loading && detail">
        <div class="metrics">
          <div class="metric">
            <span class="metric-val">{{ detail.employee.earnings_pending | number:'1.0-0' }}</span>
            <span class="metric-lbl">En attente (XOF)</span>
          </div>
          <div class="metric">
            <span class="metric-val">{{ detail.employee.earnings_paid | number:'1.0-0' }}</span>
            <span class="metric-lbl">Déjà payé</span>
          </div>
          <div class="metric">
            <span class="metric-val">{{ detail.employee.earnings_total | number:'1.0-0' }}</span>
            <span class="metric-lbl">Total gains</span>
          </div>
          <div class="metric">
            <span class="metric-val">{{ detail.employee.missions_completed_assignments }}</span>
            <span class="metric-lbl">Missions terminées</span>
          </div>
          <div class="metric">
            <span class="metric-val">{{ detail.employee.solo_missions }}</span>
            <span class="metric-lbl">Solo</span>
          </div>
          <div class="metric">
            <span class="metric-val">{{ detail.employee.team_missions }}</span>
            <span class="metric-lbl">Équipe (lead {{ detail.employee.lead_missions }})</span>
          </div>
        </div>

        <div class="tabs">
          <button type="button" [class.active]="tab === 'stats'" (click)="tab = 'stats'">Stats travail</button>
          <button type="button" [class.active]="tab === 'earnings'" (click)="tab = 'earnings'">Gains missions</button>
          <button type="button" [class.active]="tab === 'payments'" (click)="tab = 'payments'">Historique paiements</button>
          <button type="button" [class.active]="tab === 'missions'" (click)="tab = 'missions'">Affectations</button>
        </div>

        <section class="panel" *ngIf="tab === 'stats'">
          <div class="detail-grid">
            <div><span class="label">Email</span><strong>{{ detail.employee.email || '—' }}</strong></div>
            <div><span class="label">Téléphone</span><strong>{{ detail.employee.phone || '—' }}</strong></div>
            <div><span class="label">Mobile Money paie</span><strong>{{ detail.employee.pay_phone || '—' }}</strong></div>
            <div><span class="label">Coefficient</span><strong>{{ detail.employee.pay_weight }}</strong></div>
            <div><span class="label">Missions assignées</span><strong>{{ detail.employee.missions_assigned }}</strong></div>
            <div><span class="label">Missions terminées</span><strong>{{ detail.employee.missions_completed_assignments }}</strong></div>
            <div><span class="label">Dernier gain</span>
              <strong>{{ detail.employee.last_earning_at ? (detail.employee.last_earning_at | date:'short') : '—' }}</strong>
            </div>
            <div><span class="label">Dernier paiement</span>
              <strong>{{ detail.employee.last_paid_at ? (detail.employee.last_paid_at | date:'short') : '—' }}</strong>
            </div>
          </div>
        </section>

        <section class="panel" *ngIf="tab === 'earnings'">
          <div class="row" *ngFor="let e of detail.earnings">
            <div>
              <strong>{{ e.mission_title || 'Mission' }}</strong>
              <span class="meta">
                {{ e.accrued_at | date:'short' }} ·
                {{ e.is_team ? ('Équipe ×' + e.team_size) : 'Solo' }}
                <ng-container *ngIf="e.is_lead"> · Lead</ng-container>
                · prix {{ e.mission_price | number:'1.0-0' }}
              </span>
            </div>
            <div class="right">
              <strong>{{ e.amount | number:'1.0-0' }} XOF</strong>
              <span class="status" [attr.data-status]="e.status">{{ earningStatus(e.status) }}</span>
            </div>
          </div>
          <p class="empty" *ngIf="!detail.earnings.length">Aucun gain</p>
        </section>

        <section class="panel" *ngIf="tab === 'payments'">
          <div class="row" *ngFor="let p of detail.payments">
            <div>
              <strong>{{ p.period_start | date:'mediumDate' }} → {{ p.period_end | date:'mediumDate' }}</strong>
              <span class="meta">
                {{ p.missions_count }} mission(s) · solo {{ p.solo_missions }} · équipe {{ p.team_missions }}
                · {{ p.payment_reference || 'sans réf.' }}
              </span>
            </div>
            <div class="right">
              <strong>{{ p.net_amount | number:'1.0-0' }} XOF</strong>
              <span class="status" [attr.data-status]="p.status">{{ p.status }}</span>
              <span class="meta">{{ p.paid_at ? (p.paid_at | date:'short') : '—' }}</span>
            </div>
          </div>
          <p class="empty" *ngIf="!detail.payments.length">Aucun paiement</p>
        </section>

        <section class="panel" *ngIf="tab === 'missions'">
          <div class="row" *ngFor="let a of detail.assignments">
            <div>
              <strong>{{ a.mission_title || 'Mission' }}</strong>
              <span class="meta">
                Assigné {{ a.assigned_at | date:'short' }}
                <ng-container *ngIf="a.is_lead"> · Lead</ng-container>
                <ng-container *ngIf="a.completed_at"> · Terminé {{ a.completed_at | date:'short' }}</ng-container>
              </span>
            </div>
            <span class="status" [attr.data-status]="a.mission_status">{{ a.mission_status }}</span>
          </div>
          <p class="empty" *ngIf="!detail.assignments.length">Aucune affectation</p>
        </section>
      </ng-container>
    </div>
  `,
  styles: [`
    .page { max-width: 960px; margin: 0 auto; padding: 28px 24px 56px; color: #0f172a; }
    .page-header {
      display: flex; justify-content: space-between; align-items: flex-end; gap: 16px;
      flex-wrap: wrap; margin-bottom: 20px;
    }
    .back {
      display: inline-flex; align-items: center; gap: 4px; color: #64748b; text-decoration: none;
      font-size: 13px; font-weight: 600; margin-bottom: 8px;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }
    h1 { margin: 0 0 4px; font-size: 26px; font-weight: 700; letter-spacing: -0.02em; }
    .sub, .meta { color: #64748b; font-size: 13px; }
    .sub { margin: 0; font-size: 14px; }
    .loading { display: flex; justify-content: center; padding: 48px; }
    .error { color: #b91c1c; }

    .metrics {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px;
    }
    .metric {
      border: 1px solid #e2e8f0; background: #fff; border-radius: 10px; padding: 14px 16px;
    }
    .metric-val { display: block; font-size: 20px; font-weight: 700; }
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
    .detail-grid {
      display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px;
    }
    .label { display: block; font-size: 12px; color: #94a3b8; margin-bottom: 4px; }
    .row {
      display: flex; justify-content: space-between; gap: 12px; align-items: flex-start;
      padding: 12px 0; border-bottom: 1px solid #f1f5f9; flex-wrap: wrap;
      &:last-child { border-bottom: 0; }
      strong { display: block; font-size: 14px; }
      .meta { display: block; margin-top: 2px; font-size: 12px; }
      .right { text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
    }
    .status {
      display: inline-block; font-size: 11px; font-weight: 600; padding: 3px 8px;
      border-radius: 4px; background: #f1f5f9; color: #475569; text-transform: capitalize;
      &[data-status="paid"], &[data-status="completed"] { background: #ecfdf5; color: #166534; }
      &[data-status="accrued"], &[data-status="included"], &[data-status="pending"] { background: #fff7ed; color: #9a3412; }
    }
    .empty { margin: 0; padding: 24px 4px; text-align: center; color: #94a3b8; font-size: 13px; }

    @media (max-width: 768px) {
      .metrics, .detail-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class EnterprisePayrollEmployeeComponent implements OnInit {
  loading = true;
  error = '';
  detail: PayrollEmployeeDetail | null = null;
  tab: DetailTab = 'stats';
  private employeeId = '';

  constructor(
    private route: ActivatedRoute,
    private enterpriseService: EnterpriseService,
  ) {}

  ngOnInit(): void {
    this.employeeId = this.route.snapshot.paramMap.get('employeeId') || '';
    this.load();
  }

  load(): void {
    if (!this.employeeId) {
      this.error = 'Employé introuvable';
      this.loading = false;
      return;
    }
    this.loading = true;
    this.error = '';
    this.enterpriseService.getPayrollEmployeeDetail(this.employeeId).subscribe({
      next: (d) => {
        this.detail = d;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = 'Impossible de charger la fiche salaire';
      },
    });
  }

  earningStatus(s: string): string {
    const m: Record<string, string> = {
      accrued: 'Accru',
      included: 'En période',
      paid: 'Payé',
      cancelled: 'Annulé',
    };
    return m[s] || s;
  }
}
