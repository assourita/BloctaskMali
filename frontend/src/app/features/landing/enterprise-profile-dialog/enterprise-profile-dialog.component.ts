import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EnterpriseProfileService, PublicEnterpriseProfile } from '../../../core/services/enterprise-profile.service';
import { AuthService } from '../../../core/services/auth.service';
import type { LandingEnterprise } from '../../../core/services/landing.service';
import { AssignMissionDialogComponent } from '../assign-mission-dialog/assign-mission-dialog.component';

export interface EnterpriseProfileDialogData {
  enterprise: LandingEnterprise;
}

@Component({
  selector: 'app-enterprise-profile-dialog',
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

      <div class="hero">
        <div class="hero-content">
          <div class="logo-wrap" *ngIf="!logoUrl"><mat-icon>business</mat-icon></div>
          <img *ngIf="logoUrl" [src]="logoUrl" class="logo-img" [alt]="displayName" />
          <div>
            <h2>
              {{ displayName }}
              <mat-icon class="verified" *ngIf="verified" title="Entreprise vérifiée">verified</mat-icon>
            </h2>
            <p class="location" *ngIf="city">
              <mat-icon>location_on</mat-icon> {{ city }}
            </p>
            <div class="badges">
              <span class="badge">Entreprise partenaire</span>
              <span class="badge accent" *ngIf="verified">Vérifiée</span>
            </div>
          </div>
        </div>
      </div>

      <div class="dialog-body">
        <div class="stats-row">
          <div class="stat">
            <span class="stat-value">{{ reputationScore | number:'1.0-0' }}</span>
            <span class="stat-label">Réputation</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ totalEmployees }}</span>
            <span class="stat-label">Employés</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ totalMissions }}</span>
            <span class="stat-label">Missions</span>
          </div>
        </div>

        <div class="loading-inline" *ngIf="loading">
          <mat-spinner diameter="28"></mat-spinner>
          <span>Chargement…</span>
        </div>

        <section class="block" *ngIf="!loading && description">
          <h3><mat-icon>info</mat-icon> Présentation</h3>
          <p>{{ description }}</p>
        </section>

        <section class="block" *ngIf="!loading && address">
          <h3><mat-icon>place</mat-icon> Adresse</h3>
          <p>{{ address }}</p>
        </section>

        <section class="block" *ngIf="!loading && website">
          <h3><mat-icon>language</mat-icon> Site web</h3>
          <a [href]="website" target="_blank" rel="noopener">{{ website }}</a>
        </section>

        <div class="cta">
          <p>Confiez une mission à <strong>{{ displayName }}</strong> et son équipe terrain.</p>

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
    .dialog-wrap { position: relative; overflow: hidden; border-radius: 16px; }

    .close-btn {
      position: absolute; top: 8px; right: 8px; z-index: 2;
      color: white; background: rgba(0, 0, 0, 0.25);
    }

    .hero {
      padding: 28px 24px 24px;
      color: white;
      background: linear-gradient(135deg, #4c1d95 0%, #6d28d9 50%, #7c3aed 100%);
    }

    .hero-content { display: flex; gap: 16px; align-items: center; padding-right: 32px; }

    .logo-wrap, .logo-img {
      width: 72px; height: 72px; border-radius: 14px;
      border: 3px solid rgba(255, 255, 255, 0.9); flex-shrink: 0;
    }

    .logo-wrap {
      background: rgba(255, 255, 255, 0.15);
      display: flex; align-items: center; justify-content: center;
    }

    .logo-wrap mat-icon { font-size: 36px; width: 36px; height: 36px; }
    .logo-img { object-fit: cover; }

    .hero h2 {
      margin: 0 0 6px; font-size: 22px;
      display: flex; align-items: center; gap: 6px;
    }

    .verified { color: #c4b5fd; font-size: 20px; width: 20px; height: 20px; }

    .location {
      display: flex; align-items: center; gap: 4px;
      margin: 0 0 10px; font-size: 14px; opacity: 0.95;
    }

    .location mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .badges { display: flex; gap: 8px; flex-wrap: wrap; }

    .badge {
      padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;
      background: rgba(255, 255, 255, 0.2);
    }

    .badge.accent { background: rgba(255, 255, 255, 0.35); }

    .dialog-body {
      padding: 20px 24px 24px;
      max-height: min(55vh, 480px);
      overflow-y: auto;
    }

    .stats-row {
      display: grid; grid-template-columns: repeat(3, 1fr);
      gap: 10px; margin-bottom: 20px;
    }

    .stat {
      background: #f9fafb; border: 1px solid #e5e7eb;
      border-radius: 10px; padding: 12px; text-align: center;
    }

    .stat-value { display: block; font-size: 18px; font-weight: 700; color: #111827; }
    .stat-label { font-size: 11px; color: #6b7280; }

    .loading-inline {
      display: flex; align-items: center; gap: 12px;
      color: #6b7280; font-size: 14px; margin-bottom: 16px;
    }

    .block { margin-bottom: 20px; }

    .block h3 {
      display: flex; align-items: center; gap: 6px;
      font-size: 14px; font-weight: 600; color: #374151;
      margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.03em;
    }

    .block h3 mat-icon { font-size: 18px; width: 18px; height: 18px; color: #7c3aed; }
    .block p, .block a { margin: 0; color: #4b5563; line-height: 1.6; font-size: 14px; }
    .block a { color: #7c3aed; word-break: break-all; }

    .cta {
      margin-top: 8px; padding: 16px;
      background: #f5f3ff; border: 1px solid #ddd6fe;
      border-radius: 12px; text-align: center;
    }

    .cta p { margin: 0 0 12px; font-size: 14px; color: #374151; }
    .cta-primary { width: 100%; margin-bottom: 8px; }
    .cta button { width: 100%; margin-bottom: 8px; }
    .cta button:last-child { margin-bottom: 0; }
  `]
})
export class EnterpriseProfileDialogComponent implements OnInit {
  profile: PublicEnterpriseProfile | null = null;
  loading = true;
  isLoggedInClient = false;

  constructor(
    private dialogRef: MatDialogRef<EnterpriseProfileDialogComponent>,
    private enterpriseProfileService: EnterpriseProfileService,
    private authService: AuthService,
    private dialog: MatDialog,
    private router: Router,
    @Inject(MAT_DIALOG_DATA) public data: EnterpriseProfileDialogData,
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      if (!user) {
        this.isLoggedInClient = false;
        return;
      }
      const role = user.active_role || user.user_type;
      this.isLoggedInClient = role === 'client';
    });

    this.enterpriseProfileService.getPublicProfile(this.data.enterprise.id).subscribe({
      next: (p) => { this.profile = p; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  get displayName(): string {
    return this.profile?.company_name || this.data.enterprise.company_name;
  }

  get logoUrl(): string | null {
    return this.profile?.logo || this.data.enterprise.logo;
  }

  get verified(): boolean {
    return this.profile?.is_verified ?? this.data.enterprise.is_verified;
  }

  get city(): string {
    return this.profile?.city || this.data.enterprise.city || '';
  }

  get reputationScore(): number {
    return this.profile?.reputation_score ?? this.data.enterprise.reputation_score;
  }

  get totalEmployees(): number {
    return this.profile?.total_employees ?? this.data.enterprise.total_employees ?? 0;
  }

  get totalMissions(): number {
    return this.profile?.total_missions_posted ?? this.data.enterprise.total_missions_posted ?? 0;
  }

  get description(): string {
    return this.profile?.description || '';
  }

  get address(): string {
    return this.profile?.address || '';
  }

  get website(): string {
    return this.profile?.website || this.data.enterprise.website || '';
  }

  close(): void {
    this.dialogRef.close();
  }

  openAssignDialog(): void {
    this.dialog.open(AssignMissionDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
      data: {
        enterprise: this.data.enterprise,
        enterpriseName: this.displayName,
      },
    }).afterClosed().subscribe((sent) => {
      if (sent) {
        this.close();
        this.router.navigate(['/client/solicitations']);
      }
    });
  }
}
