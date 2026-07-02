import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { lastValueFrom } from 'rxjs';
import { MissionService, Mission } from '../../../../core/services/mission.service';
import { ProofService } from '../../../../core/services/proof.service';
import { BlockchainService } from '../../../../core/services/blockchain.service';
import { Web3Service } from '../../../../core/services/web3.service';
import { PaymentMethodFlowService } from '../../../../core/services/payment-method-flow.service';
import { ChatComponent } from '../../../../shared/components/chat/chat.component';
import { GpsTrackingComponent } from '../../../../shared/components/gps-tracking/gps-tracking.component';

@Component({
  selector: 'app-provider-mission-detail',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatProgressBarModule, MatSnackBarModule,
    MatFormFieldModule, MatInputModule, MatDividerModule,
    MatDialogModule, MatProgressSpinnerModule,
    ChatComponent, GpsTrackingComponent,
  ],
  template: `
    <div class="page" *ngIf="!pageLoading; else loadingTpl">
      <ng-container *ngIf="mission">
        <!-- Header -->
        <div class="page-header">
          <button mat-button class="back-btn" (click)="goBack()">
            <mat-icon>arrow_back</mat-icon> Retour
          </button>
          <div class="header-actions">
            <button mat-stroked-button routerLink="/provider/missions/available" *ngIf="mission.status === 'funded'">
              <mat-icon>search</mat-icon> Autres missions
            </button>
          </div>
        </div>

        <!-- Hero -->
        <div class="hero" [class]="'hero-' + mission.status">
          <div class="hero-main">
            <div class="hero-badges">
              <span class="category-badge" *ngIf="mission.category">
                <mat-icon>{{ mission.category.icon || 'category' }}</mat-icon>
                {{ mission.category.name }}
              </span>
              <span class="status-badge" [class]="'status-' + mission.status">
                <mat-icon>{{ statusIcon(mission.status) }}</mat-icon>
                {{ statusLabel(mission.status) }}
              </span>
              <span class="priority-badge" *ngIf="mission.priority === 'urgent'">
                <mat-icon>bolt</mat-icon> Urgent
              </span>
            </div>
            <h1>{{ mission.title }}</h1>
            <p class="hero-desc">{{ mission.description }}</p>
          </div>
          <div class="hero-stats">
            <div class="stat-card highlight">
              <span class="stat-label">Rémunération</span>
              <span class="stat-value">{{ displayBudget() | number:'1.0-0' }} {{ mission.currency || 'XOF' }}</span>
            </div>
            <div class="stat-card" *ngIf="mission.deadline">
              <span class="stat-label">Échéance</span>
              <span class="stat-value">{{ mission.deadline | date:'dd MMM yyyy' }}</span>
              <span class="stat-hint">{{ deadlineHint(mission.deadline) }}</span>
            </div>
            <div class="stat-card" *ngIf="mission.expected_duration">
              <span class="stat-label">Durée estimée</span>
              <span class="stat-value">{{ mission.expected_duration }} min</span>
            </div>
            <div class="stat-card" *ngIf="mission.status === 'funded'">
              <span class="stat-label">Candidatures</span>
              <span class="stat-value">{{ applicationsCount() }}</span>
            </div>
          </div>
        </div>

        <!-- Progress timeline -->
        <div class="timeline-card">
          <div class="timeline">
            <div
              class="step"
              *ngFor="let step of timelineSteps; let i = index"
              [class.done]="step.done"
              [class.active]="step.active">
              <div class="step-dot">
                <mat-icon *ngIf="step.done">check</mat-icon>
                <span *ngIf="!step.done">{{ i + 1 }}</span>
              </div>
              <span class="step-label">{{ step.label }}</span>
            </div>
          </div>
        </div>

        <div class="layout">
          <!-- Main column -->
          <div class="main-col">
            <!-- Route -->
            <mat-card class="section-card">
              <mat-card-header>
                <mat-card-title><mat-icon>route</mat-icon> Itinéraire</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="route">
                  <div class="route-point pickup">
                    <div class="route-icon"><mat-icon>trip_origin</mat-icon></div>
                    <div>
                      <strong>Point de retrait</strong>
                      <p>{{ mission.pickup_address || '—' }}</p>
                    </div>
                  </div>
                  <div class="route-connector"></div>
                  <div class="route-point delivery">
                    <div class="route-icon"><mat-icon>place</mat-icon></div>
                    <div>
                      <strong>Point de livraison</strong>
                      <p>{{ mission.delivery_address || '—' }}</p>
                    </div>
                  </div>
                </div>
                <button mat-stroked-button class="map-btn" *ngIf="hasCoordinates()" (click)="openInMaps()">
                  <mat-icon>map</mat-icon> Ouvrir dans Google Maps
                </button>
              </mat-card-content>
            </mat-card>

            <!-- Requirements -->
            <mat-card class="section-card" *ngIf="hasRequirements()">
              <mat-card-header>
                <mat-card-title><mat-icon>rule</mat-icon> Exigences</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <mat-chip-set>
                  <mat-chip *ngIf="mission.requires_verified_provider">
                    <mat-icon>verified_user</mat-icon> Identité vérifiée
                  </mat-chip>
                  <mat-chip *ngIf="mission.requires_gps_tracking">
                    <mat-icon>gps_fixed</mat-icon> Suivi GPS
                  </mat-chip>
                  <mat-chip *ngIf="mission.min_reputation_score">
                    <mat-icon>star</mat-icon> Réputation min. {{ mission.min_reputation_score }}
                  </mat-chip>
                  <mat-chip *ngIf="reqFlag('requires_vehicle')">
                    <mat-icon>local_shipping</mat-icon> Véhicule requis
                  </mat-chip>
                  <mat-chip *ngIf="reqFlag('requires_photo')">
                    <mat-icon>photo_camera</mat-icon> Photo obligatoire
                  </mat-chip>
                  <mat-chip *ngIf="reqFlag('requires_signature')">
                    <mat-icon>draw</mat-icon> Signature
                  </mat-chip>
                </mat-chip-set>
              </mat-card-content>
            </mat-card>

            <!-- Deposit alert -->
            <div class="alert-card warn" *ngIf="mission.status === 'accepted' && !mission.deposit_paid">
              <mat-icon>security</mat-icon>
              <div>
                <strong>Caution requise</strong>
                <p>
                  Déposez {{ mission.required_deposit | number:'1.0-0' }} {{ mission.currency || 'XOF' }}
                  <span *ngIf="mission.deposit_deadline">avant {{ mission.deposit_deadline | date:'dd/MM HH:mm' }}</span>
                  pour démarrer la mission.
                </p>
              </div>
            </div>

            <!-- Proof section -->
            <mat-card class="section-card" id="proofs-section" *ngIf="mission.status === 'in_progress'">
              <mat-card-header>
                <mat-card-title><mat-icon>photo_camera</mat-icon> Preuves de mission</mat-card-title>
                <mat-card-subtitle>Ajoutez des photos puis finalisez pour soumettre au client</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <input type="file" accept="image/*" #fileInput (change)="onFileSelected($event)" hidden>
                <div class="proof-actions">
                  <button mat-stroked-button (click)="fileInput.click()" [disabled]="actionLoading">
                    <mat-icon>add_a_photo</mat-icon> Ajouter une photo
                  </button>
                  <span class="file-hint" *ngIf="selectedFile">{{ selectedFile.name }}</span>
                  <button mat-raised-button color="accent" (click)="uploadProof()" [disabled]="!selectedFile || actionLoading">
                    Envoyer
                  </button>
                  <button mat-raised-button color="primary" (click)="finalizeProofs()" [disabled]="actionLoading">
                    <mat-icon>task_alt</mat-icon> Finaliser et soumettre
                  </button>
                </div>
              </mat-card-content>
            </mat-card>

            <!-- GPS tracking -->
            <mat-card class="section-card" *ngIf="showGpsTracking()">
              <mat-card-header>
                <mat-card-title><mat-icon>gps_fixed</mat-icon> Suivi en direct</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <app-gps-tracking [missionId]="missionId"></app-gps-tracking>
              </mat-card-content>
            </mat-card>

            <!-- Chat -->
            <mat-card class="section-card" id="chat-section" *ngIf="showChat()">
              <mat-card-header>
                <mat-card-title><mat-icon>chat</mat-icon> Messagerie</mat-card-title>
              </mat-card-header>
              <mat-card-content class="chat-wrap">
                <app-chat [missionId]="missionId" [showSidebar]="false"></app-chat>
              </mat-card-content>
            </mat-card>

            <!-- Status history -->
            <mat-card class="section-card" *ngIf="mission.status_history?.length">
              <mat-card-header>
                <mat-card-title><mat-icon>history</mat-icon> Historique</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="history-list">
                  <div class="history-item" *ngFor="let h of mission.status_history">
                    <div class="history-dot"></div>
                    <div>
                      <strong>{{ statusLabel(h.new_status) }}</strong>
                      <p *ngIf="h.reason">{{ h.reason }}</p>
                      <small>{{ h.created_at | date:'dd/MM/yyyy HH:mm' }}</small>
                    </div>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          </div>

          <!-- Sidebar -->
          <aside class="side-col">
            <!-- Actions -->
            <mat-card class="action-card">
              <mat-card-header>
                <mat-card-title>Actions</mat-card-title>
              </mat-card-header>
              <mat-card-content class="action-list">
                <!-- Funded: apply -->
                <ng-container *ngIf="mission.status === 'funded'">
                  <div class="applied-banner" *ngIf="mission.is_applied">
                    <mat-icon>hourglass_top</mat-icon>
                    Candidature envoyée — en attente du client
                  </div>
                  <mat-form-field appearance="outline" class="full-width" *ngIf="!mission.is_applied && mission.can_apply">
                    <mat-label>Message de candidature</mat-label>
                    <textarea matInput rows="3" [(ngModel)]="applyMessage" placeholder="Présentez-vous au client..."></textarea>
                  </mat-form-field>
                  <button
                    mat-raised-button
                    color="primary"
                    class="full-width"
                    *ngIf="!mission.is_applied && mission.can_apply"
                    (click)="applyToMission()"
                    [disabled]="actionLoading">
                    <mat-icon>send</mat-icon> Postuler à cette mission
                  </button>
                  <p class="action-hint" *ngIf="!mission.is_applied && !mission.can_apply">
                    Vous ne pouvez pas postuler (mission complète, indisponible ou profil incomplet).
                  </p>
                </ng-container>

                <!-- Accepted: deposit + start -->
                <ng-container *ngIf="mission.status === 'accepted'">
                  <button mat-raised-button color="warn" class="full-width" *ngIf="!mission.deposit_paid" (click)="payDeposit()" [disabled]="actionLoading">
                    <mat-icon>security</mat-icon> Déposer la caution
                  </button>
                  <button mat-raised-button color="primary" class="full-width" *ngIf="mission.deposit_paid" (click)="startMission()" [disabled]="actionLoading">
                    <mat-icon>play_arrow</mat-icon> Démarrer la mission
                  </button>
                </ng-container>

                <!-- In progress -->
                <button mat-raised-button color="primary" class="full-width" *ngIf="mission.status === 'in_progress'" routerLink="/provider/tracking" [queryParams]="{ missionId: missionId }">
                  <mat-icon>gps_fixed</mat-icon> Activer le suivi GPS
                </button>

                <!-- Submitted -->
                <div class="info-banner" *ngIf="mission.status === 'submitted'">
                  <mat-icon>hourglass_empty</mat-icon>
                  En attente de validation par le client
                </div>

                <!-- Completed -->
                <div class="success-banner" *ngIf="mission.status === 'completed'">
                  <mat-icon>check_circle</mat-icon>
                  Mission terminée — paiement libéré
                </div>
              </mat-card-content>
            </mat-card>

            <!-- Client -->
            <mat-card class="side-card" *ngIf="mission.counterparty && mission.can_view_counterparty">
              <mat-card-header>
                <div mat-card-avatar class="avatar">{{ clientInitials() }}</div>
                <mat-card-title>{{ mission.counterparty.first_name }} {{ mission.counterparty.last_name }}</mat-card-title>
                <mat-card-subtitle>Client — mission en cours</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content class="counterparty-profile">
                <p *ngIf="mission.counterparty.phone_number"><mat-icon>phone</mat-icon> {{ mission.counterparty.phone_number }}</p>
                <p *ngIf="mission.counterparty.email"><mat-icon>email</mat-icon> {{ mission.counterparty.email }}</p>
                <p *ngIf="mission.counterparty.city"><mat-icon>location_city</mat-icon> {{ mission.counterparty.city }}</p>
                <p *ngIf="mission.counterparty.bio" class="bio">{{ mission.counterparty.bio }}</p>
              </mat-card-content>
            </mat-card>

            <mat-card class="side-card" *ngIf="mission.client && !mission.can_view_counterparty">
              <mat-card-header>
                <div mat-card-avatar class="avatar">{{ clientInitials() }}</div>
                <mat-card-title>{{ mission.client.first_name }} {{ mission.client.last_name }}</mat-card-title>
                <mat-card-subtitle>Client</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <p class="client-city" *ngIf="mission.client.city">
                  <mat-icon>location_city</mat-icon> {{ mission.client.city }}
                </p>
                <p class="contact-lock" *ngIf="!showClientContact()">
                  <mat-icon>lock</mat-icon> Coordonnées visibles au démarrage
                </p>
              </mat-card-content>
            </mat-card>

            <!-- Escrow / Blockchain -->
            <mat-card class="side-card escrow-card">
              <mat-card-header>
                <mat-card-title><mat-icon>account_balance_wallet</mat-icon> Sécurisation</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="escrow-row">
                  <span>Escrow</span>
                  <strong class="ok" *ngIf="mission.status !== 'draft'">Fonds bloqués</strong>
                </div>
                <div class="escrow-row" *ngIf="mission.required_deposit">
                  <span>Caution prestataire</span>
                  <strong [class.ok]="mission.deposit_paid">{{ mission.deposit_paid ? 'Déposée' : (mission.required_deposit | number:'1.0-0') + ' XOF' }}</strong>
                </div>
                <div class="escrow-row" *ngIf="mission.blockchain_status">
                  <span>Blockchain</span>
                  <strong>{{ blockchainLabel(mission.blockchain_status) }}</strong>
                </div>
                <a *ngIf="mission.escrow_tx_hash" class="tx-link" [href]="explorerUrl(mission.escrow_tx_hash)" target="_blank" rel="noopener">
                  <mat-icon>open_in_new</mat-icon> Voir transaction
                </a>
              </mat-card-content>
            </mat-card>

            <!-- Meta -->
            <mat-card class="side-card meta-card">
              <mat-card-content>
                <div class="meta-row">
                  <mat-icon>tag</mat-icon>
                  <span>ID {{ mission.id | slice:0:8 }}…</span>
                </div>
                <div class="meta-row" *ngIf="mission.created_at">
                  <mat-icon>calendar_today</mat-icon>
                  <span>Créée le {{ mission.created_at | date:'dd/MM/yyyy' }}</span>
                </div>
              </mat-card-content>
            </mat-card>
          </aside>
        </div>
      </ng-container>
    </div>

    <ng-template #loadingTpl>
      <div class="loading-page">
        <mat-spinner diameter="48"></mat-spinner>
        <p>Chargement de la mission…</p>
      </div>
    </ng-template>
  `,
  styles: [`
    .page { padding: 24px; max-width: 1200px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .back-btn { color: #4b5563; }
    .loading-page { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; gap: 16px; color: #6b7280; }

    .hero {
      background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #f8fafc 100%);
      border: 1px solid #d1fae5;
      border-radius: 16px;
      padding: 28px 32px;
      margin-bottom: 20px;
    }
    .hero-funded { border-color: #bfdbfe; background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%); }
    .hero-in_progress { border-color: #fde68a; background: linear-gradient(135deg, #fffbeb 0%, #f0fdf4 100%); }
    .hero-submitted, .hero-completed { border-color: #a7f3d0; }

    .hero-badges { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
    .category-badge, .status-badge, .priority-badge {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;
    }
    .category-badge { background: white; color: #374151; border: 1px solid #e5e7eb; }
    .category-badge mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .status-badge mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .status-funded { background: #dbeafe; color: #1e40af; }
    .status-accepted { background: #ede9fe; color: #5b21b6; }
    .status-in_progress { background: #fef3c7; color: #92400e; }
    .status-submitted { background: #cffafe; color: #155e75; }
    .status-completed { background: #d1fae5; color: #065f46; }
    .priority-badge { background: #fee2e2; color: #991b1b; }

    .hero h1 { font-size: 28px; font-weight: 700; color: #111827; margin: 0 0 8px; line-height: 1.2; }
    .hero-desc { color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0; max-width: 720px; }

    .hero-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
      margin-top: 24px;
    }
    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 14px 16px;
      border: 1px solid #e5e7eb;
    }
    .stat-card.highlight { border-color: #3CB371; background: #f0fdf4; }
    .stat-label { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #6b7280; margin-bottom: 4px; }
    .stat-value { display: block; font-size: 20px; font-weight: 700; color: #111827; }
    .stat-card.highlight .stat-value { color: #059669; }
    .stat-hint { font-size: 11px; color: #9ca3af; }

    .timeline-card {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 20px 24px;
      margin-bottom: 24px;
      overflow-x: auto;
    }
    .timeline { display: flex; justify-content: space-between; min-width: 480px; }
    .step { display: flex; flex-direction: column; align-items: center; flex: 1; position: relative; }
    .step:not(:last-child)::after {
      content: '';
      position: absolute;
      top: 14px;
      left: 50%;
      width: 100%;
      height: 2px;
      background: #e5e7eb;
      z-index: 0;
    }
    .step.done:not(:last-child)::after { background: #3CB371; }
    .step-dot {
      width: 28px; height: 28px; border-radius: 50%;
      background: #e5e7eb; color: #6b7280;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 700; z-index: 1; position: relative;
    }
    .step-dot mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .step.done .step-dot, .step.active .step-dot { background: #3CB371; color: white; }
    .step-label { font-size: 11px; color: #6b7280; margin-top: 8px; text-align: center; max-width: 80px; }
    .step.active .step-label { color: #059669; font-weight: 600; }

    .layout { display: grid; grid-template-columns: 1fr 320px; gap: 24px; align-items: start; }
    .section-card { margin-bottom: 20px; border-radius: 12px; }
    .section-card mat-card-title { display: flex; align-items: center; gap: 8px; font-size: 16px; }
    .section-card mat-card-title mat-icon { color: #3CB371; }

    .route { background: #f9fafb; border-radius: 12px; padding: 16px; }
    .route-point { display: flex; gap: 12px; }
    .route-icon {
      width: 36px; height: 36px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .pickup .route-icon { background: #ede9fe; color: #6C5CE7; }
    .delivery .route-icon { background: #d1fae5; color: #059669; }
    .route-point strong { font-size: 13px; color: #374151; }
    .route-point p { margin: 4px 0 0; font-size: 14px; color: #6b7280; }
    .route-connector { width: 2px; height: 24px; background: #e5e7eb; margin: 4px 0 4px 17px; }
    .map-btn { margin-top: 12px; }

    .alert-card {
      display: flex; gap: 12px; padding: 16px; border-radius: 12px; margin-bottom: 20px;
    }
    .alert-card.warn { background: #fef3c7; border: 1px solid #fde68a; color: #92400e; }
    .alert-card mat-icon { flex-shrink: 0; }
    .alert-card p { margin: 4px 0 0; font-size: 14px; }

    .proof-actions { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
    .file-hint { font-size: 13px; color: #6b7280; }

    .history-list { display: flex; flex-direction: column; gap: 16px; }
    .history-item { display: flex; gap: 12px; }
    .history-dot { width: 8px; height: 8px; border-radius: 50%; background: #3CB371; margin-top: 6px; flex-shrink: 0; }
    .history-item p { margin: 2px 0; font-size: 13px; color: #6b7280; }
    .history-item small { font-size: 12px; color: #9ca3af; }

    .action-card { border-radius: 12px; position: sticky; top: 80px; }
    .action-list { display: flex; flex-direction: column; gap: 12px; }
    .full-width { width: 100%; }
    .action-hint { font-size: 13px; color: #6b7280; margin: 0; }
    .applied-banner, .info-banner, .success-banner {
      display: flex; align-items: center; gap: 8px;
      padding: 12px; border-radius: 8px; font-size: 13px;
    }
    .applied-banner { background: #fef3c7; color: #92400e; }
    .info-banner { background: #e0f2fe; color: #0369a1; }
    .success-banner { background: #d1fae5; color: #065f46; }

    .side-card { border-radius: 12px; margin-bottom: 16px; }
    .avatar {
      width: 40px; height: 40px; border-radius: 50%;
      background: #3CB371; color: white;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 14px;
    }
    .client-city { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #6b7280; margin: 0; }
    .client-city mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .contact-lock { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #9ca3af; margin: 8px 0 0; }
    .contact-lock mat-icon { font-size: 14px; width: 14px; height: 14px; }

    .escrow-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
    .escrow-row span { color: #6b7280; }
    .escrow-row .ok { color: #059669; }
    .tx-link { display: inline-flex; align-items: center; gap: 4px; margin-top: 8px; font-size: 13px; color: #3CB371; text-decoration: none; }
    .tx-link mat-icon { font-size: 14px; width: 14px; height: 14px; }

    .meta-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #6b7280; padding: 6px 0; }
    .meta-row mat-icon { font-size: 16px; width: 16px; height: 16px; color: #9ca3af; }

    .chat-wrap { padding: 0; min-height: 320px; }

    @media (max-width: 960px) {
      .layout { grid-template-columns: 1fr; }
      .action-card { position: static; }
      .hero { padding: 20px; }
      .hero h1 { font-size: 22px; }
    }
  `]
})
export class ProviderMissionDetailComponent implements OnInit {
  missionId = '';
  mission: Mission | null = null;
  pageLoading = true;
  actionLoading = false;
  selectedFile: File | null = null;
  applyMessage = '';

  readonly timelineSteps: Array<{ key: string; label: string; done: boolean; active: boolean }> = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private missionService: MissionService,
    private proofService: ProofService,
    private snackBar: MatSnackBar,
    private blockchainService: BlockchainService,
    private web3Service: Web3Service,
    private paymentMethodFlow: PaymentMethodFlowService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.missionId = this.route.snapshot.paramMap.get('id') || '';
    this.loadMission();
    this.route.queryParams.subscribe((params) => {
      if (!this.pageLoading && this.mission) {
        this.scrollToSection(params['section']);
      }
    });
  }

  loadMission(): void {
    this.pageLoading = true;
    this.missionService.getMission(this.missionId).subscribe({
      next: (m) => {
        this.mission = m;
        if (!this.applyMessage) {
          this.applyMessage = `Bonjour, je suis disponible pour cette mission « ${m.title} ».`;
        }
        this.buildTimeline();
        this.pageLoading = false;
        const section = this.route.snapshot.queryParamMap.get('section');
        if (section) {
          setTimeout(() => this.scrollToSection(section), 150);
        }
      },
      error: () => {
        this.snackBar.open('Mission introuvable', 'Fermer', { duration: 3000 });
        this.pageLoading = false;
        this.router.navigate(['/provider/missions']);
      },
    });
  }

  private scrollToSection(section: string | null | undefined): void {
    if (!section) return;
    const ids: Record<string, string> = {
      proofs: 'proofs-section',
      chat: 'chat-section',
    };
    const el = document.getElementById(ids[section] || '');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private buildTimeline(): void {
    const order = ['funded', 'accepted', 'in_progress', 'submitted', 'completed'];
    const labels: Record<string, string> = {
      funded: 'Publiée',
      accepted: 'Acceptée',
      in_progress: 'En cours',
      submitted: 'Preuves',
      completed: 'Terminée',
    };
    const current = this.mission?.status || 'funded';
    const currentIdx = order.indexOf(current);
    this.timelineSteps.length = 0;
    for (let i = 0; i < order.length; i++) {
      this.timelineSteps.push({
        key: order[i],
        label: labels[order[i]],
        done: i < currentIdx || current === 'completed',
        active: order[i] === current,
      });
    }
  }

  goBack(): void {
    if (this.mission?.status === 'funded') {
      this.router.navigate(['/provider/missions/available']);
      return;
    }
    this.router.navigate(['/provider/missions']);
  }

  displayBudget(): number {
    return this.mission?.final_price || this.mission?.budget || 0;
  }

  applicationsCount(): number {
    return this.mission?.applications_count ?? this.mission?.application_count ?? 0;
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      funded: 'Disponible', accepted: 'Acceptée', in_progress: 'En cours',
      submitted: 'Preuves soumises', completed: 'Terminée', cancelled: 'Annulée',
    };
    return labels[status] || status;
  }

  statusIcon(status: string): string {
    const icons: Record<string, string> = {
      funded: 'campaign', accepted: 'handshake', in_progress: 'local_shipping',
      submitted: 'task', completed: 'check_circle',
    };
    return icons[status] || 'info';
  }

  blockchainLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'En attente', anchored: 'Ancrée', proof_submitted: 'Preuve ancrée',
      escrow_locked: 'Escrow verrouillé',
    };
    return labels[status] || status;
  }

  explorerUrl(txHash: string): string {
    return `https://sepolia.etherscan.io/tx/${txHash}`;
  }

  deadlineHint(deadline: string): string {
    const diff = new Date(deadline).getTime() - Date.now();
    if (diff < 0) return 'Échéance dépassée';
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours}h restantes`;
    return `${Math.floor(hours / 24)}j restants`;
  }

  hasCoordinates(): boolean {
    return !!(this.mission?.pickup_latitude && this.mission?.pickup_longitude);
  }

  openInMaps(): void {
    const lat = this.mission?.pickup_latitude;
    const lng = this.mission?.pickup_longitude;
    if (lat && lng) {
      window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
    }
  }

  hasRequirements(): boolean {
    const m = this.mission;
    if (!m) return false;
    return !!(m.requires_verified_provider || m.requires_gps_tracking || m.min_reputation_score
      || this.reqFlag('requires_vehicle') || this.reqFlag('requires_photo') || this.reqFlag('requires_signature'));
  }

  reqFlag(key: string): boolean {
    return !!(this.mission?.requirements as Record<string, boolean>)?.[key];
  }

  showGpsTracking(): boolean {
    return ['in_progress', 'submitted'].includes(this.mission?.status || '')
      && !!this.mission?.requires_gps_tracking;
  }

  showChat(): boolean {
    return ['in_progress', 'submitted', 'disputed', 'completed'].includes(this.mission?.status || '');
  }

  showClientContact(): boolean {
    return !!this.mission?.can_view_counterparty;
  }

  clientInitials(): string {
    const c = this.mission?.client;
    if (!c) return '?';
    return `${c.first_name?.[0] || ''}${c.last_name?.[0] || ''}`.toUpperCase();
  }

  applyToMission(): void {
    if (!this.mission?.can_apply) return;
    this.paymentMethodFlow.ensurePaymentMethod(this.dialog).subscribe({
      next: (ready) => {
        if (ready) this.submitApplication();
      },
    });
  }

  private submitApplication(): void {
    this.actionLoading = true;
    this.missionService.applyToMission(this.missionId, this.applyMessage.trim()).subscribe({
      next: () => {
        this.actionLoading = false;
        if (this.mission) {
          this.mission.is_applied = true;
          this.mission.can_apply = false;
        }
        this.snackBar.open('Candidature envoyée !', 'Fermer', { duration: 4000 });
      },
      error: (e) => {
        this.actionLoading = false;
        this.snackBar.open(e.error?.error || 'Erreur candidature', 'Fermer', { duration: 5000 });
      },
    });
  }

  payDeposit(): void {
    this.actionLoading = true;
    this.missionService.payDeposit(this.missionId).subscribe({
      next: () => {
        this.actionLoading = false;
        if (this.mission) this.mission.deposit_paid = true;
        this.snackBar.open('Caution déposée — vous pouvez démarrer', 'Fermer', { duration: 4000 });
        this.loadMission();
      },
      error: (e) => {
        this.actionLoading = false;
        const body = e.error;
        if (body?.required_deposit != null && body?.current_balance != null) {
          this.snackBar.open(
            `Solde insuffisant. Alimentez via Mobile Money.`,
            'Caution',
            { duration: 8000 },
          ).onAction().subscribe(() => this.router.navigate(['/provider/deposit']));
        } else {
          this.snackBar.open(body?.error || 'Erreur dépôt caution', 'Fermer', { duration: 5000 });
        }
      },
    });
  }

  startMission(): void {
    this.actionLoading = true;
    this.missionService.startMission(this.missionId).subscribe({
      next: () => {
        this.actionLoading = false;
        if (this.mission) this.mission.status = 'in_progress';
        this.buildTimeline();
        this.snackBar.open('Mission démarrée', 'Fermer', { duration: 3000 });
        this.loadMission();
      },
      error: (e) => {
        this.actionLoading = false;
        this.snackBar.open(e.error?.error || 'Erreur', 'Fermer', { duration: 4000 });
      },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] || null;
  }

  uploadProof(): void {
    if (!this.selectedFile) return;
    this.actionLoading = true;
    this.proofService.uploadProof(this.missionId, this.selectedFile, 'photo_after', 'Preuve mission').subscribe({
      next: () => {
        this.actionLoading = false;
        this.selectedFile = null;
        this.snackBar.open('Preuve envoyée', 'Fermer', { duration: 3000 });
      },
      error: () => {
        this.actionLoading = false;
        this.snackBar.open('Erreur envoi preuve', 'Fermer', { duration: 3000 });
      },
    });
  }

  finalizeProofs(): void {
    this.actionLoading = true;
    this.missionService.submitProof(this.missionId).subscribe({
      next: () => {
        if (this.mission) this.mission.status = 'submitted';
        this.buildTimeline();
        this.actionLoading = false;
        this.snackBar.open('Preuves soumises au client', 'Fermer', { duration: 3000 });
        this.anchorProofOnChain();
        this.loadMission();
      },
      error: (e) => {
        this.actionLoading = false;
        this.snackBar.open(e.error?.error || 'Ajoutez au moins une preuve', 'Fermer', { duration: 4000 });
      },
    });
  }

  private async anchorProofOnChain(): Promise<void> {
    if (!this.mission?.mission_contract_id) return;
    try {
      const status = await lastValueFrom(this.blockchainService.getStatus());
      if (!status.blockchain_enabled && !status.escrow_address) return;
      if (!this.web3Service.getAddress()) await this.web3Service.connectWallet();
      const proofHash = this.blockchainService.buildProofHash(this.missionId);
      const tx = await this.web3Service.submitProofOnChain(this.mission.mission_contract_id, proofHash);
      const waitResult: { receipt?: { blockNumber?: number }; blockNumber?: number } = await tx.wait();
      const blockNumber = waitResult?.receipt?.blockNumber ?? waitResult?.blockNumber;
      await lastValueFrom(this.blockchainService.recordProof({
        mission_id: this.missionId,
        tx_hash: tx.hash,
        proof_hash: proofHash,
        block_number: blockNumber,
      }));
      if (this.mission) this.mission.blockchain_status = 'proof_submitted';
      this.snackBar.open('Preuve ancrée sur Sepolia', 'Fermer', { duration: 4000 });
    } catch (err) {
      console.warn('Ancrage preuve blockchain optionnel:', err);
    }
  }
}
