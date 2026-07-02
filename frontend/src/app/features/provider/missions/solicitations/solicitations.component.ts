import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { MissionService, MissionSolicitation } from '../../../../core/services/mission.service';
import { formatXOF } from '../../../../core/constants/africa.constants';

@Component({
  selector: 'app-provider-solicitations',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatTabsModule, MatProgressBarModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <h1><mat-icon>mail</mat-icon> Mes sollicitations</h1>
        <p>Missions pour lesquelles un client vous a sollicité directement</p>
      </div>

      <mat-progress-bar *ngIf="loading" mode="indeterminate"></mat-progress-bar>

      <mat-tab-group [(selectedIndex)]="tabIndex" (selectedIndexChange)="onTabChange($event)" class="tabs">
        <mat-tab label="En attente">
          <ng-container *ngTemplateOutlet="listTpl; context: { items: pending }"></ng-container>
        </mat-tab>
        <mat-tab label="Acceptées">
          <ng-container *ngTemplateOutlet="listTpl; context: { items: accepted }"></ng-container>
        </mat-tab>
        <mat-tab label="Refusées / expirées">
          <ng-container *ngTemplateOutlet="listTpl; context: { items: closed }"></ng-container>
        </mat-tab>
      </mat-tab-group>

      <ng-template #listTpl let-items="items">
        <div class="empty" *ngIf="!loading && !items.length">
          <mat-icon>inbox</mat-icon>
          <p>Aucune sollicitation dans cette catégorie</p>
        </div>

        <div class="cards" *ngIf="items.length">
          <mat-card class="sol-card clickable" *ngFor="let s of items" [routerLink]="['/provider/missions/solicitations', s.id]">
            <div class="sol-header">
              <div>
                <h3>{{ s.mission_title }}</h3>
                <p class="client" *ngIf="s.client">
                  <mat-icon>person</mat-icon>
                  {{ s.client.first_name }} {{ s.client.last_name }}
                </p>
              </div>
              <span class="status-chip" [class]="s.status">{{ statusLabel(s.status) }}</span>
            </div>

            <div class="meta">
              <span><mat-icon>payments</mat-icon> {{ formatBudget(s) }}</span>
              <span *ngIf="s.pickup_address"><mat-icon>place</mat-icon> {{ s.pickup_address }}</span>
              <span *ngIf="s.deadline"><mat-icon>schedule</mat-icon> {{ s.deadline | date:'short' }}</span>
            </div>

            <p class="message" *ngIf="s.message">« {{ s.message }} »</p>

            <div class="actions">
              <span class="detail-hint"><mat-icon>chevron_right</mat-icon> Voir le détail pour accepter ou refuser</span>
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

    .page-header h1 {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0 0 6px;
      font-size: 26px;
      color: #0f172a;
    }

    .page-header p {
      margin: 0 0 20px;
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

    .sol-card.clickable { cursor: pointer; transition: box-shadow .2s, border-color .2s; }
    .sol-card.clickable:hover { box-shadow: 0 4px 20px rgba(0,0,0,.06); border-color: #3CB371; }

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

    .client {
      display: flex;
      align-items: center;
      gap: 4px;
      margin: 0;
      font-size: 13px;
      color: #64748b;
    }

    .client mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
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
      margin-top: 8px;
    }

    .detail-hint { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; color: #3CB371; font-weight: 600; }
    .detail-hint mat-icon { font-size: 18px; width: 18px; height: 18px; }
  `]
})
export class ProviderSolicitationsComponent implements OnInit {
  solicitations: MissionSolicitation[] = [];
  loading = true;
  tabIndex = 0;

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
    this.missionService.getMySolicitations().subscribe({
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

  onTabChange(_index: number): void {}

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
