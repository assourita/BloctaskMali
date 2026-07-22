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
      <!-- Header - Stripe Style -->
      <div class="page-header">
        <div class="header-content">
          <h1><mat-icon>credit_card</mat-icon> Paiements</h1>
          <p>Historique Mobile Money et méthodes de paiement</p>
        </div>
        <button mat-stroked-button class="refresh-btn" (click)="load()">
          <mat-icon>refresh</mat-icon> Actualiser
        </button>
      </div>

      <!-- KPI Cards - Stripe Style -->
      <div class="kpi-row" *ngIf="!loading">
        <div class="kpi">
          <div class="kpi-icon">
            <mat-icon>check_circle</mat-icon>
          </div>
          <span class="val">{{ stats.completed }}</span>
          <span class="lbl">Payés</span>
        </div>
        <div class="kpi pending">
          <div class="kpi-icon">
            <mat-icon>hourglass_empty</mat-icon>
          </div>
          <span class="val">{{ stats.pending }}</span>
          <span class="lbl">En attente</span>
        </div>
        <div class="kpi">
          <div class="kpi-icon">
            <mat-icon>account_balance_wallet</mat-icon>
          </div>
          <span class="val">{{ stats.totalPaid | number:'1.0-0' }}</span>
          <span class="lbl">Total XOF</span>
        </div>
        <div class="kpi">
          <div class="kpi-icon">
            <mat-icon>credit_card</mat-icon>
          </div>
          <span class="val">{{ methods.length }}</span>
          <span class="lbl">Méthodes</span>
        </div>
      </div>

      <div class="loading" *ngIf="loading"><mat-spinner diameter="36"></mat-spinner></div>

      <div class="grid" *ngIf="!loading">
        <!-- Payment History Card -->
        <mat-card class="payment-card">
          <mat-card-header>
            <mat-card-title>Historique des paiements</mat-card-title>
          </mat-card-header>
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

        <!-- Payment Methods Card -->
        <mat-card class="methods-card">
          <mat-card-header>
            <mat-card-title>Méthodes de paiement</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="method-list" *ngIf="methods.length; else noMethod">
              <div class="method-item" *ngFor="let m of methods">
                <div class="method-icon">
                  <mat-icon>phone_android</mat-icon>
                </div>
                <div class="method-info">
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
    .page-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
      font-family: system-ui, -apple-system, sans-serif;
    }

    /* Header - Stripe Style */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .header-content h1 {
      margin: 0 0 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1.875rem;
      font-weight: 800;
      color: #111827;

      mat-icon {
        font-size: 2rem;
        width: 2rem;
        height: 2rem;
        color: #4f46e5;
      }
    }

    .header-content p {
      margin: 0;
      color: #9ca3af;
      font-size: 1rem;
    }

    .refresh-btn {
      border: 2px solid #e5e7eb;
      border-radius: 0.75rem;
      padding: 0.75rem 1.5rem;
      font-weight: 600;
      font-size: 0.875rem;
      transition: all 0.2s ease;

      &:hover {
        border-color: #6366f1;
        background: #f9fafb;
      }

      mat-icon {
        margin-right: 0.5rem;
      }
    }

    /* KPI Cards - Stripe Style */
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.25rem;
      margin-bottom: 2rem;
    }

    .kpi {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 1.5rem;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: all 0.2s ease;

      &:hover {
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        transform: translateY(-2px);
      }

      .kpi-icon {
        width: 3rem;
        height: 3rem;
        border-radius: 0.75rem;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #818cf8 0%, #4f46e5 100%);

        mat-icon {
          font-size: 1.5rem;
          width: 1.5rem;
          height: 1.5rem;
          color: #ffffff;
        }
      }

      .val {
        font-size: 1.5rem;
        font-weight: 800;
        color: #111827;
      }

      .lbl {
        font-size: 0.875rem;
        color: #9ca3af;
        font-weight: 500;
      }

      &.pending .kpi-icon {
        background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
      }
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: 4rem;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.5rem;
    }

    /* Cards */
    .payment-card, .methods-card {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

      ::ng-deep {
        .mat-mdc-card-header {
          padding: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .mat-mdc-card-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
        }

        .mat-mdc-card-content {
          padding: 1.5rem;
        }
      }
    }

    /* Payment Items */
    .pay-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .pay-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      background: #f9fafb;
      border-radius: 0.75rem;
      gap: 1rem;
    }

    .pay-main {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .pay-amount {
      font-size: 1.125rem;
      font-weight: 800;
      color: #111827;
    }

    .pay-meta {
      font-size: 0.875rem;
      color: #9ca3af;
    }

    .pay-op {
      font-size: 0.75rem;
      color: #6b7280;
      font-weight: 500;
    }

    .pay-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    mat-chip {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.375rem 0.875rem;
      border-radius: 9999px;
    }

    .st-completed {
      background: #dcfce7;
      color: #16a34a;
    }

    .st-pending {
      background: #fef3c7;
      color: #d97706;
    }

    .st-failed {
      background: #fee2e2;
      color: #dc2626;
    }

    /* Method Items */
    .method-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .method-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      background: #f9fafb;
      border-radius: 0.75rem;
    }

    .method-icon {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 0.5rem;
      background: linear-gradient(135deg, #818cf8 0%, #4f46e5 100%);
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        font-size: 1.25rem;
        width: 1.25rem;
        height: 1.25rem;
        color: #ffffff;
      }
    }

    .method-info {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 0.5rem;

      strong {
        font-size: 0.875rem;
        font-weight: 600;
        color: #111827;
      }
    }

    .default-badge {
      background: #dcfce7;
      color: #16a34a;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .add-method {
      display: flex;
      gap: 0.75rem;
      margin-top: 1.25rem;
    }

    .field {
      flex: 1;
      padding: 0.75rem 1rem;
      border: 2px solid #e5e7eb;
      border-radius: 0.75rem;
      font-size: 0.875rem;
      font-family: system-ui, -apple-system, sans-serif;
      outline: none;
      transition: all 0.2s ease;

      &:focus {
        border-color: #6366f1;
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
      }
    }

    .empty {
      text-align: center;
      padding: 2rem;
      color: #9ca3af;
      font-size: 0.875rem;
      margin: 0;
    }

    /* Responsive */
    @media (max-width: 1024px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 768px) {
      .page-container {
        padding: 1rem;
      }

      .page-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .kpi-row {
        grid-template-columns: repeat(2, 1fr);
      }

      .pay-item {
        flex-direction: column;
        align-items: flex-start;
      }

      .add-method {
        flex-direction: column;
      }
    }
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
