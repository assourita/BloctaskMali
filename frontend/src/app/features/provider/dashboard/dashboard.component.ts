import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AuthService, User } from '../../../core/services/auth.service';
import { MissionService } from '../../../core/services/mission.service';
import { PaymentMethodFlowService } from '../../../core/services/payment-method-flow.service';
import { formatXOF, DEFAULT_MAP_CENTER } from '../../../core/constants/africa.constants';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-provider-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatDialogModule,
  ],
  template: `
    <div class="dash-page">
      <header class="dash-header">
        <div class="dash-header__text">
          <h1>Bonjour {{ (currentUser$ | async)?.first_name || 'Prestataire' }}</h1>
          <p>Mission en cours, revenus et opportunités proches</p>
        </div>
        <div class="dash-header__actions">
          <label class="dash-header__avail">
            <mat-slide-toggle
              color="primary"
              [checked]="isAvailable"
              (change)="onAvailabilityChange($event.checked)"
            ></mat-slide-toggle>
            {{ isAvailable ? 'Disponible' : 'Indisponible' }}
          </label>
          <button mat-flat-button color="primary" routerLink="/provider/missions/available">
            <mat-icon>search</mat-icon>
            Trouver des missions
          </button>
        </div>
      </header>

      <div class="dash-metrics">
        <div class="dash-metric">
          <span class="dash-metric__value">{{ totalEarnings }}</span>
          <span class="dash-metric__label">Total gagné</span>
          <span class="dash-metric__hint" *ngIf="earnedThisMonthLabel">
            dont {{ earnedThisMonthLabel }} ce mois
          </span>
        </div>
        <div class="dash-metric">
          <span class="dash-metric__value">{{ completedMissions }}</span>
          <span class="dash-metric__label">Missions terminées</span>
        </div>
        <div class="dash-metric">
          <span class="dash-metric__value">{{ averageRating }}</span>
          <span class="dash-metric__label">Note moyenne</span>
        </div>
        <div class="dash-metric">
          <span class="dash-metric__value">{{ reputationScore }}/100</span>
          <span class="dash-metric__label">Réputation · {{ reputationLevel }}</span>
        </div>
      </div>

      <nav class="dash-links" aria-label="Accès rapides">
        <a routerLink="/provider/deposit">
          <mat-icon>security</mat-icon>
          Caution ({{ depositAmount }} {{ currency || 'XOF' }})
        </a>
        <a routerLink="/provider/reputation">
          <mat-icon>trending_up</mat-icon>
          Ma réputation
        </a>
        <a routerLink="/provider/missions/available">
          <mat-icon>map</mat-icon>
          Carte des missions
        </a>
      </nav>

      <section class="dash-section">
        <div class="dash-section__head">
          <h2>Mission en cours</h2>
        </div>

        <div class="dash-list" *ngIf="currentMission; else noCurrent">
          <div class="dash-row">
            <div class="dash-row__main">
              <div class="dash-row__title">
                <h3>{{ currentMission.title }}</h3>
                <span class="dash-status dash-status--progress">En cours</span>
              </div>
              <div class="dash-row__meta">
                <span>
                  <mat-icon>location_on</mat-icon>
                  {{ currentMission.pickup }} → {{ currentMission.delivery }}
                </span>
                <span *ngIf="currentMission.deadline">
                  <mat-icon>schedule</mat-icon>
                  {{ currentMission.deadline }}
                </span>
                <span *ngIf="currentMission.client">
                  {{ currentMission.client.name }}
                  · {{ currentMission.client.rating }}
                </span>
              </div>

              <div class="dash-progress">
                <div class="dash-progress__labels">
                  <span>Progression</span>
                  <span>{{ currentMission.progress }}%</span>
                </div>
                <mat-progress-bar mode="determinate" [value]="currentMission.progress"></mat-progress-bar>
              </div>

              <div class="dash-row__actions">
                <button mat-stroked-button (click)="updateLocation()">
                  <mat-icon>gps_fixed</mat-icon>
                  Position
                </button>
                <button mat-stroked-button (click)="submitProof()">
                  <mat-icon>photo_camera</mat-icon>
                  Preuves
                </button>
                <button mat-flat-button color="primary" (click)="completeMission()">
                  <mat-icon>check_circle</mat-icon>
                  Terminer
                </button>
              </div>
            </div>
            <div class="dash-row__side">
              <span class="dash-row__price">{{ currentMission.budget }} {{ currentMission.currency }}</span>
            </div>
          </div>
        </div>
        <ng-template #noCurrent>
          <div class="dash-empty">
            Aucune mission en cours.
            <a routerLink="/provider/missions/available">Parcourir les missions</a>
          </div>
        </ng-template>
      </section>

      <section class="dash-section">
        <div class="dash-section__head">
          <h2>À proximité</h2>
          <a mat-button color="primary" routerLink="/provider/missions/available">Voir la carte</a>
        </div>

        <div class="dash-list" *ngIf="nearbyMissions.length; else noNearby">
          <div class="dash-row" *ngFor="let mission of nearbyMissions">
            <div class="dash-row__main">
              <div class="dash-row__title">
                <h3>{{ mission.title }}</h3>
              </div>
              <div class="dash-row__meta">
                <span>
                  <mat-icon>near_me</mat-icon>
                  {{ mission.distance }} km
                </span>
                <span>
                  <mat-icon>location_on</mat-icon>
                  {{ mission.pickup }} → {{ mission.delivery }}
                </span>
                <span>
                  <mat-icon>timer</mat-icon>
                  ~{{ mission.estimatedTime }} min
                </span>
              </div>
              <div class="dash-row__actions">
                <button mat-flat-button color="primary" (click)="applyToMission(mission)">
                  Postuler
                </button>
              </div>
            </div>
            <div class="dash-row__side">
              <span class="dash-row__price">{{ mission.budget }} {{ mission.currency }}</span>
            </div>
          </div>
        </div>
        <ng-template #noNearby>
          <div class="dash-empty">Aucune mission disponible à proximité.</div>
        </ng-template>
      </section>

      <section class="dash-section">
        <div class="dash-section__head">
          <h2>Cette semaine</h2>
        </div>
        <div class="dash-metrics">
          <div class="dash-metric">
            <span class="dash-metric__value">{{ weeklyEarnings }} {{ currency || 'XOF' }}</span>
            <span class="dash-metric__label">Revenus</span>
          </div>
          <div class="dash-metric">
            <span class="dash-metric__value">{{ weeklyMissions }}</span>
            <span class="dash-metric__label">Missions</span>
          </div>
          <div class="dash-metric">
            <span class="dash-metric__value">{{ avgCompletionTime }}h</span>
            <span class="dash-metric__label">Temps moyen</span>
          </div>
          <div class="dash-metric">
            <span class="dash-metric__value">{{ satisfactionRate }}%</span>
            <span class="dash-metric__label">Satisfaction</span>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .dash-empty a {
      display: inline-block;
      margin-left: 0.25rem;
      font-weight: 500;
    }
  `]
})
export class ProviderDashboardComponent implements OnInit {
  currentUser$: Observable<User | null>;

  totalEarnings = '0 FCFA';
  earnedThisMonthLabel = '';
  completedThisMonth = 0;
  currency = '';
  completedMissions = 0;
  averageRating = 4.5;
  responseTime = 1.5;

  reputationLevel = 'Bronze';
  reputationScore = 50;

  isAvailable = true;
  depositAmount = 25;

  currentMission: {
    id: string;
    title: string;
    budget: number;
    currency: string;
    pickup: string;
    delivery: string;
    deadline: string;
    progress: number;
    client?: { name: string; avatar?: string; rating: number };
  } | null = null;

  nearbyMissions: Array<{
    id: string;
    title: string;
    distance: number;
    budget: number;
    currency: string;
    pickup: string;
    delivery: string;
    estimatedTime: number;
  }> = [];

  weeklyEarnings = 0;
  weeklyMissions = 0;
  avgCompletionTime = 2.5;
  satisfactionRate = 98;

  constructor(
    private authService: AuthService,
    private missionService: MissionService,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private paymentMethodFlow: PaymentMethodFlowService,
    private router: Router,
  ) {
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit(): void {
    this.loadDashboard();
  }

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });
  }

  loadDashboard(): void {
    this.missionService.getDashboardStats('provider').subscribe({
      next: (s) => {
        this.completedMissions = s.completed_missions || 0;
        this.completedThisMonth = s.completed_this_month || 0;
        this.totalEarnings = formatXOF(Number(s.total_earned) || 0);
        const monthAmt = Number(s.earned_this_month) || 0;
        this.earnedThisMonthLabel = monthAmt > 0 ? formatXOF(monthAmt) : '';
        this.weeklyEarnings = monthAmt;
        this.reputationScore = s.reputation_score || 50;
        this.reputationLevel = (s.reputation_level || 'bronze').replace(/^./, c => c.toUpperCase());
      }
    });
    this.missionService.getMyMissions('provider').subscribe({
      next: (missions) => {
        const current = missions.find(m => m.status === 'in_progress' || m.status === 'accepted');
        this.currentMission = current ? {
          id: current.id,
          title: current.title,
          budget: Number(current.budget),
          currency: current.currency || 'XOF',
          pickup: current.pickup_address || '—',
          delivery: current.delivery_address || '—',
          deadline: current.deadline || '',
          progress: current.status === 'in_progress' ? 50 : 10,
          client: current.client ? {
            name: `${current.client.first_name} ${current.client.last_name?.[0] || ''}.`,
            rating: 4.5
          } : undefined
        } : null;
      }
    });
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        this.missionService.getAvailable(pos.coords.latitude, pos.coords.longitude).subscribe({
          next: (missions) => {
            this.nearbyMissions = missions.slice(0, 5).map(m => ({
              id: m.id,
              title: m.title,
              distance: 1,
              budget: Number(m.budget),
              currency: m.currency || 'XOF',
              pickup: m.pickup_address || '—',
              delivery: m.delivery_address || '—',
              estimatedTime: 30
            }));
          }
        });
      }, () => {
        this.missionService.getAvailable(DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng).subscribe({
          next: (missions) => {
            this.nearbyMissions = missions.slice(0, 5).map(m => ({
              id: m.id,
              title: m.title,
              distance: 2,
              budget: Number(m.budget),
              currency: m.currency || 'XOF',
              pickup: m.pickup_address || '—',
              delivery: m.delivery_address || '—',
              estimatedTime: 30
            }));
          }
        });
      });
    }
  }

  onAvailabilityChange(available: boolean): void {
    this.isAvailable = available;
    this.http.post(`${environment.apiUrl}/users/toggle-availability/`, {}, { headers: this.headers() }).subscribe({
      error: () => {
        this.isAvailable = !available;
        this.snackBar.open('Erreur mise à jour disponibilité', 'Fermer', { duration: 3000 });
      }
    });
  }

  updateLocation(): void {
    if (!this.currentMission) return;
    if (!navigator.geolocation) {
      this.snackBar.open('Géolocalisation non supportée', 'Fermer', { duration: 3000 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.http.post(
          `${environment.apiUrl}/tracking/locations/`,
          {
            mission: this.currentMission!.id,
            location_type: 'provider',
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          },
          { headers: this.headers() },
        ).subscribe({
          next: () => this.snackBar.open('Position envoyée', 'Fermer', { duration: 3000 }),
          error: () => this.snackBar.open('Erreur envoi GPS', 'Fermer', { duration: 3000 }),
        });
      },
      () => this.snackBar.open('Autorisez la géolocalisation', 'Fermer', { duration: 4000 }),
    );
  }

  submitProof(): void {
    if (!this.currentMission) return;
    this.router.navigate(['/provider/missions', this.currentMission.id], { fragment: 'proofs-section' });
  }

  completeMission(): void {
    if (!this.currentMission) return;
    this.missionService.submitProof(this.currentMission.id).subscribe({
      next: () => {
        this.snackBar.open('Preuves soumises — en attente de validation client', 'Fermer', { duration: 5000 });
        this.loadDashboard();
      },
      error: (err) => this.snackBar.open(err.error?.error || 'Erreur soumission', 'Fermer', { duration: 4000 }),
    });
  }

  applyToMission(mission: { id: string; title?: string }): void {
    this.paymentMethodFlow.ensurePaymentMethod(this.dialog).subscribe({
      next: (ready) => {
        if (ready) {
          this.submitApplication(mission);
        }
      },
    });
  }

  private submitApplication(mission: { id: string; title?: string }): void {
    const message = mission.title
      ? `Bonjour, je suis disponible pour cette mission « ${mission.title} ».`
      : '';
    this.missionService.applyToMission(mission.id, message).subscribe({
      next: () => {
        this.snackBar.open('Candidature envoyée !', 'Fermer', { duration: 4000 });
        this.loadDashboard();
      },
      error: (err) => {
        const body = err.error;
        if (body?.payment_method_required) {
          this.paymentMethodFlow.ensurePaymentMethod(this.dialog).subscribe({
            next: (ready) => { if (ready) this.submitApplication(mission); },
          });
          return;
        }
        if (body?.already_applied || body?.error?.includes?.('déjà postulé')) {
          this.snackBar.open('Vous avez déjà postulé à cette mission.', 'Fermer', { duration: 5000 });
        } else {
          this.snackBar.open(body?.error || 'Erreur candidature', 'Fermer', { duration: 4000 });
        }
      }
    });
  }
}
