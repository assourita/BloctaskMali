import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { AdminService, PlatformSettings } from '../../../core/services/admin.service';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    FormsModule,
  ],
  template: `
    <div class="settings-container">
      <div class="page-header">
        <h1>Paramètres</h1>
        <p>Configuration de la plateforme BlockTask</p>
        <span class="updated-at" *ngIf="settings.updated_at">
          Dernière mise à jour : {{ settings.updated_at | date:'dd/MM/yyyy HH:mm' }}
        </span>
      </div>

      <div class="loading" *ngIf="loading">
        <mat-spinner diameter="36"></mat-spinner>
        <p>Chargement des paramètres...</p>
      </div>

      <ng-container *ngIf="!loading">
        <div class="settings-grid">
          <mat-card class="settings-card">
            <h2><mat-icon>settings</mat-icon> Général</h2>
            <div class="setting-item">
              <div>
                <strong>Mode maintenance</strong>
                <p>Bloque les nouvelles inscriptions</p>
              </div>
              <mat-slide-toggle [(ngModel)]="settings.maintenance_mode" color="primary"></mat-slide-toggle>
            </div>
            <div class="setting-item">
              <div>
                <strong>Inscriptions ouvertes</strong>
                <p>Autoriser la création de comptes</p>
              </div>
              <mat-slide-toggle [(ngModel)]="settings.registration_open" color="primary"></mat-slide-toggle>
            </div>
            <div class="setting-item">
              <div>
                <strong>Notifications email</strong>
                <p>Emails transactionnels et alertes</p>
              </div>
              <mat-slide-toggle [(ngModel)]="settings.email_notifications" color="primary"></mat-slide-toggle>
            </div>
          </mat-card>

          <mat-card class="settings-card">
            <h2><mat-icon>attach_money</mat-icon> Paiements</h2>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Frais de service (%)</mat-label>
              <input matInput type="number" min="0" max="100" step="0.5" [(ngModel)]="settings.service_fee_percent"/>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Devise par défaut</mat-label>
              <input matInput [(ngModel)]="settings.default_currency"/>
            </mat-form-field>
          </mat-card>

          <mat-card class="settings-card">
            <h2><mat-icon>security</mat-icon> Sécurité</h2>
            <div class="setting-item">
              <div>
                <strong>2FA obligatoire pour admin</strong>
                <p>Exiger l'authentification à deux facteurs</p>
              </div>
              <mat-slide-toggle [(ngModel)]="settings.require_2fa_admin" color="primary"></mat-slide-toggle>
            </div>
            <div class="setting-item">
              <div>
                <strong>KYC obligatoire</strong>
                <p>Validation admin requise avant accès plateforme</p>
              </div>
              <mat-slide-toggle [(ngModel)]="settings.require_kyc" color="primary"></mat-slide-toggle>
            </div>
          </mat-card>
        </div>

        <div class="actions">
          <button mat-stroked-button type="button" (click)="loadSettings()" [disabled]="saving">
            <mat-icon>refresh</mat-icon> Réinitialiser
          </button>
          <button mat-raised-button color="primary" (click)="saveSettings()" [disabled]="saving">
            <mat-spinner *ngIf="saving" diameter="18"></mat-spinner>
            <mat-icon *ngIf="!saving">save</mat-icon>
            {{ saving ? 'Enregistrement...' : 'Sauvegarder' }}
          </button>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .settings-container { padding: 24px; max-width: 1400px; margin: 0 auto; }
    .page-header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: white; padding: 32px; border-radius: 16px; margin-bottom: 24px;
      h1 { margin: 0 0 8px; font-size: 28px; font-weight: 700; }
      p { margin: 0; font-size: 16px; opacity: 0.9; }
      .updated-at { display: block; margin-top: 10px; font-size: 12px; opacity: 0.75; }
    }
    .loading { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 48px; color: #6b7280; }
    .settings-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-bottom: 24px; }
    .settings-card {
      padding: 24px;
      h2 {
        display: flex; align-items: center; gap: 8px; margin: 0 0 20px;
        font-size: 18px; color: #1f2937;
        mat-icon { color: #3CB371; }
      }
    }
    .setting-item {
      display: flex; justify-content: space-between; align-items: center; gap: 16px;
      padding: 14px 0; border-bottom: 1px solid #e5e7eb;
      &:last-child { border-bottom: none; }
      strong { display: block; font-size: 14px; color: #111827; }
      p { margin: 4px 0 0; font-size: 12px; color: #6b7280; }
    }
    .full-width { width: 100%; margin-bottom: 12px; }
    .actions { display: flex; justify-content: flex-end; gap: 12px;
      button { display: flex; align-items: center; gap: 8px; }
    }
    @media (max-width: 900px) { .settings-grid { grid-template-columns: 1fr; } }
  `],
})
export class AdminSettingsComponent implements OnInit {
  loading = true;
  saving = false;
  settings: PlatformSettings = {
    maintenance_mode: false,
    registration_open: true,
    email_notifications: true,
    service_fee_percent: 5,
    default_currency: 'FCFA',
    require_2fa_admin: true,
    require_kyc: true,
  };

  constructor(
    private adminService: AdminService,
    private snack: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.loading = true;
    this.adminService.getPlatformSettings().subscribe({
      next: (s) => {
        this.settings = { ...this.settings, ...s };
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snack.open('Impossible de charger les paramètres', 'Fermer', { duration: 4000 });
      },
    });
  }

  saveSettings(): void {
    this.saving = true;
    this.adminService.updatePlatformSettings(this.settings).subscribe({
      next: (s) => {
        this.settings = s;
        this.saving = false;
        this.snack.open('Paramètres enregistrés avec succès', 'Fermer', { duration: 3000 });
      },
      error: (err) => {
        this.saving = false;
        const msg = err?.error?.service_fee_percent?.[0] || err?.error?.error || 'Erreur lors de la sauvegarde';
        this.snack.open(msg, 'Fermer', { duration: 5000 });
      },
    });
  }
}
