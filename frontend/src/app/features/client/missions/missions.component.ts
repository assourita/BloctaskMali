import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { environment } from '../../../../environments/environment';

interface Mission {
  id: string;
  title: string;
  description: string;
  status: string;
  budget: number;
  currency: string;
  pickup_address: string;
  delivery_address: string;
  deadline: string;
  created_at: string;
  category?: { id: string; name: string; icon: string };
  category_name?: string;
  provider?: { id: string; first_name: string; last_name: string; profile_picture?: string };
  application_count?: number;
  applications_count?: number;
}

@Component({
  selector: 'app-client-missions',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatBadgeModule, MatProgressBarModule,
    MatMenuModule, MatSnackBarModule
  ],
  template: `
    <div class="missions-container">
      <!-- Header -->
      <div class="missions-header">
        <div class="header-left">
          <h1>Mes Missions</h1>
          <p class="subtitle">Gérez vos demandes et suivez leur progression</p>
        </div>
        <button mat-raised-button color="primary" routerLink="create">
          <mat-icon>add</mat-icon>
          Nouvelle Mission
        </button>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card" *ngFor="let stat of stats">
          <mat-icon [style.color]="stat.color">{{ stat.icon }}</mat-icon>
          <div class="stat-info">
            <span class="stat-value">{{ stat.value }}</span>
            <span class="stat-label">{{ stat.label }}</span>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-bar">
        <div class="filter-chips">
          <button 
            class="filter-chip" 
            [class.active]="activeFilter === 'all'"
            (click)="setFilter('all')"
          >
            Toutes
            <span class="count" *ngIf="getCount('all')">{{ getCount('all') }}</span>
          </button>
          <button 
            class="filter-chip" 
            [class.active]="activeFilter === 'active'"
            (click)="setFilter('active')"
          >
            En cours
            <span class="count" *ngIf="getCount('active')">{{ getCount('active') }}</span>
          </button>
          <button 
            class="filter-chip" 
            [class.active]="activeFilter === 'pending'"
            (click)="setFilter('pending')"
          >
            En attente
            <span class="count" *ngIf="getCount('pending')">{{ getCount('pending') }}</span>
          </button>
          <button 
            class="filter-chip" 
            [class.active]="activeFilter === 'completed'"
            (click)="setFilter('completed')"
          >
            Terminées
            <span class="count" *ngIf="getCount('completed')">{{ getCount('completed') }}</span>
          </button>
        </div>
      </div>

      <!-- Loading -->
      <mat-progress-bar mode="indeterminate" *ngIf="loading"></mat-progress-bar>

      <!-- Missions List -->
      <div class="missions-list" *ngIf="!loading">
        <mat-card class="mission-card" *ngFor="let mission of filteredMissions" [routerLink]="[mission.id]">
          <!-- Status Badge -->
          <div class="mission-status-badge" [class]="'status-' + mission.status">
            <mat-icon>{{ getStatusIcon(mission.status) }}</mat-icon>
            <span>{{ getStatusLabel(mission.status) }}</span>
          </div>

          <div class="mission-content">
            <!-- Left: Main Info -->
            <div class="mission-main">
              <div class="mission-header-row">
                <h3 class="mission-title">{{ mission.title || 'Sans titre' }}</h3>
              </div>
              
              <p class="mission-description" *ngIf="mission.description">
                {{ mission.description | slice:0:120 }}{{ (mission.description?.length || 0) > 120 ? '...' : '' }}
              </p>
              
              <!-- Category Tag -->
              <div class="mission-tags" *ngIf="mission.category_name">
                <span class="tag category">
                  <mat-icon>folder</mat-icon>
                  {{ mission.category_name }}
                </span>
              </div>
              
              <!-- Location Route -->
              <div class="mission-route" *ngIf="mission.pickup_address || mission.delivery_address">
                <div class="route-item" *ngIf="mission.pickup_address">
                  <div class="route-dot pickup"></div>
                  <mat-icon class="route-icon">location_on</mat-icon>
                  <span class="route-label">Départ:</span>
                  <span class="route-address">{{ mission.pickup_address | slice:0:35 }}{{ (mission.pickup_address?.length || 0) > 35 ? '...' : '' }}</span>
                </div>
                <div class="route-connector" *ngIf="mission.pickup_address && mission.delivery_address"></div>
                <div class="route-item" *ngIf="mission.delivery_address">
                  <div class="route-dot delivery"></div>
                  <mat-icon class="route-icon">flag</mat-icon>
                  <span class="route-label">Arrivée:</span>
                  <span class="route-address">{{ mission.delivery_address | slice:0:35 }}{{ (mission.delivery_address?.length || 0) > 35 ? '...' : '' }}</span>
                </div>
              </div>
            </div>

            <!-- Right: Meta Info -->
            <div class="mission-meta">
              <div class="meta-box budget-box">
                <mat-icon>payments</mat-icon>
                <div class="meta-value">{{ (mission.budget || 0) | number:'1.0-0' }}</div>
                <div class="meta-unit">{{ mission.currency || 'XOF' }}</div>
              </div>
              
              <div class="meta-row">
                <mat-icon>event</mat-icon>
                <span>{{ mission.deadline | date:'dd MMM yyyy' }}</span>
              </div>
              
              <div class="meta-row" *ngIf="mission.deadline">
                <mat-icon>access_time</mat-icon>
                <span>{{ mission.deadline | date:'HH:mm' }}</span>
              </div>
              
              <div class="meta-row candidates" *ngIf="mission.applications_count || mission.application_count">
                <mat-icon [matBadge]="mission.applications_count || mission.application_count" matBadgeColor="accent" matBadgeSize="small">person</mat-icon>
                <span>{{ mission.applications_count || mission.application_count }} candidat{{ (mission.applications_count || mission.application_count || 0) > 1 ? 's' : '' }}</span>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="mission-footer">
            <div class="provider-section">
              <div class="provider-info" *ngIf="mission.provider">
                <img 
                  [src]="mission.provider?.profile_picture || 'assets/default-avatar.png'" 
                  [alt]="mission.provider?.first_name || 'Prestataire'"
                  class="provider-avatar"
                />
                <div class="provider-details">
                  <span class="provider-name">{{ mission.provider?.first_name || '' }} {{ mission.provider?.last_name || '' }}</span>
                  <span class="provider-label">Prestataire assigné</span>
                </div>
              </div>
              <div class="provider-info pending" *ngIf="!mission.provider">
                <div class="provider-avatar-placeholder">
                  <mat-icon>hourglass_empty</mat-icon>
                </div>
                <div class="provider-details">
                  <span class="provider-status">En attente</span>
                  <span class="provider-label">Recherche de prestataire</span>
                </div>
              </div>
            </div>
            
            <div class="mission-actions">
              <button mat-stroked-button color="primary" [routerLink]="[mission.id]">
                <mat-icon>visibility</mat-icon>
                Voir
              </button>
              <button mat-icon-button [matMenuTriggerFor]="menu" (click)="$event.stopPropagation()">
                <mat-icon>more_vert</mat-icon>
              </button>
            </div>
            
            <mat-menu #menu="matMenu">
              <button mat-menu-item [routerLink]="[mission.id]">
                <mat-icon>visibility</mat-icon>
                <span>Voir détails</span>
              </button>
              <button mat-menu-item *ngIf="canCancel(mission)" (click)="cancelMission(mission, $event)">
                <mat-icon>cancel</mat-icon>
                <span>Annuler</span>
              </button>
              <button mat-menu-item *ngIf="mission.status === 'submitted'" (click)="validateMission(mission, $event)">
                <mat-icon>check_circle</mat-icon>
                <span>Valider</span>
              </button>
            </mat-menu>
          </div>
        </mat-card>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="filteredMissions.length === 0">
          <mat-icon>assignment</mat-icon>
          <h3>Aucune mission</h3>
          <p>Vous n'avez pas encore créé de mission. Commencez dès maintenant !</p>
          <button mat-raised-button color="primary" routerLink="create">
            <mat-icon>add</mat-icon>
            Créer une mission
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .missions-container { padding: 24px; max-width: 1200px; margin: 0 auto; }

    .missions-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;
      h1 { margin: 0; font-size: 28px; font-weight: 700; color: #1a1a2e; }
      .subtitle { margin: 4px 0 0; color: #6b7280; font-size: 14px; }
    }

    .stats-grid {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px;
    }
    .stat-card {
      background: #fff; border-radius: 12px; padding: 20px; display: flex; align-items: center; gap: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      mat-icon { font-size: 32px; width: 32px; height: 32px; }
      .stat-info { display: flex; flex-direction: column; }
      .stat-value { font-size: 24px; font-weight: 700; color: #1a1a2e; }
      .stat-label { font-size: 13px; color: #6b7280; }
    }

    .filters-bar { margin-bottom: 20px; }
    .filter-chips { display: flex; gap: 8px; flex-wrap: wrap; }
    .filter-chip {
      padding: 8px 16px; border-radius: 20px; border: 1px solid #e5e7eb; background: #fff;
      font-size: 13px; font-weight: 500; color: #6b7280; cursor: pointer; transition: all 0.2s;
      display: flex; align-items: center; gap: 6px;
      &:hover { border-color: #6C5CE7; color: #6C5CE7; }
      &.active { background: #6C5CE7; color: #fff; border-color: #6C5CE7; }
      .count { background: rgba(0,0,0,0.1); padding: 2px 6px; border-radius: 10px; font-size: 11px; }
    }

    .missions-list { display: flex; flex-direction: column; gap: 16px; }
    .mission-card {
      position: relative; padding: 24px; cursor: pointer; transition: all 0.3s ease;
      border-radius: 16px; background: #fff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      &:hover { box-shadow: 0 8px 30px rgba(108,92,231,0.15); transform: translateY(-3px); }
    }
    .mission-status-badge {
      position: absolute; top: 20px; right: 20px;
      display: flex; align-items: center; gap: 6px;
      padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
      &.status-draft { background: #f3f4f6; color: #6b7280; }
      &.status-pending { background: #fef3c7; color: #92400e; }
      &.status-funded { background: #dbeafe; color: #1e40af; }
      &.status-accepted { background: #ede9fe; color: #6C5CE7; }
      &.status-in_progress { background: #d1fae5; color: #065f46; }
      &.status-submitted { background: #cffafe; color: #155e75; }
      &.status-completed { background: #d1fae5; color: #065f46; }
      &.status-cancelled { background: #fee2e2; color: #991b1b; }
      &.status-disputed { background: #fee2e2; color: #991b1b; }
    }

    .mission-content { display: flex; gap: 32px; margin-top: 12px; }
    .mission-main { flex: 1; }
    .mission-header-row { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
    .mission-title { margin: 0; font-size: 20px; font-weight: 700; color: #1a1a2e; }
    .mission-description { margin: 0 0 16px; color: #6b7280; font-size: 14px; line-height: 1.6; }

    .mission-tags { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
    .tag {
      display: flex; align-items: center; gap: 4px;
      padding: 4px 10px; border-radius: 16px; font-size: 12px; font-weight: 500;
      &.category { background: #ede9fe; color: #6C5CE7; }
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }

    .mission-route {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border-radius: 12px; padding: 16px; border: 1px solid #e2e8f0;
      .route-item { display: flex; align-items: center; gap: 10px; font-size: 13px; }
      .route-connector { width: 2px; height: 24px; background: #cbd5e1; margin-left: 15px; }
      .route-dot { width: 10px; height: 10px; border-radius: 50%; }
      .route-dot.pickup { background: #6C5CE7; }
      .route-dot.delivery { background: #00b894; }
      .route-icon { font-size: 18px; width: 18px; height: 18px; color: #64748b; }
      .route-label { font-weight: 600; color: #475569; min-width: 50px; }
      .route-address { color: #334155; flex: 1; }
    }

    .mission-meta { 
      display: flex; flex-direction: column; gap: 12px; min-width: 160px;
      align-items: flex-end; text-align: right;
    }
    .meta-box {
      display: flex; flex-direction: column; align-items: center;
      padding: 16px 20px; border-radius: 12px; background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);
      mat-icon { font-size: 24px; width: 24px; height: 24px; color: #6C5CE7; margin-bottom: 4px; }
      .meta-value { font-size: 22px; font-weight: 700; color: #1a1a2e; }
      .meta-unit { font-size: 12px; color: #6C5CE7; font-weight: 600; }
    }
    .meta-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #64748b;
      mat-icon { font-size: 16px; width: 16px; height: 16px; color: #94a3b8; }
    }
    .meta-row.candidates { color: #6C5CE7; font-weight: 500; }

    .mission-footer {
      display: flex; justify-content: space-between; align-items: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #f1f5f9;
    }
    .provider-section { flex: 1; }
    .provider-info {
      display: flex; align-items: center; gap: 12px;
      &.pending { 
        color: #f59e0b; 
        .provider-avatar-placeholder { 
          width: 40px; height: 40px; border-radius: 50%; background: #fef3c7;
          display: flex; align-items: center; justify-content: center;
          mat-icon { font-size: 20px; width: 20px; height: 20px; }
        }
      }
      .provider-avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid #ede9fe; }
      .provider-details { display: flex; flex-direction: column; }
      .provider-name { font-weight: 600; color: #1a1a2e; font-size: 14px; }
      .provider-label { font-size: 12px; color: #94a3b8; }
      .provider-status { font-weight: 600; color: #f59e0b; font-size: 14px; }
    }
    .mission-actions { display: flex; gap: 8px; align-items: center; }

    .empty-state {
      text-align: center; padding: 60px 20px; background: #fff; border-radius: 16px;
      mat-icon { font-size: 64px; width: 64px; height: 64px; color: #d1d5db; margin-bottom: 16px; }
      h3 { margin: 0 0 8px; font-size: 20px; font-weight: 600; color: #1a1a2e; }
      p { margin: 0 0 24px; color: #6b7280; font-size: 14px; }
    }

    @media (max-width: 768px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .mission-content { flex-direction: column; gap: 20px; }
      .mission-meta { align-items: flex-start; text-align: left; flex-direction: row; flex-wrap: wrap; }
      .missions-header { flex-direction: column; align-items: flex-start; gap: 16px; }
      .meta-box { padding: 12px 16px; }
      .mission-card { padding: 20px; }
    }
  `]
})
export class ClientMissionsComponent implements OnInit {
  private apiUrl = environment.apiUrl;
  missions: Mission[] = [];
  loading = true;
  activeFilter = 'all';

  stats = [
    { icon: 'assignment', label: 'Total', value: 0, color: '#6C5CE7', filter: 'all' },
    { icon: 'pending_actions', label: 'En cours', value: 0, color: '#3b82f6', filter: 'active' },
    { icon: 'schedule', label: 'En attente', value: 0, color: '#f59e0b', filter: 'pending' },
    { icon: 'check_circle', label: 'Terminées', value: 0, color: '#00b894', filter: 'completed' }
  ];

  constructor(private http: HttpClient, private router: Router, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.loadMissions();
  }

  private h(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });
  }

  loadMissions(): void {
    this.loading = true;
    this.http.get<any>(`${this.apiUrl}/missions/`, { headers: this.h() }).subscribe({
      next: (response) => {
        // Handle paginated response (results array) or direct array
        this.missions = Array.isArray(response) ? response : (response.results || []);
        this.updateStats();
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Erreur chargement missions', 'Fermer', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  get filteredMissions(): Mission[] {
    switch (this.activeFilter) {
      case 'active':
        return this.missions.filter(m => ['accepted', 'in_progress', 'submitted'].includes(m.status));
      case 'pending':
        return this.missions.filter(m => ['draft', 'pending', 'funded'].includes(m.status));
      case 'completed':
        return this.missions.filter(m => ['completed', 'cancelled'].includes(m.status));
      default:
        return this.missions;
    }
  }

  setFilter(filter: string): void {
    this.activeFilter = filter;
  }

  getCount(filter: string): number {
    switch (filter) {
      case 'active':
        return this.missions.filter(m => ['accepted', 'in_progress', 'submitted'].includes(m.status)).length;
      case 'pending':
        return this.missions.filter(m => ['draft', 'pending', 'funded'].includes(m.status)).length;
      case 'completed':
        return this.missions.filter(m => ['completed', 'cancelled'].includes(m.status)).length;
      default:
        return this.missions.length;
    }
  }

  updateStats(): void {
    this.stats[0].value = this.missions.length;
    this.stats[1].value = this.missions.filter(m => ['accepted', 'in_progress', 'submitted'].includes(m.status)).length;
    this.stats[2].value = this.missions.filter(m => ['draft', 'pending', 'funded'].includes(m.status)).length;
    this.stats[3].value = this.missions.filter(m => ['completed'].includes(m.status)).length;
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      draft: 'edit',
      pending: 'schedule',
      funded: 'account_balance',
      accepted: 'person',
      in_progress: 'local_shipping',
      submitted: 'task',
      completed: 'check_circle',
      cancelled: 'cancel',
      disputed: 'gavel'
    };
    return icons[status] || 'help';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      draft: 'Brouillon',
      pending: 'En attente',
      funded: 'Financée',
      accepted: 'Acceptée',
      in_progress: 'En cours',
      submitted: 'Preuves soumises',
      completed: 'Terminée',
      cancelled: 'Annulée',
      disputed: 'En litige'
    };
    return labels[status] || status;
  }

  canCancel(mission: Mission): boolean {
    return ['draft', 'pending', 'funded'].includes(mission.status);
  }

  cancelMission(mission: Mission, event: Event): void {
    event.stopPropagation();
    if (!confirm('Annuler cette mission ?')) return;
    
    this.http.post(`${this.apiUrl}/missions/${mission.id}/cancel/`, {}, { headers: this.h() }).subscribe({
      next: () => {
        mission.status = 'cancelled';
        this.updateStats();
        this.snackBar.open('Mission annulée', 'Fermer', { duration: 3000 });
      },
      error: () => this.snackBar.open('Erreur annulation', 'Fermer', { duration: 3000 })
    });
  }

  validateMission(mission: Mission, event: Event): void {
    event.stopPropagation();
    this.http.post(`${this.apiUrl}/missions/${mission.id}/validate/`, {}, { headers: this.h() }).subscribe({
      next: () => {
        mission.status = 'completed';
        this.updateStats();
        this.snackBar.open('Mission validée !', 'Fermer', { duration: 3000 });
      },
      error: () => this.snackBar.open('Erreur validation', 'Fermer', { duration: 3000 })
    });
  }
}
