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
import { colors } from '../../core/design-system';

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
      <!-- Garden Grid Style Header -->
      <nav class="gg-navbar" [class.scrolled]="isScrolled">
        <div class="nav-container">
          <div class="logo" routerLink="/">
            <span class="logo-icon">🌿</span>
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

      <!-- Hero Section - Garden Grid Style -->
      <section class="gg-hero">
        <div class="hero-container">
          <div class="hero-content">
            <h1 class="hero-title">
              <span class="hero-title-line">Tout faire,</span>
              <span class="hero-title-line hero-title-line--accent">sans bouger</span>
            </h1>
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

          <!-- Hero Visual -->
          <div class="hero-visual">
            <div class="hero-card">
              <div class="card-header">
                <span class="badge">Mission en cours</span>
                <span class="amount">25 000 XOF</span>
              </div>
              <div class="card-body">
                <h4>Livraison colis urgent</h4>
                <div class="location">
                  <mat-icon>place</mat-icon>
                  Cocody → Plateau
                </div>
                <div class="progress">
                  <div class="progress-bar">
                    <div class="progress-fill" style="width: 65%"></div>
                  </div>
                  <span>65% complété</span>
                </div>
              </div>
              <div class="card-footer">
                <div class="provider">
                  <div class="avatar">KM</div>
                  <div class="info">
                    <span class="name">Koumadi M.</span>
                    <span class="rating">⭐ 4.8</span>
                  </div>
                </div>
                <div class="escrow-badge">
                  <mat-icon>shield</mat-icon>
                  Escrow actif
                </div>
              </div>
            </div>
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
    @import '../../core/design-system';

    .landing-container {
      font-family: typography.$font-family-sans;
      color: colors.$text-primary;
    }

    /* Garden Grid Navbar */
    .gg-navbar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1000;
      padding: 1.5rem 5%;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      background: transparent;

      &.scrolled {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        box-shadow: shadows.$sm;
        padding: 1rem 5%;
      }
    }

    .nav-container {
      max-width: 1400px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      text-decoration: none;
      cursor: pointer;
    }

    .logo-icon {
      font-size: 2rem;
    }

    .logo-text {
      font-size: 1.5rem;
      font-weight: typography.$font-weight-extrabold;
      color: colors.$text-primary;
    }

    .nav-center {
      display: flex;
      gap: 2rem;
    }

    .nav-center a {
      color: colors.$text-secondary;
      text-decoration: none;
      font-weight: typography.$font-weight-medium;
      font-size: typography.$font-size-sm;
      transition: color 0.2s ease;
      position: relative;

      &::after {
        content: '';
        position: absolute;
        bottom: -0.25rem;
        left: 0;
        width: 0;
        height: 2px;
        background: linear-gradient(90deg, colors.$primary-500, colors.$secondary-500);
        transition: width 0.3s ease;
      }

      &:hover {
        color: colors.$text-primary;

        &::after {
          width: 100%;
        }
      }
    }

    .nav-actions {
      display: flex;
      gap: 0.75rem;
    }

    .nav-btn {
      height: 2.5rem;
      padding: 0 1.25rem;
      font-size: typography.$font-size-sm;
      font-weight: typography.$font-weight-semibold;
      border-radius: componentRadius.$button;
      color: colors.$text-secondary;
    }

    .nav-btn-primary {
      height: 2.5rem;
      padding: 0 1.5rem;
      font-size: typography.$font-size-sm;
      font-weight: typography.$font-weight-semibold;
      border-radius: componentRadius.$button;
      background: linear-gradient(135deg, colors.$primary-500 0%, colors.$primary-600 100%);
      color: colors.$text-inverse;
      box-shadow: shadows.$primary-base;

      &:hover {
        background: linear-gradient(135deg, colors.$primary-600 0%, colors.$primary-700 100%);
        box-shadow: shadows.$primary-md;
      }
    }

    /* Garden Grid Hero */
    .gg-hero {
      min-height: 100vh;
      padding: 8rem 5% 4rem;
      background: linear-gradient(135deg, colors.$primary-50 0%, colors.$secondary-50 50%, colors.$primary-100 100%);
      position: relative;
      overflow: hidden;

      &::before {
        content: '';
        position: absolute;
        top: -50%;
        right: -20%;
        width: 80%;
        height: 200%;
        background: radial-gradient(circle, rgba(34, 197, 94, 0.1) 0%, transparent 70%);
        animation: float 20s ease-in-out infinite;
      }

      &::after {
        content: '';
        position: absolute;
        bottom: -50%;
        left: -20%;
        width: 80%;
        height: 200%;
        background: radial-gradient(circle, rgba(168, 85, 247, 0.1) 0%, transparent 70%);
        animation: float 25s ease-in-out infinite reverse;
      }
    }

    @keyframes float {
      0%, 100% { transform: translate(0, 0) rotate(0deg); }
      50% { transform: translate(50px, 50px) rotate(5deg); }
    }

    .hero-container {
      max-width: 1400px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4rem;
      align-items: center;
      position: relative;
      z-index: 1;
    }

    .hero-content {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .hero-title {
      font-size: typography.$font-size-5xl;
      font-weight: typography.$font-weight-extrabold;
      line-height: 1.1;
      letter-spacing: -0.02em;
      color: colors.$text-primary;
      margin: 0;
    }

    .hero-title-line {
      display: block;
    }

    .hero-title-line--accent {
      background: linear-gradient(135deg, colors.$primary-500 0%, colors.$secondary-500 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .hero-subtitle {
      font-size: typography.$font-size-lg;
      line-height: typography.$line-height-relaxed;
      color: colors.$text-secondary;
      margin: 0;
    }

    .hero-stats {
      display: flex;
      gap: 3rem;
    }

    .hero-stat {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .hero-stat-value {
      font-size: typography.$font-size-3xl;
      font-weight: typography.$font-weight-extrabold;
      color: colors.$primary-600;
    }

    .hero-stat-label {
      font-size: typography.$font-size-sm;
      color: colors.$text-tertiary;
      font-weight: typography.$font-weight-medium;
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: colors.$background-primary;
      padding: 0.75rem 1rem;
      border-radius: componentRadius.$xl;
      box-shadow: shadows.$lg;
      border: 2px solid colors.$border-primary;
      transition: all 0.3s ease;

      &:focus-within {
        border-color: colors.$border-focus;
        box-shadow: shadows.$glow.secondary;
      }
    }

    .search-icon {
      color: colors.$text-tertiary;
      font-size: 1.25rem;
    }

    .search-box input {
      flex: 1;
      border: none;
      outline: none;
      font-size: typography.$font-size-base;
      color: colors.$text-primary;
      background: transparent;
      font-family: typography.$font-family-sans;

      &::placeholder {
        color: colors.$text-tertiary;
      }
    }

    .search-btn {
      background: linear-gradient(135deg, colors.$primary-500 0%, colors.$primary-600 100%);
      color: colors.$text-inverse;
      border: none;
      border-radius: componentRadius.$lg;
      padding: 0.75rem 1.5rem;
      font-weight: typography.$font-weight-semibold;
      font-size: typography.$font-size-sm;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background: linear-gradient(135deg, colors.$primary-600 0%, colors.$primary-700 100%);
        box-shadow: shadows.$primary-md;
      }
    }

    .popular-searches {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      font-size: typography.$font-size-sm;

      > span {
        color: colors.$text-tertiary;
        font-weight: typography.$font-weight-medium;
      }

      a {
        color: colors.$primary-600;
        text-decoration: none;
        font-weight: typography.$font-weight-medium;
        padding: 0.375rem 0.875rem;
        background: colors.$primary-50;
        border-radius: componentRadius.$full;
        transition: all 0.2s ease;

        &:hover {
          background: colors.$primary-100;
          color: colors.$primary-700;
        }
      }
    }

    /* Hero Visual */
    .hero-visual {
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .hero-card {
      background: colors.$background-primary;
      border-radius: radius.$2xl;
      padding: spacing.$6;
      width: 100%;
      max-width: 400px;
      box-shadow: shadows.$xl;
      border: 1px solid colors.$border-primary;
      animation: slideUp 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(2rem);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: spacing.$4;
    }

    .badge {
      background: colors.$primary-100;
      color: colors.$primary-700;
      padding: 0.25rem 0.75rem;
      border-radius: componentRadius.$full;
      font-size: typography.$font-size-xs;
      font-weight: typography.$font-weight-semibold;
    }

    .amount {
      font-size: typography.$font-size-lg;
      font-weight: typography.$font-weight-extrabold;
      color: colors.$success-600;
    }

    .card-body h4 {
      font-size: typography.$font-size-lg;
      font-weight: typography.$font-weight-semibold;
      color: colors.$text-primary;
      margin: 0 0 spacing.$3;
    }

    .location {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: colors.$text-tertiary;
      font-size: typography.$font-size-sm;
      margin-bottom: spacing.$4;

      mat-icon {
        font-size: 1rem;
        width: 1rem;
        height: 1rem;
      }
    }

    .progress {
      margin-top: spacing.$4;
    }

    .progress-bar {
      height: 0.5rem;
      background: colors.$border-primary;
      border-radius: componentRadius.$full;
      overflow: hidden;
      margin-bottom: 0.5rem;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, colors.$primary-500, colors.$secondary-500);
      border-radius: componentRadius.$full;
      transition: width 0.3s ease;
    }

    .progress span {
      font-size: typography.$font-size-xs;
      color: colors.$text-tertiary;
      font-weight: typography.$font-weight-medium;
    }

    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: spacing.$5;
      padding-top: spacing.$4;
      border-top: 1px solid colors.$border-primary;
    }

    .provider {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .avatar {
      width: 2.5rem;
      height: 2.5rem;
      background: linear-gradient(135deg, colors.$secondary-400 0%, colors.$secondary-600 100%);
      border-radius: componentRadius.$full;
      display: flex;
      align-items: center;
      justify-content: center;
      color: colors.$text-inverse;
      font-weight: typography.$font-weight-semibold;
      font-size: typography.$font-size-sm;
    }

    .info {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .name {
      font-weight: typography.$font-weight-semibold;
      font-size: typography.$font-size-sm;
      color: colors.$text-primary;
    }

    .rating {
      font-size: typography.$font-size-xs;
      color: colors.$text-tertiary;
    }

    .escrow-badge {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      color: colors.$success-600;
      font-size: typography.$font-size-xs;
      font-weight: typography.$font-weight-semibold;

      mat-icon {
        font-size: 1rem;
        width: 1rem;
        height: 1rem;
      }
    }

    /* Services Section */
    .services-section {
      padding: spacing.$20 5%;
      background: colors.$background-primary;
    }

    .section-container {
      max-width: 1400px;
      margin: 0 auto;
    }

    .services-section h2 {
      font-size: typography.$font-size-4xl;
      font-weight: typography.$font-weight-extrabold;
      text-align: center;
      margin-bottom: spacing.$8;
      color: colors.$text-primary;
    }

    .loading-row {
      display: flex;
      justify-content: center;
      padding: spacing.$8;
    }

    .services-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: spacing.$6;
    }

    .service-card {
      background: colors.$background-secondary;
      border: 1px solid colors.$border-primary;
      border-radius: radius.$xl;
      padding: spacing.$6;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

      &:hover {
        transform: translateY(-0.25rem);
        box-shadow: shadows.$lg;
        border-color: colors.$border-focus;
      }
    }

    .service-icon {
      width: 3rem;
      height: 3rem;
      border-radius: radius.$lg;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: spacing.$4;

      mat-icon {
        font-size: 1.5rem;
        width: 1.5rem;
        height: 1.5rem;
        color: white;
      }
    }

    .service-card h3 {
      font-size: typography.$font-size-lg;
      font-weight: typography.$font-weight-semibold;
      color: colors.$text-primary;
      margin: 0 0 spacing.$2;
    }

    .service-card p {
      font-size: typography.$font-size-sm;
      color: colors.$text-tertiary;
      line-height: typography.$line-height-relaxed;
      margin: 0 0 spacing.$3;
    }

    .task-count {
      font-size: typography.$font-size-xs;
      color: colors.$primary-600;
      font-weight: typography.$font-weight-semibold;
    }

    .empty-message {
      text-align: center;
      color: colors.$text-tertiary;
      font-size: typography.$font-size-base;
      padding: spacing.$8;

      a {
        color: colors.$primary-600;
        text-decoration: none;
        font-weight: typography.$font-weight-semibold;
      }
    }
  `]
})
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
