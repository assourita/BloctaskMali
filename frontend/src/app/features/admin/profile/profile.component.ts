import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Observable } from 'rxjs';
import { AuthService, User } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="profile-container">
      <div class="page-header">
        <h1>Mon Profil</h1>
        <p>Gérez vos informations personnelles</p>
      </div>

      <div class="loading-container" *ngIf="loading">
        <mat-spinner diameter="40"></mat-spinner>
        <p>Chargement...</p>
      </div>

      <div class="profile-content" *ngIf="!loading && user">
        <mat-card class="profile-card">
          <div class="profile-header">
            <mat-icon class="profile-avatar">account_circle</mat-icon>
            <div class="profile-info">
              <h2>{{ user.first_name }} {{ user.last_name }}</h2>
              <span class="profile-role">{{ getRoleLabel(user.user_type) }}</span>
              <span class="profile-email">{{ user.email }}</span>
            </div>
          </div>

          <div class="profile-details">
            <div class="detail-item">
              <mat-icon>email</mat-icon>
              <div>
                <label>Email</label>
                <span>{{ user.email }}</span>
              </div>
            </div>

            <div class="detail-item">
              <mat-icon>person</mat-icon>
              <div>
                <label>Nom d'utilisateur</label>
                <span>{{ user.username }}</span>
              </div>
            </div>

            <div class="detail-item">
              <mat-icon>calendar_today</mat-icon>
              <div>
                <label>Membre depuis</label>
                <span>{{ user.created_at | date:'dd MMMM yyyy' }}</span>
              </div>
            </div>

            <div class="detail-item">
              <mat-icon>verified_user</mat-icon>
              <div>
                <label>Statut</label>
                <span class="status-badge" [class.active]="user.is_active">
                  {{ user.is_active ? 'Actif' : 'Inactif' }}
                </span>
              </div>
            </div>
          </div>

          <div class="profile-actions">
            <button mat-raised-button color="primary" routerLink="/admin/dashboard">
              <mat-icon>arrow_back</mat-icon>
              Retour au dashboard
            </button>
          </div>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .profile-container {
      padding: 24px;
      max-width: 800px;
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

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px;
      gap: 16px;
    }

    .profile-card {
      padding: 32px;
    }

    .profile-header {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 1px solid #e5e7eb;
    }

    .profile-avatar {
      font-size: 80px;
      width: 80px;
      height: 80px;
      color: #3CB371;
    }

    .profile-info {
      h2 {
        margin: 0 0 8px 0;
        font-size: 24px;
        font-weight: 600;
        color: #1f2937;
      }
    }

    .profile-role {
      display: inline-block;
      background: #3CB371;
      color: white;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .profile-email {
      display: block;
      color: #6b7280;
      font-size: 14px;
    }

    .profile-details {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 32px;
    }

    .detail-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: #f9fafb;
      border-radius: 8px;

      mat-icon {
        color: #6b7280;
      }

      div {
        display: flex;
        flex-direction: column;

        label {
          font-size: 12px;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        span {
          font-size: 16px;
          color: #1f2937;
          font-weight: 500;
        }
      }
    }

    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      background: #fee2e2;
      color: #dc2626;

      &.active {
        background: #d1fae5;
        color: #059669;
      }
    }

    .profile-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;

      button {
        display: flex;
        align-items: center;
        gap: 8px;
      }
    }
  `]
})
export class AdminProfileComponent implements OnInit {
  user: User | null = null;
  loading = true;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.loadUser();
  }

  loadUser(): void {
    this.loading = true;
    this.authService.currentUser$.subscribe({
      next: (user) => {
        this.user = user;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading user:', err);
        this.loading = false;
      }
    });
  }

  getRoleLabel(role: string): string {
    const labels: { [key: string]: string } = {
      client: 'Client',
      provider: 'Prestataire',
      enterprise: 'Entreprise',
      admin: 'Administrateur'
    };
    return labels[role] || role;
  }
}
