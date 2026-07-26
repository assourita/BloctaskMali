import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  EnterpriseService,
  ProviderEnterprisePayroll,
} from '../../../core/services/enterprise.service';

type TabKey = 'overview' | 'earnings' | 'payments' | 'missions';

@Component({
  selector: 'app-provider-enterprise-payroll',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatSnackBarModule,
  ],
  template: `
    <div class="page">
      <a class="back" [routerLink]="['/provider/enterprises', enterpriseId]">
        <mat-icon>arrow_back</mat-icon> Retour à l’entreprise
      </a>

      <div class="loading" *ngIf="loading"><mat-spinner diameter="40"></mat-spinner></div>
      <p class="error" *ngIf="error">{{ error }}</p>

      <ng-container *ngIf="!loading && data as d">
        <header class="hero">
          <div>
            <p class="eyebrow">Rémunération</p>
            <h1>Mes salaires</h1>
            <p class="sub">{{ d.enterprise?.company_name || 'Entreprise' }}</p>
          </div>
          <button mat-stroked-button (click)="load()" [disabled]="busy">
            <mat-icon>refresh</mat-icon> Actualiser
          </button>
        </header>

        <div class="metrics">
          <div class="metric">
            <span class="val">{{ d.employee.earnings_pending | number:'1.0-0' }}</span>
            <span class="lbl">En attente (XOF)</span>
          </div>
          <div class="metric">
            <span class="val">{{ d.employee.earnings_paid | number:'1.0-0' }}</span>
            <span class="lbl">Déjà payé</span>
          </div>
          <div class="metric">
            <span class="val">{{ d.employee.earnings_total | number:'1.0-0' }}</span>
            <span class="lbl">Total gains</span>
          </div>
          <div class="metric">
            <span class="val">{{ d.employee.missions_completed_assignments }}</span>
            <span class="lbl">Missions terminées</span>
          </div>
          <div class="metric">
            <span class="val">{{ d.employee.solo_missions }}</span>
            <span class="lbl">Solo</span>
          </div>
          <div class="metric">
            <span class="val">{{ d.employee.team_missions }}</span>
            <span class="lbl">Équipe (lead {{ d.employee.lead_missions }})</span>
          </div>
        </div>

        <section class="panel">
          <h2>Coordonnées de paie</h2>
          <p class="hint">
            Coefficient fixé par l’entreprise : <strong>{{ d.employee.pay_weight }}</strong>.
            Vous pouvez mettre à jour votre numéro Mobile Money pour les versements.
          </p>
          <div class="pay-form">
            <label>
              <span>Mobile Money paie</span>
              <input [(ngModel)]="payPhone" placeholder="+223…" />
            </label>
            <button mat-flat-button color="primary" (click)="savePhone()" [disabled]="busy">
              Enregistrer
            </button>
          </div>
        </section>

        <div class="tabs">
          <button type="button" [class.active]="tab === 'overview'" (click)="tab = 'overview'">Aperçu</button>
          <button type="button" [class.active]="tab === 'earnings'" (click)="tab = 'earnings'">Gains missions</button>
          <button type="button" [class.active]="tab === 'payments'" (click)="tab = 'payments'">Historique paiements</button>
          <button type="button" [class.active]="tab === 'missions'" (click)="tab = 'missions'">Affectations</button>
        </div>

        <section class="panel" *ngIf="tab === 'overview'">
          <div class="detail-grid">
            <div><span class="label">Poste</span><strong>{{ d.employee.position || '—' }}</strong></div>
            <div><span class="label">Rôle</span><strong>{{ d.employee.role }}</strong></div>
            <div><span class="label">Dernier gain</span>
              <strong>{{ d.employee.last_earning_at ? (d.employee.last_earning_at | date:'short') : '—' }}</strong>
            </div>
            <div><span class="label">Dernier paiement</span>
              <strong>{{ d.employee.last_paid_at ? (d.employee.last_paid_at | date:'short') : '—' }}</strong>
            </div>
          </div>
        </section>

        <section class="panel" *ngIf="tab === 'earnings'">
          <div class="row" *ngFor="let e of d.earnings">
            <div>
              <strong>{{ e.mission_title || 'Mission' }}</strong>
              <span class="meta">
                {{ e.accrued_at | date:'short' }} ·
                {{ e.is_team ? ('Équipe ×' + e.team_size) : 'Solo' }}
                <ng-container *ngIf="e.is_lead"> · Lead</ng-container>
              </span>
            </div>
            <div class="right">
              <strong>{{ e.amount | number:'1.0-0' }} XOF</strong>
              <span class="status" [attr.data-status]="e.status">{{ earningStatus(e.status) }}</span>
            </div>
          </div>
          <p class="empty" *ngIf="!d.earnings.length">Aucun gain pour le moment</p>
        </section>

        <section class="panel" *ngIf="tab === 'payments'">
          <div class="row" *ngFor="let p of d.payments">
            <div>
              <strong>{{ p.period_start | date:'mediumDate' }} → {{ p.period_end | date:'mediumDate' }}</strong>
              <span class="meta">
                {{ p.missions_count }} mission(s) · {{ p.payment_reference || 'sans réf.' }}
              </span>
            </div>
            <div class="right">
              <strong>{{ p.net_amount | number:'1.0-0' }} XOF</strong>
              <span class="status" [attr.data-status]="p.status">{{ p.status }}</span>
              <span class="meta">{{ p.paid_at ? (p.paid_at | date:'short') : '—' }}</span>
            </div>
          </div>
          <p class="empty" *ngIf="!d.payments.length">Aucun paiement reçu</p>
        </section>

        <section class="panel" *ngIf="tab === 'missions'">
          <div class="row" *ngFor="let a of d.assignments">
            <div>
              <a [routerLink]="['/provider/missions', a.mission_id]"><strong>{{ a.mission_title || 'Mission' }}</strong></a>
              <span class="meta">
                Assigné {{ a.assigned_at | date:'short' }}
                <ng-container *ngIf="a.is_lead"> · Lead</ng-container>
              </span>
            </div>
            <span class="status" [attr.data-status]="a.mission_status">{{ a.mission_status }}</span>
          </div>
          <p class="empty" *ngIf="!d.assignments.length">Aucune affectation</p>
        </section>
      </ng-container>
    </div>
  `,
  styles: [`
    .page { max-width: 920px; margin: 0 auto; padding: 24px 24px 56px; color: #0f172a; }
    .back {
      display: inline-flex; align-items: center; gap: 4px; color: #64748b; text-decoration: none;
      font-size: 13px; font-weight: 600; margin-bottom: 16px;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      &:hover { color: #16a34a; }
    }
    .loading { display: flex; justify-content: center; padding: 48px; }
    .error { color: #b91c1c; }
    .hero {
      display: flex; justify-content: space-between; gap: 16px; align-items: flex-end;
      flex-wrap: wrap; margin-bottom: 18px;
    }
    .eyebrow {
      margin: 0 0 4px; font-size: 11px; font-weight: 600; letter-spacing: 0.08em;
      text-transform: uppercase; color: #64748b;
    }
    h1 { margin: 0 0 4px; font-size: 26px; font-weight: 700; }
    h2 { margin: 0 0 8px; font-size: 15px; font-weight: 700; }
    .sub, .hint, .meta { color: #64748b; font-size: 13px; }
    .sub { margin: 0; font-size: 14px; }
    .hint { margin: 0 0 12px; line-height: 1.45; }

    .metrics {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px;
    }
    .metric {
      border: 1px solid #e2e8f0; background: #fff; border-radius: 10px; padding: 14px 16px;
    }
    .val { display: block; font-size: 20px; font-weight: 700; }
    .lbl { display: block; margin-top: 4px; font-size: 12px; color: #64748b; }

    .panel {
      border: 1px solid #e2e8f0; background: #fff; border-radius: 12px; padding: 16px 18px; margin-bottom: 14px;
    }
    .pay-form {
      display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-end;
      label { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: #64748b; flex: 1; min-width: 200px; }
      input { border: 1px solid #e2e8f0; border-radius: 8px; padding: 9px 12px; font-size: 14px; }
    }

    .tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
    .tabs button {
      border: 1px solid #e2e8f0; background: #fff; color: #64748b;
      border-radius: 8px; padding: 8px 12px; font-size: 13px; font-weight: 600; cursor: pointer;
      &.active { background: #0f172a; border-color: #0f172a; color: #fff; }
    }

    .detail-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
    .label { display: block; font-size: 12px; color: #94a3b8; margin-bottom: 4px; }
    .row {
      display: flex; justify-content: space-between; gap: 12px; padding: 12px 0;
      border-bottom: 1px solid #f1f5f9; flex-wrap: wrap;
      &:last-child { border-bottom: 0; }
      strong { display: block; font-size: 14px; }
      .meta { display: block; margin-top: 2px; font-size: 12px; }
      a { color: #0f172a; text-decoration: none; }
      .right { text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
    }
    .status {
      display: inline-block; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 4px;
      background: #f1f5f9; color: #475569; text-transform: capitalize;
      &[data-status="paid"], &[data-status="completed"] { background: #ecfdf5; color: #166534; }
      &[data-status="accrued"], &[data-status="included"], &[data-status="pending"] { background: #fff7ed; color: #9a3412; }
    }
    .empty { margin: 0; padding: 20px 4px; text-align: center; color: #94a3b8; font-size: 13px; }

    @media (max-width: 720px) {
      .metrics, .detail-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class ProviderEnterprisePayrollComponent implements OnInit {
  loading = true;
  busy = false;
  error = '';
  enterpriseId = '';
  data: ProviderEnterprisePayroll | null = null;
  payPhone = '';
  tab: TabKey = 'overview';

  constructor(
    private route: ActivatedRoute,
    private enterpriseService: EnterpriseService,
    private snack: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.enterpriseId = (this.route.snapshot.paramMap.get('id') || '').trim();
    this.load();
  }

  load(): void {
    if (!this.enterpriseId) {
      this.error = 'Entreprise invalide';
      this.loading = false;
      return;
    }
    this.loading = true;
    this.error = '';
    this.enterpriseService.getMyEnterprisePayroll(this.enterpriseId).subscribe({
      next: (d) => {
        this.data = d;
        this.payPhone = d.employee?.pay_phone || '';
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.error || 'Impossible de charger vos salaires';
      },
    });
  }

  savePhone(): void {
    this.busy = true;
    this.enterpriseService.updateMyEnterprisePayroll(this.enterpriseId, {
      pay_phone: this.payPhone,
    }).subscribe({
      next: (d) => {
        this.data = d;
        this.busy = false;
        this.snack.open('Numéro de paie enregistré', 'OK', { duration: 2500 });
      },
      error: () => {
        this.busy = false;
        this.snack.open('Enregistrement impossible', 'Fermer', { duration: 3000 });
      },
    });
  }

  earningStatus(s: string): string {
    const m: Record<string, string> = {
      accrued: 'En attente',
      included: 'En période',
      paid: 'Payé',
      cancelled: 'Annulé',
    };
    return m[s] || s;
  }
}
