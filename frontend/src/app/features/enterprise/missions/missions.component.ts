import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatBadgeModule } from '@angular/material/badge';
import {
  EnterpriseService,
  EnterpriseEmployee,
  EmployeeAssignment,
} from '../../../core/services/enterprise.service';
import { Mission, MissionService } from '../../../core/services/mission.service';
import { EnterpriseMissionsNavComponent } from '../enterprise-missions-nav.component';

@Component({
  selector: 'app-enterprise-missions',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    MatCardModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatProgressSpinnerModule, MatProgressBarModule, MatSnackBarModule,
    MatBadgeModule,
    EnterpriseMissionsNavComponent,
  ],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1>Missions</h1>
          <p>{{ missionTab === 'ordered' ? 'Missions que vous avez commandées' : 'Missions confiées à votre entreprise' }}</p>
        </div>
      </header>

      <app-enterprise-missions-nav [showRefresh]="true" (refresh)="load()" />

      <div class="stats-grid" *ngIf="!loading">
        <div class="stat-card" *ngFor="let stat of stats">
          <div class="stat-icon" [style.background]="stat.bg">
            <mat-icon [style.color]="stat.color">{{ stat.icon }}</mat-icon>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ stat.value }}</span>
            <span class="stat-label">{{ stat.label }}</span>
          </div>
        </div>
      </div>

      <div class="filters-bar" *ngIf="!loading && missions.length">
        <button
          class="filter-chip"
          *ngFor="let f of filters"
          [class.active]="activeFilter === f.id"
          (click)="activeFilter = f.id"
        >
          {{ f.label }}
          <span class="count" *ngIf="countByFilter(f.id)">{{ countByFilter(f.id) }}</span>
        </button>
      </div>

      <mat-progress-bar mode="indeterminate" *ngIf="loading"></mat-progress-bar>

      <mat-card class="assign-card" *ngIf="showAssignForm && missionTab === 'received'">
        <div class="assign-header">
          <mat-icon>person_add</mat-icon>
          <h3>Affecter un employé</h3>
        </div>
        <div class="form-grid">
          <select class="field" [(ngModel)]="assignForm.mission">
            <option value="">Choisir une mission</option>
            <option *ngFor="let m of assignableMissions" [value]="m.id">{{ m.title }} ({{ statusLabel(m.status) }})</option>
          </select>
          <select class="field" [(ngModel)]="assignForm.employee">
            <option value="">Choisir un employé</option>
            <option *ngFor="let e of employees" [value]="e.id">{{ e.first_name }} {{ e.last_name }}</option>
          </select>
          <input class="field" [(ngModel)]="assignForm.notes" placeholder="Notes (optionnel)" />
        </div>
        <div class="form-actions">
          <button mat-button (click)="showAssignForm = false">Annuler</button>
          <button mat-flat-button color="primary" (click)="createAssignment()" [disabled]="assigning">
            {{ assigning ? 'Affectation...' : 'Confirmer l\'affectation' }}
          </button>
        </div>
      </mat-card>

      <div class="toolbar" *ngIf="!loading && missionTab === 'received'">
        <button mat-stroked-button (click)="showAssignForm = !showAssignForm" [disabled]="!assignableMissions.length || !employees.length">
          <mat-icon>person_add</mat-icon>
          Affecter un employé
        </button>
      </div>

      <section class="missions-section" *ngIf="!loading">
        <h2 class="section-title">
          {{ missionTab === 'ordered' ? 'Missions commandées' : 'Missions reçues' }}
          <span class="section-count">{{ filteredMissions.length }}</span>
        </h2>

        <div class="missions-list" *ngIf="filteredMissions.length; else emptyMissions">
          <mat-card class="mission-card" *ngFor="let m of filteredMissions" (click)="openMission(m)">
            <div class="status-badge" [class]="'status-' + m.status">
              <mat-icon>{{ statusIcon(m.status) }}</mat-icon>
              {{ statusLabel(m.status) }}
            </div>

            <div class="card-body">
              <div class="card-main">
                <h3>{{ m.title }}</h3>
                <p class="desc" *ngIf="m.description">
                  {{ m.description | slice:0:140 }}{{ (m.description.length || 0) > 140 ? '…' : '' }}
                </p>

                <div class="tags" *ngIf="m.category?.name">
                  <span class="tag">
                    <mat-icon>folder</mat-icon>
                    {{ m.category?.name }}
                  </span>
                  <span class="tag apps" *ngIf="missionTab === 'ordered' && m.application_count">
                    <mat-icon
                      aria-hidden="false"
                      [matBadge]="m.application_count"
                      matBadgeColor="accent"
                      matBadgeSize="small"
                    >group</mat-icon>
                    {{ m.application_count }} candidat{{ m.application_count > 1 ? 's' : '' }}
                  </span>
                </div>

                <div class="route" *ngIf="m.pickup_address || m.delivery_address">
                  <div class="route-line" *ngIf="m.pickup_address">
                    <span class="dot pickup"></span>
                    <mat-icon>trip_origin</mat-icon>
                    <span>{{ m.pickup_address | slice:0:42 }}{{ (m.pickup_address.length || 0) > 42 ? '…' : '' }}</span>
                  </div>
                  <div class="route-line" *ngIf="m.delivery_address">
                    <span class="dot delivery"></span>
                    <mat-icon>flag</mat-icon>
                    <span>{{ m.delivery_address | slice:0:42 }}{{ (m.delivery_address.length || 0) > 42 ? '…' : '' }}</span>
                  </div>
                </div>
              </div>

              <div class="card-meta">
                <div class="budget-box">
                  <mat-icon>payments</mat-icon>
                  <span class="amount">{{ m.budget | number:'1.0-0' }}</span>
                  <span class="currency">{{ m.currency || 'XOF' }}</span>
                </div>
                <div class="meta-line" *ngIf="m.deadline">
                  <mat-icon>event</mat-icon>
                  <span>{{ m.deadline | date:'dd MMM yyyy HH:mm' }}</span>
                </div>
                <div class="meta-line muted">
                  <mat-icon>schedule</mat-icon>
                  <span>Créée {{ m.created_at | date:'dd/MM/yyyy' }}</span>
                </div>
                <div class="meta-line client" *ngIf="missionTab === 'received' && m.client">
                  <mat-icon>person</mat-icon>
                  <span>{{ m.client.first_name }} {{ m.client.last_name }}</span>
                </div>
              </div>
            </div>

            <div class="card-footer">
              <div class="footer-left">
                <ng-container *ngIf="missionTab === 'ordered'">
                  <div class="counterparty" *ngIf="m.provider; else noProvider">
                    <mat-icon>engineering</mat-icon>
                    <span>{{ m.provider.first_name }} {{ m.provider.last_name }}</span>
                  </div>
                  <ng-template #noProvider>
                    <div class="counterparty pending">
                      <mat-icon>hourglass_empty</mat-icon>
                      <span>En attente de prestataire</span>
                    </div>
                  </ng-template>
                </ng-container>
                <ng-container *ngIf="missionTab === 'received'">
                  <div class="counterparty" *ngIf="m.deposit_paid; else depositPending">
                    <mat-icon>verified</mat-icon>
                    <span>Caution versée</span>
                  </div>
                  <ng-template #depositPending>
                    <div class="counterparty warn">
                      <mat-icon>warning</mat-icon>
                      <span>Caution à verser</span>
                    </div>
                  </ng-template>
                </ng-container>
              </div>
              <button mat-stroked-button color="primary" type="button" (click)="openMission(m, $event)">
                <mat-icon>visibility</mat-icon>
                Voir
              </button>
            </div>
          </mat-card>
        </div>

        <ng-template #emptyMissions>
          <div class="empty-state">
            <mat-icon>assignment</mat-icon>
            <h3>Aucune mission</h3>
            <p *ngIf="missionTab === 'ordered'">Publiez une mission pour trouver un prestataire ou une entreprise.</p>
            <p *ngIf="missionTab === 'received'">Postulez aux missions ou acceptez une sollicitation pour commencer.</p>
            <a mat-flat-button color="primary" routerLink="/enterprise/missions/create" *ngIf="missionTab === 'ordered'">
              <mat-icon>add</mat-icon>
              Créer une mission
            </a>
          </div>
        </ng-template>
      </section>

      <section class="assignments-section" *ngIf="!loading && missionTab === 'received'">
        <h2 class="section-title">
          Affectations employés
          <span class="section-count">{{ assignments.length }}</span>
        </h2>

        <div class="assignments-grid" *ngIf="assignments.length; else emptyAssignments">
          <mat-card class="assignment-card" *ngFor="let a of assignments">
            <div class="assignment-top">
              <mat-icon class="assignment-icon">badge</mat-icon>
              <div>
                <h4>{{ a.mission_title || ('Mission ' + (a.mission | slice:0:8)) }}</h4>
                <span class="assignment-employee">{{ a.employee_name || 'Employé non assigné' }}</span>
              </div>
              <span class="assignment-status" [class]="'st-' + a.assignment_status">
                {{ assignmentLabel(a.assignment_status) }}
              </span>
            </div>
            <div class="assignment-footer">
              <span class="assignment-date">
                <mat-icon>calendar_today</mat-icon>
                {{ a.assigned_at | date:'dd MMM yyyy HH:mm' }}
              </span>
              <button
                mat-flat-button
                color="primary"
                *ngIf="a.assignment_status === 'pending'"
                (click)="acceptAssignment(a.id)"
              >
                Confirmer
              </button>
            </div>
          </mat-card>
        </div>

        <ng-template #emptyAssignments>
          <p class="empty-inline">Aucune affectation en cours</p>
        </ng-template>
      </section>
    </div>
  `,
  styles: [`
    .page { padding: 24px; max-width: 1100px; margin: 0 auto; }

    .page-header {
      margin-bottom: 8px;
      h1 { margin: 0; font-size: 28px; font-weight: 700; color: #111827; }
      p { margin: 6px 0 0; color: #6b7280; font-size: 14px; }
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      margin-bottom: 20px;
    }
    .stat-card {
      background: #fff;
      border-radius: 14px;
      padding: 16px 18px;
      display: flex;
      align-items: center;
      gap: 14px;
      border: 1px solid #f3f4f6;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }
    .stat-icon {
      width: 44px; height: 44px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      mat-icon { font-size: 22px; width: 22px; height: 22px; }
    }
    .stat-value { font-size: 22px; font-weight: 700; color: #111827; display: block; line-height: 1.1; }
    .stat-label { font-size: 12px; color: #6b7280; }

    .filters-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 20px;
    }
    .filter-chip {
      padding: 8px 14px;
      border-radius: 999px;
      border: 1px solid #e5e7eb;
      background: #fff;
      font-size: 13px;
      font-weight: 600;
      color: #6b7280;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
      &:hover { border-color: #10b981; color: #047857; }
      &.active { background: #047857; color: #fff; border-color: #047857; }
      .count { background: rgba(0,0,0,0.12); padding: 1px 7px; border-radius: 999px; font-size: 11px; }
      &.active .count { background: rgba(255,255,255,0.25); }
    }

    .assign-card {
      padding: 20px;
      margin-bottom: 16px;
      border-radius: 14px;
      .assign-header {
        display: flex; align-items: center; gap: 8px; margin-bottom: 14px;
        h3 { margin: 0; font-size: 16px; font-weight: 600; }
        mat-icon { color: #047857; }
      }
    }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 12px; }
    .field {
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      border-radius: 10px;
      font-size: 14px;
      background: #fff;
    }
    .form-actions, .toolbar { display: flex; gap: 8px; justify-content: flex-end; margin-bottom: 16px; }
    .toolbar { justify-content: flex-start; }

    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 17px;
      font-weight: 700;
      color: #111827;
      margin: 0 0 14px;
    }
    .section-count {
      font-size: 12px;
      font-weight: 700;
      background: #ecfdf5;
      color: #047857;
      padding: 2px 10px;
      border-radius: 999px;
    }

    .missions-list { display: flex; flex-direction: column; gap: 14px; }
    .mission-card {
      position: relative;
      padding: 22px 24px;
      border-radius: 16px;
      cursor: pointer;
      transition: box-shadow 0.2s, transform 0.2s;
      border: 1px solid #f3f4f6;
      &:hover {
        box-shadow: 0 10px 28px rgba(4,120,87,0.12);
        transform: translateY(-2px);
      }
    }
    .status-badge {
      position: absolute;
      top: 18px;
      right: 18px;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 12px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
      &.status-pending { background: #fef3c7; color: #92400e; }
      &.status-funded { background: #dbeafe; color: #1e40af; }
      &.status-accepted { background: #ede9fe; color: #5b21b6; }
      &.status-in_progress { background: #d1fae5; color: #065f46; }
      &.status-submitted { background: #cffafe; color: #155e75; }
      &.status-completed { background: #d1fae5; color: #065f46; }
      &.status-cancelled, &.status-disputed { background: #fee2e2; color: #991b1b; }
      &.status-draft { background: #f3f4f6; color: #6b7280; }
    }

    .card-body {
      display: flex;
      gap: 28px;
      padding-right: 120px;
    }
    .card-main { flex: 1; min-width: 0; }
    .card-main h3 {
      margin: 0 0 8px;
      font-size: 18px;
      font-weight: 700;
      color: #111827;
      text-align: left;
    }
    .desc {
      margin: 0 0 12px;
      color: #6b7280;
      font-size: 14px;
      line-height: 1.5;
      text-align: left;
    }
    .tags { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
    .tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      background: #ecfdf5;
      color: #047857;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
      &.apps { background: #eff6ff; color: #1d4ed8; }
    }

    .route {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .route-line {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #374151;
      text-align: left;
      mat-icon { font-size: 16px; width: 16px; height: 16px; color: #9ca3af; }
    }
    .dot {
      width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
      &.pickup { background: #047857; }
      &.delivery { background: #2563eb; }
    }

    .card-meta {
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-width: 130px;
      align-items: flex-end;
      text-align: right;
    }
    .budget-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 14px 18px;
      border-radius: 12px;
      background: linear-gradient(135deg, #ecfdf5, #d1fae5);
      mat-icon { color: #047857; font-size: 20px; width: 20px; height: 20px; }
      .amount { font-size: 20px; font-weight: 800; color: #111827; line-height: 1.1; }
      .currency { font-size: 11px; font-weight: 700; color: #047857; }
    }
    .meta-line {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #6b7280;
      mat-icon { font-size: 15px; width: 15px; height: 15px; }
      &.muted { color: #9ca3af; }
      &.client { color: #374151; font-weight: 600; }
    }

    .card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #f3f4f6;
      gap: 12px;
    }
    .counterparty {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 600;
      color: #374151;
      mat-icon { font-size: 18px; width: 18px; height: 18px; color: #047857; }
      &.pending mat-icon { color: #d97706; }
      &.pending { color: #92400e; }
      &.warn mat-icon { color: #dc2626; }
      &.warn { color: #991b1b; }
    }

    .assignments-section { margin-top: 32px; }
    .assignments-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 12px;
    }
    .assignment-card {
      padding: 16px 18px;
      border-radius: 14px;
    }
    .assignment-top {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 12px;
    }
    .assignment-icon { color: #047857; margin-top: 2px; }
    .assignment-top h4 { margin: 0 0 4px; font-size: 14px; font-weight: 700; text-align: left; }
    .assignment-employee { font-size: 12px; color: #6b7280; }
    .assignment-status {
      margin-left: auto;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 999px;
      white-space: nowrap;
      &.st-pending { background: #fef3c7; color: #92400e; }
      &.st-accepted { background: #d1fae5; color: #065f46; }
      &.st-rejected { background: #fee2e2; color: #991b1b; }
      &.st-completed { background: #dbeafe; color: #1e40af; }
    }
    .assignment-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .assignment-date {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: #9ca3af;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }

    .empty-state {
      text-align: center;
      padding: 56px 24px;
      background: #fff;
      border-radius: 16px;
      border: 1px dashed #d1d5db;
      mat-icon { font-size: 56px; width: 56px; height: 56px; color: #d1d5db; margin-bottom: 12px; }
      h3 { margin: 0 0 8px; font-size: 18px; font-weight: 700; color: #111827; }
      p { margin: 0 0 20px; color: #6b7280; font-size: 14px; }
    }
    .empty-inline { text-align: center; color: #9ca3af; padding: 20px; font-size: 14px; }

    @media (max-width: 900px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .card-body { flex-direction: column; padding-right: 0; gap: 16px; }
      .card-meta { align-items: flex-start; text-align: left; flex-direction: row; flex-wrap: wrap; }
      .status-badge { position: static; margin-bottom: 10px; width: fit-content; }
      .form-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 480px) {
      .page { padding: 16px; }
      .stats-grid { grid-template-columns: 1fr 1fr; }
      .card-footer { flex-direction: column; align-items: stretch; }
    }
  `]
})
export class EnterpriseMissionsComponent implements OnInit {
  missions: Mission[] = [];
  assignments: EmployeeAssignment[] = [];
  employees: EnterpriseEmployee[] = [];
  loading = true;
  missionTab: 'ordered' | 'received' = 'ordered';
  activeFilter = 'all';
  showAssignForm = false;
  assigning = false;
  assignForm = { mission: '', employee: '', notes: '' };

  stats = [
    { icon: 'assignment', label: 'Total', value: 0, color: '#047857', bg: '#ecfdf5', filter: 'all' },
    { icon: 'pending_actions', label: 'En cours', value: 0, color: '#2563eb', bg: '#eff6ff', filter: 'active' },
    { icon: 'schedule', label: 'En attente', value: 0, color: '#d97706', bg: '#fffbeb', filter: 'pending' },
    { icon: 'check_circle', label: 'Terminées', value: 0, color: '#059669', bg: '#ecfdf5', filter: 'completed' },
  ];

  filters = [
    { id: 'all', label: 'Toutes' },
    { id: 'active', label: 'En cours' },
    { id: 'pending', label: 'En attente' },
    { id: 'completed', label: 'Terminées' },
  ];

  constructor(
    private enterpriseService: EnterpriseService,
    private missionService: MissionService,
    private snack: MatSnackBar,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const tab = params.get('tab');
      this.missionTab = tab === 'received' ? 'received' : 'ordered';
      this.activeFilter = 'all';
      this.load();
    });
  }

  countByFilter(id: string): number {
    return this.filterMissions(id).length;
  }

  private filterMissions(id: string): Mission[] {
    switch (id) {
      case 'active':
        return this.missions.filter(m => ['accepted', 'in_progress', 'submitted'].includes(m.status));
      case 'pending':
        return this.missions.filter(m => ['draft', 'pending', 'funded'].includes(m.status));
      case 'completed':
        return this.missions.filter(m => m.status === 'completed');
      default:
        return this.missions;
    }
  }

  get filteredMissions(): Mission[] {
    return this.filterMissions(this.activeFilter);
  }

  get assignableMissions(): Mission[] {
    return this.missions.filter(
      (m) => m.deposit_paid && ['accepted', 'in_progress'].includes(m.status),
    );
  }

  load(): void {
    this.loading = true;
    const scope = this.missionTab === 'received' ? 'received' as const : undefined;
    this.missionService.getMyMissions('enterprise', scope).subscribe({
      next: (m) => {
        this.missions = m;
        this.updateStats();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snack.open('Erreur chargement missions', 'Fermer', { duration: 3000 });
      },
    });
    this.enterpriseService.getEmployees().subscribe({
      next: (e) => { this.employees = e.filter((x) => x.is_active); },
    });
    if (this.missionTab === 'received') {
      this.enterpriseService.getAssignments().subscribe({
        next: (a) => { this.assignments = a; },
      });
    } else {
      this.assignments = [];
    }
  }

  updateStats(): void {
    this.stats[0].value = this.missions.length;
    this.stats[1].value = this.missions.filter(m =>
      ['accepted', 'in_progress', 'submitted'].includes(m.status)
    ).length;
    this.stats[2].value = this.missions.filter(m =>
      ['draft', 'pending', 'funded'].includes(m.status)
    ).length;
    this.stats[3].value = this.missions.filter(m => m.status === 'completed').length;
  }

  openMission(m: Mission, event?: Event): void {
    event?.stopPropagation();
    if (this.missionTab === 'received') {
      this.router.navigate(['/enterprise/missions/received', m.id]);
    } else {
      this.router.navigate(['/enterprise/missions', m.id]);
    }
  }

  createAssignment(): void {
    if (!this.assignForm.mission || !this.assignForm.employee) {
      this.snack.open('Sélectionnez une mission et un employé', 'Fermer', { duration: 3000 });
      return;
    }
    this.assigning = true;
    this.enterpriseService.createAssignment(this.assignForm).subscribe({
      next: () => {
        this.assigning = false;
        this.showAssignForm = false;
        this.assignForm = { mission: '', employee: '', notes: '' };
        this.snack.open('Employé affecté à la mission', 'Fermer', { duration: 3000 });
        this.load();
      },
      error: (err) => {
        this.assigning = false;
        this.snack.open(err.error?.detail || 'Erreur affectation', 'Fermer', { duration: 4000 });
      },
    });
  }

  acceptAssignment(id: string): void {
    this.enterpriseService.acceptAssignment(id).subscribe({
      next: () => {
        this.snack.open('Affectation confirmée', 'Fermer', { duration: 2000 });
        this.load();
      },
      error: () => this.snack.open('Erreur', 'Fermer', { duration: 3000 }),
    });
  }

  statusLabel(s: string): string {
    const m: Record<string, string> = {
      draft: 'Brouillon', pending: 'En attente', funded: 'Financée',
      accepted: 'Acceptée', in_progress: 'En cours', submitted: 'Soumise',
      completed: 'Terminée', cancelled: 'Annulée', disputed: 'Litige',
    };
    return m[s] || s;
  }

  statusIcon(s: string): string {
    const m: Record<string, string> = {
      draft: 'edit_note', pending: 'hourglass_empty', funded: 'account_balance_wallet',
      accepted: 'handshake', in_progress: 'directions_run', submitted: 'upload_file',
      completed: 'check_circle', cancelled: 'cancel', disputed: 'gavel',
    };
    return m[s] || 'info';
  }

  assignmentLabel(s: string): string {
    const m: Record<string, string> = {
      pending: 'En attente', accepted: 'Confirmée', rejected: 'Refusée', completed: 'Terminée',
    };
    return m[s] || s;
  }
}
