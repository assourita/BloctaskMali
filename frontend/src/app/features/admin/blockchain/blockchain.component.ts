import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { BlockchainService, BlockchainStatus } from '../../../core/services/blockchain.service';

interface EscrowTx {
  id: string;
  mission_title?: string;
  client: any;
  provider?: any;
  transaction_type: string;
  status: string;
  amount: number;
  currency: string;
  deposit_tx_hash?: string;
  block_number?: number;
  confirmations: number;
  created_at: string;
  confirmed_at?: string;
}

interface ProviderDeposit {
  id: string;
  provider: any;
  amount: number;
  currency: string;
  status: string;
  deposit_tx_hash?: string;
  locked_for_mission_title?: string;
  created_at: string;
  locked_at?: string;
  released_at?: string;
}

interface ReputationScore {
  id: string;
  user: any;
  overall_score: number;
  success_rate: number;
  average_rating: number;
  dispute_rate: number;
  total_missions: number;
  level: string;
  dispute_count: number;
  last_calculated_at: string;
}

interface BlockchainEvent {
  id: string;
  event_type: string;
  mission_title?: string;
  transaction_hash: string;
  block_number: number;
  processed: boolean;
  created_at: string;
}

@Component({
  selector: 'app-admin-blockchain',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatTabsModule,
    MatTableModule, MatPaginatorModule, MatSortModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatTooltipModule,
    MatDividerModule, MatChipsModule
  ],
  template: `
    <div class="bc-container">

      <!-- Header -->
      <div class="page-header">
        <div>
          <h1>⛓️ Blockchain & Finances</h1>
          <p>Escrow, cautions prestataires, réputation et événements on-chain</p>
        </div>
        <div class="header-right" style="display:flex;gap:8px;align-items:center">
          <div class="chain-badge" [class.connected]="chainStatus?.blockchain_enabled">
            <mat-icon>{{ chainStatus?.connected ? 'link' : 'link_off' }}</mat-icon>
            {{ chainStatus?.connected ? 'RPC connecté' : 'RPC hors ligne' }}
          </div>
          <div class="chain-badge contract-badge" *ngIf="chainStatus?.escrow_address">
            <mat-icon>account_tree</mat-icon>
            Escrow {{ chainStatus?.escrow_address | slice:0:8 }}...
          </div>
          <button mat-stroked-button type="button" (click)="syncChainEvents()" [disabled]="syncing">
            <mat-icon>sync</mat-icon> Sync événements
          </button>
        </div>
      </div>

      <!-- KPI global -->
      <div class="kpi-row" *ngIf="escrowStats">
        <div class="kpi-card" style="border-left: 4px solid #6C5CE7">
          <div class="kpi-icon" style="background:#ede9fe;color:#6C5CE7"><mat-icon>swap_horiz</mat-icon></div>
          <div class="kpi-body"><span class="kpi-value">{{ escrowStats.total_transactions }}</span><span class="kpi-label">Transactions</span></div>
        </div>
        <div class="kpi-card" style="border-left: 4px solid #059669">
          <div class="kpi-icon" style="background:#d1fae5;color:#059669"><mat-icon>payments</mat-icon></div>
          <div class="kpi-body"><span class="kpi-value">{{ escrowStats.total_volume | number:'1.0-0' }}</span><span class="kpi-label">Volume FCFA</span></div>
        </div>
        <div class="kpi-card" style="border-left: 4px solid #d97706">
          <div class="kpi-icon" style="background:#fef3c7;color:#d97706"><mat-icon>pending</mat-icon></div>
          <div class="kpi-body"><span class="kpi-value">{{ escrowStats.pending_transactions }}</span><span class="kpi-label">En attente</span></div>
        </div>
        <div class="kpi-card" style="border-left: 4px solid #2563eb">
          <div class="kpi-icon" style="background:#dbeafe;color:#2563eb"><mat-icon>lock</mat-icon></div>
          <div class="kpi-body"><span class="kpi-value">{{ escrowStats.active_deposits }}</span><span class="kpi-label">Cautions actives</span></div>
        </div>
        <div class="kpi-card" style="border-left: 4px solid #dc2626">
          <div class="kpi-icon" style="background:#fee2e2;color:#dc2626"><mat-icon>warning</mat-icon></div>
          <div class="kpi-body"><span class="kpi-value">{{ escrowStats.blockchain_events_unprocessed }}</span><span class="kpi-label">Évts non traités</span></div>
        </div>
      </div>

      <!-- Tabs -->
      <mat-tab-group class="bc-tabs" (selectedIndexChange)="onTabChange($event)">

        <!-- ===== ESCROW TRANSACTIONS ===== -->
        <mat-tab label="💰 Transactions Escrow">
          <div class="tab-content">
            <div class="filters-bar">
              <select class="filter-select" [(ngModel)]="escrowFilterType" (change)="filterEscrow()">
                <option value="">Tous types</option>
                <option value="deposit">Dépôt</option>
                <option value="release">Libération</option>
                <option value="refund">Remboursement</option>
                <option value="penalty">Pénalité</option>
              </select>
              <select class="filter-select" [(ngModel)]="escrowFilterStatus" (change)="filterEscrow()">
                <option value="">Tous statuts</option>
                <option value="pending">En attente</option>
                <option value="confirmed">Confirmé</option>
                <option value="failed">Échoué</option>
              </select>
              <span class="results-count">{{ escrowDs.filteredData.length }} transaction(s)</span>
            </div>
            <div class="loading-mini" *ngIf="loadingEscrow"><mat-spinner diameter="30"></mat-spinner></div>
            <mat-card class="table-card" *ngIf="!loadingEscrow">
              <table mat-table [dataSource]="escrowDs" matSort class="bc-table">
                <ng-container matColumnDef="mission">
                  <th mat-header-cell *matHeaderCellDef>Mission</th>
                  <td mat-cell *matCellDef="let t"><span class="cell-primary">{{ t.mission_title || '—' }}</span></td>
                </ng-container>
                <ng-container matColumnDef="client">
                  <th mat-header-cell *matHeaderCellDef>Client</th>
                  <td mat-cell *matCellDef="let t">
                    <div class="user-mini">
                      <div class="av-xs">{{ (t.client?.first_name?.[0]||'') }}</div>
                      {{ t.client?.first_name }} {{ t.client?.last_name }}
                    </div>
                  </td>
                </ng-container>
                <ng-container matColumnDef="type">
                  <th mat-header-cell *matHeaderCellDef>Type</th>
                  <td mat-cell *matCellDef="let t"><span class="type-badge" [class]="'tx-' + t.transaction_type">{{ getTxTypeLabel(t.transaction_type) }}</span></td>
                </ng-container>
                <ng-container matColumnDef="amount">
                  <th mat-header-cell *matHeaderCellDef>Montant</th>
                  <td mat-cell *matCellDef="let t"><strong class="amount">{{ t.amount | number:'1.0-2' }} {{ t.currency }}</strong></td>
                </ng-container>
                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>Statut</th>
                  <td mat-cell *matCellDef="let t"><span class="status-badge" [class]="'s-' + t.status">{{ getTxStatusLabel(t.status) }}</span></td>
                </ng-container>
                <ng-container matColumnDef="hash">
                  <th mat-header-cell *matHeaderCellDef>Tx Hash</th>
                  <td mat-cell *matCellDef="let t">
                    <a *ngIf="t.deposit_tx_hash" class="hash-link" [href]="'https://sepolia.etherscan.io/tx/' + t.deposit_tx_hash" target="_blank" matTooltip="{{ t.deposit_tx_hash }}">
                      {{ t.deposit_tx_hash | slice:0:10 }}... <mat-icon style="font-size:12px;width:12px;height:12px">open_in_new</mat-icon>
                    </a>
                    <span *ngIf="!t.deposit_tx_hash" class="no-val">—</span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="date">
                  <th mat-header-cell *matHeaderCellDef>Date</th>
                  <td mat-cell *matCellDef="let t">{{ t.created_at | date:'dd/MM/yy HH:mm' }}</td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="escrowCols"></tr>
                <tr mat-row *matRowDef="let r; columns: escrowCols;" class="table-row"></tr>
              </table>
              <mat-paginator #escrowPag [pageSizeOptions]="[10,25,50]" showFirstLastButtons></mat-paginator>
            </mat-card>
          </div>
        </mat-tab>

        <!-- ===== CAUTIONS PRESTATAIRES ===== -->
        <mat-tab label="🔒 Cautions Prestataires">
          <div class="tab-content">
            <div class="filters-bar">
              <select class="filter-select" [(ngModel)]="depositFilterStatus" (change)="filterDeposits()">
                <option value="">Tous statuts</option>
                <option value="active">Active</option>
                <option value="locked">Verrouillée</option>
                <option value="released">Libérée</option>
                <option value="forfeited">Confisquée</option>
              </select>
              <span class="results-count">{{ depositDs.filteredData.length }} caution(s)</span>
            </div>
            <div class="loading-mini" *ngIf="loadingDeposits"><mat-spinner diameter="30"></mat-spinner></div>
            <mat-card class="table-card" *ngIf="!loadingDeposits">
              <table mat-table [dataSource]="depositDs" class="bc-table">
                <ng-container matColumnDef="provider">
                  <th mat-header-cell *matHeaderCellDef>Prestataire</th>
                  <td mat-cell *matCellDef="let d">
                    <div class="user-mini">
                      <div class="av-xs prov">{{ (d.provider?.first_name?.[0]||'') }}</div>
                      {{ d.provider?.first_name }} {{ d.provider?.last_name }}
                    </div>
                  </td>
                </ng-container>
                <ng-container matColumnDef="amount">
                  <th mat-header-cell *matHeaderCellDef>Montant</th>
                  <td mat-cell *matCellDef="let d"><strong class="amount">{{ d.amount | number:'1.0-2' }} {{ d.currency }}</strong></td>
                </ng-container>
                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>Statut</th>
                  <td mat-cell *matCellDef="let d"><span class="status-badge" [class]="'dep-' + d.status">{{ getDepositStatusLabel(d.status) }}</span></td>
                </ng-container>
                <ng-container matColumnDef="mission">
                  <th mat-header-cell *matHeaderCellDef>Mission verrouillée</th>
                  <td mat-cell *matCellDef="let d"><span *ngIf="d.locked_for_mission_title">{{ d.locked_for_mission_title }}</span><span *ngIf="!d.locked_for_mission_title" class="no-val">—</span></td>
                </ng-container>
                <ng-container matColumnDef="date">
                  <th mat-header-cell *matHeaderCellDef>Créée le</th>
                  <td mat-cell *matCellDef="let d">{{ d.created_at | date:'dd/MM/yy' }}</td>
                </ng-container>
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef>Actions</th>
                  <td mat-cell *matCellDef="let d" (click)="$event.stopPropagation()">
                    <button class="btn-action release" *ngIf="['active','locked'].includes(d.status)" (click)="releaseDeposit(d)" matTooltip="Libérer"><mat-icon>lock_open</mat-icon></button>
                    <button class="btn-action forfeit" *ngIf="['active','locked'].includes(d.status)" (click)="forfeitDeposit(d)" matTooltip="Confisquer"><mat-icon>gavel</mat-icon></button>
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="depositCols"></tr>
                <tr mat-row *matRowDef="let r; columns: depositCols;" class="table-row"></tr>
              </table>
              <mat-paginator #depositPag [pageSizeOptions]="[10,25,50]" showFirstLastButtons></mat-paginator>
            </mat-card>
          </div>
        </mat-tab>

        <!-- ===== RÉPUTATION ===== -->
        <mat-tab label="⭐ Réputation">
          <div class="tab-content">
            <!-- Rep stats -->
            <div class="rep-stats-row" *ngIf="repStats">
              <div class="rep-kpi" *ngFor="let l of (repStats.by_level || [])">
                <span class="level-dot" [class]="'lv-' + l.level"></span>
                <span class="rep-kpi-val">{{ l.count }}</span>
                <span class="rep-kpi-lbl">{{ l.level | titlecase }}</span>
              </div>
              <div class="rep-kpi">
                <mat-icon style="color:#6C5CE7">star</mat-icon>
                <span class="rep-kpi-val">{{ repStats.average_score | number:'1.1-1' }}</span>
                <span class="rep-kpi-lbl">Score moyen</span>
              </div>
            </div>

            <div class="filters-bar">
              <select class="filter-select" [(ngModel)]="repFilterLevel" (change)="filterRep()">
                <option value="">Tous niveaux</option>
                <option value="bronze">Bronze</option>
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
                <option value="platinum">Platinum</option>
              </select>
              <span class="results-count">{{ repDs.filteredData.length }} utilisateur(s)</span>
              <button class="btn-add-penalty" (click)="openPenaltyModal()"><mat-icon>remove_circle</mat-icon> Appliquer pénalité</button>
            </div>

            <div class="loading-mini" *ngIf="loadingRep"><mat-spinner diameter="30"></mat-spinner></div>
            <mat-card class="table-card" *ngIf="!loadingRep">
              <table mat-table [dataSource]="repDs" class="bc-table">
                <ng-container matColumnDef="user">
                  <th mat-header-cell *matHeaderCellDef>Utilisateur</th>
                  <td mat-cell *matCellDef="let r">
                    <div class="user-mini">
                      <div class="av-xs">{{ (r.user?.first_name?.[0]||'') }}</div>
                      <div>
                        <span class="cell-primary">{{ r.user?.first_name }} {{ r.user?.last_name }}</span>
                        <span class="cell-sub">{{ r.user?.user_type }}</span>
                      </div>
                    </div>
                  </td>
                </ng-container>
                <ng-container matColumnDef="score">
                  <th mat-header-cell *matHeaderCellDef>Score</th>
                  <td mat-cell *matCellDef="let r">
                    <div class="score-bar-wrap">
                      <div class="score-bar" [style.width.%]="r.overall_score" [style.background]="getScoreColor(r.overall_score)"></div>
                      <span class="score-val">{{ r.overall_score | number:'1.1-1' }}</span>
                    </div>
                  </td>
                </ng-container>
                <ng-container matColumnDef="level">
                  <th mat-header-cell *matHeaderCellDef>Niveau</th>
                  <td mat-cell *matCellDef="let r"><span class="level-badge" [class]="'lv-' + r.level">{{ r.level | titlecase }}</span></td>
                </ng-container>
                <ng-container matColumnDef="missions">
                  <th mat-header-cell *matHeaderCellDef>Missions</th>
                  <td mat-cell *matCellDef="let r">{{ r.total_missions }}</td>
                </ng-container>
                <ng-container matColumnDef="success">
                  <th mat-header-cell *matHeaderCellDef>Taux succès</th>
                  <td mat-cell *matCellDef="let r"><span [style.color]="r.success_rate >= 80 ? '#059669' : '#dc2626'">{{ r.success_rate | number:'1.0-0' }}%</span></td>
                </ng-container>
                <ng-container matColumnDef="rating">
                  <th mat-header-cell *matHeaderCellDef>Note moy.</th>
                  <td mat-cell *matCellDef="let r">
                    <span class="stars">★</span> {{ r.average_rating | number:'1.1-1' }}
                  </td>
                </ng-container>
                <ng-container matColumnDef="disputes">
                  <th mat-header-cell *matHeaderCellDef>Litiges</th>
                  <td mat-cell *matCellDef="let r"><span [style.color]="r.dispute_count > 0 ? '#dc2626' : '#6b7280'">{{ r.dispute_count }}</span></td>
                </ng-container>
                <ng-container matColumnDef="updated">
                  <th mat-header-cell *matHeaderCellDef>Màj</th>
                  <td mat-cell *matCellDef="let r">{{ r.last_calculated_at | date:'dd/MM/yy' }}</td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="repCols"></tr>
                <tr mat-row *matRowDef="let r; columns: repCols;" class="table-row"></tr>
              </table>
              <mat-paginator #repPag [pageSizeOptions]="[10,25,50]" showFirstLastButtons></mat-paginator>
            </mat-card>
          </div>
        </mat-tab>

        <!-- ===== ÉVÉNEMENTS BLOCKCHAIN ===== -->
        <mat-tab label="🔗 Événements On-Chain">
          <div class="tab-content">
            <div class="filters-bar">
              <select class="filter-select" [(ngModel)]="evtFilterProcessed" (change)="filterEvents()">
                <option value="">Tous</option>
                <option value="false">Non traités</option>
                <option value="true">Traités</option>
              </select>
              <span class="results-count">{{ eventDs.filteredData.length }} événement(s)</span>
            </div>
            <div class="loading-mini" *ngIf="loadingEvents"><mat-spinner diameter="30"></mat-spinner></div>
            <mat-card class="table-card" *ngIf="!loadingEvents">
              <table mat-table [dataSource]="eventDs" class="bc-table">
                <ng-container matColumnDef="type">
                  <th mat-header-cell *matHeaderCellDef>Type</th>
                  <td mat-cell *matCellDef="let e"><span class="event-badge">{{ e.event_type }}</span></td>
                </ng-container>
                <ng-container matColumnDef="mission">
                  <th mat-header-cell *matHeaderCellDef>Mission</th>
                  <td mat-cell *matCellDef="let e">{{ e.mission_title || '—' }}</td>
                </ng-container>
                <ng-container matColumnDef="tx">
                  <th mat-header-cell *matHeaderCellDef>Tx Hash</th>
                  <td mat-cell *matCellDef="let e">
                    <a class="hash-link" [href]="'https://sepolia.etherscan.io/tx/' + e.transaction_hash" target="_blank" matTooltip="{{ e.transaction_hash }}">
                      {{ e.transaction_hash | slice:0:12 }}...
                    </a>
                  </td>
                </ng-container>
                <ng-container matColumnDef="block">
                  <th mat-header-cell *matHeaderCellDef>Bloc</th>
                  <td mat-cell *matCellDef="let e">{{ e.block_number }}</td>
                </ng-container>
                <ng-container matColumnDef="processed">
                  <th mat-header-cell *matHeaderCellDef>Traité</th>
                  <td mat-cell *matCellDef="let e">
                    <span class="proc-badge" [class.proc-yes]="e.processed" [class.proc-no]="!e.processed">
                      {{ e.processed ? 'Oui' : 'Non' }}
                    </span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="date">
                  <th mat-header-cell *matHeaderCellDef>Date</th>
                  <td mat-cell *matCellDef="let e">{{ e.created_at | date:'dd/MM/yy HH:mm' }}</td>
                </ng-container>
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let e" (click)="$event.stopPropagation()">
                    <button class="btn-action release" *ngIf="!e.processed" (click)="markEventProcessed(e)" matTooltip="Marquer traité"><mat-icon>check</mat-icon></button>
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="eventCols"></tr>
                <tr mat-row *matRowDef="let r; columns: eventCols;" class="table-row"></tr>
              </table>
              <mat-paginator #eventPag [pageSizeOptions]="[10,25,50]" showFirstLastButtons></mat-paginator>
            </mat-card>
          </div>
        </mat-tab>

      </mat-tab-group>

      <!-- Penalty Modal -->
      <div class="modal-overlay" *ngIf="penaltyModalOpen" (click)="closePenaltyModal()">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3><mat-icon>remove_circle</mat-icon> Appliquer une pénalité</h3>
            <button class="btn-close" (click)="closePenaltyModal()"><mat-icon>close</mat-icon></button>
          </div>
          <div class="modal-body" *ngIf="penaltyForm">
            <form [formGroup]="penaltyForm">
              <div class="form-group">
                <label>ID Utilisateur *</label>
                <input type="text" class="form-input" formControlName="user" placeholder="UUID de l'utilisateur" />
              </div>
              <div class="form-group">
                <label>Type de pénalité *</label>
                <select class="filter-select full-w" formControlName="penalty_type">
                  <option value="">Choisir...</option>
                  <option value="late_delivery">Livraison en retard</option>
                  <option value="no_show">Absence</option>
                  <option value="fake_proof">Fausse preuve</option>
                  <option value="rude_behavior">Comportement inapproprié</option>
                  <option value="cancellation">Annulation</option>
                  <option value="fraud">Fraude</option>
                </select>
              </div>
              <div class="form-group">
                <label>Points déduits *</label>
                <input type="number" class="form-input" formControlName="points_deducted" min="0.1" max="50" />
              </div>
              <div class="form-group">
                <label>Raison *</label>
                <textarea class="form-textarea" formControlName="description" rows="3"></textarea>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel-modal" (click)="closePenaltyModal()">Annuler</button>
            <button class="btn-confirm" (click)="submitPenalty()" [disabled]="!penaltyForm?.valid || submitting">
              <mat-icon>check</mat-icon> {{ submitting ? 'En cours...' : 'Appliquer' }}
            </button>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .bc-container { padding: 24px; max-width: 1500px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; }

    .page-header { background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%); color: #fff; padding: 28px 32px; border-radius: 16px; display: flex; align-items: center; justify-content: space-between; h1 { margin: 0 0 4px; font-size: 22px; font-weight: 700; } p { margin: 0; font-size: 13px; opacity: 0.7; } }
    .chain-badge { display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 20px; padding: 6px 14px; font-size: 13px; font-weight: 600; mat-icon { font-size: 16px; width: 16px; height: 16px; color: #ef4444; } &.connected { border-color: #10b981; mat-icon { color: #10b981; } } }
    .contract-badge { background: rgba(251,191,36,0.15); border-color: rgba(251,191,36,0.4); color: #fbbf24; mat-icon { color: #fbbf24; } }

    .kpi-row { display: grid; grid-template-columns: repeat(5,1fr); gap: 12px; }
    .kpi-card { background: #fff; border-radius: 12px; padding: 14px 16px; display: flex; align-items: center; gap: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
    .kpi-icon { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .kpi-body { display: flex; flex-direction: column; }
    .kpi-value { font-size: 20px; font-weight: 700; color: #1a1a2e; line-height: 1; }
    .kpi-label { font-size: 11px; color: #6b7280; margin-top: 2px; }

    .bc-tabs { background: #fff; border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); overflow: hidden; }
    .tab-content { padding: 20px; }

    .filters-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
    .filter-select { border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px 12px; font-size: 13px; color: #374151; background: #fff; outline: none; cursor: pointer; }
    .full-w { width: 100%; }
    .results-count { font-size: 13px; color: #6b7280; margin-left: auto; white-space: nowrap; }
    .loading-mini { display: flex; justify-content: center; padding: 30px; }

    .table-card { overflow: auto; border-radius: 14px !important; box-shadow: 0 1px 4px rgba(0,0,0,0.04) !important; }
    .bc-table { width: 100%; }
    .table-row { cursor: default; &:hover { background: #f8fafc; } }

    .user-mini { display: flex; align-items: center; gap: 8px; font-size: 13px; }
    .av-xs { width: 26px; height: 26px; border-radius: 50%; background: #dbeafe; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; &.prov { background: #d1fae5; color: #059669; } }
    .cell-primary { font-weight: 500; color: #1a1a2e; display: block; font-size: 13px; }
    .cell-sub { font-size: 11px; color: #6b7280; }
    .no-val { color: #94a3b8; font-size: 12px; }
    .amount { color: #059669; font-size: 14px; }

    .type-badge { padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; }
    .tx-deposit  { background: #dbeafe; color: #2563eb; }
    .tx-release  { background: #d1fae5; color: #059669; }
    .tx-refund   { background: #fef3c7; color: #d97706; }
    .tx-penalty  { background: #fee2e2; color: #dc2626; }
    .tx-bonus    { background: #e0e7ff; color: #4f46e5; }

    .status-badge { padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .s-pending   { background: #fef3c7; color: #d97706; }
    .s-confirmed { background: #d1fae5; color: #059669; }
    .s-failed    { background: #fee2e2; color: #dc2626; }
    .s-cancelled { background: #e5e7eb; color: #6b7280; }

    .dep-active   { background: #d1fae5; color: #059669; }
    .dep-locked   { background: #fef3c7; color: #d97706; }
    .dep-released { background: #e0e7ff; color: #4f46e5; }
    .dep-forfeited { background: #fee2e2; color: #dc2626; }

    .hash-link { color: #6366f1; font-size: 12px; display: flex; align-items: center; gap: 2px; text-decoration: none; &:hover { text-decoration: underline; } }

    /* Reputation */
    .rep-stats-row { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; padding: 14px 16px; background: #f8fafc; border-radius: 12px; }
    .rep-kpi { display: flex; align-items: center; gap: 6px; }
    .rep-kpi-val { font-size: 18px; font-weight: 700; color: #1a1a2e; }
    .rep-kpi-lbl { font-size: 11px; color: #6b7280; }
    .level-dot { width: 10px; height: 10px; border-radius: 50%; }
    .level-badge { padding: 2px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .lv-bronze   { background: #fef3c7; color: #d97706; }
    .lv-silver   { background: #f1f5f9; color: #64748b; }
    .lv-gold     { background: #fef9c3; color: #ca8a04; }
    .lv-platinum { background: #e0e7ff; color: #4f46e5; }

    .score-bar-wrap { display: flex; align-items: center; gap: 8px; width: 120px; }
    .score-bar { height: 6px; border-radius: 3px; transition: width 0.3s; }
    .score-val { font-size: 12px; font-weight: 600; color: #374151; white-space: nowrap; }
    .stars { color: #f59e0b; }

    .btn-add-penalty { display: flex; align-items: center; gap: 6px; background: #fee2e2; color: #dc2626; border: none; border-radius: 10px; padding: 8px 14px; cursor: pointer; font-size: 13px; font-weight: 600; mat-icon { font-size: 16px; width: 16px; height: 16px; } &:hover { background: #fecaca; } }

    /* Events */
    .event-badge { background: #e0e7ff; color: #4f46e5; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; }
    .proc-badge { padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; &.proc-yes { background: #d1fae5; color: #059669; } &.proc-no { background: #fee2e2; color: #dc2626; } }

    .btn-action { background: none; border: none; border-radius: 8px; width: 30px; height: 30px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; mat-icon { font-size: 16px; width: 16px; height: 16px; } }
    .btn-action.release { background: #d1fae5; mat-icon { color: #059669; } &:hover { background: #a7f3d0; } }
    .btn-action.forfeit { background: #fee2e2; margin-left: 4px; mat-icon { color: #dc2626; } &:hover { background: #fecaca; } }

    /* Modal */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; }
    .modal-box { background: #fff; border-radius: 16px; width: 480px; max-width: 95vw; box-shadow: 0 20px 60px rgba(0,0,0,0.2); overflow: hidden; }
    .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; background: #1a1a2e; color: #fff; h3 { margin: 0; font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 8px; mat-icon { color: #ef4444; } } }
    .btn-close { background: none; border: none; cursor: pointer; border-radius: 8px; padding: 4px; mat-icon { color: rgba(255,255,255,0.7); } }
    .modal-body { padding: 20px; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 20px; border-top: 1px solid #f1f5f9; }
    .form-group { margin-bottom: 14px; label { display: block; font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 5px; } }
    .form-input { width: 100%; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; font-size: 13px; outline: none; box-sizing: border-box; &:focus { border-color: #6C5CE7; } }
    .form-textarea { width: 100%; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; font-size: 13px; resize: vertical; outline: none; box-sizing: border-box; &:focus { border-color: #6C5CE7; } }
    .btn-cancel-modal { background: #f1f5f9; color: #374151; border: none; border-radius: 10px; padding: 9px 18px; cursor: pointer; font-weight: 500; }
    .btn-confirm { background: #dc2626; color: #fff; border: none; border-radius: 10px; padding: 9px 18px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 6px; mat-icon { font-size: 16px; width: 16px; height: 16px; } &:disabled { opacity: 0.5; cursor: not-allowed; } &:hover:not(:disabled) { background: #b91c1c; } }

    @media (max-width: 900px) { .kpi-row { grid-template-columns: repeat(3,1fr); } }
  `]
})
export class AdminBlockchainComponent implements OnInit, AfterViewInit {
  @ViewChild('escrowPag') escrowPag!: MatPaginator;
  @ViewChild('depositPag') depositPag!: MatPaginator;
  @ViewChild('repPag') repPag!: MatPaginator;
  @ViewChild('eventPag') eventPag!: MatPaginator;

  escrowDs = new MatTableDataSource<EscrowTx>([]);
  depositDs = new MatTableDataSource<ProviderDeposit>([]);
  repDs = new MatTableDataSource<ReputationScore>([]);
  eventDs = new MatTableDataSource<BlockchainEvent>([]);

  escrowCols = ['mission', 'client', 'type', 'amount', 'status', 'hash', 'date'];
  depositCols = ['provider', 'amount', 'status', 'mission', 'date', 'actions'];
  repCols = ['user', 'score', 'level', 'missions', 'success', 'rating', 'disputes', 'updated'];
  eventCols = ['type', 'mission', 'tx', 'block', 'processed', 'date', 'actions'];

  loadingEscrow = true;
  loadingDeposits = true;
  loadingRep = true;
  loadingEvents = true;

  escrowStats: any = null;
  repStats: any = null;
  chainStatus: BlockchainStatus | null = null;
  syncing = false;

  escrowFilterType = '';
  escrowFilterStatus = '';
  depositFilterStatus = '';
  repFilterLevel = '';
  evtFilterProcessed = '';

  penaltyModalOpen = false;
  penaltyForm: FormGroup | null = null;
  submitting = false;

  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private fb: FormBuilder,
    private blockchainService: BlockchainService,
  ) {}

  ngOnInit(): void {
    this.loadChainStatus();
    this.loadEscrowStats();
    this.loadEscrow();
  }

  loadChainStatus(): void {
    this.blockchainService.getStatus().subscribe({
      next: (s) => { this.chainStatus = s; },
    });
  }

  syncChainEvents(): void {
    this.syncing = true;
    this.blockchainService.syncEvents().subscribe({
      next: (r) => {
        this.syncing = false;
        this.snackBar.open(`${r.synced} événement(s) synchronisé(s)`, 'Fermer', { duration: 4000 });
        this.loadEvents();
        this.loadEscrowStats();
      },
      error: () => {
        this.syncing = false;
        this.snackBar.open('Sync impossible — vérifiez RPC et adresses contrats', 'Fermer', { duration: 5000 });
      },
    });
  }

  ngAfterViewInit(): void {
    this.escrowDs.paginator = this.escrowPag;
    this.depositDs.paginator = this.depositPag;
    this.repDs.paginator = this.repPag;
    this.eventDs.paginator = this.eventPag;
  }

  private h(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });
  }

  onTabChange(i: number): void {
    if (i === 0 && !this.escrowDs.data.length) this.loadEscrow();
    if (i === 1 && !this.depositDs.data.length) this.loadDeposits();
    if (i === 2 && !this.repDs.data.length) { this.loadRep(); this.loadRepStats(); }
    if (i === 3 && !this.eventDs.data.length) this.loadEvents();
  }

  loadEscrowStats(): void {
    this.http.get<any>(`${this.apiUrl}/escrow/transactions/stats/`, { headers: this.h() }).subscribe({
      next: (s) => { this.escrowStats = s; },
      error: () => {
        this.escrowStats = { total_transactions: 0, total_volume: 0, pending_transactions: 0, active_deposits: 0, blockchain_events_unprocessed: 0 };
      }
    });
  }

  loadEscrow(): void {
    this.loadingEscrow = true;
    this.http.get<any>(`${this.apiUrl}/escrow/transactions/`, { headers: this.h() }).subscribe({
      next: (r) => { this.escrowDs.data = Array.isArray(r) ? r : (r?.results ?? []); this.loadingEscrow = false; this.filterEscrow(); },
      error: () => { this.loadingEscrow = false; }
    });
  }

  loadDeposits(): void {
    this.loadingDeposits = true;
    this.http.get<any>(`${this.apiUrl}/escrow/deposits/`, { headers: this.h() }).subscribe({
      next: (r) => { this.depositDs.data = Array.isArray(r) ? r : (r?.results ?? []); this.loadingDeposits = false; this.filterDeposits(); },
      error: () => { this.loadingDeposits = false; }
    });
  }

  loadRep(): void {
    this.loadingRep = true;
    this.http.get<any>(`${this.apiUrl}/reputation/scores/`, { headers: this.h() }).subscribe({
      next: (r) => { this.repDs.data = Array.isArray(r) ? r : (r?.results ?? []); this.loadingRep = false; this.filterRep(); },
      error: () => { this.loadingRep = false; }
    });
  }

  loadRepStats(): void {
    this.http.get<any>(`${this.apiUrl}/reputation/scores/stats/`, { headers: this.h() }).subscribe({
      next: (s) => { this.repStats = s; }
    });
  }

  loadEvents(): void {
    this.loadingEvents = true;
    this.http.get<any>(`${this.apiUrl}/escrow/events/`, { headers: this.h() }).subscribe({
      next: (r) => { this.eventDs.data = Array.isArray(r) ? r : (r?.results ?? []); this.loadingEvents = false; this.filterEvents(); },
      error: () => { this.loadingEvents = false; }
    });
  }

  filterEscrow(): void {
    this.escrowDs.filterPredicate = (t: EscrowTx, f: string) => {
      const fv = JSON.parse(f);
      return (!fv.type || t.transaction_type === fv.type) && (!fv.status || t.status === fv.status);
    };
    this.escrowDs.filter = JSON.stringify({ type: this.escrowFilterType, status: this.escrowFilterStatus });
  }

  filterDeposits(): void {
    this.depositDs.filterPredicate = (d: ProviderDeposit, f: string) => !f || d.status === f;
    this.depositDs.filter = this.depositFilterStatus;
  }

  filterRep(): void {
    this.repDs.filterPredicate = (r: ReputationScore, f: string) => !f || r.level === f;
    this.repDs.filter = this.repFilterLevel;
  }

  filterEvents(): void {
    this.eventDs.filterPredicate = (e: BlockchainEvent, f: string) => !f || String(e.processed) === f;
    this.eventDs.filter = this.evtFilterProcessed;
  }

  releaseDeposit(d: ProviderDeposit): void {
    if (!confirm(`Libérer la caution de ${d.amount} ${d.currency} ?`)) return;
    this.http.post<ProviderDeposit>(`${this.apiUrl}/escrow/deposits/${d.id}/release/`, {}, { headers: this.h() }).subscribe({
      next: (updated) => { Object.assign(d, updated); this.snackBar.open('Caution libérée', 'Fermer', { duration: 2000 }); },
      error: () => this.snackBar.open('Erreur libération', 'Fermer', { duration: 3000 })
    });
  }

  forfeitDeposit(d: ProviderDeposit): void {
    if (!confirm(`Confisquer la caution de ${d.amount} ${d.currency} ?`)) return;
    this.http.post<ProviderDeposit>(`${this.apiUrl}/escrow/deposits/${d.id}/forfeit/`, {}, { headers: this.h() }).subscribe({
      next: (updated) => { Object.assign(d, updated); this.snackBar.open('Caution confisquée', 'Fermer', { duration: 2000 }); },
      error: () => this.snackBar.open('Erreur confiscation', 'Fermer', { duration: 3000 })
    });
  }

  markEventProcessed(e: BlockchainEvent): void {
    this.http.post<BlockchainEvent>(`${this.apiUrl}/escrow/events/${e.id}/mark_processed/`, {}, { headers: this.h() }).subscribe({
      next: (u) => { Object.assign(e, u); this.snackBar.open('Événement marqué traité', 'Fermer', { duration: 2000 }); },
      error: () => this.snackBar.open('Erreur', 'Fermer', { duration: 3000 })
    });
  }

  openPenaltyModal(): void {
    this.penaltyForm = this.fb.group({
      user: ['', Validators.required],
      penalty_type: ['', Validators.required],
      points_deducted: [5, [Validators.required, Validators.min(0.1), Validators.max(50)]],
      description: ['', Validators.required]
    });
    this.penaltyModalOpen = true;
  }

  closePenaltyModal(): void { this.penaltyModalOpen = false; }

  submitPenalty(): void {
    if (!this.penaltyForm?.valid) return;
    this.submitting = true;
    this.http.post(`${this.apiUrl}/reputation/penalties/`, this.penaltyForm.value, { headers: this.h() }).subscribe({
      next: () => { this.submitting = false; this.closePenaltyModal(); this.snackBar.open('Pénalité appliquée', 'Fermer', { duration: 3000 }); this.loadRep(); },
      error: () => { this.submitting = false; this.snackBar.open('Erreur application pénalité', 'Fermer', { duration: 3000 }); }
    });
  }

  getScoreColor(score: number): string {
    if (score >= 80) return '#059669';
    if (score >= 60) return '#d97706';
    return '#dc2626';
  }

  getTxTypeLabel(t: string): string {
    const l: any = { deposit: 'Dépôt', release: 'Libération', refund: 'Remboursement', penalty: 'Pénalité', bonus: 'Bonus' };
    return l[t] || t;
  }
  getTxStatusLabel(s: string): string {
    const l: any = { pending: 'En attente', confirmed: 'Confirmé', failed: 'Échoué', cancelled: 'Annulé' };
    return l[s] || s;
  }
  getDepositStatusLabel(s: string): string {
    const l: any = { active: 'Active', locked: 'Verrouillée', released: 'Libérée', forfeited: 'Confisquée' };
    return l[s] || s;
  }
}
