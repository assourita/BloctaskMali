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
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1><mat-icon>payment</mat-icon> Paiements</h1>
          <p>Historique Mobile Money et méthodes de paiement</p>
        </div>
        <button mat-stroked-button (click)="load()"><mat-icon>refresh</mat-icon> Actualiser</button>
      </div>

      <div class="kpi-row" *ngIf="!loading">
        <div class="kpi"><mat-icon>check_circle</mat-icon><span class="val">{{ stats.completed }}</span><span class="lbl">Payés</span></div>
        <div class="kpi pending"><mat-icon>hourglass_empty</mat-icon><span class="val">{{ stats.pending }}</span><span class="lbl">En attente</span></div>
        <div class="kpi"><mat-icon>account_balance_wallet</mat-icon><span class="val">{{ stats.totalPaid | number:'1.0-0' }}</span><span class="lbl">Total XOF</span></div>
        <div class="kpi"><mat-icon>credit_card</mat-icon><span class="val">{{ methods.length }}</span><span class="lbl">Méthodes</span></div>
      </div>

      <div class="loading" *ngIf="loading"><mat-spinner diameter="36"></mat-spinner></div>

      <div class="grid" *ngIf="!loading">
        <mat-card>
          <mat-card-header><mat-card-title>Historique des paiements</mat-card-title></mat-card-header>
          <mat-card-content>
            <div class="pay-list" *ngIf="payments.length; else noPay">
              <div class="pay-item" *ngFor="let p of payments">
                <div class="pay-main">
                  <span class="pay-amount">{{ p.amount | number:'1.0-0' }} {{ p.currency }}</span>
                  <span class="pay-meta">Mission {{ p.mission | slice:0:8 }}... · {{ p.created_at | date:'short' }}</span>
                  <span class="pay-op" *ngIf="p.operator">{{ p.operator | uppercase }} {{ p.phone_number }}</span>
                </div>
                <div class="pay-actions">
                  <mat-chip [class]="'st-' + p.status">{{ statusLabel(p.status) }}</mat-chip>
                  <button mat-stroked-button color="warn" *ngIf="p.status === 'completed'" (click)="requestRefund(p)">
                    Remboursement
                  </button>
                </div>
              </div>
            </div>
            <ng-template #noPay><p class="empty">Aucun paiement enregistré</p></ng-template>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-header><mat-card-title>Méthodes de paiement</mat-card-title></mat-card-header>
          <mat-card-content>
            <div class="method-list" *ngIf="methods.length; else noMethod">
              <div class="method-item" *ngFor="let m of methods">
                <mat-icon>phone_android</mat-icon>
                <div>
                  <strong>{{ m.operator | uppercase }} — {{ m.phone_number }}</strong>
                  <span *ngIf="m.is_default" class="default-badge">Par défaut</span>
                </div>
                <button mat-icon-button *ngIf="!m.is_default" (click)="setDefault(m)">
                  <mat-icon>star_outline</mat-icon>
                </button>
              </div>
            </div>
            <ng-template #noMethod><p class="empty">Aucune méthode enregistrée</p></ng-template>
            <mat-divider></mat-divider>
            <div class="add-method">
              <input class="field" [(ngModel)]="newPhone" placeholder="Téléphone (+223...)" />
              <select class="field" [(ngModel)]="newOperator">
                <option value="orange">Orange Money</option>
                <option value="moov">Moov Money</option>
              </select>
              <button mat-raised-button color="primary" (click)="addMethod()">Ajouter</button>
            </div>
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
      mat-icon { color: #00b894; } &.pending mat-icon { color: #f59e0b; }
      .val { font-size: 22px; font-weight: 700; } .lbl { font-size: 12px; color: #6b7280; }
    }
    .loading { display: flex; justify-content: center; padding: 40px; }
    .grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 20px; }
    .pay-item { display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid #f3f4f6; gap: 12px; flex-wrap: wrap; }
    .pay-amount { font-weight: 700; font-size: 16px; display: block; }
    .pay-meta, .pay-op { font-size: 12px; color: #6b7280; display: block; }
    .pay-actions { display: flex; align-items: center; gap: 8px; }
    .st-completed { background: #d1fae5 !important; color: #065f46 !important; }
    .st-pending, .st-processing { background: #fef3c7 !important; color: #92400e !important; }
    .st-failed { background: #fee2e2 !important; color: #991b1b !important; }
    .method-item { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid #f3f4f6; }
    .default-badge { font-size: 11px; background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 10px; margin-left: 8px; }
    .add-method { display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap; }
    .field { padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; flex: 1; min-width: 120px; }
    .empty { color: #9ca3af; text-align: center; padding: 24px; }
    @media (max-width: 768px) { .grid, .kpi-row { grid-template-columns: 1fr; } }
  `]
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
    const m: Record<string, string> = { completed: 'Payé', pending: 'En attente', processing: 'En cours', failed: 'Échoué', refunded: 'Remboursé' };
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
