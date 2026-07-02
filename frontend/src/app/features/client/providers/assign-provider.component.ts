import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
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
    MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule,
    MatProgressSpinnerModule, MatDialogModule, MatChipsModule, MatCardModule,
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
        <a mat-stroked-button routerLink="/client/solicitations">
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
            <mat-form-field appearance="outline" class="search-field">
              <mat-label>Rechercher par nom, ville ou compétence</mat-label>
              <mat-icon matPrefix>search</mat-icon>
              <input matInput [(ngModel)]="providerFilter" (ngModelChange)="applyProviderFilter()" />
            </mat-form-field>

            <div class="loading" *ngIf="loadingProviders">
              <mat-spinner diameter="40"></mat-spinner>
              <span>Chargement des prestataires…</span>
            </div>

            <div class="list" *ngIf="!loadingProviders">
              <mat-card class="item-card" *ngFor="let p of filteredProviders; let i = index">
                <div class="card-top">
                  <div class="avatar-wrap" [style.background]="gradient(i)">
                    <img *ngIf="p.profile_picture" [src]="p.profile_picture" [alt]="name(p)" />
                    <span *ngIf="!p.profile_picture">{{ initial(p) }}</span>
                  </div>
                  <div class="info">
                    <h3>
                      {{ name(p) }}
                      <mat-icon class="verified" *ngIf="p.identity_verified" title="Identité vérifiée">verified</mat-icon>
                    </h3>
                    <p class="meta">⭐ {{ rating(p) }} · {{ p.completed_missions }} missions · {{ levelLabel(p.level) }}</p>
                    <p class="city" *ngIf="p.city"><mat-icon>location_on</mat-icon> {{ p.city }}</p>
                    <mat-chip-set *ngIf="p.skills?.length">
                      <mat-chip *ngFor="let skill of p.skills.slice(0, 3)">{{ skill }}</mat-chip>
                    </mat-chip-set>
                  </div>
                </div>
                <div class="card-actions">
                  <button mat-button (click)="openProviderProfile(p, i)">
                    <mat-icon>person</mat-icon> Voir profil
                  </button>
                  <button mat-raised-button color="primary" (click)="assignToProvider(p)">
                    <mat-icon>send</mat-icon> Attribuer une mission
                  </button>
                </div>
              </mat-card>

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
            <mat-form-field appearance="outline" class="search-field">
              <mat-label>Rechercher par nom ou ville</mat-label>
              <mat-icon matPrefix>search</mat-icon>
              <input matInput [(ngModel)]="enterpriseFilter" (ngModelChange)="applyEnterpriseFilter()" />
            </mat-form-field>

            <div class="loading" *ngIf="loadingEnterprises">
              <mat-spinner diameter="40"></mat-spinner>
              <span>Chargement des entreprises…</span>
            </div>

            <div class="list" *ngIf="!loadingEnterprises">
              <mat-card class="item-card enterprise-card" *ngFor="let e of filteredEnterprises">
                <div class="card-top">
                  <div class="logo-wrap">
                    <img *ngIf="e.logo" [src]="e.logo" [alt]="enterpriseName(e)" />
                    <mat-icon *ngIf="!e.logo">business</mat-icon>
                  </div>
                  <div class="info">
                    <h3>
                      {{ enterpriseName(e) }}
                      <mat-icon class="verified enterprise" *ngIf="e.is_verified" title="Entreprise vérifiée">verified</mat-icon>
                    </h3>
                    <p class="meta">
                      <span *ngIf="e.total_missions_posted">{{ e.total_missions_posted }} mission{{ e.total_missions_posted > 1 ? 's' : '' }}</span>
                      <span *ngIf="e.total_missions_posted && e.total_employees"> · </span>
                      <span *ngIf="e.total_employees">{{ e.total_employees }} employé{{ e.total_employees > 1 ? 's' : '' }}</span>
                      <span *ngIf="!e.total_missions_posted && !e.total_employees">Partenaire BlockTask</span>
                    </p>
                    <p class="city"><mat-icon>location_on</mat-icon> {{ enterpriseCity(e) }}</p>
                  </div>
                </div>
                <div class="card-actions">
                  <button mat-button (click)="openEnterpriseProfile(e)">
                    <mat-icon>business</mat-icon> Voir profil
                  </button>
                  <button mat-raised-button class="enterprise-btn" (click)="assignToEnterprise(e)">
                    <mat-icon>send</mat-icon> Solliciter
                  </button>
                </div>
              </mat-card>

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
      max-width: 960px;
      margin: 0 auto;
      padding: 24px;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 24px;
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
      max-width: 560px;
    }

    .assign-tabs ::ng-deep .mat-mdc-tab-labels {
      margin-bottom: 8px;
    }

    .assign-tabs ::ng-deep .mat-mdc-tab .mdc-tab__text-label {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .tab-count {
      font-size: 11px;
      font-weight: 600;
      background: #e2e8f0;
      color: #475569;
      padding: 1px 7px;
      border-radius: 10px;
      margin-left: 2px;
    }

    .tab-panel {
      padding-top: 8px;
    }

    .search-field {
      width: 100%;
      margin-bottom: 20px;
    }

    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 48px;
      color: #64748b;
    }

    .list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .item-card {
      padding: 20px;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
    }

    .card-top {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
    }

    .avatar-wrap, .logo-wrap {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .logo-wrap {
      border-radius: 14px;
      background: #ede9fe;
      color: #7c3aed;
    }

    .logo-wrap mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .logo-wrap img, .avatar-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .avatar-wrap {
      color: white;
      font-weight: 700;
      font-size: 20px;
    }

    .info h3 {
      margin: 0 0 4px;
      font-size: 18px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .verified {
      color: #3CB371;
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .verified.enterprise {
      color: #7c3aed;
    }

    .meta, .city {
      margin: 0 0 6px;
      font-size: 13px;
      color: #64748b;
    }

    .city {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .city mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .card-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      flex-wrap: wrap;
      border-top: 1px solid #f1f5f9;
      padding-top: 14px;
    }

    .enterprise-btn {
      background: #7c3aed !important;
      color: white !important;
    }

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

    .mission-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      margin-bottom: 16px;
      border-radius: 10px;
      background: #ecfdf3;
      color: #065f46;
      font-size: 14px;
      border: 1px solid #bbf7d0;
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
