import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

interface UserInfo {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  username?: string;
}

interface Mission {
  id: string;
  title: string;
  client: UserInfo;
  provider?: UserInfo | null;
  category_name?: string;
  category_icon?: string;
  status: string;
  priority: string;
  budget: number;
  currency: string;
  pickup_address?: string;
  delivery_address?: string;
  deadline?: string;
  created_at: string;
  application_count?: number;
}

@Component({
  selector: 'app-admin-missions',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatTableModule, MatPaginatorModule, MatSortModule,
    MatProgressSpinnerModule, MatSelectModule, MatFormFieldModule,
    MatInputModule, MatSnackBarModule, MatTooltipModule, MatDividerModule
  ],
  template: `
    <div class="missions-container">

      <!-- Header -->
      <div class="page-header">
        <div class="header-left">
          <h1>📋 Gestion des Missions</h1>
          <p>{{ dataSource.data.length }} missions sur la plateforme</p>
        </div>
        <button class="btn-refresh" (click)="loadMissions()">
          <mat-icon>refresh</mat-icon> Actualiser
        </button>
      </div>

      <!-- KPI Stats -->
      <div class="kpi-row" *ngIf="!loading">
        <div class="kpi-card" *ngFor="let s of statCards" [style.border-left]="'4px solid ' + s.color">
          <div class="kpi-icon" [style.background]="s.bg" [style.color]="s.color">
            <mat-icon>{{ s.icon }}</mat-icon>
          </div>
          <div class="kpi-body">
            <span class="kpi-value">{{ s.value }}</span>
            <span class="kpi-label">{{ s.label }}</span>
          </div>
        </div>
      </div>

      <!-- Charts -->
      <div class="charts-row" *ngIf="!loading && dataSource.data.length > 0">
        <div class="chart-card">
          <div class="chart-title"><mat-icon>donut_large</mat-icon> Statut des missions</div>
          <div class="chart-wrap"><canvas id="statusDonut"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-title"><mat-icon>bar_chart</mat-icon> Priorité</div>
          <div class="chart-wrap"><canvas id="priorityBar"></canvas></div>
        </div>
      </div>

      <!-- Loading -->
      <div class="loading-container" *ngIf="loading">
        <mat-spinner diameter="40"></mat-spinner>
        <p>Chargement des missions...</p>
      </div>

      <!-- Filters + Table -->
      <div class="main-content" *ngIf="!loading">
        <div class="table-section" [class.with-panel]="selectedMission">

          <!-- Filters bar -->
          <div class="filters-bar">
            <div class="search-wrap">
              <mat-icon class="si">search</mat-icon>
              <input class="search-input" placeholder="Rechercher titre, client..." [(ngModel)]="searchTerm" (input)="applyFilters()" />
            </div>
            <select class="filter-select" [(ngModel)]="filterStatus" (change)="applyFilters()">
              <option value="">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="funded">Financée</option>
              <option value="accepted">Acceptée</option>
              <option value="in_progress">En cours</option>
              <option value="submitted">Preuves soumises</option>
              <option value="completed">Terminée</option>
              <option value="cancelled">Annulée</option>
              <option value="disputed">En litige</option>
            </select>
            <select class="filter-select" [(ngModel)]="filterPriority" (change)="applyFilters()">
              <option value="">Toutes priorités</option>
              <option value="urgent">Urgente</option>
              <option value="high">Haute</option>
              <option value="normal">Normale</option>
              <option value="low">Basse</option>
            </select>
            <span class="results-count">{{ dataSource.filteredData.length }} résultat(s)</span>
          </div>

          <!-- Table -->
          <mat-card class="table-card">
            <table mat-table [dataSource]="dataSource" matSort class="missions-table">

              <ng-container matColumnDef="title">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Mission</th>
                <td mat-cell *matCellDef="let m">
                  <div class="mission-cell">
                    <span class="mission-title">{{ m.title }}</span>
                    <span class="mission-category" *ngIf="m.category_name">{{ m.category_name }}</span>
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="client">
                <th mat-header-cell *matHeaderCellDef>Client</th>
                <td mat-cell *matCellDef="let m">
                  <div class="user-cell">
                    <div class="avatar-sm">{{ (m.client.first_name[0] || '') + (m.client.last_name[0] || '') }}</div>
                    <span>{{ m.client.first_name }} {{ m.client.last_name }}</span>
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="provider">
                <th mat-header-cell *matHeaderCellDef>Prestataire</th>
                <td mat-cell *matCellDef="let m">
                  <div class="user-cell" *ngIf="m.provider; else noProvider">
                    <div class="avatar-sm provider">{{ (m.provider.first_name[0] || '') + (m.provider.last_name[0] || '') }}</div>
                    <span>{{ m.provider.first_name }} {{ m.provider.last_name }}</span>
                  </div>
                  <ng-template #noProvider>
                    <span class="no-provider">— Non assigné</span>
                  </ng-template>
                </td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Statut</th>
                <td mat-cell *matCellDef="let m">
                  <span class="status-badge" [class]="'s-' + m.status">{{ getStatusLabel(m.status) }}</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="priority">
                <th mat-header-cell *matHeaderCellDef>Priorité</th>
                <td mat-cell *matCellDef="let m">
                  <span class="priority-badge" [class]="'p-' + m.priority">{{ getPriorityLabel(m.priority) }}</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="budget">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Budget</th>
                <td mat-cell *matCellDef="let m">
                  <strong>{{ m.budget | number:'1.0-0' }} {{ m.currency }}</strong>
                </td>
              </ng-container>

              <ng-container matColumnDef="created_at">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Date</th>
                <td mat-cell *matCellDef="let m">{{ m.created_at | date:'dd/MM/yy' }}</td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Actions</th>
                <td mat-cell *matCellDef="let m">
                  <button class="btn-view" (click)="openPanel(m)" matTooltip="Voir détails">
                    <mat-icon>visibility</mat-icon>
                  </button>
                  <button class="btn-cancel" (click)="cancelMission(m)"
                    *ngIf="!['completed','cancelled'].includes(m.status)"
                    matTooltip="Annuler">
                    <mat-icon>cancel</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"
                (click)="openPanel(row)"
                [class.selected-row]="selectedMission?.id === row.id"
                class="clickable-row"></tr>
            </table>
            <mat-paginator [pageSizeOptions]="[10, 25, 50]" showFirstLastButtons></mat-paginator>
          </mat-card>
        </div>

        <!-- Detail Panel -->
        <div class="detail-panel" *ngIf="selectedMission">
          <div class="panel-header">
            <h3>Détails de la mission</h3>
            <button class="btn-close" (click)="closePanel()"><mat-icon>close</mat-icon></button>
          </div>

          <div class="panel-body">
            <h4 class="panel-title">{{ selectedMission.title }}</h4>
            <div class="panel-badges">
              <span class="status-badge" [class]="'s-' + selectedMission.status">{{ getStatusLabel(selectedMission.status) }}</span>
              <span class="priority-badge" [class]="'p-' + selectedMission.priority">{{ getPriorityLabel(selectedMission.priority) }}</span>
            </div>

            <mat-divider style="margin: 16px 0"></mat-divider>

            <div class="info-row">
              <mat-icon>person</mat-icon>
              <div>
                <span class="info-label">Client</span>
                <span class="info-val">{{ selectedMission.client.first_name }} {{ selectedMission.client.last_name }}</span>
              </div>
            </div>
            <div class="info-row">
              <mat-icon>engineering</mat-icon>
              <div>
                <span class="info-label">Prestataire</span>
                <span class="info-val">{{ selectedMission.provider ? selectedMission.provider.first_name + ' ' + selectedMission.provider.last_name : 'Non assigné' }}</span>
              </div>
            </div>
            <div class="info-row">
              <mat-icon>payments</mat-icon>
              <div>
                <span class="info-label">Budget</span>
                <span class="info-val budget-val">{{ selectedMission.budget | number:'1.0-0' }} {{ selectedMission.currency }}</span>
              </div>
            </div>
            <div class="info-row" *ngIf="selectedMission.category_name">
              <mat-icon>category</mat-icon>
              <div>
                <span class="info-label">Catégorie</span>
                <span class="info-val">{{ selectedMission.category_name }}</span>
              </div>
            </div>
            <div class="info-row" *ngIf="selectedMission.deadline">
              <mat-icon>schedule</mat-icon>
              <div>
                <span class="info-label">Délai</span>
                <span class="info-val">{{ selectedMission.deadline | date:'dd/MM/yyyy HH:mm' }}</span>
              </div>
            </div>
            <div class="info-row" *ngIf="selectedMission.pickup_address">
              <mat-icon>place</mat-icon>
              <div>
                <span class="info-label">Collecte</span>
                <span class="info-val">{{ selectedMission.pickup_address }}</span>
              </div>
            </div>
            <div class="info-row" *ngIf="selectedMission.delivery_address">
              <mat-icon>flag</mat-icon>
              <div>
                <span class="info-label">Livraison</span>
                <span class="info-val">{{ selectedMission.delivery_address }}</span>
              </div>
            </div>
            <div class="info-row">
              <mat-icon>calendar_today</mat-icon>
              <div>
                <span class="info-label">Créée le</span>
                <span class="info-val">{{ selectedMission.created_at | date:'dd/MM/yyyy HH:mm' }}</span>
              </div>
            </div>
            <div class="info-row" *ngIf="selectedMission.application_count !== undefined">
              <mat-icon>group</mat-icon>
              <div>
                <span class="info-label">Candidatures</span>
                <span class="info-val">{{ selectedMission.application_count }}</span>
              </div>
            </div>

            <mat-divider style="margin: 16px 0"></mat-divider>

            <div class="panel-actions">
              <button class="action-cancel-btn"
                *ngIf="!['completed','cancelled'].includes(selectedMission.status)"
                (click)="cancelMission(selectedMission)">
                <mat-icon>cancel</mat-icon> Annuler la mission
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .missions-container {
      padding: 24px;
      max-width: 1500px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    /* Header */
    .page-header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #fff;
      padding: 28px 32px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      h1 { margin: 0 0 4px; font-size: 22px; font-weight: 700; }
      p  { margin: 0; font-size: 13px; opacity: 0.8; }
    }
    .btn-refresh {
      display: flex; align-items: center; gap: 6px;
      background: rgba(255,255,255,0.12); color: #fff;
      border: 1px solid rgba(255,255,255,0.3); border-radius: 10px;
      padding: 8px 18px; cursor: pointer; font-size: 14px; font-weight: 500;
      &:hover { background: rgba(255,255,255,0.2); }
    }

    /* KPI */
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 14px;
    }
    .kpi-card {
      background: #fff; border-radius: 12px; padding: 16px 18px;
      display: flex; align-items: center; gap: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    .kpi-icon {
      width: 42px; height: 42px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .kpi-body { display: flex; flex-direction: column; }
    .kpi-value { font-size: 22px; font-weight: 700; color: #1a1a2e; line-height: 1; }
    .kpi-label { font-size: 11px; color: #6b7280; margin-top: 3px; }

    /* Charts */
    .charts-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    .chart-card {
      background: #fff; border-radius: 14px; padding: 20px;
      border: 1px solid #eee; box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }
    .chart-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 13px; font-weight: 700; color: #1a1a2e; margin-bottom: 14px;
      mat-icon { font-size: 16px; width: 16px; height: 16px; color: #3CB371; }
    }
    .chart-wrap { height: 200px; position: relative; }

    /* Loading */
    .loading-container {
      display: flex; flex-direction: column; align-items: center;
      padding: 60px; gap: 16px; color: #6c757d;
    }

    /* Main content */
    .main-content {
      display: flex;
      gap: 20px;
      align-items: flex-start;
    }
    .table-section {
      flex: 1;
      min-width: 0;
    }

    /* Filters */
    .filters-bar {
      display: flex; align-items: center; gap: 10px;
      margin-bottom: 12px; flex-wrap: wrap;
    }
    .search-wrap {
      display: flex; align-items: center; gap: 8px;
      background: #fff; border: 1px solid #e2e8f0; border-radius: 10px;
      padding: 8px 12px; flex: 1; min-width: 200px;
      .si { color: #94a3b8; font-size: 18px; width: 18px; height: 18px; }
    }
    .search-input {
      flex: 1; border: none; outline: none; font-size: 14px; color: #1a1a2e;
      &::placeholder { color: #94a3b8; }
    }
    .filter-select {
      border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px 12px;
      font-size: 13px; color: #374151; background: #fff; outline: none; cursor: pointer;
    }
    .results-count {
      font-size: 13px; color: #6b7280; margin-left: auto; white-space: nowrap;
    }

    /* Table */
    .table-card {
      overflow: auto;
      border-radius: 14px !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05) !important;
    }
    .missions-table { width: 100%; }
    .clickable-row { cursor: pointer; }
    .clickable-row:hover { background: #f8fafc; }
    .selected-row { background: #f0faf4 !important; }

    .mission-cell { display: flex; flex-direction: column; gap: 2px; }
    .mission-title { font-size: 14px; font-weight: 500; color: #1a1a2e; }
    .mission-category { font-size: 11px; color: #6b7280; }

    .user-cell { display: flex; align-items: center; gap: 8px; }
    .avatar-sm {
      width: 28px; height: 28px; border-radius: 50%;
      background: #dbeafe; color: #2563eb;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700; flex-shrink: 0;
      &.provider { background: #d1fae5; color: #059669; }
    }
    .no-provider { color: #94a3b8; font-size: 13px; }

    /* Status badges */
    .status-badge {
      padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;
    }
    .s-pending      { background: #fef3c7; color: #d97706; }
    .s-funded       { background: #e0e7ff; color: #4f46e5; }
    .s-accepted     { background: #dbeafe; color: #2563eb; }
    .s-in_progress  { background: #cffafe; color: #0891b2; }
    .s-submitted    { background: #fef9c3; color: #ca8a04; }
    .s-completed    { background: #d1fae5; color: #059669; }
    .s-cancelled    { background: #fee2e2; color: #dc2626; }
    .s-disputed     { background: #fce7f3; color: #be185d; }
    .s-draft        { background: #f1f5f9; color: #64748b; }
    .s-expired      { background: #e5e7eb; color: #6b7280; }

    /* Priority badges */
    .priority-badge {
      padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600;
    }
    .p-urgent { background: #fee2e2; color: #dc2626; }
    .p-high   { background: #fed7aa; color: #c2410c; }
    .p-normal { background: #e0e7ff; color: #4f46e5; }
    .p-low    { background: #f1f5f9; color: #64748b; }

    /* Action buttons */
    .btn-view {
      background: #f1f5f9; border: none; border-radius: 8px;
      width: 32px; height: 32px; cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center;
      mat-icon { font-size: 18px; width: 18px; height: 18px; color: #2563eb; }
      &:hover { background: #dbeafe; }
    }
    .btn-cancel {
      background: #fff0f0; border: none; border-radius: 8px;
      width: 32px; height: 32px; cursor: pointer; margin-left: 4px;
      display: inline-flex; align-items: center; justify-content: center;
      mat-icon { font-size: 18px; width: 18px; height: 18px; color: #dc2626; }
      &:hover { background: #fee2e2; }
    }

    /* Detail panel */
    .detail-panel {
      width: 320px;
      flex-shrink: 0;
      background: #fff;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 16px rgba(0,0,0,0.08);
      overflow: hidden;
    }
    .panel-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 18px;
      border-bottom: 1px solid #f1f5f9;
      background: #f8fafc;
      h3 { margin: 0; font-size: 15px; font-weight: 700; color: #1a1a2e; }
    }
    .btn-close {
      background: none; border: none; cursor: pointer; border-radius: 8px; padding: 4px;
      mat-icon { color: #94a3b8; }
      &:hover { background: #f1f5f9; }
    }
    .panel-body { padding: 18px; }
    .panel-title { margin: 0 0 10px; font-size: 15px; font-weight: 600; color: #1a1a2e; }
    .panel-badges { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 4px; }

    .info-row {
      display: flex; align-items: flex-start; gap: 10px;
      margin-bottom: 12px;
      mat-icon { font-size: 18px; width: 18px; height: 18px; color: #3CB371; margin-top: 2px; flex-shrink: 0; }
      div { display: flex; flex-direction: column; }
    }
    .info-label { font-size: 11px; color: #94a3b8; font-weight: 500; }
    .info-val { font-size: 13px; color: #1a1a2e; font-weight: 500; }
    .budget-val { color: #059669; font-size: 15px; font-weight: 700; }

    .panel-actions { margin-top: 8px; }
    .action-cancel-btn {
      width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
      background: #fee2e2; color: #dc2626; border: none;
      border-radius: 10px; padding: 10px; cursor: pointer; font-weight: 600; font-size: 13px;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      &:hover { background: #fecaca; }
    }

    @media (max-width: 900px) {
      .kpi-row { grid-template-columns: repeat(3, 1fr); }
      .charts-row { grid-template-columns: 1fr; }
      .detail-panel { width: 100%; }
      .main-content { flex-direction: column; }
    }
  `]
})
export class AdminMissionsComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  dataSource = new MatTableDataSource<Mission>([]);
  loading = true;
  displayedColumns = ['title', 'client', 'provider', 'status', 'priority', 'budget', 'created_at', 'actions'];

  selectedMission: Mission | null = null;
  searchTerm = '';
  filterStatus = '';
  filterPriority = '';

  statCards: any[] = [];
  private charts: Chart[] = [];
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private snackBar: MatSnackBar) {}

  ngOnInit(): void { this.loadMissions(); }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  loadMissions(): void {
    this.loading = true;
    this.http.get<any>(`${this.apiUrl}/missions/admin_list/`, { headers: this.getHeaders() }).subscribe({
      next: (res) => {
        const missions: Mission[] = Array.isArray(res) ? res : (res?.results ?? []);
        this.dataSource.data = missions;
        this.loading = false;
        this.applyFilters();
        this.buildStats();
        setTimeout(() => this.renderCharts(), 150);
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Erreur lors du chargement des missions', 'Fermer', { duration: 3000 });
      }
    });
  }

  applyFilters(): void {
    this.dataSource.filterPredicate = (m: Mission, filter: string) => {
      const f = JSON.parse(filter);
      const searchMatch = !f.search || (
        m.title.toLowerCase().includes(f.search) ||
        (m.client.first_name + ' ' + m.client.last_name).toLowerCase().includes(f.search)
      );
      const statusMatch = !f.status || m.status === f.status;
      const priorityMatch = !f.priority || m.priority === f.priority;
      return searchMatch && statusMatch && priorityMatch;
    };
    this.dataSource.filter = JSON.stringify({
      search: this.searchTerm.toLowerCase(),
      status: this.filterStatus,
      priority: this.filterPriority
    });
  }

  buildStats(): void {
    const missions = this.dataSource.data;
    const total = missions.length;
    const active = missions.filter(m => ['funded', 'accepted', 'in_progress', 'submitted'].includes(m.status)).length;
    const completed = missions.filter(m => m.status === 'completed').length;
    const cancelled = missions.filter(m => m.status === 'cancelled').length;
    const disputed = missions.filter(m => m.status === 'disputed').length;

    this.statCards = [
      { label: 'Total', value: total, icon: 'list_alt', color: '#6C5CE7', bg: '#ede9fe' },
      { label: 'Actives', value: active, icon: 'play_circle', color: '#0891b2', bg: '#cffafe' },
      { label: 'Terminées', value: completed, icon: 'check_circle', color: '#059669', bg: '#d1fae5' },
      { label: 'Annulées', value: cancelled, icon: 'cancel', color: '#dc2626', bg: '#fee2e2' },
      { label: 'Litiges', value: disputed, icon: 'gavel', color: '#be185d', bg: '#fce7f3' }
    ];
  }

  renderCharts(): void {
    this.charts.forEach(c => c.destroy());
    this.charts = [];
    const missions = this.dataSource.data;

    const el1 = document.getElementById('statusDonut') as HTMLCanvasElement;
    if (el1) {
      const statusGroups = ['pending', 'in_progress', 'completed', 'cancelled', 'disputed', 'funded', 'accepted'];
      this.charts.push(new Chart(el1, {
        type: 'doughnut',
        data: {
          labels: statusGroups.map(s => this.getStatusLabel(s)),
          datasets: [{
            data: statusGroups.map(s => missions.filter(m => m.status === s).length),
            backgroundColor: ['#fbbf24', '#06b6d4', '#10b981', '#ef4444', '#ec4899', '#8b5cf6', '#3b82f6'],
            borderWidth: 2, borderColor: '#fff'
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { font: { size: 11 } } } } }
      }));
    }

    const el2 = document.getElementById('priorityBar') as HTMLCanvasElement;
    if (el2) {
      this.charts.push(new Chart(el2, {
        type: 'bar',
        data: {
          labels: ['Urgente', 'Haute', 'Normale', 'Basse'],
          datasets: [{
            label: 'Missions',
            data: ['urgent', 'high', 'normal', 'low'].map(p => missions.filter(m => m.priority === p).length),
            backgroundColor: ['#ef4444', '#f97316', '#6366f1', '#94a3b8'],
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

  openPanel(mission: Mission): void { this.selectedMission = mission; }
  closePanel(): void { this.selectedMission = null; }

  cancelMission(mission: Mission): void {
    if (!confirm(`Annuler la mission "${mission.title}" ?`)) return;
    this.http.post(`${this.apiUrl}/missions/${mission.id}/admin_cancel/`, { reason: 'Annulée par un administrateur' }, { headers: this.getHeaders() }).subscribe({
      next: () => {
        mission.status = 'cancelled';
        this.buildStats();
        this.renderCharts();
        this.snackBar.open('Mission annulée', 'Fermer', { duration: 3000 });
      },
      error: () => this.snackBar.open('Erreur lors de l\'annulation', 'Fermer', { duration: 3000 })
    });
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      draft: 'Brouillon', pending: 'En attente', funded: 'Financée',
      accepted: 'Acceptée', in_progress: 'En cours', submitted: 'Preuves soumises',
      completed: 'Terminée', cancelled: 'Annulée', disputed: 'En litige', expired: 'Expirée'
    };
    return labels[status] || status;
  }

  getPriorityLabel(priority: string): string {
    const labels: { [key: string]: string } = {
      urgent: 'Urgente', high: 'Haute', normal: 'Normale', low: 'Basse'
    };
    return labels[priority] || priority;
  }
}
