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
import { colors, typography, spacing, shadows, radius } from '../../../core/design-system';

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
          <h1>Bonjour {{ (currentUser$ | async)?.first_name || 'Client' }} 👋</h1>
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
    @import '../../../core/design-system';

    .dashboard-container {
      padding: spacing.$8;
      display: flex;
      flex-direction: column;
      gap: spacing.$8;
      max-width: 1400px;
      margin: 0 auto;
      font-family: typography.$font-family-sans;
    }

    /* Welcome Section - Stripe Style */
    .welcome-section {
      background: linear-gradient(135deg, colors.$primary-500 0%, colors.$primary-600 100%);
      color: colors.$text-inverse;
      padding: spacing.$8;
      border-radius: radius.$2xl;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: shadows.$primary-md;
      
      .welcome-content {
        h1 {
          margin: 0 0 spacing.$2 0;
          font-size: typography.$font-size-3xl;
          font-weight: typography.$font-weight-extrabold;
        }
        
        p {
          margin: 0;
          font-size: typography.$font-size-lg;
          opacity: 0.9;
        }
      }

      .create-btn {
        background: colors.$background-primary;
        color: colors.$primary-600;
        border: none;
        border-radius: radius.$lg;
        padding: 0.875rem 1.75rem;
        font-weight: typography.$font-weight-semibold;
        font-size: typography.$font-size-sm;
        box-shadow: shadows.$base;
        transition: all 0.2s ease;

        &:hover {
          box-shadow: shadows.$md;
          transform: translateY(-1px);
        }

        mat-icon {
          margin-right: spacing.$2;
        }
      }
    }

    /* Stats Cards - Stripe Style */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: spacing.$6;
    }

    .stat-card {
      display: flex;
      flex-direction: column;
      gap: spacing.$4;
      padding: spacing.$6;
      border: 1px solid colors.$border-primary;
      border-radius: radius.$xl;
      background: colors.$background-primary;
      box-shadow: shadows.$base;
      transition: all 0.2s ease;
      position: relative;

      &:hover {
        box-shadow: shadows.$lg;
        transform: translateY(-2px);
      }

      .stat-icon {
        width: 3rem;
        height: 3rem;
        border-radius: radius.$lg;
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
        gap: spacing.$1;
      }

      .stat-value {
        font-size: typography.$font-size-3xl;
        font-weight: typography.$font-weight-extrabold;
        color: colors.$text-primary;
      }

      .stat-label {
        font-size: typography.$font-size-sm;
        color: colors.$text-tertiary;
        font-weight: typography.$font-weight-medium;
      }

      .stat-trend {
        display: flex;
        align-items: center;
        gap: spacing.$1;
        font-size: typography.$font-size-xs;
        font-weight: typography.$font-weight-semibold;
        padding: spacing.$1 spacing.$2;
        border-radius: radius.$md;
        width: fit-content;

        mat-icon {
          font-size: 1rem;
          width: 1rem;
          height: 1rem;
        }

        &.positive {
          background: colors.$success-50;
          color: colors.$success-600;
        }

        &.negative {
          background: colors.$error-50;
          color: colors.$error-600;
        }

        &.neutral {
          background: colors.$neutral-100;
          color: colors.$neutral-600;
        }
      }

      &--active .stat-icon {
        background: linear-gradient(135deg, colors.$info-400 0%, colors.$info-600 100%);
        color: colors.$text-inverse;
      }

      &--completed .stat-icon {
        background: linear-gradient(135deg, colors.$success-400 0%, colors.$success-600 100%);
        color: colors.$text-inverse;
      }

      &--pending .stat-icon {
        background: linear-gradient(135deg, colors.$warning-400 0%, colors.$warning-600 100%);
        color: colors.$text-primary;
      }

      &--wallet .stat-icon {
        background: linear-gradient(135deg, colors.$secondary-400 0%, colors.$secondary-600 100%);
        color: colors.$text-inverse;
      }
    }

    /* Quick Actions - Linear Style */
    .quick-actions {
      display: flex;
      gap: spacing.$4;
      flex-wrap: wrap;
    }

    .action-btn {
      flex: 1;
      min-width: 160px;
      height: 3.5rem;
      border: 2px solid colors.$border-primary;
      border-radius: radius.$lg;
      background: colors.$background-primary;
      color: colors.$text-secondary;
      font-weight: typography.$font-weight-semibold;
      font-size: typography.$font-size-sm;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: spacing.$2;
      transition: all 0.2s ease;

      &:hover {
        border-color: colors.$border-focus;
        background: colors.$surface-hover;
        color: colors.$text-primary;
      }

      mat-icon {
        font-size: 1.25rem;
        width: 1.25rem;
        height: 1.25rem;
      }
    }

    /* Missions Card */
    .missions-card {
      border: 1px solid colors.$border-primary;
      border-radius: radius.$xl;
      background: colors.$background-primary;
      box-shadow: shadows.$base;

      ::ng-deep {
        .mat-mdc-card-header {
          padding: spacing.$6;
          border-bottom: 1px solid colors.$border-primary;
        }

        .mat-mdc-card-title {
          font-size: typography.$font-size-lg;
          font-weight: typography.$font-weight-semibold;
          color: colors.$text-primary;
        }

        .mat-mdc-card-content {
          padding: spacing.$6;
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
      gap: spacing.$4;
    }

    .mission-item {
      padding: spacing.$5;
      border: 1px solid colors.$border-primary;
      border-radius: radius.$lg;
      background: colors.$background-secondary;
      transition: all 0.2s ease;

      &:hover {
        border-color: colors.$border-focus;
        box-shadow: shadows.$sm;
      }
    }

    .mission-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: spacing.$3;
    }

    .mission-title {
      h4 {
        margin: 0 0 spacing.$2 0;
        font-size: typography.$font-size-base;
        font-weight: typography.$font-weight-semibold;
        color: colors.$text-primary;
      }
    }

    .mission-price {
      font-size: typography.$font-size-lg;
      font-weight: typography.$font-weight-extrabold;
      color: colors.$primary-600;
    }

    .mission-details {
      display: flex;
      flex-direction: column;
      gap: spacing.$2;
      margin-bottom: spacing.$3;
    }

    .location {
      display: flex;
      align-items: center;
      gap: spacing.$2;
      font-size: typography.$font-size-sm;
      color: colors.$text-tertiary;

      mat-icon {
        font-size: 1rem;
        width: 1rem;
        height: 1rem;
      }
    }

    .provider {
      display: flex;
      align-items: center;
      gap: spacing.$2;

      .avatar {
        width: 2rem;
        height: 2rem;
        border-radius: componentRadius.$full;
        object-fit: cover;
      }

      span {
        font-size: typography.$font-size-sm;
        color: colors.$text-secondary;
        font-weight: typography.$font-weight-medium;
      }

      .rating {
        display: flex;
        align-items: center;
        gap: spacing.$1;
        font-size: typography.$font-size-sm;
        color: colors.$warning-500;

        mat-icon {
          font-size: 1rem;
          width: 1rem;
          height: 1rem;
        }
      }
    }

    .mission-progress {
      margin-top: spacing.$4;
    }

    .progress-header {
      display: flex;
      justify-content: space-between;
      font-size: typography.$font-size-xs;
      color: colors.$text-tertiary;
      margin-bottom: spacing.$2;
      font-weight: typography.$font-weight-medium;
    }

    .tracking-btn {
      margin-top: spacing.$3;
    }

    .mission-actions {
      margin-top: spacing.$4;
    }

    .info-text {
      font-size: typography.$font-size-sm;
      color: colors.$text-secondary;
      margin-bottom: spacing.$3;
    }

    .action-buttons {
      display: flex;
      gap: spacing.$3;
    }

    /* Activity Card */
    .activity-card {
      border: 1px solid colors.$border-primary;
      border-radius: radius.$xl;
      background: colors.$background-primary;
      box-shadow: shadows.$base;

      ::ng-deep {
        .mat-mdc-card-header {
          padding: spacing.$6;
          border-bottom: 1px solid colors.$border-primary;
        }

        .mat-mdc-card-title {
          font-size: typography.$font-size-lg;
          font-weight: typography.$font-weight-semibold;
          color: colors.$text-primary;
        }

        .mat-mdc-card-content {
          padding: spacing.$6;
        }
      }
    }

    .activity-list {
      display: flex;
      flex-direction: column;
      gap: spacing.$4;
    }

    .activity-item {
      display: flex;
      gap: spacing.$4;
      align-items: flex-start;
    }

    .activity-icon {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: radius.$lg;
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
        background: linear-gradient(135deg, colors.$primary-400 0%, colors.$primary-600 100%);
      }

      &.payment {
        background: linear-gradient(135deg, colors.$success-400 0%, colors.$success-600 100%);
      }

      &.review {
        background: linear-gradient(135deg, colors.$warning-400 0%, colors.$warning-600 100%);
      }

      &.dispute {
        background: linear-gradient(135deg, colors.$error-400 0%, colors.$error-600 100%);
      }
    }

    .activity-content {
      flex: 1;
    }

    .activity-text {
      margin: 0 0 spacing.$1 0;
      font-size: typography.$font-size-sm;
      color: colors.$text-secondary;
      line-height: typography.$line-height-relaxed;
    }

    .activity-time {
      font-size: typography.$font-size-xs;
      color: colors.$text-tertiary;
    }

    /* Responsive */
    @media (max-width: 1024px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 768px) {
      .dashboard-container {
        padding: spacing.$4;
      }

      .welcome-section {
        flex-direction: column;
        text-align: center;
        gap: spacing.$4;

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
