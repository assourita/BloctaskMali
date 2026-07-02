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

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatBadgeModule } from '@angular/material/badge';

interface Mission {
  id: string;
  title: string;
  description: string;
  budget: number;
  currency: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'submitted' | 'completed' | 'cancelled' | 'disputed';
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
    MatCardModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatTabsModule, MatProgressBarModule,
    MatSnackBarModule, MatBadgeModule
  ],
  template: `
    <div class="my-missions-container">
      <div class="page-header">
        <div>
          <h1>Mes missions assignées</h1>
          <p>Missions où vous êtes prestataire retenu</p>
        </div>
        <a mat-stroked-button routerLink="/provider/missions/solicitations" class="solicitations-link">
          <mat-icon>mail</mat-icon> Mes sollicitations
        </a>
      </div>
      <!-- Header avec stats -->
      <div class="stats-bar">
        <div class="stat-item">
          <mat-icon>assignment</mat-icon>
          <div>
            <span class="value">{{ stats.total }}</span>
            <span class="label">Total missions</span>
          </div>
        </div>
        <div class="stat-item active">
          <mat-icon>play_circle</mat-icon>
          <div>
            <span class="value">{{ stats.active }}</span>
            <span class="label">En cours</span>
          </div>
        </div>
        <div class="stat-item completed">
          <mat-icon>check_circle</mat-icon>
          <div>
            <span class="value">{{ stats.completed }}</span>
            <span class="label">Terminées</span>
          </div>
        </div>
        <div class="stat-item earnings">
          <mat-icon>payments</mat-icon>
          <div>
            <span class="value">{{ stats.earnings | number }} FCFA</span>
            <span class="label">Gagnés ce mois</span>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <mat-tab-group animationDuration="200ms" [selectedIndex]="selectedTab" (selectedIndexChange)="onTabChange($event)">
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>play_circle</mat-icon>
            En cours
            <span class="tab-badge" *ngIf="activeMissions.length > 0">{{ activeMissions.length }}</span>
          </ng-template>
          <div class="tab-content">
            <div class="empty-state" *ngIf="activeMissions.length === 0">
              <mat-icon>inbox</mat-icon>
              <h3>Aucune mission en cours</h3>
              <p>Postulez à des missions disponibles pour commencer à travailler.</p>
              <button mat-raised-button color="primary" routerLink="/provider/missions/available">
                <mat-icon>search</mat-icon> Trouver des missions
              </button>
            </div>
            <div class="missions-list" *ngIf="activeMissions.length > 0">
              <mat-card class="mission-item" [class.highlight-deposit]="highlightMissionId === mission.id" [id]="'mission-' + mission.id" *ngFor="let mission of activeMissions">
                <div class="mission-status-bar">
                  <mat-chip-listbox>
                    <mat-chip-option [class]="'status-' + mission.status" selected disabled>
                      {{ getStatusLabel(mission.status) }}
                    </mat-chip-option>
                  </mat-chip-listbox>
                  <span class="deadline">⏰ {{ getTimeRemaining(mission.deadline) }}</span>
                </div>
                <mat-card-title>{{ mission.title }}</mat-card-title>
                <mat-card-subtitle class="mission-budget">{{ mission.budget | number }} FCFA</mat-card-subtitle>
                
                <mat-card-content>
                  <div class="client-row">
                    <div class="client-info">
                      <div class="avatar">
                        <img *ngIf="mission.client.profile_picture" [src]="mission.client.profile_picture">
                        <span *ngIf="!mission.client.profile_picture">
                          {{ (mission.client.first_name[0] || '') + (mission.client.last_name[0] || '') }}
                        </span>
                      </div>
                      <div>
                        <span class="name">{{ mission.client.first_name }} {{ mission.client.last_name }}</span>
                        <span class="phone" *ngIf="mission.client.phone_number">{{ mission.client.phone_number }}</span>
                      </div>
                    </div>
                    <button mat-icon-button type="button" (click)="openMissionChat(mission)">
                      <mat-icon>chat</mat-icon>
                    </button>
                  </div>
                  
                  <div class="route-info">
                    <div class="route-point">
                      <mat-icon class="pickup">location_on</mat-icon>
                      <span>{{ mission.pickup_address }}</span>
                    </div>
                    <div class="route-line"></div>
                    <div class="route-point">
                      <mat-icon class="delivery">flag</mat-icon>
                      <span>{{ mission.delivery_address }}</span>
                    </div>
                  </div>

                  <div class="progress-section" *ngIf="mission.status === 'in_progress'">
                    <span>Progression: {{ mission.progress || 0 }}%</span>
                    <mat-progress-bar mode="determinate" [value]="mission.progress || 0"></mat-progress-bar>
                  </div>

                  <div class="deposit-alert" *ngIf="mission.status === 'accepted' && !mission.deposit_paid">
                    <mat-icon>schedule</mat-icon>
                    <div>
                      <strong>Caution requise sous 4h</strong>
                      <p>
                        Déposez {{ mission.required_deposit | number:'1.0-0' }} {{ mission.currency || 'XOF' }}
                        avant {{ mission.deposit_deadline | date:'HH:mm' }} pour démarrer.
                      </p>
                    </div>
                  </div>
                </mat-card-content>
                
                <mat-card-actions>
                  <button mat-button type="button" (click)="viewMissionDetails(mission)">Détails</button>
                  <button mat-raised-button color="warn" (click)="payDeposit(mission)"
                          *ngIf="mission.status === 'accepted' && !mission.deposit_paid">
                    <mat-icon>security</mat-icon> Déposer la caution
                  </button>
                  <button mat-raised-button color="primary" (click)="startMission(mission)"
                          *ngIf="mission.status === 'accepted' && mission.deposit_paid">
                    Démarrer
                  </button>
                  <button mat-raised-button color="accent" type="button" (click)="viewMissionProofs(mission)" *ngIf="mission.status === 'in_progress'">
                    Preuves
                  </button>
                  <button mat-raised-button color="warn" (click)="completeMission(mission)" *ngIf="mission.status === 'submitted'">
                    Finaliser
                  </button>
                </mat-card-actions>
              </mat-card>
            </div>
          </div>
        </mat-tab>

        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>history</mat-icon>
            Historique
          </ng-template>
          <div class="tab-content">
            <div class="empty-state" *ngIf="completedMissions.length === 0">
              <mat-icon>history</mat-icon>
              <h3>Aucun historique</h3>
              <p>Vos missions terminées apparaîtront ici.</p>
            </div>
            <div class="missions-list completed" *ngIf="completedMissions.length > 0">
              <mat-card class="mission-item completed" *ngFor="let mission of completedMissions">
                <div class="mission-header-row">
                  <mat-chip-listbox>
                    <mat-chip-option class="status-completed" selected disabled>
                      {{ mission.status === 'completed' ? 'Terminée' : 'Annulée' }}
                    </mat-chip-option>
                  </mat-chip-listbox>
                  <span class="date">{{ mission.completed_at || mission.created_at | date:'dd MMM yyyy' }}</span>
                </div>
                <mat-card-title>{{ mission.title }}</mat-card-title>
                <mat-card-subtitle class="mission-budget">{{ mission.budget | number }} FCFA</mat-card-subtitle>
                
                <mat-card-content>
                  <div class="client-row">
                    <div class="client-info">
                      <div class="avatar small">
                        <span>{{ (mission.client.first_name[0] || '') + (mission.client.last_name[0] || '') }}</span>
                      </div>
                      <span class="name">{{ mission.client.first_name }} {{ mission.client.last_name }}</span>
                    </div>
                    <button mat-button color="primary" *ngIf="mission.status === 'completed' && !mission.rated">
                      Noter le client
                    </button>
                  </div>
                </mat-card-content>
                <mat-card-actions>
                  <button mat-button type="button" (click)="viewMissionDetails(mission)">Détails</button>
                </mat-card-actions>
              </mat-card>
            </div>
          </div>
        </mat-tab>

        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>pending</mat-icon>
            En attente
            <span class="tab-badge" *ngIf="pendingApplications.length > 0">{{ pendingApplications.length }}</span>
          </ng-template>
          <div class="tab-content">
            <div class="empty-state" *ngIf="pendingApplications.length === 0">
              <mat-icon>hourglass_empty</mat-icon>
              <h3>Aucune candidature en attente</h3>
              <p>Vos candidatures en cours de traitement apparaîtront ici.</p>
            </div>
            <div class="missions-list" *ngIf="pendingApplications.length > 0">
              <mat-card class="mission-item pending" *ngFor="let app of pendingApplications">
                <div class="pending-badge">
                  <mat-icon>schedule</mat-icon>
                  <span>En attente de réponse</span>
                </div>
                <mat-card-title>{{ app.mission_title }}</mat-card-title>
                <mat-card-subtitle class="mission-budget">{{ app.mission_budget | number }} {{ app.mission_currency || 'XOF' }}</mat-card-subtitle>
                <mat-card-content>
                  <p class="application-message">Votre message: "{{ app.message }}"</p>
                  <p class="date">Postulé le {{ app.created_at | date:'dd MMM yyyy à HH:mm' }}</p>
                </mat-card-content>
                <mat-card-actions>
                  <button mat-button color="warn" (click)="cancelApplication(app.id)">Annuler</button>
                </mat-card-actions>
              </mat-card>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .my-missions-container { padding: 24px; max-width: 1000px; margin: 0 auto; }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 20px;
      flex-wrap: wrap;
      h1 { margin: 0 0 4px; font-size: 22px; }
      p { margin: 0; color: #6b7280; font-size: 14px; }
    }
    .solicitations-link mat-icon { margin-right: 6px; }
    
    .stats-bar {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px;
      .stat-item {
        background: #fff; border-radius: 12px; padding: 20px;
        display: flex; align-items: center; gap: 12px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        mat-icon { font-size: 32px; width: 32px; height: 32px; color: #9ca3af; }
        .value { display: block; font-size: 24px; font-weight: 700; color: #1f2937; }
        .label { font-size: 13px; color: #6b7280; }
        &.active mat-icon { color: #3b82f6; }
        &.completed mat-icon { color: #10b981; }
        &.earnings mat-icon { color: #f59e0b; }
      }
    }
    
    .tab-content { padding: 24px 0; }
    .tab-badge {
      background: #ef4444; color: #fff; font-size: 11px; font-weight: 600;
      padding: 2px 8px; border-radius: 10px; margin-left: 8px;
    }
    
    .empty-state {
      text-align: center; padding: 60px;
      mat-icon { font-size: 64px; width: 64px; height: 64px; color: #d1d5db; margin-bottom: 16px; }
      h3 { margin: 0 0 8px; font-size: 20px; color: #374151; }
      p { margin: 0 0 24px; color: #6b7280; }
    }
    
    .missions-list {
      display: flex; flex-direction: column; gap: 16px;
    }
    
    .mission-item {
      border-radius: 16px;
      &.completed { opacity: 0.8; }
      &.pending { border-left: 4px solid #f59e0b; }
      &.highlight-deposit {
        box-shadow: 0 0 0 2px #3CB371;
        animation: depositPulse 1.5s ease-in-out 2;
      }
      
      @keyframes depositPulse {
        0%, 100% { box-shadow: 0 0 0 2px #3CB371; }
        50% { box-shadow: 0 0 0 4px rgba(60, 179, 113, 0.45); }
      }
      
      .mission-status-bar {
        display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;
        .deadline { font-size: 13px; color: #ef4444; font-weight: 500; }
      }
      
      mat-card-title { font-size: 18px; font-weight: 700; margin: 0 0 4px; }
      .mission-budget { color: #3CB371; font-size: 18px; font-weight: 700; }
      
      .client-row {
        display: flex; justify-content: space-between; align-items: center;
        margin: 16px 0; padding: 12px; background: #f9fafb; border-radius: 8px;
        .client-info {
          display: flex; align-items: center; gap: 10px;
          .avatar {
            width: 40px; height: 40px; border-radius: 50%; background: #3CB371;
            display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 600;
            overflow: hidden;
            img { width: 100%; height: 100%; object-fit: cover; }
            &.small { width: 28px; height: 28px; font-size: 12px; }
          }
          .name { display: block; font-weight: 600; font-size: 14px; }
          .phone { display: block; font-size: 12px; color: #6b7280; }
        }
      }
      
      .route-info {
        margin: 16px 0;
        .route-point {
          display: flex; align-items: center; gap: 8px;
          mat-icon { font-size: 20px; &.pickup { color: #3b82f6; } &.delivery { color: #10b981; } }
          span { font-size: 14px; color: #374151; }
        }
        .route-line { width: 2px; height: 20px; background: #e5e7eb; margin-left: 9px; }
      }
      
      .progress-section {
        margin-top: 12px;
        span { font-size: 13px; color: #6b7280; }
        mat-progress-bar { margin-top: 8px; }
      }

      .deposit-alert {
        display: flex;
        gap: 12px;
        align-items: flex-start;
        margin-top: 12px;
        padding: 12px;
        background: #fef3c7;
        border: 1px solid #fcd34d;
        border-radius: 10px;
        mat-icon { color: #d97706; flex-shrink: 0; }
        p { margin: 4px 0 0; font-size: 13px; color: #92400e; }
        strong { font-size: 14px; color: #78350f; }
      }
      
      mat-card-actions {
        display: flex; gap: 8px; padding: 16px;
        button { flex: 1; }
      }
      
      .pending-badge {
        display: flex; align-items: center; gap: 8px;
        background: #fef3c7; color: #92400e; padding: 8px 12px; border-radius: 8px;
        margin-bottom: 12px; font-size: 13px; font-weight: 500;
      }
      .application-message {
        font-style: italic; color: #6b7280; margin: 8px 0;
        padding: 12px; background: #f9fafb; border-radius: 8px;
      }
      .date { font-size: 12px; color: #9ca3af; margin: 0; }
    }
    
    .status-accepted { background: #dbeafe !important; color: #1e40af !important; }
    .status-in_progress { background: #fef3c7 !important; color: #92400e !important; }
    .status-submitted { background: #d1fae5 !important; color: #065f46 !important; }
    .status-completed { background: #d1fae5 !important; color: #065f46 !important; }
    .status-cancelled { background: #fee2e2 !important; color: #991b1b !important; }
    
    @media (max-width: 768px) {
      .stats-bar { grid-template-columns: repeat(2, 1fr); }
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

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      accepted: 'Acceptée',
      in_progress: 'En cours',
      submitted: 'Preuves soumises',
      completed: 'Terminée',
      cancelled: 'Annulée',
      disputed: 'Litige'
    };
    return labels[status] || status;
  }

  getTimeRemaining(deadline: string): string {
    const diff = new Date(deadline).getTime() - Date.now();
    if (diff < 0) return 'En retard';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 24) return `${hours}h restantes`;
    const days = Math.floor(hours / 24);
    return `${days}j restants`;
  }

  submitProof(mission: Mission): void {
    this.viewMissionProofs(mission);
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
        this.snackBar.open('Caution déposée — vous pouvez démarrer la mission', 'Fermer', { duration: 4000 });
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

  startMission(mission: Mission): void {
    this.missionService.startMission(mission.id).subscribe({
      next: () => {
        mission.status = 'in_progress';
        this.snackBar.open('Mission démarrée', 'Fermer', { duration: 3000 });
        this.loadMissions();
      },
      error: (e) => {
        const body = e.error;
        if (body?.deposit_required) {
          this.snackBar.open('Déposez la caution avant de démarrer', 'Fermer', { duration: 5000 });
        } else {
          this.snackBar.open(body?.error || 'Erreur', 'Fermer', { duration: 4000 });
        }
      }
    });
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
