import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatBadgeModule } from '@angular/material/badge';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService, User } from '../../../core/services/auth.service';
import { MissionService, Mission } from '../../../core/services/mission.service';
import { formatXOF } from '../../../core/constants/africa.constants';
import { MissionApplicationsComponent } from '../missions/mission-applications/mission-applications.component';

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressBarModule,
    MatTableModule,
    MatBadgeModule,
    MatSnackBarModule,
    MissionApplicationsComponent
  ],
  template: `
    <div class="dashboard-container">
      <!-- Welcome Section - Stripe Style -->
      <div class="welcome-section">
        <div class="welcome-content">
          <h1>Bonjour {{ (currentUser$ | async)?.first_name || 'Client' }}</h1>
          <p>Bienvenue sur votre tableau de bord BlockTask</p>
        </div>
        <button mat-raised-button class="create-btn" routerLink="/client/missions/create">
          <mat-icon>add</mat-icon>
          Nouvelle mission
        </button>
      </div>
      
      <!-- Stats Cards - Stripe Style -->
      <div class="stats-grid">
        <mat-card class="stat-card stat-card--active">
          <div class="stat-icon">
            <mat-icon>pending_actions</mat-icon>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.active }}</span>
            <span class="stat-label">Missions actives</span>
          </div>
          <div class="stat-trend positive">
            <mat-icon>trending_up</mat-icon>
            <span>+12%</span>
          </div>
        </mat-card>

        <mat-card class="stat-card stat-card--completed">
          <div class="stat-icon">
            <mat-icon>check_circle</mat-icon>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.completed }}</span>
            <span class="stat-label">Missions terminées</span>
          </div>
          <div class="stat-trend positive">
            <mat-icon>trending_up</mat-icon>
            <span>+8%</span>
          </div>
        </mat-card>

        <mat-card class="stat-card stat-card--pending">
          <div class="stat-icon">
            <mat-icon>schedule</mat-icon>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.pending }}</span>
            <span class="stat-label">En attente</span>
          </div>
          <div class="stat-trend neutral">
            <mat-icon>remove</mat-icon>
            <span>0%</span>
          </div>
        </mat-card>

        <mat-card class="stat-card stat-card--wallet">
          <div class="stat-icon">
            <mat-icon>account_balance_wallet</mat-icon>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ formatXOF(stats.spentThisMonth) }}</span>
            <span class="stat-label">Dépensé ce mois</span>
          </div>
          <div class="stat-trend negative">
            <mat-icon>trending_down</mat-icon>
            <span>-5%</span>
          </div>
        </mat-card>
      </div>

      <!-- Quick Actions - Linear Style -->
      <div class="quick-actions">
        <button mat-stroked-button class="action-btn" routerLink="/client/tracking">
          <mat-icon>my_location</mat-icon>
          <span>Suivi en direct</span>
        </button>
        <button mat-stroked-button class="action-btn" routerLink="/client/missions">
          <mat-icon>list</mat-icon>
          <span>Mes missions</span>
        </button>
        <button mat-stroked-button class="action-btn" routerLink="/client/wallet">
          <mat-icon>account_balance_wallet</mat-icon>
          <span>Portefeuille</span>
        </button>
        <button mat-stroked-button class="action-btn" routerLink="/client/settings">
          <mat-icon>settings</mat-icon>
          <span>Paramètres</span>
        </button>
      </div>

      <!-- Active Missions -->
      <mat-card class="missions-card">
        <mat-card-header>
          <mat-card-title>Missions en cours</mat-card-title>
          <button mat-button color="primary" routerLink="/client/missions">Voir tout</button>
        </mat-card-header>
        
        <mat-card-content>
          <div class="mission-list">
            <div class="mission-item" *ngFor="let mission of activeMissions">
              <div class="mission-header">
                <div class="mission-title">
                  <h4>{{ mission.title }}</h4>
                  <mat-chip-listbox>
                    <mat-chip-option [color]="getStatusColor(mission.status)" selected>
                      {{ getStatusLabel(mission.status) }}
                    </mat-chip-option>
                  </mat-chip-listbox>
                </div>
                <span class="mission-price">{{ mission.budget }} {{ mission.currency }}</span>
              </div>
              
              <div class="mission-details">
                <div class="location">
                  <mat-icon>location_on</mat-icon>
                  <span>{{ mission.pickup }} → {{ mission.delivery }}</span>
                </div>
                <div class="provider" *ngIf="mission.provider">
                  <img [src]="mission.provider.avatar" alt="Provider" class="avatar">
                  <span>{{ mission.provider.name }}</span>
                  <div class="rating">
                    <mat-icon>star</mat-icon>
                    <span>{{ mission.provider.rating }}</span>
                  </div>
                </div>
              </div>

              <div class="mission-progress" *ngIf="mission.status === 'in_progress'">
                <div class="progress-header">
                  <span>Progression</span>
                  <span>{{ mission.progress }}%</span>
                </div>
                <mat-progress-bar mode="determinate" [value]="mission.progress"></mat-progress-bar>
                <div class="tracking-btn">
                  <button mat-button color="accent" routerLink="/client/tracking">
                    <mat-icon>gps_fixed</mat-icon>
                    Suivre en temps réel
                  </button>
                </div>
              </div>

              <div class="mission-actions" *ngIf="mission.status === 'submitted'">
                <p class="info-text">Le prestataire a soumis des preuves. Veuillez valider la mission.</p>
                <div class="action-buttons">
                  <button mat-raised-button color="primary" (click)="validateMission(mission)">
                    <mat-icon>check</mat-icon>
                    Valider et payer
                  </button>
                  <button mat-button color="warn" (click)="openDispute(mission)">
                    <mat-icon>error</mat-icon>
                    Ouvrir un litige
                  </button>
                </div>
              </div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Pending Applications -->
      <app-mission-applications></app-mission-applications>

      <!-- Recent Activity -->
      <mat-card class="activity-card">
        <mat-card-header>
          <mat-card-title>Activité récente</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="activity-list">
            <div class="activity-item" *ngFor="let activity of recentActivity">
              <div class="activity-icon" [class]="activity.type">
                <mat-icon>{{ activity.icon }}</mat-icon>
              </div>
              <div class="activity-content">
                <p class="activity-text">{{ activity.text }}</p>
                <span class="activity-time">{{ activity.time }}</span>
              </div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 2rem;
      display: flex;
      flex-direction: column;
      gap: 2rem;
      max-width: 1400px;
      margin: 0 auto;
      font-family: system-ui, -apple-system, sans-serif;
    }

    /* Welcome Section - Stripe Style */
    .welcome-section {
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
      color: #ffffff;
      padding: 2rem;
      border-radius: 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.3);
      
      .welcome-content {
        h1 {
          margin: 0 0 0.5rem 0;
          font-size: 1.875rem;
          font-weight: 800;
        }
        
        p {
          margin: 0;
          font-size: 1.125rem;
          opacity: 0.9;
        }
      }

      .create-btn {
        background: #ffffff;
        color: #4f46e5;
        border: none;
        border-radius: 0.75rem;
        padding: 0.875rem 1.75rem;
        font-weight: 600;
        font-size: 0.875rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        transition: all 0.2s ease;

        &:hover {
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          transform: translateY(-1px);
        }

        mat-icon {
          margin-right: 0.5rem;
        }
      }
    }

    /* Stats Cards - Stripe Style */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.5rem;
    }

    .stat-card {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1.5rem;
      border: 1px solid #e5e7eb;
      border-radius: 1rem;
      background: #ffffff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: all 0.2s ease;
      position: relative;

      &:hover {
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        transform: translateY(-2px);
      }

      .stat-icon {
        width: 3rem;
        height: 3rem;
        border-radius: 0.75rem;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .stat-icon mat-icon {
        font-size: 1.5rem;
        width: 1.5rem;
        height: 1.5rem;
      }

      .stat-content {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .stat-value {
        font-size: 1.875rem;
        font-weight: 800;
        color: #111827;
      }

      .stat-label {
        font-size: 0.875rem;
        color: #9ca3af;
        font-weight: 500;
      }

      .stat-trend {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.75rem;
        font-weight: 600;
        padding: 0.25rem 0.5rem;
        border-radius: 0.5rem;
        width: fit-content;

        mat-icon {
          font-size: 1rem;
          width: 1rem;
          height: 1rem;
        }

        &.positive {
          background: #dcfce7;
          color: #16a34a;
        }

        &.negative {
          background: #fee2e2;
          color: #dc2626;
        }

        &.neutral {
          background: #f3f4f6;
          color: #6b7280;
        }
      }

      &--active .stat-icon {
        background: linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%);
        color: #ffffff;
      }

      &--completed .stat-icon {
        background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
        color: #ffffff;
      }

      &--pending .stat-icon {
        background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
        color: #111827;
      }

      &--wallet .stat-icon {
        background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%);
        color: #ffffff;
      }
    }

    /* Quick Actions - Linear Style */
    .quick-actions {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .action-btn {
      flex: 1;
      min-width: 160px;
      height: 3.5rem;
      border: 2px solid #e5e7eb;
      border-radius: 0.75rem;
      background: #ffffff;
      color: #6b7280;
      font-weight: 600;
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: all 0.2s ease;

      &:hover {
        border-color: #6366f1;
        background: #f9fafb;
        color: #111827;
      }

      mat-icon {
        font-size: 1.25rem;
        width: 1.25rem;
        height: 1.25rem;
      }
    }

    /* Missions Card */
    .missions-card {
      border: 1px solid #e5e7eb;
      border-radius: 1rem;
      background: #ffffff;
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

      mat-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
    }

    .mission-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .mission-item {
      padding: 1.25rem;
      border: 1px solid #e5e7eb;
      border-radius: 0.75rem;
      background: #f9fafb;
      transition: all 0.2s ease;

      &:hover {
        border-color: #6366f1;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
    }

    .mission-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.75rem;
    }

    .mission-title {
      h4 {
        margin: 0 0 0.5rem 0;
        font-size: 1rem;
        font-weight: 600;
        color: #111827;
      }
    }

    .mission-price {
      font-size: 1.125rem;
      font-weight: 800;
      color: #4f46e5;
    }

    .mission-details {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }

    .location {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: #9ca3af;

      mat-icon {
        font-size: 1rem;
        width: 1rem;
        height: 1rem;
      }
    }

    .provider {
      display: flex;
      align-items: center;
      gap: 0.5rem;

      .avatar {
        width: 2rem;
        height: 2rem;
        border-radius: 9999px;
        object-fit: cover;
      }

      span {
        font-size: 0.875rem;
        color: #6b7280;
        font-weight: 500;
      }

      .rating {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.875rem;
        color: #f59e0b;

        mat-icon {
          font-size: 1rem;
          width: 1rem;
          height: 1rem;
        }
      }
    }

    .mission-progress {
      margin-top: 1rem;
    }

    .progress-header {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: #9ca3af;
      margin-bottom: 0.5rem;
      font-weight: 500;
    }

    .tracking-btn {
      margin-top: 0.75rem;
    }

    .mission-actions {
      margin-top: 1rem;
    }

    .info-text {
      font-size: 0.875rem;
      color: #6b7280;
      margin-bottom: 0.75rem;
    }

    .action-buttons {
      display: flex;
      gap: 0.75rem;
    }

    /* Activity Card */
    .activity-card {
      border: 1px solid #e5e7eb;
      border-radius: 1rem;
      background: #ffffff;
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

    .activity-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .activity-item {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
    }

    .activity-icon {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      mat-icon {
        font-size: 1.25rem;
        width: 1.25rem;
        height: 1.25rem;
        color: white;
      }

      &.mission {
        background: linear-gradient(135deg, #818cf8 0%, #4f46e5 100%);
      }

      &.payment {
        background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
      }

      &.review {
        background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
      }

      &.dispute {
        background: linear-gradient(135deg, #f87171 0%, #ef4444 100%);
      }
    }

    .activity-content {
      flex: 1;
    }

    .activity-text {
      margin: 0 0 0.25rem 0;
      font-size: 0.875rem;
      color: #6b7280;
      line-height: 1.625;
    }

    .activity-time {
      font-size: 0.75rem;
      color: #9ca3af;
    }

    /* Responsive */
    @media (max-width: 1024px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 768px) {
      .dashboard-container {
        padding: 1rem;
      }

      .welcome-section {
        flex-direction: column;
        text-align: center;
        gap: 1rem;

        .create-btn {
          width: 100%;
        }
      }

      .stats-grid {
        grid-template-columns: 1fr;
      }

      .quick-actions {
        flex-direction: column;

        .action-btn {
          width: 100%;
        }
      }
    }
  `]
})

export class ClientDashboardComponent implements OnInit {
  currentUser$: Observable<User | null>;
  loading = true;

  stats = { active: 0, completed: 0, pending: 0, spentThisMonth: '0 XOF' };
  activeMissions: Array<{
    id: string;
    title: string;
    status: string;
    budget: number;
    currency: string;
    pickup: string;
    delivery: string;
    provider?: { name: string; avatar?: string; rating?: number };
    progress?: number;
  }> = [];

  recentActivity: Array<{ type: string; icon: string; text: string; time: string }> = [];

  constructor(
    private authService: AuthService,
    private missionService: MissionService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading = true;
    this.missionService.getDashboardStats('client').subscribe({
      next: (s) => {
        this.stats = {
          active: s.active_missions || 0,
          completed: s.completed_missions || 0,
          pending: s.pending_missions || 0,
          spentThisMonth: formatXOF(s.spent_this_month || 0)
        };
      }
    });
    this.missionService.getMyMissions('client').subscribe({
      next: (missions) => {
        const active = missions.filter(m =>
          ['accepted', 'in_progress', 'submitted'].includes(m.status)
        );
        this.activeMissions = active.slice(0, 5).map(m => this.mapMission(m));
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private mapMission(m: Mission) {
    return {
      id: m.id,
      title: m.title,
      status: m.status,
      budget: Number(m.budget),
      currency: m.currency || 'XOF',
      pickup: m.pickup_address || '—',
      delivery: m.delivery_address || '—',
      provider: m.provider ? {
        name: `${m.provider.first_name} ${m.provider.last_name?.[0] || ''}.`.trim(),
        avatar: m.provider.profile_picture,
        rating: 4.5
      } : undefined,
      progress: m.status === 'in_progress' ? 50 : undefined
    };
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'in_progress': 'accent',
      'submitted': 'primary',
      'accepted': 'warn'
    };
    return colors[status] || 'primary';
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'in_progress': 'En cours',
      'submitted': 'À valider',
      'accepted': 'Acceptée'
    };
    return labels[status] || status;
  }

  formatXOF(value: string): string {
    return value;
  }

  validateMission(mission: { id: string; title: string }): void {
    this.missionService.validateMission(mission.id).subscribe({
      next: () => {
        this.snackBar.open('Mission validée', 'Fermer', { duration: 3000 });
        this.loadDashboard();
      },
      error: () => this.snackBar.open('Erreur de validation', 'Fermer', { duration: 3000 })
    });
  }

  openDispute(mission: { id: string }): void {
    this.router.navigate(['/client/disputes'], { queryParams: { mission: mission.id } });
  }
}
