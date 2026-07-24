import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { MissionService } from '../../../core/services/mission.service';
import { BlockchainService } from '../../../core/services/blockchain.service';
import { Web3Service } from '../../../core/services/web3.service';
import { lastValueFrom } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

interface Mission {
  id: string;
  title: string;
  description: string;
  budget: number;
  currency: string;
  status: 'pending' | 'funded' | 'accepted' | 'in_progress' | 'submitted' | 'completed' | 'cancelled' | 'disputed' | 'expired';
  pickup_address: string;
  delivery_address: string;
  deadline: string;
  progress?: number;
  client: {
    first_name: string;
    last_name: string;
    profile_picture?: string;
    phone_number?: string;
  };
  created_at: string;
  started_at?: string;
  completed_at?: string;
  rated?: boolean;
  deposit_paid?: boolean;
  required_deposit?: number;
  deposit_deadline?: string;
  mission_contract_id?: number;
  blockchain_status?: string;
}

@Component({
  selector: 'app-provider-missions',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    MatButtonModule, MatIconModule,
    MatProgressBarModule, MatSnackBarModule,
  ],
  template: `
    <div class="dash-page">
      <header class="dash-header">
        <div class="dash-header__text">
          <h1>Mes missions assignées</h1>
          <p>Missions où vous êtes prestataire retenu</p>
        </div>
        <div class="dash-header__actions">
          <a mat-stroked-button routerLink="/provider/missions/solicitations">
            <mat-icon>mail</mat-icon>
            Sollicitations
          </a>
        </div>
      </header>

      <div class="dash-metrics">
        <div class="dash-metric">
          <span class="dash-metric__value">{{ stats.total }}</span>
          <span class="dash-metric__label">Total missions</span>
        </div>
        <div class="dash-metric">
          <span class="dash-metric__value">{{ stats.active }}</span>
          <span class="dash-metric__label">En cours</span>
        </div>
        <div class="dash-metric">
          <span class="dash-metric__value">{{ stats.completed }}</span>
          <span class="dash-metric__label">Terminées</span>
        </div>
        <div class="dash-metric">
          <span class="dash-metric__value">{{ stats.earnings | number }} FCFA</span>
          <span class="dash-metric__label">Gagnés ce mois</span>
        </div>
      </div>

      <nav class="pm-tabs" aria-label="Filtres missions">
        <button type="button" class="pm-tab" [class.active]="selectedTab === 0" (click)="onTabChange(0)">
          En cours
          <span class="pm-count" *ngIf="activeMissions.length">{{ activeMissions.length }}</span>
        </button>
        <button type="button" class="pm-tab" [class.active]="selectedTab === 1" (click)="onTabChange(1)">
          Historique
        </button>
        <button type="button" class="pm-tab" [class.active]="selectedTab === 2" (click)="onTabChange(2)">
          En attente
          <span class="pm-count" *ngIf="pendingApplications.length">{{ pendingApplications.length }}</span>
        </button>
      </nav>

      <!-- En cours -->
      <section class="dash-section" *ngIf="selectedTab === 0">
        <div class="dash-empty" *ngIf="activeMissions.length === 0">
          Aucune mission en cours.
          <a routerLink="/provider/missions/available">Trouver des missions</a>
        </div>

        <div class="dash-list" *ngIf="activeMissions.length > 0">
          <div
            class="dash-row pm-row"
            [class.pm-row--highlight]="highlightMissionId === mission.id"
            [id]="'mission-' + mission.id"
            *ngFor="let mission of activeMissions"
          >
            <div class="dash-row__main">
              <div class="dash-row__title">
                <h3>{{ mission.title }}</h3>
                <span class="dash-status" [ngClass]="statusClass(mission.status)">
                  {{ getStatusLabel(mission.status) }}
                </span>
                <span class="pm-deadline" *ngIf="getTimeRemaining(mission) as remaining"
                      [class.pm-deadline--late]="remaining === 'En retard'">
                  {{ remaining }}
                </span>
              </div>

              <div class="dash-row__meta">
                <span *ngIf="mission.pickup_address || mission.delivery_address">
                  <mat-icon>location_on</mat-icon>
                  {{ mission.pickup_address || '—' }} → {{ mission.delivery_address || '—' }}
                </span>
                <span>
                  <mat-icon>person</mat-icon>
                  {{ mission.client.first_name }} {{ mission.client.last_name }}
                </span>
              </div>

              <div class="dash-progress" *ngIf="mission.status === 'in_progress'">
                <div class="dash-progress__labels">
                  <span>Progression</span>
                  <span>{{ mission.progress || 0 }}%</span>
                </div>
                <mat-progress-bar mode="determinate" [value]="mission.progress || 0"></mat-progress-bar>
              </div>

              <div class="pm-alert" *ngIf="mission.status === 'accepted' && !mission.deposit_paid">
                <strong>Caution requise</strong>
                Déposez {{ mission.required_deposit | number:'1.0-0' }} {{ mission.currency || 'XOF' }}
                <ng-container *ngIf="mission.deposit_deadline">
                  avant {{ mission.deposit_deadline | date:'HH:mm' }}
                </ng-container>
                pour démarrer.
              </div>

              <div class="dash-row__actions">
                <button mat-stroked-button type="button" (click)="viewMissionDetails(mission)">Détails</button>
                <button mat-stroked-button type="button" (click)="openMissionChat(mission)">
                  <mat-icon>chat</mat-icon>
                  Chat
                </button>
                <button mat-flat-button color="primary" (click)="payDeposit(mission)"
                        *ngIf="mission.status === 'accepted' && !mission.deposit_paid">
                  Déposer et démarrer
                </button>
                <button mat-flat-button color="primary" type="button" (click)="viewMissionProofs(mission)"
                        *ngIf="mission.status === 'in_progress'">
                  Preuves
                </button>
                <button mat-flat-button color="primary" (click)="completeMission(mission)"
                        *ngIf="mission.status === 'submitted'">
                  Finaliser
                </button>
              </div>
            </div>
            <div class="dash-row__side">
              <span class="dash-row__price">{{ mission.budget | number }} FCFA</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Historique -->
      <section class="dash-section" *ngIf="selectedTab === 1">
        <div class="dash-empty" *ngIf="completedMissions.length === 0">
          Aucun historique pour le moment.
        </div>

        <div class="dash-list" *ngIf="completedMissions.length > 0">
          <div class="dash-row" *ngFor="let mission of completedMissions">
            <div class="dash-row__main">
              <div class="dash-row__title">
                <h3>{{ mission.title }}</h3>
                <span class="dash-status" [ngClass]="statusClass(mission.status)">
                  {{ mission.status === 'completed' ? 'Terminée' : getStatusLabel(mission.status) }}
                </span>
              </div>
              <div class="dash-row__meta">
                <span>{{ mission.client.first_name }} {{ mission.client.last_name }}</span>
                <span>{{ mission.completed_at || mission.created_at | date:'dd MMM yyyy' }}</span>
              </div>
              <div class="dash-row__actions">
                <button mat-stroked-button type="button" (click)="viewMissionDetails(mission)">Détails</button>
              </div>
            </div>
            <div class="dash-row__side">
              <span class="dash-row__price">{{ mission.budget | number }} FCFA</span>
            </div>
          </div>
        </div>
      </section>

      <!-- En attente -->
      <section class="dash-section" *ngIf="selectedTab === 2">
        <div class="dash-empty" *ngIf="pendingApplications.length === 0">
          Aucune candidature en attente.
        </div>

        <div class="dash-list" *ngIf="pendingApplications.length > 0">
          <div class="dash-row" *ngFor="let app of pendingApplications">
            <div class="dash-row__main">
              <div class="dash-row__title">
                <h3>{{ app.mission_title }}</h3>
                <span class="dash-status dash-status--accepted">En attente</span>
              </div>
              <div class="dash-row__meta">
                <span>Postulé le {{ app.created_at | date:'dd MMM yyyy à HH:mm' }}</span>
              </div>
              <p class="pm-msg" *ngIf="app.message">« {{ app.message }} »</p>
              <div class="dash-row__actions">
                <button mat-button color="warn" (click)="cancelApplication(app.id)">Annuler</button>
              </div>
            </div>
            <div class="dash-row__side">
              <span class="dash-row__price">{{ app.mission_budget | number }} {{ app.mission_currency || 'XOF' }}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .pm-tabs {
      display: flex;
      gap: 0;
      border-bottom: 1px solid var(--bt-border, #e5e7eb);
    }

    .pm-tab {
      appearance: none;
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      padding: 0.625rem 1rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--bt-muted, #6b7280);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;

      &.active {
        color: var(--bt-ink, #111827);
        border-bottom-color: var(--bt-brand, #16a34a);
      }

      &:hover { color: var(--bt-ink, #111827); }
    }

    .pm-count {
      font-size: 0.6875rem;
      font-weight: 600;
      background: var(--gray-100, #f3f4f6);
      color: var(--gray-600, #4b5563);
      padding: 0.1rem 0.4rem;
      border-radius: 999px;
      min-width: 1.25rem;
      text-align: center;
    }

    .pm-tab.active .pm-count {
      background: var(--bt-brand-soft, #dcfce7);
      color: var(--primary-700, #15803d);
    }

    .pm-deadline {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--bt-muted, #6b7280);

      &--late { color: #dc2626; }
    }

    .pm-alert {
      font-size: 0.8125rem;
      color: #92400e;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 0.5rem;
      padding: 0.625rem 0.75rem;
      line-height: 1.4;

      strong {
        display: block;
        margin-bottom: 0.15rem;
        color: #78350f;
      }
    }

    .pm-msg {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--bt-muted, #6b7280);
      font-style: italic;
    }

    .pm-row--highlight {
      box-shadow: inset 3px 0 0 var(--bt-brand, #16a34a);
      background: #f0fdf4;
    }

    .dash-empty a {
      margin-left: 0.25rem;
      font-weight: 500;
    }
  `]
})
export class ProviderMissionsComponent implements OnInit {
  private apiUrl = environment.apiUrl;

  activeMissions: Mission[] = [];
  completedMissions: Mission[] = [];
  pendingApplications: any[] = [];
  selectedTab = 0;
  highlightMissionId = '';

  private pendingDepositMissionId = '';
  private depositRedirectHandled = false;

  stats = { total: 0, active: 0, completed: 0, earnings: 0 };

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private missionService: MissionService,
    private blockchainService: BlockchainService,
    private web3Service: Web3Service,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.loadMissions();
    this.loadStats();
    this.route.queryParams.subscribe(params => {
      if (params['tab'] === 'pending') {
        this.selectedTab = 2;
      }
      if (params['deposit']) {
        this.pendingDepositMissionId = params['deposit'];
        this.depositRedirectHandled = false;
        this.selectedTab = 0;
        this.tryHandleDepositRedirect();
      }
    });
  }

  private clearDepositQueryParam(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { deposit: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private tryHandleDepositRedirect(): void {
    if (this.depositRedirectHandled || !this.pendingDepositMissionId) return;

    const mission = this.activeMissions.find(m => m.id === this.pendingDepositMissionId);
    if (!mission) return;

    this.depositRedirectHandled = true;
    this.highlightMissionId = mission.id;
    this.pendingDepositMissionId = '';
    this.clearDepositQueryParam();

    setTimeout(() => {
      document.getElementById(`mission-${mission.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);

    if (mission.status === 'accepted' && !mission.deposit_paid) {
      this.snackBar.open(
        'Mission acceptée — déposez votre caution pour la démarrer',
        'OK',
        { duration: 6000 },
      );
      setTimeout(() => this.payDeposit(mission), 400);
    }
  }

  private h(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  loadMissions(): void {
    this.missionService.getMyMissions('provider').subscribe({
      next: (missions) => {
        const activeStatuses = ['accepted', 'in_progress', 'submitted'];
        const doneStatuses = ['completed', 'cancelled', 'disputed'];
        this.activeMissions = missions.filter(m => activeStatuses.includes(m.status)) as Mission[];
        this.completedMissions = missions.filter(m => doneStatuses.includes(m.status)) as Mission[];
        this.tryHandleDepositRedirect();
      },
      error: () => this.snackBar.open('Erreur chargement missions', 'Fermer', { duration: 3000 }),
    });

    this.missionService.getMyApplications('provider').subscribe({
      next: (apps) => {
        this.pendingApplications = apps.filter(a => a.status === 'pending');
      },
      error: () => {},
    });
  }

  loadStats(): void {
    this.http.get<any>(`${this.apiUrl}/users/stats/`, { headers: this.h() }).subscribe({
      next: (res) => {
        this.stats = {
          total: res.total_missions || 0,
          active: res.active_missions || 0,
          completed: res.completed_missions || 0,
          earnings: res.total_earned || 0
        };
      }
    });
  }

  onTabChange(index: number): void {
    this.selectedTab = index;
    if (index === 0) this.loadMissions();
    if (index === 2) {
      this.missionService.getMyApplications('provider').subscribe({
        next: (apps) => { this.pendingApplications = apps.filter(a => a.status === 'pending'); },
      });
    }
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      in_progress: 'dash-status--progress',
      submitted: 'dash-status--validate',
      accepted: 'dash-status--accepted',
      completed: 'dash-status--progress',
      cancelled: '',
      disputed: '',
    };
    return map[status] || '';
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      pending: 'En attente',
      funded: 'Financée',
      accepted: 'Acceptée',
      in_progress: 'En cours',
      submitted: 'Preuves soumises',
      completed: 'Terminée',
      cancelled: 'Annulée',
      expired: 'Expirée',
      disputed: 'Litige'
    };
    return labels[status] || status;
  }

  getTimeRemaining(mission: Mission | string | null | undefined): string {
    const m = typeof mission === 'string' || !mission ? null : mission;
    const deadline = typeof mission === 'string' ? mission : mission?.deadline;
    if (!deadline) return '';
    const status = (m?.status || '') as string;
    const terminalLabels: Record<string, string> = {
      completed: 'Terminée',
      cancelled: 'Annulée',
      expired: 'Expirée',
      disputed: 'Litige',
    };
    if (status in terminalLabels) return terminalLabels[status];
    const diff = new Date(deadline).getTime() - Date.now();
    if (diff < 0) return 'En retard';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 24) return `${hours}h restantes`;
    const days = Math.floor(hours / 24);
    return `${days}j restants`;
  }

  viewMissionDetails(mission: Mission): void {
    if (!mission?.id) {
      this.snackBar.open('Identifiant de mission manquant', 'Fermer', { duration: 3000 });
      return;
    }
    this.router.navigate(['/provider/missions', mission.id]);
  }

  viewMissionProofs(mission: Mission): void {
    if (!mission?.id) {
      this.snackBar.open('Identifiant de mission manquant', 'Fermer', { duration: 3000 });
      return;
    }
    this.router.navigate(['/provider/missions', mission.id], { queryParams: { section: 'proofs' } });
  }

  openMissionChat(mission: Mission): void {
    if (!mission?.id) return;
    this.router.navigate(['/provider/missions', mission.id], { queryParams: { section: 'chat' } });
  }

  payDeposit(mission: Mission): void {
    this.missionService.payDeposit(mission.id).subscribe({
      next: () => {
        mission.deposit_paid = true;
        this.snackBar.open('Caution déposée — mission démarrée', 'Fermer', { duration: 4000 });
        this.anchorProviderDepositOnChain(mission);
        this.loadMissions();
      },
      error: (e) => {
        const body = e.error;
        if (body?.required_deposit != null && body?.current_balance != null) {
          this.snackBar.open(
            `Solde insuffisant (${body.current_balance} XOF). Alimentez via Mobile Money dans Caution.`,
            'Alimenter',
            { duration: 8000 },
          ).onAction().subscribe(() => this.router.navigate(['/provider/deposit']));
        } else {
          this.snackBar.open(body?.error || 'Erreur dépôt caution', 'Fermer', { duration: 5000 });
        }
        if (body?.deposit_expired) {
          this.loadMissions();
        }
      },
    });
  }

  private async anchorProviderDepositOnChain(mission: Mission): Promise<void> {
    if (!mission.mission_contract_id) return;

    try {
      const status = await lastValueFrom(this.blockchainService.getStatus());
      if (!status.blockchain_enabled && !status.escrow_address) return;

      if (!this.web3Service.getAddress()) {
        await this.web3Service.connectWallet();
      }

      const ethAmount = this.blockchainService.xofToTestEth(Number(mission.required_deposit) || 5000);
      const tx = await this.web3Service.acceptMissionOnChain(mission.mission_contract_id, ethAmount);
      const waitResult: any = await tx.wait();
      const receipt = waitResult?.receipt ?? waitResult;

      await lastValueFrom(this.blockchainService.recordProviderDeposit({
        mission_id: mission.id,
        tx_hash: tx.hash,
        block_number: receipt?.blockNumber,
        gas_used: receipt?.gasUsed ? Number(receipt.gasUsed) : undefined,
      }));

      this.snackBar.open('Caution ancrée sur Sepolia', 'Fermer', { duration: 4000 });
    } catch (err) {
      console.warn('Ancrage caution blockchain optionnel:', err);
    }
  }

  completeMission(mission: Mission): void {
    this.http.post(`${this.apiUrl}/missions/${mission.id}/complete/`, {}, { headers: this.h() }).subscribe({
      next: () => {
        this.snackBar.open('Mission finalisée avec succès !', 'Fermer', { duration: 3000 });
        this.loadMissions();
      },
      error: (err) => {
        const msg = err.error?.error || 'Erreur lors de la finalisation';
        this.snackBar.open(msg, 'Fermer', { duration: 4000 });
      }
    });
  }

  cancelApplication(appId: string): void {
    this.http.post(`${this.apiUrl}/missions/applications/${appId}/withdraw/`, {}, { headers: this.h() }).subscribe({
      next: () => {
        this.snackBar.open('Candidature annulée', 'Fermer', { duration: 3000 });
        this.pendingApplications = this.pendingApplications.filter(a => a.id !== appId);
      },
      error: () => this.snackBar.open('Erreur lors de l\'annulation', 'Fermer', { duration: 3000 })
    });
  }
}
