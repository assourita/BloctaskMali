import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Chart, registerables } from 'chart.js';
import {
  EnterpriseService,
  EnterpriseAnalytics,
  EnterpriseMissionTrends,
} from '../../../core/services/enterprise.service';

Chart.register(...registerables);

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  pending: 'En attente',
  funded: 'Financée',
  open: 'Ouverte',
  assigned: 'Assignée',
  accepted: 'Acceptée',
  in_progress: 'En cours',
  submitted: 'Soumise',
  completed: 'Terminée',
  cancelled: 'Annulée',
  disputed: 'Litige',
};

const STATUS_COLORS = [
  '#6C5CE7', '#3CB371', '#4ECDC4', '#FFD93D', '#FF6B6B',
  '#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#9ca3af',
];

@Component({
  selector: 'app-enterprise-analytics',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1><mat-icon>analytics</mat-icon> Analytics</h1>
          <p>Indicateurs et tendances de vos missions (30 derniers jours)</p>
        </div>
        <button mat-stroked-button (click)="exportPdf()" [disabled]="loading || !stats">
          <mat-icon>picture_as_pdf</mat-icon> Exporter PDF
        </button>
      </div>

      <div class="loading" *ngIf="loading"><mat-spinner diameter="36"></mat-spinner></div>

      <div class="kpi-grid" *ngIf="!loading && stats">
        <mat-card class="kpi">
          <mat-icon>assignment</mat-icon>
          <span class="val">{{ stats.missions_total }}</span>
          <span class="lbl">Missions totales</span>
        </mat-card>
        <mat-card class="kpi active">
          <mat-icon>play_circle</mat-icon>
          <span class="val">{{ stats.missions_active }}</span>
          <span class="lbl">En cours</span>
        </mat-card>
        <mat-card class="kpi done">
          <mat-icon>check_circle</mat-icon>
          <span class="val">{{ stats.missions_completed }}</span>
          <span class="lbl">Terminées</span>
        </mat-card>
        <mat-card class="kpi rate">
          <mat-icon>trending_up</mat-icon>
          <span class="val">{{ completionRate }}%</span>
          <span class="lbl">Taux de complétion</span>
        </mat-card>
      </div>

      <div class="charts-row" *ngIf="!loading && trends">
        <mat-card class="chart-card">
          <h3>Missions créées vs terminées</h3>
          <div class="chart-wrap"><canvas id="entTrendChart"></canvas></div>
        </mat-card>
        <mat-card class="chart-card">
          <h3>Répartition par statut</h3>
          <div class="chart-wrap"><canvas id="entStatusChart"></canvas></div>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .page-container { max-width: 1100px; margin: 0 auto; }
    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 24px; flex-wrap: wrap; gap: 12px;
      h1 { margin: 0 0 4px; display: flex; align-items: center; gap: 8px; font-size: 22px; }
      p { margin: 0; color: #6b7280; font-size: 14px; }
    }
    .loading { display: flex; justify-content: center; padding: 40px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .kpi {
      padding: 24px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px;
      mat-icon { font-size: 32px; width: 32px; height: 32px; color: #6C5CE7; }
      .val { font-size: 28px; font-weight: 800; } .lbl { font-size: 13px; color: #6b7280; }
      &.active mat-icon { color: #f59e0b; } &.done mat-icon { color: #00b894; } &.rate mat-icon { color: #3CB371; }
    }
    .charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .chart-card {
      padding: 20px;
      h3 { margin: 0 0 16px; font-size: 15px; color: #374151; }
    }
    .chart-wrap { height: 280px; position: relative; }
    @media (max-width: 900px) {
      .kpi-grid { grid-template-columns: repeat(2, 1fr); }
      .charts-row { grid-template-columns: 1fr; }
    }
  `],
})
export class EnterpriseAnalyticsComponent implements OnInit, OnDestroy {
  stats: EnterpriseAnalytics | null = null;
  trends: EnterpriseMissionTrends | null = null;
  companyName = 'Mon entreprise';
  loading = true;
  private charts: Chart[] = [];

  get completionRate(): number {
    if (!this.stats?.missions_total) return 0;
    return Math.round((this.stats.missions_completed / this.stats.missions_total) * 100);
  }

  constructor(private enterpriseService: EnterpriseService) {}

  ngOnInit(): void {
    this.enterpriseService.getProfile().subscribe({
      next: (p) => { this.companyName = p.company_name || this.companyName; },
      error: () => {},
    });
    this.load();
  }

  ngOnDestroy(): void {
    this.charts.forEach((c) => c.destroy());
  }

  load(): void {
    this.loading = true;
    let statsDone = false;
    let trendsDone = false;

    const finish = () => {
      if (statsDone && trendsDone) {
        this.loading = false;
        setTimeout(() => this.renderCharts(), 150);
      }
    };

    this.enterpriseService.getAnalytics().subscribe({
      next: (d) => { this.stats = d; statsDone = true; finish(); },
      error: () => { statsDone = true; finish(); },
    });

    this.enterpriseService.getMissionTrends().subscribe({
      next: (d) => { this.trends = d; trendsDone = true; finish(); },
      error: () => { trendsDone = true; finish(); },
    });
  }

  exportPdf(): void {
    if (!this.stats || !this.trends) return;

    const dateStr = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
    const statusRows = this.trends.by_status.map((s) => `
      <tr><td>${STATUS_LABELS[s.status] || s.status}</td><td style="text-align:right">${s.count}</td></tr>
    `).join('');
    const trendRows = this.trends.daily.slice(-14).map((d) => {
      const day = d.day
        ? new Date(d.day).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
        : '—';
      return `<tr><td>${day}</td><td style="text-align:right">${d.created}</td><td style="text-align:right">${d.completed}</td></tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><title>Rapport Analytics — ${this.companyName}</title>
<style>
  body { font-family: Arial, sans-serif; color: #111; padding: 32px; max-width: 800px; margin: 0 auto; }
  h1 { font-size: 22px; margin: 0 0 4px; color: #3CB371; }
  .meta { color: #666; font-size: 13px; margin-bottom: 24px; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 28px; }
  .kpi { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; text-align: center; }
  .kpi .val { font-size: 24px; font-weight: 700; display: block; }
  .kpi .lbl { font-size: 11px; color: #6b7280; }
  h2 { font-size: 15px; margin: 24px 0 8px; border-bottom: 2px solid #3CB371; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px; }
  th, td { border: 1px solid #e5e7eb; padding: 8px 10px; }
  th { background: #f9fafb; text-align: left; }
  footer { margin-top: 32px; font-size: 11px; color: #9ca3af; text-align: center; }
  @media print { body { padding: 16px; } }
</style></head><body>
  <h1>${this.companyName}</h1>
  <p class="meta">Rapport analytics BlockTask — ${dateStr} — période : 30 derniers jours</p>
  <div class="kpis">
    <div class="kpi"><span class="val">${this.stats.missions_total}</span><span class="lbl">Missions totales</span></div>
    <div class="kpi"><span class="val">${this.stats.missions_active}</span><span class="lbl">En cours</span></div>
    <div class="kpi"><span class="val">${this.stats.missions_completed}</span><span class="lbl">Terminées</span></div>
    <div class="kpi"><span class="val">${this.completionRate}%</span><span class="lbl">Taux complétion</span></div>
  </div>
  <h2>Répartition par statut</h2>
  <table><thead><tr><th>Statut</th><th>Nombre</th></tr></thead><tbody>${statusRows}</tbody></table>
  <h2>Tendances (14 derniers jours)</h2>
  <table><thead><tr><th>Date</th><th>Créées</th><th>Terminées</th></tr></thead><tbody>${trendRows}</tbody></table>
  ${this.stats.spent_this_month != null ? `<p><strong>Dépenses du mois :</strong> ${this.stats.spent_this_month} XOF</p>` : ''}
  <footer>Généré par BlockTask — blocktask</footer>
</body></html>`;

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 400);
  }

  private renderCharts(): void {
    this.charts.forEach((c) => c.destroy());
    this.charts = [];
    if (!this.trends) return;

    const trendEl = document.getElementById('entTrendChart') as HTMLCanvasElement;
    if (trendEl && this.trends.daily.length) {
      const labels = this.trends.daily.map((d) => {
        if (!d.day) return '';
        const dt = new Date(d.day);
        return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
      });
      this.charts.push(new Chart(trendEl, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Créées',
              data: this.trends.daily.map((d) => d.created),
              borderColor: '#6C5CE7',
              backgroundColor: 'rgba(108, 92, 231, 0.1)',
              fill: true,
              tension: 0.3,
            },
            {
              label: 'Terminées',
              data: this.trends.daily.map((d) => d.completed),
              borderColor: '#3CB371',
              backgroundColor: 'rgba(60, 179, 113, 0.1)',
              fill: true,
              tension: 0.3,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' } },
          scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
        },
      }));
    }

    const statusEl = document.getElementById('entStatusChart') as HTMLCanvasElement;
    if (statusEl && this.trends.by_status.length) {
      const labels = this.trends.by_status.map((s) => STATUS_LABELS[s.status] || s.status);
      this.charts.push(new Chart(statusEl, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data: this.trends.by_status.map((s) => s.count),
            backgroundColor: this.trends.by_status.map((_, i) => STATUS_COLORS[i % STATUS_COLORS.length]),
            borderWidth: 2,
            borderColor: '#fff',
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } },
        },
      }));
    }
  }
}
