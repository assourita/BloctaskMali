import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { PaymentService, Payment, PaymentMethod } from '../../../core/services/payment.service';

@Component({
  selector: 'app-client-payments',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatDividerModule,
  ],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <p class="eyebrow">Trésorerie</p>
          <h1>Paiements</h1>
          <p class="sub">Historique Mobile Money et méthodes enregistrées</p>
        </div>
        <button mat-stroked-button (click)="load()">
          <mat-icon>refresh</mat-icon> Actualiser
        </button>
      </header>

      <div class="metrics" *ngIf="!loading">
        <div class="metric">
          <span class="metric-val">{{ stats.completed }}</span>
          <span class="metric-lbl">Payés</span>
        </div>
        <div class="metric">
          <span class="metric-val">{{ stats.pending }}</span>
          <span class="metric-lbl">En attente</span>
        </div>
        <div class="metric">
          <span class="metric-val">{{ stats.totalPaid | number:'1.0-0' }}</span>
          <span class="metric-lbl">Total XOF</span>
        </div>
        <div class="metric">
          <span class="metric-val">{{ methods.length }}</span>
          <span class="metric-lbl">Méthodes</span>
        </div>
      </div>

      <div class="loading" *ngIf="loading"><mat-spinner diameter="36"></mat-spinner></div>

      <div class="grid" *ngIf="!loading">
        <section class="panel">
          <div class="panel-head">
            <h2>Historique</h2>
          </div>
          <div class="pay-list" *ngIf="payments.length; else noPay">
            <div class="pay-row" *ngFor="let p of payments">
              <div class="pay-main">
                <strong>{{ p.amount | number:'1.0-0' }} {{ p.currency }}</strong>
                <span class="meta">
                  Mission {{ p.mission | slice:0:8 }}…
                  · {{ p.created_at | date:'medium' }}
                </span>
                <span class="meta" *ngIf="p.operator">
                  {{ p.operator | uppercase }} {{ p.phone_number }}
                </span>
              </div>
              <div class="pay-side">
                <span class="status" [attr.data-status]="p.status">{{ statusLabel(p.status) }}</span>
                <button mat-stroked-button *ngIf="p.status === 'completed'" (click)="requestRefund(p)">
                  Remboursement
                </button>
              </div>
            </div>
          </div>
          <ng-template #noPay><p class="empty">Aucun paiement enregistré.</p></ng-template>
        </section>

        <section class="panel">
          <div class="panel-head">
            <h2>Méthodes de paiement</h2>
          </div>
          <div class="method-list" *ngIf="methods.length; else noMethod">
            <div class="method-row" *ngFor="let m of methods">
              <div class="method-icon">{{ (m.operator || 'MM').slice(0, 2).toUpperCase() }}</div>
              <div class="method-info">
                <strong>{{ m.operator | uppercase }} — {{ m.phone_number }}</strong>
                <span class="default" *ngIf="m.is_default">Par défaut</span>
              </div>
              <button mat-button *ngIf="!m.is_default" (click)="setDefault(m)">Définir</button>
            </div>
          </div>
          <ng-template #noMethod><p class="empty">Aucune méthode enregistrée.</p></ng-template>

          <div class="add-method">
            <p class="add-label">Ajouter un numéro Mobile Money</p>
            <div class="add-row">
              <input class="field" [(ngModel)]="newPhone" placeholder="Téléphone (+223…)" />
              <select class="field" [(ngModel)]="newOperator">
                <option value="orange">Orange Money</option>
                <option value="moov">Moov Money</option>
              </select>
              <button mat-flat-button color="primary" (click)="addMethod()">Ajouter</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .page {
      max-width: 1080px;
      margin: 0 auto;
      padding: 28px 24px 56px;
      color: #0f172a;
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
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px;
    }
    .metric {
      border: 1px solid #e2e8f0; background: #fff; border-radius: 10px; padding: 16px 18px;
    }
    .metric-val {
      display: block; font-size: 22px; font-weight: 700; letter-spacing: -0.02em;
    }
    .metric-lbl { font-size: 12px; color: #64748b; margin-top: 4px; display: block; }

    .loading { display: flex; justify-content: center; padding: 48px; }

    .grid {
      display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 16px; align-items: start;
    }
    .panel {
      border: 1px solid #e2e8f0; background: #fff; border-radius: 12px; padding: 16px 18px;
    }
    .panel-head {
      margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #f1f5f9;
      h2 { margin: 0; font-size: 15px; font-weight: 650; }
    }

    .pay-list, .method-list { display: flex; flex-direction: column; }
    .pay-row, .method-row {
      display: flex; justify-content: space-between; gap: 12px; align-items: center;
      padding: 12px 0; border-bottom: 1px solid #f1f5f9; flex-wrap: wrap;
      &:last-child { border-bottom: 0; }
    }
    .pay-main strong { display: block; font-size: 15px; font-weight: 650; }
    .meta { display: block; font-size: 12px; color: #94a3b8; margin-top: 2px; }
    .pay-side { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

    .status {
      display: inline-block; font-size: 11px; font-weight: 600; padding: 3px 8px;
      border-radius: 4px; background: #f1f5f9; color: #475569;
      &[data-status="completed"] { background: #ecfdf5; color: #166534; }
      &[data-status="pending"], &[data-status="processing"] { background: #fff7ed; color: #9a3412; }
      &[data-status="failed"] { background: #fef2f2; color: #991b1b; }
      &[data-status="refunded"] { background: #f8fafc; color: #64748b; }
    }

    .method-icon {
      width: 36px; height: 36px; border-radius: 8px; background: #0f172a; color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700; flex-shrink: 0;
    }
    .method-info { flex: 1; min-width: 140px;
      strong { display: block; font-size: 13px; font-weight: 600; }
    }
    .default {
      display: inline-block; margin-top: 4px; font-size: 11px; font-weight: 600;
      color: #166534; background: #ecfdf5; padding: 2px 6px; border-radius: 4px;
    }

    .add-method {
      margin-top: 16px; padding-top: 16px; border-top: 1px solid #f1f5f9;
    }
    .add-label { margin: 0 0 8px; font-size: 12px; font-weight: 600; color: #64748b; }
    .add-row { display: flex; gap: 8px; flex-wrap: wrap; }
    .field {
      flex: 1; min-width: 140px; padding: 10px 12px; border: 1px solid #e2e8f0;
      border-radius: 8px; font: inherit; background: #fff;
      &:focus { outline: none; border-color: #86efac; box-shadow: 0 0 0 3px rgba(22,163,74,.12); }
    }

    .empty { margin: 0; padding: 24px 4px; color: #94a3b8; font-size: 13px; text-align: center; }

    @media (max-width: 900px) {
      .grid { grid-template-columns: 1fr; }
      .metrics { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 560px) {
      .page { padding: 16px 16px 40px; }
      .metrics { grid-template-columns: 1fr 1fr; }
      h1 { font-size: 22px; }
    }
  `],
})
export class ClientPaymentsComponent implements OnInit {
  payments: Payment[] = [];
  methods: PaymentMethod[] = [];
  loading = true;
  stats = { completed: 0, pending: 0, totalPaid: 0 };
  newPhone = '';
  newOperator = 'orange';

  constructor(private paymentService: PaymentService, private snack: MatSnackBar) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.paymentService.getPayments().subscribe({
      next: (r) => {
        this.payments = (Array.isArray(r) ? r : (r as any)?.results ?? []) as Payment[];
        this.stats.completed = this.payments.filter(p => p.status === 'completed').length;
        this.stats.pending = this.payments.filter(p => ['pending', 'processing'].includes(p.status)).length;
        this.stats.totalPaid = this.payments.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0);
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
    this.paymentService.getPaymentMethods().subscribe({
      next: (r) => { this.methods = (Array.isArray(r) ? r : (r as any)?.results ?? []) as PaymentMethod[]; },
    });
  }

  statusLabel(s: string): string {
    const m: Record<string, string> = {
      completed: 'Payé', pending: 'En attente', processing: 'En cours',
      failed: 'Échoué', refunded: 'Remboursé',
    };
    return m[s] || s;
  }

  requestRefund(p: Payment): void {
    const reason = prompt('Motif du remboursement :');
    if (!reason) return;
    this.paymentService.requestRefund(p.id, reason).subscribe({
      next: () => { this.snack.open('Demande de remboursement envoyée', 'Fermer', { duration: 3000 }); this.load(); },
      error: (e) => this.snack.open(e.error?.detail || 'Erreur', 'Fermer', { duration: 4000 }),
    });
  }

  addMethod(): void {
    if (!this.newPhone) return;
    this.paymentService.createPaymentMethod({
      type: 'mobile_money', phone_number: this.newPhone, operator: this.newOperator as any, is_default: !this.methods.length,
    }).subscribe({
      next: () => { this.snack.open('Méthode ajoutée', 'Fermer', { duration: 3000 }); this.newPhone = ''; this.load(); },
      error: () => this.snack.open('Erreur', 'Fermer', { duration: 3000 }),
    });
  }

  setDefault(m: PaymentMethod): void {
    if (!m.id) return;
    this.paymentService.setDefaultPaymentMethod(m.id).subscribe({ next: () => this.load() });
  }
}
