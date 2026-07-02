import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { environment } from '../../../../environments/environment';

interface TrendDay { day: string; created: number; completed: number; }

@Component({
  selector: 'app-admin-analytics',
  standalone: true,
  imports: [CommonModule, RouterModule, MatCardModule, MatIconModule, MatProgressSpinnerModule, MatButtonModule],
  template: `
    <div class="analytics-container">
      <div class="page-header">
        <div>
          <h1>Analytics</h1>
          <p>Statistiques et rapports de la plateforme</p>
        </div>
        <button mat-stroked-button (click)="load()"><mat-icon>refresh</mat-icon> Actualiser</button>
      </div>

      <div class="loading" *ngIf="loading"><mat-spinner diameter="36"></mat-spinner></div>

      <div class="analytics-grid" *ngIf="!loading && stats">
        <mat-card class="analytics-card">
          <mat-icon class="card-icon">people</mat-icon>
          <h3>Utilisateurs</h3>
          <p>{{ stats.users?.total }} total ({{ stats.users?.clients }} clients, {{ stats.users?.providers }} prestataires)</p>
        </mat-card>
        <mat-card class="analytics-card">
          <mat-icon class="card-icon">assignment</mat-icon>
          <h3>Missions</h3>
          <p>{{ stats.missions?.total }} total · {{ stats.missions?.active }} actives · {{ stats.missions?.completed }} terminées</p>
        </mat-card>
        <mat-card class="analytics-card">
          <mat-icon class="card-icon">payments</mat-icon>
          <h3>Revenus</h3>
          <p>{{ stats.payments?.total_volume | number:'1.0-0' }} XOF total · {{ stats.payments?.this_month | number:'1.0-0' }} ce mois</p>
        </mat-card>
        <mat-card class="analytics-card">
          <mat-icon class="card-icon">star</mat-icon>
          <h3>Réputation</h3>
          <p>Score moyen : {{ stats.reputation?.average_score | number:'1.1-1' }}/100</p>
        </mat-card>
      </div>

      <mat-card class="chart-card" *ngIf="!loading">
        <h2>Tendances missions (30 jours)</h2>
        <div class="trend-table" *ngIf="trends.length; else noTrends">
          <div class="trend-row head"><span>Date</span><span>Créées</span><span>Terminées</span></div>
          <div class="trend-row" *ngFor="let t of trends.slice(-14)">
            <span>{{ t.day }}</span>
            <span class="created">{{ t.created }}</span>
            <span class="completed">{{ t.completed }}</span>
          </div>
        </div>
        <ng-template #noTrends><p class="coming-soon">Pas encore de données sur cette période.</p></ng-template>
      </mat-card>
    </div>
  `,
  styles: [`
    .analytics-container { padding: 0; max-width: 1200px; margin: 0 auto; }
    .page-header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: white; padding: 28px 32px; border-radius: 16px; margin-bottom: 24px;
      display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px;
      h1 { margin: 0 0 8px 0; font-size: 24px; font-weight: 700; }
      p { margin: 0; font-size: 14px; opacity: 0.9; }
      button { color: #fff; border-color: rgba(255,255,255,0.5); }
    }
    .loading { display: flex; justify-content: center; padding: 40px; }
    .analytics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .analytics-card {
      padding: 24px; text-align: center;
      .card-icon { font-size: 40px; width: 40px; height: 40px; color: #3CB371; margin-bottom: 12px; }
      h3 { margin: 0 0 8px 0; font-size: 16px; color: #1f2937; }
      p { margin: 0; color: #6b7280; font-size: 13px; line-height: 1.4; }
    }
    .chart-card { padding: 24px;
      h2 { margin: 0 0 16px 0; color: #1f2937; font-size: 18px; }
      .coming-soon { color: #9ca3af; font-style: italic; text-align: center; padding: 24px; }
    }
    .trend-table { display: flex; flex-direction: column; gap: 4px; }
    .trend-row {
      display: grid; grid-template-columns: 1fr 80px 80px; gap: 12px; padding: 8px 12px; border-radius: 6px; font-size: 14px;
      &.head { font-weight: 700; background: #f3f4f6; }
      &:not(.head):nth-child(even) { background: #fafafa; }
      .created { color: #3b82f6; font-weight: 600; }
      .completed { color: #00b894; font-weight: 600; }
    }
    @media (max-width: 768px) { .analytics-grid { grid-template-columns: repeat(2, 1fr); } }
  `]
})
export class AdminAnalyticsComponent implements OnInit {
  private apiUrl = environment.apiUrl;
  stats: any = null;
  trends: TrendDay[] = [];
  loading = true;

  constructor(private http: HttpClient) {}

  ngOnInit(): void { this.load(); }

  private h(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });
  }

  load(): void {
    this.loading = true;
    this.http.get<any>(`${this.apiUrl}/analytics/dashboard/`, { headers: this.h() }).subscribe({
      next: (d) => { this.stats = d; },
    });
    this.http.get<TrendDay[]>(`${this.apiUrl}/analytics/mission-trends/`, { headers: this.h() }).subscribe({
      next: (t) => { this.trends = t; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }
}
