import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
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
    MatProgressSpinnerModule, MatProgressBarModule, MatSnackBarModule, MatFormFieldModule, MatSelectModule,
  ],
  template: `
    <div class="page" *ngIf="!loading && preview">
      <div class="page-header">
        <button mat-button type="button" class="back-btn" (click)="goBack()">
          <mat-icon>arrow_back</mat-icon> Retour
        </button>
        <span class="status-badge" [class]="'status-' + preview.solicitation.status">
          {{ statusLabel(preview.solicitation.status) }}
        </span>
      </div>

      <div class="hero" [class]="'hero-' + preview.solicitation.status">
        <div class="hero-top">
          <span class="category-pill" *ngIf="preview.mission.category?.name">
            <mat-icon>{{ preview.mission.category?.icon || 'category' }}</mat-icon>
            {{ preview.mission.category?.name }}
          </span>
          <span class="enterprise-pill" *ngIf="preview.workflow?.is_enterprise">
            <mat-icon>business</mat-icon> Mission entreprise
          </span>
        </div>
        <h1>{{ preview.mission.title }}</h1>
        <p class="hero-desc" *ngIf="preview.mission.description">{{ preview.mission.description }}</p>
        <div class="hero-stats">
          <div class="stat highlight">
            <span class="stat-label">Budget</span>
            <span class="stat-value">{{ formatBudget() }}</span>
          </div>
          <div class="stat" *ngIf="preview.workflow?.required_deposit">
            <span class="stat-label">Caution requise</span>
            <span class="stat-value">{{ preview.workflow!.required_deposit | number:'1.0-0' }} XOF</span>
          </div>
          <div class="stat" *ngIf="preview.mission.deadline">
            <span class="stat-label">Échéance</span>
            <span class="stat-value">{{ preview.mission.deadline | date:'dd MMM yyyy HH:mm' }}</span>
          </div>
        </div>
      </div>

      <div class="timeline-card" *ngIf="preview.workflow">
        <div class="timeline">
          <div class="tl-step" *ngFor="let s of workflowSteps; let i = index"
            [class.done]="s.done" [class.active]="s.active">
            <div class="tl-dot">
              <mat-icon *ngIf="s.done">check</mat-icon>
              <span *ngIf="!s.done">{{ i + 1 }}</span>
            </div>
            <span class="tl-label">{{ s.label }}</span>
          </div>
        </div>
        <mat-progress-bar mode="determinate" [value]="workflowProgress"></mat-progress-bar>
      </div>

      <div class="layout">
        <div class="main-col">
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
              <p class="wf-hint balance" *ngIf="preview.workflow.deposit_balance != null">
                <mat-icon>account_balance_wallet</mat-icon>
                Solde caution disponible : {{ preview.workflow.deposit_balance | number:'1.0-0' }} XOF
              </p>
            </mat-card-content>
          </mat-card>

          <mat-card class="section" *ngIf="preview.solicitation.message">
            <mat-card-header><mat-card-title><mat-icon>chat_bubble_outline</mat-icon> Message du client</mat-card-title></mat-card-header>
            <mat-card-content>
              <p class="quote">« {{ preview.solicitation.message }} »</p>
            </mat-card-content>
          </mat-card>

          <mat-card class="section" *ngIf="preview.mission.description">
            <mat-card-header><mat-card-title><mat-icon>description</mat-icon> Description complète</mat-card-title></mat-card-header>
            <mat-card-content><p class="desc">{{ preview.mission.description }}</p></mat-card-content>
          </mat-card>

          <mat-card class="section">
            <mat-card-header><mat-card-title><mat-icon>route</mat-icon> Itinéraire</mat-card-title></mat-card-header>
            <mat-card-content>
              <div class="route" *ngIf="preview.mission.pickup_address">
                <div class="route-icon pickup"><mat-icon>trip_origin</mat-icon></div>
                <div>
                  <strong>Retrait</strong>
                  <p>{{ preview.mission.pickup_address }}</p>
                  <a *ngIf="hasCoords('pickup')" [href]="mapsUrl('pickup')" target="_blank" rel="noopener">Ouvrir dans Maps</a>
                </div>
              </div>
              <div class="route-connector" *ngIf="preview.mission.pickup_address && preview.mission.delivery_address"></div>
              <div class="route" *ngIf="preview.mission.delivery_address">
                <div class="route-icon delivery"><mat-icon>place</mat-icon></div>
                <div>
                  <strong>Livraison</strong>
                  <p>{{ preview.mission.delivery_address }}</p>
                  <a *ngIf="hasCoords('delivery')" [href]="mapsUrl('delivery')" target="_blank" rel="noopener">Ouvrir dans Maps</a>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="section" *ngIf="hasRequirements()">
            <mat-card-header><mat-card-title><mat-icon>rule</mat-icon> Exigences</mat-card-title></mat-card-header>
            <mat-card-content>
              <mat-chip-set>
                <mat-chip *ngIf="req('requires_vehicle')"><mat-icon>local_shipping</mat-icon> Véhicule</mat-chip>
                <mat-chip *ngIf="req('requires_photo')"><mat-icon>photo_camera</mat-icon> Photo</mat-chip>
                <mat-chip *ngIf="req('requires_signature')"><mat-icon>draw</mat-icon> Signature</mat-chip>
                <mat-chip *ngIf="preview.mission.requires_gps_tracking"><mat-icon>gps_fixed</mat-icon> Suivi GPS</mat-chip>
                <mat-chip *ngIf="preview.mission.enterprise_only"><mat-icon>business</mat-icon> Entreprise uniquement</mat-chip>
              </mat-chip-set>
            </mat-card-content>
          </mat-card>

          <mat-card class="section" *ngIf="preview.applications.length">
            <mat-card-header>
              <mat-card-title><mat-icon>groups</mat-icon> Candidatures ({{ preview.applications.length }})</mat-card-title>
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
        </div>

        <aside class="side-col">
          <mat-card class="side-card client-card">
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

          <mat-card class="side-card action-card" *ngIf="preview.solicitation.status === 'pending'">
            <mat-card-header><mat-card-title>Actions</mat-card-title></mat-card-header>
            <mat-card-content class="action-list">
              <button mat-stroked-button color="warn" class="full-width" (click)="reject()" [disabled]="acting">
                <mat-icon>close</mat-icon> Refuser
              </button>
              <button mat-raised-button color="primary" class="full-width" (click)="accept()" [disabled]="acting">
                <mat-icon>check_circle</mat-icon> Accepter
              </button>
            </mat-card-content>
          </mat-card>

          <mat-card class="side-card action-card" *ngIf="preview.solicitation.status === 'accepted' && preview.workflow">
            <mat-card-header><mat-card-title>Prochaine étape</mat-card-title></mat-card-header>
            <mat-card-content>
              <div *ngIf="preview.workflow.current_step === 'deposit'">
                <p>Déposez la caution pour confirmer votre engagement.</p>
                <button mat-raised-button color="warn" class="full-width" (click)="payDeposit()" [disabled]="acting">
                  <mat-icon>security</mat-icon> Déposer {{ preview.workflow.required_deposit | number:'1.0-0' }} XOF
                </button>
              </div>
              <div *ngIf="preview.workflow.current_step === 'assign_employee'">
                <p>Choisissez l'employé sur le terrain.</p>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Employé</mat-label>
                  <mat-select [(ngModel)]="selectedEmployeeId">
                    <mat-option *ngFor="let e of preview.enterprise_employees || []" [value]="e.id">
                      {{ e.first_name }} {{ e.last_name }} — {{ e.position || 'Agent' }}
                    </mat-option>
                  </mat-select>
                </mat-form-field>
                <button mat-raised-button color="primary" class="full-width" (click)="assignEmployee()" [disabled]="acting || !selectedEmployeeId">
                  <mat-icon>person_add</mat-icon> Assigner
                </button>
              </div>
              <div *ngIf="preview.workflow.current_step === 'start'">
                <p *ngIf="preview.workflow.is_enterprise && preview.mission.executing_employee">
                  Employé : {{ preview.mission.executing_employee.first_name }}
                  {{ preview.mission.executing_employee.last_name }}
                </p>
                <button mat-raised-button color="primary" class="full-width" (click)="startMission()" [disabled]="acting">
                  <mat-icon>play_arrow</mat-icon> Démarrer la mission
                </button>
              </div>
              <div *ngIf="preview.workflow.current_step === 'started'">
                <p class="success-msg"><mat-icon>check_circle</mat-icon> Mission démarrée</p>
                <button mat-stroked-button class="full-width" [routerLink]="missionLink">Voir la mission</button>
              </div>
            </mat-card-content>
          </mat-card>
        </aside>
      </div>
    </div>

    <div class="loading" *ngIf="loading">
      <mat-spinner diameter="40"></mat-spinner>
    </div>
  `,
  styles: [`
    .page { max-width: 1200px; margin: 0 auto; padding: 24px 24px 80px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .back-btn { color: #4b5563; }
    .status-badge {
      padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase;
    }
    .status-pending { background: #fef3c7; color: #92400e; }
    .status-accepted { background: #d1fae5; color: #065f46; }
    .status-rejected, .status-cancelled, .status-expired { background: #f1f5f9; color: #64748b; }

    .hero {
      border-radius: 20px; padding: 28px 32px; margin-bottom: 20px; color: #fff;
      background: linear-gradient(135deg, #059669 0%, #047857 50%, #065f46 100%);
      box-shadow: 0 8px 32px rgba(5, 150, 105, 0.25);
    }
    .hero-accepted { background: linear-gradient(135deg, #6C5CE7 0%, #5b4cdb 100%); box-shadow: 0 8px 32px rgba(108,92,231,0.25); }
    .hero-pending { background: linear-gradient(135deg, #d97706 0%, #b45309 100%); box-shadow: 0 8px 32px rgba(217,119,6,0.25); }
    .hero-top { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
    .category-pill, .enterprise-pill {
      display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px;
      border-radius: 999px; background: rgba(255,255,255,0.2); font-size: 12px; font-weight: 600;
    }
    .hero h1 { margin: 0 0 10px; font-size: 30px; font-weight: 800; line-height: 1.2; }
    .hero-desc { margin: 0 0 20px; opacity: 0.92; font-size: 15px; line-height: 1.5; max-width: 720px; }
    .hero-stats { display: flex; flex-wrap: wrap; gap: 12px; }
    .stat {
      background: rgba(255,255,255,0.15); border-radius: 12px; padding: 12px 16px; min-width: 140px;
      backdrop-filter: blur(4px);
    }
    .stat.highlight { background: rgba(255,255,255,0.25); }
    .stat-label { display: block; font-size: 11px; text-transform: uppercase; opacity: 0.85; margin-bottom: 4px; }
    .stat-value { font-size: 18px; font-weight: 700; }

    .timeline-card {
      background: #fff; border-radius: 16px; padding: 20px 24px; margin-bottom: 20px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.06); border: 1px solid #e5e7eb;
    }
    .timeline { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
    .tl-step { display: flex; flex-direction: column; align-items: center; gap: 8px; flex: 1; min-width: 72px; text-align: center; }
    .tl-dot {
      width: 32px; height: 32px; border-radius: 50%; background: #e5e7eb; color: #6b7280;
      display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;
    }
    .tl-step.done .tl-dot { background: #059669; color: #fff; }
    .tl-step.active .tl-dot { background: #6C5CE7; color: #fff; box-shadow: 0 0 0 4px rgba(108,92,231,0.2); }
    .tl-label { font-size: 11px; color: #6b7280; font-weight: 500; line-height: 1.3; }
    .tl-step.done .tl-label, .tl-step.active .tl-label { color: #111827; font-weight: 600; }

    .layout { display: grid; grid-template-columns: 1fr 320px; gap: 20px; align-items: start; }
    .main-col { display: flex; flex-direction: column; gap: 16px; }
    .side-col { display: flex; flex-direction: column; gap: 16px; position: sticky; top: 80px; }
    .section { border-radius: 14px; }
    .side-card { border-radius: 14px; }
    .quote { font-style: italic; color: #475569; margin: 0; padding: 14px; background: #f8fafc; border-radius: 10px; border-left: 4px solid #3CB371; }
    .desc { color: #374151; line-height: 1.6; margin: 0; }
    .client-row { display: flex; gap: 16px; align-items: flex-start; }
    .avatar { width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #3CB371, #059669); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; }
    .avatar.sm { width: 44px; height: 44px; font-size: 14px; }
    .client-row h3 { margin: 0 0 4px; }
    .bio { color: #64748b; margin-top: 8px; font-size: 13px; }
    .route { display: flex; gap: 14px; align-items: flex-start; }
    .route-icon { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .route-icon.pickup { background: #dbeafe; color: #1d4ed8; }
    .route-icon.delivery { background: #d1fae5; color: #047857; }
    .route-connector { width: 2px; height: 20px; background: #e5e7eb; margin: 4px 0 4px 17px; }
    .route p { margin: 4px 0; color: #475569; }
    .route a { font-size: 13px; color: #059669; font-weight: 600; }
    .applicant { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid #f1f5f9; }
    .applicant:last-child { border-bottom: none; }
    .applicant-main { display: flex; gap: 12px; flex: 1; }
    .sub, .msg { font-size: 13px; color: #64748b; margin: 4px 0 0; }
    .steps { display: flex; flex-direction: column; gap: 10px; }
    .step { display: flex; align-items: center; gap: 10px; color: #94a3b8; font-size: 14px; padding: 8px 12px; border-radius: 8px; }
    .step.done { color: #059669; background: #ecfdf5; }
    .step.active { color: #0f172a; font-weight: 600; background: #f5f3ff; }
    .wf-hint { font-size: 13px; color: #64748b; margin: 12px 0 0; }
    .wf-hint.balance { display: flex; align-items: center; gap: 6px; color: #059669; font-weight: 600; }
    .info-text { display: flex; align-items: flex-start; gap: 8px; color: #475569; margin: 0; font-size: 14px; line-height: 1.5; }
    .info-text mat-icon { color: #3b82f6; font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; }
    .action-list { display: flex; flex-direction: column; gap: 10px; }
    .full-width { width: 100%; }
    .success-msg { display: flex; align-items: center; gap: 8px; color: #059669; font-weight: 600; }
    .loading { display: flex; justify-content: center; padding: 80px; }
    @media (max-width: 900px) {
      .layout { grid-template-columns: 1fr; }
      .side-col { position: static; }
      .hero h1 { font-size: 24px; }
    }
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

  get workflowSteps(): { label: string; done: boolean; active: boolean }[] {
    const w = this.preview?.workflow;
    if (!w) return [];
    const steps = w.is_enterprise
      ? [
          { key: 'accept', label: 'Acceptée' },
          { key: 'deposit', label: 'Caution' },
          { key: 'assign_employee', label: 'Employé' },
          { key: 'start', label: 'Démarrage' },
        ]
      : [
          { key: 'accept', label: 'Acceptée' },
          { key: 'deposit', label: 'Caution' },
          { key: 'start', label: 'Démarrage' },
        ];
    const order = w.is_enterprise
      ? ['accept', 'deposit', 'assign_employee', 'start', 'started']
      : ['accept', 'deposit', 'start', 'started'];
    const cur = order.indexOf(w.current_step);
    return steps.map((s) => {
      const idx = order.indexOf(s.key);
      return {
        label: s.label,
        done: idx >= 0 && cur > idx,
        active: w.current_step === s.key,
      };
    });
  }

  get workflowProgress(): number {
    const steps = this.workflowSteps;
    if (!steps.length) return 0;
    const done = steps.filter((s) => s.done).length;
    const active = steps.some((s) => s.active) ? 0.5 : 0;
    return Math.round(((done + active) / steps.length) * 100);
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
