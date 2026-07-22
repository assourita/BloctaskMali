import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LandingService, LandingProvider } from '../../../core/services/landing.service';
import {
  ProviderProfileDialogComponent,
  ProviderProfileDialogData,
} from '../provider-profile-dialog/provider-profile-dialog.component';

export interface ProvidersListDialogData {
  totalCount: number;
}

@Component({
  selector: 'app-providers-list-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatDialogModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatProgressSpinnerModule,
  ],
  template: `
    <div class="dialog-header">
      <div>
        <h2>Tous nos prestataires</h2>
        <p>{{ filtered.length }} prestataire{{ filtered.length > 1 ? 's' : '' }} sur {{ data.totalCount }}</p>
      </div>
      <button mat-icon-button (click)="close()" aria-label="Fermer">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <mat-form-field appearance="outline" class="search-field">
      <mat-label>Rechercher par nom ou ville</mat-label>
      <mat-icon matPrefix>search</mat-icon>
      <input matInput [(ngModel)]="filterText" (ngModelChange)="applyFilter()" />
    </mat-form-field>

    <div class="loading" *ngIf="loading">
      <mat-spinner diameter="36"></mat-spinner>
    </div>

    <div class="providers-grid" *ngIf="!loading">
      <button
        type="button"
        class="provider-item"
        *ngFor="let p of filtered; let i = index"
        (click)="openProfile(p, i)">
        <div class="avatar-wrap" [style.background]="gradient(i)">
          <img *ngIf="p.profile_picture" [src]="p.profile_picture" [alt]="name(p)" />
          <span *ngIf="!p.profile_picture">{{ initial(p) }}</span>
        </div>
        <div class="info">
          <strong>
            {{ name(p) }}
            <mat-icon class="verified" *ngIf="p.identity_verified">verified</mat-icon>
          </strong>
          <span class="meta"><mat-icon class="inline-star">star</mat-icon> {{ rating(p) }} · {{ p.completed_missions }} missions</span>
          <span class="city" *ngIf="p.city">{{ p.city }}</span>
        </div>
        <mat-icon class="chevron">chevron_right</mat-icon>
      </button>
      <p class="empty" *ngIf="!filtered.length">Aucun prestataire ne correspond à votre recherche.</p>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      padding: 20px 24px 24px;
      max-height: 80vh;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .dialog-header h2 {
      margin: 0 0 4px;
      font-size: 22px;
      color: #111827;
    }

    .dialog-header p {
      margin: 0;
      font-size: 14px;
      color: #6b7280;
    }

    .search-field {
      width: 100%;
      margin-bottom: 16px;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: 40px;
    }

    .providers-grid {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 55vh;
      overflow-y: auto;
    }

    .provider-item {
      display: flex;
      align-items: center;
      gap: 14px;
      width: 100%;
      padding: 12px;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      background: white;
      cursor: pointer;
      text-align: left;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .provider-item:hover {
      border-color: #3CB371;
      box-shadow: 0 4px 12px rgba(60, 179, 113, 0.12);
    }

    .avatar-wrap {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      flex-shrink: 0;
      overflow: hidden;
    }

    .avatar-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .info strong {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 15px;
      color: #111827;
    }

    .verified {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #3CB371;
    }

    .meta, .city {
      font-size: 13px;
      color: #6b7280;
    }

    .chevron {
      color: #9ca3af;
    }

    .empty {
      text-align: center;
      color: #6b7280;
      padding: 24px;
    }
  `]
})
export class ProvidersListDialogComponent implements OnInit {
  providers: LandingProvider[] = [];
  filtered: LandingProvider[] = [];
  loading = true;
  filterText = '';

  private readonly gradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  ];

  constructor(
    private dialogRef: MatDialogRef<ProvidersListDialogComponent>,
    private landingService: LandingService,
    private dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public data: ProvidersListDialogData,
  ) {}

  ngOnInit(): void {
    this.landingService.getAllProviders().subscribe({
      next: (list) => {
        this.providers = list;
        this.filtered = list;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  applyFilter(): void {
    const q = this.filterText.trim().toLowerCase();
    if (!q) {
      this.filtered = this.providers;
      return;
    }
    this.filtered = this.providers.filter((p) => {
      const full = `${p.first_name} ${p.last_name} ${p.city}`.toLowerCase();
      return full.includes(q) || p.skills.some((s) => s.toLowerCase().includes(q));
    });
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

  gradient(i: number): string {
    return this.gradients[i % this.gradients.length];
  }

  openProfile(provider: LandingProvider, index: number): void {
    this.dialog.open(ProviderProfileDialogComponent, {
      data: {
        provider,
        gradient: this.gradient(index),
      } as ProviderProfileDialogData,
      width: '560px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      autoFocus: false,
      panelClass: 'landing-provider-dialog',
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
