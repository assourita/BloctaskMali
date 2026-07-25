import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { EnterpriseService, EnterpriseInvite } from '../../../core/services/enterprise.service';

const ROLE_LABELS: Record<string, string> = {
  agent: 'Agent terrain',
  manager: 'Manager',
  admin: 'Administrateur',
  hr: 'Ressources humaines',
  accountant: 'Comptable',
};

type InviteFilter = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired' | 'all';

@Component({
  selector: 'app-enterprise-invitations',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    MatCardModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatProgressSpinnerModule, MatSnackBarModule,
  ],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1><mat-icon>mail_outline</mat-icon> Invitations prestataires</h1>
          <p>Suivez les invitations en attente, acceptées, refusées ou annulées.</p>
        </div>
        <a mat-raised-button color="primary" routerLink="/enterprise/employees">
          <mat-icon>person_add</mat-icon> Inviter un prestataire
        </a>
      </header>

      <div class="filters">
        <button *ngFor="let f of filters" type="button"
          [class.active]="statusFilter === f.id"
          (click)="setFilter(f.id)">
          {{ f.label }}
        </button>
      </div>

      <div class="loading" *ngIf="loading"><mat-spinner diameter="36"></mat-spinner></div>

      <div class="list" *ngIf="!loading">
        <mat-card class="invite-card" *ngFor="let inv of invites">
          <div class="invite-main">
            <div>
              <div class="badges">
                <span class="badge" [class]="statusClass(inv)">{{ statusLabel(inv) }}</span>
                <span class="badge muted">{{ roleLabel(inv.role) }}</span>
              </div>
              <h3>{{ inv.email }}</h3>
              <p>
                {{ inv.position || '—' }}
                <span *ngIf="inv.invited_by_name"> · par {{ inv.invited_by_name }}</span>
              </p>
              <p class="meta">
                Envoyée le {{ inv.created_at | date:'short' }}
                <span *ngIf="inv.expires_at && inv.status === 'pending'"> · expire {{ inv.expires_at | date:'short' }}</span>
                <span *ngIf="inv.responded_at"> · réponse {{ inv.responded_at | date:'short' }}</span>
              </p>
              <p class="message" *ngIf="inv.message">« {{ inv.message }} »</p>
            </div>
            <div class="actions" *ngIf="inv.status === 'pending'">
              <button mat-stroked-button color="warn"
                (click)="cancel(inv)"
                [disabled]="actionId === inv.id">
                Annuler
              </button>
            </div>
          </div>
        </mat-card>

        <div class="empty" *ngIf="!invites.length">
          <mat-icon>inbox</mat-icon>
          <h3>Aucune invitation</h3>
          <p>Aucune invitation pour ce filtre.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 920px; margin: 0 auto; padding-bottom: 40px; }
    .page-header {
      display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 16px;
      h1 { display: flex; align-items: center; gap: 8px; margin: 0 0 4px; font-size: 22px; }
      p { margin: 0; color: #64748b; font-size: 14px; }
    }
    .filters { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
    .filters button {
      border: 1px solid #e2e8f0; background: #fff; color: #64748b;
      border-radius: 999px; padding: 8px 14px; font-size: 13px; font-weight: 600; cursor: pointer;
      &.active { background: #ecfdf5; border-color: #86efac; color: #166534; }
    }
    .loading { display: flex; justify-content: center; padding: 40px; }
    .invite-card { padding: 16px 18px; margin-bottom: 10px; border: 1px solid #e2e8f0; border-radius: 12px; }
    .invite-main { display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; align-items: flex-start; }
    .badges { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; }
    .badge {
      font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 999px;
      &.pending { background: #fef3c7; color: #92400e; }
      &.accepted { background: #dcfce7; color: #166534; }
      &.rejected { background: #fee2e2; color: #991b1b; }
      &.cancelled, &.expired { background: #f1f5f9; color: #64748b; }
      &.muted { background: #eef2ff; color: #3730a3; }
    }
    h3 { margin: 0 0 4px; font-size: 16px; }
    p { margin: 0; font-size: 13px; color: #64748b; }
    .meta { margin-top: 4px !important; font-size: 12px !important; color: #94a3b8 !important; }
    .message { margin-top: 8px !important; font-style: italic; color: #475569 !important; }
    .empty { text-align: center; padding: 48px 16px; color: #94a3b8;
      mat-icon { font-size: 40px; width: 40px; height: 40px; }
      h3 { color: #334155; margin: 8px 0 4px; }
    }
  `],
})
export class EnterpriseInvitationsComponent implements OnInit {
  invites: EnterpriseInvite[] = [];
  loading = true;
  actionId: string | null = null;
  statusFilter: InviteFilter = 'pending';

  filters: { id: InviteFilter; label: string }[] = [
    { id: 'pending', label: 'En attente' },
    { id: 'accepted', label: 'Acceptées' },
    { id: 'rejected', label: 'Refusées' },
    { id: 'cancelled', label: 'Annulées' },
    { id: 'expired', label: 'Expirées' },
    { id: 'all', label: 'Tout' },
  ];

  constructor(
    private enterpriseService: EnterpriseService,
    private snack: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  setFilter(id: InviteFilter): void {
    this.statusFilter = id;
    this.load();
  }

  load(): void {
    this.loading = true;
    this.enterpriseService.listEnterpriseInvites(this.statusFilter).subscribe({
      next: (list) => {
        this.invites = list || [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snack.open('Erreur chargement invitations', 'Fermer', { duration: 3000 });
      },
    });
  }

  roleLabel(role: string): string {
    return ROLE_LABELS[role] || role;
  }

  statusLabel(inv: EnterpriseInvite): string {
    if (inv.status === 'pending' && inv.expires_at && new Date(inv.expires_at) <= new Date()) {
      return 'Expirée';
    }
    const map: Record<string, string> = {
      pending: 'En attente',
      accepted: 'Acceptée',
      rejected: 'Refusée',
      cancelled: 'Annulée',
      expired: 'Expirée',
    };
    return map[inv.status] || inv.status;
  }

  statusClass(inv: EnterpriseInvite): string {
    if (inv.status === 'pending' && inv.expires_at && new Date(inv.expires_at) <= new Date()) {
      return 'expired';
    }
    return inv.status;
  }

  cancel(inv: EnterpriseInvite): void {
    if (!confirm(`Annuler l'invitation pour ${inv.email} ?`)) return;
    this.actionId = inv.id;
    this.enterpriseService.cancelEnterpriseInvite(inv.id).subscribe({
      next: () => {
        this.actionId = null;
        this.snack.open('Invitation annulée', 'Fermer', { duration: 3000 });
        this.load();
      },
      error: (err) => {
        this.actionId = null;
        this.snack.open(err.error?.error || err.error?.detail || 'Erreur', 'Fermer', { duration: 4000 });
      },
    });
  }
}
