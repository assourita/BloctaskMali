import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { MissionService, MissionSolicitation } from '../../../core/services/mission.service';
import { formatXOF } from '../../../core/constants/africa.constants';

@Component({
  selector: 'app-client-sent-solicitations',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatTabsModule, MatProgressBarModule, MatSnackBarModule,
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1><mat-icon>send</mat-icon> Sollicitations envoyées</h1>
          <p>Suivez les missions que vous avez proposées à des prestataires</p>
        </div>
        <a mat-raised-button color="primary" routerLink="/client/providers">
          <mat-icon>assignment_ind</mat-icon> Attribuer une mission
        </a>
      </div>

      <mat-progress-bar *ngIf="loading" mode="indeterminate"></mat-progress-bar>

      <mat-tab-group class="tabs">
        <mat-tab label="En attente ({{ pending.length }})">
          <ng-container *ngTemplateOutlet="listTpl; context: { items: pending }"></ng-container>
        </mat-tab>
        <mat-tab label="Acceptées ({{ accepted.length }})">
          <ng-container *ngTemplateOutlet="listTpl; context: { items: accepted }"></ng-container>
        </mat-tab>
        <mat-tab label="Refusées / annulées ({{ closed.length }})">
          <ng-container *ngTemplateOutlet="listTpl; context: { items: closed }"></ng-container>
        </mat-tab>
      </mat-tab-group>

      <ng-template #listTpl let-items="items">
        <div class="empty" *ngIf="!loading && !items.length">
          <mat-icon>inbox</mat-icon>
          <p>Aucune sollicitation dans cette catégorie</p>
          <a mat-stroked-button routerLink="/client/providers" *ngIf="pending.length === 0 && accepted.length === 0 && closed.length === 0">
            Trouver un prestataire
          </a>
        </div>

        <div class="cards" *ngIf="items.length">
          <mat-card class="sol-card" *ngFor="let s of items">
            <div class="sol-header">
              <div>
                <h3>{{ s.mission_title }}</h3>
                <p class="provider" *ngIf="s.target_type === 'enterprise' || s.enterprise_name">
                  <mat-icon>business</mat-icon>
                  {{ s.enterprise_name }}
                  <span *ngIf="s.enterprise_city"> · {{ s.enterprise_city }}</span>
                </p>
                <p class="provider" *ngIf="s.target_type !== 'enterprise' && s.provider">
                  <mat-icon>work</mat-icon>
                  {{ s.provider.first_name }} {{ s.provider.last_name }}
                  <mat-icon class="verified" *ngIf="s.provider.identity_verified">verified</mat-icon>
                </p>
              </div>
              <span class="status-chip" [class]="s.status">{{ statusLabel(s.status) }}</span>
            </div>

            <div class="meta">
              <span><mat-icon>payments</mat-icon> {{ formatBudget(s) }}</span>
              <span *ngIf="s.pickup_address"><mat-icon>place</mat-icon> {{ s.pickup_address }}</span>
              <span><mat-icon>schedule</mat-icon> {{ s.created_at | date:'short' }}</span>
            </div>

            <p class="message" *ngIf="s.message">« {{ s.message }} »</p>

            <div class="actions">
              <button
                mat-stroked-button
                color="warn"
                *ngIf="s.status === 'pending'"
                (click)="cancel(s)"
                [disabled]="actionId === s.id">
                <mat-icon>cancel</mat-icon> Annuler
              </button>
              <button mat-raised-button color="primary" [routerLink]="['/client/missions', s.mission]">
                <mat-icon>visibility</mat-icon> Voir la mission
              </button>
            </div>
          </mat-card>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .page {
      max-width: 900px;
      margin: 0 auto;
      padding: 24px;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 20px;
    }

    .page-header h1 {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0 0 6px;
      font-size: 26px;
      color: #0f172a;
    }

    .page-header p {
      margin: 0;
      color: #64748b;
    }

    .tabs { margin-top: 8px; }

    .empty {
      text-align: center;
      padding: 48px 16px;
      color: #94a3b8;
    }

    .empty mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 8px;
    }

    .cards {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 16px 0 24px;
    }

    .sol-card {
      padding: 20px;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
    }

    .sol-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 12px;
    }

    .sol-header h3 {
      margin: 0 0 4px;
      font-size: 18px;
      color: #0f172a;
    }

    .provider {
      display: flex;
      align-items: center;
      gap: 4px;
      margin: 0;
      font-size: 13px;
      color: #64748b;
    }

    .provider mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .verified {
      color: #3CB371;
      font-size: 14px !important;
      width: 14px !important;
      height: 14px !important;
    }

    .status-chip {
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
    }

    .status-chip.pending { background: #fef3c7; color: #92400e; }
    .status-chip.accepted { background: #d1fae5; color: #065f46; }
    .status-chip.rejected, .status-chip.cancelled, .status-chip.expired {
      background: #f1f5f9; color: #64748b;
    }

    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 12px 20px;
      font-size: 13px;
      color: #475569;
      margin-bottom: 10px;
    }

    .meta span {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .meta mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #3CB371;
    }

    .message {
      font-size: 14px;
      color: #64748b;
      font-style: italic;
      margin: 0 0 16px;
      padding: 10px 12px;
      background: #f8fafc;
      border-radius: 8px;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      flex-wrap: wrap;
    }
  `]
})
export class ClientSentSolicitationsComponent implements OnInit {
  solicitations: MissionSolicitation[] = [];
  loading = true;
  actionId = '';

  constructor(
    private missionService: MissionService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  get pending(): MissionSolicitation[] {
    return this.solicitations.filter(s => s.status === 'pending');
  }

  get accepted(): MissionSolicitation[] {
    return this.solicitations.filter(s => s.status === 'accepted');
  }

  get closed(): MissionSolicitation[] {
    return this.solicitations.filter(s =>
      ['rejected', 'cancelled', 'expired'].includes(s.status)
    );
  }

  load(): void {
    this.loading = true;
    this.missionService.getSentSolicitations().subscribe({
      next: (data) => {
        this.solicitations = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Erreur de chargement', 'Fermer', { duration: 4000 });
      },
    });
  }

  cancel(s: MissionSolicitation): void {
    this.actionId = s.id;
    this.missionService.cancelSolicitation(s.id).subscribe({
      next: () => {
        this.actionId = '';
        this.snackBar.open('Sollicitation annulée', 'Fermer', { duration: 3000 });
        this.load();
      },
      error: (err) => {
        this.actionId = '';
        this.snackBar.open(err.error?.error || 'Erreur', 'Fermer', { duration: 5000 });
      },
    });
  }

  formatBudget(s: MissionSolicitation): string {
    const amount = Number(s.mission_budget);
    return `${formatXOF(amount)} ${s.mission_currency || 'XOF'}`;
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'En attente',
      accepted: 'Acceptée',
      rejected: 'Refusée',
      cancelled: 'Annulée',
      expired: 'Expirée',
    };
    return labels[status] || status;
  }
}
