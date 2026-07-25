import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  EnterpriseService,
  ProviderEnterpriseDetail,
  ProviderEnterpriseMission,
} from '../../../core/services/enterprise.service';

const ROLE_LABELS: Record<string, string> = {
  agent: 'Agent terrain',
  manager: 'Manager',
  admin: 'Administrateur',
  hr: 'Ressources humaines',
  accountant: 'Comptable',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  pending: 'En attente',
  funded: 'Financée',
  accepted: 'Acceptée',
  in_progress: 'En cours',
  submitted: 'Preuves soumises',
  completed: 'Terminée',
  cancelled: 'Annulée',
  disputed: 'En litige',
  expired: 'Expirée',
};

type MissionFilter = 'all' | 'in_progress' | 'completed' | 'other';

@Component({
  selector: 'app-provider-enterprise-detail',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatSnackBarModule,
  ],
  template: `
    <div class="page">
      <a class="back" routerLink="/provider/enterprises">
        <mat-icon>arrow_back</mat-icon> Mes entreprises
      </a>

      <div class="loading" *ngIf="loading"><mat-spinner diameter="40"></mat-spinner></div>

      <ng-container *ngIf="!loading && detail as d">
        <header class="hero">
          <div class="avatar" *ngIf="!logoOk">{{ initials(d.membership.enterprise_name) }}</div>
          <img *ngIf="logoOk"
            class="avatar-img"
            [src]="d.membership.enterprise!.logo!"
            [alt]="d.membership.enterprise_name"
            (error)="logoBroken = true" />
          <div class="hero-text">
            <div class="badges">
              <span class="badge" [class.on]="d.membership.is_active">
                {{ d.membership.is_active ? 'Actif' : 'Inactif' }}
              </span>
              <span class="badge muted" *ngIf="d.membership.enterprise?.is_verified">Vérifiée</span>
            </div>
            <h1>{{ d.membership.enterprise_name }}</h1>
            <p class="role">
              {{ d.membership.position || roleLabel(d.membership.role) }}
              <span *ngIf="d.membership.position"> · {{ roleLabel(d.membership.role) }}</span>
            </p>
            <p class="meta" *ngIf="d.membership.hired_at">
              Membre depuis {{ d.membership.hired_at | date:'mediumDate' }}
            </p>
          </div>
        </header>

        <div class="stats">
          <div class="stat">
            <strong>{{ d.stats.teams_count }}</strong>
            <span>Équipe(s)</span>
          </div>
          <div class="stat">
            <strong>{{ d.stats.missions_in_progress }}</strong>
            <span>En cours</span>
          </div>
          <div class="stat">
            <strong>{{ d.stats.missions_completed }}</strong>
            <span>Terminées</span>
          </div>
          <div class="stat">
            <strong>{{ d.stats.missions_total }}</strong>
            <span>Missions</span>
          </div>
        </div>

        <section class="section" *ngIf="ent as e">
          <h2><mat-icon>info</mat-icon> Entreprise</h2>
          <div class="info-grid">
            <div class="info-block" *ngIf="e.description">
              <h3>Présentation</h3>
              <p>{{ e.description }}</p>
            </div>
            <div class="info-block">
              <h3>Localisation</h3>
              <p *ngIf="e.address">{{ e.address }}</p>
              <p>{{ e.city }}{{ e.country ? ', ' + e.country : '' }}</p>
            </div>
            <div class="info-block">
              <h3>Contact</h3>
              <p *ngIf="e.company_phone">Tél. {{ e.company_phone }}</p>
              <p *ngIf="e.company_email">{{ e.company_email }}</p>
              <a *ngIf="e.website" [href]="e.website" target="_blank" rel="noopener">{{ e.website }}</a>
            </div>
            <div class="info-block">
              <h3>Mon poste</h3>
              <p><strong>{{ d.membership.position || '—' }}</strong></p>
              <p>Rôle : {{ roleLabel(d.membership.role) }}</p>
            </div>
          </div>
        </section>

        <section class="section">
          <h2><mat-icon>groups</mat-icon> Mes équipes</h2>
          <div class="cards" *ngIf="d.teams.length; else noTeams">
            <article class="item-card" *ngFor="let t of d.teams">
              <div class="item-top">
                <h3>{{ t.name }}</h3>
                <div class="badges">
                  <span class="badge chef" *ngIf="t.is_manager">Chef</span>
                  <span class="badge muted" *ngIf="t.category">{{ t.category }}</span>
                  <span class="badge" [class.on]="t.is_active">{{ t.is_active ? 'Active' : 'Inactive' }}</span>
                </div>
              </div>
              <p *ngIf="t.description">{{ t.description }}</p>
              <p class="meta">
                {{ t.members_count || 0 }} membre(s)
                <span *ngIf="t.manager_name"> · Chef : {{ t.manager_name }}</span>
              </p>
            </article>
          </div>
          <ng-template #noTeams>
            <p class="empty-inline">Vous ne faites partie d’aucune équipe pour le moment.</p>
          </ng-template>
        </section>

        <section class="section">
          <div class="section-head">
            <h2><mat-icon>assignment</mat-icon> Mes missions</h2>
            <div class="filters">
              <button type="button" [class.active]="missionFilter === 'all'" (click)="missionFilter = 'all'">Toutes</button>
              <button type="button" [class.active]="missionFilter === 'in_progress'" (click)="missionFilter = 'in_progress'">En cours</button>
              <button type="button" [class.active]="missionFilter === 'completed'" (click)="missionFilter = 'completed'">Terminées</button>
              <button type="button" [class.active]="missionFilter === 'other'" (click)="missionFilter = 'other'">Autres</button>
            </div>
          </div>

          <div class="cards" *ngIf="filteredMissions.length; else noMissions">
            <a class="item-card link"
              *ngFor="let m of filteredMissions"
              [routerLink]="['/provider/missions', m.id]">
              <div class="item-top">
                <h3>{{ m.title }}</h3>
                <div class="badges">
                  <span class="badge" [ngClass]="m.bucket">{{ statusLabel(m.status) }}</span>
                  <span class="badge chef" *ngIf="m.is_lead">Chef mission</span>
                </div>
              </div>
              <p class="meta">
                <span *ngIf="m.category">{{ m.category }} · </span>
                <span *ngIf="m.budget">{{ m.budget }} {{ m.currency || 'XOF' }}</span>
              </p>
              <p class="meta" *ngIf="m.location">{{ m.location }}</p>
              <p class="meta">
                <span *ngIf="m.assigned_at">Affectée {{ m.assigned_at | date:'mediumDate' }}</span>
                <span *ngIf="m.deadline"> · échéance {{ m.deadline | date:'mediumDate' }}</span>
              </p>
            </a>
          </div>
          <ng-template #noMissions>
            <p class="empty-inline">Aucune mission dans ce filtre.</p>
          </ng-template>
        </section>
      </ng-container>
    </div>
  `,
  styles: [`
    .page { max-width: 920px; margin: 0 auto; padding: 24px; padding-bottom: 56px; }
    .back {
      display: inline-flex; align-items: center; gap: 4px; color: #64748b; text-decoration: none;
      font-size: 13px; font-weight: 600; margin-bottom: 16px;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      &:hover { color: #16a34a; }
    }
    .loading { display: flex; justify-content: center; padding: 48px; }

    .hero {
      display: flex; gap: 16px; align-items: flex-start; flex-wrap: wrap;
      padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;
      background: linear-gradient(180deg, #f0fdf4 0%, #fff 55%);
      margin-bottom: 16px;
    }
    .avatar, .avatar-img { width: 64px; height: 64px; border-radius: 14px; flex-shrink: 0; }
    .avatar {
      background: #16a34a; color: #fff; font-weight: 700; font-size: 18px;
      display: flex; align-items: center; justify-content: center;
    }
    .avatar-img { object-fit: cover; border: 1px solid #e2e8f0; }
    .hero-text { flex: 1; min-width: 200px; }
    h1 { margin: 0 0 4px; font-size: 24px; color: #0f172a; }
    .role { margin: 0; font-size: 14px; color: #334155; font-weight: 600;
      span { font-weight: 500; color: #64748b; }
    }
    .meta { margin: 4px 0 0; font-size: 12px; color: #94a3b8; }

    .stats {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px;
    }
    .stat {
      background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px;
      text-align: center;
      strong { display: block; font-size: 22px; color: #0f172a; }
      span { font-size: 12px; color: #64748b; }
    }

    .section { margin-bottom: 24px; }
    .section-head {
      display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; align-items: center;
      margin-bottom: 10px;
      h2 { margin: 0; }
    }
    h2 {
      display: flex; align-items: center; gap: 8px; margin: 0 0 12px;
      font-size: 16px; color: #0f172a;
      mat-icon { color: #16a34a; }
    }
    .filters { display: flex; flex-wrap: wrap; gap: 6px; }
    .filters button {
      border: 1px solid #e2e8f0; background: #fff; color: #64748b;
      border-radius: 999px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer;
      &.active { background: #ecfdf5; border-color: #86efac; color: #166534; }
    }

    .info-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;
    }
    .info-block {
      background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px;
      h3 { margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: #94a3b8; }
      p { margin: 0 0 4px; font-size: 13px; color: #475569; line-height: 1.45; }
      a { font-size: 13px; color: #16a34a; word-break: break-all; }
    }

    .cards { display: flex; flex-direction: column; gap: 10px; }
    .item-card {
      background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px;
      &.link { text-decoration: none; color: inherit; display: block; transition: border-color .15s;
        &:hover { border-color: #86efac; }
      }
      h3 { margin: 0; font-size: 15px; color: #0f172a; }
      p { margin: 6px 0 0; font-size: 13px; color: #64748b; }
    }
    .item-top {
      display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; align-items: flex-start;
    }
    .badges { display: flex; flex-wrap: wrap; gap: 6px; }
    .badge {
      font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 999px;
      background: #f1f5f9; color: #64748b;
      &.on, &.in_progress { background: #dcfce7; color: #166534; }
      &.completed { background: #e0f2fe; color: #075985; }
      &.cancelled, &.disputed { background: #fee2e2; color: #991b1b; }
      &.muted { background: #eef2ff; color: #3730a3; }
      &.chef { background: #fef3c7; color: #92400e; }
      &.other { background: #f1f5f9; color: #64748b; }
    }
    .empty-inline { color: #94a3b8; font-size: 14px; margin: 0; padding: 12px 0; }

    @media (max-width: 640px) {
      .page { padding: 16px; }
      .stats { grid-template-columns: repeat(2, 1fr); }
      h1 { font-size: 20px; }
    }
  `],
})
export class ProviderEnterpriseDetailComponent implements OnInit {
  detail: ProviderEnterpriseDetail | null = null;
  loading = true;
  logoBroken = false;
  missionFilter: MissionFilter = 'all';

  constructor(
    private route: ActivatedRoute,
    private enterpriseService: EnterpriseService,
    private snack: MatSnackBar,
  ) {}

  get ent() {
    return this.detail?.membership?.enterprise || null;
  }

  get logoOk(): boolean {
    return !!(this.detail?.membership?.enterprise?.logo && !this.logoBroken);
  }

  get filteredMissions(): ProviderEnterpriseMission[] {
    const list = this.detail?.missions || [];
    if (this.missionFilter === 'all') return list;
    if (this.missionFilter === 'other') {
      return list.filter((m) => !['in_progress', 'completed'].includes(m.bucket));
    }
    return list.filter((m) => m.bucket === this.missionFilter);
  }

  ngOnInit(): void {
    const id = (this.route.snapshot.paramMap.get('id') || '').trim();
    if (!id || id === 'undefined' || id === 'null') {
      this.loading = false;
      this.snack.open('Identifiant entreprise invalide', 'Fermer', { duration: 3500 });
      return;
    }
    this.enterpriseService.getMyEnterpriseDetail(id).subscribe({
      next: (detail) => {
        this.detail = detail;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.snack.open(err.error?.error || 'Entreprise introuvable', 'Fermer', { duration: 3500 });
      },
    });
  }

  initials(name: string): string {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'E';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  roleLabel(role: string): string {
    return ROLE_LABELS[role] || role;
  }

  statusLabel(status: string): string {
    return STATUS_LABELS[status] || status;
  }
}
