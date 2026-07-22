import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProviderProfileService, PublicProviderProfile } from '../../../core/services/provider-profile.service';
import { AuthService } from '../../../core/services/auth.service';
import type { LandingProvider } from '../../../core/services/landing.service';
import { AssignMissionDialogComponent } from '../assign-mission-dialog/assign-mission-dialog.component';

export interface ProviderProfileDialogData {
  provider: LandingProvider;
  gradient: string;
}

@Component({
  selector: 'app-provider-profile-dialog',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    MatDialogModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatProgressSpinnerModule,
  ],
  template: `
    <div class="dialog-wrap">
      <button mat-icon-button class="close-btn" (click)="close()" aria-label="Fermer">
        <mat-icon>close</mat-icon>
      </button>

      <div class="hero" [style.background]="data.gradient">
        <div class="hero-content">
          <div class="avatar" *ngIf="!photoUrl">{{ initials }}</div>
          <img *ngIf="photoUrl" [src]="photoUrl" class="avatar-img" [alt]="displayName" />
          <div>
            <h2>
              {{ displayName }}
              <mat-icon class="verified" *ngIf="verified" title="Identité vérifiée">verified</mat-icon>
            </h2>
            <p class="location" *ngIf="city">
              <mat-icon>location_on</mat-icon> {{ city }}
            </p>
            <div class="badges">
              <span class="level-badge">{{ levelLabel }}</span>
              <span class="avail-badge" [class.online]="isAvailable" *ngIf="profileLoaded">
                {{ isAvailable ? 'Disponible' : 'Indisponible' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="dialog-body">
        <div class="stats-row">
          <div class="stat">
            <span class="stat-value"><mat-icon class="inline-star">star</mat-icon> {{ rating }}</span>
            <span class="stat-label">{{ reviewCount }} avis</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ completedMissions }}</span>
            <span class="stat-label">Missions</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ reputationScore | number:'1.0-0' }}</span>
            <span class="stat-label">Réputation</span>
          </div>
        </div>

        <div class="loading-inline" *ngIf="loading">
          <mat-spinner diameter="28"></mat-spinner>
          <span>Chargement du profil…</span>
        </div>

        <section class="block" *ngIf="!loading">
          <h3><mat-icon>person</mat-icon> À propos</h3>
          <p>{{ bio }}</p>
        </section>

        <section class="block" *ngIf="!loading && skills.length">
          <h3><mat-icon>build</mat-icon> Compétences</h3>
          <mat-chip-set>
            <mat-chip *ngFor="let skill of skills">{{ skill }}</mat-chip>
          </mat-chip-set>
        </section>

        <section class="block" *ngIf="!loading && categories.length">
          <h3><mat-icon>category</mat-icon> Catégories</h3>
          <mat-chip-set>
            <mat-chip *ngFor="let cat of categories">{{ cat }}</mat-chip>
          </mat-chip-set>
        </section>

        <section class="block" *ngIf="!loading && vehicleType">
          <h3><mat-icon>local_shipping</mat-icon> Véhicule</h3>
          <p>{{ vehicleType }}</p>
        </section>

        <div class="cta">
          <p>Confiez une mission à {{ data.provider.first_name }} en quelques clics.</p>

          <ng-container *ngIf="isLoggedInClient; else guestCta">
            <button mat-raised-button color="primary" class="cta-primary" (click)="openAssignDialog()">
              <mat-icon>assignment_ind</mat-icon> Attribuer une mission
            </button>
            <button mat-stroked-button routerLink="/client/missions/create" (click)="close()">
              <mat-icon>add_task</mat-icon> Nouvelle mission
            </button>
          </ng-container>

          <ng-template #guestCta>
            <button mat-raised-button color="primary" routerLink="/register" (click)="close()">
              <mat-icon>person_add</mat-icon> Créer un compte client
            </button>
            <button mat-stroked-button routerLink="/login" (click)="close()">
              <mat-icon>login</mat-icon> Se connecter
            </button>
          </ng-template>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dialog-wrap {
      position: relative;
      overflow: hidden;
      border-radius: 16px;
    }

    .close-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      z-index: 2;
      color: white;
      background: rgba(0, 0, 0, 0.25);
    }

    .hero {
      padding: 28px 24px 24px;
      color: white;
    }

    .hero-content {
      display: flex;
      gap: 16px;
      align-items: center;
      padding-right: 32px;
    }

    .avatar, .avatar-img {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      border: 3px solid rgba(255, 255, 255, 0.9);
      flex-shrink: 0;
    }

    .avatar {
      background: white;
      color: #3CB371;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
      font-weight: 700;
    }

    .avatar-img { object-fit: cover; }

    .hero h2 {
      margin: 0 0 6px;
      font-size: 22px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .verified {
      color: #bbf7d0;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .location {
      display: flex;
      align-items: center;
      gap: 4px;
      margin: 0 0 10px;
      font-size: 14px;
      opacity: 0.95;
    }

    .location mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .badges {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .level-badge, .avail-badge {
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      background: rgba(255, 255, 255, 0.2);
    }

    .avail-badge.online { background: rgba(255, 255, 255, 0.35); }

    .dialog-body {
      padding: 20px 24px 24px;
      max-height: min(55vh, 480px);
      overflow-y: auto;
    }

    .stats-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 20px;
    }

    .stat {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 12px;
      text-align: center;
    }

    .stat-value {
      display: block;
      font-size: 18px;
      font-weight: 700;
      color: #111827;
    }

    .stat-label {
      font-size: 11px;
      color: #6b7280;
    }

    .loading-inline {
      display: flex;
      align-items: center;
      gap: 12px;
      color: #6b7280;
      font-size: 14px;
      margin-bottom: 16px;
    }

    .block {
      margin-bottom: 20px;
    }

    .block h3 {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      margin: 0 0 8px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .block h3 mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #3CB371;
    }

    .block p {
      margin: 0;
      color: #4b5563;
      line-height: 1.6;
      font-size: 14px;
    }

    .cta {
      margin-top: 8px;
      padding: 16px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 12px;
      text-align: center;
    }

    .cta p {
      margin: 0 0 12px;
      font-size: 14px;
      color: #374151;
    }

    .cta-primary {
      width: 100%;
      margin-bottom: 8px;
    }

    .cta button {
      width: 100%;
      margin-bottom: 8px;
    }

    .cta button:last-child {
      margin-bottom: 0;
    }
  `]
})
export class ProviderProfileDialogComponent implements OnInit {
  profile: PublicProviderProfile | null = null;
  loading = true;
  profileLoaded = false;
  isLoggedInClient = false;

  constructor(
    private dialogRef: MatDialogRef<ProviderProfileDialogComponent>,
    private providerProfileService: ProviderProfileService,
    private authService: AuthService,
    private dialog: MatDialog,
    private router: Router,
    @Inject(MAT_DIALOG_DATA) public data: ProviderProfileDialogData,
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      if (!user) {
        this.isLoggedInClient = false;
        return;
      }
      const role = user.active_role || user.user_type;
      this.isLoggedInClient = role === 'client' || role === 'enterprise';
    });

    this.providerProfileService.getPublicProfile(this.data.provider.id).subscribe({
      next: (p) => {
        this.profile = p;
        this.loading = false;
        this.profileLoaded = true;
      },
      error: () => {
        this.loading = false;
        this.profileLoaded = false;
      },
    });
  }

  get displayName(): string {
    const p = this.profile || this.data.provider;
    const initial = p.last_name ? ` ${p.last_name.charAt(0)}.` : '';
    return `${p.first_name}${initial}`.trim();
  }

  get initials(): string {
    const p = this.data.provider;
    return `${p.first_name?.[0] || ''}${p.last_name?.[0] || ''}`.toUpperCase();
  }

  get photoUrl(): string | null {
    return this.profile?.profile_picture || this.data.provider.profile_picture;
  }

  get verified(): boolean {
    return this.profile?.identity_verified ?? this.data.provider.identity_verified;
  }

  get city(): string {
    return this.profile?.city || this.data.provider.city || '';
  }

  get rating(): string {
    const p = this.profile;
    const preview = this.data.provider;
    if (p?.avg_rating) return p.avg_rating.toFixed(1);
    if (preview.avg_rating) return preview.avg_rating.toFixed(1);
    const score = p?.reputation_score ?? preview.reputation_score;
    return (score / 20).toFixed(1);
  }

  get reviewCount(): number {
    return this.profile?.review_count ?? this.data.provider.review_count;
  }

  get completedMissions(): number {
    return this.profile?.completed_missions ?? this.data.provider.completed_missions;
  }

  get reputationScore(): number {
    return this.profile?.reputation_score ?? this.data.provider.reputation_score;
  }

  get levelLabel(): string {
    const level = this.profile?.level || this.data.provider.level;
    const labels: Record<string, string> = {
      bronze: 'Bronze', silver: 'Argent', gold: 'Or', platinum: 'Platine',
    };
    return `Niveau ${labels[level] || level}`;
  }

  get isAvailable(): boolean {
    return this.profile?.is_available ?? true;
  }

  get bio(): string {
    return this.profile?.bio || 'Ce prestataire n\'a pas encore rédigé sa présentation.';
  }

  get skills(): string[] {
    return this.profile?.skills?.length
      ? this.profile.skills
      : (this.data.provider.skills || []);
  }

  get categories(): string[] {
    return this.profile?.categories || [];
  }

  get vehicleType(): string {
    return this.profile?.vehicle_type || '';
  }

  close(): void {
    this.dialogRef.close();
  }

  openAssignDialog(): void {
    this.dialog.open(AssignMissionDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
      data: {
        provider: this.data.provider,
        providerName: this.displayName,
      },
    }).afterClosed().subscribe((sent) => {
      if (sent) {
        this.close();
        this.router.navigate(['/client/missions']);
      }
    });
  }
}
