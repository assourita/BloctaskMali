import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { MissionService } from '../../../core/services/mission.service';

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
  expiry_decision_pending?: boolean;
  expiry_decision_due_at?: string;
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
      <!-- Header - Airbnb Style -->
      <div class="missions-header">
        <div class="header-content">
          <h1>Mes missions</h1>
          <p class="subtitle">Gérez et suivez toutes vos missions publiées</p>
        </div>
        <button mat-raised-button class="create-btn" routerLink="create">
          <mat-icon>add</mat-icon>
          Créer une mission
        </button>
      </div>

      <!-- Stats Cards - Upwork Style -->
      <div class="stats-grid">
        <div class="stat-card stat-card--active">
          <div class="stat-icon">
            <mat-icon>pending_actions</mat-icon>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ getStatValue('active') }}</span>
            <span class="stat-label">En cours</span>
          </div>
        </div>
        <div class="stat-card stat-card--pending">
          <div class="stat-icon">
            <mat-icon>schedule</mat-icon>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ getStatValue('pending') }}</span>
            <span class="stat-label">En attente</span>
          </div>
        </div>
        <div class="stat-card stat-card--completed">
          <div class="stat-icon">
            <mat-icon>check_circle</mat-icon>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ getStatValue('completed') }}</span>
            <span class="stat-label">Terminées</span>
          </div>
        </div>
        <div class="stat-card stat-card--total">
          <div class="stat-icon">
            <mat-icon>analytics</mat-icon>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ getStatValue('total') }}</span>
            <span class="stat-label">Total</span>
          </div>
        </div>
      </div>

      <!-- Filters - Airbnb Style -->
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
        <mat-card class="mission-card" *ngFor="let mission of filteredMissions" (click)="viewMission(mission)">
          <!-- Status Badge -->
          <div class="mission-status-badge" [class]="'status-' + mission.status">
            <mat-icon>{{ getStatusIcon(mission.status) }}</mat-icon>
            <span>{{ getStatusLabel(mission.status) }}</span>
          </div>

          <div class="expiry-strip" *ngIf="needsExpiryAttention(mission)" (click)="stopPropagation($event)">
            <mat-icon>warning</mat-icon>
            <span>{{ getExpiryStripMessage(mission) }}</span>
            <button mat-stroked-button color="warn" type="button" (click)="viewMission(mission, $event)">
              {{ getExpiryButtonText(mission) }}
            </button>
          </div>

          <div class="mission-content">
            <!-- Left: Main Info -->
            <div class="mission-main">
              <div class="mission-header-row">
                <h3 class="mission-title">{{ getMissionTitle(mission) }}</h3>
              </div>
              
              <p class="mission-description" *ngIf="hasDescription(mission)">
                {{ getDescriptionTruncated(mission) }}
              </p>
              
              <!-- Category Tag -->
              <div class="mission-tags" *ngIf="getMissionCategory(mission)">
                <span class="tag category">
                  <mat-icon>folder</mat-icon>
                  {{ getMissionCategory(mission) }}
                </span>
              </div>
              
              <!-- Location Route -->
              <div class="mission-route" *ngIf="hasAnyAddress(mission)">
                <div class="route-item" *ngIf="hasPickupAddress(mission)">
                  <div class="route-dot pickup"></div>
                  <mat-icon class="route-icon">location_on</mat-icon>
                  <span class="route-label">Départ:</span>
                  <span class="route-address">{{ getPickupAddressTruncated(mission) }}</span>
                </div>
                <div class="route-connector" *ngIf="hasBothAddresses(mission)"></div>
                <div class="route-item" *ngIf="hasDeliveryAddress(mission)">
                  <div class="route-dot delivery"></div>
                  <mat-icon class="route-icon">flag</mat-icon>
                  <span class="route-label">Arrivée:</span>
                  <span class="route-address">{{ getDeliveryAddressTruncated(mission) }}</span>
                </div>
              </div>
            </div>

            <!-- Right: Meta Info -->
            <div class="mission-meta">
              <div class="meta-box budget-box">
                <mat-icon>payments</mat-icon>
                <div class="meta-value">{{ getMissionBudget(mission) | number:'1.0-0' }}</div>
                <div class="meta-unit">{{ getMissionCurrency(mission) }}</div>
              </div>
              
              <div class="meta-row" *ngIf="hasDeadline(mission)" [class.overdue]="isDeadlineOverdue(mission)">
                <mat-icon>event</mat-icon>
                <span>{{ mission.deadline | date:'dd MMM yyyy HH:mm' }}</span>
                <span class="overdue-tag" *ngIf="isDeadlineOverdue(mission)">Dépassée</span>
              </div>
              
              <div class="meta-row candidates" *ngIf="hasApplications(mission)">
                <mat-icon aria-hidden="false" [matBadge]="getApplicationsCount(mission)" matBadgeColor="accent" matBadgeSize="small">person</mat-icon>
                <span>{{ getApplicationsCount(mission) }} candidat{{ getApplicationsLabel(mission) }}</span>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="mission-footer">
            <div class="provider-section">
              <div class="provider-info" *ngIf="hasProvider(mission)">
                <img 
                  [src]="getProviderPicture(mission)" 
                  [alt]="getProviderAlt(mission)"
                  class="provider-avatar"
                />
                <div class="provider-details">
                  <span class="provider-name">{{ getProviderName(mission) }}</span>
                  <span class="provider-label">Prestataire assigné</span>
                </div>
              </div>
              <div class="provider-info pending" *ngIf="hasNoProvider(mission)">
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
              <button mat-stroked-button color="primary" type="button" (click)="viewMission(mission, $event)">
                <mat-icon>visibility</mat-icon>
                Voir
              </button>
              <button mat-icon-button type="button" [matMenuTriggerFor]="menu" (click)="stopPropagation($event)">
                <mat-icon>more_vert</mat-icon>
              </button>
            </div>
            
            <mat-menu #menu="matMenu">
              <button mat-menu-item type="button" (click)="viewMission(mission, $event)">
                <mat-icon>visibility</mat-icon>
                <span>Voir détails</span>
              </button>
              <button mat-menu-item *ngIf="canCancel(mission)" (click)="cancelMission(mission, $event)">
                <mat-icon>cancel</mat-icon>
                <span>Annuler</span>
              </button>
              <button mat-menu-item *ngIf="isMissionSubmitted(mission)" (click)="validateMission(mission, $event)">
                <mat-icon>check_circle</mat-icon>
                <span>Valider</span>
              </button>
            </mat-menu>
          </div>
        </mat-card>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="isFilteredMissionsEmpty()">
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
    .missions-container {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
      font-family: system-ui, -apple-system, sans-serif;
    }

    /* Header - Airbnb Style */
    .missions-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;

      .header-content {
        h1 {
          margin: 0;
          font-size: 2.25rem;
          font-weight: 800;
          color: #111827;
        }

        .subtitle {
          margin: 0.5rem 0 0;
          color: #9ca3af;
          font-size: 1rem;
        }
      }

      .create-btn {
        background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
        color: #ffffff;
        border: none;
        border-radius: 0.75rem;
        padding: 0.875rem 1.75rem;
        font-weight: 600;
        font-size: 0.875rem;
        box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.3);
        transition: all 0.2s ease;

        &:hover {
          box-shadow: 0 6px 8px -1px rgba(99, 102, 241, 0.4);
          transform: translateY(-1px);
        }

        mat-icon {
          margin-right: 0.5rem;
        }
      }
    }

    /* Stats Cards - Upwork Style */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 1rem;
      padding: 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: all 0.2s ease;

      &:hover {
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        transform: translateY(-2px);
      }

      .stat-icon {
        width: 3rem;
        height: 3rem;
        border-radius: 0.75rem;
        display: flex;
        align-items: center;
        justify-content: center;

        mat-icon {
          font-size: 1.5rem;
          width: 1.5rem;
          height: 1.5rem;
          color: white;
        }
      }

      .stat-info {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .stat-value {
        font-size: 1.875rem;
        font-weight: 800;
        color: #111827;
      }

      .stat-label {
        font-size: 0.875rem;
        color: #9ca3af;
        font-weight: 500;
      }

      &--active .stat-icon {
        background: linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%);
      }

      &--pending .stat-icon {
        background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
      }

      &--completed .stat-icon {
        background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
      }

      &--total .stat-icon {
        background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%);
      }
    }

    /* Filters - Airbnb Style */
    .filters-bar {
      margin-bottom: 2rem;
    }

    .filter-chips {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .filter-chip {
      background: #f9fafb;
      border: 2px solid #e5e7eb;
      border-radius: 9999px;
      padding: 0.625rem 1.25rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: #6b7280;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 0.5rem;

      &:hover {
        border-color: #6366f1;
        background: #f3f4f6;
      }

      &.active {
        background: #6366f1;
        border-color: #6366f1;
        color: #ffffff;
        box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.3);
      }

      .count {
        background: rgba(255, 255, 255, 0.2);
        padding: 0.125rem 0.5rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 600;
      }
    }

    /* Missions List - Airbnb Style */
    .missions-list {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .mission-card {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 1rem;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: all 0.2s ease;
      cursor: pointer;
      position: relative;

      &:hover {
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        transform: translateY(-2px);
        border-color: #16a34a;
      }

      ::ng-deep {
        .mat-mdc-card-content {
          padding: 0;
        }
      }
    }

    .mission-status-badge {
      position: absolute;
      top: 0.75rem;
      right: 0.75rem;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.3rem 0.7rem;
      border-radius: 9999px;
      font-size: 0.7rem;
      font-weight: 600;
      z-index: 2;
      max-width: calc(100% - 1.5rem);
      pointer-events: none;

      mat-icon {
        font-size: 0.9rem;
        width: 0.9rem;
        height: 0.9rem;
      }

      &.status-published, &.status-funded, &.status-pending {
        background: #e0f2fe;
        color: #0284c7;
      }

      &.status-accepted, &.status-in_progress {
        background: #e0e7ff;
        color: #4f46e5;
      }

      &.status-completed {
        background: #dcfce7;
        color: #16a34a;
      }

      &.status-cancelled {
        background: #fee2e2;
        color: #dc2626;
      }

      &.status-submitted {
        background: #fef3c7;
        color: #d97706;
      }

      &.status-expired {
        background: #f3f4f6;
        color: #4b5563;
      }

      &.status-disputed {
        background: #fce7f3;
        color: #be185d;
      }
    }

    .expiry-strip {
      background: #fffbeb;
      border-bottom: 1px solid #fde68a;
      padding: 0.65rem 1rem;
      padding-right: 7.5rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      position: relative;
      z-index: 1;

      mat-icon {
        color: #d97706;
        font-size: 1.15rem;
        width: 1.15rem;
        height: 1.15rem;
        flex-shrink: 0;
      }

      span {
        flex: 1;
        font-size: 0.8125rem;
        color: #b45309;
        font-weight: 500;
        min-width: 0;
      }

      button {
        flex-shrink: 0;
      }
    }

    .mission-content {
      padding: 1rem 1.25rem;
      padding-top: 2.75rem;
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 1rem;
      align-items: start;
    }

    .mission-main {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      min-width: 0;
    }

    .mission-header-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
    }

    .mission-title {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: #111827;
    }

    .mission-description {
      margin: 0;
      font-size: 0.875rem;
      color: #6b7280;
      line-height: 1.625;
    }

    .mission-tags {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .tag {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;

      mat-icon {
        font-size: 0.875rem;
        width: 0.875rem;
        height: 0.875rem;
      }

      &.category {
        background: #e0e7ff;
        color: #4f46e5;
      }
    }

    .mission-route {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .route-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;

      .route-dot {
        width: 0.5rem;
        height: 0.5rem;
        border-radius: 9999px;

        &.pickup {
          background: #22c55e;
        }

        &.delivery {
          background: #ef4444;
        }
      }

      .route-icon {
        font-size: 1rem;
        width: 1rem;
        height: 1rem;
        color: #9ca3af;
      }

      .route-label {
        font-size: 0.75rem;
        color: #9ca3af;
        font-weight: 500;
        min-width: 3.5rem;
      }

      .route-address {
        font-size: 0.875rem;
        color: #6b7280;
      }
    }

    .route-connector {
      height: 1rem;
      width: 2px;
      background: #e5e7eb;
      margin-left: 0.25rem;
    }

    .mission-meta {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      min-width: 140px;
    }

    .meta-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
      padding: 0.75rem;
      background: #f9fafb;
      border-radius: 0.75rem;

      mat-icon {
        font-size: 1.25rem;
        width: 1.25rem;
        height: 1.25rem;
        color: #4f46e5;
      }

      .meta-value {
        font-size: 1.25rem;
        font-weight: 800;
        color: #111827;
      }

      .meta-unit {
        font-size: 0.75rem;
        color: #9ca3af;
        font-weight: 500;
      }
    }

    .meta-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: #6b7280;

      mat-icon {
        font-size: 1rem;
        width: 1rem;
        height: 1rem;
        color: #9ca3af;
      }

      &.overdue {
        color: #dc2626;
      }

      .overdue-tag {
        background: #fee2e2;
        color: #dc2626;
        padding: 0.125rem 0.5rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 600;
      }

      &.candidates {
        color: #0ea5e9;
      }
    }

    .mission-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f9fafb;
    }

    .provider-section {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .provider-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;

      .provider-avatar {
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 9999px;
        object-fit: cover;
      }

      .provider-details {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;

        .provider-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: #111827;
        }

        .provider-label {
          font-size: 0.75rem;
          color: #9ca3af;
        }
      }

      &.pending {
        .provider-avatar-placeholder {
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 9999px;
          background: #fef3c7;
          display: flex;
          align-items: center;
          justify-content: center;

          mat-icon {
            font-size: 1.25rem;
            width: 1.25rem;
            height: 1.25rem;
            color: #d97706;
          }
        }

        .provider-status {
          font-size: 0.875rem;
          font-weight: 600;
          color: #d97706;
        }
      }
    }

    .mission-actions {
      display: flex;
      gap: 0.5rem;

      button {
        mat-icon {
          font-size: 1.25rem;
          width: 1.25rem;
          height: 1.25rem;
        }
      }
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      background: #ffffff;
      border-radius: 1rem;
      border: 2px dashed #e5e7eb;

      mat-icon {
        font-size: 4rem;
        width: 4rem;
        height: 4rem;
        color: #9ca3af;
        margin-bottom: 1rem;
      }

      h3 {
        font-size: 1.25rem;
        font-weight: 600;
        color: #111827;
        margin: 0 0 0.5rem;
      }

      p {
        font-size: 1rem;
        color: #6b7280;
        margin: 0 0 1.5rem;
      }

      button {
        background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
        color: #ffffff;
        border: none;
        border-radius: 0.75rem;
        padding: 0.875rem 1.75rem;
        font-weight: 600;
      }
    }

    /* Responsive */
    @media (max-width: 1024px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .mission-content {
        grid-template-columns: 1fr;
      }

      .mission-meta {
        flex-direction: row;
        flex-wrap: wrap;
      }
    }

    @media (max-width: 768px) {
      .missions-container {
        padding: 1rem;
      }

      .missions-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;

        .create-btn {
          width: 100%;
        }
      }

      .stats-grid {
        grid-template-columns: 1fr;
      }

      .mission-footer {
        flex-direction: column;
        gap: 1rem;
        align-items: flex-start;
      }
    }
  `]
})

export class ClientMissionsComponent implements OnInit {
  private apiUrl = environment.apiUrl;
  missions: Mission[] = [];
  loading = true;
  activeFilter = 'all';

  stats = [
    { key: 'total', icon: 'assignment', label: 'Total', value: 0, color: '#6C5CE7', filter: 'all' },
    { key: 'active', icon: 'pending_actions', label: 'En cours', value: 0, color: '#3b82f6', filter: 'active' },
    { key: 'pending', icon: 'schedule', label: 'En attente', value: 0, color: '#f59e0b', filter: 'pending' },
    { key: 'completed', icon: 'check_circle', label: 'Terminées', value: 0, color: '#00b894', filter: 'completed' }
  ];

  constructor(
    private http: HttpClient,
    private router: Router,
    private snackBar: MatSnackBar,
    private missionService: MissionService,
  ) {}

  ngOnInit(): void {
    this.loadMissions();
  }

  private h(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });
  }

  loadMissions(): void {
    this.loading = true;
    this.missionService.getMyMissions('client').subscribe({
      next: (missions) => {
        this.missions = missions as Mission[];
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
        return this.missions.filter(m => ['completed', 'cancelled', 'expired'].includes(m.status));
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
        return this.missions.filter(m => ['completed', 'cancelled', 'expired'].includes(m.status)).length;
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
      expired: 'event_busy',
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
      expired: 'Expirée',
      disputed: 'En litige'
    };
    return labels[status] || status;
  }

  viewMission(mission: Mission, event?: Event): void {
    event?.stopPropagation();
    this.router.navigate(['/client/missions', mission.id]);
  }

  canCancel(mission: Mission): boolean {
    return ['draft', 'pending', 'funded'].includes(mission.status);
  }

  isDeadlineOverdue(mission: Mission): boolean {
    if (!mission.deadline) return false;
    if (['completed', 'cancelled', 'expired'].includes(mission.status)) return false;
    return new Date(mission.deadline).getTime() < Date.now();
  }

  needsExpiryAttention(mission: Mission): boolean {
    if (mission.status === 'expired') return true;
    if (mission.expiry_decision_pending) return true;
    if (mission.status === 'accepted' && mission.provider && this.isDeadlineOverdue(mission)) return true;
    if (mission.status === 'funded' && !mission.provider && this.isDeadlineOverdue(mission)) return true;
    return false;
  }

  getExpiryStripMessage(mission: Mission): string {
    if (mission.status === 'expired') return 'Mission expirée — fonds remboursés';
    if (mission.status === 'funded' && !mission.provider) {
      return 'Échéance dépassée — remboursement en cours';
    }
    return 'Échéance dépassée — décision requise';
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

  stopPropagation(event: Event): void {
    event.stopPropagation();
  }

  // Helper methods for template bindings
  getProviderPicture(mission: Mission): string {
    return mission.provider?.profile_picture || 'assets/default-avatar.png';
  }

  getProviderAlt(mission: Mission): string {
    return mission.provider?.first_name || 'Prestataire';
  }

  getProviderName(mission: Mission): string {
    return `${mission.provider?.first_name || ''} ${mission.provider?.last_name || ''}`;
  }

  getApplicationsCount(mission: Mission): number {
    return mission.applications_count || mission.application_count || 0;
  }

  getApplicationsLabel(mission: Mission): string {
    const count = this.getApplicationsCount(mission);
    return count > 1 ? 's' : '';
  }

  // Helper methods for template bindings to avoid || operator
  getMissionTitle(mission: Mission): string {
    return mission.title ? mission.title : 'Sans titre';
  }

  getMissionCategory(mission: Mission): string {
    return mission.category_name ? mission.category_name : '';
  }

  getMissionCurrency(mission: Mission): string {
    return mission.currency ? mission.currency : 'XOF';
  }

  hasApplications(mission: Mission): boolean {
    return (mission.applications_count || 0) > 0 || (mission.application_count || 0) > 0;
  }

  hasPickupAddress(mission: Mission): boolean {
    return mission.pickup_address ? true : false;
  }

  hasDeliveryAddress(mission: Mission): boolean {
    return mission.delivery_address ? true : false;
  }

  hasDeadline(mission: Mission): boolean {
    return mission.deadline ? true : false;
  }

  hasDescription(mission: Mission): boolean {
    return mission.description ? true : false;
  }

  getDescriptionTruncated(mission: Mission): string {
    if (!mission.description) return '';
    return mission.description.length > 120 ? mission.description.slice(0, 120) + '...' : mission.description;
  }

  getPickupAddress(mission: Mission): string {
    return mission.pickup_address ? mission.pickup_address : '';
  }

  getDeliveryAddress(mission: Mission): string {
    return mission.delivery_address ? mission.delivery_address : '';
  }

  isMissionExpired(mission: Mission): boolean {
    return mission.status === 'expired';
  }

  getExpiryButtonText(mission: Mission): string {
    return mission.status === 'expired' ? 'Voir' : 'Décider';
  }

  getMissionBudget(mission: Mission): number {
    return mission.budget ? mission.budget : 0;
  }

  getPickupAddressTruncated(mission: Mission): string {
    if (!mission.pickup_address) return '';
    return mission.pickup_address.length > 35 ? mission.pickup_address.slice(0, 35) + '...' : mission.pickup_address;
  }

  getDeliveryAddressTruncated(mission: Mission): string {
    if (!mission.delivery_address) return '';
    return mission.delivery_address.length > 35 ? mission.delivery_address.slice(0, 35) + '...' : mission.delivery_address;
  }

  hasBothAddresses(mission: Mission): boolean {
    return mission.pickup_address && mission.delivery_address ? true : false;
  }

  hasProvider(mission: Mission): boolean {
    return mission.provider ? true : false;
  }

  hasNoProvider(mission: Mission): boolean {
    return mission.provider ? false : true;
  }

  isMissionSubmitted(mission: Mission): boolean {
    return mission.status === 'submitted';
  }

  isFilteredMissionsEmpty(): boolean {
    return this.filteredMissions.length === 0;
  }

  // Helper methods for stats
  getStatValue(key: string): number {
    const stat = this.stats.find(s => s.key === key);
    return stat ? stat.value : 0;
  }

  hasAnyAddress(mission: Mission): boolean {
    return this.hasPickupAddress(mission) || this.hasDeliveryAddress(mission);
  }
}
