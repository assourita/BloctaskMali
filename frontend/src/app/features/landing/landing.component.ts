import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import type { User } from '../../core/services/auth.service';
import {
  LandingService,
  LandingCategory,
  LandingEnterprise,
  LandingMission,
  LandingProvider,
  LandingStats,
} from '../../core/services/landing.service';
import {
  ProviderProfileDialogComponent,
} from './provider-profile-dialog/provider-profile-dialog.component';
import {
  ProvidersListDialogComponent,
} from './providers-list-dialog/providers-list-dialog.component';
import {
  EnterpriseProfileDialogComponent,
} from './enterprise-profile-dialog/enterprise-profile-dialog.component';
import {
  EnterprisesListDialogComponent,
} from './enterprises-list-dialog/enterprises-list-dialog.component';
import { AssignMissionDialogComponent } from './assign-mission-dialog/assign-mission-dialog.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatDialogModule,
  ],
  template: `
    <div class="landing-container">
      <!-- TaskRabbit Style Header - Sticky -->
      <nav class="tr-navbar" [class.scrolled]="isScrolled">
        <div class="nav-container">
          <div class="logo" routerLink="/">
            <span class="logo-icon">⚡</span>
            <span class="logo-text">BlockTask</span>
          </div>
          <div class="nav-center">
            <a href="#services">Services</a>
            <a href="#missions">Missions</a>
            <a href="#taskers">Prestataires</a>
            <a href="#enterprises">Entreprises</a>
            <a href="#how-it-works">Comment ça marche</a>
          </div>
          <div class="nav-actions" *ngIf="currentUser$ | async as user; else guestActions">
            <button mat-button (click)="goToMySpace()" class="nav-btn">
              <span>Mon Espace</span>
            </button>
            <button mat-raised-button class="nav-btn-primary" (click)="logout()">
              Déconnexion
            </button>
          </div>
          <ng-template #guestActions>
            <div class="nav-actions">
              <button mat-button routerLink="/login" class="nav-btn">Connexion</button>
              <button mat-raised-button routerLink="/register" class="nav-btn-primary">Inscription</button>
            </div>
          </ng-template>
        </div>
      </nav>

      <!-- Hero Section - TaskRabbit Style -->
      <section class="tr-hero">
        <div class="hero-container">
          <h1>Tout faire, sans bouger</h1>
          <p class="hero-subtitle" *ngIf="stats; else defaultSubtitle">
            {{ stats.total_providers }} prestataire{{ stats.total_providers > 1 ? 's' : '' }} de confiance
            · {{ stats.open_missions }} mission{{ stats.open_missions > 1 ? 's' : '' }} ouverte{{ stats.open_missions > 1 ? 's' : '' }}
            · {{ stats.completed_missions }} terminée{{ stats.completed_missions > 1 ? 's' : '' }}
          </p>
          <ng-template #defaultSubtitle>
            <p class="hero-subtitle">Des prestataires de confiance pour vos missions quotidiennes au Mali</p>
          </ng-template>

          <div class="hero-stats" *ngIf="stats">
            <div class="hero-stat">
              <span class="hero-stat-value">{{ stats.total_providers }}</span>
              <span class="hero-stat-label">Prestataires</span>
            </div>
            <div class="hero-stat">
              <span class="hero-stat-value">{{ stats.open_missions }}</span>
              <span class="hero-stat-label">Missions ouvertes</span>
            </div>
            <div class="hero-stat">
              <span class="hero-stat-value">{{ stats.completed_missions }}</span>
              <span class="hero-stat-label">Missions réalisées</span>
            </div>
          </div>
          
          <!-- Search Bar -->
          <div class="search-box">
            <mat-icon class="search-icon">search</mat-icon>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (keyup.enter)="onSearch()"
              placeholder="De quoi avez-vous besoin ? (Livraison, déménagement, réparation...)" />
            <button mat-raised-button class="search-btn" (click)="onSearch()">Rechercher</button>
          </div>
          
          <!-- Popular Searches -->
          <div class="popular-searches" *ngIf="popularCategories.length">
            <span>Populaire :</span>
            <a
              *ngFor="let cat of popularCategories"
              href="#missions"
              (click)="searchByCategory(cat); $event.preventDefault()">{{ cat }}</a>
          </div>
        </div>
      </section>

      <!-- Service Categories - Grid Style TaskRabbit -->
      <section id="services" class="services-section">
        <div class="section-container">
          <h2>Explorez nos services</h2>
          <div class="loading-row" *ngIf="loading">
            <mat-spinner diameter="40"></mat-spinner>
          </div>
          <div class="services-grid" *ngIf="!loading && categories.length">
            <div
              class="service-card"
              *ngFor="let service of categories; let i = index"
              (click)="searchByCategory(service.name)">
              <div class="service-icon" [style.background]="getCategoryColor(i)">
                <mat-icon>{{ service.icon || 'category' }}</mat-icon>
              </div>
              <h3>{{ service.name }}</h3>
              <p>{{ service.description || 'Missions disponibles dans cette catégorie' }}</p>
              <span class="task-count">
                {{ service.open_mission_count }} mission{{ service.open_mission_count > 1 ? 's' : '' }} ouverte{{ service.open_mission_count > 1 ? 's' : '' }}
                <ng-container *ngIf="service.provider_count"> · {{ service.provider_count }} prestataire{{ service.provider_count > 1 ? 's' : '' }}</ng-container>
              </span>
            </div>
          </div>
          <p class="empty-message" *ngIf="!loading && !categories.length">
            Aucune catégorie active pour le moment. Revenez bientôt !
          </p>
        </div>
      </section>

      <!-- Featured Missions -->
      <section id="missions" class="missions-section">
        <div class="section-container">
          <h2>Missions disponibles</h2>
          <p class="section-subtitle" *ngIf="searchQuery">Résultats pour « {{ searchQuery }} »</p>
          <p class="section-subtitle" *ngIf="!searchQuery">Publiez ou postulez à des missions financées en escrow</p>
          <div class="loading-row" *ngIf="loading">
            <mat-spinner diameter="40"></mat-spinner>
          </div>
          <div class="missions-grid" *ngIf="!loading && missions.length">
            <mat-card class="mission-card" *ngFor="let mission of missions">
              <div class="mission-card-header">
                <span class="mission-category">
                  <mat-icon>{{ mission.category_icon || 'assignment' }}</mat-icon>
                  {{ mission.category_name }}
                </span>
                <span class="mission-budget">{{ mission.budget | number:'1.0-0' }} {{ mission.currency }}</span>
              </div>
              <h3>{{ mission.title }}</h3>
              <p class="mission-location" *ngIf="mission.pickup_address">
                <mat-icon>place</mat-icon>
                {{ mission.pickup_address }}
              </p>
              <div class="mission-meta">
                <span *ngIf="mission.deadline">
                  <mat-icon>schedule</mat-icon>
                  {{ mission.deadline | date:'dd/MM/yyyy' }}
                </span>
                <span>
                  <mat-icon>people</mat-icon>
                  {{ mission.application_count }} candidature{{ mission.application_count > 1 ? 's' : '' }}
                </span>
              </div>
              <button mat-stroked-button class="mission-btn" (click)="viewMission(mission)">
                Voir la mission
              </button>
            </mat-card>
          </div>
          <p class="empty-message" *ngIf="!loading && !missions.length">
            Aucune mission ouverte pour le moment.
            <a routerLink="/register">Créez un compte</a> pour publier la première !
          </p>
        </div>
      </section>

      <!-- Featured Taskers -->
      <section id="taskers" class="taskers-section">
        <div class="section-container">
          <h2>Nos meilleurs prestataires</h2>
          <p class="section-subtitle">Évalués et vérifiés par la communauté</p>
          <div class="loading-row" *ngIf="loading">
            <mat-spinner diameter="40"></mat-spinner>
          </div>
          <div class="taskers-grid" *ngIf="!loading && providers.length">
            <div class="tasker-card" *ngFor="let tasker of providers; let i = index">
              <div class="tasker-header" [style.background]="getProviderGradient(i)">
                <div class="tasker-avatar" *ngIf="!tasker.profile_picture">{{ getProviderInitial(tasker) }}</div>
                <img *ngIf="tasker.profile_picture" [src]="tasker.profile_picture" class="tasker-photo" [alt]="getProviderName(tasker)" />
              </div>
              <div class="tasker-body">
                <h4>
                  {{ getProviderName(tasker) }}
                  <mat-icon class="verified-icon" *ngIf="tasker.identity_verified" title="Identité vérifiée">verified</mat-icon>
                </h4>
                <div class="tasker-rating">
                  <span class="stars">⭐ {{ getProviderRating(tasker) }}</span>
                  <span class="reviews" *ngIf="tasker.review_count">({{ tasker.review_count }} avis)</span>
                </div>
                <p class="tasker-skills">{{ getProviderSkills(tasker) }}</p>
                <p class="tasker-city" *ngIf="tasker.city">{{ tasker.city }}</p>
                <div class="tasker-stats">
                  <span class="missions">{{ tasker.completed_missions }} mission{{ tasker.completed_missions > 1 ? 's' : '' }} réalisée{{ tasker.completed_missions > 1 ? 's' : '' }}</span>
                </div>
                <button mat-stroked-button class="hire-btn" (click)="viewProviderProfile(tasker, i)">Voir son profil</button>
              </div>
            </div>
          </div>
          <p class="empty-message" *ngIf="!loading && !providers.length">
            Les premiers prestataires arrivent bientôt. <a routerLink="/register">Inscrivez-vous</a> pour rejoindre la plateforme.
          </p>
          <div class="section-actions" *ngIf="!loading && totalProviders > providers.length">
            <button mat-raised-button class="more-btn" (click)="openAllProviders()">
              <mat-icon>groups</mat-icon>
              Voir plus de prestataires ({{ totalProviders }})
            </button>
          </div>
        </div>
      </section>

      <!-- Entreprises -->
      <section id="enterprises" class="enterprises-section">
        <div class="section-container">
          <h2>Entreprises partenaires</h2>
          <p class="section-subtitle">
            PME et grandes structures qui délèguent leurs missions terrain via BlockTask
            <ng-container *ngIf="stats?.total_enterprises as entCount"> · {{ entCount }} inscrite{{ entCount > 1 ? 's' : '' }}</ng-container>
          </p>
          <div class="loading-row" *ngIf="loading">
            <mat-spinner diameter="40"></mat-spinner>
          </div>
          <div class="enterprises-grid" *ngIf="!loading && enterprises.length">
            <mat-card class="enterprise-card" *ngFor="let ent of enterprises">
              <div class="enterprise-logo">
                <img *ngIf="ent.logo" [src]="ent.logo" [alt]="getEnterpriseName(ent)" />
                <mat-icon *ngIf="!ent.logo">business</mat-icon>
              </div>
              <div class="enterprise-body">
                <h3>
                  {{ getEnterpriseName(ent) }}
                  <mat-icon class="verified-icon" *ngIf="ent.is_verified" title="Entreprise vérifiée">verified</mat-icon>
                </h3>
                <p class="enterprise-city">
                  <mat-icon>location_on</mat-icon> {{ getEnterpriseCity(ent) }}
                </p>
                <div class="enterprise-stats">
                  <span *ngIf="ent.total_missions_posted > 0">
                    <mat-icon>assignment</mat-icon> {{ ent.total_missions_posted }} mission{{ ent.total_missions_posted > 1 ? 's' : '' }}
                  </span>
                  <span *ngIf="ent.total_employees > 0">
                    <mat-icon>groups</mat-icon> {{ ent.total_employees }} employé{{ ent.total_employees > 1 ? 's' : '' }}
                  </span>
                  <span *ngIf="!ent.total_missions_posted && !ent.total_employees">
                    <mat-icon>verified</mat-icon> Partenaire BlockTask
                  </span>
                </div>
                <div class="enterprise-actions">
                  <button mat-stroked-button class="ent-btn" (click)="viewEnterpriseProfile(ent)">
                    Voir le profil
                  </button>
                  <button mat-raised-button class="ent-btn primary" (click)="assignToEnterprise(ent)">
                    <mat-icon>send</mat-icon> Solliciter
                  </button>
                </div>
              </div>
            </mat-card>
          </div>
          <div class="section-actions" *ngIf="!loading && totalEnterprises > enterprises.length">
            <button mat-raised-button class="more-btn enterprise-more" (click)="openAllEnterprises()">
              <mat-icon>business</mat-icon>
              Voir plus d'entreprises ({{ totalEnterprises }})
            </button>
          </div>
          <p class="empty-message" *ngIf="!loading && !enterprises.length">
            Soyez la première entreprise partenaire sur BlockTask Mali.
          </p>
          <div class="enterprise-cta">
            <div class="enterprise-benefits">
              <div class="benefit">
                <mat-icon>groups</mat-icon>
                <span>Gérez vos équipes terrain</span>
              </div>
              <div class="benefit">
                <mat-icon>analytics</mat-icon>
                <span>Suivi et analytics</span>
              </div>
              <div class="benefit">
                <mat-icon>receipt_long</mat-icon>
                <span>Facturation centralisée</span>
              </div>
            </div>
            <button mat-raised-button class="enterprise-btn" routerLink="/register" [queryParams]="{ type: 'enterprise' }">
              <mat-icon>business_center</mat-icon> Inscrire mon entreprise
            </button>
          </div>
        </div>
      </section>

      <!-- Features Section -->
      <section id="features" class="features">
        <div class="container">
          <h2>Pourquoi choisir BlockTask ?</h2>
          <p class="section-subtitle">Une plateforme complète qui révolutionne la délégation de tâches</p>
          
          <div class="features-grid">
            <mat-card class="feature-card">
              <div class="feature-icon">
                <mat-icon>shield</mat-icon>
              </div>
              <h3>Smart Contracts Escrow</h3>
              <p>Vos fonds sont sécurisés sur la blockchain jusqu'à validation de la mission. Paiement garanti et irréversible.</p>
            </mat-card>

            <mat-card class="feature-card">
              <div class="feature-icon">
                <mat-icon>verified_user</mat-icon>
              </div>
              <h3>Réputation Algorithmique</h3>
              <p>Système de scoring sophistiqué basé sur la qualité, la ponctualité et la fiabilité. Pas d'avis falsifiés.</p>
            </mat-card>

            <mat-card class="feature-card">
              <div class="feature-icon">
                <mat-icon>my_location</mat-icon>
              </div>
              <h3>Suivi GPS en temps réel</h3>
              <p>Suivez vos missions en direct sur la carte. Notifications automatiques à chaque étape clé.</p>
            </mat-card>

            <mat-card class="feature-card">
              <div class="feature-icon">
                <mat-icon>gavel</mat-icon>
              </div>
              <h3>Arbitrage Décentralisé</h3>
              <p>Système de litiges transparent avec soumission de preuves et décisions automatisées par smart contracts.</p>
            </mat-card>

            <mat-card class="feature-card">
              <div class="feature-icon">
                <mat-icon>business</mat-icon>
              </div>
              <h3>Solutions Entreprises</h3>
              <p>Gérez vos équipes de terrain, suivez les performances en temps réel et automatisez la facturation.</p>
            </mat-card>

            <mat-card class="feature-card">
              <div class="feature-icon">
                <mat-icon>account_balance_wallet</mat-icon>
              </div>
              <h3>Paiements Crypto & Mobile</h3>
              <p>Payez en FCFA ou en mobile money (Orange, Moov, Wave). Retraits instantanés.</p>
            </mat-card>
          </div>
        </div>
      </section>

      <!-- How it Works -->
      <section id="how-it-works" class="how-it-works">
        <div class="container">
          <h2>Comment ça marche ?</h2>
          <p class="section-subtitle">Un parcours simple, sécurisé et adapté à chaque profil</p>

          <div class="flow-tabs">
            <button
              type="button"
              class="flow-tab"
              [class.active]="howItWorksTab === 'client'"
              (click)="howItWorksTab = 'client'">
              <mat-icon>person</mat-icon> Client
            </button>
            <button
              type="button"
              class="flow-tab"
              [class.active]="howItWorksTab === 'provider'"
              (click)="howItWorksTab = 'provider'">
              <mat-icon>work</mat-icon> Prestataire
            </button>
            <button
              type="button"
              class="flow-tab"
              [class.active]="howItWorksTab === 'enterprise'"
              (click)="howItWorksTab = 'enterprise'">
              <mat-icon>business</mat-icon> Entreprise
            </button>
          </div>

          <div class="steps" *ngIf="howItWorksTab === 'client'">
            <div class="step-card" *ngFor="let step of clientSteps; let i = index">
              <div class="step-icon-wrap">
                <mat-icon>{{ step.icon }}</mat-icon>
                <span class="step-num">{{ i + 1 }}</span>
              </div>
              <h3>{{ step.title }}</h3>
              <p>{{ step.description }}</p>
            </div>
          </div>

          <div class="steps" *ngIf="howItWorksTab === 'provider'">
            <div class="step-card" *ngFor="let step of providerSteps; let i = index">
              <div class="step-icon-wrap">
                <mat-icon>{{ step.icon }}</mat-icon>
                <span class="step-num">{{ i + 1 }}</span>
              </div>
              <h3>{{ step.title }}</h3>
              <p>{{ step.description }}</p>
            </div>
          </div>

          <div class="steps" *ngIf="howItWorksTab === 'enterprise'">
            <div class="step-card" *ngFor="let step of enterpriseSteps; let i = index">
              <div class="step-icon-wrap">
                <mat-icon>{{ step.icon }}</mat-icon>
                <span class="step-num">{{ i + 1 }}</span>
              </div>
              <h3>{{ step.title }}</h3>
              <p>{{ step.description }}</p>
            </div>
          </div>

          <div class="how-cta">
            <button mat-raised-button class="how-cta-btn" *ngIf="howItWorksTab === 'client'" routerLink="/register" [queryParams]="{ type: 'client' }">
              <mat-icon>add_task</mat-icon> Publier ma première mission
            </button>
            <button mat-raised-button class="how-cta-btn" *ngIf="howItWorksTab === 'provider'" routerLink="/register" [queryParams]="{ type: 'provider' }">
              <mat-icon>work</mat-icon> Devenir prestataire
            </button>
            <button mat-raised-button class="how-cta-btn" *ngIf="howItWorksTab === 'enterprise'" routerLink="/register" [queryParams]="{ type: 'enterprise' }">
              <mat-icon>business_center</mat-icon> Inscrire mon entreprise
            </button>
          </div>
        </div>
      </section>

      <!-- CTA Section -->
      <section class="cta-section">
        <div class="container">
          <h2>Prêt à révolutionner votre productivité ?</h2>
          <p *ngIf="stats && stats.total_providers > 0">
            Rejoignez {{ stats.total_providers }} prestataire{{ stats.total_providers > 1 ? 's' : '' }}
            et des clients qui font confiance à BlockTask pour leurs missions quotidiennes.
          </p>
          <p *ngIf="!stats || stats.total_providers === 0">
            Soyez parmi les premiers à utiliser BlockTask pour vos missions quotidiennes au Mali.
          </p>
          <button mat-raised-button color="accent" class="cta-large" routerLink="/register">
            Créer un compte gratuit
          </button>
        </div>
      </section>

      <!-- Footer -->
      <footer class="footer">
        <div class="container">
          <div class="footer-grid">
            <div class="footer-brand">
              <div class="logo">
                <span class="logo-icon">⛓️</span>
                <span class="logo-text">BlockTask</span>
              </div>
              <p>La première plateforme africaine de délégation de tâches décentralisée.</p>
            </div>
            <div class="footer-links">
              <h4>Produit</h4>
              <a href="#features">Fonctionnalités</a>
              <a href="#how-it-works">Comment ça marche</a>
              <a href="#enterprises">Entreprises</a>
            </div>
            <div class="footer-links">
              <h4>Ressources</h4>
              <a routerLink="/help">Centre d'aide</a>
              <a href="#missions">Missions ouvertes</a>
              <a href="#taskers">Prestataires</a>
              <a routerLink="/help">Support</a>
            </div>
            <div class="footer-links">
              <h4>Compte</h4>
              <a routerLink="/login">Connexion</a>
              <a routerLink="/register">Inscription</a>
              <a routerLink="/register" [queryParams]="{ type: 'provider' }">Devenir prestataire</a>
            </div>
          </div>
          <div class="footer-bottom">
            <p>&copy; 2026 BlockTask. Tous droits réservés. Créé par Assourita.</p>
          </div>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    .landing-container {
      font-family: var(--font-sans);
    }

    /* Hero Section */
    .hero {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      color: white;
      padding: 0 5%;
    }

    .navbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 24px 0;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo-icon {
      font-size: 28px;
    }

    .logo-text {
      font-size: 24px;
      font-weight: 700;
    }

    .nav-links {
      display: flex;
      gap: 32px;
    }

    .nav-links a {
      color: rgba(255,255,255,0.9);
      text-decoration: none;
      font-weight: 500;
      transition: color 0.2s;
    }

    .nav-links a:hover {
      color: white;
    }

    .nav-actions {
      display: flex;
      gap: 12px;
    }

    .hero-content {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 64px;
      padding: 80px 0;
      align-items: center;
    }

    .hero-text h1 {
      font-size: 56px;
      font-weight: 800;
      line-height: 1.1;
      margin-bottom: 24px;
    }

    .hero-subtitle {
      font-size: 20px;
      line-height: 1.6;
      color: rgba(255,255,255,0.9);
      margin-bottom: 40px;
    }

    .hero-cta {
      display: flex;
      gap: 16px;
      margin-bottom: 48px;
    }

    .cta-primary {
      height: 56px;
      padding: 0 32px;
      font-size: 16px;
      background: #f59e0b !important;
    }

    .cta-primary mat-icon {
      margin-left: 8px;
    }

    .cta-secondary {
      height: 56px;
      padding: 0 32px;
      font-size: 16px;
      border-color: white !important;
      color: white !important;
    }

    .hero-stats {
      display: flex;
      gap: 48px;
    }

    .stat {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: 36px;
      font-weight: 700;
    }

    .stat-label {
      font-size: 14px;
      color: rgba(255,255,255,0.8);
    }

    /* Hero Card */
    .hero-visual {
      display: flex;
      justify-content: center;
    }

    .hero-card {
      background: white;
      border-radius: 16px;
      padding: 24px;
      width: 100%;
      max-width: 380px;
      color: #1f2937;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .badge {
      background: #dbeafe;
      color: #1e40af;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }

    .amount {
      font-size: 20px;
      font-weight: 700;
      color: #059669;
    }

    .card-body h4 {
      font-size: 18px;
      margin-bottom: 12px;
    }

    .location {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #6b7280;
      font-size: 14px;
      margin-bottom: 16px;
    }

    .progress {
      margin-top: 16px;
    }

    .progress-bar {
      height: 8px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 8px;
    }

    .progress-fill {
      height: 100%;
      background: #3b82f6;
      border-radius: 4px;
    }

    .progress span {
      font-size: 12px;
      color: #6b7280;
    }

    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
    }

    .provider {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .avatar {
      width: 40px;
      height: 40px;
      background: #3b82f6;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
    }

    .info {
      display: flex;
      flex-direction: column;
    }

    .name {
      font-weight: 600;
      font-size: 14px;
    }

    .rating {
      font-size: 12px;
      color: #6b7280;
    }

    .escrow-badge {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #059669;
      font-size: 12px;
      font-weight: 600;
    }

    /* Features Section */
    .features {
      padding: 100px 5%;
      background: white;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .features h2 {
      text-align: center;
      font-size: 40px;
      font-weight: 700;
      margin-bottom: 16px;
    }

    .section-subtitle {
      text-align: center;
      color: #6b7280;
      font-size: 18px;
      margin-bottom: 64px;
    }

    .features-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 32px;
    }

    .feature-card {
      padding: 32px;
      text-align: center;
    }

    .feature-icon {
      width: 64px;
      height: 64px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
    }

    .feature-icon mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: white;
    }

    .feature-card h3 {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 12px;
    }

    .feature-card p {
      color: #6b7280;
      line-height: 1.6;
    }

    /* How it Works */
    .how-it-works {
      padding: 80px 24px;
      background: #f8fafc;
    }

    .how-it-works h2 {
      text-align: center;
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 8px;
      color: #0f172a;
    }

    .how-it-works .section-subtitle {
      text-align: center;
      color: #64748b;
      margin-bottom: 32px;
    }

    .flow-tabs {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-bottom: 40px;
      flex-wrap: wrap;
    }

    .flow-tab {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      border: 2px solid #e2e8f0;
      border-radius: 999px;
      background: white;
      color: #64748b;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: inherit;
    }

    .flow-tab mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .flow-tab:hover {
      border-color: #3CB371;
      color: #3CB371;
    }

    .flow-tab.active {
      background: #3CB371;
      border-color: #3CB371;
      color: white;
    }

    .steps {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      max-width: 1100px;
      margin: 0 auto;
    }

    .step-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 24px 20px;
      text-align: center;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .step-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 24px rgba(60, 179, 113, 0.12);
      border-color: #bbf7d0;
    }

    .step-icon-wrap {
      position: relative;
      width: 56px;
      height: 56px;
      margin: 0 auto 16px;
      background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .step-icon-wrap mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: #059669;
    }

    .step-num {
      position: absolute;
      top: -6px;
      right: -6px;
      width: 22px;
      height: 22px;
      background: #3CB371;
      color: white;
      border-radius: 50%;
      font-size: 11px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid white;
    }

    .step-card h3 {
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 8px;
      color: #0f172a;
    }

    .step-card p {
      font-size: 13px;
      color: #64748b;
      line-height: 1.55;
      margin: 0;
    }

    .how-cta {
      text-align: center;
      margin-top: 36px;
    }

    .how-cta-btn {
      background: #3CB371 !important;
      color: white !important;
      padding: 12px 28px !important;
      font-weight: 600 !important;
      border-radius: 12px !important;
    }

    .how-cta-btn mat-icon {
      margin-right: 8px;
    }

    /* CTA Section */
    .cta-section {
      padding: 100px 5%;
      background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
      color: white;
      text-align: center;
    }

    .cta-section h2 {
      font-size: 40px;
      font-weight: 700;
      margin-bottom: 16px;
    }

    .cta-section p {
      font-size: 18px;
      color: rgba(255,255,255,0.8);
      margin-bottom: 40px;
    }

    .cta-large {
      height: 64px;
      padding: 0 48px;
      font-size: 18px;
      background: #f59e0b !important;
    }

    /* Footer */
    .footer {
      padding: 64px 5% 32px;
      background: white;
      border-top: 1px solid #e5e7eb;
    }

    .footer-grid {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr;
      gap: 64px;
      margin-bottom: 48px;
    }

    .footer-brand p {
      color: #6b7280;
      margin-top: 16px;
      line-height: 1.6;
    }

    .footer-links h4 {
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 16px;
    }

    .footer-links a {
      display: block;
      color: #6b7280;
      text-decoration: none;
      padding: 8px 0;
      transition: color 0.2s;
    }

    .footer-links a:hover {
      color: #3b82f6;
    }

    .footer-bottom {
      text-align: center;
      padding-top: 32px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }

    /* Responsive */
    @media (max-width: 1024px) {
      .hero-content {
        grid-template-columns: 1fr;
        text-align: center;
      }

      .hero-text h1 {
        font-size: 40px;
      }

      .hero-cta {
        justify-content: center;
      }

      .hero-stats {
        justify-content: center;
      }

      .hero-visual {
        display: none;
      }

      .features-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .steps {
        grid-template-columns: repeat(2, 1fr);
      }

      .footer-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 640px) {
      .nav-links {
        display: none;
      }

      .hero-text h1 {
        font-size: 32px;
      }

      .hero-cta {
        flex-direction: column;
      }

      .hero-stats {
        flex-direction: column;
        gap: 24px;
        align-items: center;
      }

      .features-grid {
        grid-template-columns: 1fr;
      }

      .footer-grid {
        grid-template-columns: 1fr;
        gap: 32px;
      }
    }

    /* TaskRabbit Additional Styles */
    .tr-navbar {
      background: white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1000;
      transition: box-shadow 0.3s ease;
    }

    .tr-navbar.scrolled {
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    }

    .landing-container {
      padding-top: 64px;
    }

    .nav-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 16px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .tr-navbar .logo {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }

    .tr-navbar .logo-icon {
      font-size: 24px;
    }

    .tr-navbar .logo-text {
      font-size: 22px;
      font-weight: 700;
      color: #3CB371;
    }

    .nav-center {
      display: flex;
      gap: 32px;
    }

    .nav-center a {
      color: #4a4a4a;
      text-decoration: none;
      font-weight: 500;
      font-size: 15px;
      transition: color 0.2s;
    }

    .nav-center a:hover {
      color: #3CB371;
    }

    .nav-actions {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .nav-btn {
      color: #4a4a4a !important;
      font-weight: 500;
    }

    .nav-btn-primary {
      background: #3CB371 !important;
      color: white !important;
      font-weight: 600;
      border-radius: 4px;
      padding: 8px 20px;
    }

    /* Hero TaskRabbit Style */
    .tr-hero {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      padding: 80px 24px;
      text-align: center;
    }

    .hero-container {
      max-width: 800px;
      margin: 0 auto;
    }

    .tr-hero h1 {
      font-size: 48px;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 16px;
    }

    .hero-subtitle {
      font-size: 20px;
      color: #6c757d;
      margin-bottom: 24px;
    }

    .hero-stats {
      display: flex;
      justify-content: center;
      gap: 48px;
      margin-bottom: 32px;
      flex-wrap: wrap;
    }

    .hero-stat {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .hero-stat-value {
      font-size: 28px;
      font-weight: 700;
      color: #3CB371;
    }

    .hero-stat-label {
      font-size: 13px;
      color: #6c757d;
      margin-top: 4px;
    }

    .loading-row {
      display: flex;
      justify-content: center;
      padding: 40px 0;
    }

    .empty-message {
      text-align: center;
      color: #6c757d;
      padding: 24px 0;
    }

    .empty-message a {
      color: #3CB371;
    }

    .search-box {
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      padding: 8px;
      max-width: 700px;
      margin: 0 auto;
    }

    .search-icon {
      color: #adb5bd;
      margin: 0 16px;
    }

    .search-box input {
      flex: 1;
      border: none;
      outline: none;
      font-size: 16px;
      padding: 12px 0;
      color: #495057;
    }

    .search-box input::placeholder {
      color: #adb5bd;
    }

    .search-btn {
      background: #3CB371 !important;
      color: white !important;
      padding: 14px 32px !important;
      font-weight: 600;
      border-radius: 6px;
    }

    .popular-searches {
      margin-top: 20px;
      color: #6c757d;
      font-size: 14px;
    }

    .popular-searches span {
      margin-right: 8px;
    }

    .popular-searches a {
      color: #3CB371;
      text-decoration: none;
      margin: 0 8px;
      font-weight: 500;
    }

    .popular-searches a:hover {
      text-decoration: underline;
    }

    /* Services Section */
    .services-section {
      padding: 80px 24px;
      background: white;
    }

    .section-container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .services-section h2 {
      text-align: center;
      font-size: 32px;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 48px;
    }

    .services-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 24px;
    }

    .service-card {
      background: white;
      border: 1px solid #e9ecef;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .service-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 24px rgba(0,0,0,0.1);
      border-color: #3CB371;
    }

    .service-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
    }

    .service-icon mat-icon {
      color: white;
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .service-card h3 {
      font-size: 18px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 8px;
    }

    .service-card p {
      font-size: 14px;
      color: #6c757d;
      margin-bottom: 12px;
    }

    .task-count {
      font-size: 13px;
      color: #3CB371;
      font-weight: 500;
    }

    /* Taskers Section */
    .taskers-section {
      padding: 80px 24px;
      background: #f8f9fa;
    }

    .taskers-section h2 {
      text-align: center;
      font-size: 32px;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 8px;
    }

    .section-subtitle {
      text-align: center;
      color: #6c757d;
      margin-bottom: 48px;
      font-size: 16px;
    }

    .taskers-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 24px;
    }

    .tasker-card {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: transform 0.3s ease;
    }

    .tasker-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    }

    .tasker-header {
      height: 80px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding-bottom: -20px;
    }

    .tasker-avatar {
      width: 64px;
      height: 64px;
      background: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: 600;
      color: #3CB371;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      transform: translateY(32px);
      border: 3px solid white;
    }

    .tasker-body {
      padding: 40px 20px 24px;
      text-align: center;
    }

    .tasker-body h4 {
      font-size: 18px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 8px;
    }

    .tasker-rating {
      margin-bottom: 8px;
    }

    .stars {
      color: #ffc107;
      font-weight: 500;
    }

    .reviews {
      color: #6c757d;
      font-size: 14px;
      margin-left: 4px;
    }

    .tasker-skills {
      font-size: 14px;
      color: #6c757d;
      margin-bottom: 16px;
    }

    .tasker-stats {
      margin-bottom: 16px;
    }

    .missions {
      font-size: 14px;
      color: #3CB371;
      font-weight: 500;
    }

    .hire-btn {
      width: 100%;
      border-color: #3CB371 !important;
      color: #3CB371 !important;
      font-weight: 600;
    }

    .hire-btn:hover {
      background: #3CB371 !important;
      color: white !important;
    }

    .section-actions {
      text-align: center;
      margin-top: 32px;
    }

    .more-btn {
      background: #3CB371 !important;
      color: white !important;
      padding: 12px 28px !important;
      font-weight: 600;
    }

    /* Enterprises Section */
    .enterprises-section {
      padding: 80px 24px;
      background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
      color: white;
    }

    .enterprises-section h2 {
      text-align: center;
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 8px;
    }

    .enterprises-section .section-subtitle {
      color: #94a3b8;
    }

    .enterprises-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 32px;
    }

    .enterprise-card {
      display: flex;
      gap: 16px;
      padding: 20px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: white;
    }

    .enterprise-logo {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      background: rgba(60, 179, 113, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      overflow: hidden;
    }

    .enterprise-logo mat-icon {
      color: #3CB371;
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .enterprise-logo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .enterprise-body h3 {
      margin: 0 0 6px;
      font-size: 16px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 4px;
      line-height: 1.3;
      color: #f8fafc;
    }

    .enterprise-body {
      flex: 1;
      min-width: 0;
    }

    .enterprise-city {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      color: #94a3b8;
      margin: 0 0 8px;
    }

    .enterprise-city mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .enterprise-stats {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      font-size: 12px;
      color: #cbd5e1;
      margin-bottom: 8px;
    }

    .enterprise-stats span {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .enterprise-stats mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      color: #3CB371;
    }

    .enterprise-web {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: #3CB371;
      text-decoration: none;
    }

    .enterprise-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 12px;
    }

    .ent-btn {
      flex: 1;
      min-width: 120px;
      font-size: 13px !important;
      border-color: rgba(255, 255, 255, 0.35) !important;
      color: #f8fafc !important;
    }

    .ent-btn.primary {
      background: #7c3aed !important;
      color: white !important;
      border: none !important;
    }

    .ent-btn.primary mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      margin-right: 4px;
    }

    .enterprise-more {
      background: #7c3aed !important;
      color: white !important;
    }

    .enterprises-section .section-actions {
      text-align: center;
      margin-bottom: 24px;
    }

    .enterprise-cta {
      text-align: center;
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .enterprise-benefits {
      display: flex;
      justify-content: center;
      gap: 32px;
      flex-wrap: wrap;
      margin-bottom: 24px;
    }

    .benefit {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #cbd5e1;
    }

    .benefit mat-icon {
      color: #3CB371;
    }

    .enterprise-btn {
      background: #3CB371 !important;
      color: white !important;
      padding: 14px 32px !important;
      font-weight: 600;
    }

    /* Missions Section */
    .missions-section {
      padding: 80px 24px;
      background: white;
    }

    .missions-section h2 {
      text-align: center;
      font-size: 32px;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 8px;
    }

    .missions-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
    }

    .mission-card {
      padding: 20px;
      border-radius: 12px;
      border: 1px solid #e9ecef;
      box-shadow: none;
    }

    .mission-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .mission-category {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      color: #6c757d;
    }

    .mission-category mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .mission-budget {
      font-weight: 700;
      color: #3CB371;
      font-size: 15px;
    }

    .mission-card h3 {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
      color: #1a1a1a;
    }

    .mission-location {
      display: flex;
      align-items: flex-start;
      gap: 4px;
      font-size: 14px;
      color: #6c757d;
      margin-bottom: 12px;
    }

    .mission-location mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }

    .mission-meta {
      display: flex;
      gap: 16px;
      font-size: 13px;
      color: #6c757d;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .mission-meta span {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .mission-meta mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .mission-btn {
      width: 100%;
      border-color: #3CB371 !important;
      color: #3CB371 !important;
      font-weight: 600;
    }

    .verified-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #3CB371;
      vertical-align: middle;
    }

    .tasker-photo {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      object-fit: cover;
      transform: translateY(32px);
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }

    .tasker-city {
      font-size: 13px;
      color: #adb5bd;
      margin-bottom: 8px;
    }

    .tasker-body h4 {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }

    /* Responsive */
    @media (max-width: 1024px) {
      .services-grid, .taskers-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .missions-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .enterprises-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .steps {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 640px) {
      .nav-center {
        display: none;
      }

      .tr-hero h1 {
        font-size: 32px;
      }

      .search-box {
        flex-direction: column;
        padding: 16px;
      }

      .search-box input {
        width: 100%;
        margin: 12px 0;
      }

      .services-grid, .taskers-grid, .missions-grid, .enterprises-grid {
        grid-template-columns: 1fr;
      }

      .enterprise-benefits {
        flex-direction: column;
        align-items: center;
        gap: 12px;
      }

      .how-it-works {
        padding: 56px 16px;
      }

      .how-it-works h2 {
        font-size: 26px;
      }

      .flow-tabs {
        gap: 6px;
        margin-bottom: 28px;
      }

      .flow-tab {
        padding: 8px 14px;
        font-size: 13px;
      }

      .steps {
        grid-template-columns: 1fr;
        gap: 16px;
      }

      .how-cta-btn {
        width: 100%;
      }
    }
  `]
})
export class LandingComponent implements OnInit {
  currentUser$: Observable<User | null>;
  loading = true;
  stats: LandingStats | null = null;
  categories: LandingCategory[] = [];
  missions: LandingMission[] = [];
  providers: LandingProvider[] = [];
  enterprises: LandingEnterprise[] = [];
  popularCategories: string[] = [];
  searchQuery = '';
  totalProviders = 0;
  totalEnterprises = 0;

  private readonly categoryColors = [
    '#3CB371', '#4ECDC4', '#FF6B6B', '#FFE66D',
    '#A8E6CF', '#FFD93D', '#6C5CE7', '#FD79A8',
  ];

  private readonly providerGradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  ];

  isScrolled = false;
  howItWorksTab: 'client' | 'provider' | 'enterprise' = 'client';

  readonly clientSteps = [
    { icon: 'edit_note', title: 'Créez votre mission', description: 'Décrivez le besoin, le lieu, le budget et la date limite. Payez via Mobile Money (Orange, Moov).' },
    { icon: 'groups', title: 'Choisissez un prestataire', description: 'Comparez les profils, notes et candidatures. Les fonds restent bloqués en escrow.' },
    { icon: 'my_location', title: 'Suivez en direct', description: 'Carte GPS, chat et notifications à chaque étape de la mission.' },
    { icon: 'check_circle', title: 'Validez et payez', description: 'Le prestataire envoie ses preuves. Vous validez — le paiement est libéré automatiquement.' },
  ];

  readonly providerSteps = [
    { icon: 'person_add', title: 'Inscrivez-vous', description: 'Créez votre profil prestataire, complétez le KYC (NINA) et ajoutez Mobile Money.' },
    { icon: 'search', title: 'Trouvez des missions', description: 'Parcourez les missions financées près de chez vous et postulez en un clic.' },
    { icon: 'security', title: 'Déposez la caution', description: 'Une fois accepté, déposez la caution puis démarrez la mission avec suivi GPS.' },
    { icon: 'payments', title: 'Recevez vos gains', description: 'Soumettez vos preuves, le client valide — vous êtes payé en FCFA sur votre wallet.' },
  ];

  readonly enterpriseSteps = [
    { icon: 'business_center', title: 'Compte entreprise', description: 'Inscrivez votre société avec RCCM/IFU et gérez vos équipes terrain.' },
    { icon: 'assignment', title: 'Missions groupées', description: 'Publiez des missions récurrentes pour livraisons, courses ou interventions.' },
    { icon: 'analytics', title: 'Pilotage centralisé', description: 'Tableau de bord, analytics et suivi GPS de tous vos agents en temps réel.' },
    { icon: 'receipt_long', title: 'Facturation unique', description: 'Consolidation des dépenses, rapports mensuels et paiements sécurisés en escrow.' },
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    private landingService: LandingService,
    private dialog: MatDialog,
  ) {
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit(): void {
    this.loadLandingData();
  }

  loadLandingData(): void {
    this.loading = true;
    this.landingService.getLandingData(this.searchQuery).subscribe({
      next: (data) => {
        this.stats = data.stats;
        this.categories = data.categories;
        this.missions = data.featured_missions;
        this.providers = data.featured_providers;
        this.enterprises = (data.featured_enterprises || []).filter(e => this.getEnterpriseName(e));
        this.totalProviders = data.stats.total_providers;
        this.totalEnterprises = data.stats.total_enterprises;
        this.popularCategories = data.popular_categories;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  onSearch(): void {
    this.loadLandingData();
    document.getElementById('missions')?.scrollIntoView({ behavior: 'smooth' });
  }

  searchByCategory(name: string): void {
    this.searchQuery = name;
    this.onSearch();
  }

  getCategoryColor(index: number): string {
    return this.categoryColors[index % this.categoryColors.length];
  }

  getProviderGradient(index: number): string {
    return this.providerGradients[index % this.providerGradients.length];
  }

  getProviderName(provider: LandingProvider): string {
    const initial = provider.last_name ? ` ${provider.last_name.charAt(0)}.` : '';
    return `${provider.first_name}${initial}`.trim() || 'Prestataire';
  }

  getProviderInitial(provider: LandingProvider): string {
    return (provider.first_name?.charAt(0) || provider.last_name?.charAt(0) || 'P').toUpperCase();
  }

  getProviderRating(provider: LandingProvider): string {
    if (provider.avg_rating) {
      return provider.avg_rating.toFixed(1);
    }
    return (provider.reputation_score / 20).toFixed(1);
  }

  getProviderSkills(provider: LandingProvider): string {
    if (provider.skills?.length) {
      return provider.skills.slice(0, 3).join(', ');
    }
    return `Niveau ${provider.level}`;
  }

  getEnterpriseName(ent: LandingEnterprise): string {
    return (ent.company_name || '').trim();
  }

  getEnterpriseCity(ent: LandingEnterprise): string {
    return (ent.city || '').trim() || 'Mali';
  }

  viewMission(mission: LandingMission): void {
    const user = this.authService.getCurrentUser();
    if (!user) {
      this.router.navigate(['/register']);
      return;
    }
    if (user.user_type === 'provider' || user.secondary_role === 'provider') {
      this.router.navigate(['/provider/missions', mission.id]);
      return;
    }
    this.router.navigate(['/client/missions/create']);
  }

  viewProviderProfile(provider: LandingProvider, index: number): void {
    this.dialog.open(ProviderProfileDialogComponent, {
      data: {
        provider,
        gradient: this.getProviderGradient(index),
      },
      width: '560px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      autoFocus: false,
      panelClass: 'landing-provider-dialog',
    });
  }

  openAllProviders(): void {
    this.dialog.open(ProvidersListDialogComponent, {
      data: { totalCount: this.totalProviders },
      width: '640px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      autoFocus: false,
      panelClass: 'landing-providers-list-dialog',
    });
  }

  viewEnterpriseProfile(ent: LandingEnterprise): void {
    this.dialog.open(EnterpriseProfileDialogComponent, {
      data: { enterprise: ent },
      width: '560px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      autoFocus: false,
      panelClass: 'landing-enterprise-dialog',
    });
  }

  assignToEnterprise(ent: LandingEnterprise): void {
    const user = this.authService.getCurrentUser();
    if (!user || (user.active_role || user.user_type) !== 'client') {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/' } });
      return;
    }
    this.dialog.open(AssignMissionDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
      data: {
        enterprise: ent,
        enterpriseName: this.getEnterpriseName(ent),
      },
    });
  }

  openAllEnterprises(): void {
    this.dialog.open(EnterprisesListDialogComponent, {
      data: { totalCount: this.totalEnterprises },
      width: '640px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      autoFocus: false,
      panelClass: 'landing-enterprises-list-dialog',
    });
  }

  goToMySpace(): void {
    this.authService.navigateAfterAuth();
  }

  logout(): void {
    this.authService.logout();
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled = window.scrollY > 20;
  }
}
