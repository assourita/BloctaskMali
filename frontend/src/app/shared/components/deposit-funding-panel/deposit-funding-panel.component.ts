import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { BlockchainService } from '../../../core/services/blockchain.service';
import { PaymentService } from '../../../core/services/payment.service';
import { DEFAULT_PHONE_PREFIX } from '../../../core/constants/africa.constants';

export interface DepositFundResult {
  deposit_balance: number;
  deposit_locked?: number;
  message: string;
  transaction_id?: string;
}

@Component({
  selector: 'app-deposit-funding-panel',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatSnackBarModule,
  ],
  template: `
    <div class="panel">
      <h3 *ngIf="title"><mat-icon>account_balance_wallet</mat-icon> {{ title }}</h3>
      <p class="hint" *ngIf="hint">{{ hint }}</p>
      <p class="mm-info">
        Le montant sera débité de votre compte <strong>Mobile Money</strong>
        (Orange Money, Moov Money), comme pour le paiement d'une mission client.
      </p>

      <div class="form">
        <label>Montant (XOF, min. 1 000)</label>
        <input class="field" type="number" min="1000" step="1000" [(ngModel)]="amount" placeholder="Ex. 10000" />

        <label>Opérateur</label>
        <select class="field" [(ngModel)]="operator">
          <option *ngFor="let op of operators" [value]="op.id">{{ op.name }}</option>
        </select>

        <label>Numéro Mobile Money</label>
        <input class="field" [(ngModel)]="phone" [placeholder]="phonePlaceholder" />

        <label>Code OTP (mode test : 1234)</label>
        <input class="field" [(ngModel)]="otp" placeholder="1234" maxlength="6" />
      </div>

      <button mat-raised-button color="primary" [disabled]="funding || !canSubmit" (click)="submit()">
        <mat-spinner *ngIf="funding" diameter="20"></mat-spinner>
        <mat-icon *ngIf="!funding">payments</mat-icon>
        <span>{{ funding ? 'Paiement en cours…' : submitLabel }}</span>
      </button>
    </div>
  `,
  styles: [`
    .panel h3 { margin: 0 0 8px; display: flex; align-items: center; gap: 8px; font-size: 16px; }
    .hint, .mm-info { margin: 0 0 12px; color: #6b7280; font-size: 13px; line-height: 1.5; }
    .mm-info { background: #f0faf4; border: 1px solid #a7f3d0; border-radius: 8px; padding: 10px 12px; }
    .form { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
    label { font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; }
    .field { padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; margin-bottom: 4px; }
    button { display: inline-flex; align-items: center; gap: 8px; }
    button mat-spinner { display: inline-block; }
  `],
})
export class DepositFundingPanelComponent implements OnInit {
  @Input() title = 'Déposer via Mobile Money';
  @Input() hint = '';
  @Input() submitLabel = 'Payer et alimenter la caution';
  @Output() funded = new EventEmitter<DepositFundResult>();

  amount: number | null = 10000;
  operator = 'orange';
  phone = '';
  otp = '1234';
  funding = false;
  operators = this.paymentService.getMobileMoneyOperators('ML');
  phonePlaceholder = `${DEFAULT_PHONE_PREFIX} 70 00 00 00`;

  constructor(
    private blockchainService: BlockchainService,
    private paymentService: PaymentService,
    private snack: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.paymentService.getPaymentMethods().subscribe({
      next: (methods) => {
        const list = Array.isArray(methods) ? methods : (methods as { results?: typeof methods })?.results ?? [];
        const mm = list.find((m) => m.type === 'mobile_money' && m.is_default)
          || list.find((m) => m.type === 'mobile_money');
        if (mm?.phone_number) this.phone = mm.phone_number;
        if (mm?.operator) this.operator = mm.operator;
      },
    });
  }

  get canSubmit(): boolean {
    return !!this.amount && this.amount >= 1000 && !!this.phone.trim() && !!this.operator;
  }

  submit(): void {
    if (!this.canSubmit || this.funding) return;
    this.funding = true;
    this.blockchainService.fundDepositBalance(this.amount!, {
      phone_number: this.phone.trim(),
      operator: this.operator,
      otp: this.otp.trim() || undefined,
    }).subscribe({
      next: (res) => {
        this.funding = false;
        this.snack.open(res.message || 'Caution alimentée', 'Fermer', { duration: 4000 });
        this.funded.emit(res);
      },
      error: (e) => {
        this.funding = false;
        const body = e.error;
        if (body?.payment_method_required) {
          this.snack.open('Renseignez votre numéro Mobile Money ci-dessus.', 'Fermer', { duration: 5000 });
        } else {
          this.snack.open(body?.error || body?.detail || 'Paiement impossible', 'Fermer', { duration: 5000 });
        }
      },
    });
  }
}
