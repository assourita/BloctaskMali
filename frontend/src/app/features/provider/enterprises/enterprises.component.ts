import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  EnterpriseService,
  EnterpriseInvite,
  EnterpriseInviteSummary,
  ProviderEnterpriseMembership,
} from '../../../core/services/enterprise.service';

const ROLE_LABELS: Record<string, string> = {
  agent: 'Agent terrain',
  manager: 'Manager',
  admin: 'Administrateur',
  hr: 'Ressources humaines',
  accountant: 'Comptable',
};

@Component({
  selector: 'app-provider-enterprises',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1><mat-icon>business</mat-icon> Mes entreprises</h1>
          <p>Consultez les entreprises auxquelles vous êtes lié.</p>
        </div>
        <div class="header-actions">
          <a mat-stroked-button routerLink="/provider/invitations">
            <mat-icon>inbox</mat-icon> Invitations
          </a>
          <a mat-stroked-button routerLink="/provider/missions">
            <mat-icon>assignment</mat-icon> Mes missions
          </a>
        </div>
      </div>

      <mat-card *ngIf="pendingInvites.length" class="invite-banner" routerLink="/provider/invitations">
        <div class="invite-banner-content">
          <mat-icon>mail_outline</mat-icon>
          <div>
            <strong>{{ pendingInvites.length }} invitation(s) en attente</strong>
            <span class="invite-meta"> — ouvrez la page Invitations pour accepter ou refuser</span>
          </div>
        </div>
        <mat-icon>chevron_right</mat-icon>
      </mat-card>

      <p class="hint">
        <mat-icon>info</mat-icon>
        Les missions assignées via une entreprise apparaissent dans <strong>Mes missions assignées</strong>.
      </p>

      <div class="loading" *ngIf="loading"><mat-spinner diameter="36"></mat-spinner></div>

      <div class="list" *ngIf="!loading">
        <h2 *ngIf="memberships.length">Entreprises liées</h2>
        <mat-card class="enterprise-card" *ngFor="let m of memberships" [class.open]="expandedMembershipId === m.id">
          <div class="enterprise-top">
            <div class="enterprise-info">
              <div class="logo" *ngIf="!enterpriseOf(m)?.logo"><mat-icon>domain</mat-icon></div>
              <img *ngIf="enterpriseOf(m)?.logo" class="logo-img" [src]="enterpriseOf(m)?.logo!" [alt]="m.enterprise_name" />
              <div>
                <h3>
                  {{ m.enterprise_name }}
                  <mat-icon class="verified" *ngIf="enterpriseOf(m)?.is_verified">verified</mat-icon>
                </h3>
                <p>{{ m.position || roleLabel(m.role) }} · {{ m.is_active ? 'Actif' : 'Inactif' }}</p>
                <span class="hired-at" *ngIf="m.hired_at">Membre depuis {{ m.hired_at | date:'mediumDate' }}</span>
              </div>
            </div>
            <div class="membership-actions">
              <button mat-stroked-button (click)="toggleMembershipDetails(m)">
                {{ expandedMembershipId === m.id ? 'Masquer' : 'Détails' }}
              </button>
              <mat-chip [class]="m.is_active ? 'active-chip' : 'inactive-chip'">
                {{ m.is_active ? 'Lié' : 'Inactif' }}
              </mat-chip>
            </div>
          </div>

          <div class="invite-details" *ngIf="expandedMembershipId === m.id && enterpriseOf(m) as ent">
            <div class="detail-grid">
              <div class="detail-block" *ngIf="ent.description">
                <h4><mat-icon>info</mat-icon> Présentation</h4>
                <p>{{ ent.description }}</p>
              </div>
              <div class="detail-block">
                <h4><mat-icon>place</mat-icon> Localisation</h4>
                <p *ngIf="ent.address">{{ ent.address }}</p>
                <p>{{ ent.city }}{{ ent.country ? ', ' + ent.country : '' }}</p>
              </div>
              <div class="detail-block">
                <h4><mat-icon>call</mat-icon> Contact</h4>
                <p *ngIf="ent.company_phone">Tél. {{ ent.company_phone }}</p>
                <p *ngIf="ent.company_email">{{ ent.company_email }}</p>
                <a *ngIf="ent.website" [href]="ent.website" target="_blank" rel="noopener">{{ ent.website }}</a>
              </div>
            </div>
          </div>
        </mat-card>

        <p class="empty" *ngIf="!memberships.length && !pendingInvites.length">
          Aucune entreprise liée pour le moment.
        </p>
      </div>
    </div>
  `,
  styles: [`
    .page {
      max-width: 920px;
      margin: 0 auto;
      padding: 24px;
      padding-bottom: 48px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      flex-wrap: wrap;
    }

    .page-header h1 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 4px;
      font-size: 22px;
      font-weight: 700;
      color: #0f172a;
    }

    .page-header p {
      margin: 0;
      color: #64748b;
      font-size: 14px;
    }

    .header-actions { display: flex; flex-wrap: wrap; gap: 8px; }

    .invite-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      border-left: 4px solid #16a34a;
      background: #f0fdf4;
      cursor: pointer;
      text-decoration: none;
      color: inherit;
    }
    .invite-banner-content {
      display: flex;
      align-items: center;
      gap: 12px;
      mat-icon { color: #16a34a; }
    }
    .invite-meta { font-size: 13px; color: #6b7280; }

    .list h2 {
      margin: 0 0 10px;
      font-size: 15px;
      font-weight: 600;
      color: #334155;
    }

    .invite-card,
    .enterprise-card {
      padding: 16px 18px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      margin-bottom: 10px;
    }

    .invite-card {
      border-left: 4px solid #16a34a;
      background: #f0fdf4;
    }

    .invite-card.open,
    .enterprise-card.open {
      box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);
    }

    .invite-top,
    .enterprise-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      flex-wrap: wrap;
    }

    .invite-identity,
    .enterprise-info {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      flex: 1;
      min-width: 220px;
    }

    .logo {
      width: 48px;
      height: 48px;
      border-radius: 10px;
      background: #ecfdf3;
      color: #16a34a;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .logo-img {
      width: 48px;
      height: 48px;
      border-radius: 10px;
      object-fit: cover;
      flex-shrink: 0;
    }

    .invite-summary h3,
    .enterprise-info h3 {
      margin: 0 0 2px;
      font-size: 16px;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .verified {
      font-size: 18px !important;
      width: 18px !important;
      height: 18px !important;
      color: #2563eb;
    }

    .invite-summary p,
    .enterprise-info p {
      margin: 0;
      font-size: 13px;
      color: #64748b;
    }

    .message {
      margin-top: 6px !important;
      font-style: italic;
      color: #475569 !important;
    }

    .invite-actions,
    .membership-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
    }

    .accept-btn { background: #16a34a !important; color: #fff !important; }

    .invite-details {
      margin-top: 14px;
      padding-top: 14px;
      border-top: 1px solid #dcfce7;
    }

    .enterprise-card .invite-details {
      border-top-color: #e2e8f0;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
    }

    .detail-block {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px;
    }

    .detail-block h4 {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 0 0 8px;
      font-size: 13px;
      color: #334155;
    }

    .detail-block h4 mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #16a34a;
    }

    .detail-block p {
      margin: 0 0 4px;
      font-size: 13px;
      color: #475569;
      line-height: 1.45;
    }

    .detail-block a {
      font-size: 13px;
      color: #16a34a;
      word-break: break-all;
    }

    .empty-detail {
      margin: 0;
      color: #94a3b8;
      font-size: 13px;
    }

    .hint {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      padding: 12px 14px;
      border-radius: 10px;
      background: #f8fafc;
      color: #475569;
      font-size: 13px;
    }

    .hint mat-icon { font-size: 18px; width: 18px; height: 18px; color: #16a34a; }

    .loading { display: flex; justify-content: center; padding: 40px; }

    .list { display: flex; flex-direction: column; gap: 10px; }

    .hired-at {
      display: block;
      margin-top: 2px;
      font-size: 12px;
      color: #94a3b8;
    }

    .active-chip { background: #dcfce7 !important; color: #166534 !important; }
    .inactive-chip { background: #f1f5f9 !important; color: #64748b !important; }

    .empty {
      text-align: center;
      color: #94a3b8;
      padding: 36px 12px;
    }

    @media (max-width: 640px) {
      .page { padding: 16px; }
      .invite-actions { width: 100%; }
      .invite-actions button { flex: 1; }
    }
  `],
})
export class ProviderEnterprisesComponent implements OnInit {
  pendingInvites: EnterpriseInvite[] = [];
  memberships: ProviderEnterpriseMembership[] = [];
  loading = true;
  expandedMembershipId: string | null = null;

  constructor(private enterpriseService: EnterpriseService) {}

  ngOnInit(): void {
    this.load();
  }

  enterpriseOf(item: ProviderEnterpriseMembership): EnterpriseInviteSummary | null {
    return item.enterprise || null;
  }

  roleLabel(role: string): string {
    return ROLE_LABELS[role] || role;
  }

  toggleMembershipDetails(m: ProviderEnterpriseMembership): void {
    this.expandedMembershipId = this.expandedMembershipId === m.id ? null : m.id;
  }

  load(): void {
    this.loading = true;
    this.enterpriseService.getMyEnterpriseInvites('pending').subscribe({
      next: (invites) => {
        this.pendingInvites = invites || [];
      },
    });
    this.enterpriseService.getMyEnterprises().subscribe({
      next: (memberships) => {
        this.memberships = memberships;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }
}
