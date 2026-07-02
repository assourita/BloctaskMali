import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProviderProfileService, PublicProviderProfile } from '../../../core/services/provider-profile.service';

@Component({
  selector: 'app-provider-public-profile',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatProgressSpinnerModule,
  ],
  template: `
    <div class="page" *ngIf="!loading && profile; else stateTpl">
      <button mat-button class="back-btn" (click)="goBack()">
        <mat-icon>arrow_back</mat-icon> Retour
      </button>

      <div class="hero" [style.background]="gradient">
        <div class="hero-content">
          <div class="avatar" *ngIf="!profile.profile_picture">{{ initials }}</div>
          <img *ngIf="profile.profile_picture" [src]="profile.profile_picture" class="avatar-img" [alt]="displayName" />
          <div>
            <h1>
              {{ displayName }}
              <mat-icon class="verified" *ngIf="profile.identity_verified" title="Identité vérifiée">verified</mat-icon>
            </h1>
            <p class="location" *ngIf="profile.city">
              <mat-icon>location_on</mat-icon> {{ profile.city }}<span *ngIf="profile.country">, {{ profile.country }}</span>
            </p>
            <div class="badges">
              <span class="level-badge">{{ levelLabel }}</span>
              <span class="avail-badge" [class.online]="profile.is_available">
                {{ profile.is_available ? 'Disponible' : 'Indisponible' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="stats-row">
        <div class="stat">
          <span class="stat-value">⭐ {{ rating }}</span>
          <span class="stat-label">{{ profile.review_count }} avis</span>
        </div>
        <div class="stat">
          <span class="stat-value">{{ profile.completed_missions }}</span>
          <span class="stat-label">Missions réalisées</span>
        </div>
        <div class="stat">
          <span class="stat-value">{{ profile.reputation_score | number:'1.0-0' }}</span>
          <span class="stat-label">Score réputation</span>
        </div>
        <div class="stat">
          <span class="stat-value">{{ memberSince }}</span>
          <span class="stat-label">Membre depuis</span>
        </div>
      </div>

      <div class="grid">
        <mat-card class="section-card">
          <mat-card-header>
            <mat-card-title><mat-icon>person</mat-icon> À propos</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p class="bio">{{ profile.bio || 'Ce prestataire n\'a pas encore rédigé sa présentation.' }}</p>
          </mat-card-content>
        </mat-card>

        <mat-card class="section-card" *ngIf="profile.skills.length">
          <mat-card-header>
            <mat-card-title><mat-icon>build</mat-icon> Compétences</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <mat-chip-set>
              <mat-chip *ngFor="let skill of profile.skills">{{ skill }}</mat-chip>
            </mat-chip-set>
          </mat-card-content>
        </mat-card>

        <mat-card class="section-card" *ngIf="profile.categories.length">
          <mat-card-header>
            <mat-card-title><mat-icon>category</mat-icon> Catégories</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <mat-chip-set>
              <mat-chip *ngFor="let cat of profile.categories">{{ cat }}</mat-chip>
            </mat-chip-set>
          </mat-card-content>
        </mat-card>

        <mat-card class="section-card" *ngIf="profile.vehicle_type">
          <mat-card-header>
            <mat-card-title><mat-icon>local_shipping</mat-icon> Véhicule</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p>{{ profile.vehicle_type }}</p>
          </mat-card-content>
        </mat-card>
      </div>

      <div class="cta">
        <p>Vous souhaitez confier une mission à {{ profile.first_name }} ?</p>
        <button mat-raised-button color="primary" routerLink="/register">
          <mat-icon>add_task</mat-icon> Publier une mission
        </button>
        <button mat-stroked-button routerLink="/">
          <mat-icon>home</mat-icon> Retour à l'accueil
        </button>
      </div>
    </div>

    <ng-template #stateTpl>
      <div class="state" *ngIf="loading">
        <mat-spinner diameter="44"></mat-spinner>
        <p>Chargement du profil…</p>
      </div>
      <div class="state error" *ngIf="!loading && error">
        <mat-icon>error_outline</mat-icon>
        <h2>Profil introuvable</h2>
        <p>{{ error }}</p>
        <button mat-raised-button color="primary" routerLink="/">Retour à l'accueil</button>
      </div>
    </ng-template>
  `,
  styles: [`
    .page { max-width: 900px; margin: 0 auto; padding: 24px; }
    .back-btn { margin-bottom: 16px; color: #4b5563; }

    .hero {
      border-radius: 16px;
      padding: 32px;
      color: white;
      margin-bottom: 24px;
    }
    .hero-content { display: flex; gap: 24px; align-items: center; flex-wrap: wrap; }
    .avatar, .avatar-img {
      width: 96px; height: 96px; border-radius: 50%;
      border: 4px solid rgba(255,255,255,0.9);
      flex-shrink: 0;
    }
    .avatar {
      background: white; color: #3CB371;
      display: flex; align-items: center; justify-content: center;
      font-size: 32px; font-weight: 700;
    }
    .avatar-img { object-fit: cover; }
    .hero h1 { margin: 0 0 8px; font-size: 28px; display: flex; align-items: center; gap: 8px; }
    .verified { color: #bbf7d0; font-size: 22px; width: 22px; height: 22px; }
    .location { display: flex; align-items: center; gap: 4px; margin: 0 0 12px; opacity: 0.95; }
    .location mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .badges { display: flex; gap: 8px; flex-wrap: wrap; }
    .level-badge, .avail-badge {
      padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;
      background: rgba(255,255,255,0.2);
    }
    .avail-badge.online { background: rgba(255,255,255,0.35); }

    .stats-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    .stat {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 16px;
      text-align: center;
    }
    .stat-value { display: block; font-size: 22px; font-weight: 700; color: #111827; }
    .stat-label { font-size: 12px; color: #6b7280; }

    .grid { display: flex; flex-direction: column; gap: 16px; }
    .section-card { border-radius: 12px; }
    .section-card mat-card-title { display: flex; align-items: center; gap: 8px; font-size: 16px; }
    .section-card mat-card-title mat-icon { color: #3CB371; }
    .bio { color: #4b5563; line-height: 1.7; margin: 0; }

    .cta {
      margin-top: 32px;
      padding: 24px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 12px;
      text-align: center;
    }
    .cta p { margin: 0 0 16px; color: #374151; }
    .cta button { margin: 0 8px 8px; }

    .state {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; min-height: 400px; gap: 12px; color: #6b7280;
    }
    .state.error mat-icon { font-size: 48px; width: 48px; height: 48px; color: #ef4444; }
    .state.error h2 { margin: 0; color: #111827; }

    @media (max-width: 640px) {
      .stats-row { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class ProviderPublicProfileComponent implements OnInit {
  profile: PublicProviderProfile | null = null;
  loading = true;
  error = '';
  gradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

  private readonly gradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private providerProfileService: ProviderProfileService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    const colorIdx = Math.abs(this.hashCode(id)) % this.gradients.length;
    this.gradient = this.gradients[colorIdx];

    this.providerProfileService.getPublicProfile(id).subscribe({
      next: (p) => {
        this.profile = p;
        this.loading = false;
      },
      error: () => {
        this.error = 'Ce prestataire n\'existe pas ou n\'est plus actif.';
        this.loading = false;
      },
    });
  }

  get displayName(): string {
    if (!this.profile) return '';
    const initial = this.profile.last_name ? ` ${this.profile.last_name.charAt(0)}.` : '';
    return `${this.profile.first_name}${initial}`.trim();
  }

  get initials(): string {
    if (!this.profile) return '?';
    return `${this.profile.first_name?.[0] || ''}${this.profile.last_name?.[0] || ''}`.toUpperCase();
  }

  get rating(): string {
    if (!this.profile) return '—';
    if (this.profile.avg_rating) return this.profile.avg_rating.toFixed(1);
    return (this.profile.reputation_score / 20).toFixed(1);
  }

  get levelLabel(): string {
    const levels: Record<string, string> = {
      bronze: 'Bronze', silver: 'Argent', gold: 'Or', platinum: 'Platine',
    };
    return `Niveau ${levels[this.profile?.level || ''] || this.profile?.level || '—'}`;
  }

  get memberSince(): string {
    if (!this.profile?.member_since) return '—';
    return new Date(this.profile.member_since).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
  }

  goBack(): void {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    this.router.navigate(['/']);
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
}
