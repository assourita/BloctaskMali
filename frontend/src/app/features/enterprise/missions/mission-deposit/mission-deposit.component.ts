import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Mission, MissionService } from '../../../../core/services/mission.service';
import { EnterpriseService } from '../../../../core/services/enterprise.service';
import { PaymentService } from '../../../../core/services/payment.service';
import { DEFAULT_PHONE_PREFIX } from '../../../../core/constants/africa.constants';

@Component({
  selector: 'app-enterprise-mission-deposit',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatProgressBarModule, MatSnackBarModule, MatProgressSpinnerModule,
  ],
  template: `
    <div class="page" *ngIf="!loading; else loadingTpl">
      <div class="page-header">
        <button mat-button class="back-btn" (click)="goBack()">
          <mat-icon>arrow_back</mat-icon> Retour
        </button>
      </div>

      <div class="hero" *ngIf="mission">
        <h1>Déposer la caution</h1>
        <p class="subtitle">{{ mission.title }}</p>
      </div>

      <div class="summary-grid" *ngIf="mission">
        <mat-card class="summary-card">
          <span class="label">Caution requise</span>
          <strong class="value">{{ requiredDeposit | number:'1.0-0' }} XOF</strong>
        </mat-card>
        <mat-card class="summary-card" [class.insufficient]="needsTopUp">
          <span class="label">Solde entreprise</span>
          <strong class="value">{{ balance | number:'1.0-0' }} XOF</strong>
        </mat-card>
      </div>

      <mat-card class="info-card" *ngIf="mission && !mission.deposit_paid">
        <mat-icon>info</mat-icon>
        <p>
          Déposez la caution depuis le solde entreprise avant d'assigner un employé à cette mission.
        </p>
      </mat-card>

      <mat-card class="form-card" *ngIf="mission && needsTopUp && !mission.deposit_paid">
        <h3><mat-icon>phone_android</mat-icon> Alimenter via Mobile Money</h3>
        <p class="hint">Solde insuffisant — complétez le montant via Mobile Money.</p>
        <div class="form">
          <label>Montant (XOF)</label>
          <input class="field" type="number" min="1000" step="1000" [(ngModel)]="topUpAmount" />
          <label>Opérateur</label>
          <select class="field" [(ngModel)]="operator">
            <option *ngFor="let op of operators" [value]="op.id">{{ op.name }}</option>
          </select>
          <label>Numéro Mobile Money</label>
          <input class="field" [(ngModel)]="phone" [placeholder]="phonePlaceholder" />
          <label>Code OTP (test : 1234)</label>
          <input class="field" [(ngModel)]="otp" maxlength="6" />
        </div>
      </mat-card>

      <div class="actions" *ngIf="mission && !mission.deposit_paid">
        <button mat-raised-button color="primary" class="full-width" (click)="submit()" [disabled]="submitting">
          <mat-spinner *ngIf="submitting" diameter="20"></mat-spinner>
          <mat-icon *ngIf="!submitting">security</mat-icon>
          {{ submitting ? 'Traitement…' : 'Confirmer le dépôt de caution' }}
        </button>
        <a mat-stroked-button class="full-width" routerLink="/enterprise/finances">
          <mat-icon>account_balance</mat-icon> Alimenter le solde caution
        </a>
      </div>

      <mat-card class="success-card" *ngIf="mission?.deposit_paid">
        <mat-icon>check_circle</mat-icon>
        <div>
          <strong>Caution déposée</strong>
          <p>Vous pouvez maintenant assigner un employé à cette mission.</p>
          <button mat-raised-button color="primary" (click)="goBack()">Retour à la mission</button>
        </div>
      </mat-card>
    </div>

    <ng-template #loadingTpl>
      <div class="loading-page">
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
        <p>Chargement…</p>
      </div>
    </ng-template>
  `,
  styles: [`
    .page { padding: 24px; max-width: 640px; margin: 0 auto; }
    .back-btn { color: #4b5563; margin-bottom: 8px; }
    .hero h1 { margin: 0 0 6px; font-size: 24px; font-weight: 800; color: #111827; }
    .subtitle { margin: 0 0 20px; color: #6b7280; }
    .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .summary-card { padding: 16px; border-radius: 12px; }
    .summary-card.insufficient { border: 1px solid #fca5a5; background: #fef2f2; }
    .label { display: block; font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; margin-bottom: 4px; }
    .value { font-size: 20px; font-weight: 800; color: #111827; }
    .info-card { display: flex; gap: 12px; padding: 16px; margin-bottom: 16px; background: #eff6ff; border: 1px solid #bfdbfe; }
    .info-card mat-icon { color: #2563eb; }
    .info-card p { margin: 0; color: #1e40af; font-size: 14px; line-height: 1.5; }
    .form-card { padding: 20px; margin-bottom: 16px; }
    .form-card h3 { margin: 0 0 8px; display: flex; align-items: center; gap: 8px; font-size: 16px; }
    .hint { margin: 0 0 12px; color: #6b7280; font-size: 13px; }
    .form { display: flex; flex-direction: column; gap: 6px; }
    .form label { font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; }
    .field { padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; margin-bottom: 4px; }
    .actions { display: flex; flex-direction: column; gap: 10px; }
    .full-width { width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
    .success-card { display: flex; gap: 12px; padding: 20px; background: #ecfdf5; border: 1px solid #6ee7b7; }
    .success-card mat-icon { color: #059669; font-size: 32px; width: 32px; height: 32px; }
    .success-card p { margin: 4px 0 12px; color: #065f46; font-size: 14px; }
    .loading-page { padding: 80px 24px; text-align: center; color: #6b7280; }
    @media (max-width: 520px) { .summary-grid { grid-template-columns: 1fr; } }
  `],
})
export class EnterpriseMissionDepositComponent implements OnInit {
  missionId = '';
  mission: Mission | null = null;
  loading = true;
  submitting = false;
  balance = 0;
  topUpAmount = 10000;
  operator = 'orange';
  phone = '';
  otp = '1234';
  operators = this.paymentService.getMobileMoneyOperators('ML');
  phonePlaceholder = `${DEFAULT_PHONE_PREFIX} XX XX XX XX`;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private missionService: MissionService,
    private enterpriseService: EnterpriseService,
    private paymentService: PaymentService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.missionId = this.route.snapshot.paramMap.get('id') || '';
    this.load();
    this.paymentService.getPaymentMethods().subscribe({
      next: (methods) => {
        const mm = methods.find(m => m.is_default) || methods[0];
        if (mm?.phone_number) this.phone = mm.phone_number;
        if (mm?.operator) this.operator = mm.operator;
      },
    });
  }

  get requiredDeposit(): number {
    return Number(this.mission?.required_deposit ?? this.mission?.deposit_amount ?? 0);
  }

  get needsTopUp(): boolean {
    return this.balance < this.requiredDeposit;
  }

  load(): void {
    this.loading = true;
    this.missionService.getMission(this.missionId).subscribe({
      next: (m) => {
        this.mission = m;
        const req = Number(m.required_deposit ?? m.deposit_amount ?? 0);
        this.enterpriseService.getProfile().subscribe({
          next: (profile) => {
            this.balance = Number(profile.deposit_balance ?? 0);
            this.topUpAmount = Math.max(req - this.balance, req) || req || 10000;
            this.loading = false;
          },
          error: () => { this.loading = false; },
        });
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Mission introuvable', 'Fermer', { duration: 3000 });
        this.router.navigate(['/enterprise/missions'], { queryParams: { tab: 'received' } });
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/enterprise/missions/received', this.missionId]);
  }

  submit(): void {
    if (!this.mission || this.mission.deposit_paid) return;
    if (this.needsTopUp) {
      const amount = Number(this.topUpAmount);
      if (!amount || amount < 1000) {
        this.snackBar.open('Montant minimum 1 000 XOF', 'Fermer', { duration: 3000 });
        return;
      }
      if (!this.phone.trim()) {
        this.snackBar.open('Saisissez votre numéro Mobile Money', 'Fermer', { duration: 3000 });
        return;
      }
    }

    this.submitting = true;
    const payload: Record<string, string | number | boolean> = {};
    if (this.needsTopUp) {
      payload['amount'] = Number(this.topUpAmount);
      payload['phone_number'] = this.phone.trim();
      payload['operator'] = this.operator;
      payload['otp'] = this.otp.trim() || '1234';
    }

    this.missionService.payDeposit(this.missionId, payload).subscribe({
      next: () => {
        this.submitting = false;
        if (this.mission) this.mission.deposit_paid = true;
        this.snackBar.open('Caution déposée — assignez un employé', 'Fermer', { duration: 4000 });
        this.load();
      },
      error: (e) => {
        this.submitting = false;
        const body = e.error;
        if (body?.required_deposit != null && body?.current_balance != null) {
          this.snackBar.open('Solde insuffisant — alimentez via Mobile Money', 'Finances', { duration: 8000 })
            .onAction().subscribe(() => this.router.navigate(['/enterprise/finances']));
        } else {
          this.snackBar.open(body?.error || 'Erreur dépôt caution', 'Fermer', { duration: 5000 });
        }
      },
    });
  }
}
