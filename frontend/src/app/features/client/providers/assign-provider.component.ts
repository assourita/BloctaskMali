import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';

import {
  LandingService,
  LandingProvider,
  LandingEnterprise,
} from '../../../core/services/landing.service';
import {
  ProviderProfileDialogComponent,
  ProviderProfileDialogData,
} from '../../landing/provider-profile-dialog/provider-profile-dialog.component';
import {
  EnterpriseProfileDialogComponent,
  EnterpriseProfileDialogData,
} from '../../landing/enterprise-profile-dialog/enterprise-profile-dialog.component';
import { AssignMissionDialogComponent } from '../../landing/assign-mission-dialog/assign-mission-dialog.component';

@Component({
  selector: 'app-client-assign-provider',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatDialogModule,
    MatTabsModule,
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1><mat-icon>assignment_ind</mat-icon> Attribuer une mission</h1>
          <p>
            Parcourez les prestataires ou les entreprises partenaires et confiez-leur
            directement une de vos missions financées.
          </p>
        </div>
        <a mat-stroked-button [routerLink]="solicitationsLink">
          <mat-icon>send</mat-icon> Sollicitations envoyées
        </a>
      </div>

      <div class="mission-banner" *ngIf="preselectedMissionId">
        <mat-icon>info</mat-icon>
        <span>Mission sélectionnée depuis le détail — choisissez un prestataire ou une entreprise ci-dessous.</span>
      </div>

      <mat-tab-group
        [(selectedIndex)]="activeTab"
        (selectedIndexChange)="onTabChange()"
        class="assign-tabs"
        animationDuration="200ms">
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>person</mat-icon>
            Prestataires
            <span class="tab-count" *ngIf="!loadingProviders">{{ providers.length }}</span>
          </ng-template>

          <div class="tab-panel">
            <div class="search-bar">
              <mat-icon>search</mat-icon>
              <input
                type="search"
                placeholder="Rechercher par nom, ville ou compétence"
                [(ngModel)]="providerFilter"
                (ngModelChange)="applyProviderFilter()"
              />
            </div>

            <div class="loading" *ngIf="loadingProviders">
              <mat-spinner diameter="36"></mat-spinner>
              <span>Chargement des prestataires…</span>
            </div>

            <div class="list" *ngIf="!loadingProviders">
              <div class="row" *ngFor="let p of filteredProviders; let i = index">
                <div class="avatar" [style.background]="gradient(i)">
                  <img *ngIf="p.profile_picture" [src]="p.profile_picture" [alt]="name(p)" />
                  <span *ngIf="!p.profile_picture">{{ initial(p) }}</span>
                </div>
                <div class="body">
                  <div class="title-line">
                    <span class="name">{{ name(p) }}</span>
                    <mat-icon class="verified" *ngIf="p.identity_verified" title="Identité vérifiée">verified</mat-icon>
                    <span class="city" *ngIf="p.city">· {{ p.city }}</span>
                  </div>
                  <div class="meta-line">
                    <mat-icon class="star">star</mat-icon>
                    <span>{{ rating(p) }}</span>
                    <span class="dot">·</span>
                    <span>{{ p.completed_missions }} missions</span>
                    <span class="dot">·</span>
                    <span>{{ levelLabel(p.level) }}</span>
                    <ng-container *ngIf="p.skills?.length">
                      <span class="dot">·</span>
                      <span class="skills">{{ p.skills.slice(0, 3).join(', ') }}</span>
                    </ng-container>
                  </div>
                </div>
                <div class="actions">
                  <button type="button" class="btn-ghost" (click)="openProviderProfile(p, i)">Profil</button>
                  <button type="button" class="btn-primary" (click)="assignToProvider(p)">Attribuer</button>
                </div>
              </div>

              <div class="empty" *ngIf="!filteredProviders.length">
                <mat-icon>person_search</mat-icon>
                <p>Aucun prestataire ne correspond à votre recherche.</p>
              </div>
            </div>
          </div>
        </mat-tab>

        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>business</mat-icon>
            Entreprises
            <span class="tab-count" *ngIf="!loadingEnterprises">{{ enterprises.length }}</span>
          </ng-template>

          <div class="tab-panel">
            <div class="search-bar">
              <mat-icon>search</mat-icon>
              <input
                type="search"
                placeholder="Rechercher par nom ou ville"
                [(ngModel)]="enterpriseFilter"
                (ngModelChange)="applyEnterpriseFilter()"
              />
            </div>

            <div class="loading" *ngIf="loadingEnterprises">
              <mat-spinner diameter="36"></mat-spinner>
              <span>Chargement des entreprises…</span>
            </div>

            <div class="list" *ngIf="!loadingEnterprises">
              <div class="row" *ngFor="let e of filteredEnterprises">
                <div class="avatar logo">
                  <img *ngIf="e.logo" [src]="e.logo" [alt]="enterpriseName(e)" />
                  <mat-icon *ngIf="!e.logo">business</mat-icon>
                </div>
                <div class="body">
                  <div class="title-line">
                    <span class="name">{{ enterpriseName(e) }}</span>
                    <mat-icon class="verified" *ngIf="e.is_verified" title="Entreprise vérifiée">verified</mat-icon>
                    <span class="city">· {{ enterpriseCity(e) }}</span>
                  </div>
                  <div class="meta-line">
                    <ng-container *ngIf="e.total_missions_posted || e.total_employees; else partner">
                      <span *ngIf="e.total_missions_posted">{{ e.total_missions_posted }} mission{{ e.total_missions_posted > 1 ? 's' : '' }}</span>
                      <span class="dot" *ngIf="e.total_missions_posted && e.total_employees">·</span>
                      <span *ngIf="e.total_employees">{{ e.total_employees }} employé{{ e.total_employees > 1 ? 's' : '' }}</span>
                    </ng-container>
                    <ng-template #partner>Partenaire BlockTask</ng-template>
                  </div>
                </div>
                <div class="actions">
                  <button type="button" class="btn-ghost" (click)="openEnterpriseProfile(e)">Profil</button>
                  <button type="button" class="btn-primary" (click)="assignToEnterprise(e)">Solliciter</button>
                </div>
              </div>

              <div class="empty" *ngIf="!filteredEnterprises.length">
                <mat-icon>business_center</mat-icon>
                <p>Aucune entreprise ne correspond à votre recherche.</p>
              </div>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .page {
      max-width: 920px;
      margin: 0 auto;
      padding: 20px 20px 40px;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 16px;
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
      max-width: 520px;
      line-height: 1.45;
    }

    .assign-tabs ::ng-deep .mat-mdc-tab .mdc-tab__text-label {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .tab-count {
      font-size: 11px;
      font-weight: 700;
      background: #e2e8f0;
      color: #475569;
      padding: 1px 7px;
      border-radius: 999px;
    }

    .tab-panel {
      padding-top: 12px;
    }

    .search-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      height: 42px;
      padding: 0 12px;
      margin-bottom: 12px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      background: #fff;
    }

    .search-bar mat-icon {
      color: #94a3b8;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .search-bar input {
      flex: 1;
      border: 0;
      outline: none;
      background: transparent;
      font-size: 14px;
      color: #0f172a;
    }

    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding: 40px;
      color: #64748b;
      font-size: 14px;
    }

    .list {
      display: flex;
      flex-direction: column;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      background: #fff;
    }

    .row {
      display: grid;
      grid-template-columns: 40px minmax(0, 1fr) auto;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-bottom: 1px solid #f1f5f9;
      min-height: 56px;
    }

    .row:last-child {
      border-bottom: 0;
    }

    .row:hover {
      background: #f8fafc;
    }

    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      color: #fff;
      font-weight: 700;
      font-size: 13px;
      flex-shrink: 0;
    }

    .avatar.logo {
      border-radius: 10px;
      background: #ecfdf3;
      color: #16a34a;
    }

    .avatar.logo mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .body {
      min-width: 0;
    }

    .title-line {
      display: flex;
      align-items: center;
      gap: 4px;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .name {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
    }

    .verified {
      color: #16a34a;
      font-size: 15px !important;
      width: 15px !important;
      height: 15px !important;
      flex-shrink: 0;
    }

    .city {
      color: #64748b;
      font-size: 13px;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .meta-line {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 2px;
      font-size: 12px;
      color: #64748b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .star {
      color: #f59e0b;
      font-size: 13px !important;
      width: 13px !important;
      height: 13px !important;
    }

    .dot {
      color: #cbd5e1;
    }

    .skills {
      text-transform: capitalize;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .btn-ghost,
    .btn-primary {
      height: 32px;
      padding: 0 12px;
      border-radius: 8px;
      border: 0;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }

    .btn-ghost {
      background: transparent;
      color: #475569;
    }

    .btn-ghost:hover {
      background: #f1f5f9;
    }

    .btn-primary {
      background: #16a34a;
      color: #fff;
    }

    .btn-primary:hover {
      background: #15803d;
    }

    .empty {
      text-align: center;
      padding: 36px 16px;
      color: #94a3b8;
      border: 0;
    }

    .empty mat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      margin-bottom: 6px;
    }

    .mission-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      margin-bottom: 12px;
      border-radius: 10px;
      background: #ecfdf3;
      color: #065f46;
      font-size: 13px;
      border: 1px solid #bbf7d0;
    }

    @media (max-width: 640px) {
      .row {
        grid-template-columns: 40px minmax(0, 1fr);
        grid-template-rows: auto auto;
      }

      .actions {
        grid-column: 1 / -1;
        justify-content: flex-end;
        padding-top: 2px;
      }
    }
  `]
})
export class ClientAssignProviderComponent implements OnInit {
  activeTab = 0;
  preselectedMissionId = '';

  providers: LandingProvider[] = [];
  filteredProviders: LandingProvider[] = [];
  loadingProviders = true;
  providerFilter = '';

  enterprises: LandingEnterprise[] = [];
  filteredEnterprises: LandingEnterprise[] = [];
  loadingEnterprises = true;
  enterpriseFilter = '';
  enterprisesLoaded = false;

  private readonly gradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  ];

  constructor(
    private landingService: LandingService,
    private dialog: MatDialog,
    private route: ActivatedRoute,
  ) {}

  get isEnterpriseContext(): boolean {
    return !!this.route.snapshot.data['enterpriseContext'];
  }

  get solicitationsLink(): string {
    return this.isEnterpriseContext ? '/enterprise/solicitations/sent' : '/client/solicitations';
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.preselectedMissionId = params['missionId'] || '';
    });
    this.loadProviders();
  }

  onTabChange(): void {
    if (this.activeTab === 1 && !this.enterprisesLoaded) {
      this.loadEnterprises();
    }
  }

  private loadProviders(): void {
    this.landingService.getAllProviders().subscribe({
      next: (list) => {
        this.providers = list;
        this.filteredProviders = list;
        this.loadingProviders = false;
      },
      error: () => {
        this.loadingProviders = false;
      },
    });
  }

  private loadEnterprises(): void {
    this.landingService.getAllEnterprises().subscribe({
      next: (list) => {
        this.enterprises = list.filter(e => this.enterpriseName(e));
        this.filteredEnterprises = this.enterprises;
        this.loadingEnterprises = false;
        this.enterprisesLoaded = true;
      },
      error: () => {
        this.loadingEnterprises = false;
      },
    });
  }

  applyProviderFilter(): void {
    const q = this.providerFilter.trim().toLowerCase();
    if (!q) {
      this.filteredProviders = this.providers;
      return;
    }
    this.filteredProviders = this.providers.filter((p) => {
      const full = `${p.first_name} ${p.last_name} ${p.city}`.toLowerCase();
      return full.includes(q) || p.skills.some((s) => s.toLowerCase().includes(q));
    });
  }

  applyEnterpriseFilter(): void {
    const q = this.enterpriseFilter.trim().toLowerCase();
    if (!q) {
      this.filteredEnterprises = this.enterprises;
      return;
    }
    this.filteredEnterprises = this.enterprises.filter(e =>
      `${e.company_name} ${e.city}`.toLowerCase().includes(q)
    );
  }

  name(p: LandingProvider): string {
    const initial = p.last_name ? ` ${p.last_name.charAt(0)}.` : '';
    return `${p.first_name}${initial}`.trim();
  }

  initial(p: LandingProvider): string {
    return `${p.first_name?.[0] || ''}${p.last_name?.[0] || ''}`.toUpperCase();
  }

  rating(p: LandingProvider): string {
    if (p.avg_rating) return p.avg_rating.toFixed(1);
    return (p.reputation_score / 20).toFixed(1);
  }

  levelLabel(level: string): string {
    const labels: Record<string, string> = {
      bronze: 'Bronze', silver: 'Argent', gold: 'Or', platinum: 'Platine',
    };
    return labels[level] || level;
  }

  enterpriseName(e: LandingEnterprise): string {
    return (e.company_name || '').trim();
  }

  enterpriseCity(e: LandingEnterprise): string {
    return (e.city || '').trim() || 'Mali';
  }

  gradient(i: number): string {
    return this.gradients[i % this.gradients.length];
  }

  openProviderProfile(provider: LandingProvider, index: number): void {
    this.dialog.open(ProviderProfileDialogComponent, {
      data: {
        provider,
        gradient: this.gradient(index),
      } as ProviderProfileDialogData,
      panelClass: 'landing-provider-profile-dialog',
      maxWidth: '95vw',
      width: '520px',
    });
  }

  openEnterpriseProfile(ent: LandingEnterprise): void {
    this.dialog.open(EnterpriseProfileDialogComponent, {
      data: { enterprise: ent } as EnterpriseProfileDialogData,
      width: '560px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      autoFocus: false,
      panelClass: 'landing-enterprise-dialog',
    });
  }

  assignToProvider(provider: LandingProvider): void {
    this.dialog.open(AssignMissionDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
      data: {
        provider,
        providerName: this.name(provider),
        preselectedMissionId: this.preselectedMissionId || undefined,
      },
    });
  }

  assignToEnterprise(ent: LandingEnterprise): void {
    this.dialog.open(AssignMissionDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
      data: {
        enterprise: ent,
        enterpriseName: this.enterpriseName(ent),
        preselectedMissionId: this.preselectedMissionId || undefined,
      },
    });
  }
}
