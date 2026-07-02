import { Component, OnInit } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatStepperModule } from '@angular/material/stepper';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Overlay, ScrollStrategy } from '@angular/cdk/overlay';
import { environment } from '../../../../../environments/environment';
import { PaymentService, PaymentMethod, MobileMoneyOperator } from '../../../../core/services/payment.service';
import { Web3Service } from '../../../../core/services/web3.service';
import { BlockchainService } from '../../../../core/services/blockchain.service';
import { MALI_COUNTRY, DEFAULT_PHONE_PREFIX } from '../../../../core/constants/africa.constants';
import { AuthService } from '../../../../core/services/auth.service';
import { EnterpriseMissionsNavComponent } from '../../../enterprise/enterprise-missions-nav.component';

interface CategoryRules {
  slug: string;
  label: string;
  mission_type: string;
  requires_deposit: boolean;
  deposit_mode: string;
  deposit_percent: number;
  deposit_reason: string;
  requires_merchandise_value: boolean;
  requires_vehicle: boolean;
  requires_photo: boolean;
  requires_signature: boolean;
  requires_id_verification: boolean;
  requires_gps_tracking: boolean;
  enterprise_only: boolean;
  min_reputation_score: number;
  requires_pickup: boolean;
  requires_delivery: boolean;
  requirement_labels: string[];
  location_label: string;
  date_label: string;
  show_time_range: boolean;
}

interface Category { id: string; name: string; icon: string; slug: string; rules?: CategoryRules; }

// Category types for dynamic form behavior
type CategoryType = 'delivery' | 'home_service' | 'location_based' | 'remote' | 'other';

interface CategoryConfig {
  type: CategoryType;
  requiresPickup: boolean;
  requiresDelivery: boolean;
  showContacts: boolean;
  locationLabel: string;
  requirements: string[];
  dateType: 'deadline' | 'work_date' | 'schedule' | 'recurring';
  dateLabel: string;
  showTimeRange: boolean; // Show start/end time inputs
}

@Component({
  selector: 'app-create-mission',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatStepperModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    EnterpriseMissionsNavComponent,
  ],
  template: `
    <app-enterprise-missions-nav *ngIf="isEnterprise" />
    <div class="create-mission-container">
      <mat-card class="form-card">
        <mat-card-header>
          <div class="header-content">
            <mat-icon class="header-icon">add_circle</mat-icon>
            <div>
              <mat-card-title>Créer une nouvelle mission</mat-card-title>
              <mat-card-subtitle>Décrivez votre besoin et trouvez un prestataire</mat-card-subtitle>
            </div>
          </div>
        </mat-card-header>

        <mat-card-content>
          <mat-stepper linear #stepper>
            <!-- Step 1: Mission Details -->
            <mat-step [stepControl]="missionDetailsForm">
              <ng-template matStepLabel>Détails</ng-template>
              <form [formGroup]="missionDetailsForm" class="step-form">
                <mat-form-field appearance="fill" class="full-width">
                  <mat-label>Titre de la mission</mat-label>
                  <input matInput formControlName="title" placeholder="Ex: Livraison colis urgent">
                  <mat-error *ngIf="missionDetailsForm.get('title')?.hasError('required')">
                    Le titre est requis
                  </mat-error>
                </mat-form-field>

                <mat-form-field appearance="fill" class="full-width">
                  <mat-label>Description</mat-label>
                  <textarea 
                    matInput 
                    formControlName="description" 
                    rows="4"
                    placeholder="Décrivez en détail ce que vous attendez..."
                  ></textarea>
                </mat-form-field>

                <div class="form-row">
                  <div class="native-select-wrapper">
                    <label class="field-label">Catégorie *</label>
                    <select class="native-select" formControlName="category" [attr.disabled]="loadingCategories ? '' : null">
                      <option value="" disabled *ngIf="loadingCategories">Chargement...</option>
                      <option value="" disabled selected *ngIf="!loadingCategories">Sélectionnez une catégorie</option>
                      <option *ngFor="let cat of categories" [ngValue]="cat.id">{{ cat.name }}</option>
                    </select>
                    <div class="error-msg" *ngIf="missionDetailsForm.get('category')?.hasError('required') && missionDetailsForm.get('category')?.touched">
                      Sélectionnez une catégorie
                    </div>
                  </div>

                  <mat-form-field appearance="fill">
                    <mat-label>Budget (FCFA)</mat-label>
                    <input matInput type="number" formControlName="budget" placeholder="50">
                    <span matSuffix>FCFA</span>
                    <mat-error *ngIf="missionDetailsForm.get('budget')?.hasError('required')">
                      Le budget est requis
                    </mat-error>
                    <mat-error *ngIf="missionDetailsForm.get('budget')?.hasError('min')">
                      Min 5 000 FCFA
                    </mat-error>
                  </mat-form-field>
                </div>

                <!-- Date + heure (calendrier + horloge) -->
                <div class="date-field-container">
                  <mat-form-field appearance="fill" class="full-width">
                    <mat-label>{{ dateLabel }}</mat-label>
                    <input matInput [matDatepicker]="missionDatePicker" formControlName="deadline" [min]="minDate">
                    <mat-datepicker-toggle matIconSuffix [for]="missionDatePicker"></mat-datepicker-toggle>
                    <mat-datepicker #missionDatePicker></mat-datepicker>
                    <mat-error *ngIf="missionDetailsForm.get('deadline')?.hasError('required')">
                      La date est requise
                    </mat-error>
                  </mat-form-field>

                  <!-- Une seule heure (deadline / livraison ponctuelle) -->
                  <mat-form-field appearance="fill" class="time-field full-width" *ngIf="!showTimeRange">
                    <mat-label>Heure</mat-label>
                    <input matInput type="time" formControlName="start_time">
                    <mat-icon matSuffix>schedule</mat-icon>
                    <mat-error *ngIf="missionDetailsForm.get('start_time')?.hasError('required')">
                      L'heure est requise
                    </mat-error>
                  </mat-form-field>

                  <!-- Plage horaire (RDV, intervention, déménagement…) -->
                  <div class="time-range-row" *ngIf="showTimeRange">
                    <mat-form-field appearance="fill" class="time-field">
                      <mat-label>Heure de début</mat-label>
                      <input matInput type="time" formControlName="start_time">
                      <mat-icon matSuffix>schedule</mat-icon>
                      <mat-error *ngIf="missionDetailsForm.get('start_time')?.hasError('required')">
                        Requis
                      </mat-error>
                    </mat-form-field>
                    <mat-form-field appearance="fill" class="time-field">
                      <mat-label>Heure de fin (optionnel)</mat-label>
                      <input matInput type="time" formControlName="end_time">
                      <mat-icon matSuffix>schedule</mat-icon>
                    </mat-form-field>
                  </div>

                  <p class="duration-hint" *ngIf="showTimeRange && computedDurationMinutes">
                    <mat-icon>timelapse</mat-icon>
                    Durée estimée : {{ computedDurationMinutes }} minutes (calculée depuis les heures)
                  </p>
                </div>
              </form>

              <div class="step-actions">
                <button mat-raised-button color="primary" matStepperNext [disabled]="missionDetailsForm.invalid">
                  Suivant
                  <mat-icon>arrow_forward</mat-icon>
                </button>
              </div>
            </mat-step>

            <!-- Step 2: Locations - Dynamic based on category -->
            <mat-step [stepControl]="locationsForm">
              <ng-template matStepLabel>{{ locationStepLabel }}</ng-template>
              <form [formGroup]="locationsForm" class="step-form">

                <!-- DELIVERY TYPE: Pickup + Delivery -->
                <ng-container *ngIf="isDeliveryType">
                  <div class="location-section">
                    <h3>
                      <mat-icon>location_on</mat-icon>
                      Point de départ
                    </h3>
                    <mat-form-field appearance="fill" class="full-width">
                      <mat-label>Adresse de retrait</mat-label>
                      <input matInput formControlName="pickup_address" placeholder="Ex: Cocody, Rue des Jardins">
                      <mat-error *ngIf="locationsForm.get('pickup_address')?.hasError('required')">
                        L'adresse est requise
                      </mat-error>
                    </mat-form-field>

                    <div class="form-row">
                      <mat-form-field appearance="fill">
                        <mat-label>Nom du contact</mat-label>
                        <input matInput formControlName="pickup_contact_name">
                      </mat-form-field>
                      <mat-form-field appearance="fill">
                        <mat-label>Téléphone</mat-label>
                        <input matInput formControlName="pickup_contact_phone">
                      </mat-form-field>
                    </div>
                  </div>

                  <div class="location-section">
                    <h3>
                      <mat-icon>flag</mat-icon>
                      Point d'arrivée
                    </h3>
                    <mat-form-field appearance="fill" class="full-width">
                      <mat-label>Adresse de livraison</mat-label>
                      <input matInput formControlName="delivery_address" placeholder="Ex: Plateau, Avenue Champs de Mars">
                      <mat-error *ngIf="locationsForm.get('delivery_address')?.hasError('required')">
                        L'adresse est requise
                      </mat-error>
                    </mat-form-field>

                    <div class="form-row">
                      <mat-form-field appearance="fill">
                        <mat-label>Nom du contact</mat-label>
                        <input matInput formControlName="delivery_contact_name">
                      </mat-form-field>
                      <mat-form-field appearance="fill">
                        <mat-label>Téléphone</mat-label>
                        <input matInput formControlName="delivery_contact_phone">
                      </mat-form-field>
                    </div>
                  </div>
                </ng-container>

                <!-- HOME SERVICE TYPE: Just service location -->
                <ng-container *ngIf="isHomeServiceType">
                  <div class="location-section">
                    <h3>
                      <mat-icon>home</mat-icon>
                      Lieu d'intervention
                    </h3>
                    <mat-form-field appearance="fill" class="full-width">
                      <mat-label>Adresse complète</mat-label>
                      <input matInput formControlName="service_location" placeholder="Ex: Cocody, Rue des Jardins, Immeuble X, Apt 5">
                      <mat-error *ngIf="locationsForm.get('service_location')?.hasError('required')">
                        L'adresse est requise
                      </mat-error>
                    </mat-form-field>
                    <p class="hint-text">
                      <mat-icon>info</mat-icon>
                      Le prestataire ne verra votre adresse qu'après acceptation de la mission.
                    </p>
                  </div>
                </ng-container>

                <!-- OTHER TYPES: Simple addresses without contacts -->
                <ng-container *ngIf="!isDeliveryType && !isHomeServiceType">
                  <div class="location-section" *ngIf="requiresPickupLocation">
                    <h3>
                      <mat-icon>location_on</mat-icon>
                      Adresse de départ
                    </h3>
                    <mat-form-field appearance="fill" class="full-width">
                      <mat-label>Adresse</mat-label>
                      <input matInput formControlName="pickup_address">
                    </mat-form-field>
                  </div>

                  <div class="location-section" *ngIf="requiresDeliveryLocation">
                    <h3>
                      <mat-icon>flag</mat-icon>
                      Adresse d'arrivée
                    </h3>
                    <mat-form-field appearance="fill" class="full-width">
                      <mat-label>Adresse</mat-label>
                      <input matInput formControlName="delivery_address">
                    </mat-form-field>
                  </div>
                </ng-container>

              </form>

              <div class="step-actions">
                <button mat-button matStepperPrevious>Retour</button>
                <button mat-raised-button color="primary" matStepperNext [disabled]="locationsForm.invalid">
                  Suivant
                  <mat-icon>arrow_forward</mat-icon>
                </button>
              </div>
            </mat-step>

            <!-- Step 3: Requirements -->
            <mat-step>
              <ng-template matStepLabel>Options</ng-template>
              <div class="step-form">
                <h3>Exigences — {{ selectedCategory?.name || 'catégorie' }}</h3>

                <div class="category-rules-info" *ngIf="apiRules">
                  <mat-icon>policy</mat-icon>
                  <div>
                    <p *ngIf="apiRules.deposit_reason"><strong>Caution :</strong> {{ apiRules.deposit_reason }}</p>
                    <p *ngIf="apiRules.requirement_labels?.length">
                      <strong>Obligatoire :</strong> {{ apiRules.requirement_labels.join(' · ') }}
                    </p>
                  </div>
                </div>

                <mat-form-field appearance="fill" class="full-width" *ngIf="requiresMerchandiseValue">
                  <mat-label>Valeur de la marchandise (XOF)</mat-label>
                  <input matInput type="number" min="1000" [(ngModel)]="merchandiseValue"
                    [ngModelOptions]="{standalone: true}" (ngModelChange)="refreshDepositPreview()" />
                  <mat-hint>Caution prestataire basée sur cette valeur (colis, achats, médicaments…)</mat-hint>
                </mat-form-field>

                <div class="deposit-preview" *ngIf="estimatedDepositPreview > 0">
                  <mat-icon>security</mat-icon>
                  Caution prestataire estimée : <strong>{{ estimatedDepositPreview | number:'1.0-0' }} XOF</strong>
                </div>

                <div class="checkbox-group">
                  <mat-checkbox [(ngModel)]="requirements.requires_vehicle" [ngModelOptions]="{standalone: true}"
                    [disabled]="!!apiRules?.requires_vehicle">
                    <mat-icon>local_shipping</mat-icon>
                    Véhicule requis
                  </mat-checkbox>
                  
                  <mat-checkbox [(ngModel)]="requirements.requires_photo" [ngModelOptions]="{standalone: true}"
                    [disabled]="!!apiRules?.requires_photo">
                    <mat-icon>photo_camera</mat-icon>
                    Photo obligatoire
                  </mat-checkbox>
                  
                  <mat-checkbox [(ngModel)]="requirements.requires_signature" [ngModelOptions]="{standalone: true}"
                    [disabled]="!!apiRules?.requires_signature">
                    <mat-icon>draw</mat-icon>
                    Signature requise
                  </mat-checkbox>
                  
                  <mat-checkbox [(ngModel)]="requires_id_verification" [ngModelOptions]="{standalone: true}"
                    [disabled]="!!apiRules?.requires_id_verification">
                    <mat-icon>badge</mat-icon>
                    Vérification ID
                  </mat-checkbox>
                </div>

                <mat-form-field appearance="fill" class="full-width">
                  <mat-label>Instructions spéciales</mat-label>
                  <textarea 
                    matInput 
                    [(ngModel)]="special_instructions" 
                    [ngModelOptions]="{standalone: true}"
                    rows="3"
                    placeholder="Ex: Sonner à l'interphone, colis fragile..."
                  ></textarea>
                </mat-form-field>

                <div class="summary-card">
                  <h4>Récapitulatif</h4>
                  <div class="summary-item">
                    <span>Mission:</span>
                    <strong>{{ missionDetailsForm.value.title || '-' }}</strong>
                  </div>
                  <div class="summary-item">
                    <span>Catégorie:</span>
                    <strong>{{ selectedCategory?.name || '-' }}</strong>
                  </div>
                  <div class="summary-item">
                    <span>Budget:</span>
                    <strong>{{ missionDetailsForm.value.budget ? (missionDetailsForm.value.budget | number) + ' FCFA' : '-' }}</strong>
                  </div>
                  <div class="summary-item">
                    <span>{{ dateLabel }}:</span>
                    <strong>{{ scheduleSummary }}</strong>
                  </div>
                  <div class="summary-item" *ngIf="isDeliveryType">
                    <span>Itinéraire:</span>
                    <strong>{{ locationsForm.value.pickup_address || 'Départ' }} → {{ locationsForm.value.delivery_address || 'Arrivée' }}</strong>
                  </div>

                  <!-- Home service location -->
                  <div class="summary-item" *ngIf="isHomeServiceType">
                    <span>Lieu:</span>
                    <strong>{{ locationsForm.value.service_location || '-' }}</strong>
                  </div>

                  <!-- Escrow info -->
                  <div class="escrow-notice">
                    <mat-icon>shield</mat-icon>
                    <p>
                      <strong>Paiement sécurisé via escrow</strong><br>
                      Les coordonnées du client et du prestataire seront échangées uniquement après acceptation mutuelle et dépôt des cautions.
                    </p>
                  </div>
                </div>
              </div>

              <div class="step-actions">
                <button mat-button matStepperPrevious>Retour</button>
                <button mat-raised-button color="primary" matStepperNext>Suivant</button>
              </div>
            </mat-step>

            <!-- Step 4: Payment -->
            <mat-step [stepControl]="paymentForm" label="Paiement">
              <div class="step-content" [formGroup]="paymentForm">
                <h3 class="step-title">Paiement sécurisé</h3>
                <p class="step-subtitle">
                  Le montant sera bloqué sur votre compte et libéré au prestataire après validation de la mission.
                </p>

                <!-- Payment Summary -->
                <div class="payment-summary-card">
                  <h4>Récapitulatif du paiement</h4>
                  <div class="payment-row">
                    <span>Montant mission:</span>
                    <strong>{{ missionDetailsForm.value.budget ? (missionDetailsForm.value.budget | number) + ' FCFA' : '-' }}</strong>
                  </div>
                  <div class="payment-row fee">
                    <span>Frais plateforme (5%):</span>
                    <strong>-{{ (missionDetailsForm.value.budget || 0) * 0.05 | number }} FCFA</strong>
                  </div>
                  <div class="payment-row total">
                    <span>Total à payer:</span>
                    <strong>{{ missionDetailsForm.value.budget ? (missionDetailsForm.value.budget | number) + ' FCFA' : '-' }}</strong>
                  </div>
                </div>

                <!-- Payment Method Selection -->
                <div class="payment-method-section">
                  <h4>Méthode de paiement</h4>

                  <div class="payment-method-cards">
                    <div
                      class="payment-method-card"
                      [class.selected]="selectedPaymentMethod === 'mobile_money'"
                      (click)="selectedPaymentMethod = 'mobile_money'; paymentForm.patchValue({payment_method: 'mobile_money'})"
                    >
                      <mat-icon>phone_android</mat-icon>
                      <span>Mobile Money</span>
                    </div>
                  </div>

                  <!-- Mobile Money Form -->
                  <div *ngIf="selectedPaymentMethod === 'mobile_money'" class="mobile-money-form">
                    <!-- Native select to avoid CDK overlay positioning issues -->
                    <div class="operator-native-wrapper">
                      <label class="operator-label">Opérateur</label>
                      <select formControlName="operator" class="operator-native-select">
                        <option value="" disabled selected>Sélectionnez un opérateur</option>
                        <option *ngFor="let op of mobileMoneyOperators" [value]="op.id">
                          {{ op.name }}
                        </option>
                      </select>
                      <div class="operator-select-arrow">
                        <mat-icon>arrow_drop_down</mat-icon>
                      </div>
                      <div class="operator-error" *ngIf="paymentForm.get('operator')?.hasError('required') && paymentForm.get('operator')?.touched">
                        Veuillez sélectionner un opérateur
                      </div>
                    </div>

                    <!-- Numéro Mali (+223) -->
                    <div class="phone-row">
                      <div class="mali-prefix-badge">
                        <span>{{ maliCountry.flag }} Mali</span>
                        <strong>{{ maliCountry.phonePrefix }}</strong>
                      </div>

                      <mat-form-field appearance="fill" class="phone-input">
                        <mat-label>Numéro Mobile Money</mat-label>
                        <input matInput formControlName="phone_number" type="tel" [placeholder]="maliCountry.phonePlaceholder">
                        <mat-icon matPrefix>phone</mat-icon>
                        <mat-error *ngIf="paymentForm.get('phone_number')?.hasError('required')">
                          Le numéro est requis
                        </mat-error>
                        <mat-error *ngIf="paymentForm.get('phone_number')?.hasError('pattern')">
                          Format invalide (8 chiffres, ex. 70 XX XX XX)
                        </mat-error>
                      </mat-form-field>
                    </div>

                    <mat-form-field appearance="fill" class="full-width">
                      <mat-label>Code OTP (reçu sur votre téléphone)</mat-label>
                      <input matInput formControlName="otp" type="text" maxlength="6" placeholder="1234">
                      <mat-icon matPrefix>pin</mat-icon>
                      <mat-hint>Mode test : utilisez 1234</mat-hint>
                    </mat-form-field>

                    <p class="payment-info">
                      <mat-icon>info</mat-icon>
                      Vous recevrez une notification sur votre téléphone pour confirmer le paiement.
                    </p>
                  </div>
                </div>

                <!-- Security Notice -->
                <div class="security-notice">
                  <mat-icon>verified_user</mat-icon>
                  <div>
                    <strong>Paiement sécurisé — Mali</strong>
                    <p>
                      Paiement en <strong>FCFA</strong> via Orange Money ou Moov Money.
                      Si votre wallet MetaMask est connecté, la mission sera également ancrée sur la blockchain Sepolia (couche de confiance escrow).
                    </p>
                  </div>
                </div>
              </div>

              <div class="step-actions">
                <button mat-button matStepperPrevious>Retour</button>
                <button
                  mat-raised-button
                  color="accent"
                  (click)="createMission()"
                  [disabled]="isSubmitting || paymentForm.invalid"
                  class="submit-btn"
                >
                  <mat-spinner diameter="20" *ngIf="isSubmitting"></mat-spinner>
                  <span *ngIf="!isSubmitting">
                    <mat-icon>lock</mat-icon>
                    Payer et créer la mission
                  </span>
                </button>
              </div>
            </mat-step>
          </mat-stepper>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .create-mission-container {
      padding: 32px 24px;
      max-width: 800px;
      margin: 0 auto;
    }

    .form-card {
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      background: #ffffff;
      overflow: hidden;

      mat-card-header {
        margin-bottom: 0;
        padding: 32px 32px 24px;
        background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        border-bottom: 1px solid #e2e8f0;
      }

      mat-card-content {
        padding: 32px;
      }

      .header-content {
        display: flex;
        align-items: center;
        gap: 20px;
      }

      .header-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: #6C5CE7;
        filter: drop-shadow(0 2px 4px rgba(108, 92, 231, 0.3));
      }
    }

    ::ng-deep {
      .mat-mdc-card-title {
        font-size: 24px;
        font-weight: 600;
        color: #1e293b;
        margin-bottom: 8px;
      }

      .mat-mdc-card-subtitle {
        font-size: 14px;
        color: #64748b;
        margin: 0;
      }
    }

    .step-form {
      padding: 8px 0;
    }

    .full-width {
      width: 100%;
      display: block;
      margin-bottom: 20px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;

      mat-form-field {
        width: 100%;
        margin-bottom: 0;
      }
    }

    /* Material Form Field Enhanced Appearance */
    mat-form-field {
      width: 100%;
      display: block;
      margin-bottom: 20px;

      ::ng-deep {
        .mat-mdc-text-field-wrapper {
          background-color: #f8fafc !important;
          border-radius: 12px 12px 0 0;
          transition: all 0.2s ease;
        }

        /* Fix datepicker toggle button */
        .mat-datepicker-toggle {
          color: #64748b;
        }

        .mat-datepicker-toggle-active {
          color: #6C5CE7;
        }

        .mdc-text-field--filled {
          background-color: #f8fafc !important;
          border-radius: 12px;
        }

        .mdc-text-field--filled.mdc-text-field--focused {
          background-color: #f1f5f9 !important;
          box-shadow: 0 4px 12px rgba(108, 92, 231, 0.15);
        }

        .mat-mdc-form-field-infix {
          padding: 28px 16px 10px;
          min-height: 60px;
        }

        .mat-mdc-floating-label {
          color: #64748b;
          font-size: 14px;
          font-weight: 500;
          top: 26px;
          left: 16px;
        }

        .mat-mdc-floating-label.mdc-floating-label--float-above {
          font-size: 12px;
          top: 12px;
          left: 16px;
          color: #6C5CE7;
        }

        .mat-mdc-input-element {
          padding-top: 10px;
          padding-left: 4px;
          color: #1e293b;
          font-size: 15px;
          font-weight: 400;
        }

        .mdc-line-ripple::before {
          border-bottom-color: #cbd5e1;
        }

        .mdc-line-ripple::after {
          border-bottom-color: #6C5CE7;
          border-bottom-width: 2px;
        }

        .mat-mdc-form-field-subscript-wrapper {
          height: 20px;
        }

        .mat-mdc-form-field-error {
          font-size: 12px;
          color: #ef4444;
          font-weight: 500;
        }
      }
    }

    /* Native select styling */
    .native-select-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;

      .field-label {
        font-size: 12px;
        font-weight: 500;
        color: #6C5CE7;
        margin-bottom: 4px;
        margin-left: 12px;
      }

      .native-select {
        width: 100%;
        padding: 20px 40px 6px 16px;
        font-size: 15px;
        color: #1e293b;
        background: #f8fafc;
        border: none;
        border-bottom: 1px solid #cbd5e1;
        border-radius: 12px 12px 0 0;
        cursor: pointer;
        appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='%2364748b'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 12px center;
        background-size: 20px;
        min-height: 56px;

        &:focus {
          outline: none;
          border-bottom-color: #6C5CE7;
          border-bottom-width: 2px;
          background-color: #f1f5f9;
        }

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        option {
          color: #1e293b;
          background: white;
          padding: 12px;
          font-size: 15px;
        }

        option:first-child {
          color: #64748b;
        }
      }

      .error-msg {
        font-size: 12px;
        color: #ef4444;
        margin-top: 4px;
        margin-left: 12px;
      }
    }

    /* Fix datepicker popup positioning */
    ::ng-deep {
      .cdk-overlay-pane.mat-datepicker-popup {
        position: absolute !important;
        top: auto !important;
        bottom: auto !important;
        transform: none !important;
        min-width: 320px;
      }

      .mat-datepicker-content {
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        margin-top: 4px;
      }

      .mat-calendar {
        border-radius: 12px;
        width: 320px;
      }

      /* Fix calendar table header */
      .mat-calendar-table-header th {
        padding: 8px 0;
        font-size: 12px;
        font-weight: 500;
        color: #64748b;
        text-align: center;
        width: 40px;
      }

      /* Fix calendar body cells */
      .mat-calendar-body-cell {
        width: 40px;
        height: 40px;
      }

      .mat-calendar-body-cell-content {
        width: 36px;
        height: 36px;
        line-height: 36px;
        border-radius: 50%;
        font-size: 14px;
      }

      .mat-calendar-body-selected {
        background-color: #6C5CE7;
        color: white;
      }

      .mat-calendar-body-today:not(.mat-calendar-body-selected) {
        border-color: #6C5CE7;
      }

      .mat-calendar-table-header {
        color: #64748b;
      }

      .mat-calendar-body-cell-content:hover:not(.mat-calendar-body-selected) {
        background-color: rgba(108, 92, 231, 0.1);
      }

      /* Fix calendar period button (month/year) */
      .mat-calendar-period-button {
        font-size: 14px;
        font-weight: 600;
        color: #1e293b;
      }

      /* Force proper overlay positioning */
      .cdk-overlay-connected-position-bounding-box {
        z-index: 1000;
      }
    }

    textarea[matInput] {
      resize: vertical;
      min-height: 100px;
      line-height: 1.6;
    }

    /* Stepper Modern Styling */
    mat-stepper {
      background: transparent;

      ::ng-deep {
        .mat-step-header {
          padding: 20px 24px;
          border-radius: 10px;
          transition: all 0.2s ease;

          &:hover {
            background-color: rgba(108, 92, 231, 0.05);
          }

          .mat-step-icon {
            background: #6C5CE7;
            color: white;
            width: 36px;
            height: 36px;
            font-size: 14px;
            font-weight: 600;
            box-shadow: 0 2px 8px rgba(108, 92, 231, 0.4);
          }

          .mat-step-icon-selected {
            background: linear-gradient(135deg, #6C5CE7 0%, #5b4bd4 100%);
            transform: scale(1.1);
          }

          .mat-step-icon-state-edit {
            background: #10b981;
          }

          .mat-step-label {
            font-size: 15px;
            font-weight: 600;
            color: #475569;

            &.mat-step-label-active {
              color: #6C5CE7;
            }
          }
        }

        .mat-horizontal-stepper-header-container {
          margin-bottom: 24px;
          padding: 8px 0;
        }

        .mat-stepper-horizontal-line {
          border-top-color: #e2e8f0;
          border-top-width: 2px;
        }

        /* Fix step content visibility */
        .mat-horizontal-content-container {
          overflow: visible !important;
          height: auto !important;
          padding: 0 !important;
        }

        .mat-step-content {
          overflow: visible !important;
        }
      }
    }

    .location-section {
      margin-bottom: 32px;
      padding: 24px;
      background: #f8fafc;
      border-radius: 12px;
      border: 1px solid #e2e8f0;

      h3 {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 0 0 20px 0;
        color: #1e293b;
        font-size: 16px;
        font-weight: 600;

        mat-icon {
          color: #6C5CE7;
          font-size: 20px;
          width: 20px;
          height: 20px;
        }
      }
    }

    .category-rules-info {
      display: flex; gap: 12px; align-items: flex-start;
      background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 10px;
      padding: 12px 14px; margin-bottom: 16px; font-size: 13px; color: #0c4a6e;
      mat-icon { color: #0284c7; flex-shrink: 0; }
      p { margin: 0 0 6px; &:last-child { margin: 0; } }
    }
    .deposit-preview {
      display: flex; align-items: center; gap: 8px;
      background: #fef3c7; border-radius: 8px; padding: 10px 12px;
      margin-bottom: 16px; font-size: 14px; color: #92400e;
      mat-icon { color: #d97706; }
    }

    .checkbox-group {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-bottom: 24px;
      padding: 20px;
      background: #f8fafc;
      border-radius: 12px;
      border: 1px solid #e2e8f0;

      mat-checkbox {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px;
        border-radius: 8px;
        transition: background 0.2s ease;

        &:hover {
          background: #e2e8f0;
        }

        mat-icon {
          margin-right: 8px;
          color: #64748b;
          font-size: 18px;
        }
      }
    }

    .summary-card {
      background: #f8fafc;
      padding: 24px;
      border-radius: 12px;
      margin-top: 24px;
      border: 1px solid #e2e8f0;

      h4 {
        margin: 0 0 20px 0;
        color: #1e293b;
        font-size: 16px;
        font-weight: 600;
      }

      .summary-item {
        display: flex;
        justify-content: space-between;
        padding: 12px 0;
        border-bottom: 1px solid #e2e8f0;
        font-size: 14px;

        &:last-child {
          border-bottom: none;
        }

        span {
          color: #64748b;
        }

        strong {
          color: #1e293b;
          font-weight: 600;
        }
      }

      .escrow-notice {
        display: flex;
        gap: 12px;
        margin-top: 20px;
        padding: 16px;
        background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
        border-radius: 10px;
        border: 1px solid #6ee7b7;

        mat-icon {
          color: #059669;
          font-size: 24px;
          width: 24px;
          height: 24px;
          flex-shrink: 0;
        }

        p {
          margin: 0;
          font-size: 13px;
          color: #065f46;
          line-height: 1.5;

          strong {
            color: #047857;
            font-weight: 600;
          }
        }
      }
    }

    .hint-text {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
      padding: 12px 16px;
      background: #eff6ff;
      border-radius: 8px;
      font-size: 13px;
      color: #1e40af;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: #3b82f6;
      }
    }

    // Date field styles
    .date-field-container {
      margin-top: 8px;

      .time-range-row {
        display: flex;
        gap: 16px;
        margin-top: 16px;

        .time-field {
        flex: 1;

        input[type="time"] {
          font-size: 15px;
          cursor: pointer;
        }

        &.full-width {
          width: 100%;
          margin-top: 8px;
        }
      }
      }

      .duration-hint {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        margin-top: 16px;
        padding: 12px 16px;
        background: #f0fdf4;
        border-radius: 8px;
        font-size: 13px;
        color: #166534;

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
          color: #22c55e;
        }

        .duration-slider {
          display: none;
        }

        .duration-value {
          font-weight: 600;
          color: #15803d;
          min-width: 60px;
        }
      }
    }

    .step-actions {
      display: flex;
      justify-content: flex-end;
      gap: 16px;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e2e8f0;

      button {
        border-radius: 10px;
        font-weight: 500;
        padding: 0 24px;
        height: 44px;
        transition: all 0.2s ease;

        &:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        &[disabled] {
          opacity: 0.5;
        }
      }
    }

    .submit-btn {
      background: linear-gradient(135deg, #6C5CE7 0%, #5b4bd4 100%);
      color: white;
      padding: 0 32px;
      height: 48px;
      border-radius: 10px;
      font-weight: 600;
      box-shadow: 0 4px 14px rgba(108, 92, 231, 0.4);
      transition: all 0.2s ease;

      &:hover {
        box-shadow: 0 6px 20px rgba(108, 92, 231, 0.5);
        transform: translateY(-2px);
      }

      mat-icon {
        margin-right: 8px;
      }
    }

    /* Payment Styles */
    .payment-summary-card {
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;

      h4 {
        margin: 0 0 16px 0;
        color: #1e293b;
        font-size: 16px;
      }

      .payment-row {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px dashed #cbd5e1;

        &:last-child {
          border-bottom: none;
        }

        span {
          color: #64748b;
        }

        strong {
          color: #1e293b;
        }

        &.fee strong {
          color: #dc2626;
        }

        &.total {
          padding-top: 12px;
          margin-top: 8px;
          border-top: 2px solid #3CB371;

          span, strong {
            font-size: 18px;
            font-weight: 700;
            color: #3CB371;
          }
        }
      }
    }

    .payment-method-section {
      margin-bottom: 24px;

      h4 {
        margin: 0 0 16px 0;
        color: #1e293b;
        font-size: 16px;
      }
    }

    .payment-method-cards {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
    }

    .payment-method-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 24px;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        border-color: #3CB371;
        background: rgba(60, 179, 113, 0.05);
      }

      &.selected {
        border-color: #3CB371;
        background: rgba(60, 179, 113, 0.1);
      }

      mat-icon {
        color: #3CB371;
      }

      span {
        font-weight: 500;
        color: #1e293b;
      }
    }

    .mobile-money-form {
      background: #f8fafc;
      border-radius: 12px;
      padding: 20px;
      margin-top: 16px;
    }

    /* Fix stepper overflow to allow dropdown to show properly */
    ::ng-deep .mat-horizontal-stepper-content {
      overflow: visible !important;
      position: relative !important;
    }

    ::ng-deep .mat-stepper-horizontal-line {
      z-index: 1;
    }

    /* Ensure operator select wrapper doesn't clip dropdown */
    ::ng-deep .mat-mdc-form-field-subscript-wrapper {
      position: static !important;
    }

    .operator-option {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .operator-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }

    /* Native operator select styling */
    .operator-native-wrapper {
      position: relative;
      margin-bottom: 20px;
    }

    .operator-label {
      display: block;
      font-size: 12px;
      color: #64748b;
      margin-bottom: 4px;
      font-weight: 500;
    }

    .operator-native-select {
      width: 100%;
      padding: 14px 40px 14px 16px;
      font-size: 16px;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      background: white;
      color: #1e293b;
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      cursor: pointer;
      transition: border-color 0.2s, box-shadow 0.2s;

      &:hover {
        border-color: #3CB371;
      }

      &:focus {
        outline: none;
        border-color: #3CB371;
        box-shadow: 0 0 0 3px rgba(60, 179, 113, 0.1);
      }

      option {
        padding: 12px;
        font-size: 16px;
      }

      option:first-child {
        color: #94a3b8;
      }
    }

    .operator-select-arrow {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
      color: #64748b;

      mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }
    }

    .operator-error {
      font-size: 12px;
      color: #ef4444;
      margin-top: 4px;
    }

    /* Phone row with country selector */
    .phone-row {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
      align-items: flex-end;

      .mali-prefix-badge {
        flex: 0 0 auto;
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 10px 14px;
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        border-radius: 10px;
        font-size: 13px;
        color: #166534;
        strong { font-size: 15px; }
      }

      .phone-input {
        flex: 1;
      }
    }

    .country-native-select {
      width: 100%;
      padding: 14px 12px;
      font-size: 14px;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      background: white;
      color: #1e293b;
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      cursor: pointer;
      transition: border-color 0.2s, box-shadow 0.2s;

      &:hover {
        border-color: #3CB371;
      }

      &:focus {
        outline: none;
        border-color: #3CB371;
        box-shadow: 0 0 0 3px rgba(60, 179, 113, 0.1);
      }
    }

    .payment-info {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 16px;
      padding: 12px;
      background: #dbeafe;
      border-radius: 8px;
      color: #1e40af;
      font-size: 14px;

      mat-icon {
        flex-shrink: 0;
        color: #3b82f6;
      }
    }

    .security-notice {
      display: flex;
      gap: 16px;
      padding: 20px;
      background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
      border: 1px solid #86efac;
      border-radius: 12px;
      margin-top: 24px;

      mat-icon {
        color: #16a34a;
        font-size: 32px;
        width: 32px;
        height: 32px;
      }

      div {
        strong {
          display: block;
          color: #166534;
          margin-bottom: 4px;
        }

        p {
          margin: 0;
          color: #15803d;
          font-size: 14px;
          line-height: 1.5;
        }
      }
    }

    @media (max-width: 640px) {
      .create-mission-container {
        padding: 16px;
      }

      .form-card {
        mat-card-header {
          padding: 20px 20px 16px;
        }

        mat-card-content {
          padding: 20px;
        }
      }

      .form-row {
        grid-template-columns: 1fr;
        gap: 16px;
      }

      .checkbox-group {
        grid-template-columns: 1fr;
      }

      .location-section {
        padding: 16px;
      }
    }
  `]
})
export class CreateMissionComponent implements OnInit {
  private apiUrl = environment.apiUrl;

  get isEnterprise(): boolean {
    return this.authService.getActiveRole() === 'enterprise';
  }

  missionDetailsForm: FormGroup;
  locationsForm: FormGroup;

  categories: Category[] = [];
  loadingCategories = false;
  selectedCategory: Category | null = null;

  // Category configuration mapping - supports partial slug matching
  private categoryConfigs: { [key: string]: CategoryConfig } = {
    // Delivery keywords - use deadline (point in time)
    'livraison': { type: 'delivery', requiresPickup: true, requiresDelivery: true, showContacts: true, locationLabel: 'Adresses', requirements: ['requires_vehicle', 'requires_photo'], dateType: 'deadline', dateLabel: 'Deadline', showTimeRange: false },
    'colis': { type: 'delivery', requiresPickup: true, requiresDelivery: true, showContacts: true, locationLabel: 'Adresses', requirements: ['requires_vehicle', 'requires_photo'], dateType: 'deadline', dateLabel: 'Deadline', showTimeRange: false },
    'repas': { type: 'delivery', requiresPickup: true, requiresDelivery: true, showContacts: true, locationLabel: 'Adresses', requirements: ['requires_vehicle', 'requires_photo'], dateType: 'deadline', dateLabel: 'Heure de livraison', showTimeRange: false },
    'courses': { type: 'delivery', requiresPickup: true, requiresDelivery: true, showContacts: true, locationLabel: 'Adresses', requirements: ['requires_vehicle', 'requires_photo'], dateType: 'deadline', dateLabel: 'Deadline', showTimeRange: false },
    'transport': { type: 'delivery', requiresPickup: true, requiresDelivery: true, showContacts: true, locationLabel: 'Adresses', requirements: ['requires_vehicle', 'requires_photo'], dateType: 'schedule', dateLabel: 'Date et heure de départ', showTimeRange: true },
    'demenagement': { type: 'delivery', requiresPickup: true, requiresDelivery: true, showContacts: true, locationLabel: 'Adresses', requirements: ['requires_vehicle', 'requires_photo'], dateType: 'work_date', dateLabel: 'Date du déménagement', showTimeRange: true },
    'demenage': { type: 'delivery', requiresPickup: true, requiresDelivery: true, showContacts: true, locationLabel: 'Adresses', requirements: ['requires_vehicle', 'requires_photo'], dateType: 'work_date', dateLabel: 'Date du déménagement', showTimeRange: true },
    'deplacement': { type: 'delivery', requiresPickup: true, requiresDelivery: true, showContacts: true, locationLabel: 'Adresses', requirements: ['requires_vehicle', 'requires_photo'], dateType: 'schedule', dateLabel: 'Date et heure de départ', showTimeRange: true },
    'course': { type: 'delivery', requiresPickup: true, requiresDelivery: true, showContacts: true, locationLabel: 'Adresses', requirements: ['requires_vehicle', 'requires_photo'], dateType: 'deadline', dateLabel: 'Deadline', showTimeRange: false },
    'envoi': { type: 'delivery', requiresPickup: true, requiresDelivery: true, showContacts: true, locationLabel: 'Adresses', requirements: ['requires_vehicle', 'requires_photo'], dateType: 'deadline', dateLabel: 'Deadline', showTimeRange: false },
    'expedition': { type: 'delivery', requiresPickup: true, requiresDelivery: true, showContacts: true, locationLabel: 'Adresses', requirements: ['requires_vehicle', 'requires_photo'], dateType: 'deadline', dateLabel: 'Deadline', showTimeRange: false },

    // Home service keywords - use work_date or schedule (plage horaire)
    'menage': { type: 'home_service', requiresPickup: false, requiresDelivery: false, showContacts: false, locationLabel: 'Lieu d\'intervention', requirements: [], dateType: 'work_date', dateLabel: 'Date de travail', showTimeRange: true },
    'repassage': { type: 'home_service', requiresPickup: false, requiresDelivery: false, showContacts: false, locationLabel: 'Lieu d\'intervention', requirements: [], dateType: 'work_date', dateLabel: 'Date de travail', showTimeRange: true },
    'garde': { type: 'home_service', requiresPickup: false, requiresDelivery: false, showContacts: false, locationLabel: 'Lieu d\'intervention', requirements: ['requires_id_verification'], dateType: 'schedule', dateLabel: 'Date et horaire de garde', showTimeRange: true },
    'nounou': { type: 'home_service', requiresPickup: false, requiresDelivery: false, showContacts: false, locationLabel: 'Lieu d\'intervention', requirements: ['requires_id_verification'], dateType: 'schedule', dateLabel: 'Date et horaire de garde', showTimeRange: true },
    'babysitting': { type: 'home_service', requiresPickup: false, requiresDelivery: false, showContacts: false, locationLabel: 'Lieu d\'intervention', requirements: ['requires_id_verification'], dateType: 'schedule', dateLabel: 'Date et horaire de garde', showTimeRange: true },
    'cours': { type: 'home_service', requiresPickup: false, requiresDelivery: false, showContacts: false, locationLabel: 'Lieu des cours', requirements: ['requires_id_verification'], dateType: 'schedule', dateLabel: 'Date et horaire du cours', showTimeRange: true },
    'coiffure': { type: 'home_service', requiresPickup: false, requiresDelivery: false, showContacts: false, locationLabel: 'Lieu de prestation', requirements: [], dateType: 'schedule', dateLabel: 'Date et heure du RDV', showTimeRange: true },
    'coiffeur': { type: 'home_service', requiresPickup: false, requiresDelivery: false, showContacts: false, locationLabel: 'Lieu de prestation', requirements: [], dateType: 'schedule', dateLabel: 'Date et heure du RDV', showTimeRange: true },
    'beaute': { type: 'home_service', requiresPickup: false, requiresDelivery: false, showContacts: false, locationLabel: 'Lieu de prestation', requirements: [], dateType: 'schedule', dateLabel: 'Date et heure du RDV', showTimeRange: true },
    'massage': { type: 'home_service', requiresPickup: false, requiresDelivery: false, showContacts: false, locationLabel: 'Lieu de prestation', requirements: [], dateType: 'schedule', dateLabel: 'Date et heure du RDV', showTimeRange: true },
    'reparation': { type: 'home_service', requiresPickup: false, requiresDelivery: false, showContacts: false, locationLabel: 'Lieu d\'intervention', requirements: [], dateType: 'schedule', dateLabel: 'Date et heure d\'intervention', showTimeRange: true },
    'depannage': { type: 'home_service', requiresPickup: false, requiresDelivery: false, showContacts: false, locationLabel: 'Lieu d\'intervention', requirements: [], dateType: 'schedule', dateLabel: 'Date et heure d\'intervention', showTimeRange: true },
    'plomberie': { type: 'home_service', requiresPickup: false, requiresDelivery: false, showContacts: false, locationLabel: 'Lieu d\'intervention', requirements: [], dateType: 'schedule', dateLabel: 'Date et heure d\'intervention', showTimeRange: true },
    'electricite': { type: 'home_service', requiresPickup: false, requiresDelivery: false, showContacts: false, locationLabel: 'Lieu d\'intervention', requirements: [], dateType: 'schedule', dateLabel: 'Date et heure d\'intervention', showTimeRange: true },
    'menuiserie': { type: 'home_service', requiresPickup: false, requiresDelivery: false, showContacts: false, locationLabel: 'Lieu d\'intervention', requirements: [], dateType: 'work_date', dateLabel: 'Date de travail', showTimeRange: true },
    'jardinage': { type: 'home_service', requiresPickup: false, requiresDelivery: false, showContacts: false, locationLabel: 'Lieu d\'intervention', requirements: [], dateType: 'work_date', dateLabel: 'Date de travail', showTimeRange: true },
    'peinture': { type: 'home_service', requiresPickup: false, requiresDelivery: false, showContacts: false, locationLabel: 'Lieu d\'intervention', requirements: [], dateType: 'work_date', dateLabel: 'Date de travail', showTimeRange: true },
    'bricolage': { type: 'home_service', requiresPickup: false, requiresDelivery: false, showContacts: false, locationLabel: 'Lieu d\'intervention', requirements: [], dateType: 'work_date', dateLabel: 'Date de travail', showTimeRange: true },
    'nettoyage': { type: 'home_service', requiresPickup: false, requiresDelivery: false, showContacts: false, locationLabel: 'Lieu d\'intervention', requirements: [], dateType: 'work_date', dateLabel: 'Date de travail', showTimeRange: true },
    'cuisine': { type: 'home_service', requiresPickup: false, requiresDelivery: false, showContacts: false, locationLabel: 'Lieu d\'intervention', requirements: [], dateType: 'schedule', dateLabel: 'Date et heure du service', showTimeRange: true },
    'aide': { type: 'home_service', requiresPickup: false, requiresDelivery: false, showContacts: false, locationLabel: 'Lieu d\'intervention', requirements: [], dateType: 'work_date', dateLabel: 'Date d\'aide', showTimeRange: true },
    'assistance': { type: 'home_service', requiresPickup: false, requiresDelivery: false, showContacts: false, locationLabel: 'Lieu d\'intervention', requirements: [], dateType: 'work_date', dateLabel: 'Date d\'assistance', showTimeRange: true },

    // Default for others
    'default': { type: 'other', requiresPickup: true, requiresDelivery: true, showContacts: false, locationLabel: 'Adresses', requirements: [], dateType: 'deadline', dateLabel: 'Deadline', showTimeRange: false }
  };
  
  merchandiseValue: number | null = null;
  estimatedDepositPreview = 0;

  requirements = {
    requires_vehicle: false,
    requires_photo: true,
    requires_signature: false
  };
  requires_id_verification = false;
  special_instructions = '';
  minDate = new Date();
  estimated_duration = 60;

  isSubmitting = false;

  // Payment properties
  paymentForm: FormGroup;
  paymentMethods: PaymentMethod[] = [];
  mobileMoneyOperators: MobileMoneyOperator[] = [];
  selectedPaymentMethod: string = 'mobile_money';
  scrollStrategy: ScrollStrategy;

  maliCountry = MALI_COUNTRY;
  blockchainAvailable = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private snackBar: MatSnackBar,
    private http: HttpClient,
    private paymentService: PaymentService,
    private web3Service: Web3Service,
    private blockchainService: BlockchainService,
    private overlay: Overlay,
    private authService: AuthService,
  ) {
    this.scrollStrategy = this.overlay.scrollStrategies.reposition();
    this.missionDetailsForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(5)]],
      description: ['', Validators.required],
      category: ['', Validators.required],
      budget: ['', [Validators.required, Validators.min(5000)]],
      deadline: [null as Date | null, Validators.required],
      start_time: ['09:00', Validators.required],
      end_time: ['']
    });

    this.locationsForm = this.fb.group({
      pickup_address: ['', Validators.required],
      pickup_contact_name: [''],
      pickup_contact_phone: [''],
      delivery_address: ['', Validators.required],
      delivery_contact_name: [''],
      delivery_contact_phone: [''],
      service_location: [''] // For home services
    });

    this.paymentForm = this.fb.group({
      payment_method: ['mobile_money', Validators.required],
      country_code: [DEFAULT_PHONE_PREFIX, Validators.required],
      phone_number: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
      operator: ['orange', Validators.required],
      otp: ['1234', [Validators.required, Validators.minLength(4)]],
    });
  }

  ngOnInit(): void {
    this.mobileMoneyOperators = this.paymentService.getMobileMoneyOperators('ML');
    this.loadCategories();
    this.blockchainService.getStatus().subscribe({
      next: (s) => { this.blockchainAvailable = s.blockchain_enabled || !!s.escrow_address; },
    });

    this.missionDetailsForm.get('category')?.valueChanges.subscribe((categoryId) => {
      this.onCategoryChange(categoryId);
    });
  }

  onCategoryChange(categoryId: string): void {
    this.selectedCategory = this.categories.find(c => c.id === categoryId) || null;
    this.applyApiRules();
    this.updateFormForCategory();
    this.refreshDepositPreview();
  }

  get apiRules(): CategoryRules | null {
    return this.selectedCategory?.rules || null;
  }

  get requiresMerchandiseValue(): boolean {
    return !!this.apiRules?.requires_merchandise_value;
  }

  private applyApiRules(): void {
    const r = this.apiRules;
    if (!r) return;
    this.requirements.requires_vehicle = r.requires_vehicle;
    this.requirements.requires_photo = r.requires_photo;
    this.requirements.requires_signature = r.requires_signature;
    this.requires_id_verification = r.requires_id_verification;
  }

  refreshDepositPreview(): void {
    const budget = parseFloat(this.missionDetailsForm?.value?.budget);
    if (!this.selectedCategory?.slug || !budget) {
      this.estimatedDepositPreview = 0;
      return;
    }
    const params = new URLSearchParams({ budget: String(budget) });
    if (this.merchandiseValue) params.set('merchandise_value', String(this.merchandiseValue));
    this.http.get<{ estimated_deposit: number }>(
      `${this.apiUrl}/categories/${this.selectedCategory.slug}/deposit_preview/?${params}`,
      { headers: this.h() },
    ).subscribe({
      next: (res) => { this.estimatedDepositPreview = res.estimated_deposit || 0; },
      error: () => { this.estimatedDepositPreview = 0; },
    });
  }

  get categoryConfig(): CategoryConfig {
    const api = this.apiRules;
    if (api) {
      return {
        type: (api.mission_type as CategoryType) || 'other',
        requiresPickup: api.requires_pickup,
        requiresDelivery: api.requires_delivery,
        showContacts: api.mission_type === 'delivery',
        locationLabel: api.location_label || 'Adresses',
        requirements: api.requirement_labels || [],
        dateType: api.show_time_range ? 'schedule' : 'deadline',
        dateLabel: api.date_label || 'Échéance',
        showTimeRange: api.show_time_range,
      };
    }
    if (!this.selectedCategory) return this.categoryConfigs['default'];

    // Try exact match first
    if (this.categoryConfigs[this.selectedCategory.slug]) {
      return this.categoryConfigs[this.selectedCategory.slug];
    }

    // Try partial matching with keywords in the slug
    const slug = this.selectedCategory.slug.toLowerCase();
    for (const [keyword, config] of Object.entries(this.categoryConfigs)) {
      if (slug.includes(keyword) && keyword !== 'default') {
        return config;
      }
    }

    // Also check category name for keywords
    const name = this.selectedCategory.name.toLowerCase();
    for (const [keyword, config] of Object.entries(this.categoryConfigs)) {
      if (name.includes(keyword) && keyword !== 'default') {
        return config;
      }
    }

    return this.categoryConfigs['default'];
  }

  get isDeliveryType(): boolean {
    return this.categoryConfig.type === 'delivery';
  }

  get isHomeServiceType(): boolean {
    return this.categoryConfig.type === 'home_service';
  }

  get requiresPickupLocation(): boolean {
    return this.categoryConfig.requiresPickup;
  }

  get requiresDeliveryLocation(): boolean {
    return this.categoryConfig.requiresDelivery;
  }

  get locationStepLabel(): string {
    return this.categoryConfig.locationLabel;
  }

  get dateLabel(): string {
    return this.categoryConfig.dateLabel;
  }

  get showTimeRange(): boolean {
    return this.categoryConfig.showTimeRange;
  }

  get computedDurationMinutes(): number {
    const start = this.missionDetailsForm?.value?.start_time as string;
    const end = this.missionDetailsForm?.value?.end_time as string;
    if (!start || !end) return 0;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    return diff > 0 ? diff : 0;
  }

  get scheduleSummary(): string {
    const dateVal = this.missionDetailsForm?.value?.deadline as Date | null;
    if (!dateVal) return '-';
    const dateStr = dateVal.toLocaleDateString('fr-FR');
    const start = this.missionDetailsForm.value.start_time;
    const end = this.missionDetailsForm.value.end_time;
    if (this.showTimeRange && start) {
      return end ? `${dateStr}, ${start} → ${end}` : `${dateStr}, à partir de ${start}`;
    }
    return start ? `${dateStr} à ${start}` : dateStr;
  }

  private formatPickerDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private resolveEstimatedDuration(): number {
    if (this.showTimeRange) {
      const computed = this.computedDurationMinutes;
      return computed > 0 ? computed : 60;
    }
    return 60;
  }

  private getInvalidFields(form: FormGroup): string[] {
    const invalidFields: string[] = [];
    Object.keys(form.controls).forEach(key => {
      const control = form.get(key);
      if (control && control.invalid) {
        invalidFields.push(key);
      }
    });
    return invalidFields;
  }

  private updateFormForCategory(): void {
    const config = this.categoryConfig;

    // Update validators based on category type
    const pickupControl = this.locationsForm.get('pickup_address');
    const deliveryControl = this.locationsForm.get('delivery_address');
    const serviceLocationControl = this.locationsForm.get('service_location');

    if (config.requiresPickup) {
      pickupControl?.setValidators(Validators.required);
    } else {
      pickupControl?.clearValidators();
      pickupControl?.setValue('');
    }
    pickupControl?.updateValueAndValidity();

    if (config.requiresDelivery) {
      deliveryControl?.setValidators(Validators.required);
    } else {
      deliveryControl?.clearValidators();
      deliveryControl?.setValue('');
    }
    deliveryControl?.updateValueAndValidity();

    // For home services, service location is required
    if (config.type === 'home_service') {
      serviceLocationControl?.setValidators(Validators.required);
    } else {
      serviceLocationControl?.clearValidators();
    }
    serviceLocationControl?.updateValueAndValidity();

    const startCtrl = this.missionDetailsForm.get('start_time');
    startCtrl?.setValidators(Validators.required);
    startCtrl?.updateValueAndValidity();
  }

  private h(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });
  }

  loadCategories(): void {
    this.loadingCategories = true;
    this.http.get<any>(`${this.apiUrl}/categories/`, { headers: this.h() }).subscribe({
      next: (response) => {
        console.log('Categories response:', response);
        // Handle paginated response (results array) or direct array
        this.categories = Array.isArray(response) ? response : (response.results || response);
        console.log('Categories loaded:', this.categories);
        this.loadingCategories = false;
      },
      error: (err) => {
        console.error('Error loading categories:', err);
        this.snackBar.open('Erreur chargement catégories', 'Fermer', { duration: 3000 });
        this.loadingCategories = false;
      }
    });
  }
  
  createMission(): void {
    console.log('Creating mission...');
    console.log('missionDetailsForm valid:', this.missionDetailsForm.valid);
    console.log('missionDetailsForm errors:', this.missionDetailsForm.errors);
    console.log('missionDetailsForm value:', this.missionDetailsForm.value);
    console.log('locationsForm valid:', this.locationsForm.valid);
    console.log('locationsForm errors:', this.locationsForm.errors);
    console.log('locationsForm value:', this.locationsForm.value);

    if (this.missionDetailsForm.invalid) {
      console.log('missionDetailsForm invalid fields:', this.getInvalidFields(this.missionDetailsForm));
    }
    if (this.locationsForm.invalid) {
      console.log('locationsForm invalid fields:', this.getInvalidFields(this.locationsForm));
    }

    if (this.missionDetailsForm.invalid || this.locationsForm.invalid) {
      this.snackBar.open('Veuillez remplir tous les champs requis', 'Fermer', { duration: 3000 });
      return;
    }

    if (this.requiresMerchandiseValue && (!this.merchandiseValue || this.merchandiseValue < 1000)) {
      this.snackBar.open('Indiquez la valeur de la marchandise (min. 1 000 XOF)', 'Fermer', { duration: 4000 });
      return;
    }

    this.isSubmitting = true;

    // Date calendrier + heure horloge
    const deadlineValue = this.missionDetailsForm.value.deadline as Date;
    const startTime = (this.missionDetailsForm.value.start_time as string) || '09:00';
    const endTime = this.missionDetailsForm.value.end_time as string;
    const datePart = this.formatPickerDate(deadlineValue);
    const deadline = new Date(`${datePart}T${startTime}`);
    const estimatedDuration = this.resolveEstimatedDuration();

    // Build location data based on category type
    let locationData: any = {};

    if (this.isHomeServiceType) {
      // Home service: use service_location as delivery_address (prestataire vient chez client)
      locationData = {
        pickup_address: '',
        pickup_contact_name: '',
        pickup_contact_phone: '',
        delivery_address: this.locationsForm.value.service_location,
        delivery_contact_name: '', // Hidden until mission accepted
        delivery_contact_phone: '' // Hidden until mission accepted
      };
    } else if (this.isDeliveryType) {
      // Delivery: full pickup/delivery with contacts
      locationData = {
        pickup_address: this.locationsForm.value.pickup_address,
        pickup_contact_name: this.locationsForm.value.pickup_contact_name || '',
        pickup_contact_phone: this.locationsForm.value.pickup_contact_phone || '',
        delivery_address: this.locationsForm.value.delivery_address,
        delivery_contact_name: this.locationsForm.value.delivery_contact_name || '',
        delivery_contact_phone: this.locationsForm.value.delivery_contact_phone || ''
      };
    } else {
      // Other types
      locationData = {
        pickup_address: this.locationsForm.value.pickup_address || '',
        pickup_contact_name: '',
        pickup_contact_phone: '',
        delivery_address: this.locationsForm.value.delivery_address || '',
        delivery_contact_name: '',
        delivery_contact_phone: ''
      };
    }

    // Calculate fees
    const fees = this.paymentService.calculateFees(parseFloat(this.missionDetailsForm.value.budget));

    const missionData = {
      title: this.missionDetailsForm.value.title,
      description: this.missionDetailsForm.value.description,
      category: this.missionDetailsForm.value.category,
      budget: parseFloat(this.missionDetailsForm.value.budget),
      currency: 'XOF',
      deadline: deadline.toISOString(),
      ...locationData,
      requires_vehicle: this.requirements.requires_vehicle,
      requires_photo: this.requirements.requires_photo,
      requires_signature: this.requirements.requires_signature,
      requires_id_verification: this.requires_id_verification,
      merchandise_value: this.merchandiseValue || undefined,
      special_instructions: this.special_instructions,
      estimated_duration: estimatedDuration,
      start_time: startTime || null,
      end_time: endTime || null,
      // Payment data
      payment_method: this.paymentForm.value.payment_method,
      country_code: this.paymentForm.value.country_code,
      phone_number: `${DEFAULT_PHONE_PREFIX}${this.paymentForm.value.phone_number}`,
      operator: this.paymentForm.value.operator,
      // Escrow fields
      escrow_enabled: true,
      escrow_amount: fees.escrowAmount,
      platform_fee: fees.platformFee
    };

    console.log('Creating mission with payment data:', missionData);

    this.http.post<any>(`${this.apiUrl}/missions/`, missionData, { headers: this.h() }).subscribe({
      next: (mission) => {
        const paymentId = mission.payment_id;
        if (!paymentId) {
          this.isSubmitting = false;
          this.snackBar.open('Mission créée mais paiement introuvable', 'Fermer', { duration: 4000 });
          this.router.navigate(['/client/missions']);
          return;
        }
        this.paymentService.confirmPayment(paymentId, this.paymentForm.value.otp).subscribe({
          next: () => {
            this.anchorMissionOnChain(mission, deadline).finally(() => {
              this.isSubmitting = false;
              this.router.navigate(['/client/missions', mission.id]);
            });
          },
          error: (payErr) => {
            this.isSubmitting = false;
            const msg = payErr.error?.detail || 'Erreur paiement Mobile Money';
            this.snackBar.open(msg, 'Fermer', { duration: 5000 });
            this.router.navigate(['/client/missions', mission.id]);
          }
        });
      },
      error: (err) => {
        this.isSubmitting = false;
        const msg = err.error?.detail || 'Erreur création mission';
        this.snackBar.open(msg, 'Fermer', { duration: 5000 });
      }
    });
  }

  private async anchorMissionOnChain(mission: any, deadline: Date): Promise<void> {
    this.snackBar.open('Mission créée et paiement Mobile Money confirmé !', 'Fermer', { duration: 3500 });

    if (!this.blockchainAvailable && !environment.contracts.escrow) {
      return;
    }

    try {
      if (!this.web3Service.getAddress()) {
        await this.web3Service.connectWallet();
      }

      const missionHash = this.blockchainService.buildMissionHash(mission.id, mission.title || '');
      const deadlineUnix = Math.floor(deadline.getTime() / 1000);
      const ethAmount = this.blockchainService.xofToTestEth(
        mission.budget || parseFloat(this.missionDetailsForm.value.budget),
      );

      const tx = await this.web3Service.createMissionOnChain(missionHash, deadlineUnix, ethAmount);
      const result = await tx.wait();
      const missionContractId = result?.missionId;

      await lastValueFrom(this.blockchainService.recordMission({
        mission_id: mission.id,
        tx_hash: tx.hash,
        mission_contract_id: missionContractId,
        block_number: result?.receipt?.blockNumber,
        gas_used: result?.receipt?.gasUsed ? Number(result.receipt.gasUsed) : undefined,
      }));

      this.snackBar.open('Mission ancrée sur la blockchain Sepolia', 'Voir', { duration: 6000 });
    } catch (err: any) {
      console.warn('Ancrage blockchain optionnel non effectué:', err);
      const msg = err?.message?.includes('MetaMask')
        ? 'Mission créée. Connectez MetaMask (Sepolia) pour l\'ancrage blockchain.'
        : 'Mission créée. Ancrage blockchain non effectué (vérifiez Sepolia et le contrat escrow).';
      this.snackBar.open(msg, 'Fermer', { duration: 5000 });
    }
  }
}
