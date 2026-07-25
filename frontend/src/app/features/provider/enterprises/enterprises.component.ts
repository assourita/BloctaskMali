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
    MatSnackBarModule,
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1><mat-icon>business</mat-icon> Mes entreprises</h1>
          <p>Consultez les invitations et le profil des entreprises avant d'accepter.</p>
        </div>
        <a mat-stroked-button routerLink="/provider/missions">
          <mat-icon>assignment</mat-icon> Mes missions
        </a>
      </div>

      <section *ngIf="pendingInvites.length" class="invites-section">
        <h2>Invitations en attente ({{ pendingInvites.length }})</h2>

        <mat-card *ngFor="let inv of pendingInvites" class="invite-card" [class.open]="expandedInviteId === inv.id">
          <div class="invite-top">
            <div class="invite-identity">
              <div class="logo" *ngIf="!enterpriseOf(inv)?.logo"><mat-icon>domain</mat-icon></div>
              <img *ngIf="enterpriseOf(inv)?.logo" class="logo-img" [src]="enterpriseOf(inv)?.logo!" [alt]="inv.enterprise_name" />
              <div class="invite-summary">
                <h3>
                  {{ inv.enterprise_name }}
                  <mat-icon class="verified" *ngIf="enterpriseOf(inv)?.is_verified" title="Vérifiée">verified</mat-icon>
                </h3>
                <p>
                  {{ roleLabel(inv.role) }}
                  <span *ngIf="inv.position"> · {{ inv.position }}</span>
                  <span *ngIf="enterpriseOf(inv)?.city"> · {{ enterpriseOf(inv)?.city }}</span>
                </p>
                <p class="message" *ngIf="inv.message">« {{ inv.message }} »</p>
              </div>
            </div>
            <div class="invite-actions">
              <button mat-stroked-button (click)="toggleInviteDetails(inv)">
                <mat-icon>{{ expandedInviteId === inv.id ? 'expand_less' : 'info' }}</mat-icon>
                {{ expandedInviteId === inv.id ? 'Masquer' : 'Voir le profil' }}
              </button>
              <button mat-raised-button class="accept-btn" (click)="acceptInvite(inv)" [disabled]="actionId === inv.id">
                Accepter
              </button>
              <button mat-stroked-button color="warn" (click)="rejectInvite(inv)" [disabled]="actionId === inv.id">
                Refuser
              </button>
            </div>
          </div>

          <div class="invite-details" *ngIf="expandedInviteId === inv.id">
            <ng-container *ngIf="enterpriseOf(inv) as ent; else noProfile">
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
                  <p *ngIf="!ent.company_phone && !ent.company_email && !ent.website">Non renseigné</p>
                </div>
                <div class="detail-block">
                  <h4><mat-icon>insights</mat-icon> Activité</h4>
                  <p>Réputation : {{ ent.reputation_score | number:'1.0-0' }}/100</p>
                  <p>{{ ent.total_employees || 0 }} employé(s) · {{ ent.total_missions_posted || 0 }} mission(s)</p>
                  <p *ngIf="ent.member_since">Membre depuis {{ ent.member_since | date:'mediumDate' }}</p>
                </div>
                <div class="detail-block">
                  <h4><mat-icon>mail_outline</mat-icon> Invitation</h4>
                  <p>Poste proposé : {{ inv.position || roleLabel(inv.role) }}</p>
                  <p *ngIf="inv.invited_by_name">Invité par {{ inv.invited_by_name }}</p>
                  <p *ngIf="inv.created_at">Reçue le {{ inv.created_at | date:'short' }}</p>
                  <p *ngIf="inv.expires_at">Expire le {{ inv.expires_at | date:'short' }}</p>
                </div>
              </div>
            </ng-container>
            <ng-template #noProfile>
              <p class="empty-detail">Profil entreprise indisponible pour le moment.</p>
            </ng-template>
          </div>
        </mat-card>
      </section>

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

    .invites-section h2,
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
  actionId: string | null = null;
  expandedInviteId: string | null = null;
  expandedMembershipId: string | null = null;

  constructor(
    private enterpriseService: EnterpriseService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  enterpriseOf(item: EnterpriseInvite | ProviderEnterpriseMembership): EnterpriseInviteSummary | null {
    return item.enterprise || null;
  }

  roleLabel(role: string): string {
    return ROLE_LABELS[role] || role;
  }

  toggleInviteDetails(inv: EnterpriseInvite): void {
    this.expandedInviteId = this.expandedInviteId === inv.id ? null : inv.id;
  }

  toggleMembershipDetails(m: ProviderEnterpriseMembership): void {
    this.expandedMembershipId = this.expandedMembershipId === m.id ? null : m.id;
  }

  load(): void {
    this.loading = true;
    this.enterpriseService.getMyEnterpriseInvites().subscribe({
      next: (invites) => {
        this.pendingInvites = invites.filter((i) => i.status === 'pending');
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

  acceptInvite(inv: EnterpriseInvite): void {
    this.actionId = inv.id;
    this.enterpriseService.acceptEnterpriseInvite(inv.id).subscribe({
      next: () => {
        this.actionId = null;
        this.expandedInviteId = null;
        this.snackBar.open(`Vous avez rejoint ${inv.enterprise_name}`, 'Fermer', { duration: 4000 });
        this.load();
      },
      error: (err) => {
        this.actionId = null;
        this.snackBar.open(err.error?.detail || err.error?.error || 'Erreur acceptation', 'Fermer', { duration: 4000 });
      },
    });
  }

  rejectInvite(inv: EnterpriseInvite): void {
    this.actionId = inv.id;
    this.enterpriseService.rejectEnterpriseInvite(inv.id).subscribe({
      next: () => {
        this.actionId = null;
        this.expandedInviteId = null;
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
