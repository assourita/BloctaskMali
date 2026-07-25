import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  EnterpriseService,
  EnterpriseInvite,
  EnterpriseInviteSummary,
} from '../../../core/services/enterprise.service';

const ROLE_LABELS: Record<string, string> = {
  agent: 'Agent terrain',
  manager: 'Manager',
  admin: 'Administrateur',
  hr: 'Ressources humaines',
  accountant: 'Comptable',
};

type InviteFilter = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired' | 'all';

@Component({
  selector: 'app-provider-invitations',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1><mat-icon>mail_outline</mat-icon> Invitations</h1>
          <p>Invitations ciblées reçues d'entreprises. Pour postuler à un appel ouvert, allez dans Appels à candidature.</p>
        </div>
        <div class="header-actions">
          <a mat-stroked-button routerLink="/provider/appels">
            <mat-icon>campaign</mat-icon> Appels à candidature
          </a>
          <a mat-stroked-button routerLink="/provider/enterprises">
            <mat-icon>business</mat-icon> Mes entreprises
          </a>
        </div>
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
        <mat-card class="invite-card" *ngFor="let inv of invites" [class.open]="expandedId === inv.id">
          <div class="invite-top">
            <div class="identity">
              <div class="logo" *ngIf="!enterpriseOf(inv)?.logo"><mat-icon>domain</mat-icon></div>
              <img *ngIf="enterpriseOf(inv)?.logo" class="logo-img" [src]="enterpriseOf(inv)?.logo!" [alt]="inv.enterprise_name" />
              <div>
                <div class="badges">
                  <span class="badge" [class]="statusClass(inv)">{{ statusLabel(inv) }}</span>
                  <span class="badge muted">{{ roleLabel(inv.role) }}</span>
                </div>
                <h3>
                  {{ inv.enterprise_name }}
                  <mat-icon class="verified" *ngIf="enterpriseOf(inv)?.is_verified">verified</mat-icon>
                </h3>
                <p>
                  {{ inv.position || roleLabel(inv.role) }}
                  <span *ngIf="enterpriseOf(inv)?.city"> · {{ enterpriseOf(inv)?.city }}</span>
                </p>
                <p class="meta">
                  Reçue le {{ inv.created_at | date:'short' }}
                  <span *ngIf="inv.responded_at"> · réponse {{ inv.responded_at | date:'short' }}</span>
                </p>
                <p class="message" *ngIf="inv.message">« {{ inv.message }} »</p>
              </div>
            </div>
            <div class="actions">
              <button mat-stroked-button (click)="toggleDetails(inv)">
                {{ expandedId === inv.id ? 'Masquer' : 'Détails' }}
              </button>
              <ng-container *ngIf="inv.status === 'pending' && !isExpired(inv)">
                <button mat-raised-button class="accept-btn" (click)="accept(inv)" [disabled]="actionId === inv.id">
                  Accepter
                </button>
                <button mat-stroked-button color="warn" (click)="reject(inv)" [disabled]="actionId === inv.id">
                  Refuser
                </button>
              </ng-container>
            </div>
          </div>

          <div class="details" *ngIf="expandedId === inv.id && enterpriseOf(inv) as ent">
            <div class="detail-grid">
              <div class="block" *ngIf="ent.description">
                <h4>Présentation</h4>
                <p>{{ ent.description }}</p>
              </div>
              <div class="block">
                <h4>Localisation</h4>
                <p *ngIf="ent.address">{{ ent.address }}</p>
                <p>{{ ent.city }}{{ ent.country ? ', ' + ent.country : '' }}</p>
              </div>
              <div class="block">
                <h4>Contact</h4>
                <p *ngIf="ent.company_phone">Tél. {{ ent.company_phone }}</p>
                <p *ngIf="ent.company_email">{{ ent.company_email }}</p>
                <a *ngIf="ent.website" [href]="ent.website" target="_blank" rel="noopener">{{ ent.website }}</a>
              </div>
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
    .page { max-width: 920px; margin: 0 auto; padding: 24px; padding-bottom: 48px; }
    .page-header {
      display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 16px;
      h1 { display: flex; align-items: center; gap: 8px; margin: 0 0 4px; font-size: 22px; }
      p { margin: 0; color: #64748b; font-size: 14px; max-width: 480px; }
    }
    .header-actions { display: flex; flex-wrap: wrap; gap: 8px; }
    .filters { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
    .filters button {
      border: 1px solid #e2e8f0; background: #fff; color: #64748b;
      border-radius: 999px; padding: 8px 14px; font-size: 13px; font-weight: 600; cursor: pointer;
      &.active { background: #ecfdf5; border-color: #86efac; color: #166534; }
    }
    .loading { display: flex; justify-content: center; padding: 40px; }
    .invite-card {
      padding: 16px 18px; margin-bottom: 10px; border: 1px solid #e2e8f0; border-radius: 12px;
      &.open { box-shadow: 0 4px 16px rgba(15,23,42,0.06); }
    }
    .invite-top { display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
    .identity { display: flex; gap: 12px; flex: 1; min-width: 220px; }
    .logo, .logo-img {
      width: 48px; height: 48px; border-radius: 10px; flex-shrink: 0;
    }
    .logo {
      background: #ecfdf3; color: #16a34a; display: flex; align-items: center; justify-content: center;
    }
    .logo-img { object-fit: cover; }
    .badges { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; }
    .badge {
      font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 999px;
      &.pending { background: #fef3c7; color: #92400e; }
      &.accepted { background: #dcfce7; color: #166534; }
      &.rejected { background: #fee2e2; color: #991b1b; }
      &.cancelled, &.expired { background: #f1f5f9; color: #64748b; }
      &.muted { background: #eef2ff; color: #3730a3; }
    }
    h3 { margin: 0 0 2px; font-size: 16px; display: flex; align-items: center; gap: 4px; }
    .verified { font-size: 18px !important; width: 18px !important; height: 18px !important; color: #2563eb; }
    p { margin: 0; font-size: 13px; color: #64748b; }
    .meta { margin-top: 4px !important; font-size: 12px !important; color: #94a3b8 !important; }
    .message { margin-top: 6px !important; font-style: italic; color: #475569 !important; }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .accept-btn { background: #16a34a !important; color: #fff !important; }
    .details { margin-top: 14px; padding-top: 14px; border-top: 1px solid #e2e8f0; }
    .detail-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
    .block {
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px;
      h4 { margin: 0 0 6px; font-size: 13px; color: #334155; }
      p { margin: 0 0 4px; }
      a { font-size: 13px; color: #16a34a; word-break: break-all; }
    }
    .empty { text-align: center; padding: 48px 16px; color: #94a3b8;
      mat-icon { font-size: 40px; width: 40px; height: 40px; }
      h3 { color: #334155; margin: 8px 0 4px; }
    }
  `],
})
export class ProviderInvitationsComponent implements OnInit {
  invites: EnterpriseInvite[] = [];
  loading = true;
  actionId: string | null = null;
  expandedId: string | null = null;
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
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  enterpriseOf(inv: EnterpriseInvite): EnterpriseInviteSummary | null {
    return inv.enterprise || null;
  }

  roleLabel(role: string): string {
    return ROLE_LABELS[role] || role;
  }

  isExpired(inv: EnterpriseInvite): boolean {
    return !!inv.expires_at && new Date(inv.expires_at) <= new Date();
  }

  statusLabel(inv: EnterpriseInvite): string {
    if (inv.status === 'pending' && this.isExpired(inv)) return 'Expirée';
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
    if (inv.status === 'pending' && this.isExpired(inv)) return 'expired';
    return inv.status;
  }

  setFilter(id: InviteFilter): void {
    this.statusFilter = id;
    this.expandedId = null;
    this.load();
  }

  toggleDetails(inv: EnterpriseInvite): void {
    this.expandedId = this.expandedId === inv.id ? null : inv.id;
  }

  load(): void {
    this.loading = true;
    this.enterpriseService.getMyEnterpriseInvites(this.statusFilter).subscribe({
      next: (list) => {
        this.invites = list || [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Erreur chargement invitations', 'Fermer', { duration: 3000 });
      },
    });
  }

  accept(inv: EnterpriseInvite): void {
    this.actionId = inv.id;
    this.enterpriseService.acceptEnterpriseInvite(inv.id).subscribe({
      next: () => {
        this.actionId = null;
        this.snackBar.open(`Vous avez rejoint ${inv.enterprise_name}`, 'Fermer', { duration: 4000 });
        this.load();
      },
      error: (err) => {
        this.actionId = null;
        this.snackBar.open(err.error?.detail || err.error?.error || 'Erreur acceptation', 'Fermer', { duration: 4000 });
      },
    });
  }

  reject(inv: EnterpriseInvite): void {
    this.actionId = inv.id;
    this.enterpriseService.rejectEnterpriseInvite(inv.id).subscribe({
      next: () => {
        this.actionId = null;
        this.snackBar.open('Invitation refusée', 'Fermer', { duration: 3000 });
        this.load();
      },
      error: (err) => {
        this.actionId = null;
        this.snackBar.open(err.error?.detail || err.error?.error || 'Erreur', 'Fermer', { duration: 4000 });
      },
    });
  }
}
