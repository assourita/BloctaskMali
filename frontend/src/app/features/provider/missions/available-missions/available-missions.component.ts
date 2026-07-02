import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MissionService } from '../../../../core/services/mission.service';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PaymentMethodFlowService } from '../../../../core/services/payment-method-flow.service';

interface Mission {
  id: string;
  title: string;
  description?: string;
  budget: number;
  currency: string;
  deposit_amount: number;
  pickup_address: string;
  delivery_address: string;
  deadline: string;
  expected_duration?: number;
  status: string;
  category?: { name: string; icon: string };
  category_name?: string;
  category_icon?: string;
  distance_km?: number;
  distance?: number;
  is_applied?: boolean;
  can_apply?: boolean;
  client?: {
    first_name: string;
    last_name: string;
    profile_picture?: string;
  };
}

@Component({
  selector: 'app-available-missions',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatProgressSpinnerModule, MatSnackBarModule, MatDialogModule,
  ],
  template: `
    <div class="page">

      <div class="page-hero">
        <div>
          <h1><mat-icon>search</mat-icon> Missions disponibles</h1>
          <p>{{ filteredMissions.length }} mission(s) ouvertes{{ enterpriseContext ? ' — postulez pour votre entreprise' : ' — inclut vos candidatures en attente' }}</p>
        </div>
        <button mat-stroked-button class="filter-btn" (click)="showFilters = !showFilters">
          <mat-icon>tune</mat-icon> Filtres
        </button>
      </div>

      <div class="filters-panel" *ngIf="showFilters">
        <div class="filter-grid">
          <div class="filter-field">
            <label>Distance max</label>
            <select [(ngModel)]="filters.maxDistance" (change)="applyFilters()">
              <option value="">Toutes</option>
              <option value="5">5 km</option>
              <option value="10">10 km</option>
              <option value="20">20 km</option>
            </select>
          </div>
          <div class="filter-field">
            <label>Budget min (XOF)</label>
            <select [(ngModel)]="filters.minBudget" (change)="applyFilters()">
              <option value="">Tous</option>
              <option value="5000">5 000+</option>
              <option value="10000">10 000+</option>
              <option value="50000">50 000+</option>
            </select>
          </div>
          <div class="filter-field">
            <label>Trier par</label>
            <select [(ngModel)]="filters.sortBy" (change)="applyFilters()">
              <option value="budget">Budget</option>
              <option value="deadline">Date limite</option>
              <option value="distance">Distance</option>
            </select>
          </div>
        </div>
      </div>

      <div class="loading" *ngIf="loading">
        <mat-spinner diameter="44"></mat-spinner>
        <p>Chargement des missions...</p>
      </div>

      <div class="empty" *ngIf="!loading && filteredMissions.length === 0">
        <mat-icon>search_off</mat-icon>
        <h3>Aucune mission disponible</h3>
        <p>Revenez plus tard ou modifiez vos filtres.</p>
        <button mat-raised-button color="primary" (click)="resetFilters()">Réinitialiser</button>
      </div>

      <div class="missions-grid" *ngIf="!loading && filteredMissions.length > 0">
        <article class="mission-card" *ngFor="let mission of filteredMissions">

          <div class="card-top">
            <div class="badges">
              <span class="cat-badge" *ngIf="mission.category_name || mission.category">
                <mat-icon>{{ mission.category_icon || mission.category?.icon || 'work' }}</mat-icon>
                {{ mission.category_name || mission.category?.name }}
              </span>
              <span class="dist-badge" *ngIf="mission.distance_km || mission.distance">
                <mat-icon>place</mat-icon> {{ (mission.distance_km || mission.distance) | number:'1.1-1' }} km
              </span>
              <span class="applied-badge" *ngIf="mission.is_applied">
                <mat-icon>check_circle</mat-icon> Candidature envoyée
              </span>
            </div>
            <div class="price-block">
              <span class="price">{{ mission.budget | number:'1.0-0' }} <small>{{ mission.currency }}</small></span>
              <span class="deposit" *ngIf="mission.deposit_amount">
                <mat-icon>security</mat-icon> Caution {{ mission.deposit_amount | number:'1.0-0' }}
              </span>
            </div>
          </div>

          <h2 class="title">{{ mission.title }}</h2>
          <p class="desc" *ngIf="mission.description">{{ mission.description }}</p>

          <div class="route">
            <div class="route-point">
              <span class="dot start"></span>
              <div>
                <span class="route-label">Départ</span>
                <span class="route-addr">{{ mission.pickup_address || 'Adresse non renseignée' }}</span>
              </div>
            </div>
            <div class="route-line"></div>
            <div class="route-point">
              <span class="dot end"></span>
              <div>
                <span class="route-label">Arrivée</span>
                <span class="route-addr">{{ mission.delivery_address || '—' }}</span>
              </div>
            </div>
          </div>

          <div class="meta-row">
            <span><mat-icon>schedule</mat-icon> {{ mission.deadline | date:'dd/MM/yy HH:mm' }}</span>
            <span *ngIf="mission.expected_duration"><mat-icon>timer</mat-icon> {{ mission.expected_duration }} min</span>
          </div>

          <div class="client-row" *ngIf="mission.client">
            <div class="client-avatar">
              <img *ngIf="mission.client.profile_picture" [src]="mission.client.profile_picture" alt="" />
              <span *ngIf="!mission.client.profile_picture">
                {{ mission.client.first_name[0] }}{{ mission.client.last_name[0] }}
              </span>
            </div>
            <span>{{ mission.client.first_name }} {{ mission.client.last_name }}</span>
          </div>

          <!-- Message optionnel -->
          <div class="apply-panel" *ngIf="messageForMissionId === mission.id">
            <label>Votre message au client (optionnel)</label>
            <textarea [(ngModel)]="applyMessage" rows="3"
              placeholder="Présentez-vous brièvement..."></textarea>
          </div>

          <div class="card-actions">
            <button mat-stroked-button type="button" [routerLink]="missionDetailLink(mission.id)">
              <mat-icon>visibility</mat-icon> Détails
            </button>
            <button mat-stroked-button type="button" class="msg-btn"
                    *ngIf="!mission.is_applied && mission.can_apply !== false"
                    (click)="toggleMessage(mission)"
                    [class.active]="messageForMissionId === mission.id">
              <mat-icon>edit</mat-icon>
            </button>
            <button mat-raised-button type="button" color="primary" class="apply-btn"
                    *ngIf="mission.can_apply !== false && !mission.is_applied"
                    (click)="applyToMission(mission)"
                    [disabled]="submittingId === mission.id">
              <mat-spinner *ngIf="submittingId === mission.id" diameter="20"></mat-spinner>
              <ng-container *ngIf="submittingId !== mission.id">
                <mat-icon>send</mat-icon> Postuler
              </ng-container>
            </button>
            <a mat-raised-button class="applied-btn" *ngIf="mission.is_applied"
               [routerLink]="['/provider/missions']" [queryParams]="{ tab: 'pending' }">
              <mat-icon>check_circle</mat-icon> Déjà postulé — voir suivi
            </a>
            <button mat-raised-button type="button" class="unavailable-btn" disabled
                    *ngIf="!mission.is_applied && mission.can_apply === false">
              <mat-icon>block</mat-icon> Indisponible
            </button>
          </div>
        </article>
      </div>

      <div class="pagination" *ngIf="!loading && totalPages > 1">
        <button mat-icon-button [disabled]="currentPage === 1" (click)="changePage(currentPage - 1)">
          <mat-icon>chevron_left</mat-icon>
        </button>
        <span>Page {{ currentPage }} / {{ totalPages }}</span>
        <button mat-icon-button [disabled]="currentPage === totalPages" (click)="changePage(currentPage + 1)">
          <mat-icon>chevron_right</mat-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 1200px; margin: 0 auto; }

    .page-hero {
      display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;
      background: linear-gradient(135deg, #3CB371 0%, #2ea361 55%, #249653 100%);
      color: #fff; border-radius: 16px; padding: 24px 28px; margin-bottom: 20px;
      box-shadow: 0 4px 16px rgba(60, 179, 113, 0.25);
      h1 { margin: 0 0 6px; font-size: 22px; display: flex; align-items: center; gap: 10px; }
      p { margin: 0; opacity: 0.92; font-size: 14px; }
      .filter-btn { color: #fff; border-color: rgba(255,255,255,0.55); background: rgba(255,255,255,0.12); }
    }

    .filters-panel {
      background: #fff; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }
    .filter-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
    .filter-field label { display: block; font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; margin-bottom: 4px; }
    .filter-field select { width: 100%; padding: 9px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; }

    .loading, .empty { text-align: center; padding: 48px 24px; color: #6b7280; }
    .empty mat-icon { font-size: 56px; width: 56px; height: 56px; color: #d1d5db; }
    .empty h3 { margin: 12px 0 8px; color: #374151; }

    .missions-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 20px;
    }

    .mission-card {
      background: #fff; border-radius: 16px; padding: 0; overflow: hidden;
      box-shadow: 0 2px 12px rgba(0,0,0,0.07);
      border: 1px solid #eef0f2;
      transition: box-shadow 0.2s, transform 0.2s;
      &:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.1); transform: translateY(-2px); }
    }

    .card-top {
      background: linear-gradient(135deg, #f0faf4 0%, #e8f5e9 100%);
      padding: 16px 20px; display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;
    }
    .badges { display: flex; flex-wrap: wrap; gap: 8px; }
    .cat-badge, .dist-badge {
      display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600;
      padding: 4px 10px; border-radius: 20px;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }
    .cat-badge { background: #dbeafe; color: #1e40af; }
    .dist-badge { background: #f3f4f6; color: #6b7280; }
    .applied-badge {
      display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600;
      padding: 4px 10px; border-radius: 20px; background: #d1fae5; color: #065f46;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }

    .price-block { text-align: right; }
    .price { font-size: 22px; font-weight: 800; color: #00b894; display: block; small { font-size: 13px; font-weight: 600; } }
    .deposit {
      display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: #92400e;
      background: #fef3c7; padding: 3px 8px; border-radius: 10px; margin-top: 4px;
      mat-icon { font-size: 12px; width: 12px; height: 12px; }
    }

    .title { margin: 16px 20px 8px; font-size: 17px; font-weight: 700; color: #1a1a2e; line-height: 1.3; }
    .desc { margin: 0 20px 12px; font-size: 13px; color: #6b7280; line-height: 1.5;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }

    .route { margin: 0 20px 12px; padding: 12px; background: #f8fafc; border-radius: 10px; }
    .route-point { display: flex; gap: 10px; align-items: flex-start; }
    .dot { width: 10px; height: 10px; border-radius: 50%; margin-top: 4px; flex-shrink: 0;
      &.start { background: #3b82f6; } &.end { background: #00b894; }
    }
    .route-line { width: 2px; height: 12px; background: #e5e7eb; margin: 2px 0 2px 4px; }
    .route-label { font-size: 10px; text-transform: uppercase; color: #9ca3af; font-weight: 700; display: block; }
    .route-addr { font-size: 13px; color: #374151; font-weight: 500; }

    .meta-row {
      display: flex; flex-wrap: wrap; gap: 16px; margin: 0 20px 12px; font-size: 13px; color: #6b7280;
      span { display: flex; align-items: center; gap: 4px; mat-icon { font-size: 16px; width: 16px; height: 16px; } }
    }

    .client-row {
      display: flex; align-items: center; gap: 10px; margin: 0 20px 16px; padding-top: 12px;
      border-top: 1px solid #f3f4f6; font-size: 14px; font-weight: 500; color: #374151;
    }
    .client-avatar {
      width: 32px; height: 32px; border-radius: 50%; overflow: hidden; background: #3CB371;
      display: flex; align-items: center; justify-content: center; color: #fff; font-size: 12px; font-weight: 700;
      img { width: 100%; height: 100%; object-fit: cover; }
    }

    .apply-panel {
      margin: 0 16px 12px; padding: 14px; background: #f0faf4; border-radius: 10px; border: 1px solid #a7f3d0;
      label { font-size: 12px; font-weight: 600; color: #047857; display: block; margin-bottom: 6px; }
      textarea { width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #d1d5db; border-radius: 8px;
        font-family: inherit; font-size: 14px; resize: vertical; }
    }

    .card-actions {
      display: flex; gap: 10px; padding: 0 16px 16px; align-items: center;
      .apply-btn { flex: 1; min-height: 42px; }
      .applied-btn { flex: 1; background: #d1fae5 !important; color: #065f46 !important; opacity: 1 !important;
        cursor: pointer; text-decoration: none; }
      .unavailable-btn { flex: 1; opacity: 0.7; }
      .msg-btn { flex-shrink: 0; &.active { background: #f0faf4; color: #3CB371; } }
    }

    .pagination { display: flex; justify-content: center; align-items: center; gap: 12px; margin-top: 28px; }
  `]
})
export class AvailableMissionsComponent implements OnInit {
  missions: Mission[] = [];
  filteredMissions: Mission[] = [];
  loading = true;
  showFilters = false;
  messageForMissionId: string | null = null;
  applyMessage = '';
  submittingId: string | null = null;

  filters = { maxDistance: '', minBudget: '', sortBy: 'budget' };
  currentPage = 1;
  totalPages = 1;
  pageSize = 12;

  constructor(
    private missionService: MissionService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private paymentMethodFlow: PaymentMethodFlowService,
    private route: ActivatedRoute,
  ) {}

  get enterpriseContext(): boolean {
    return !!this.route.snapshot.data['enterpriseContext'];
  }

  missionDetailLink(id: string): string[] {
    return this.enterpriseContext
      ? ['/enterprise/missions/available', id]
      : ['/provider/missions', id];
  }

  ngOnInit(): void { this.loadMissions(); }

  loadMissions(): void {
    this.loading = true;
    forkJoin({
      missions: this.missionService.listFunded(this.currentPage, this.pageSize, this.enterpriseContext),
      applications: this.missionService.getMyApplications('provider'),
    }).subscribe({
      next: ({ missions: response, applications }) => {
        const appliedIds = new Set(
          applications.filter(a => a.status === 'pending').map(a => a.mission)
        );
        const list = response.results || [];
        this.missions = list.map(m => ({
          ...m,
          distance: (m as any).distance_km ?? (m as any).distance,
          category: m.category || ((m as any).category_name
            ? { name: (m as any).category_name, icon: (m as any).category_icon || 'work' }
            : undefined),
          is_applied: (m as any).is_applied || appliedIds.has(m.id),
          can_apply: appliedIds.has(m.id) ? false : (m as any).can_apply,
        })) as Mission[];
        this.totalPages = Math.max(1, Math.ceil((response.count || this.missions.length) / this.pageSize));
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Erreur chargement missions', 'Fermer', { duration: 3000 });
      },
    });
  }

  applyFilters(): void {
    let filtered = [...this.missions];
    if (this.filters.maxDistance) {
      filtered = filtered.filter(m => (m.distance || 999) <= parseInt(this.filters.maxDistance, 10));
    }
    if (this.filters.minBudget) {
      filtered = filtered.filter(m => m.budget >= parseInt(this.filters.minBudget, 10));
    }
    filtered.sort((a, b) => {
      switch (this.filters.sortBy) {
        case 'budget': return b.budget - a.budget;
        case 'deadline': return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        case 'distance': return (a.distance || 999) - (b.distance || 999);
        default: return 0;
      }
    });
    this.filteredMissions = filtered;
  }

  resetFilters(): void {
    this.filters = { maxDistance: '', minBudget: '', sortBy: 'budget' };
    this.applyFilters();
  }

  changePage(page: number): void {
    this.currentPage = page;
    this.loadMissions();
  }

  toggleMessage(mission: Mission): void {
    if (this.messageForMissionId === mission.id) {
      this.messageForMissionId = null;
      return;
    }
    this.messageForMissionId = mission.id;
    if (!this.applyMessage) {
      this.applyMessage = `Bonjour, je suis disponible pour cette mission « ${mission.title} ».`;
    }
  }

  applyToMission(mission: Mission): void {
    if (this.submittingId) return;

    this.paymentMethodFlow.ensurePaymentMethod(this.dialog).subscribe({
      next: (ready) => {
        if (ready) {
          this.submitApplication(mission);
        }
      },
    });
  }

  private submitApplication(mission: Mission): void {
    this.submittingId = mission.id;
    const message = this.messageForMissionId === mission.id
      ? this.applyMessage.trim()
      : `Bonjour, je suis disponible pour cette mission « ${mission.title} ».`;

    this.missionService.applyToMission(mission.id, message).subscribe({
      next: () => {
        this.submittingId = null;
        this.messageForMissionId = null;
        this.applyMessage = '';
        this.snackBar.open(
          this.enterpriseContext
            ? 'Candidature envoyée ! Suivez-la dans Missions reçues ou commandées.'
            : 'Candidature envoyée ! Suivez-la dans Mes missions → En attente.',
          'Fermer',
          {
          duration: 5000,
          panelClass: ['snack-success'],
        });
        const m = this.missions.find(x => x.id === mission.id);
        if (m) {
          m.is_applied = true;
          m.can_apply = false;
        }
        this.applyFilters();
      },
      error: (err) => {
        this.submittingId = null;
        if (err.error?.payment_method_required) {
          this.paymentMethodFlow.ensurePaymentMethod(this.dialog).subscribe({
            next: (ready) => { if (ready) this.submitApplication(mission); },
          });
          return;
        }
        const msg = this.parseApplyError(err);
        this.snackBar.open(msg, 'Fermer', { duration: 6000 });
        if (err.error?.already_applied) {
          const m = this.missions.find(x => x.id === mission.id);
          if (m) {
            m.is_applied = true;
            m.can_apply = false;
          }
          this.applyFilters();
        }
      },
    });
  }

  private parseApplyError(err: any): string {
    if (err.status === 403) {
      return 'Accès refusé : vérifiez que vous êtes en espace Prestataire et que votre disponibilité est activée (Mon profil).';
    }
    const body = err.error;
    if (body?.already_applied || body?.error?.includes?.('déjà postulé')) {
      return 'Vous avez déjà postulé à cette mission. Consultez Mes missions pour le suivi.';
    }
    if (body?.payment_method_required) {
      return 'Ajoutez une méthode Mobile Money pour recevoir vos gains.';
    }
    if (typeof body === 'string') return body;
    if (body?.error) return body.error;
    if (body?.detail) return body.detail;
    if (body?.non_field_errors?.length) return String(body.non_field_errors[0]);
    for (const key of Object.keys(body || {})) {
      const val = body[key];
      if (Array.isArray(val) && val[0]) return String(val[0]);
    }
    return 'Erreur lors de la candidature';
  }
}
