import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { DashboardHeaderComponent } from '../../../shared/components/dashboard-header/dashboard-header.component';

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
    FormsModule
  ],
  template: `
    <div class="settings-container">
      <div class="page-header">
        <h1>Paramètres</h1>
        <p>Configuration de la plateforme</p>
      </div>

      <div class="settings-grid">
        <mat-card class="settings-card">
          <h2><mat-icon>settings</mat-icon> Général</h2>
          
          <div class="setting-item">
            <span>Maintenance mode</span>
            <mat-slide-toggle [(ngModel)]="settings.maintenance"></mat-slide-toggle>
          </div>

          <div class="setting-item">
            <span>Inscriptions ouvertes</span>
            <mat-slide-toggle [(ngModel)]="settings.registration"></mat-slide-toggle>
          </div>

          <div class="setting-item">
            <span>Notifications email</span>
            <mat-slide-toggle [(ngModel)]="settings.notifications"></mat-slide-toggle>
          </div>
        </mat-card>

        <mat-card class="settings-card">
          <h2><mat-icon>attach_money</mat-icon> Paiements</h2>
          
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Frais de service (%)</mat-label>
            <input matInput type="number" [(ngModel)]="settings.serviceFee">
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Devise par défaut</mat-label>
            <input matInput [(ngModel)]="settings.currency">
          </mat-form-field>
        </mat-card>

        <mat-card class="settings-card">
          <h2><mat-icon>security</mat-icon> Sécurité</h2>
          
          <div class="setting-item">
            <span>2FA obligatoire pour admin</span>
            <mat-slide-toggle [(ngModel)]="settings.require2FA"></mat-slide-toggle>
          </div>

          <div class="setting-item">
            <span>KYC obligatoire</span>
            <mat-slide-toggle [(ngModel)]="settings.requireKYC"></mat-slide-toggle>
          </div>
        </mat-card>
      </div>

      <div class="actions">
        <button mat-raised-button color="primary" (click)="saveSettings()">
          <mat-icon>save</mat-icon>
          Sauvegarder
        </button>
      </div>
    </div>
  `,
  styles: [`
    .settings-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: white;
      padding: 32px;
      border-radius: 16px;
      margin-bottom: 24px;

      h1 {
        margin: 0 0 8px 0;
        font-size: 28px;
        font-weight: 700;
      }

      p {
        margin: 0;
        font-size: 16px;
        opacity: 0.9;
      }
    }

    .settings-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      margin-bottom: 24px;
    }

    .settings-card {
      padding: 24px;

      h2 {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0 0 20px 0;
        font-size: 18px;
        color: #1f2937;

        mat-icon {
          color: #3CB371;
        }
      }
    }

    .setting-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #e5e7eb;

      &:last-child {
        border-bottom: none;
      }

      span {
        color: #4b5563;
      }
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .actions {
      display: flex;
      justify-content: flex-end;

      button {
        display: flex;
        align-items: center;
        gap: 8px;
      }
    }

    @media (max-width: 768px) {
      .settings-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class AdminSettingsComponent {
  settings = {
    maintenance: false,
    registration: true,
    notifications: true,
    serviceFee: 5,
    currency: 'FCFA',
    require2FA: true,
    requireKYC: false
  };

  saveSettings(): void {
    console.log('Saving settings:', this.settings);
    alert('Paramètres sauvegardés !');
  }
}
