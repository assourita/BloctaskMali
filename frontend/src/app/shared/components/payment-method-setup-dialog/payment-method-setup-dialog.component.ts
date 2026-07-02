import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PaymentService } from '../../../core/services/payment.service';

@Component({
  selector: 'app-payment-method-setup-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>account_balance_wallet</mat-icon>
      Méthode de paiement requise
    </h2>

    <mat-dialog-content>
      <p class="info">
        Pour recevoir vos gains après une mission validée, renseignez votre compte
        <strong>Mobile Money</strong> (Orange Money, Moov Money…).
        Ce numéro servira uniquement aux virements de vos rémunérations BlockTask.
      </p>

      <div class="form">
        <label for="pm-phone">Numéro Mobile Money</label>
        <input
          id="pm-phone"
          class="field"
          [(ngModel)]="phone"
          placeholder="+223 70 00 00 00"
          [disabled]="saving"
        />

        <label for="pm-operator">Opérateur</label>
        <select id="pm-operator" class="field" [(ngModel)]="operator" [disabled]="saving">
          <option *ngFor="let op of operators" [value]="op.id">{{ op.name }}</option>
        </select>
      </div>

      <p class="error" *ngIf="error">{{ error }}</p>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="cancel()" [disabled]="saving">Annuler</button>
      <button mat-raised-button color="primary" type="button" (click)="save()" [disabled]="saving || !phone.trim()">
        <mat-spinner *ngIf="saving" diameter="20"></mat-spinner>
        <span *ngIf="!saving">Enregistrer et postuler</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2[mat-dialog-title] {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      font-size: 18px;
    }
    mat-dialog-content { min-width: 320px; max-width: 440px; }
    .info {
      margin: 0 0 16px;
      font-size: 14px;
      line-height: 1.55;
      color: #4b5563;
      background: #f0faf4;
      border: 1px solid #a7f3d0;
      border-radius: 10px;
      padding: 12px 14px;
    }
    .form { display: flex; flex-direction: column; gap: 6px; }
    label { font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; }
    .field {
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 14px;
      margin-bottom: 8px;
    }
    .error { color: #b91c1c; font-size: 13px; margin: 8px 0 0; }
    mat-dialog-actions button mat-spinner { display: inline-block; margin-right: 8px; }
  `]
})
export class PaymentMethodSetupDialogComponent {
  phone = '';
  operator = 'orange';
  saving = false;
  error = '';
  operators = this.paymentService.getMobileMoneyOperators('ML');

  constructor(
    private paymentService: PaymentService,
    private dialogRef: MatDialogRef<PaymentMethodSetupDialogComponent>,
  ) {}

  cancel(): void {
    this.dialogRef.close(false);
  }

  save(): void {
    const phone = this.phone.trim();
    if (!phone) return;

    this.saving = true;
    this.error = '';
    this.paymentService.createPaymentMethod({
      type: 'mobile_money',
      phone_number: phone,
      operator: this.operator as 'orange' | 'moov',
      is_default: true,
    }).subscribe({
      next: () => this.dialogRef.close(true),
      error: (err) => {
        this.saving = false;
        this.error = err.error?.phone_number?.[0]
          || err.error?.detail
          || err.error?.error
          || 'Impossible d\'enregistrer la méthode de paiement.';
      },
    });
  }
}
