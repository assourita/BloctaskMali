import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import {
  MissionService,
  SolicitationPreview,
} from '../../../core/services/mission.service';
import { EnterpriseService } from '../../../core/services/enterprise.service';
import { formatXOF } from '../../../core/constants/africa.constants';

@Component({
  selector: 'app-solicitation-detail',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule,
    MatButtonModule, MatIconModule, MatCardModule, MatChipsModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatFormFieldModule, MatSelectModule,
  ],
  template: `
    <div class="page" *ngIf="!loading && preview">
      <div class="top-bar">
        <button mat-button type="button" (click)="goBack()">
          <mat-icon>arrow_back</mat-icon> Retour
        </button>
        <span class="status-chip" [class]="preview.solicitation.status">
          {{ statusLabel(preview.solicitation.status) }}
        </span>
      </div>

      <header class="hero">
        <h1>{{ preview.mission.title }}</h1>
        <p class="budget">{{ formatBudget() }}</p>
        <p class="deadline" *ngIf="preview.mission.deadline">
          <mat-icon>schedule</mat-icon> Échéance : {{ preview.mission.deadline | date:'dd/MM/yyyy HH:mm' }}
        </p>
      </header>

      <mat-card class="section info-card" *ngIf="preview.solicitation.status === 'pending'">
        <mat-card-content>
          <p class="info-text">
            <mat-icon>info</mat-icon>
            Après acceptation, vous devrez déposer la caution
            <ng-container *ngIf="preview.workflow?.is_enterprise">, assigner un employé,</ng-container>
            puis démarrer la mission.
          </p>
        </mat-card-content>
      </mat-card>

      <mat-card class="section workflow-card" *ngIf="preview.workflow">
        <mat-card-header><mat-card-title><mat-icon>checklist</mat-icon> Étapes pour démarrer</mat-card-title></mat-card-header>
        <mat-card-content>
          <div class="steps">
            <div class="step" [class.done]="stepDone('accept')" [class.active]="preview.workflow.current_step === 'accept'">
              <mat-icon>{{ stepDone('accept') ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
              <span>1. Accepter la sollicitation</span>
            </div>
            <div class="step" [class.done]="stepDone('deposit')" [class.active]="preview.workflow.current_step === 'deposit'">
              <mat-icon>{{ stepDone('deposit') ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
              <span>2. Déposer la caution ({{ preview.workflow.required_deposit | number:'1.0-0' }} XOF)</span>
            </div>
            <div class="step" *ngIf="preview.workflow.is_enterprise" [class.done]="stepDone('assign_employee')" [class.active]="preview.workflow.current_step === 'assign_employee'">
              <mat-icon>{{ stepDone('assign_employee') ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
              <span>3. Assigner un employé</span>
            </div>
            <div class="step" [class.done]="stepDone('start')" [class.active]="preview.workflow.current_step === 'start'">
              <mat-icon>{{ stepDone('started') ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
              <span>{{ preview.workflow.is_enterprise ? '4' : '3' }}. Démarrer la mission</span>
            </div>
          </div>
          <p class="wf-hint" *ngIf="preview.workflow.deposit_required && preview.workflow.deposit_deadline">
            Caution à déposer avant le {{ preview.workflow.deposit_deadline | date:'dd/MM HH:mm' }}
          </p>
          <p class="wf-hint" *ngIf="preview.workflow.deposit_balance != null">
            Solde caution disponible : {{ preview.workflow.deposit_balance | number:'1.0-0' }} XOF
          </p>
        </mat-card-content>
      </mat-card>

      <mat-card class="section" *ngIf="preview.solicitation.message">
        <mat-card-header><mat-card-title>Message du client</mat-card-title></mat-card-header>
        <mat-card-content>
          <p class="quote">« {{ preview.solicitation.message }} »</p>
        </mat-card-content>
      </mat-card>

      <mat-card class="section client-card">
        <mat-card-header><mat-card-title><mat-icon>person</mat-icon> Client</mat-card-title></mat-card-header>
        <mat-card-content>
          <div class="client-row">
            <div class="avatar">{{ initials(preview.client) }}</div>
            <div>
              <h3>{{ preview.client.first_name }} {{ preview.client.last_name }}</h3>
              <p *ngIf="preview.client.city">{{ preview.client.city }}{{ preview.client.country ? ', ' + preview.client.country : '' }}</p>
              <mat-chip-set>
                <mat-chip *ngIf="preview.client.identity_verified" color="primary">Identité vérifiée</mat-chip>
              </mat-chip-set>
              <p class="bio" *ngIf="preview.client.bio">{{ preview.client.bio }}</p>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <mat-card class="section" *ngIf="preview.mission.description">
        <mat-card-header><mat-card-title>Description</mat-card-title></mat-card-header>
        <mat-card-content><p>{{ preview.mission.description }}</p></mat-card-content>
      </mat-card>

      <mat-card class="section">
        <mat-card-header><mat-card-title><mat-icon>route</mat-icon> Itinéraire</mat-card-title></mat-card-header>
        <mat-card-content>
          <div class="route" *ngIf="preview.mission.pickup_address">
            <mat-icon>trip_origin</mat-icon>
            <div>
              <strong>Retrait</strong>
              <p>{{ preview.mission.pickup_address }}</p>
              <a *ngIf="hasCoords('pickup')" [href]="mapsUrl('pickup')" target="_blank" rel="noopener">Ouvrir dans Maps</a>
            </div>
          </div>
          <div class="route" *ngIf="preview.mission.delivery_address">
            <mat-icon>place</mat-icon>
            <div>
              <strong>Livraison</strong>
              <p>{{ preview.mission.delivery_address }}</p>
              <a *ngIf="hasCoords('delivery')" [href]="mapsUrl('delivery')" target="_blank" rel="noopener">Ouvrir dans Maps</a>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <mat-card class="section" *ngIf="hasRequirements()">
        <mat-card-header><mat-card-title>Exigences</mat-card-title></mat-card-header>
        <mat-card-content>
          <mat-chip-set>
            <mat-chip *ngIf="req('requires_vehicle')">Véhicule</mat-chip>
            <mat-chip *ngIf="req('requires_photo')">Photo</mat-chip>
            <mat-chip *ngIf="req('requires_signature')">Signature</mat-chip>
            <mat-chip *ngIf="preview.mission.requires_gps_tracking">Suivi GPS</mat-chip>
            <mat-chip *ngIf="preview.mission.enterprise_only">Entreprise uniquement</mat-chip>
          </mat-chip-set>
        </mat-card-content>
      </mat-card>

      <mat-card class="section" *ngIf="preview.applications.length">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>groups</mat-icon> Candidatures prestataires ({{ preview.applications.length }})
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="applicant" *ngFor="let app of preview.applications">
            <div class="applicant-main">
              <div class="avatar sm">{{ providerInitials(app) }}</div>
              <div>
                <strong>{{ app.provider?.first_name }} {{ app.provider?.last_name }}</strong>
                <p *ngIf="app.provider?.city">{{ app.provider?.city }}</p>
                <p class="sub" *ngIf="app.provider?.reputation_score != null">
                  Réputation {{ app.provider?.reputation_score | number:'1.0-0' }}/100
                  · {{ app.provider?.completed_missions || 0 }} mission(s)
                </p>
                <p class="msg" *ngIf="app.message">{{ app.message }}</p>
              </div>
            </div>
            <a mat-stroked-button *ngIf="app.provider?.id" [routerLink]="['/providers', app.provider!.id]">
              Voir le profil
            </a>
          </div>
        </mat-card-content>
      </mat-card>

      <mat-card class="section" *ngIf="preview.other_solicitations.length">
        <mat-card-header>
          <mat-card-title>Autres sollicitations sur cette mission</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="other" *ngFor="let o of preview.other_solicitations">
            <mat-icon>{{ o.target_type === 'enterprise' ? 'business' : 'person' }}</mat-icon>
            <span>
              <ng-container *ngIf="o.target_type === 'enterprise'">{{ o.enterprise_name || 'Entreprise' }}</ng-container>
              <ng-container *ngIf="o.target_type === 'provider'">
                {{ o.provider?.first_name }} {{ o.provider?.last_name }}
              </ng-container>
              — {{ statusLabel(o.status) }}
            </span>
          </div>
        </mat-card-content>
      </mat-card>

      <div class="action-bar" *ngIf="preview.solicitation.status === 'pending'">
        <button mat-stroked-button color="warn" (click)="reject()" [disabled]="acting">
          <mat-icon>close</mat-icon> Refuser
        </button>
        <button mat-raised-button color="primary" (click)="accept()" [disabled]="acting">
          <mat-icon>check_circle</mat-icon> Accepter la sollicitation
        </button>
      </div>

      <mat-card class="section workflow-actions" *ngIf="preview.solicitation.status === 'accepted' && preview.workflow">
        <mat-card-content>
          <div *ngIf="preview.workflow.current_step === 'deposit'">
            <p>Déposez la caution pour confirmer votre engagement sur cette mission.</p>
            <button mat-raised-button color="warn" (click)="payDeposit()" [disabled]="acting">
              <mat-icon>security</mat-icon> Déposer {{ preview.workflow.required_deposit | number:'1.0-0' }} XOF
            </button>
          </div>

          <div *ngIf="preview.workflow.current_step === 'assign_employee'">
            <p>Choisissez l'employé qui réalisera la mission sur le terrain.</p>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Employé</mat-label>
              <mat-select [(ngModel)]="selectedEmployeeId">
                <mat-option *ngFor="let e of preview.enterprise_employees || []" [value]="e.id">
                  {{ e.first_name }} {{ e.last_name }} — {{ e.position || 'Agent' }}
                </mat-option>
              </mat-select>
            </mat-form-field>
            <button mat-raised-button color="primary" (click)="assignEmployee()" [disabled]="acting || !selectedEmployeeId">
              <mat-icon>person_add</mat-icon> Assigner et continuer
            </button>
          </div>

          <div *ngIf="preview.workflow.current_step === 'start'">
            <p *ngIf="preview.workflow.is_enterprise && preview.mission.executing_employee">
              Employé assigné : {{ preview.mission.executing_employee.first_name }}
              {{ preview.mission.executing_employee.last_name }}
            </p>
            <button mat-raised-button color="primary" (click)="startMission()" [disabled]="acting">
              <mat-icon>play_arrow</mat-icon> Démarrer la mission
            </button>
          </div>

          <div *ngIf="preview.workflow.current_step === 'started'">
            <p class="success-msg"><mat-icon>check_circle</mat-icon> Mission démarrée</p>
            <button mat-stroked-button [routerLink]="missionLink">Voir la mission</button>
          </div>
        </mat-card-content>
      </mat-card>
    </div>

    <div class="loading" *ngIf="loading">
      <mat-spinner diameter="40"></mat-spinner>
    </div>
  `,
  styles: [`
    .page { max-width: 920px; margin: 0 auto; padding: 24px 24px 100px; }
    .top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .status-chip { padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; }
    .status-chip.pending { background: #fef3c7; color: #92400e; }
    .status-chip.accepted { background: #d1fae5; color: #065f46; }
    .status-chip.rejected, .status-chip.cancelled, .status-chip.expired { background: #f1f5f9; color: #64748b; }
    .hero h1 { margin: 0 0 8px; font-size: 28px; }
    .budget { font-size: 22px; font-weight: 700; color: #059669; margin: 0 0 8px; }
    .deadline { display: flex; align-items: center; gap: 6px; color: #64748b; margin: 0 0 20px; }
    .section { margin-bottom: 16px; border-radius: 14px; }
    .quote { font-style: italic; color: #475569; margin: 0; padding: 12px; background: #f8fafc; border-radius: 8px; }
    .client-row { display: flex; gap: 16px; align-items: flex-start; }
    .avatar { width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #3CB371, #059669); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; }
    .avatar.sm { width: 44px; height: 44px; font-size: 14px; }
    .client-row h3 { margin: 0 0 4px; }
    .bio { color: #64748b; margin-top: 8px; }
    .route { display: flex; gap: 12px; margin-bottom: 16px; }
    .route mat-icon { color: #3CB371; margin-top: 2px; }
    .route p { margin: 4px 0; color: #475569; }
    .route a { font-size: 13px; color: #059669; }
    .applicant { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid #f1f5f9; }
    .applicant:last-child { border-bottom: none; }
    .applicant-main { display: flex; gap: 12px; flex: 1; }
    .sub, .msg { font-size: 13px; color: #64748b; margin: 4px 0 0; }
    .other { display: flex; align-items: center; gap: 8px; padding: 8px 0; color: #475569; }
    .steps { display: flex; flex-direction: column; gap: 10px; }
    .step { display: flex; align-items: center; gap: 10px; color: #94a3b8; font-size: 14px; }
    .step.done { color: #059669; }
    .step.active { color: #0f172a; font-weight: 600; }
    .wf-hint { font-size: 13px; color: #64748b; margin: 12px 0 0; }
    .workflow-actions p { color: #475569; margin: 0 0 12px; }
    .full-width { width: 100%; }
    .success-msg { display: flex; align-items: center; gap: 8px; color: #059669; font-weight: 600; }
    .info-text { display: flex; align-items: flex-start; gap: 8px; color: #475569; margin: 0; font-size: 14px; line-height: 1.5; }
    .info-text mat-icon { color: #3b82f6; font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; }
    .action-bar {
      position: sticky; bottom: 0; display: flex; justify-content: flex-end; gap: 12px;
      padding: 16px 0; background: linear-gradient(transparent, #fff 24px);
    }
    .loading { display: flex; justify-content: center; padding: 80px; }
  `],
})
export class SolicitationDetailComponent implements OnInit {
  preview: SolicitationPreview | null = null;
  loading = true;
  acting = false;
  selectedEmployeeId = '';
  backLink = '/enterprise/solicitations';
  private scope: 'enterprise' | 'provider' = 'enterprise';

  private solicitationId = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private missionService: MissionService,
    private enterpriseService: EnterpriseService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.solicitationId = this.route.snapshot.paramMap.get('id') || '';
    const scope = this.route.snapshot.data['scope'] as string | undefined;
    if (scope === 'provider') {
      this.scope = 'provider';
      this.backLink = '/provider/missions/solicitations';
    }
    this.load();
  }

  get missionLink(): string {
    const id = this.preview?.mission?.id;
    return this.scope === 'enterprise' ? `/enterprise/missions` : `/provider/missions/${id}`;
  }

  load(): void {
    this.loading = true;
    this.missionService.getSolicitationPreview(this.solicitationId).subscribe({
      next: (data) => { this.preview = data; this.loading = false; },
      error: () => {
        this.loading = false;
        this.snackBar.open('Impossible de charger la sollicitation', 'Fermer', { duration: 4000 });
        this.goBack();
      },
    });
  }

  accept(): void {
    if (!this.preview || this.acting) return;
    this.acting = true;
    this.missionService.acceptSolicitation(this.solicitationId).subscribe({
      next: () => {
        this.acting = false;
        this.snackBar.open('Sollicitation acceptée — déposez la caution', 'Fermer', { duration: 5000 });
        this.load();
      },
      error: (err) => {
        this.acting = false;
        this.snackBar.open(err.error?.error || 'Erreur', 'Fermer', { duration: 5000 });
      },
    });
  }

  payDeposit(): void {
    const missionId = this.preview?.mission?.id;
    if (!missionId || this.acting) return;
    this.acting = true;
    this.missionService.payDeposit(missionId).subscribe({
      next: () => {
        this.acting = false;
        this.snackBar.open('Caution déposée', 'Fermer', { duration: 3000 });
        this.load();
      },
      error: (err) => {
        this.acting = false;
        const body = err.error;
        if (body?.required_deposit && body?.current_balance != null) {
          const link = this.scope === 'enterprise' ? '/enterprise/finances' : '/provider/deposit';
          this.snackBar.open(
            `Solde insuffisant (${body.current_balance} XOF). Payez via Mobile Money.`,
            'Alimenter',
            { duration: 8000 },
          ).onAction().subscribe(() => this.router.navigate([link]));
        } else {
          this.snackBar.open(body?.error || 'Dépôt impossible', 'Fermer', { duration: 5000 });
        }
      },
    });
  }

  assignEmployee(): void {
    const missionId = this.preview?.mission?.id;
    if (!missionId || !this.selectedEmployeeId || this.acting) return;
    this.acting = true;
    this.enterpriseService.createAssignment({
      mission: missionId,
      employee: this.selectedEmployeeId,
    }).subscribe({
      next: () => {
        this.acting = false;
        this.snackBar.open('Employé assigné — vous pouvez démarrer', 'Fermer', { duration: 4000 });
        this.load();
      },
      error: (err) => {
        this.acting = false;
        this.snackBar.open(err.error?.detail || err.error?.error || 'Erreur', 'Fermer', { duration: 5000 });
      },
    });
  }

  startMission(): void {
    const missionId = this.preview?.mission?.id;
    if (!missionId || this.acting) return;
    this.acting = true;
    this.missionService.startMission(missionId).subscribe({
      next: () => {
        this.acting = false;
        this.snackBar.open('Mission démarrée', 'Fermer', { duration: 3000 });
        this.load();
      },
      error: (err) => {
        this.acting = false;
        this.snackBar.open(err.error?.error || 'Impossible de démarrer', 'Fermer', { duration: 5000 });
      },
    });
  }

  stepDone(step: string): boolean {
    const w = this.preview?.workflow;
    if (!w) return false;
    const order = w.is_enterprise
      ? ['accept', 'deposit', 'assign_employee', 'start', 'started']
      : ['accept', 'deposit', 'start', 'started'];
    const cur = order.indexOf(w.current_step);
    const idx = order.indexOf(step);
    return idx >= 0 && cur > idx;
  }

  reject(): void {
    if (!this.preview || this.acting) return;
    this.acting = true;
    this.missionService.rejectSolicitation(this.solicitationId).subscribe({
      next: () => {
        this.acting = false;
        this.snackBar.open('Sollicitation refusée', 'Fermer', { duration: 3000 });
        this.goBack();
      },
      error: (err) => {
        this.acting = false;
        this.snackBar.open(err.error?.error || 'Erreur', 'Fermer', { duration: 5000 });
      },
    });
  }

  goBack(): void { this.router.navigate([this.backLink]); }

  formatBudget(): string {
    if (!this.preview) return '';
    const m = this.preview.mission;
    return `${formatXOF(Number(m.budget || m.final_price))} ${m.currency || 'XOF'}`;
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'En attente', accepted: 'Acceptée', rejected: 'Refusée',
      cancelled: 'Annulée', expired: 'Expirée',
    };
    return labels[status] || status;
  }

  initials(c: { first_name?: string; last_name?: string }): string {
    return `${c.first_name?.[0] || ''}${c.last_name?.[0] || ''}`.toUpperCase();
  }

  providerInitials(app: { provider?: { first_name?: string; last_name?: string } }): string {
    return this.initials(app.provider || {});
  }

  req(key: string): boolean {
    const r = this.preview?.mission?.requirements as Record<string, unknown> | undefined;
    return !!r?.[key];
  }

  hasRequirements(): boolean {
    if (!this.preview) return false;
    const m = this.preview.mission;
    return this.req('requires_vehicle') || this.req('requires_photo') || this.req('requires_signature')
      || !!m.requires_gps_tracking || !!m.enterprise_only;
  }

  hasCoords(kind: 'pickup' | 'delivery'): boolean {
    const m = this.preview?.mission;
    if (!m) return false;
    return kind === 'pickup'
      ? !!(m.pickup_latitude && m.pickup_longitude)
      : !!(m.delivery_latitude && m.delivery_longitude);
  }

  mapsUrl(kind: 'pickup' | 'delivery'): string {
    const m = this.preview!.mission;
    const lat = kind === 'pickup' ? m.pickup_latitude : m.delivery_latitude;
    const lng = kind === 'pickup' ? m.pickup_longitude : m.delivery_longitude;
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }
}
