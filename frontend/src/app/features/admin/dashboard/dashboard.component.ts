import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../../core/services/auth.service';
import { AdminService, AdminStats, AdminActivity } from '../../../core/services/admin.service';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatGridListModule,
    MatBadgeModule,
    MatProgressSpinnerModule,
    FormsModule
  ],
  template: `
    <div class="dashboard-container">

      <!-- Welcome -->
      <div class="welcome-section">
        <div class="welcome-text">
          <h1>👑 Administration</h1>
          <p>Bonjour {{ (currentUser$ | async)?.first_name || 'Admin' }} — voici le tableau de bord BlockTask</p>
        </div>
        <div class="welcome-search">
          <div class="search-input-wrap">
            <mat-icon class="search-icon">search</mat-icon>
            <input
              type="text"
              class="search-input"
              placeholder="Rechercher un utilisateur, une mission..."
              [(ngModel)]="searchQuery"
              (keyup.enter)="onSearch()"
            />
            <button class="search-btn" (click)="onSearch()" *ngIf="searchQuery">
              <mat-icon>arrow_forward</mat-icon>
            </button>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div class="loading-container" *ngIf="loading">
        <mat-spinner diameter="40"></mat-spinner>
        <p>Chargement...</p>
      </div>

      <!-- KPI row -->
      <div class="kpi-row" *ngIf="!loading">
        <div class="kpi-card" routerLink="/admin/users">
          <div class="kpi-icon users"><mat-icon>people</mat-icon></div>
          <div class="kpi-body">
            <span class="kpi-value">{{ stats.total_users }}</span>
            <span class="kpi-label">Utilisateurs</span>
            <span class="kpi-sub">{{ stats.total_clients }} clients · {{ stats.total_providers }} prestataires</span>
          </div>
        </div>
        <div class="kpi-card" routerLink="/admin/missions">
          <div class="kpi-icon missions"><mat-icon>assignment</mat-icon></div>
          <div class="kpi-body">
            <span class="kpi-value">{{ stats.total_missions }}</span>
            <span class="kpi-label">Missions</span>
            <span class="kpi-sub">{{ stats.active_missions }} actives · {{ stats.completed_missions }} terminées</span>
          </div>
        </div>
        <div class="kpi-card" routerLink="/admin/kyc">
          <div class="kpi-icon pending"><mat-icon>pending_actions</mat-icon></div>
          <div class="kpi-body">
            <span class="kpi-value">{{ stats.pending_kyc }}</span>
            <span class="kpi-label">KYC en attente</span>
            <span class="kpi-sub">Vérifications en cours</span>
          </div>
        </div>
        <div class="kpi-card" routerLink="/admin/disputes">
          <div class="kpi-icon disputes"><mat-icon>gavel</mat-icon></div>
          <div class="kpi-body">
            <span class="kpi-value">{{ stats.pending_disputes }}</span>
            <span class="kpi-label">Litiges</span>
            <span class="kpi-sub">À résoudre</span>
          </div>
        </div>
      </div>

      <!-- Charts row 1 -->
      <div class="charts-row" *ngIf="!loading">
        <div class="chart-card">
          <div class="chart-title"><mat-icon>donut_large</mat-icon> Répartition utilisateurs</div>
          <div class="chart-wrap"><canvas id="usersDonut"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-title"><mat-icon>verified_user</mat-icon> Statut KYC</div>
          <div class="chart-wrap"><canvas id="kycBar"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-title"><mat-icon>assignment</mat-icon> Missions</div>
          <div class="chart-wrap"><canvas id="missionsBar"></canvas></div>
        </div>
      </div>

      <!-- Recent Activity -->
      <mat-card class="activity-card" *ngIf="recentActivity.length > 0">
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

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px;
      gap: 16px;
      color: #ebf8e8;
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

    .stat-icon.users { background: #dbeafe; color: #2563eb; }
    .stat-icon.missions { background: #d1fae5; color: #059669; }
    .stat-icon.pending { background: #fef3c7; color: #d97706; }
    .stat-icon.disputes { background: #fee2e2; color: #dc2626; }

    .stat-content {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: #1f3721;
    }

    .stat-label {
      font-size: 14px;
      color: #6b7280;
    }

    .stat-sublabel {
      font-size: 12px;
      color: #9ca3af;
      margin-top: 2px;
    }

    .quick-actions {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 16px 24px;
      font-weight: 500;
      background: #3CB371 !important;
      color: white !important;
      position: relative;
    }

    .badge {
      background: #ef4444;
      color: white;
      font-size: 12px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 12px;
      margin-left: 8px;
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
        padding: 12px;
        border-radius: 8px;
        background: #f9fafb;
      }

      .activity-icon {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .activity-icon.user { background: #dbeafe; color: #2563eb; }
      .activity-icon.kyc { background: #fef3c7; color: #d97706; }
      .activity-icon.mission { background: #d1fae5; color: #059669; }
      .activity-icon.dispute { background: #fee2e2; color: #dc2626; }

      .activity-content {
        flex: 1;
      }

      .activity-text {
        margin: 0 0 4px 0;
        font-size: 14px;
        color: #374151;
      }

      .activity-time {
        font-size: 12px;
        color: #9ca3af;
      }
    }

    /* KPI */
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }
    .kpi-card {
      background: #fff;
      border-radius: 14px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 14px;
      border: 1px solid #eee;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
      cursor: pointer;
      transition: box-shadow 0.2s, transform 0.2s;
    }
    .kpi-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,0.1); transform: translateY(-2px); }
    .kpi-icon {
      width: 48px; height: 48px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .kpi-icon.users    { background: #dbeafe; color: #2563eb; }
    .kpi-icon.missions { background: #d1fae5; color: #059669; }
    .kpi-icon.pending  { background: #fef3c7; color: #d97706; }
    .kpi-icon.disputes { background: #fee2e2; color: #dc2626; }
    .kpi-body { display: flex; flex-direction: column; }
    .kpi-value { font-size: 26px; font-weight: 700; color: #1a1a2e; line-height: 1; }
    .kpi-label { font-size: 13px; color: #6b7280; margin-top: 4px; font-weight: 500; }
    .kpi-sub   { font-size: 11px; color: #9ca3af; margin-top: 2px; }

    /* Search */
    .welcome-section {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: white;
      padding: 28px 32px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 20px;
    }
    .welcome-text h1 { margin: 0 0 6px; font-size: 24px; font-weight: 700; }
    .welcome-text p  { margin: 0; font-size: 14px; opacity: 0.8; }

    .welcome-search { flex: 1; min-width: 260px; max-width: 420px; }
    .search-input-wrap {
      display: flex;
      align-items: center;
      background: rgba(255,255,255,0.12);
      border: 1px solid rgba(255,255,255,0.25);
      border-radius: 12px;
      padding: 8px 14px;
      gap: 8px;
      transition: background 0.2s, border-color 0.2s;
    }
    .search-input-wrap:focus-within {
      background: rgba(255,255,255,0.18);
      border-color: #3CB371;
    }
    .search-icon { color: rgba(255,255,255,0.6); font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; }
    .search-input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: #fff;
      font-size: 14px;
      &::placeholder { color: rgba(255,255,255,0.5); }
    }
    .search-btn {
      background: #3CB371;
      border: none;
      border-radius: 8px;
      width: 30px; height: 30px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      mat-icon { color: #fff; font-size: 18px; width: 18px; height: 18px; }
    }

    /* Charts */
    .charts-row {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 20px;
    }
    .chart-card {
      background: #fff;
      border-radius: 14px;
      padding: 20px;
      border: 1px solid #eee;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }
    .chart-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 14px; font-weight: 700; color: #1a1a2e; margin-bottom: 16px;
    }
    .chart-wrap { height: 220px; position: relative; }

    @media (max-width: 900px) {
      .kpi-row { grid-template-columns: repeat(2, 1fr); }
      .charts-row { grid-template-columns: 1fr; }
    }
    @media (max-width: 600px) {
      .kpi-row { grid-template-columns: 1fr 1fr; }
    }
  `]
})
export class AdminDashboardComponent implements OnInit, AfterViewInit {
  currentUser$: Observable<User | null>;
  loading = true;
  private charts: Chart[] = [];
  searchQuery = '';

  stats: AdminStats = {
    total_users: 0,
    total_clients: 0,
    total_providers: 0,
    total_enterprises: 0,
    total_missions: 0,
    pending_kyc: 0,
    pending_disputes: 0,
    active_missions: 0,
    completed_missions: 0
  };
  
  recentActivity: AdminActivity[] = [];

  constructor(
    private authService: AuthService,
    private adminService: AdminService,
    private router: Router
  ) {
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit(): void {
    this.loadStats();
    this.loadActivity();
  }

  ngAfterViewInit(): void {}

  onSearch(): void {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/admin/users'], { queryParams: { q: this.searchQuery.trim() } });
      this.searchQuery = '';
    }
  }

  loadStats(): void {
    this.adminService.getStats().subscribe({
      next: (stats) => {
        this.stats = stats;
        this.loading = false;
        setTimeout(() => this.renderCharts(), 150);
      },
      error: () => { this.loading = false; }
    });
  }

  loadActivity(): void {
    this.adminService.getRecentActivity().subscribe({
      next: (activity) => { this.recentActivity = activity; },
      error: () => {}
    });
  }

  renderCharts(): void {
    this.charts.forEach(c => c.destroy());
    this.charts = [];

    const el1 = document.getElementById('usersDonut') as HTMLCanvasElement;
    if (el1) {
      this.charts.push(new Chart(el1, {
        type: 'doughnut',
        data: {
          labels: ['Clients', 'Prestataires', 'Entreprises', 'Admins'],
          datasets: [{
            data: [
              this.stats.total_clients,
              this.stats.total_providers,
              this.stats.total_enterprises,
              Math.max(0, this.stats.total_users - this.stats.total_clients - this.stats.total_providers - this.stats.total_enterprises)
            ],
            backgroundColor: ['#3CB371', '#4ECDC4', '#6C5CE7', '#FF6B6B'],
            borderWidth: 2, borderColor: '#fff'
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 12 } } } } }
      }));
    }

    const el2 = document.getElementById('kycBar') as HTMLCanvasElement;
    if (el2) {
      this.charts.push(new Chart(el2, {
        type: 'bar',
        data: {
          labels: ['En attente', 'Vérifiés', 'Rejetés'],
          datasets: [{
            label: 'KYC',
            data: [this.stats.pending_kyc, 0, 0],
            backgroundColor: ['#FFD93D', '#3CB371', '#FF6B6B'],
            borderRadius: 8, borderWidth: 0
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
      }));
    }

    const el3 = document.getElementById('missionsBar') as HTMLCanvasElement;
    if (el3) {
      this.charts.push(new Chart(el3, {
        type: 'bar',
        data: {
          labels: ['Total', 'Actives', 'Terminées', 'Litiges'],
          datasets: [{
            label: 'Missions',
            data: [this.stats.total_missions, this.stats.active_missions, this.stats.completed_missions, this.stats.pending_disputes],
            backgroundColor: ['#6C5CE7', '#3CB371', '#4ECDC4', '#FF6B6B'],
            borderRadius: 8, borderWidth: 0
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
      }));
    }
  }
}

