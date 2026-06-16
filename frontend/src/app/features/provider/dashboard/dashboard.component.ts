import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSliderModule } from '@angular/material/slider';
import { Observable } from 'rxjs';
import { AuthService, User } from '../../../core/services/auth.service';
import { DashboardHeaderComponent } from '../../../shared/components/dashboard-header/dashboard-header.component';

@Component({
  selector: 'app-provider-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressBarModule,
    MatSliderModule,
    DashboardHeaderComponent
  ],
  template: `
    <app-dashboard-header></app-dashboard-header>
    
    <div class="dashboard-container">
      <!-- Welcome Section -->
      <div class="welcome-section">
        <h1>Bonjour {{ (currentUser$ | async)?.first_name || 'Prestataire' }} ! 👋</h1>
        <p>Prêt à trouver de nouvelles missions sur BlockTask ?</p>
      </div>
      
      <!-- Earnings Card -->
      <mat-card class="earnings-card">
        <div class="earnings-header">
          <div class="earnings-info">
            <h2>Mes revenus</h2>
            <div class="balance">
              <span class="amount">{{ totalEarnings }} {{ currency }}</span>
              <span class="label">Gagnés ce mois</span>
            </div>
            <div class="stats-row">
              <div class="stat">
                <span class="value">{{ completedMissions }}</span>
                <span class="label">Missions</span>
              </div>
              <div class="stat">
                <span class="value">{{ averageRating }}</span>
                <span class="label">Note moyenne</span>
              </div>
              <div class="stat">
                <span class="value">{{ responseTime }}h</span>
                <span class="label">Temps réponse</span>
              </div>
            </div>
          </div>
          <div class="reputation-badge" [class]="reputationLevel.toLowerCase()">
            <mat-icon>verified</mat-icon>
            <span>{{ reputationLevel }}</span>
            <span class="score">{{ reputationScore }}/100</span>
          </div>
        </div>
      </mat-card>

      <!-- Availability Toggle -->
      <mat-card class="availability-card">
        <div class="availability-content">
          <div class="availability-info">
            <h3>Disponibilité</h3>
            <p>Activez pour recevoir des missions automatiquement</p>
          </div>
          <div class="toggle-container">
            <mat-chip-listbox>
              <mat-chip-option 
                [selected]="isAvailable" 
                (selectionChange)="toggleAvailability($event)"
                color="primary"
              >
                {{ isAvailable ? 'Disponible' : 'Indisponible' }}
              </mat-chip-option>
            </mat-chip-listbox>
          </div>
        </div>
      </mat-card>

      <!-- Quick Actions -->
      <div class="quick-actions">
        <button mat-raised-button color="primary" routerLink="/provider/missions/available">
          <mat-icon>search</mat-icon>
          Trouver des missions
        </button>
        <button mat-stroked-button routerLink="/provider/deposit">
          <mat-icon>security</mat-icon>
          Ma caution ({{ depositAmount }} {{ currency }})
        </button>
        <button mat-stroked-button routerLink="/provider/reputation">
          <mat-icon>trending_up</mat-icon>
          Ma réputation
        </button>
      </div>

      <!-- Current Mission -->
      <mat-card class="current-mission" *ngIf="currentMission">
        <mat-card-header>
          <mat-card-title>Mission en cours</mat-card-title>
          <mat-chip-option color="accent" selected>En progression</mat-chip-option>
        </mat-card-header>
        
        <mat-card-content>
          <h3>{{ currentMission.title }}</h3>
          <div class="mission-meta">
            <span class="price">{{ currentMission.budget }} {{ currentMission.currency }}</span>
            <span class="separator">•</span>
            <span class="location">{{ currentMission.pickup }} → {{ currentMission.delivery }}</span>
            <span class="separator">•</span>
            <span class="deadline">⏰ {{ currentMission.deadline }}</span>
          </div>

          <div class="progress-section">
            <div class="progress-header">
              <span>Progression</span>
              <span>{{ currentMission.progress }}%</span>
            </div>
            <mat-progress-bar mode="determinate" [value]="currentMission.progress"></mat-progress-bar>
          </div>

          <div class="client-info">
            <img [src]="currentMission.client.avatar" alt="Client" class="avatar">
            <div class="client-details">
              <span class="name">{{ currentMission.client.name }}</span>
              <span class="rating">⭐ {{ currentMission.client.rating }}</span>
            </div>
          </div>

          <div class="action-buttons">
            <button mat-raised-button color="primary" (click)="updateLocation()">
              <mat-icon>gps_fixed</mat-icon>
              Mettre à jour ma position
            </button>
            <button mat-stroked-button color="accent" (click)="submitProof()">
              <mat-icon>photo_camera</mat-icon>
              Soumettre des preuves
            </button>
            <button mat-button color="warn" (click)="completeMission()">
              <mat-icon>check_circle</mat-icon>
              Marquer comme terminée
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Available Missions Preview -->
      <mat-card class="available-preview">
        <mat-card-header>
          <mat-card-title>Missions disponibles à proximité</mat-card-title>
          <button mat-button color="primary" routerLink="/provider/missions/available">
            Voir la carte
          </button>
        </mat-card-header>
        
        <mat-card-content>
          <div class="nearby-list">
            <div class="nearby-item" *ngFor="let mission of nearbyMissions">
              <div class="distance-badge">
                <mat-icon>near_me</mat-icon>
                <span>{{ mission.distance }} km</span>
              </div>
              <div class="mission-info">
                <h4>{{ mission.title }}</h4>
                <p class="location">{{ mission.pickup }} → {{ mission.delivery }}</p>
                <div class="meta">
                  <span class="price">{{ mission.budget }} {{ mission.currency }}</span>
                  <span class="time">⏱️ {{ mission.estimatedTime }} min</span>
                </div>
              </div>
              <button mat-raised-button color="primary" (click)="applyToMission(mission)">
                Postuler
              </button>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Performance Chart -->
      <mat-card class="performance-card">
        <mat-card-header>
          <mat-card-title>Performance cette semaine</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="performance-grid">
            <div class="perf-item">
              <mat-icon>payments</mat-icon>
              <span class="value">{{ weeklyEarnings }} {{ currency }}</span>
              <span class="label">Revenus</span>
            </div>
            <div class="perf-item">
              <mat-icon>assignment_turned_in</mat-icon>
              <span class="value">{{ weeklyMissions }}</span>
              <span class="label">Missions</span>
            </div>
            <div class="perf-item">
              <mat-icon>schedule</mat-icon>
              <span class="value">{{ avgCompletionTime }}h</span>
              <span class="label">Temps moyen</span>
            </div>
            <div class="perf-item">
              <mat-icon>thumb_up</mat-icon>
              <span class="value">{{ satisfactionRate }}%</span>
              <span class="label">Satisfaction</span>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .welcome-section {
      background: linear-gradient(135deg, #3CB371 0%, #2E8B57 100%);
      color: white;
      padding: 32px;
      border-radius: 16px;
      margin-bottom: 8px;
      
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

    .earnings-card {
      .earnings-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding: 24px;
      }

      h2 {
        margin: 0 0 16px 0;
        font-size: 20px;
        color: #6b7280;
      }

      .balance {
        margin-bottom: 24px;

        .amount {
          display: block;
          font-size: 36px;
          font-weight: 700;
          color: #1f2937;
        }

        .label {
          font-size: 14px;
          color: #9ca3af;
        }
      }

      .stats-row {
        display: flex;
        gap: 32px;

        .stat {
          display: flex;
          flex-direction: column;

          .value {
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
          }

          .label {
            font-size: 12px;
            color: #9ca3af;
          }
        }
      }

      .reputation-badge {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 20px 32px;
        border-radius: 16px;

        mat-icon {
          font-size: 32px;
          width: 32px;
          height: 32px;
        }

        span {
          font-weight: 600;
          font-size: 14px;
        }

        .score {
          font-size: 24px;
          font-weight: 700;
        }
      }

      .reputation-badge.platinum {
        background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
        color: #3730a3;
      }

      .reputation-badge.gold {
        background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
        color: #92400e;
      }

      .reputation-badge.silver {
        background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
        color: #4b5563;
      }
    }

    .availability-card {
      .availability-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px;
      }

      h3 {
        margin: 0 0 4px 0;
        font-size: 18px;
      }

      p {
        margin: 0;
        font-size: 14px;
        color: #6b7280;
      }
    }

    .quick-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .current-mission {
      mat-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }

      h3 {
        margin: 0 0 12px 0;
        font-size: 20px;
      }

      .mission-meta {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 20px;
        flex-wrap: wrap;

        .price {
          font-size: 18px;
          font-weight: 700;
          color: #059669;
        }

        .location {
          color: #6b7280;
        }

        .deadline {
          color: #f59e0b;
        }

        .separator {
          color: #d1d5db;
        }
      }

      .progress-section {
        background: #f9fafb;
        padding: 16px;
        border-radius: 8px;
        margin-bottom: 20px;

        .progress-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 14px;
          font-weight: 500;
        }
      }

      .client-info {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 20px;
        padding: 12px;
        background: #eff6ff;
        border-radius: 8px;

        .avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
        }

        .client-details {
          display: flex;
          flex-direction: column;

          .name {
            font-weight: 500;
          }

          .rating {
            font-size: 14px;
            color: #f59e0b;
          }
        }
      }

      .action-buttons {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }
    }

    .available-preview {
      mat-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }

      .nearby-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .nearby-item {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px;
        border: 1px solid #e5e7eb;
        border-radius: 12px;

        .distance-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 8px 12px;
          background: #dbeafe;
          color: #2563eb;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 500;

          mat-icon {
            font-size: 16px;
            width: 16px;
            height: 16px;
          }
        }

        .mission-info {
          flex: 1;

          h4 {
            margin: 0 0 4px 0;
            font-size: 16px;
          }

          .location {
            margin: 0 0 8px 0;
            font-size: 14px;
            color: #6b7280;
          }

          .meta {
            display: flex;
            gap: 16px;
            font-size: 14px;

            .price {
              font-weight: 600;
              color: #059669;
            }

            .time {
              color: #6b7280;
            }
          }
        }
      }
    }

    .performance-card {
      .performance-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 24px;
        padding: 16px;
      }

      .perf-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 8px;

        mat-icon {
          font-size: 28px;
          width: 28px;
          height: 28px;
          color: #3b82f6;
        }

        .value {
          font-size: 24px;
          font-weight: 700;
          color: #1f2937;
        }

        .label {
          font-size: 12px;
          color: #9ca3af;
        }
      }
    }

    @media (max-width: 768px) {
      .earnings-card .earnings-header {
        flex-direction: column;
        gap: 24px;
      }

      .quick-actions {
        flex-direction: column;
      }

      .current-mission .action-buttons {
        flex-direction: column;
      }

      .nearby-item {
        flex-direction: column;
        text-align: center;
      }

      .performance-card .performance-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `]
})
export class ProviderDashboardComponent implements OnInit {
  currentUser$: Observable<User | null>;
  
  // Earnings
  totalEarnings = 1250;
  currency = 'FCFA';
  completedMissions = 24;
  averageRating = 4.8;
  responseTime = 1.5;
  
  // Reputation
  reputationLevel = 'Gold';
  reputationScore = 87;
  
  // Availability
  isAvailable = true;
  
  // Deposit
  depositAmount = 25;
  
  // Current Mission
  currentMission = {
    id: 1,
    title: 'Livraison colis urgent - Zone industrielle',
    budget: 75,
    currency: 'FCFA',
    pickup: 'Cocody',
    delivery: 'Plateau',
    deadline: '18:30',
    progress: 45,
    client: {
      name: 'Amadou D.',
      avatar: 'assets/images/client1.jpg',
      rating: 4.9
    }
  };
  
  // Nearby Missions
  nearbyMissions = [
    {
      id: 1,
      title: 'Course pharmacie',
      distance: 0.8,
      budget: 30,
      currency: 'FCFA',
      pickup: 'Pharmacie du plateau',
      delivery: 'Cocody Angré',
      estimatedTime: 25
    },
    {
      id: 2,
      title: 'Livraison documents',
      distance: 1.2,
      budget: 20,
      currency: 'FCFA',
      pickup: 'Cocody',
      delivery: 'Marcory',
      estimatedTime: 20
    },
    {
      id: 3,
      title: 'Achat supermarché',
      distance: 2.1,
      budget: 45,
      currency: 'FCFA',
      pickup: 'Super U',
      delivery: 'Treichville',
      estimatedTime: 40
    }
  ];
  
  // Weekly Stats
  weeklyEarnings = 320;
  weeklyMissions = 8;
  avgCompletionTime = 2.5;
  satisfactionRate = 98;
  
  constructor(private authService: AuthService) {
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit(): void {}
  
  toggleAvailability(event: any): void {
    this.isAvailable = event.selected;
    console.log('Availability toggled:', this.isAvailable);
    // TODO: Appeler l'API
  }
  
  updateLocation(): void {
    console.log('Updating location...');
    // TODO: Geolocation API
  }
  
  submitProof(): void {
    console.log('Submitting proof...');
    // TODO: Rediriger vers page de preuves
  }
  
  completeMission(): void {
    console.log('Completing mission...');
    // TODO: API call
  }
  
  applyToMission(mission: any): void {
    console.log('Applying to mission:', mission);
    // TODO: API call
  }
}
