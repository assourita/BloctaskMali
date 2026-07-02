import { Component, OnInit, Input, Output, EventEmitter, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../core/services/auth.service';
import { MissionService } from '../../../../core/services/mission.service';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';

interface Application {
  id: string;
  mission: {
    id: string;
    title: string;
    budget: number;
    currency: string;
  };
  provider: {
    id: string;
    first_name: string;
    last_name: string;
    profile_picture?: string;
    reputation_score?: number;
    completed_missions?: number;
    level?: string;
    bio?: string;
    city?: string;
    country?: string;
    phone_number?: string;
    skills?: string[];
    is_available?: boolean;
    identity_verified?: boolean;
  };
  message: string;
  proposed_price?: number;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

@Component({
  selector: 'app-mission-applications',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatSnackBarModule, MatDialogModule,
    MatDividerModule, MatProgressBarModule
  ],
  template: `
    <div class="applications-container">
      <div class="header">
        <h2><mat-icon>people</mat-icon> {{ missionId ? 'Candidatures reçues' : 'Candidatures en attente' }}</h2>
        <span class="badge" *ngIf="applications.length > 0">{{ applications.length }}</span>
      </div>

      <div class="empty-state" *ngIf="applications.length === 0 && !loading">
        <mat-icon>inbox</mat-icon>
        <p>Aucune candidature pour le moment</p>
        <span class="hint">Les prestataires intéressés apparaîtront ici</span>
      </div>

      <div class="loading" *ngIf="loading">
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
      </div>

      <div class="applications-list" *ngIf="!loading && applications.length > 0">
        <mat-card class="application-card" *ngFor="let app of applications">
          <div class="provider-header">
            <div class="provider-info">
              <div class="avatar">
                <img *ngIf="app.provider.profile_picture" [src]="app.provider.profile_picture" alt="">
                <span *ngIf="!app.provider.profile_picture">
                  {{ (app.provider.first_name[0] || '') + (app.provider.last_name[0] || '') }}
                </span>
              </div>
              <div class="provider-details">
                <h4>{{ app.provider.first_name }} {{ app.provider.last_name }}</h4>
                <div class="badges">
                  <span class="badge-verified" *ngIf="app.provider.identity_verified">
                    <mat-icon>verified_user</mat-icon> Identité vérifiée
                  </span>
                  <span class="badge-reputation" *ngIf="app.provider.reputation_score">
                    <mat-icon>star</mat-icon> {{ app.provider.reputation_score | number:'1.1-1' }}
                  </span>
                  <span class="badge-missions" *ngIf="app.provider.completed_missions">
                    {{ app.provider.completed_missions }} missions
                  </span>
                </div>
              </div>
            </div>
            <div class="price-block">
              <span class="label">Budget mission</span>
              <span class="value">{{ (app.mission.budget || app.proposed_price) | number }} {{ app.mission.currency || 'XOF' }}</span>
              <span class="price-hint">Prix fixé par vous</span>
            </div>
          </div>

          <mat-divider></mat-divider>

          <div class="application-content">
            <p class="mission-ref">Pour: <strong>{{ app.mission.title }}</strong></p>
            <div class="message-box">
              <mat-icon>format_quote</mat-icon>
              <p>{{ app.message }}</p>
            </div>
            <p class="date">Postulé le {{ app.created_at | date:'dd MMM yyyy à HH:mm' }}</p>
          </div>

          <mat-card-actions class="actions">
            <button mat-button color="primary" (click)="viewProviderProfile(app)">
              <mat-icon>person</mat-icon> Voir profil
            </button>
            <div class="action-buttons" *ngIf="app.status === 'pending'">
              <button mat-stroked-button color="warn" (click)="rejectApplication(app)" [disabled]="processing === app.id">
                <mat-icon *ngIf="processing !== app.id">close</mat-icon>
                <span *ngIf="processing === app.id">...</span>
                Refuser
              </button>
              <button mat-raised-button color="primary" (click)="acceptApplication(app)" [disabled]="processing === app.id">
                <mat-icon *ngIf="processing !== app.id">check</mat-icon>
                <span *ngIf="processing === app.id">...</span>
                Accepter
              </button>
            </div>
            <div class="status-pill" *ngIf="app.status !== 'pending'">
              {{ app.status === 'accepted' ? 'Acceptée' : app.status === 'rejected' ? 'Refusée' : app.status }}
            </div>
          </mat-card-actions>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .applications-container {
      padding: 20px;
      .header {
        display: flex; align-items: center; gap: 12px; margin-bottom: 20px;
        h2 {
          margin: 0; display: flex; align-items: center; gap: 8px;
          font-size: 20px; font-weight: 600;
          mat-icon { color: #6C5CE7; }
        }
        .badge {
          background: #ef4444; color: #fff; font-size: 12px; font-weight: 600;
          padding: 2px 10px; border-radius: 12px;
        }
      }
    }
    
    .empty-state {
      text-align: center; padding: 40px; color: #9ca3af;
      mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 12px; }
      p { margin: 0 0 8px; font-size: 16px; }
      .hint { font-size: 13px; }
    }
    
    .applications-list {
      display: flex; flex-direction: column; gap: 16px;
    }
    
    .application-card {
      border-radius: 16px;
      .provider-header {
        display: flex; justify-content: space-between; align-items: flex-start;
        padding: 16px;
        .provider-info {
          display: flex; align-items: center; gap: 12px;
          .avatar {
            width: 50px; height: 50px; border-radius: 50%;
            background: linear-gradient(135deg, #6C5CE7, #a29bfe);
            display: flex; align-items: center; justify-content: center;
            color: #fff; font-weight: 600; overflow: hidden;
            img { width: 100%; height: 100%; object-fit: cover; }
          }
          .provider-details {
            h4 { margin: 0 0 4px; font-size: 16px; }
            .badges {
              display: flex; gap: 8px;
              .badge-verified {
                display: flex; align-items: center; gap: 4px;
                background: #d1fae5; color: #065f46;
                padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: 600;
                mat-icon { font-size: 14px; width: 14px; height: 14px; }
              }
              .badge-reputation {
                display: flex; align-items: center; gap: 4px;
                background: #fef3c7; color: #92400e;
                padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: 600;
                mat-icon { font-size: 14px; width: 14px; height: 14px; }
              }
              .badge-missions {
                background: #e0e7ff; color: #3730a3;
                padding: 2px 8px; border-radius: 10px; font-size: 12px;
              }
            }
          }
        }
        .price-block { text-align: right;
          .label { display: block; font-size: 11px; color: #9ca3af; text-transform: uppercase; }
          .value { font-size: 18px; font-weight: 700; color: #3CB371; display: block; }
          .price-hint { font-size: 10px; color: #6b7280; }
        }
      }
      
      .application-content {
        padding: 16px;
        .mission-ref {
          margin: 0 0 12px; font-size: 14px; color: #6b7280;
          strong { color: #1f2937; }
        }
        .message-box {
          display: flex; gap: 12px;
          background: #f9fafb; padding: 12px; border-radius: 8px;
          mat-icon { color: #9ca3af; flex-shrink: 0; }
          p { margin: 0; font-size: 14px; line-height: 1.5; color: #374151; font-style: italic; }
        }
        .date { margin: 12px 0 0; font-size: 12px; color: #9ca3af; }
      }
      
      .actions {
        display: flex; justify-content: space-between; padding: 12px 16px;
        border-top: 1px solid #f3f4f6; align-items: center;
        .action-buttons { display: flex; gap: 8px; }
        .status-pill {
          font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 12px;
          background: #e5e7eb; color: #374151;
        }
      }
    }
  `]
})
export class MissionApplicationsComponent implements OnInit {
  @Input() missionId?: string;
  @Output() applicationAccepted = new EventEmitter<void>();
  
  private apiUrl = environment.apiUrl;
  applications: Application[] = [];
  loading = true;
  processing: string | null = null;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private missionService: MissionService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadApplications();
  }

  private h(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  loadApplications(): void {
    this.loading = true;
    const request$ = this.missionId
      ? this.http.get<any>(`${this.apiUrl}/missions/${this.missionId}/applications/`, { headers: this.h() })
      : this.missionService.getMyApplications();

    request$.subscribe({
      next: (res) => {
        const list = (Array.isArray(res) ? res : res?.results ?? []) as any[];
        const mapped = list.map(a => this.normalizeApplication(a));
        this.applications = this.missionId
          ? mapped
          : mapped.filter(a => a.status === 'pending');
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Erreur chargement candidatures', 'Fermer', { duration: 3000 });
      },
    });
  }

  private normalizeApplication(raw: any): Application {
    const mission = typeof raw.mission === 'object' && raw.mission?.title
      ? raw.mission
      : {
          id: String(raw.mission),
          title: raw.mission_title || 'Mission',
          budget: Number(raw.mission_budget || 0),
          currency: raw.mission_currency || 'XOF',
        };
    return {
      id: raw.id,
      mission,
      provider: raw.provider,
      message: raw.message || '',
      proposed_price: raw.proposed_price != null ? Number(raw.proposed_price) : undefined,
      status: raw.status,
      created_at: raw.created_at,
    };
  }

  acceptApplication(app: Application): void {
    this.processing = app.id;
    const missionId = app.mission.id;
    this.missionService.acceptApplication(missionId, app.id).subscribe({
      next: () => {
        this.processing = null;
        this.snackBar.open('Candidature acceptée ! Le prestataire est assigné.', 'Fermer', { 
          duration: 4000,
          panelClass: ['snack-success']
        });
        this.applicationAccepted.emit();
        this.loadApplications();
      },
      error: (err) => {
        this.processing = null;
        const msg = err.error?.error || 'Erreur lors de l\'acceptation';
        this.snackBar.open(msg, 'Fermer', { duration: 4000 });
      }
    });
  }

  rejectApplication(app: Application): void {
    this.processing = app.id;
    this.http.post(`${this.apiUrl}/missions/applications/${app.id}/reject/`, {}, { headers: this.h() }).subscribe({
      next: () => {
        this.processing = null;
        this.snackBar.open('Candidature refusée', 'Fermer', { duration: 3000 });
        this.loadApplications();
      },
      error: (err) => {
        this.processing = null;
        const msg = err.error?.error || 'Erreur lors du refus';
        this.snackBar.open(msg, 'Fermer', { duration: 4000 });
      }
    });
  }

  viewProviderProfile(app: Application): void {
    this.dialog.open(ProviderProfileDialogComponent, {
      width: '480px',
      data: app.provider,
    });
  }
}

@Component({
  selector: 'app-provider-profile-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatChipsModule],
  template: `
    <h2 mat-dialog-title>Profil prestataire</h2>
    <mat-dialog-content>
      <div class="profile-head">
        <div class="avatar">
          <img *ngIf="data.profile_picture" [src]="data.profile_picture" alt="" />
          <span *ngIf="!data.profile_picture">{{ data.first_name[0] }}{{ data.last_name[0] }}</span>
        </div>
        <div>
          <h3>{{ data.first_name }} {{ data.last_name }}</h3>
          <p class="loc" *ngIf="data.city">{{ data.city }}<span *ngIf="data.country">, {{ data.country }}</span></p>
          <div class="stats">
            <span *ngIf="data.reputation_score != null"><mat-icon>star</mat-icon> {{ data.reputation_score | number:'1.1-1' }}/100</span>
            <span *ngIf="data.completed_missions != null">{{ data.completed_missions }} missions</span>
            <span *ngIf="data.level" class="level">{{ data.level }}</span>
          </div>
        </div>
      </div>
      <p class="bio" *ngIf="data.bio">{{ data.bio }}</p>
      <mat-chip-set *ngIf="data.skills?.length">
        <mat-chip *ngFor="let skill of data.skills">{{ skill }}</mat-chip>
      </mat-chip-set>
      <p class="contact-note">
        <mat-icon>lock</mat-icon>
        Coordonnées masquées jusqu'à l'acceptation et la confirmation des paiements des deux parties.
      </p>
      <p class="avail" [class.on]="data.is_available">
        <mat-icon>{{ data.is_available ? 'check_circle' : 'cancel' }}</mat-icon>
        {{ data.is_available ? 'Disponible' : 'Indisponible' }}
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Fermer</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .profile-head { display: flex; gap: 16px; margin-bottom: 16px; }
    .avatar {
      width: 72px; height: 72px; border-radius: 50%; overflow: hidden;
      background: linear-gradient(135deg, #3CB371, #2ea361);
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-weight: 700; font-size: 22px; flex-shrink: 0;
      img { width: 100%; height: 100%; object-fit: cover; }
    }
    h3 { margin: 0 0 4px; font-size: 18px; }
    .loc { margin: 0 0 8px; color: #6b7280; font-size: 13px; }
    .stats { display: flex; flex-wrap: wrap; gap: 10px; font-size: 13px; color: #374151;
      span { display: inline-flex; align-items: center; gap: 4px; }
      mat-icon { font-size: 16px; width: 16px; height: 16px; color: #f59e0b; }
      .level { text-transform: capitalize; background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 8px; }
    }
    .bio { font-size: 14px; color: #4b5563; line-height: 1.5; margin: 0 0 12px; }
    .contact-note { display: flex; align-items: flex-start; gap: 6px; font-size: 12px; color: #6b7280;
      margin: 12px 0 0; padding: 10px; background: #f3f4f6; border-radius: 8px; line-height: 1.4;
      mat-icon { font-size: 16px; width: 16px; height: 16px; flex-shrink: 0; margin-top: 1px; }
    }
    .avail { display: flex; align-items: center; gap: 6px; font-size: 13px; margin: 8px 0 0; color: #9ca3af;
      &.on { color: #059669; }
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }
  `]
})
export class ProviderProfileDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: Application['provider']) {}
}
