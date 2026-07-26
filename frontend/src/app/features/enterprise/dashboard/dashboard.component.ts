import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  EnterpriseService,
  EnterpriseMission,
} from '../../../core/services/enterprise.service';

@Component({
  selector: 'app-enterprise-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="dash">
      <div class="loading" *ngIf="loading"><mat-spinner diameter="40"></mat-spinner></div>

      <ng-container *ngIf="!loading">
        <header class="dash-header">
          <div>
            <p class="eyebrow">Espace entreprise</p>
            <h1>{{ companyName || 'Tableau de bord' }}</h1>
            <p class="sub">
              {{ employeeCount }} employé(s) · {{ totalMissions }} mission(s) ce mois
            </p>
          </div>
          <div class="header-actions">
            <button mat-stroked-button routerLink="/enterprise/teams">
              <mat-icon>groups</mat-icon> Équipes
            </button>
            <button mat-flat-button color="primary" routerLink="/enterprise/missions/create">
              <mat-icon>add</mat-icon> Nouvelle mission
            </button>
          </div>
        </header>

        <div class="metrics">
          <div class="metric">
            <span class="metric-val">{{ activeMissions }}</span>
            <span class="metric-lbl">En cours</span>
          </div>
          <div class="metric">
            <span class="metric-val">{{ completedToday }}</span>
            <span class="metric-lbl">Terminées aujourd'hui</span>
          </div>
          <div class="metric">
            <span class="metric-val">{{ monthlyRevenue | number:'1.0-0' }}</span>
            <span class="metric-lbl">Dépenses ({{ currency }})</span>
          </div>
          <div class="metric">
            <span class="metric-val">{{ availableAgents }}</span>
            <span class="metric-lbl">Agents disponibles</span>
          </div>
        </div>

        <nav class="quick-links" aria-label="Accès rapides">
          <a routerLink="/enterprise/tracking"><mat-icon>my_location</mat-icon> Suivi terrain</a>
          <a routerLink="/enterprise/missions"><mat-icon>assignment</mat-icon> Missions</a>
          <a routerLink="/enterprise/employees"><mat-icon>badge</mat-icon> Employés</a>
          <a routerLink="/enterprise/payroll"><mat-icon>payments</mat-icon> Salaires</a>
          <a routerLink="/enterprise/finances"><mat-icon>account_balance</mat-icon> Finances</a>
          <a routerLink="/enterprise/analytics"><mat-icon>insights</mat-icon> Rapports</a>
        </nav>

        <section class="panel">
          <div class="panel-head">
            <h2>Missions en cours</h2>
            <a mat-button routerLink="/enterprise/missions">Voir tout</a>
          </div>

          <div class="table-wrap" *ngIf="activeMissionsList.length; else noMissions">
            <table>
              <thead>
                <tr>
                  <th>Mission</th>
                  <th>Assigné</th>
                  <th>Statut</th>
                  <th>Lieu</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let mission of activeMissionsList">
                  <td>
                    <strong>{{ mission.title }}</strong>
                    <span class="muted">{{ mission.client }}</span>
                  </td>
                  <td>
                    <div class="person">
                      <span class="avatar">{{ mission.employee.initials }}</span>
                      {{ mission.employee.name }}
                    </div>
                  </td>
                  <td>
                    <span class="status" [attr.data-status]="mission.status">
                      {{ getMissionStatusLabel(mission.status) }}
                    </span>
                  </td>
                  <td class="muted">{{ mission.currentLocation }}</td>
                  <td class="actions">
                    <button mat-icon-button [matMenuTriggerFor]="menu" aria-label="Actions">
                      <mat-icon>more_horiz</mat-icon>
                    </button>
                    <mat-menu #menu="matMenu">
                      <button mat-menu-item (click)="trackMission(mission)">
                        <mat-icon>gps_fixed</mat-icon> Suivre
                      </button>
                      <button mat-menu-item (click)="reassignMission(mission)">
                        <mat-icon>swap_horiz</mat-icon> Réassigner
                      </button>
                    </mat-menu>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <ng-template #noMissions>
            <p class="empty">Aucune mission en cours pour le moment.</p>
          </ng-template>
        </section>

        <div class="split">
          <section class="panel">
            <div class="panel-head">
              <h2>Agents terrain</h2>
              <a mat-button routerLink="/enterprise/tracking">Carte</a>
            </div>
            <div class="agent-list" *ngIf="activeAgents.length; else noAgents">
              <div class="agent-row" *ngFor="let agent of activeAgents">
                <span class="avatar">{{ agent.name.slice(0, 2).toUpperCase() }}</span>
                <div class="agent-info">
                  <strong>{{ agent.name }}</strong>
                  <span class="muted">{{ getStatusLabel(agent.status) }}</span>
                </div>
                <span class="dot" [attr.data-status]="agent.status"></span>
              </div>
            </div>
            <ng-template #noAgents>
              <p class="empty">Aucun agent suivi pour l’instant.</p>
            </ng-template>
          </section>

          <section class="panel">
            <div class="panel-head">
              <h2>Activité employés</h2>
              <a mat-button routerLink="/enterprise/employees">Voir tout</a>
            </div>
            <div class="agent-list" *ngIf="topEmployees.length; else noEmp">
              <div class="agent-row" *ngFor="let emp of topEmployees">
                <span class="rank">{{ emp.rank }}</span>
                <span class="avatar">{{ emp.initials }}</span>
                <div class="agent-info">
                  <strong>{{ emp.name }}</strong>
                  <span class="muted">{{ emp.missions }} mission(s) terminée(s)</span>
                </div>
              </div>
            </div>
            <ng-template #noEmp>
              <p class="empty">Ajoutez des employés pour suivre l’activité.</p>
            </ng-template>
          </section>
        </div>

        <section class="panel" *ngIf="alerts.length">
          <div class="panel-head"><h2>Notes</h2></div>
          <div class="note" *ngFor="let alert of alerts">
            <mat-icon>{{ alert.icon }}</mat-icon>
            <div>
              <p>{{ alert.message }}</p>
              <span class="muted">{{ alert.time }}</span>
            </div>
          </div>
        </section>
      </ng-container>
    </div>
  `,
  styles: [`
    .dash {
      max-width: 1120px;
      margin: 0 auto;
      padding: 28px 24px 56px;
      display: flex;
      flex-direction: column;
      gap: 20px;
      color: #0f172a;
    }
    .loading { display: flex; justify-content: center; padding: 64px; }

    .dash-header {
      display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; align-items: flex-end;
    }
    .eyebrow {
      margin: 0 0 4px; font-size: 11px; font-weight: 600; letter-spacing: 0.08em;
      text-transform: uppercase; color: #64748b;
    }
    h1 { margin: 0 0 4px; font-size: 26px; font-weight: 700; letter-spacing: -0.02em; }
    .sub { margin: 0; color: #64748b; font-size: 14px; }
    .header-actions { display: flex; gap: 8px; flex-wrap: wrap; }

    .metrics {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;
    }
    .metric {
      border: 1px solid #e2e8f0; background: #fff; border-radius: 10px; padding: 16px 18px;
    }
    .metric-val {
      display: block; font-size: 24px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.2;
    }
    .metric-lbl { font-size: 12px; color: #64748b; margin-top: 4px; display: block; }

    .quick-links {
      display: flex; flex-wrap: wrap; gap: 8px;
      a {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px;
        background: #fff; color: #334155; text-decoration: none; font-size: 13px; font-weight: 550;
        mat-icon { font-size: 18px; width: 18px; height: 18px; color: #16a34a; }
        &:hover { border-color: #86efac; background: #f0fdf4; }
      }
    }

    .panel {
      border: 1px solid #e2e8f0; background: #fff; border-radius: 12px; padding: 16px 18px;
    }
    .panel-head {
      display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 12px;
      h2 { margin: 0; font-size: 15px; font-weight: 650; color: #0f172a; }
    }

    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; }
    th {
      text-align: left; padding: 10px 8px; font-size: 11px; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.04em; color: #94a3b8;
      border-bottom: 1px solid #e2e8f0;
    }
    td {
      padding: 14px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; font-size: 13px;
      strong { display: block; font-weight: 600; color: #0f172a; }
    }
    .muted { display: block; color: #94a3b8; font-size: 12px; margin-top: 2px; }
    td.muted { display: table-cell; }
    .person { display: flex; align-items: center; gap: 8px; }
    .avatar {
      width: 28px; height: 28px; border-radius: 6px; background: #0f172a; color: #fff;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 10px; font-weight: 700; flex-shrink: 0;
    }
    .status {
      display: inline-block; font-size: 11px; font-weight: 600; padding: 3px 8px;
      border-radius: 4px; background: #f1f5f9; color: #475569;
      &[data-status="in_progress"], &[data-status="accepted"], &[data-status="submitted"] {
        background: #ecfdf5; color: #166534;
      }
    }
    .actions { text-align: right; white-space: nowrap; }

    .split { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .agent-list { display: flex; flex-direction: column; }
    .agent-row {
      display: flex; align-items: center; gap: 10px; padding: 10px 0;
      border-bottom: 1px solid #f1f5f9;
      &:last-child { border-bottom: 0; }
    }
    .agent-info { flex: 1; min-width: 0;
      strong { display: block; font-size: 13px; font-weight: 600; }
    }
    .rank {
      width: 22px; text-align: center; font-size: 12px; font-weight: 700; color: #94a3b8;
    }
    .dot {
      width: 8px; height: 8px; border-radius: 50%; background: #cbd5e1;
      &[data-status="available"], &[data-status="active"] { background: #16a34a; }
      &[data-status="busy"] { background: #d97706; }
    }

    .note {
      display: flex; gap: 10px; align-items: flex-start; padding: 10px 0;
      border-bottom: 1px solid #f1f5f9;
      mat-icon { color: #16a34a; font-size: 20px; width: 20px; height: 20px; }
      p { margin: 0 0 2px; font-size: 13px; }
      &:last-child { border-bottom: 0; }
    }

    .empty { margin: 0; padding: 20px 4px; color: #94a3b8; font-size: 13px; }

    @media (max-width: 900px) {
      .metrics { grid-template-columns: repeat(2, 1fr); }
      .split { grid-template-columns: 1fr; }
    }
    @media (max-width: 560px) {
      .dash { padding: 16px 16px 40px; }
      .metrics { grid-template-columns: 1fr; }
      h1 { font-size: 22px; }
    }
  `],
})
export class EnterpriseDashboardComponent implements OnInit {
  loading = true;
  companyName = '';
  employeeCount = 0;
  totalMissions = 0;
  currency = 'XOF';

  activeMissions = 0;
  completedToday = 0;
  monthlyRevenue = 0;

  activeAgents: { name: string; status: string }[] = [];
  availableAgents = 0;
  activeMissionsList: any[] = [];
  topEmployees: { rank: number; name: string; initials: string; missions: number }[] = [];
  alerts: { type: string; icon: string; message: string; time: string }[] = [];

  constructor(
    private enterpriseService: EnterpriseService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    forkJoin({
      profile: this.enterpriseService.getProfile(),
      analytics: this.enterpriseService.getAnalytics(),
      missions: this.enterpriseService.getMissions(),
      employees: this.enterpriseService.getEmployees(),
      availability: this.enterpriseService.getAvailability(),
    }).subscribe({
      next: ({ profile, analytics, missions, employees, availability }) => {
        this.companyName = profile.company_name;
        this.employeeCount = analytics.employees_count ?? employees.length;
        this.totalMissions = analytics.missions_total ?? missions.length;
        this.activeMissions = analytics.missions_active ?? 0;
        this.completedToday = analytics.missions_completed_today ?? 0;
        this.monthlyRevenue = analytics.spent_this_month ?? 0;

        const activeStatuses = ['accepted', 'in_progress', 'submitted'];
        this.activeMissionsList = missions
          .filter((m) => activeStatuses.includes(m.status))
          .slice(0, 8)
          .map((m) => this.mapMissionRow(m));

        this.topEmployees = [...employees]
          .sort((a, b) => b.missions_completed - a.missions_completed)
          .slice(0, 5)
          .map((e, i) => ({
            rank: i + 1,
            name: `${e.first_name} ${e.last_name}`,
            initials: `${(e.first_name || '?')[0]}${(e.last_name || '?')[0]}`.toUpperCase(),
            missions: e.missions_completed,
          }));

        this.activeAgents = availability.slice(0, 8).map((a) => ({
          name: a.employee_name || 'Agent',
          status: a.status || 'available',
        }));
        this.availableAgents = availability.filter((a) => a.status === 'available').length;

        if (!this.activeMissionsList.length && analytics.missions_completed > 0) {
          this.alerts = [{
            type: 'info',
            icon: 'check_circle',
            message: `${analytics.missions_completed} mission(s) terminée(s) au total`,
            time: 'Récent',
          }];
        }

        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  private mapMissionRow(m: EnterpriseMission) {
    return {
      id: m.id,
      title: m.title,
      client: m.pickup_city || 'Départ',
      employee: {
        name: (m as any).provider_name || 'Non assigné',
        initials: ((m as any).provider_name || 'NA').slice(0, 2).toUpperCase(),
      },
      status: m.status,
      currentLocation: m.delivery_city || '—',
    };
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      active: 'En mission',
      busy: 'Occupé',
      available: 'Disponible',
    };
    return labels[status] || status;
  }

  getMissionStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      in_progress: 'En cours',
      accepted: 'Acceptée',
      submitted: 'Soumise',
      assigned: 'Assignée',
    };
    return labels[status] || status;
  }

  trackMission(_mission: any): void {
    this.router.navigate(['/enterprise/tracking']);
  }

  reassignMission(_mission: any): void {
    this.router.navigate(['/enterprise/missions']);
  }
}
