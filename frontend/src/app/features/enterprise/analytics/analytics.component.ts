import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
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

/** Palette sobre (slate / vert) — pas de pastels « jouets » */
const STATUS_COLORS = [
  '#0f172a', '#16a34a', '#334155', '#64748b', '#94a3b8',
  '#166534', '#475569', '#1e293b', '#86efac', '#cbd5e1',
];

@Component({
  selector: 'app-enterprise-analytics',
  standalone: true,
  imports: [
    CommonModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule,
  ],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <p class="eyebrow">Pilotage</p>
          <h1>Analytics</h1>
          <p class="sub">Indicateurs et tendances — 30 derniers jours</p>
        </div>
        <button mat-stroked-button (click)="exportPdf()" [disabled]="loading || !stats">
          <mat-icon>picture_as_pdf</mat-icon> Exporter PDF
        </button>
      </header>

      <div class="loading" *ngIf="loading"><mat-spinner diameter="36"></mat-spinner></div>

      <div class="metrics" *ngIf="!loading && stats">
        <div class="metric">
          <span class="metric-val">{{ stats.missions_total }}</span>
          <span class="metric-lbl">Missions totales</span>
        </div>
        <div class="metric">
          <span class="metric-val">{{ stats.missions_active }}</span>
          <span class="metric-lbl">En cours</span>
        </div>
        <div class="metric">
          <span class="metric-val">{{ stats.missions_completed }}</span>
          <span class="metric-lbl">Terminées</span>
        </div>
        <div class="metric">
          <span class="metric-val">{{ completionRate }}%</span>
          <span class="metric-lbl">Taux de complétion</span>
        </div>
      </div>

      <div class="extra" *ngIf="!loading && stats && stats.spent_this_month != null">
        <div class="panel spend">
          <span class="label">Dépenses du mois</span>
          <strong>{{ stats.spent_this_month | number:'1.0-0' }} XOF</strong>
        </div>
        <div class="panel spend" *ngIf="stats.employees_count != null">
          <span class="label">Effectif</span>
          <strong>{{ stats.employees_count }} employé(s)</strong>
        </div>
      </div>

      <div class="charts" *ngIf="!loading && trends">
        <section class="panel">
          <h2>Missions créées vs terminées</h2>
          <div class="chart-wrap"><canvas id="entTrendChart"></canvas></div>
        </section>
        <section class="panel">
          <h2>Répartition par statut</h2>
          <div class="chart-wrap"><canvas id="entStatusChart"></canvas></div>
        </section>
      </div>

      <section class="panel" *ngIf="!loading && trends?.by_status?.length">
        <h2>Détail des statuts</h2>
        <table>
          <thead>
            <tr><th>Statut</th><th>Nombre</th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let s of trends!.by_status">
              <td>{{ statusLabel(s.status) }}</td>
              <td>{{ s.count }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  `,
  styles: [`
    .page {
      max-width: 1100px; margin: 0 auto; padding: 28px 24px 56px; color: #0f172a;
    }
    .page-header {
      display: flex; justify-content: space-between; align-items: flex-end; gap: 16px;
      flex-wrap: wrap; margin-bottom: 20px;
    }
    .eyebrow {
      margin: 0 0 4px; font-size: 11px; font-weight: 600; letter-spacing: 0.08em;
      text-transform: uppercase; color: #64748b;
    }
    h1 { margin: 0 0 4px; font-size: 26px; font-weight: 700; letter-spacing: -0.02em; }
    .sub { margin: 0; color: #64748b; font-size: 14px; }
    .loading { display: flex; justify-content: center; padding: 48px; }

    .metrics {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px;
    }
    .metric {
      border: 1px solid #e2e8f0; background: #fff; border-radius: 10px; padding: 16px 18px;
    }
    .metric-val { display: block; font-size: 24px; font-weight: 700; letter-spacing: -0.02em; }
    .metric-lbl { display: block; margin-top: 4px; font-size: 12px; color: #64748b; }

    .extra { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .spend {
      display: flex; justify-content: space-between; align-items: center; gap: 12px;
      .label { font-size: 13px; color: #64748b; }
      strong { font-size: 16px; font-weight: 700; }
    }

    .charts { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    .panel {
      border: 1px solid #e2e8f0; background: #fff; border-radius: 12px; padding: 16px 18px;
      h2 { margin: 0 0 14px; font-size: 15px; font-weight: 650; }
    }
    .chart-wrap { height: 280px; position: relative; }

    table { width: 100%; border-collapse: collapse; }
    th {
      text-align: left; padding: 10px 8px; font-size: 11px; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.04em; color: #94a3b8;
      border-bottom: 1px solid #e2e8f0;
    }
    td { padding: 12px 8px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
    td:last-child { text-align: right; font-weight: 600; }

    @media (max-width: 900px) {
      .metrics { grid-template-columns: repeat(2, 1fr); }
      .charts, .extra { grid-template-columns: 1fr; }
    }
    @media (max-width: 560px) {
      .page { padding: 16px 16px 40px; }
      h1 { font-size: 22px; }
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

  statusLabel(status: string): string {
    return STATUS_LABELS[status] || status;
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
  h1 { font-size: 22px; margin: 0 0 4px; color: #0f172a; }
  .meta { color: #666; font-size: 13px; margin-bottom: 24px; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 28px; }
  .kpi { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; text-align: center; }
  .kpi .val { font-size: 24px; font-weight: 700; display: block; }
  .kpi .lbl { font-size: 11px; color: #6b7280; }
  h2 { font-size: 15px; margin: 24px 0 8px; border-bottom: 2px solid #0f172a; padding-bottom: 4px; }
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
  <footer>Généré par BlockTask</footer>
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
              borderColor: '#0f172a',
              backgroundColor: 'rgba(15, 23, 42, 0.06)',
              fill: true,
              tension: 0.25,
              borderWidth: 2,
              pointRadius: 2,
            },
            {
              label: 'Terminées',
              data: this.trends.daily.map((d) => d.completed),
              borderColor: '#16a34a',
              backgroundColor: 'rgba(22, 163, 74, 0.08)',
              fill: true,
              tension: 0.25,
              borderWidth: 2,
              pointRadius: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } },
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f1f5f9' } },
            x: { grid: { display: false } },
          },
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
          cutout: '58%',
          plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12 } } },
        },
      }));
    }
  }
}
