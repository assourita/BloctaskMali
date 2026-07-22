import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';

import { MissionService } from '../../../../core/services/mission.service';
import { LandingService, LandingProvider, LandingEnterprise } from '../../../../core/services/landing.service';

export interface SolicitMissionDialogData {
  missionId: string;
  missionTitle: string;
}

@Component({
  selector: 'app-solicit-mission-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatDialogModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatTabsModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatChipsModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>assignment_ind</mat-icon>
      Attribuer la mission
    </h2>

    <mat-dialog-content>
      <p class="intro">
        Mission : <strong>{{ data.missionTitle }}</strong><br>
        Choisissez un prestataire ou une entreprise à solliciter.
      </p>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Rechercher</mat-label>
        <mat-icon matPrefix>search</mat-icon>
        <input matInput [(ngModel)]="filterText" (ngModelChange)="applyFilter()" />
      </mat-form-field>

      <mat-tab-group [(selectedIndex)]="tabIndex" (selectedIndexChange)="applyFilter()">
        <mat-tab label="Prestataires">
          <div class="loading" *ngIf="loadingProviders">
            <mat-spinner diameter="28"></mat-spinner>
          </div>
          <div class="targets" *ngIf="!loadingProviders">
            <button
              type="button"
              class="target-item"
              *ngFor="let p of filteredProviders; let i = index"
              [class.selected]="selectedType === 'provider' && selectedId === p.id"
              (click)="selectProvider(p)">
              <div class="avatar" [style.background]="gradient(i)">
                <img *ngIf="p.profile_picture" [src]="p.profile_picture" alt="" />
                <span *ngIf="!p.profile_picture">{{ providerInitial(p) }}</span>
              </div>
              <div class="target-info">
                <strong>{{ providerName(p) }}</strong>
                <span><mat-icon class="inline-star">star</mat-icon> {{ providerRating(p) }} · {{ p.city }}</span>
              </div>
              <mat-icon *ngIf="selectedType === 'provider' && selectedId === p.id">check_circle</mat-icon>
            </button>
            <p class="empty" *ngIf="!filteredProviders.length">Aucun prestataire trouvé.</p>
          </div>
        </mat-tab>

        <mat-tab label="Entreprises">
          <div class="loading" *ngIf="loadingEnterprises">
            <mat-spinner diameter="28"></mat-spinner>
          </div>
          <div class="targets" *ngIf="!loadingEnterprises">
            <button
              type="button"
              class="target-item"
              *ngFor="let e of filteredEnterprises"
              [class.selected]="selectedType === 'enterprise' && selectedId === e.id"
              (click)="selectEnterprise(e)">
              <div class="avatar enterprise">
                <img *ngIf="e.logo" [src]="e.logo" alt="" />
                <mat-icon *ngIf="!e.logo">business</mat-icon>
              </div>
              <div class="target-info">
                <strong>
                  {{ e.company_name }}
                  <mat-icon class="verified" *ngIf="e.is_verified">verified</mat-icon>
                </strong>
                <span>{{ e.city }} · {{ e.total_employees }} employés</span>
              </div>
              <mat-icon *ngIf="selectedType === 'enterprise' && selectedId === e.id">check_circle</mat-icon>
            </button>
            <p class="empty" *ngIf="!filteredEnterprises.length">Aucune entreprise trouvée.</p>
          </div>
        </mat-tab>
      </mat-tab-group>

      <mat-form-field appearance="outline" class="full-width message-field">
        <mat-label>Message (optionnel)</mat-label>
        <textarea matInput [(ngModel)]="message" rows="3"
          placeholder="Bonjour, j'aimerais vous confier cette mission…"></textarea>
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="close()">Annuler</button>
      <button mat-raised-button color="primary" [disabled]="!selectedId || submitting" (click)="submit()">
        <mat-spinner diameter="18" *ngIf="submitting"></mat-spinner>
        <mat-icon *ngIf="!submitting">send</mat-icon>
        <span *ngIf="!submitting">Envoyer la sollicitation</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2[mat-dialog-title] {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      font-size: 20px;
    }

    mat-dialog-content {
      min-width: min(480px, 92vw);
      max-height: 70vh;
      padding-top: 8px !important;
    }

    .intro {
      color: #64748b;
      font-size: 14px;
      margin: 0 0 16px;
      line-height: 1.5;
    }

    .full-width { width: 100%; }
    .message-field { margin-top: 16px; }

    .loading {
      display: flex;
      justify-content: center;
      padding: 24px;
    }

    .targets {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 280px;
      overflow-y: auto;
      padding: 12px 0;
    }

    .target-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      background: #fafafa;
      cursor: pointer;
      text-align: left;
      font: inherit;
      color: inherit;
      width: 100%;
      transition: border-color 0.2s, background 0.2s;
    }

    .target-item:hover {
      border-color: #3CB371;
      background: #f0fdf4;
    }

    .target-item.selected {
      border-color: #3CB371;
      background: #ecfdf5;
    }

    .target-item > mat-icon:last-child {
      color: #3CB371;
      margin-left: auto;
    }

    .avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      overflow: hidden;
    }

    .avatar img { width: 100%; height: 100%; object-fit: cover; }

    .avatar.enterprise {
      background: #ede9fe;
      color: #7c3aed;
      border-radius: 10px;
    }

    .target-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .target-info strong {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 14px;
      color: #0f172a;
    }

    .target-info span {
      font-size: 12px;
      color: #64748b;
    }

    .verified {
      color: #3CB371;
      font-size: 16px !important;
      width: 16px !important;
      height: 16px !important;
    }

    .empty {
      text-align: center;
      color: #94a3b8;
      padding: 16px;
      margin: 0;
    }
  `]
})
export class SolicitMissionDialogComponent implements OnInit {
  providers: LandingProvider[] = [];
  enterprises: LandingEnterprise[] = [];
  filteredProviders: LandingProvider[] = [];
  filteredEnterprises: LandingEnterprise[] = [];
  loadingProviders = true;
  loadingEnterprises = true;
  filterText = '';
  tabIndex = 0;
  selectedType: 'provider' | 'enterprise' | null = null;
  selectedId = '';
  selectedLabel = '';
  message = '';
  submitting = false;

  private readonly gradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  ];

  constructor(
    private dialogRef: MatDialogRef<SolicitMissionDialogComponent>,
    private missionService: MissionService,
    private landingService: LandingService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: SolicitMissionDialogData,
  ) {}

  ngOnInit(): void {
    this.landingService.getAllProviders().subscribe({
      next: (list) => {
        this.providers = list;
        this.filteredProviders = list;
        this.loadingProviders = false;
      },
      error: () => { this.loadingProviders = false; },
    });

    this.landingService.getAllEnterprises().subscribe({
      next: (list) => {
        this.enterprises = list;
        this.filteredEnterprises = list;
        this.loadingEnterprises = false;
      },
      error: () => { this.loadingEnterprises = false; },
    });
  }

  applyFilter(): void {
    const q = this.filterText.trim().toLowerCase();
    if (!q) {
      this.filteredProviders = this.providers;
      this.filteredEnterprises = this.enterprises;
      return;
    }
    this.filteredProviders = this.providers.filter((p) => {
      const full = `${p.first_name} ${p.last_name} ${p.city} ${p.skills.join(' ')}`.toLowerCase();
      return full.includes(q);
    });
    this.filteredEnterprises = this.enterprises.filter((e) => {
      const full = `${e.company_name} ${e.city}`.toLowerCase();
      return full.includes(q);
    });
  }

  selectProvider(p: LandingProvider): void {
    this.selectedType = 'provider';
    this.selectedId = p.id;
    this.selectedLabel = this.providerName(p);
  }

  selectEnterprise(e: LandingEnterprise): void {
    this.selectedType = 'enterprise';
    this.selectedId = e.id;
    this.selectedLabel = e.company_name;
  }

  providerName(p: LandingProvider): string {
    const initial = p.last_name ? ` ${p.last_name.charAt(0)}.` : '';
    return `${p.first_name}${initial}`.trim();
  }

  providerInitial(p: LandingProvider): string {
    return `${p.first_name?.[0] || ''}${p.last_name?.[0] || ''}`.toUpperCase();
  }

  providerRating(p: LandingProvider): string {
    if (p.avg_rating) return p.avg_rating.toFixed(1);
    return (p.reputation_score / 20).toFixed(1);
  }

  gradient(i: number): string {
    return this.gradients[i % this.gradients.length];
  }

  submit(): void {
    if (!this.selectedId || !this.selectedType || this.submitting) return;

    this.submitting = true;
    const payload = this.selectedType === 'enterprise'
      ? { enterprise_id: this.selectedId, message: this.message.trim() }
      : { provider_id: this.selectedId, message: this.message.trim() };

    this.missionService.solicitMission(this.data.missionId, payload).subscribe({
      next: () => {
        this.submitting = false;
        this.snackBar.open(
          `Sollicitation envoyée à ${this.selectedLabel}`,
          'Fermer',
          { duration: 4000 },
        );
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.submitting = false;
        this.snackBar.open(err.error?.error || 'Erreur lors de l\'envoi', 'Fermer', { duration: 5000 });
      },
    });
  }

  close(): void {
    this.dialogRef.close(false);
  }
}
