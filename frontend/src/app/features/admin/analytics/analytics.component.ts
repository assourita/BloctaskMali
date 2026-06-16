import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DashboardHeaderComponent } from '../../../shared/components/dashboard-header/dashboard-header.component';

@Component({
  selector: 'app-admin-analytics',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="analytics-container">
      <div class="page-header">
        <h1>Analytics</h1>
        <p>Statistiques et rapports de la plateforme</p>
      </div>

      <div class="analytics-grid">
        <mat-card class="analytics-card">
          <mat-icon class="card-icon">trending_up</mat-icon>
          <h3>Croissance</h3>
          <p>+23% nouveaux utilisateurs ce mois</p>
        </mat-card>

        <mat-card class="analytics-card">
          <mat-icon class="card-icon">payments</mat-icon>
          <h3>Revenus</h3>
          <p>45,230,000 FCFA de transactions</p>
        </mat-card>

        <mat-card class="analytics-card">
          <mat-icon class="card-icon">star</mat-icon>
          <h3>Satisfaction</h3>
          <p>4.6/5 note moyenne</p>
        </mat-card>

        <mat-card class="analytics-card">
          <mat-icon class="card-icon">schedule</mat-icon>
          <h3>Temps moyen</h3>
          <p>2.3h pour compléter une mission</p>
        </mat-card>
      </div>

      <mat-card class="chart-card">
        <h2>Graphiques détaillés</h2>
        <p class="coming-soon">Les graphiques analytiques seront disponibles prochainement.</p>
      </mat-card>
    </div>
  `,
  styles: [`
    .analytics-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: white;
      padding: 32px;
      border-radius: 16px;
      margin-bottom: 24px;

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

    .analytics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }

    .analytics-card {
      padding: 24px;
      text-align: center;

      .card-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: #3CB371;
        margin-bottom: 16px;
      }

      h3 {
        margin: 0 0 8px 0;
        font-size: 18px;
        color: #1f2937;
      }

      p {
        margin: 0;
        color: #6b7280;
        font-size: 14px;
      }
    }

    .chart-card {
      padding: 32px;
      text-align: center;

      h2 {
        margin: 0 0 16px 0;
        color: #1f2937;
      }

      .coming-soon {
        color: #9ca3af;
        font-style: italic;
      }
    }

    @media (max-width: 768px) {
      .analytics-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `]
})
export class AdminAnalyticsComponent {}
