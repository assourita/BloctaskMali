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
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MissionService, Mission } from '../../../../core/services/mission.service';
import { PaymentService } from '../../../../core/services/payment.service';
import { MissionApplicationsComponent } from '../mission-applications/mission-applications.component';
import { ChatComponent } from '../../../../shared/components/chat/chat.component';
import { GpsTrackingComponent } from '../../../../shared/components/gps-tracking/gps-tracking.component';
import { RatingDialogComponent } from '../../../../shared/components/rating/rating-dialog.component';

@Component({
  selector: 'app-mission-detail',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatProgressBarModule, MatSnackBarModule, MatFormFieldModule, MatInputModule,
    MatDialogModule, MatProgressSpinnerModule,
    MissionApplicationsComponent, ChatComponent, GpsTrackingComponent,
  ],
  template: `
    <div class="page" *ngIf="!loading; else loadingTpl">
      <ng-container *ngIf="mission">
        <div class="page-header">
          <button mat-button class="back-btn" (click)="goBack()">
            <mat-icon>arrow_back</mat-icon> Retour
          </button>
          <span class="status-badge" [class]="'status-' + mission.status">
            <mat-icon>{{ getStatusIcon(mission.status) }}</mat-icon>
            {{ getStatusLabel(mission.status) }}
          </span>
        </div>

        <div class="hero" [class]="'hero-' + mission.status">
          <div class="hero-badges">
            <span class="category-badge" *ngIf="mission.category">
              <mat-icon>{{ mission.category.icon || 'category' }}</mat-icon>
              {{ mission.category.name }}
            </span>
          </div>
          <h1>{{ mission.title }}</h1>
          <p class="hero-desc">{{ mission.description }}</p>
          <div class="hero-stats">
            <div class="stat-card highlight">
              <span class="stat-label">Budget</span>
              <span class="stat-value">{{ mission.budget | number:'1.0-0' }} {{ mission.currency }}</span>
            </div>
            <div class="stat-card" *ngIf="mission.deposit_amount">
              <span class="stat-label">Caution prestataire</span>
              <span class="stat-value">{{ mission.deposit_amount | number:'1.0-0' }} {{ mission.currency }}</span>
            </div>
            <div class="stat-card" *ngIf="mission.deadline" [class.overdue]="isDeadlineOverdue()">
              <span class="stat-label">Échéance</span>
              <span class="stat-value">{{ mission.deadline | date:'dd MMM yyyy HH:mm' }}</span>
              <span class="stat-overdue" *ngIf="isDeadlineOverdue()">Échéance dépassée</span>
            </div>
          </div>
        </div>

        <div class="timeline-card">
          <div class="timeline">
            <div class="step" *ngFor="let step of timelineSteps; let i = index" [class.done]="step.done" [class.active]="step.active">
              <div class="step-dot">
                <mat-icon *ngIf="step.done">check</mat-icon>
                <span *ngIf="!step.done">{{ i + 1 }}</span>
              </div>
              <span class="step-label">{{ step.label }}</span>
            </div>
          </div>
        </div>

        <mat-card class="section-card enterprise-progress" *ngIf="showEnterpriseProgress()">
          <mat-card-header>
            <mat-card-title><mat-icon>business</mat-icon> Suivi entreprise prestataire</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="ep-steps">
              <div class="ep-step done">
                <mat-icon>check_circle</mat-icon>
                <span>Mission acceptée par l'entreprise</span>
              </div>
              <div class="ep-step" [class.done]="mission.deposit_paid">
                <mat-icon>{{ mission.deposit_paid ? 'check_circle' : 'hourglass_empty' }}</mat-icon>
                <span>Caution entreprise {{ mission.deposit_paid ? 'déposée' : 'en attente' }}</span>
              </div>
              <div class="ep-step" [class.done]="!!mission.executing_employee">
                <mat-icon>{{ mission.executing_employee ? 'check_circle' : 'hourglass_empty' }}</mat-icon>
                <span>
                  <ng-container *ngIf="mission.executing_employee; else noEmployee">
                    Employé assigné : {{ mission.executing_employee.first_name }} {{ mission.executing_employee.last_name }}
                  </ng-container>
                  <ng-template #noEmployee>Assignation employé en cours</ng-template>
                </span>
              </div>
              <div class="ep-step" [class.done]="mission.status === 'in_progress' || mission.status === 'submitted' || mission.status === 'completed'">
                <mat-icon>{{ ['in_progress','submitted','completed'].includes(mission.status) ? 'check_circle' : 'hourglass_empty' }}</mat-icon>
                <span>Mission démarrée sur le terrain</span>
              </div>
            </div>
            <p class="ep-hint" *ngIf="mission.deposit_paid && !mission.executing_employee">
              L'entreprise prépare l'assignation d'un agent. Vous serez notifié au démarrage.
            </p>
          </mat-card-content>
        </mat-card>

        <mat-card class="expiry-alert" *ngIf="showExpiryDecision()">
          <mat-card-content>
            <div class="expiry-alert-inner">
              <mat-icon>schedule</mat-icon>
              <div>
                <strong>Échéance dépassée — action requise</strong>
                <p>
                  L'échéance de cette mission est dépassée. Prolongez-la ou annulez pour récupérer vos fonds
                  (la caution du prestataire sera restituée en cas d'annulation).
                </p>
                <p class="expiry-due" *ngIf="mission.expiry_decision_due_at">
                  Décision avant le {{ mission.expiry_decision_due_at | date:'dd/MM/yyyy HH:mm' }}
                </p>
              </div>
            </div>

            <div class="expiry-extend" *ngIf="showExtendForm">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Nouvelle échéance</mat-label>
                <input matInput type="datetime-local" [(ngModel)]="extendDeadlineLocal" [min]="minDeadlineLocal">
              </mat-form-field>
              <button mat-raised-button color="primary" class="full-width"
                [disabled]="expiryLoading || !extendDeadlineLocal" (click)="continueMission()">
                Confirmer la prolongation
              </button>
              <button mat-button type="button" (click)="showExtendForm = false">Retour</button>
            </div>

            <div class="expiry-actions" *ngIf="!showExtendForm">
              <button mat-raised-button color="primary" [disabled]="expiryLoading" (click)="openExtendForm()">
                <mat-icon>update</mat-icon> Prolonger la mission
              </button>
              <button mat-stroked-button color="warn" [disabled]="expiryLoading" (click)="cancelAfterExpiry()">
                <mat-icon>cancel</mat-icon> Annuler et rembourser
              </button>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="expiry-alert funded-overdue" *ngIf="isFundedOverdueNoProvider()">
          <mat-card-content>
            <div class="expiry-alert-inner">
              <mat-icon>info</mat-icon>
              <div>
                <strong>Échéance dépassée — aucun prestataire</strong>
                <p>
                  Aucun prestataire n'a été assigné à temps. Vos fonds bloqués en escrow vous seront
                  remboursés automatiquement.
                </p>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="expiry-alert expired-info" *ngIf="mission.status === 'expired'">
          <mat-card-content>
            <div class="expiry-alert-inner">
              <mat-icon>check_circle</mat-icon>
              <div>
                <strong>Mission expirée</strong>
                <p>Cette mission a expiré sans prestataire. Vos fonds ont été remboursés.</p>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <div class="layout">
          <div class="main-col">
            <mat-card class="section-card">
              <mat-card-header>
                <mat-card-title><mat-icon>route</mat-icon> Itinéraire</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="route">
                  <div class="route-point pickup">
                    <div class="route-icon"><mat-icon>trip_origin</mat-icon></div>
                    <div>
                      <strong>Retrait</strong>
                      <p>{{ mission.pickup_address }}</p>
                      <small *ngIf="pickupContact">Contact : {{ pickupContact }}</small>
                    </div>
                  </div>
                  <div class="route-connector"></div>
                  <div class="route-point delivery">
                    <div class="route-icon"><mat-icon>place</mat-icon></div>
                    <div>
                      <strong>Livraison</strong>
                      <p>{{ mission.delivery_address }}</p>
                      <small *ngIf="deliveryContact">Contact : {{ deliveryContact }}</small>
                    </div>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>

            <mat-card class="section-card" *ngIf="specialInstructions">
              <mat-card-header>
                <mat-card-title><mat-icon>info</mat-icon> Instructions spéciales</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <p class="instructions">{{ specialInstructions }}</p>
              </mat-card-content>
            </mat-card>

            <mat-card class="section-card" *ngIf="hasRequirements()">
              <mat-card-header>
                <mat-card-title><mat-icon>rule</mat-icon> Exigences</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <mat-chip-set>
                  <mat-chip *ngIf="reqFlag('requires_vehicle')"><mat-icon>local_shipping</mat-icon> Véhicule</mat-chip>
                  <mat-chip *ngIf="reqFlag('requires_photo')"><mat-icon>photo_camera</mat-icon> Photo</mat-chip>
                  <mat-chip *ngIf="reqFlag('requires_signature')"><mat-icon>draw</mat-icon> Signature</mat-chip>
                  <mat-chip *ngIf="mission.requires_gps_tracking"><mat-icon>gps_fixed</mat-icon> Suivi GPS</mat-chip>
                </mat-chip-set>
              </mat-card-content>
            </mat-card>

            <mat-card class="section-card waiting-card" *ngIf="!mission.provider && mission.status === 'funded'">
              <mat-card-content>
                <mat-icon>hourglass_empty</mat-icon>
                <div>
                  <h4>En attente de prestataire</h4>
                  <p>Consultez les candidatures ou sollicitez directement un prestataire / une entreprise.</p>
                  <button mat-raised-button color="primary" class="assign-btn" (click)="openAssignDialog()">
                    <mat-icon>assignment_ind</mat-icon> Attribuer la mission
                  </button>
                </div>
              </mat-card-content>
            </mat-card>

            <app-mission-applications
              *ngIf="mission.status === 'funded' || mission.status === 'accepted'"
              [missionId]="missionId"
              (applicationAccepted)="loadMission()">
            </app-mission-applications>

            <mat-card class="section-card" *ngIf="showGps()">
              <mat-card-header>
                <mat-card-title><mat-icon>gps_fixed</mat-icon> Suivi en direct</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <app-gps-tracking [missionId]="missionId"></app-gps-tracking>
              </mat-card-content>
            </mat-card>

            <mat-card class="section-card" *ngIf="showChat()">
              <mat-card-header>
                <mat-card-title><mat-icon>chat</mat-icon> Messagerie</mat-card-title>
              </mat-card-header>
              <mat-card-content class="chat-wrap">
                <app-chat [missionId]="missionId" [showSidebar]="false"></app-chat>
              </mat-card-content>
            </mat-card>

            <mat-card class="section-card" *ngIf="mission.status_history?.length">
              <mat-card-header>
                <mat-card-title><mat-icon>history</mat-icon> Historique</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="history-list">
                  <div class="history-item" *ngFor="let h of mission.status_history">
                    <div class="history-dot"></div>
                    <div>
                      <strong>{{ getStatusLabel(h.new_status) }}</strong>
                      <p *ngIf="h.reason">{{ h.reason }}</p>
                      <small>{{ h.created_at | date:'dd/MM/yyyy HH:mm' }}</small>
                    </div>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          </div>

          <aside class="side-col">
            <mat-card class="action-card">
              <mat-card-header><mat-card-title>Actions</mat-card-title></mat-card-header>
              <mat-card-content class="action-list">
                <mat-card class="payment-inline" *ngIf="mission.status === 'pending' && mission.payment_id">
                  <p><mat-icon>payments</mat-icon> Paiement Mobile Money requis</p>
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Code OTP</mat-label>
                    <input matInput [(ngModel)]="paymentOtp" placeholder="1234">
                    <mat-hint>Mode test : 1234</mat-hint>
                  </mat-form-field>
                  <button mat-raised-button color="primary" class="full-width" (click)="confirmPayment()">
                    <mat-icon>lock</mat-icon> Confirmer le paiement
                  </button>
                </mat-card>

                <button mat-stroked-button color="warn" class="full-width" *ngIf="canCancel()" (click)="cancelMission()">
                  <mat-icon>cancel</mat-icon> Annuler la mission
                </button>
                <button mat-raised-button color="primary" class="full-width"
                  *ngIf="!mission.provider && mission.status === 'funded'"
                  (click)="openAssignDialog()">
                  <mat-icon>assignment_ind</mat-icon> Attribuer la mission
                </button>
                <a mat-stroked-button class="full-width" [routerLink]="solicitationsLink"
                  *ngIf="!mission.provider && mission.status === 'funded'">
                  <mat-icon>send</mat-icon> Sollicitations envoyées
                </a>
                <button mat-raised-button color="primary" class="full-width" *ngIf="mission.status === 'submitted'" (click)="validateMission()">
                  <mat-icon>check_circle</mat-icon> Valider et libérer le paiement
                </button>
                <button mat-raised-button color="accent" class="full-width" *ngIf="mission.status === 'completed' && mission.provider && !rated" (click)="openRating()">
                  <mat-icon>star</mat-icon> Noter le prestataire
                </button>
                <a mat-stroked-button class="full-width" [routerLink]="trackingLink" [queryParams]="{ missionId: missionId }" *ngIf="showGps()">
                  <mat-icon>map</mat-icon> Voir sur la carte
                </a>
              </mat-card-content>
            </mat-card>

            <mat-card class="side-card" *ngIf="mission.counterparty && mission.can_view_counterparty">
              <mat-card-header>
                <img mat-card-avatar [src]="mission.counterparty.profile_picture || 'assets/default-avatar.png'" />
                <mat-card-title>{{ mission.counterparty.first_name }} {{ mission.counterparty.last_name }}</mat-card-title>
                <mat-card-subtitle>Prestataire — mission en cours</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content class="counterparty-profile">
                <p *ngIf="mission.counterparty.phone_number"><mat-icon>phone</mat-icon> {{ mission.counterparty.phone_number }}</p>
                <p *ngIf="mission.counterparty.email"><mat-icon>email</mat-icon> {{ mission.counterparty.email }}</p>
                <p *ngIf="mission.counterparty.city"><mat-icon>location_on</mat-icon> {{ mission.counterparty.city }}{{ mission.counterparty.country ? ', ' + mission.counterparty.country : '' }}</p>
                <p *ngIf="mission.counterparty.reputation_score != null"><mat-icon>star</mat-icon> Réputation {{ mission.counterparty.reputation_score | number:'1.0-0' }}/100</p>
                <p *ngIf="mission.counterparty.bio" class="bio">{{ mission.counterparty.bio }}</p>
              </mat-card-content>
            </mat-card>

            <mat-card class="side-card" *ngIf="mission.provider && !mission.can_view_counterparty">
              <mat-card-header>
                <img mat-card-avatar [src]="mission.provider.profile_picture || 'assets/default-avatar.png'" />
                <mat-card-title>{{ mission.provider.first_name }} {{ mission.provider.last_name }}</mat-card-title>
                <mat-card-subtitle>Prestataire assigné</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <p class="contact-row" *ngIf="showProviderContact() && providerPhone">
                  <mat-icon>phone</mat-icon> {{ providerPhone }}
                </p>
                <p class="contact-lock" *ngIf="!showProviderContact()">
                  <mat-icon>lock</mat-icon> Coordonnées au démarrage de la mission
                </p>
              </mat-card-content>
            </mat-card>

            <mat-card class="side-card escrow-card">
              <mat-card-header>
                <mat-card-title><mat-icon>account_balance_wallet</mat-icon> Sécurisation</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="escrow-row">
                  <span>Escrow</span>
                  <strong class="ok" *ngIf="mission.status === 'funded' || mission.status === 'accepted' || mission.status === 'in_progress'">Fonds bloqués</strong>
                  <strong *ngIf="mission.status === 'completed'" class="ok">Libéré</strong>
                </div>
                <div class="escrow-row" *ngIf="mission.blockchain_status">
                  <span>Blockchain</span>
                  <strong>{{ mission.blockchain_status }}</strong>
                </div>
              </mat-card-content>
            </mat-card>
          </aside>
        </div>
      </ng-container>
    </div>

    <ng-template #loadingTpl>
      <div class="loading-page">
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
        <p>Chargement…</p>
      </div>
    </ng-template>
  `,
  styles: [`
    .page { padding: 24px; max-width: 1200px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .back-btn { color: #4b5563; }
    .loading-page { padding: 80px 24px; text-align: center; color: #6b7280; }

    .status-badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;
    }
    .status-badge mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .status-funded { background: #dbeafe; color: #1e40af; }
    .status-pending { background: #fef3c7; color: #92400e; }
    .status-accepted { background: #ede9fe; color: #6C5CE7; }
    .status-in_progress { background: #d1fae5; color: #065f46; }
    .status-submitted { background: #cffafe; color: #155e75; }
    .status-completed { background: #d1fae5; color: #065f46; }
    .status-cancelled { background: #fee2e2; color: #991b1b; }

    .hero {
      background: linear-gradient(135deg, #f5f3ff 0%, #f0fdf4 100%);
      border: 1px solid #e9d5ff;
      border-radius: 16px;
      padding: 28px 32px;
      margin-bottom: 20px;
    }
    .hero-badges { margin-bottom: 12px; }
    .category-badge {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;
      background: white; border: 1px solid #e5e7eb;
    }
    .category-badge mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .hero h1 { font-size: 28px; font-weight: 700; margin: 0 0 8px; color: #111827; }
    .hero-desc { color: #4b5563; line-height: 1.6; margin: 0; }
    .hero-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-top: 20px; }
    .stat-card { background: white; border-radius: 12px; padding: 14px 16px; border: 1px solid #e5e7eb; }
    .stat-card.highlight { border-color: #6C5CE7; background: #faf5ff; }
    .stat-label { display: block; font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 4px; }
    .stat-value { font-size: 20px; font-weight: 700; color: #111827; }
    .stat-card.overdue { border-color: #f59e0b; background: #fffbeb; }
    .stat-overdue { display: block; font-size: 11px; font-weight: 700; color: #d97706; margin-top: 4px; }

    .timeline-card { background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 24px; overflow-x: auto; }

    .expiry-alert {
      margin-bottom: 24px;
      border-radius: 12px;
      border: 1px solid #f59e0b;
      background: #fffbeb;
    }
    .expiry-alert-inner { display: flex; gap: 16px; align-items: flex-start; margin-bottom: 16px; }
    .expiry-alert-inner mat-icon { font-size: 36px; width: 36px; height: 36px; color: #d97706; flex-shrink: 0; }
    .expiry-alert strong { display: block; font-size: 16px; color: #92400e; margin-bottom: 6px; }
    .expiry-alert p { margin: 0; font-size: 14px; color: #92400e; line-height: 1.5; }
    .expiry-due { margin-top: 8px !important; font-weight: 600; }
    .expiry-actions { display: flex; flex-wrap: wrap; gap: 12px; }
    .expiry-extend { display: flex; flex-direction: column; gap: 8px; }
    .expired-info { border-color: #6b7280; background: #f9fafb; }
    .expired-info mat-icon { color: #059669 !important; }
    .funded-overdue { border-color: #3b82f6; background: #eff6ff; }
    .funded-overdue mat-icon { color: #2563eb !important; }
    .funded-overdue strong, .funded-overdue p { color: #1e40af !important; }

    .timeline { display: flex; justify-content: space-between; min-width: 480px; }
    .step { display: flex; flex-direction: column; align-items: center; flex: 1; position: relative; }
    .step:not(:last-child)::after { content: ''; position: absolute; top: 14px; left: 50%; width: 100%; height: 2px; background: #e5e7eb; }
    .step.done:not(:last-child)::after { background: #6C5CE7; }
    .step-dot { width: 28px; height: 28px; border-radius: 50%; background: #e5e7eb; display: flex; align-items: center; justify-content: center; z-index: 1; position: relative; font-size: 12px; font-weight: 700; }
    .step.done .step-dot, .step.active .step-dot { background: #6C5CE7; color: white; }
    .step-dot mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .step-label { font-size: 11px; color: #6b7280; margin-top: 8px; text-align: center; }
    .step.active .step-label { color: #6C5CE7; font-weight: 600; }

    .layout { display: grid; grid-template-columns: 1fr 320px; gap: 24px; }
    .section-card { margin-bottom: 20px; border-radius: 12px; }
    .section-card mat-card-title { display: flex; align-items: center; gap: 8px; font-size: 16px; }
    .section-card mat-card-title mat-icon { color: #6C5CE7; }
    .enterprise-progress .ep-steps { display: flex; flex-direction: column; gap: 10px; }
    .ep-step { display: flex; align-items: center; gap: 10px; color: #94a3b8; font-size: 14px; padding: 8px 12px; border-radius: 8px; background: #f9fafb; }
    .ep-step.done { color: #059669; background: #ecfdf5; }
    .ep-step mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .ep-hint { margin: 12px 0 0; font-size: 13px; color: #64748b; }

    .route { background: #f9fafb; border-radius: 12px; padding: 16px; }
    .route-point { display: flex; gap: 12px; }
    .route-icon { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
    .pickup .route-icon { background: #ede9fe; color: #6C5CE7; }
    .delivery .route-icon { background: #d1fae5; color: #059669; }
    .route-point p { margin: 4px 0; color: #6b7280; font-size: 14px; }
    .route-point small { font-size: 12px; color: #9ca3af; }
    .route-connector { width: 2px; height: 24px; background: #e5e7eb; margin: 4px 0 4px 17px; }

    .instructions { background: #fef3c7; padding: 12px 16px; border-radius: 8px; color: #92400e; margin: 0; }
    .waiting-card mat-card-content { display: flex; gap: 16px; align-items: center; background: #fffbeb; }
    .waiting-card mat-icon { font-size: 40px; width: 40px; height: 40px; color: #f59e0b; }
    .waiting-card h4 { margin: 0 0 4px; }
    .waiting-card p { margin: 0 0 12px; font-size: 14px; color: #6b7280; }
    .assign-btn { margin-top: 4px; }

    .history-list { display: flex; flex-direction: column; gap: 16px; }
    .history-item { display: flex; gap: 12px; }
    .history-dot { width: 8px; height: 8px; border-radius: 50%; background: #6C5CE7; margin-top: 6px; }
    .history-item p { margin: 2px 0; font-size: 13px; color: #6b7280; }
    .history-item small { font-size: 12px; color: #9ca3af; }

    .action-card { border-radius: 12px; position: sticky; top: 80px; }
    .action-list { display: flex; flex-direction: column; gap: 12px; }
    .full-width { width: 100%; }
    .payment-inline { padding: 12px; background: #f9fafb; box-shadow: none; border: 1px solid #e5e7eb; }
    .payment-inline p { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; font-weight: 600; }

    .side-card { border-radius: 12px; margin-bottom: 16px; }
    .contact-row { display: flex; align-items: center; gap: 8px; margin: 0; }
    .contact-lock { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #6b7280; margin: 0; }
    .escrow-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
    .escrow-row .ok { color: #059669; }
    .chat-wrap { min-height: 300px; }

    @media (max-width: 960px) {
      .layout { grid-template-columns: 1fr; }
      .action-card { position: static; }
    }
  `]
})
export class MissionDetailComponent implements OnInit {
  mission: (Mission & {
    pickup_contact_name?: string;
    pickup_contact_phone?: string;
    delivery_contact_name?: string;
    delivery_contact_phone?: string;
    special_instructions?: string;
    requires_vehicle?: boolean;
    requires_photo?: boolean;
    requires_signature?: boolean;
    rated?: boolean;
    deposit_amount?: number;
  }) | null = null;
  loading = true;
  missionId = '';
  paymentOtp = '1234';
  rated = false;
  showExtendForm = false;
  extendDeadlineLocal = '';
  minDeadlineLocal = '';
  expiryLoading = false;
  timelineSteps: Array<{ key: string; label: string; done: boolean; active: boolean }> = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private missionService: MissionService,
    private snackBar: MatSnackBar,
    private paymentService: PaymentService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.missionId = this.route.snapshot.paramMap.get('id') || '';
    this.loadMission();
  }

  loadMission(): void {
    this.loading = true;
    this.missionService.getMission(this.missionId).subscribe({
      next: (m) => {
        this.mission = m as typeof this.mission;
        this.rated = !!(m as { rated?: boolean }).rated;
        this.buildTimeline();
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Erreur chargement mission', 'Fermer', { duration: 3000 });
        this.loading = false;
      },
    });
  }

  private buildTimeline(): void {
    const order = ['pending', 'funded', 'accepted', 'in_progress', 'submitted', 'completed'];
    const labels: Record<string, string> = {
      pending: 'Paiement', funded: 'Publiée', accepted: 'Acceptée',
      in_progress: 'En cours', submitted: 'Validation', completed: 'Terminée',
    };
    const current = this.mission?.status || 'pending';
    const currentIdx = order.indexOf(current);
    this.timelineSteps = order.map((key, i) => ({
      key,
      label: labels[key],
      done: i < currentIdx || current === 'completed',
      active: key === current,
    }));
  }

  get pickupContact(): string {
    const m = this.mission;
    if (!m?.pickup_contact_name) return '';
    return m.pickup_contact_phone ? `${m.pickup_contact_name} — ${m.pickup_contact_phone}` : m.pickup_contact_name;
  }

  get deliveryContact(): string {
    const m = this.mission;
    if (!m?.delivery_contact_name) return '';
    return m.delivery_contact_phone ? `${m.delivery_contact_name} — ${m.delivery_contact_phone}` : m.delivery_contact_name;
  }

  get specialInstructions(): string {
    return this.mission?.special_instructions
      || (this.mission?.requirements as Record<string, string>)?.['special_instructions']
      || '';
  }

  get providerPhone(): string {
    return this.mission?.counterparty?.phone_number || this.mission?.provider?.phone_number || '';
  }

  get isEnterpriseContext(): boolean {
    return !!this.route.snapshot.data['enterpriseContext'] || this.router.url.includes('/enterprise/');
  }

  get providersLink(): string {
    return this.isEnterpriseContext ? '/enterprise/providers' : '/client/providers';
  }

  get solicitationsLink(): string {
    return this.isEnterpriseContext ? '/enterprise/solicitations/sent' : '/client/solicitations';
  }

  get trackingLink(): string {
    return this.isEnterpriseContext ? '/enterprise/tracking' : '/client/tracking';
  }

  goBack(): void {
    const url = this.router.url;
    if (url.includes('/enterprise/')) {
      this.router.navigate(['/enterprise/missions']);
      return;
    }
    this.router.navigate(['/client/missions']);
  }

  getStatusIcon(status: string | undefined): string {
    const icons: Record<string, string> = {
      pending: 'payments', funded: 'campaign', accepted: 'person',
      in_progress: 'local_shipping', submitted: 'task', completed: 'check_circle', cancelled: 'cancel',
    };
    return icons[status || ''] || 'help';
  }

  getStatusLabel(status: string | undefined): string {
    const labels: Record<string, string> = {
      pending: 'En attente paiement', funded: 'Financée', accepted: 'Acceptée',
      in_progress: 'En cours', submitted: 'Preuves soumises', completed: 'Terminée', cancelled: 'Annulée',
    };
    return labels[status || ''] || status || 'Inconnu';
  }

  hasRequirements(): boolean {
    const m = this.mission;
    return !!(m?.requires_vehicle || m?.requires_photo || m?.requires_signature || m?.requires_gps_tracking
      || this.reqFlag('requires_vehicle') || this.reqFlag('requires_photo') || this.reqFlag('requires_signature'));
  }

  reqFlag(key: string): boolean {
    const m = this.mission as Record<string, unknown> | null;
    if (!m) return false;
    return !!(m['requirements'] as Record<string, boolean>)?.[key] || !!m[key];
  }

  showGps(): boolean {
    return ['in_progress', 'submitted'].includes(this.mission?.status || '');
  }

  showChat(): boolean {
    return !!this.mission?.provider && ['in_progress', 'submitted', 'disputed', 'completed'].includes(this.mission?.status || '');
  }

  showEnterpriseProgress(): boolean {
    if (!this.mission?.provider) return false;
    const isEnterprise = !!(this.mission.counterparty?.enterprise_name);
    return isEnterprise && ['accepted', 'in_progress', 'submitted'].includes(this.mission.status || '');
  }

  showProviderContact(): boolean {
    return !!this.mission?.can_view_counterparty;
  }

  canCancel(): boolean {
    if (this.mission?.expiry_decision_pending) return false;
    return ['funded', 'accepted', 'pending'].includes(this.mission?.status || '');
  }

  showExpiryDecision(): boolean {
    if (this.mission?.status !== 'accepted' || !this.mission?.provider) return false;
    if (this.mission.expiry_decision_pending) return true;
    return this.isDeadlineOverdue();
  }

  isDeadlineOverdue(): boolean {
    if (!this.mission?.deadline) return false;
    if (['completed', 'cancelled', 'expired'].includes(this.mission.status || '')) return false;
    return new Date(this.mission.deadline).getTime() < Date.now();
  }

  isFundedOverdueNoProvider(): boolean {
    return (
      this.mission?.status === 'funded' &&
      !this.mission?.provider &&
      this.isDeadlineOverdue()
    );
  }

  openExtendForm(): void {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(18, 0, 0, 0);
    this.extendDeadlineLocal = this.toLocalDatetimeInput(d);
    this.minDeadlineLocal = this.toLocalDatetimeInput(new Date());
    this.showExtendForm = true;
  }

  private toLocalDatetimeInput(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  continueMission(): void {
    if (!this.extendDeadlineLocal) return;
    const iso = new Date(this.extendDeadlineLocal).toISOString();
    this.expiryLoading = true;
    this.missionService.expireMissionDecision(this.missionId, 'continue', { new_deadline: iso }).subscribe({
      next: () => {
        this.snackBar.open('Mission prolongée', 'Fermer', { duration: 3000 });
        this.showExtendForm = false;
        this.expiryLoading = false;
        this.loadMission();
      },
      error: (e) => {
        this.expiryLoading = false;
        this.snackBar.open(e.error?.error || 'Erreur prolongation', 'Fermer', { duration: 4000 });
      },
    });
  }

  cancelAfterExpiry(): void {
    if (!confirm(
      'Annuler cette mission ? Vos fonds seront remboursés et la caution du prestataire restituée.',
    )) return;
    this.expiryLoading = true;
    this.missionService.expireMissionDecision(this.missionId, 'cancel').subscribe({
      next: () => {
        this.snackBar.open('Mission annulée — remboursement effectué', 'Fermer', { duration: 4000 });
        this.expiryLoading = false;
        this.loadMission();
      },
      error: (e) => {
        this.expiryLoading = false;
        this.snackBar.open(e.error?.error || 'Erreur annulation', 'Fermer', { duration: 4000 });
      },
    });
  }

  cancelMission(): void {
    if (!confirm('Annuler cette mission ?')) return;
    this.missionService.cancelMission(this.missionId).subscribe({
      next: () => {
        if (this.mission) this.mission.status = 'cancelled';
        this.buildTimeline();
        this.snackBar.open('Mission annulée', 'Fermer', { duration: 3000 });
      },
      error: () => this.snackBar.open('Erreur annulation', 'Fermer', { duration: 3000 }),
    });
  }

  confirmPayment(): void {
    if (!this.mission?.payment_id) return;
    this.paymentService.confirmPayment(this.mission.payment_id, this.paymentOtp).subscribe({
      next: () => {
        this.snackBar.open('Paiement confirmé — mission publiée', 'Fermer', { duration: 3000 });
        this.loadMission();
      },
      error: (e) => this.snackBar.open(e.error?.detail || 'Erreur paiement', 'Fermer', { duration: 4000 }),
    });
  }

  validateMission(): void {
    this.missionService.validateMission(this.missionId).subscribe({
      next: () => {
        if (this.mission) this.mission.status = 'completed';
        this.buildTimeline();
        this.snackBar.open('Mission validée !', 'Fermer', { duration: 3000 });
        this.loadMission();
      },
      error: () => this.snackBar.open('Erreur validation', 'Fermer', { duration: 3000 }),
    });
  }

  openRating(): void {
    if (!this.mission?.provider) return;
    this.dialog.open(RatingDialogComponent, {
      width: '420px',
      data: {
        missionId: this.missionId,
        ratedUserId: this.mission.provider.id,
        ratedUserName: `${this.mission.provider.first_name} ${this.mission.provider.last_name}`,
        ratedUserType: 'provider',
        missionTitle: this.mission.title,
      },
    }).afterClosed().subscribe((ok) => {
      if (ok) this.rated = true;
    });
  }

  openAssignDialog(): void {
    if (!this.mission) return;
    this.router.navigate([this.providersLink], {
      queryParams: { missionId: this.missionId },
    });
  }
}
