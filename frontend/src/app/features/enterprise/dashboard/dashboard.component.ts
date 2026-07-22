import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  EnterpriseService,
  EnterpriseMission,
  EnterpriseEmployee,
} from '../../../core/services/enterprise.service';

@Component({
  selector: 'app-enterprise-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTableModule,
    MatBadgeModule,
    MatMenuModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="dashboard-container">
      <div class="loading" *ngIf="loading"><mat-spinner diameter="40"></mat-spinner></div>

      <ng-container *ngIf="!loading">
      <!-- Company Header -->
      <div class="company-header">
        <div class="company-info">
          <div class="logo"><mat-icon>business</mat-icon></div>
          <div class="details">
            <h1>{{ companyName }}</h1>
            <div class="meta">
              <mat-chip-listbox>
                <mat-chip-option color="primary" selected>{{ planType }}</mat-chip-option>
              </mat-chip-listbox>
              <span class="employee-count">{{ employeeCount }} employés</span>
              <span class="missions-count">{{ totalMissions }} missions ce mois</span>
            </div>
          </div>
        </div>
        <div class="company-actions">
          <button mat-raised-button color="primary" routerLink="/enterprise/missions/create">
            <mat-icon>add</mat-icon>
            Nouvelle mission
          </button>
          <button mat-stroked-button routerLink="/enterprise/employees">
            <mat-icon>people</mat-icon>
            Gérer équipe
          </button>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid">
        <mat-card class="stat-card">
          <div class="stat-icon in-progress">
            <mat-icon>local_shipping</mat-icon>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ activeMissions }}</span>
            <span class="stat-label">Missions en cours</span>
          </div>
        </mat-card>

        <mat-card class="stat-card">
          <div class="stat-icon completed">
            <mat-icon>check_circle</mat-icon>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ completedToday }}</span>
            <span class="stat-label">Terminées aujourd'hui</span>
          </div>
        </mat-card>

        <mat-card class="stat-card">
          <div class="stat-icon revenue">
            <mat-icon>account_balance_wallet</mat-icon>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ monthlyRevenue }} {{ currency }}</span>
            <span class="stat-label">Dépenses ce mois</span>
          </div>
        </mat-card>

        <mat-card class="stat-card">
          <div class="stat-icon efficiency">
            <mat-icon>speed</mat-icon>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ avgCompletionTime }}h</span>
            <span class="stat-label">Temps moyen</span>
          </div>
        </mat-card>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions-bar">
        <button mat-stroked-button routerLink="/enterprise/tracking">
          <mat-icon>my_location</mat-icon>
          Carte en temps réel
        </button>
        <button mat-stroked-button routerLink="/enterprise/analytics">
          <mat-icon>analytics</mat-icon>
          Rapports
        </button>
        <button mat-stroked-button routerLink="/enterprise/finances">
          <mat-icon>receipt</mat-icon>
          Facturation
        </button>
      </div>

      <!-- Live Map Preview -->
      <mat-card class="map-card">
        <mat-card-header>
          <mat-card-title>Position des agents en temps réel</mat-card-title>
          <button mat-button color="primary" routerLink="/enterprise/tracking">
            Voir la carte complète
          </button>
        </mat-card-header>
        <mat-card-content>
          <div class="map-placeholder">
            <div class="map-overlay">
              <div class="agent-marker" *ngFor="let agent of activeAgents" 
                   [style.left.%]="agent.x" [style.top.%]="agent.y">
                <div class="marker-icon" [class]="agent.status">
                  <span class="marker-initials">{{ agent.name.slice(0,2).toUpperCase() }}</span>
                </div>
                <div class="marker-label">{{ agent.name }}</div>
                <div class="marker-status">{{ getStatusLabel(agent.status) }}</div>
              </div>
            </div>
            <div class="map-info">
              <span>{{ activeAgents.length }} agents actifs</span>
              <span>•</span>
              <span>{{ availableAgents }} disponibles</span>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Active Missions Table -->
      <mat-card class="missions-table-card">
        <mat-card-header>
          <mat-card-title>Missions en cours</mat-card-title>
          <div class="table-actions">
            <button mat-button routerLink="/enterprise/missions">
              <mat-icon>list</mat-icon>
              Voir tout
            </button>
          </div>
        </mat-card-header>
        <mat-card-content>
          <table class="missions-table">
            <thead>
              <tr>
                <th>Mission</th>
                <th>Assigné à</th>
                <th>Statut</th>
                <th>Localisation</th>
                <th>Progression</th>
                <th>Actions</th>
              </tr>
            </thead>
              <tbody>
              <tr *ngIf="!activeMissionsList.length">
                <td colspan="6" class="empty-row">Aucune mission en cours</td>
              </tr>
              <tr *ngFor="let mission of activeMissionsList">
                <td>
                  <div class="mission-cell">
                    <strong>{{ mission.title }}</strong>
                    <span class="subtitle">{{ mission.client }}</span>
                  </div>
                </td>
                <td>
                  <div class="employee-cell">
                    <div class="avatar-initials">{{ mission.employee.initials }}</div>
                    <span>{{ mission.employee.name }}</span>
                  </div>
                </td>
                <td>
                  <mat-chip-listbox>
                    <mat-chip-option [color]="getMissionStatusColor(mission.status)" selected>
                      {{ getMissionStatusLabel(mission.status) }}
                    </mat-chip-option>
                  </mat-chip-listbox>
                </td>
                <td>
                  <div class="location-cell">
                    <mat-icon>location_on</mat-icon>
                    <span>{{ mission.currentLocation }}</span>
                  </div>
                </td>
                <td>
                  <div class="progress-cell">
                    <div class="progress-bar">
                      <div class="progress-fill" [style.width.%]="mission.progress"></div>
                    </div>
                    <span>{{ mission.progress }}%</span>
                  </div>
                </td>
                <td>
                  <div class="actions-cell">
                    <button mat-icon-button [matMenuTriggerFor]="menu">
                      <mat-icon>more_vert</mat-icon>
                    </button>
                    <mat-menu #menu="matMenu">
                      <button mat-menu-item (click)="trackMission(mission)">
                        <mat-icon>gps_fixed</mat-icon>
                        <span>Suivre</span>
                      </button>
                      <button mat-menu-item (click)="contactEmployee(mission.employee)">
                        <mat-icon>chat</mat-icon>
                        <span>Contacter</span>
                      </button>
                      <button mat-menu-item (click)="reassignMission(mission)">
                        <mat-icon>swap_horiz</mat-icon>
                        <span>Réassigner</span>
                      </button>
                    </mat-menu>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </mat-card-content>
      </mat-card>

      <!-- Employees & Performance -->
      <div class="bottom-grid">
        <mat-card class="employees-card">
          <mat-card-header>
            <mat-card-title>Top Performers</mat-card-title>
            <button mat-button color="primary" routerLink="/enterprise/employees">
              Voir tout
            </button>
          </mat-card-header>
          <mat-card-content>
            <div class="employee-list">
              <div class="employee-item" *ngFor="let emp of topEmployees">
                <div class="rank">#{{ emp.rank }}</div>
                <div class="avatar-initials">{{ emp.initials }}</div>
                <div class="employee-info">
                  <strong>{{ emp.name }}</strong>
                  <span>{{ emp.missions }} missions • {{ emp.rating }} /5</span>
                </div>
                <div class="employee-stats">
                  <span class="earnings">{{ emp.missions }} missions</span>
                </div>
              </div>
              <p class="empty-row" *ngIf="!topEmployees.length">Ajoutez des employés pour voir les performances</p>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="alerts-card">
          <mat-card-header>
            <mat-card-title>Alertes & Notifications</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="alert-list">
              <div class="alert-item" *ngFor="let alert of alerts" [class]="alert.type">
                <mat-icon>{{ alert.icon }}</mat-icon>
                <div class="alert-content">
                  <p>{{ alert.message }}</p>
                  <span class="time">{{ alert.time }}</span>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 24px;
      padding-bottom: 48px;
      display: flex;
      flex-direction: column;
      gap: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }
    .loading { display: flex; justify-content: center; padding: 60px; }
    .empty-row { text-align: center; color: #9ca3af; padding: 24px; }
    .avatar-initials {
      width: 32px; height: 32px; border-radius: 50%; background: #3CB371; color: #fff;
      display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700;
    }

    .company-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px 28px;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 1rem;

      .company-info {
        display: flex;
        align-items: center;
        gap: 20px;

        .logo {
          width: 56px;
          height: 56px;
          border-radius: 0.75rem;
          background: linear-gradient(135deg, #3CB371 0%, #16a34a 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;

          mat-icon {
            font-size: 28px;
            width: 28px;
            height: 28px;
            color: #ffffff;
          }
        }

        .details {
          h1 {
            margin: 0 0 8px 0;
            font-size: 24px;
            font-weight: 700;
            color: #111827;
          }

          .meta {
            display: flex;
            align-items: center;
            gap: 16px;
            flex-wrap: wrap;

            span {
              font-size: 14px;
              color: #6b7280;
            }
          }
        }
      }

      .company-actions {
        display: flex;
        gap: 12px;
        flex-shrink: 0;
      }
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      min-height: 6.5rem;
      border: 1px solid #e5e7eb;
      border-radius: 1rem;
      background: #ffffff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
      transition: transform 0.2s ease, box-shadow 0.2s ease;

      &:hover {
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08);
        transform: translateY(-3px);
      }

      .stat-icon {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;

        mat-icon {
          font-size: 24px;
          width: 24px;
          height: 24px;
        }
      }

      .stat-icon.in-progress { background: #dbeafe; color: #2563eb; }
      .stat-icon.completed { background: #d1fae5; color: #059669; }
      .stat-icon.revenue { background: #fce7f3; color: #db2777; }
      .stat-icon.efficiency { background: #fef3c7; color: #d97706; }

      .stat-content {
        display: flex;
        flex-direction: column;
      }

      .stat-value {
        font-size: 24px;
        font-weight: 700;
        color: #1f2937;
      }

      .stat-label {
        font-size: 14px;
        color: #6b7280;
      }
    }

    .quick-actions-bar {
      display: flex;
      gap: 12px;
    }

    .map-card {
      mat-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }

      .map-placeholder {
        height: 300px;
        background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
        border-radius: 12px;
        position: relative;
        overflow: hidden;
      }

      .map-overlay {
        position: absolute;
        inset: 0;
      }

      .agent-marker {
        position: absolute;
        transform: translate(-50%, -50%);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
      }

      .marker-icon {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        overflow: hidden;
        border: 3px solid;

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        &.active { border-color: #059669; }
        &.busy { border-color: #d97706; }
        &.available { border-color: #2563eb; }
      }

      .marker-label {
        font-size: 12px;
        font-weight: 500;
        background: rgba(0,0,0,0.7);
        color: white;
        padding: 2px 8px;
        border-radius: 4px;
      }

      .marker-status {
        font-size: 10px;
        color: #6b7280;
        background: white;
        padding: 2px 6px;
        border-radius: 4px;
      }

      .map-info {
        position: absolute;
        bottom: 16px;
        left: 16px;
        background: white;
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 14px;
        display: flex;
        gap: 12px;
      }
    }

    .missions-table-card {
      mat-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }

      .missions-table {
        width: 100%;
        border-collapse: collapse;

        th {
          text-align: left;
          padding: 12px 16px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          color: #6b7280;
          border-bottom: 1px solid #e5e7eb;
        }

        td {
          padding: 16px;
          border-bottom: 1px solid #e5e7eb;
        }

        .mission-cell {
          display: flex;
          flex-direction: column;

          strong {
            font-weight: 500;
          }

          .subtitle {
            font-size: 12px;
            color: #9ca3af;
          }
        }

        .employee-cell {
          display: flex;
          align-items: center;
          gap: 8px;

          .avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
          }
        }

        .location-cell {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #6b7280;
          font-size: 14px;

          mat-icon {
            font-size: 16px;
            width: 16px;
            height: 16px;
          }
        }

        .progress-cell {
          display: flex;
          align-items: center;
          gap: 12px;

          .progress-bar {
            flex: 1;
            height: 6px;
            background: #e5e7eb;
            border-radius: 3px;
            overflow: hidden;
          }

          .progress-fill {
            height: 100%;
            background: #3b82f6;
            border-radius: 3px;
          }

          span {
            font-size: 12px;
            font-weight: 500;
            min-width: 36px;
          }
        }
      }
    }

    .bottom-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    .employees-card {
      mat-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }

      .employee-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .employee-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: #f9fafb;
        border-radius: 8px;

        .rank {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f59e0b;
          color: white;
          border-radius: 50%;
          font-size: 12px;
          font-weight: 700;
        }

        .avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
        }

        .employee-info {
          flex: 1;
          display: flex;
          flex-direction: column;

          strong {
            font-weight: 500;
          }

          span {
            font-size: 12px;
            color: #6b7280;
          }
        }

        .earnings {
          font-weight: 600;
          color: #059669;
        }
      }
    }

    .alerts-card {
      .alert-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .alert-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 12px;
        border-radius: 8px;

        mat-icon {
          font-size: 20px;
          width: 20px;
          height: 20px;
        }

        .alert-content {
          flex: 1;

          p {
            margin: 0 0 4px 0;
            font-size: 14px;
          }

          .time {
            font-size: 12px;
            color: #9ca3af;
          }
        }

        &.warning { background: #fef3c7; color: #92400e; }
        &.info { background: #dbeafe; color: #1e40af; }
        &.success { background: #d1fae5; color: #065f46; }
        &.urgent { background: #fee2e2; color: #991b1b; }
      }
    }

    @media (max-width: 1024px) {
      .bottom-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 768px) {
      .dashboard-container {
        padding: 16px;
        padding-bottom: 40px;
      }

      .company-header {
        flex-direction: column;
        align-items: stretch;
        gap: 20px;

        .company-actions {
          flex-direction: column;
          width: 100%;
        }
      }

      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }

      .quick-actions-bar {
        flex-direction: column;
      }

      .missions-table-card {
        overflow-x: auto;
      }
    }

    @media (max-width: 480px) {
      .stats-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class EnterpriseDashboardComponent implements OnInit {
  loading = true;
  companyName = '';
  planType = 'Entreprise';
  employeeCount = 0;
  totalMissions = 0;
  currency = 'XOF';

  activeMissions = 0;
  completedToday = 0;
  monthlyRevenue = 0;
  avgCompletionTime = 0;

  activeAgents: { name: string; status: string; x: number; y: number }[] = [];
  availableAgents = 0;
  activeMissionsList: any[] = [];
  topEmployees: { rank: number; name: string; initials: string; missions: number; rating: number; earnings: number }[] = [];
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
          .slice(0, 5)
          .map((m) => this.mapMissionRow(m));

        this.topEmployees = [...employees]
          .sort((a, b) => b.missions_completed - a.missions_completed)
          .slice(0, 3)
          .map((e, i) => ({
            rank: i + 1,
            name: `${e.first_name} ${e.last_name}`,
            initials: `${e.first_name[0]}${e.last_name[0]}`,
            missions: e.missions_completed,
            rating: 4.5,
            earnings: 0,
          }));

        this.activeAgents = availability.slice(0, 6).map((a, i) => ({
          name: a.employee_name || 'Agent',
          status: a.status || 'available',
          x: 15 + (i % 3) * 30,
          y: 20 + Math.floor(i / 3) * 35,
        }));
        this.availableAgents = availability.filter((a) => a.status === 'available').length;

        if (!this.activeMissionsList.length && analytics.missions_completed > 0) {
          this.alerts = [{
            type: 'success', icon: 'check_circle',
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
    const progressMap: Record<string, number> = {
      accepted: 20, in_progress: 60, submitted: 90,
    };
    return {
      id: m.id,
      title: m.title,
      client: m.pickup_city || 'Départ',
      employee: {
        name: (m as any).provider_name || 'Prestataire externe',
        initials: ((m as any).provider_name || 'PE').slice(0, 2).toUpperCase(),
      },
      status: m.status,
      currentLocation: m.delivery_city || '—',
      progress: progressMap[m.status] || 10,
    };
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'active': 'En mission',
      'busy': 'Occupé',
      'available': 'Disponible'
    };
    return labels[status] || status;
  }
  
  getMissionStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'in_progress': 'accent',
      'assigned': 'warn'
    };
    return colors[status] || 'primary';
  }
  
  getMissionStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'in_progress': 'En cours',
      'accepted': 'Acceptée',
      'submitted': 'Soumise',
      'assigned': 'Assignée',
    };
    return labels[status] || status;
  }

  trackMission(_mission: any): void {
    this.router.navigate(['/enterprise/tracking']);
  }

  contactEmployee(_employee: any): void {}

  reassignMission(_mission: any): void {
    this.router.navigate(['/enterprise/missions']);
  }
}
