import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface UserInfo { id: string; first_name: string; last_name: string; email?: string; }

interface DisputeMessage {
  id: string;
  message: string;
  is_internal: boolean;
  sender: UserInfo;
  created_at: string;
}

interface Dispute {
  id: string;
  dispute_hash?: string;
  mission_id: string;
  mission_title: string;
  mission_budget?: number;
  mission_currency?: string;
  plaintiff: UserInfo;
  defendant: UserInfo;
  reason: string;
  description: string;
  requested_resolution: string;
  status: string;
  decision: string;
  decision_reason?: string;
  decided_by?: UserInfo;
  decided_at?: string;
  client_refund_amount?: number;
  provider_payment_amount?: number;
  deposit_penalty?: number;
  evidence_count?: number;
  message_count?: number;
  evidence_deadline?: string;
  created_at: string;
  updated_at?: string;
  resolved_at?: string;
  messages?: DisputeMessage[];
}

interface MissionDossierChatMessage {
  content: string;
  sender?: { first_name?: string; last_name?: string };
}

interface MissionDossierProof {
  file?: string;
  title?: string;
  proof_type?: string;
}

interface MissionDossier {
  proofs?: MissionDossierProof[];
  chat_messages?: MissionDossierChatMessage[];
  gps_trail?: unknown[];
  media?: unknown[];
}

@Component({
  selector: 'app-admin-disputes',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatTableModule, MatPaginatorModule, MatSortModule,
    MatProgressSpinnerModule, MatSelectModule, MatFormFieldModule,
    MatInputModule, MatSnackBarModule, MatTooltipModule, MatDividerModule,
    MatDialogModule
  ],
  template: `
    <div class="disputes-container">

      <!-- Header -->
      <div class="page-header">
        <div>
          <h1>⚖️ Gestion des Litiges</h1>
          <p>{{ dataSource.data.length }} litige(s) sur la plateforme</p>
        </div>
        <button class="btn-refresh" (click)="loadDisputes()">
          <mat-icon>refresh</mat-icon> Actualiser
        </button>
      </div>

      <!-- KPI Stats -->
      <div class="kpi-row" *ngIf="!loading">
        <div class="kpi-card" *ngFor="let s of statCards" [style.border-left]="'4px solid ' + s.color">
          <div class="kpi-icon" [style.background]="s.bg" [style.color]="s.color">
            <mat-icon>{{ s.icon }}</mat-icon>
          </div>
          <div class="kpi-body">
            <span class="kpi-value">{{ s.value }}</span>
            <span class="kpi-label">{{ s.label }}</span>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div class="loading-container" *ngIf="loading">
        <mat-spinner diameter="40"></mat-spinner>
        <p>Chargement des litiges...</p>
      </div>

      <!-- Main content -->
      <div class="main-content" *ngIf="!loading">

        <!-- Table section -->
        <div class="table-section">

          <!-- Filters -->
          <div class="filters-bar">
            <div class="search-wrap">
              <mat-icon class="si">search</mat-icon>
              <input class="search-input" placeholder="Mission, plaignant, défendeur..." [(ngModel)]="searchTerm" (input)="applyFilters()" />
            </div>
            <select class="filter-select" [(ngModel)]="filterStatus" (change)="applyFilters()">
              <option value="">Tous les statuts</option>
              <option value="open">Ouvert</option>
              <option value="under_review">En examen</option>
              <option value="pending_evidence">Preuves en attente</option>
              <option value="arbitration">Arbitrage</option>
              <option value="resolved">Résolu</option>
              <option value="appealed">En appel</option>
              <option value="closed">Fermé</option>
            </select>
            <select class="filter-select" [(ngModel)]="filterReason" (change)="applyFilters()">
              <option value="">Tous motifs</option>
              <option value="non_delivery">Non livraison</option>
              <option value="late_delivery">Retard</option>
              <option value="poor_quality">Mauvaise qualité</option>
              <option value="incomplete_work">Travail incomplet</option>
              <option value="fake_proof">Fausse preuve</option>
              <option value="payment_issue">Paiement</option>
              <option value="behavior">Comportement</option>
              <option value="other">Autre</option>
            </select>
            <span class="results-count">{{ dataSource.filteredData.length }} résultat(s)</span>
          </div>

          <!-- Table -->
          <mat-card class="table-card">
            <table mat-table [dataSource]="dataSource" matSort class="disputes-table">

              <ng-container matColumnDef="mission">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Mission</th>
                <td mat-cell *matCellDef="let d">
                  <div class="mission-cell">
                    <span class="mission-title">{{ d.mission_title }}</span>
                    <span class="mission-budget" *ngIf="d.mission_budget">{{ d.mission_budget | number:'1.0-0' }} {{ d.mission_currency }}</span>
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="plaintiff">
                <th mat-header-cell *matHeaderCellDef>Plaignant</th>
                <td mat-cell *matCellDef="let d">
                  <div class="user-cell">
                    <div class="avatar-sm plaintiff">{{ (d.plaintiff.first_name[0]||'') + (d.plaintiff.last_name[0]||'') }}</div>
                    <span>{{ d.plaintiff.first_name }} {{ d.plaintiff.last_name }}</span>
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="defendant">
                <th mat-header-cell *matHeaderCellDef>Défendeur</th>
                <td mat-cell *matCellDef="let d">
                  <div class="user-cell">
                    <div class="avatar-sm defendant">{{ (d.defendant.first_name[0]||'') + (d.defendant.last_name[0]||'') }}</div>
                    <span>{{ d.defendant.first_name }} {{ d.defendant.last_name }}</span>
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="reason">
                <th mat-header-cell *matHeaderCellDef>Motif</th>
                <td mat-cell *matCellDef="let d">
                  <span class="reason-badge">{{ getReasonLabel(d.reason) }}</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Statut</th>
                <td mat-cell *matCellDef="let d">
                  <span class="status-badge" [class]="'s-' + d.status">{{ getStatusLabel(d.status) }}</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="decision">
                <th mat-header-cell *matHeaderCellDef>Décision</th>
                <td mat-cell *matCellDef="let d">
                  <span class="decision-badge" [class]="'d-' + d.decision" *ngIf="d.decision !== 'pending'">{{ getDecisionLabel(d.decision) }}</span>
                  <span class="no-decision" *ngIf="d.decision === 'pending'">—</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="created_at">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Date</th>
                <td mat-cell *matCellDef="let d">{{ d.created_at | date:'dd/MM/yy' }}</td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Actions</th>
                <td mat-cell *matCellDef="let d" (click)="$event.stopPropagation()">
                  <button class="btn-view" (click)="openPanel(d)" matTooltip="Voir détails"><mat-icon>visibility</mat-icon></button>
                  <button class="btn-resolve" (click)="openResolveModal(d)"
                    *ngIf="!['resolved','closed'].includes(d.status)"
                    matTooltip="Résoudre"><mat-icon>gavel</mat-icon></button>
                  <button class="btn-close-btn" (click)="closeDispute(d)"
                    *ngIf="d.status === 'resolved'"
                    matTooltip="Fermer"><mat-icon>lock</mat-icon></button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"
                (click)="openPanel(row)"
                [class.selected-row]="selectedDispute?.id === row.id"
                class="clickable-row"></tr>
            </table>
            <mat-paginator [pageSizeOptions]="[10, 25, 50]" showFirstLastButtons></mat-paginator>
          </mat-card>
        </div>

        <!-- Detail panel -->
        <div class="detail-panel" *ngIf="selectedDispute">
          <div class="panel-header">
            <h3>Détails du litige</h3>
            <button class="btn-close" (click)="closePanel()"><mat-icon>close</mat-icon></button>
          </div>
          <div class="panel-body">

            <!-- Status + badges -->
            <div class="panel-badges">
              <span class="status-badge" [class]="'s-' + selectedDispute.status">{{ getStatusLabel(selectedDispute.status) }}</span>
              <span class="decision-badge" [class]="'d-' + selectedDispute.decision" *ngIf="selectedDispute.decision !== 'pending'">{{ getDecisionLabel(selectedDispute.decision) }}</span>
            </div>

            <!-- Change status -->
            <div class="status-change" *ngIf="!['resolved','closed'].includes(selectedDispute.status)">
              <select class="filter-select full-w" [(ngModel)]="newStatus" (change)="changeStatus()">
                <option value="">Changer le statut...</option>
                <option value="under_review">En examen</option>
                <option value="pending_evidence">Preuves en attente</option>
                <option value="arbitration">Arbitrage</option>
              </select>
            </div>

            <mat-divider style="margin: 12px 0"></mat-divider>

            <!-- Mission -->
            <div class="info-row">
              <mat-icon>assignment</mat-icon>
              <div>
                <span class="info-label">Mission</span>
                <span class="info-val">{{ selectedDispute.mission_title }}</span>
                <span class="info-sub" *ngIf="selectedDispute.mission_budget">{{ selectedDispute.mission_budget | number:'1.0-0' }} {{ selectedDispute.mission_currency }}</span>
              </div>
            </div>

            <!-- Parties -->
            <div class="info-row">
              <mat-icon>person_outline</mat-icon>
              <div>
                <span class="info-label">Plaignant</span>
                <span class="info-val">{{ selectedDispute.plaintiff.first_name }} {{ selectedDispute.plaintiff.last_name }}</span>
                <span class="info-sub">{{ selectedDispute.plaintiff.email }}</span>
              </div>
            </div>
            <div class="info-row">
              <mat-icon>person</mat-icon>
              <div>
                <span class="info-label">Défendeur</span>
                <span class="info-val">{{ selectedDispute.defendant.first_name }} {{ selectedDispute.defendant.last_name }}</span>
                <span class="info-sub">{{ selectedDispute.defendant.email }}</span>
              </div>
            </div>

            <!-- Reason + description -->
            <div class="info-row">
              <mat-icon>error_outline</mat-icon>
              <div>
                <span class="info-label">Motif</span>
                <span class="info-val">{{ getReasonLabel(selectedDispute.reason) }}</span>
              </div>
            </div>
            <div class="description-box">
              <p class="info-label">Description</p>
              <p class="desc-text">{{ selectedDispute.description }}</p>
            </div>
            <div class="description-box" *ngIf="selectedDispute.requested_resolution">
              <p class="info-label">Résolution demandée</p>
              <p class="desc-text">{{ selectedDispute.requested_resolution }}</p>
            </div>

            <div class="panel-actions">
              <button class="action-resolve-btn" type="button" (click)="loadMissionDossier(selectedDispute)" [disabled]="dossierLoading">
                <mat-icon>folder_open</mat-icon> {{ dossierLoading ? 'Chargement…' : 'Dossier mission complet' }}
              </button>
            </div>
            <div class="dossier-box" *ngIf="missionDossier">
              <p class="info-label">Dossier arbitrage</p>
              <p class="info-sub">{{ missionDossier.proofs?.length || 0 }} preuve(s) · {{ missionDossier.chat_messages?.length || 0 }} message(s) · {{ missionDossier.gps_trail?.length || 0 }} point(s) GPS · {{ missionDossier.media?.length || 0 }} média(s)</p>
              <div class="dossier-proofs" *ngIf="missionDossier.proofs?.length">
                <a *ngFor="let p of missionDossier.proofs" [href]="p.file" target="_blank" rel="noopener">{{ p.title || p.proof_type }}</a>
              </div>
              <div class="dossier-chat" *ngIf="missionDossier.chat_messages?.length">
                <div *ngFor="let m of missionDossier.chat_messages | slice:0:30" class="message-item">
                  <strong>{{ m.sender?.first_name }}</strong>: {{ m.content }}
                </div>
              </div>
            </div>

            <!-- Decision details -->
            <div *ngIf="selectedDispute.decision !== 'pending'" class="decision-box">
              <p class="info-label">Décision rendue</p>
              <span class="decision-badge" [class]="'d-' + selectedDispute.decision">{{ getDecisionLabel(selectedDispute.decision) }}</span>
              <p class="desc-text" *ngIf="selectedDispute.decision_reason">{{ selectedDispute.decision_reason }}</p>
              <p class="info-sub" *ngIf="selectedDispute.decided_by">Par {{ selectedDispute.decided_by.first_name }} {{ selectedDispute.decided_by.last_name }} — {{ selectedDispute.decided_at | date:'dd/MM/yyyy HH:mm' }}</p>
              <div class="amounts" *ngIf="(selectedDispute.client_refund_amount || 0) > 0 || (selectedDispute.provider_payment_amount || 0) > 0">
                <span class="amount-chip client">Remboursement client : {{ selectedDispute.client_refund_amount | number:'1.0-0' }} {{ selectedDispute.mission_currency }}</span>
                <span class="amount-chip provider">Paiement prestataire : {{ selectedDispute.provider_payment_amount | number:'1.0-0' }} {{ selectedDispute.mission_currency }}</span>
              </div>
            </div>

            <mat-divider style="margin: 12px 0"></mat-divider>

            <!-- Messages -->
            <div class="messages-section">
              <p class="info-label">Notes internes ({{ (selectedDispute.messages || []).length }})</p>
              <div class="message-list">
                <div class="message-item" *ngFor="let msg of (selectedDispute.messages || [])">
                  <div class="msg-avatar">{{ (msg.sender.first_name[0]||'') }}</div>
                  <div class="msg-body">
                    <span class="msg-sender">{{ msg.sender.first_name }} {{ msg.sender.last_name }}</span>
                    <span class="msg-text">{{ msg.message }}</span>
                    <span class="msg-time">{{ msg.created_at | date:'dd/MM HH:mm' }}</span>
                  </div>
                </div>
                <p class="no-messages" *ngIf="!(selectedDispute.messages || []).length">Aucune note interne</p>
              </div>
              <div class="add-message">
                <input class="msg-input" placeholder="Ajouter une note interne..." [(ngModel)]="newMessage" (keyup.enter)="sendMessage()" />
                <button class="btn-send" (click)="sendMessage()" [disabled]="!newMessage.trim()"><mat-icon>send</mat-icon></button>
              </div>
            </div>

            <mat-divider style="margin: 12px 0"></mat-divider>

            <!-- Actions -->
            <div class="panel-actions" *ngIf="!['resolved','closed'].includes(selectedDispute.status)">
              <button class="action-resolve-btn" (click)="openResolveModal(selectedDispute)">
                <mat-icon>gavel</mat-icon> Rendre une décision
              </button>
            </div>
            <div class="panel-actions" *ngIf="selectedDispute.status === 'resolved'">
              <button class="action-close-btn" (click)="closeDispute(selectedDispute)">
                <mat-icon>lock</mat-icon> Fermer le litige
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Resolve Modal -->
      <div class="modal-overlay" *ngIf="resolveModalOpen" (click)="closeResolveModal()">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3><mat-icon>gavel</mat-icon> Rendre une décision</h3>
            <button class="btn-close" (click)="closeResolveModal()"><mat-icon>close</mat-icon></button>
          </div>
          <div class="modal-body" *ngIf="resolveForm">
            <p class="modal-subtitle">Litige : <strong>{{ resolveTarget?.mission_title }}</strong></p>
            <form [formGroup]="resolveForm">
              <div class="form-group">
                <label>Décision *</label>
                <select class="filter-select full-w" formControlName="decision">
                  <option value="">Choisir...</option>
                  <option value="client_wins">Client gagne — remboursement total</option>
                  <option value="provider_wins">Prestataire gagne — paiement total</option>
                  <option value="split">Partage 50/50</option>
                  <option value="partial_client">Remboursement partiel client</option>
                  <option value="partial_provider">Paiement partiel prestataire</option>
                </select>
              </div>
              <div class="form-group">
                <label>Motif de la décision *</label>
                <textarea class="form-textarea" formControlName="decision_reason" rows="3" placeholder="Expliquez la décision..."></textarea>
              </div>
              <div class="amounts-row">
                <div class="form-group">
                  <label>Remboursement client ({{ resolveTarget?.mission_currency }})</label>
                  <input type="number" class="form-input" formControlName="client_refund_amount" min="0" />
                </div>
                <div class="form-group">
                  <label>Paiement prestataire ({{ resolveTarget?.mission_currency }})</label>
                  <input type="number" class="form-input" formControlName="provider_payment_amount" min="0" />
                </div>
                <div class="form-group">
                  <label>Pénalité caution</label>
                  <input type="number" class="form-input" formControlName="deposit_penalty" min="0" />
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel-modal" (click)="closeResolveModal()">Annuler</button>
            <button class="btn-confirm" (click)="submitResolve()" [disabled]="resolveForm && !resolveForm.valid || submitting">
              <mat-icon>check</mat-icon> {{ submitting ? 'En cours...' : 'Confirmer la décision' }}
            </button>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .disputes-container {
      padding: 24px; max-width: 1500px; margin: 0 auto;
      display: flex; flex-direction: column; gap: 20px;
    }

    /* Header */
    .page-header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #fff; padding: 28px 32px; border-radius: 16px;
      display: flex; align-items: center; justify-content: space-between;
      h1 { margin: 0 0 4px; font-size: 22px; font-weight: 700; }
      p  { margin: 0; font-size: 13px; opacity: 0.8; }
    }
    .btn-refresh {
      display: flex; align-items: center; gap: 6px;
      background: rgba(255,255,255,0.12); color: #fff;
      border: 1px solid rgba(255,255,255,0.3); border-radius: 10px;
      padding: 8px 18px; cursor: pointer; font-size: 14px; font-weight: 500;
      &:hover { background: rgba(255,255,255,0.2); }
    }

    /* KPI */
    .kpi-row { display: grid; grid-template-columns: repeat(6,1fr); gap: 12px; }
    .kpi-card {
      background: #fff; border-radius: 12px; padding: 14px 16px;
      display: flex; align-items: center; gap: 10px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    .kpi-icon { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .kpi-body { display: flex; flex-direction: column; }
    .kpi-value { font-size: 20px; font-weight: 700; color: #1a1a2e; line-height: 1; }
    .kpi-label { font-size: 11px; color: #6b7280; margin-top: 2px; }

    /* Loading */
    .loading-container { display: flex; flex-direction: column; align-items: center; padding: 60px; gap: 16px; color: #6c757d; }

    /* Main */
    .main-content { display: flex; gap: 20px; align-items: flex-start; }
    .table-section { flex: 1; min-width: 0; }

    /* Filters */
    .filters-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
    .search-wrap {
      display: flex; align-items: center; gap: 8px;
      background: #fff; border: 1px solid #e2e8f0; border-radius: 10px;
      padding: 8px 12px; flex: 1; min-width: 200px;
      .si { color: #94a3b8; font-size: 18px; width: 18px; height: 18px; }
    }
    .search-input { flex: 1; border: none; outline: none; font-size: 14px; color: #1a1a2e; &::placeholder { color: #94a3b8; } }
    .filter-select { border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px 12px; font-size: 13px; color: #374151; background: #fff; outline: none; cursor: pointer; }
    .full-w { width: 100%; }
    .results-count { font-size: 13px; color: #6b7280; margin-left: auto; white-space: nowrap; }

    /* Table */
    .table-card { overflow: auto; border-radius: 14px !important; box-shadow: 0 2px 8px rgba(0,0,0,0.05) !important; }
    .disputes-table { width: 100%; }
    .clickable-row { cursor: pointer; &:hover { background: #f8fafc; } }
    .selected-row { background: #fef9f0 !important; }

    .mission-cell { display: flex; flex-direction: column; gap: 2px; }
    .mission-title { font-size: 13px; font-weight: 500; color: #1a1a2e; }
    .mission-budget { font-size: 11px; color: #059669; font-weight: 600; }

    .user-cell { display: flex; align-items: center; gap: 8px; font-size: 13px; }
    .avatar-sm {
      width: 28px; height: 28px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700; flex-shrink: 0;
      &.plaintiff { background: #fee2e2; color: #dc2626; }
      &.defendant { background: #dbeafe; color: #2563eb; }
    }

    .reason-badge { background: #fef3c7; color: #d97706; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; }

    .status-badge { padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .s-open             { background: #fee2e2; color: #dc2626; }
    .s-under_review     { background: #dbeafe; color: #2563eb; }
    .s-pending_evidence { background: #fef3c7; color: #d97706; }
    .s-arbitration      { background: #fce7f3; color: #be185d; }
    .s-resolved         { background: #d1fae5; color: #059669; }
    .s-appealed         { background: #e0e7ff; color: #4f46e5; }
    .s-closed           { background: #e5e7eb; color: #6b7280; }

    .decision-badge { padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .d-client_wins      { background: #d1fae5; color: #059669; }
    .d-provider_wins    { background: #dbeafe; color: #2563eb; }
    .d-split            { background: #e0e7ff; color: #4f46e5; }
    .d-partial_client   { background: #fef9c3; color: #ca8a04; }
    .d-partial_provider { background: #cffafe; color: #0891b2; }
    .no-decision { color: #94a3b8; font-size: 12px; }

    .btn-view   { background: #f1f5f9; border: none; border-radius: 8px; width: 32px; height: 32px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; mat-icon { font-size: 18px; width: 18px; height: 18px; color: #2563eb; } &:hover { background: #dbeafe; } }
    .btn-resolve { background: #fef3c7; border: none; border-radius: 8px; width: 32px; height: 32px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; margin-left: 4px; mat-icon { font-size: 18px; width: 18px; height: 18px; color: #d97706; } &:hover { background: #fde68a; } }
    .btn-close-btn { background: #f1f5f9; border: none; border-radius: 8px; width: 32px; height: 32px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; margin-left: 4px; mat-icon { font-size: 18px; width: 18px; height: 18px; color: #6b7280; } &:hover { background: #e2e8f0; } }

    /* Detail panel */
    .detail-panel { width: 340px; flex-shrink: 0; background: #fff; border-radius: 14px; border: 1px solid #e2e8f0; box-shadow: 0 4px 16px rgba(0,0,0,0.08); overflow: hidden; max-height: 90vh; overflow-y: auto; }
    .panel-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px; border-bottom: 1px solid #f1f5f9; background: #f8fafc; h3 { margin: 0; font-size: 15px; font-weight: 700; color: #1a1a2e; } }
    .btn-close { background: none; border: none; cursor: pointer; border-radius: 8px; padding: 4px; mat-icon { color: #94a3b8; } &:hover { background: #f1f5f9; } }
    .panel-body { padding: 16px; }
    .panel-badges { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }

    .status-change { margin-bottom: 10px; }

    .info-row { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px; mat-icon { font-size: 18px; width: 18px; height: 18px; color: #be185d; margin-top: 2px; flex-shrink: 0; } div { display: flex; flex-direction: column; } }
    .info-label { font-size: 11px; color: #94a3b8; font-weight: 500; }
    .info-val { font-size: 13px; color: #1a1a2e; font-weight: 500; }
    .info-sub { font-size: 11px; color: #6b7280; }

    .description-box { background: #f8fafc; border-radius: 8px; padding: 10px; margin-bottom: 10px; }
    .desc-text { margin: 4px 0 0; font-size: 13px; color: #374151; }

    .decision-box { background: #f0fdf4; border-radius: 8px; padding: 12px; margin-bottom: 10px; border-left: 3px solid #059669; }
    .amounts { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; }
    .amount-chip { font-size: 12px; font-weight: 600; padding: 3px 8px; border-radius: 8px; &.client { background: #d1fae5; color: #059669; } &.provider { background: #dbeafe; color: #2563eb; } }

    /* Messages */
    .messages-section { margin-bottom: 8px; }
    .message-list { display: flex; flex-direction: column; gap: 8px; max-height: 160px; overflow-y: auto; margin-bottom: 8px; }
    .message-item { display: flex; gap: 8px; }
    .msg-avatar { width: 28px; height: 28px; border-radius: 50%; background: #e0e7ff; color: #4f46e5; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
    .msg-body { display: flex; flex-direction: column; background: #f8fafc; border-radius: 8px; padding: 6px 10px; flex: 1; }
    .msg-sender { font-size: 11px; font-weight: 600; color: #4f46e5; }
    .msg-text { font-size: 12px; color: #374151; }
    .msg-time { font-size: 10px; color: #94a3b8; align-self: flex-end; }
    .no-messages { font-size: 12px; color: #94a3b8; text-align: center; padding: 8px; }
    .add-message { display: flex; gap: 6px; }
    .msg-input { flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 7px 10px; font-size: 13px; outline: none; &:focus { border-color: #be185d; } }
    .btn-send { background: #be185d; border: none; border-radius: 8px; width: 34px; height: 34px; cursor: pointer; display: flex; align-items: center; justify-content: center; mat-icon { color: #fff; font-size: 18px; width: 18px; height: 18px; } &:disabled { opacity: 0.4; cursor: not-allowed; } }

    /* Panel actions */
    .panel-actions { margin-top: 8px; }
    .action-resolve-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; background: #fef3c7; color: #d97706; border: none; border-radius: 10px; padding: 10px; cursor: pointer; font-weight: 600; font-size: 13px; mat-icon { font-size: 18px; width: 18px; height: 18px; } &:hover { background: #fde68a; } }
    .action-close-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; background: #f1f5f9; color: #6b7280; border: none; border-radius: 10px; padding: 10px; cursor: pointer; font-weight: 600; font-size: 13px; mat-icon { font-size: 18px; width: 18px; height: 18px; } &:hover { background: #e2e8f0; } }

    /* Modal */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; }
    .modal-box { background: #fff; border-radius: 16px; width: 540px; max-width: 95vw; box-shadow: 0 20px 60px rgba(0,0,0,0.2); overflow: hidden; }
    .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; background: #1a1a2e; color: #fff; h3 { margin: 0; font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 8px; mat-icon { color: #fbbf24; } } .btn-close { mat-icon { color: rgba(255,255,255,0.7); } &:hover { background: rgba(255,255,255,0.1); } } }
    .modal-subtitle { font-size: 13px; color: #6b7280; margin: 0 0 16px; }
    .modal-body { padding: 20px; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 20px; border-top: 1px solid #f1f5f9; }
    .form-group { margin-bottom: 14px; label { display: block; font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 5px; } }
    .form-textarea { width: 100%; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; font-size: 13px; resize: vertical; outline: none; &:focus { border-color: #be185d; } }
    .form-input { width: 100%; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; font-size: 13px; outline: none; &:focus { border-color: #be185d; } }
    .amounts-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
    .btn-cancel-modal { background: #f1f5f9; color: #374151; border: none; border-radius: 10px; padding: 9px 18px; cursor: pointer; font-weight: 500; &:hover { background: #e2e8f0; } }
    .btn-confirm { background: #be185d; color: #fff; border: none; border-radius: 10px; padding: 9px 18px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 6px; mat-icon { font-size: 18px; width: 18px; height: 18px; } &:disabled { opacity: 0.5; cursor: not-allowed; } &:hover:not(:disabled) { background: #9d174d; } }

    @media (max-width: 900px) {
      .kpi-row { grid-template-columns: repeat(3,1fr); }
      .main-content { flex-direction: column; }
      .detail-panel { width: 100%; max-height: none; }
      .amounts-row { grid-template-columns: 1fr; }
    }
  `]
})
export class AdminDisputesComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  dataSource = new MatTableDataSource<Dispute>([]);
  loading = true;
  displayedColumns = ['mission', 'plaintiff', 'defendant', 'reason', 'status', 'decision', 'created_at', 'actions'];

  selectedDispute: Dispute | null = null;
  missionDossier: MissionDossier | null = null;
  dossierLoading = false;
  searchTerm = '';
  filterStatus = '';
  filterReason = '';
  newStatus = '';
  newMessage = '';

  statCards: any[] = [];
  resolveModalOpen = false;
  resolveTarget: Dispute | null = null;
  resolveForm: FormGroup | null = null;
  submitting = false;

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private snackBar: MatSnackBar, private fb: FormBuilder) {}

  ngOnInit(): void { this.loadDisputes(); }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  loadDisputes(): void {
    this.loading = true;
    this.http.get<any>(`${this.apiUrl}/disputes/`, { headers: this.getHeaders() }).subscribe({
      next: (res) => {
        const disputes: Dispute[] = Array.isArray(res) ? res : (res?.results ?? []);
        this.dataSource.data = disputes;
        this.loading = false;
        this.applyFilters();
        this.buildStats();
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Erreur lors du chargement des litiges', 'Fermer', { duration: 3000 });
      }
    });
  }

  applyFilters(): void {
    this.dataSource.filterPredicate = (d: Dispute, filter: string) => {
      const f = JSON.parse(filter);
      const term = f.search;
      const sm = !term || d.mission_title.toLowerCase().includes(term) ||
        (d.plaintiff.first_name + ' ' + d.plaintiff.last_name).toLowerCase().includes(term) ||
        (d.defendant.first_name + ' ' + d.defendant.last_name).toLowerCase().includes(term);
      const stm = !f.status || d.status === f.status;
      const rm = !f.reason || d.reason === f.reason;
      return sm && stm && rm;
    };
    this.dataSource.filter = JSON.stringify({
      search: this.searchTerm.toLowerCase(),
      status: this.filterStatus,
      reason: this.filterReason
    });
  }

  buildStats(): void {
    const all = this.dataSource.data;
    this.statCards = [
      { label: 'Total', value: all.length, icon: 'balance', color: '#6C5CE7', bg: '#ede9fe' },
      { label: 'Ouverts', value: all.filter(d => d.status === 'open').length, icon: 'error', color: '#dc2626', bg: '#fee2e2' },
      { label: 'En examen', value: all.filter(d => d.status === 'under_review').length, icon: 'search', color: '#2563eb', bg: '#dbeafe' },
      { label: 'Arbitrage', value: all.filter(d => d.status === 'arbitration').length, icon: 'gavel', color: '#be185d', bg: '#fce7f3' },
      { label: 'Résolus', value: all.filter(d => d.status === 'resolved').length, icon: 'check_circle', color: '#059669', bg: '#d1fae5' },
      { label: 'Fermés', value: all.filter(d => d.status === 'closed').length, icon: 'lock', color: '#6b7280', bg: '#e5e7eb' },
    ];
  }

  openPanel(dispute: Dispute): void {
    this.selectedDispute = dispute;
    this.newStatus = '';
    this.newMessage = '';
    // Charger les messages si pas encore chargés
    if (!dispute.messages) {
      this.http.get<Dispute>(`${this.apiUrl}/disputes/${dispute.id}/`, { headers: this.getHeaders() }).subscribe({
        next: (d) => { this.selectedDispute = d; }
      });
    }
  }

  closePanel(): void {
    this.selectedDispute = null;
    this.missionDossier = null;
  }

  loadMissionDossier(dispute: Dispute): void {
    this.dossierLoading = true;
    this.http.get<MissionDossier>(
      `${this.apiUrl}/disputes/${dispute.id}/mission-dossier/`,
      { headers: this.getHeaders() },
    ).subscribe({
      next: (data) => {
        this.missionDossier = data;
        this.dossierLoading = false;
      },
      error: () => {
        this.dossierLoading = false;
        this.snackBar.open('Impossible de charger le dossier mission', 'Fermer', { duration: 4000 });
      },
    });
  }

  changeStatus(): void {
    if (!this.newStatus || !this.selectedDispute) return;
    this.http.patch(`${this.apiUrl}/disputes/${this.selectedDispute.id}/change_status/`,
      { status: this.newStatus }, { headers: this.getHeaders() }).subscribe({
      next: (updated: any) => {
        Object.assign(this.selectedDispute!, updated);
        const idx = this.dataSource.data.findIndex(d => d.id === this.selectedDispute!.id);
        if (idx >= 0) { const arr = [...this.dataSource.data]; arr[idx] = { ...arr[idx], status: this.newStatus }; this.dataSource.data = arr; }
        this.buildStats();
        this.newStatus = '';
        this.snackBar.open('Statut mis à jour', 'Fermer', { duration: 2000 });
      },
      error: () => this.snackBar.open('Erreur changement statut', 'Fermer', { duration: 3000 })
    });
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || !this.selectedDispute) return;
    this.http.post<DisputeMessage>(`${this.apiUrl}/disputes/${this.selectedDispute.id}/add_message/`,
      { message: this.newMessage, is_internal: true }, { headers: this.getHeaders() }).subscribe({
      next: (msg) => {
        if (!this.selectedDispute!.messages) this.selectedDispute!.messages = [];
        this.selectedDispute!.messages.push(msg);
        this.newMessage = '';
      },
      error: () => this.snackBar.open('Erreur envoi message', 'Fermer', { duration: 3000 })
    });
  }

  openResolveModal(dispute: Dispute): void {
    this.resolveTarget = dispute;
    this.resolveForm = this.fb.group({
      decision: ['', Validators.required],
      decision_reason: ['', Validators.required],
      client_refund_amount: [0],
      provider_payment_amount: [0],
      deposit_penalty: [0]
    });
    this.resolveModalOpen = true;
  }

  closeResolveModal(): void { this.resolveModalOpen = false; this.resolveTarget = null; }

  submitResolve(): void {
    if (!this.resolveForm?.valid || !this.resolveTarget) return;
    this.submitting = true;
    this.http.post(`${this.apiUrl}/disputes/${this.resolveTarget.id}/resolve/`,
      this.resolveForm.value, { headers: this.getHeaders() }).subscribe({
      next: (updated: any) => {
        const idx = this.dataSource.data.findIndex(d => d.id === this.resolveTarget!.id);
        if (idx >= 0) {
          const arr = [...this.dataSource.data];
          arr[idx] = { ...arr[idx], ...updated };
          this.dataSource.data = arr;
        }
        if (this.selectedDispute?.id === this.resolveTarget!.id) Object.assign(this.selectedDispute!, updated);
        this.buildStats();
        this.submitting = false;
        this.closeResolveModal();
        this.snackBar.open('Décision rendue avec succès', 'Fermer', { duration: 3000 });
      },
      error: () => { this.submitting = false; this.snackBar.open('Erreur lors de la résolution', 'Fermer', { duration: 3000 }); }
    });
  }

  closeDispute(dispute: Dispute): void {
    if (!confirm('Fermer définitivement ce litige ?')) return;
    this.http.post(`${this.apiUrl}/disputes/${dispute.id}/close/`, {}, { headers: this.getHeaders() }).subscribe({
      next: () => {
        dispute.status = 'closed';
        if (this.selectedDispute?.id === dispute.id) this.selectedDispute!.status = 'closed';
        this.buildStats();
        this.snackBar.open('Litige fermé', 'Fermer', { duration: 2000 });
      },
      error: () => this.snackBar.open('Erreur fermeture litige', 'Fermer', { duration: 3000 })
    });
  }

  getStatusLabel(s: string): string {
    const l: any = { open: 'Ouvert', under_review: 'En examen', pending_evidence: 'Preuves attendues', arbitration: 'Arbitrage', resolved: 'Résolu', appealed: 'En appel', closed: 'Fermé' };
    return l[s] || s;
  }
  getReasonLabel(r: string): string {
    const l: any = { non_delivery: 'Non livraison', late_delivery: 'Retard', damaged_item: 'Article endommagé', wrong_item: 'Mauvais article', poor_quality: 'Mauvaise qualité', incomplete_work: 'Travail incomplet', fake_proof: 'Fausse preuve', payment_issue: 'Paiement', behavior: 'Comportement', other: 'Autre' };
    return l[r] || r;
  }
  getDecisionLabel(d: string): string {
    const l: any = { pending: 'En attente', client_wins: 'Client gagne', provider_wins: 'Prestataire gagne', split: 'Partage 50/50', partial_client: 'Remb. partiel client', partial_provider: 'Paiement partiel prestataire' };
    return l[d] || d;
  }
}
