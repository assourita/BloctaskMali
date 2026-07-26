import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
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
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MissionApplicationsComponent
  ],
  template: `
    <div class="dash-page">
      <header class="dash-header">
        <div class="dash-header__text">
          <h1>Bonjour {{ (currentUser$ | async)?.first_name || 'Client' }}</h1>
          <p>Vos missions et paiements en un coup d’œil</p>
        </div>
        <div class="dash-header__actions">
          <button mat-flat-button color="primary" routerLink="/client/missions/create">
            <mat-icon>add</mat-icon>
            Nouvelle mission
          </button>
        </div>
      </header>

      <div class="dash-metrics">
        <div class="dash-metric">
          <span class="dash-metric__value">{{ stats.active }}</span>
          <span class="dash-metric__label">Missions actives</span>
        </div>
        <div class="dash-metric">
          <span class="dash-metric__value">{{ stats.completed }}</span>
          <span class="dash-metric__label">Terminées</span>
        </div>
        <div class="dash-metric">
          <span class="dash-metric__value">{{ stats.pending }}</span>
          <span class="dash-metric__label">En attente</span>
        </div>
        <div class="dash-metric">
          <span class="dash-metric__value">{{ stats.spentThisMonth }}</span>
          <span class="dash-metric__label">Dépensé ce mois</span>
        </div>
      </div>

      <nav class="dash-links" aria-label="Accès rapides">
        <a routerLink="/client/tracking">
          <mat-icon>my_location</mat-icon>
          Suivi en direct
        </a>
        <a routerLink="/client/missions">
          <mat-icon>list</mat-icon>
          Mes missions
        </a>
        <a routerLink="/client/wallet">
          <mat-icon>account_balance_wallet</mat-icon>
          Portefeuille
        </a>
        <a routerLink="/client/settings">
          <mat-icon>settings</mat-icon>
          Paramètres
        </a>
      </nav>

      <section class="dash-section">
        <div class="dash-section__head">
          <h2>À traiter</h2>
          <a mat-button color="primary" routerLink="/client/missions">Voir tout</a>
        </div>

        <div class="dash-list" *ngIf="activeMissions.length; else noActive">
          <div class="dash-row" *ngFor="let mission of activeMissions">
            <div class="dash-row__main">
              <div class="dash-row__title">
                <h3>{{ mission.title }}</h3>
                <span class="dash-status" [class]="statusClass(mission.status)">
                  {{ getStatusLabel(mission.status) }}
                </span>
              </div>
              <div class="dash-row__meta">
                <span>
                  <mat-icon>location_on</mat-icon>
                  {{ mission.pickup }} → {{ mission.delivery }}
                </span>
                <span *ngIf="mission.provider">
                  {{ mission.provider.name }}
                  <ng-container *ngIf="mission.provider.rating">
                    · {{ mission.provider.rating }}
                  </ng-container>
                </span>
              </div>

              <div class="dash-progress" *ngIf="mission.status === 'in_progress'">
                <div class="dash-progress__labels">
                  <span>Progression</span>
                  <span>{{ mission.progress }}%</span>
                </div>
                <mat-progress-bar mode="determinate" [value]="mission.progress || 0"></mat-progress-bar>
                <div class="dash-row__actions">
                  <button mat-stroked-button routerLink="/client/tracking">
                    <mat-icon>gps_fixed</mat-icon>
                    Suivre
                  </button>
                </div>
              </div>

              <div class="dash-row__actions" *ngIf="mission.status === 'submitted'">
                <button mat-flat-button color="primary" (click)="validateMission(mission)">
                  <mat-icon>check</mat-icon>
                  Valider et payer
                </button>
                <button mat-button color="warn" (click)="openDispute(mission)">
                  Litige
                </button>
              </div>
            </div>
            <div class="dash-row__side">
              <span class="dash-row__price">{{ mission.budget }} {{ mission.currency }}</span>
            </div>
          </div>
        </div>
        <ng-template #noActive>
          <div class="dash-empty">Aucune mission à traiter pour le moment.</div>
        </ng-template>
      </section>

      <app-mission-applications></app-mission-applications>

      <section class="dash-section" *ngIf="recentActivity.length">
        <div class="dash-section__head">
          <h2>Activité récente</h2>
        </div>
        <div class="dash-activity">
          <div class="dash-activity__item" *ngFor="let activity of recentActivity">
            <p class="dash-activity__text">{{ activity.text }}</p>
            <span class="dash-activity__time">{{ activity.time }}</span>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    /* Component-specific tweaks only — layout lives in styles/dashboard.scss */
    app-mission-applications {
      display: block;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      margin-top: 8px;
      overflow-x: hidden;
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
        const priority = ['submitted', 'in_progress', 'accepted'];
        const active = missions
          .filter(m => priority.includes(m.status))
          .sort((a, b) => priority.indexOf(a.status) - priority.indexOf(b.status));
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

  statusClass(status: string): string {
    const map: Record<string, string> = {
      in_progress: 'dash-status--progress',
      submitted: 'dash-status--validate',
      accepted: 'dash-status--accepted'
    };
    return map[status] || '';
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
