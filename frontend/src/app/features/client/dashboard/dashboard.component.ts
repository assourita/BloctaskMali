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
      <!-- Welcome Section -->
      <div class="welcome-section">
        <h1>Bonjour {{ (currentUser$ | async)?.first_name || 'Client' }} ! 👋</h1>
        <p>Bienvenue sur votre tableau de bord BlockTask</p>
      </div>
      
      <!-- Stats Cards -->
      <div class="stats-grid">
        <mat-card class="stat-card">
          <div class="stat-icon active">
            <mat-icon>pending_actions</mat-icon>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.active }}</span>
            <span class="stat-label">Missions actives</span>
          </div>
        </mat-card>

        <mat-card class="stat-card">
          <div class="stat-icon completed">
            <mat-icon>check_circle</mat-icon>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.completed }}</span>
            <span class="stat-label">Missions terminées</span>
          </div>
        </mat-card>

        <mat-card class="stat-card">
          <div class="stat-icon pending">
            <mat-icon>schedule</mat-icon>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.pending }}</span>
            <span class="stat-label">En attente</span>
          </div>
        </mat-card>

        <mat-card class="stat-card">
          <div class="stat-icon wallet">
            <mat-icon>account_balance_wallet</mat-icon>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.spentThisMonth }}</span>
            <span class="stat-label">Dépensé ce mois</span>
          </div>
        </mat-card>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions">
        <button mat-raised-button color="primary" routerLink="/client/missions/create">
          <mat-icon>add</mat-icon>
          Nouvelle mission
        </button>
        <button mat-stroked-button routerLink="/client/tracking">
          <mat-icon>my_location</mat-icon>
          Suivi en direct
        </button>
        <button mat-stroked-button routerLink="/client/missions">
          <mat-icon>list</mat-icon>
          Mes missions
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
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .welcome-section {
      background: linear-gradient(135deg, #3CB371 0%, #2E8B57 100%);
      color: white;
      padding: 32px;
      border-radius: 16px;
      margin-bottom: 8px;
      
      h1 {
        margin: 0 0 8px 0;
        font-size: 28px;
        font-weight: 700;
      }
      
      p {
        margin: 0;
        font-size: 16px;
        opacity: 0.9;
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
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .stat-icon mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .stat-icon.active { background: #dbeafe; color: #2563eb; }
    .stat-icon.completed { background: #d1fae5; color: #059669; }
    .stat-icon.pending { background: #fef3c7; color: #d97706; }
    .stat-icon.wallet { background: #fce7f3; color: #db2777; }

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

    .quick-actions {
      display: flex;
      gap: 12px;
    }

    .missions-card {
      mat-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
    }

    .mission-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .mission-item {
      padding: 16px;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
    }

    .mission-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .mission-title {
      h4 {
        margin: 0 0 8px 0;
        font-size: 16px;
        font-weight: 600;
      }
    }

    .mission-price {
      font-size: 18px;
      font-weight: 700;
      color: #059669;
    }

    .mission-details {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .location {
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

    .provider {
      display: flex;
      align-items: center;
      gap: 8px;

      .avatar {
        width: 28px;
        height: 28px;
        border-radius: 50%;
      }

      span {
        font-size: 14px;
        font-weight: 500;
      }

      .rating {
        display: flex;
        align-items: center;
        gap: 4px;
        color: #f59e0b;
        font-size: 14px;

        mat-icon {
          font-size: 16px;
          width: 16px;
          height: 16px;
        }
      }
    }

    .mission-progress {
      background: #f9fafb;
      padding: 16px;
      border-radius: 8px;
    }

    .progress-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 14px;
      font-weight: 500;
    }

    .tracking-btn {
      margin-top: 12px;
    }

    .mission-actions {
      background: #eff6ff;
      padding: 16px;
      border-radius: 8px;

      .info-text {
        margin: 0 0 12px 0;
        font-size: 14px;
        color: #1e40af;
      }

      .action-buttons {
        display: flex;
        gap: 12px;
      }
    }

    .activity-card {
      .activity-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .activity-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;
      }

      .activity-icon {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }

      .activity-icon.success { background: #d1fae5; color: #059669; }
      .activity-icon.info { background: #dbeafe; color: #2563eb; }
      .activity-icon.warning { background: #fef3c7; color: #d97706; }

      .activity-content {
        flex: 1;
      }

      .activity-text {
        margin: 0;
        font-size: 14px;
        color: #374151;
      }

      .activity-time {
        font-size: 12px;
        color: #9ca3af;
      }
    }

    @media (max-width: 1024px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 640px) {
      .stats-grid {
        grid-template-columns: 1fr;
      }

      .quick-actions {
        flex-direction: column;
      }

      .mission-details {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
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
