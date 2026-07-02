import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LandingService, LandingEnterprise } from '../../../core/services/landing.service';
import {
  EnterpriseProfileDialogComponent,
  EnterpriseProfileDialogData,
} from '../enterprise-profile-dialog/enterprise-profile-dialog.component';

export interface EnterprisesListDialogData {
  totalCount: number;
}

@Component({
  selector: 'app-enterprises-list-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatDialogModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatProgressSpinnerModule,
  ],
  template: `
    <div class="dialog-header">
      <div>
        <h2>Toutes nos entreprises</h2>
        <p>{{ filtered.length }} entreprise{{ filtered.length > 1 ? 's' : '' }} sur {{ data.totalCount }}</p>
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

    <div class="list" *ngIf="!loading">
      <button
        type="button"
        class="item"
        *ngFor="let e of filtered"
        (click)="openProfile(e)">
        <div class="logo">
          <img *ngIf="e.logo" [src]="e.logo" [alt]="e.company_name" />
          <mat-icon *ngIf="!e.logo">business</mat-icon>
        </div>
        <div class="info">
          <strong>
            {{ e.company_name }}
            <mat-icon class="verified" *ngIf="e.is_verified">verified</mat-icon>
          </strong>
          <span class="meta">{{ e.city || 'Mali' }} · {{ e.total_employees || 0 }} employés</span>
        </div>
        <mat-icon class="chevron">chevron_right</mat-icon>
      </button>
      <p class="empty" *ngIf="!filtered.length">Aucune entreprise ne correspond.</p>
    </div>
  `,
  styles: [`
    :host { display: block; padding: 20px 24px 24px; max-height: 80vh; }

    .dialog-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 16px;
    }

    .dialog-header h2 { margin: 0 0 4px; font-size: 22px; color: #111827; }
    .dialog-header p { margin: 0; font-size: 14px; color: #6b7280; }

    .search-field { width: 100%; margin-bottom: 16px; }

    .loading { display: flex; justify-content: center; padding: 40px; }

    .list {
      display: flex; flex-direction: column; gap: 8px;
      max-height: 55vh; overflow-y: auto;
    }

    .item {
      display: flex; align-items: center; gap: 14px;
      padding: 12px 14px; border: 1px solid #e5e7eb; border-radius: 12px;
      background: #fafafa; cursor: pointer; text-align: left;
      font: inherit; color: inherit; width: 100%;
      transition: border-color 0.2s, background 0.2s;
    }

    .item:hover { border-color: #7c3aed; background: #f5f3ff; }

    .logo {
      width: 44px; height: 44px; border-radius: 10px;
      background: #ede9fe; color: #7c3aed;
      display: flex; align-items: center; justify-content: center; overflow: hidden;
      flex-shrink: 0;
    }

    .logo img { width: 100%; height: 100%; object-fit: cover; }

    .info { flex: 1; min-width: 0; }

    .info strong {
      display: flex; align-items: center; gap: 4px;
      font-size: 15px; color: #111827;
    }

    .verified { color: #7c3aed; font-size: 16px; width: 16px; height: 16px; }

    .meta { display: block; font-size: 12px; color: #6b7280; margin-top: 2px; }

    .chevron { color: #9ca3af; }
    .empty { text-align: center; color: #6b7280; padding: 24px; }
  `]
})
export class EnterprisesListDialogComponent implements OnInit {
  enterprises: LandingEnterprise[] = [];
  filtered: LandingEnterprise[] = [];
  loading = true;
  filterText = '';

  constructor(
    private dialogRef: MatDialogRef<EnterprisesListDialogComponent>,
    private landingService: LandingService,
    private dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public data: EnterprisesListDialogData,
  ) {}

  ngOnInit(): void {
    this.landingService.getAllEnterprises().subscribe({
      next: (list) => {
        this.enterprises = list;
        this.filtered = list;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  applyFilter(): void {
    const q = this.filterText.trim().toLowerCase();
    if (!q) {
      this.filtered = this.enterprises;
      return;
    }
    this.filtered = this.enterprises.filter(e =>
      `${e.company_name} ${e.city}`.toLowerCase().includes(q)
    );
  }

  openProfile(ent: LandingEnterprise): void {
    this.dialog.open(EnterpriseProfileDialogComponent, {
      data: { enterprise: ent } as EnterpriseProfileDialogData,
      width: '560px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      autoFocus: false,
      panelClass: 'landing-enterprise-dialog',
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
