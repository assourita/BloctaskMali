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
      <!-- Garden Grid Style Header -->
      <nav class="gg-navbar" [class.scrolled]="isScrolled">
        <div class="nav-container">
          <div class="logo" routerLink="/">
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
                    <span class="rating"><mat-icon class="inline-star">star</mat-icon> 4.8</span>
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
              <div class="mission-card-top">
                <span class="mission-category">
                  <mat-icon>{{ mission.category_icon || 'assignment' }}</mat-icon>
                  {{ mission.category_name || 'Mission' }}
                </span>
                <span class="mission-budget">{{ mission.budget | number:'1.0-0' }} {{ mission.currency }}</span>
              </div>
              <h3>{{ mission.title }}</h3>
              <p class="mission-location">
                <mat-icon>place</mat-icon>
                <span>{{ mission.pickup_address || 'Lieu à confirmer' }}</span>
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
              <div class="mission-card-footer">
                <button mat-flat-button color="primary" class="mission-btn" (click)="viewMission(mission)">
                  Voir la mission
                </button>
              </div>
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
                  <span class="stars"><mat-icon class="inline-star">star</mat-icon> {{ getProviderRating(tasker) }}</span>
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
      font-family: system-ui, -apple-system, sans-serif;
      color: #111827;
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
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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
      text-decoration: none;
      cursor: pointer;
    }

    .logo-text {
      font-size: 1.5rem;
      font-weight: 800;
      color: #111827;
    }

    .nav-center {
      display: flex;
      gap: 2rem;
    }

    .nav-center a {
      color: #6b7280;
      text-decoration: none;
      font-weight: 500;
      font-size: 0.875rem;
      transition: color 0.2s ease;
      position: relative;

      &::after {
        content: '';
        position: absolute;
        bottom: -0.25rem;
        left: 0;
        width: 0;
        height: 2px;
        background: linear-gradient(90deg, #16a34a, #0d9488);
        transition: width 0.3s ease;
      }

      &:hover {
        color: #111827;

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
      font-size: 0.875rem;
      font-weight: 600;
      border-radius: 0.5rem;
      color: #6b7280;
    }

    .nav-btn-primary {
      height: 2.5rem;
      padding: 0 1.5rem;
      font-size: 0.875rem;
      font-weight: 600;
      border-radius: 0.5rem;
      background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
      color: #ffffff;
      box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.3);

      &:hover {
        background: linear-gradient(135deg, #15803d 0%, #14532d 100%);
        box-shadow: 0 6px 8px -1px rgba(99, 102, 241, 0.4);
      }
    }

    /* Garden Grid Hero */
    .gg-hero {
      min-height: 100vh;
      padding: 8rem 5% 4rem;
      background: linear-gradient(135deg, #dcfce7 0%, #ecfdf5 50%, #bbf7d0 100%);
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
      font-size: 3rem;
      font-weight: 800;
      line-height: 1.1;
      letter-spacing: -0.02em;
      color: #111827;
      margin: 0;
    }

    .hero-title-line {
      display: block;
    }

    .hero-title-line--accent {
      background: linear-gradient(135deg, #16a34a 0%, #4ade80 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .hero-subtitle {
      font-size: 1.125rem;
      line-height: 1.625;
      color: #6b7280;
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
      font-size: 1.875rem;
      font-weight: 800;
      color: #15803d;
    }

    .hero-stat-label {
      font-size: 0.875rem;
      color: #9ca3af;
      font-weight: 500;
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: #ffffff;
      padding: 0.75rem 1rem;
      border-radius: 1rem;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      border: 2px solid #e5e7eb;
      transition: all 0.3s ease;

      &:focus-within {
        border-color: #16a34a;
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
      }
    }

    .search-icon {
      color: #9ca3af;
      font-size: 1.25rem;
    }

    .search-box input {
      flex: 1;
      border: none;
      outline: none;
      font-size: 1rem;
      color: #111827;
      background: transparent;
      font-family: system-ui, -apple-system, sans-serif;

      &::placeholder {
        color: #9ca3af;
      }
    }

    .search-btn {
      background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
      color: #ffffff;
      border: none;
      border-radius: 0.75rem;
      padding: 0.75rem 1.5rem;
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background: linear-gradient(135deg, #15803d 0%, #14532d 100%);
        box-shadow: 0 6px 8px -1px rgba(99, 102, 241, 0.4);
      }
    }

    .popular-searches {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      font-size: 0.875rem;

      > span {
        color: #9ca3af;
        font-weight: 500;
      }

      a {
        color: #15803d;
        text-decoration: none;
        font-weight: 500;
        padding: 0.375rem 0.875rem;
        background: #dcfce7;
        border-radius: 9999px;
        transition: all 0.2s ease;

        &:hover {
          background: #bbf7d0;
          color: #14532d;
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
      background: #ffffff;
      border-radius: 1.5rem;
      padding: 1.5rem;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      border: 1px solid #e5e7eb;
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
      margin-bottom: 1rem;
    }

    .badge {
      background: #dcfce7;
      color: #14532d;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .amount {
      font-size: 1.125rem;
      font-weight: 800;
      color: #16a34a;
    }

    .card-body h4 {
      font-size: 1.125rem;
      font-weight: 600;
      color: #111827;
      margin: 0 0 0.75rem;
    }

    .location {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #9ca3af;
      font-size: 0.875rem;
      margin-bottom: 1rem;

      mat-icon {
        font-size: 1rem;
        width: 1rem;
        height: 1rem;
      }
    }

    .progress {
      margin-top: 1rem;
    }

    .progress-bar {
      height: 0.5rem;
      background: #e5e7eb;
      border-radius: 9999px;
      overflow: hidden;
      margin-bottom: 0.5rem;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #16a34a, #4ade80);
      border-radius: 9999px;
      transition: width 0.3s ease;
    }

    .progress span {
      font-size: 0.75rem;
      color: #9ca3af;
      font-weight: 500;
    }

    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 1.25rem;
      padding-top: 1rem;
      border-top: 1px solid #e5e7eb;
    }

    .provider {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .avatar {
      width: 2.5rem;
      height: 2.5rem;
      background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
      border-radius: 9999px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-weight: 600;
      font-size: 0.875rem;
    }

    .info {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .name {
      font-weight: 600;
      font-size: 0.875rem;
      color: #111827;
    }

    .rating {
      font-size: 0.75rem;
      color: #9ca3af;
    }

    .escrow-badge {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      color: #16a34a;
      font-size: 0.75rem;
      font-weight: 600;

      mat-icon {
        font-size: 1rem;
        width: 1rem;
        height: 1rem;
      }
    }

    /* Services Section */
    .services-section {
      padding: 5rem 5%;
      background: #ffffff;
    }

    .section-container {
      max-width: 1400px;
      margin: 0 auto;
    }

    .services-section h2 {
      font-size: 2.25rem;
      font-weight: 800;
      text-align: center;
      margin-bottom: 2rem;
      color: #111827;
    }

    .loading-row {
      display: flex;
      justify-content: center;
      padding: 2rem;
    }

    .services-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.5rem;
    }

    .service-card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 1rem;
      padding: 1.5rem;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

      &:hover {
        transform: translateY(-0.25rem);
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        border-color: #16a34a;
      }
    }

    .service-icon {
      width: 3rem;
      height: 3rem;
      border-radius: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;

      mat-icon {
        font-size: 1.5rem;
        width: 1.5rem;
        height: 1.5rem;
        color: white;
      }
    }

    .service-card h3 {
      font-size: 1.125rem;
      font-weight: 600;
      color: #111827;
      margin: 0 0 0.5rem;
    }

    .service-card p {
      font-size: 0.875rem;
      color: #9ca3af;
      line-height: 1.625;
      margin: 0 0 0.75rem;
    }

    .task-count {
      font-size: 0.75rem;
      color: #15803d;
      font-weight: 600;
    }

    .empty-message {
      text-align: center;
      color: #9ca3af;
      font-size: 1rem;
      padding: 2rem;

      a {
        color: #15803d;
        text-decoration: none;
        font-weight: 600;
      }
    }

    .section-subtitle {
      text-align: center;
      color: #6b7280;
      font-size: 1rem;
      margin: 0 0 3rem;
    }

    /* Missions */
    .missions-section {
      padding: 5rem 5%;
      background: #ffffff;
    }

    .missions-section h2 {
      text-align: center;
      font-size: 2rem;
      font-weight: 800;
      color: #111827;
      margin: 0 0 0.5rem;
    }

    .missions-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.25rem;
      align-items: stretch;
    }

    .mission-card {
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: 1.35rem 1.35rem 1.15rem;
      border-radius: 1.15rem;
      border: 1px solid #e5e7eb;
      background: #fff;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
      transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
    }

    .mission-card:hover {
      border-color: #bbf7d0;
      box-shadow: 0 10px 28px rgba(22, 163, 74, 0.1);
      transform: translateY(-2px);
    }

    .mission-card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.75rem;
      margin-bottom: 0.85rem;
    }

    .mission-category {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      max-width: 62%;
      padding: 0.3rem 0.65rem;
      border-radius: 999px;
      background: #f3f4f6;
      font-size: 0.75rem;
      font-weight: 600;
      color: #4b5563;
      line-height: 1.2;

      mat-icon {
        font-size: 0.95rem;
        width: 0.95rem;
        height: 0.95rem;
        color: #6b7280;
      }
    }

    .mission-budget {
      flex-shrink: 0;
      font-weight: 800;
      color: #15803d;
      font-size: 0.95rem;
      letter-spacing: -0.01em;
      white-space: nowrap;
    }

    .mission-card h3 {
      font-size: 1.15rem;
      font-weight: 700;
      margin: 0 0 0.65rem;
      color: #111827;
      line-height: 1.35;
      min-height: 2.7em;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .mission-location {
      display: flex;
      align-items: flex-start;
      gap: 0.3rem;
      font-size: 0.875rem;
      color: #6b7280;
      margin: 0 0 0.85rem;
      min-height: 1.35rem;

      mat-icon {
        font-size: 1rem;
        width: 1rem;
        height: 1rem;
        flex-shrink: 0;
        margin-top: 1px;
        color: #9ca3af;
      }

      span {
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
    }

    .mission-meta {
      display: flex;
      gap: 0.85rem;
      font-size: 0.8125rem;
      color: #6b7280;
      margin-bottom: 1rem;
      flex-wrap: wrap;

      span {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
      }

      mat-icon {
        font-size: 0.9rem;
        width: 0.9rem;
        height: 0.9rem;
        color: #9ca3af;
      }
    }

    .mission-card-footer {
      margin-top: auto;
      padding-top: 0.25rem;
    }

    .mission-btn {
      width: 100%;
      font-weight: 700 !important;
      border-radius: 0.75rem !important;
      background: #16a34a !important;
      color: #fff !important;
    }

    /* Prestataires */
    .taskers-section {
      padding: 5rem 5%;
      background: #f9fafb;
    }

    .taskers-section h2 {
      text-align: center;
      font-size: 2rem;
      font-weight: 800;
      color: #111827;
      margin: 0 0 0.5rem;
    }

    .taskers-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.5rem;
    }

    .tasker-card {
      background: #ffffff;
      border-radius: 1rem;
      overflow: hidden;
      border: 1px solid #e5e7eb;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
      transition: transform 0.2s ease, box-shadow 0.2s ease;

      &:hover {
        transform: translateY(-4px);
        box-shadow: 0 10px 24px rgba(0, 0, 0, 0.1);
      }
    }

    .tasker-header {
      height: 5rem;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }

    .tasker-avatar,
    .tasker-photo {
      width: 4rem;
      height: 4rem;
      border-radius: 50%;
      transform: translateY(2rem);
      border: 3px solid #ffffff;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
    }

    .tasker-avatar {
      background: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      font-weight: 700;
      color: #15803d;
    }

    .tasker-photo {
      object-fit: cover;
    }

    .tasker-body {
      padding: 2.75rem 1.25rem 1.5rem;
      text-align: center;

      h4 {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.25rem;
        font-size: 1.125rem;
        font-weight: 600;
        color: #111827;
        margin: 0 0 0.5rem;
      }
    }

    .verified-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      color: #16a34a;
    }

    .tasker-rating {
      margin-bottom: 0.5rem;
    }

    .stars {
      color: #f59e0b;
      font-weight: 500;
    }

    .reviews {
      color: #6b7280;
      font-size: 0.875rem;
      margin-left: 0.25rem;
    }

    .tasker-skills {
      font-size: 0.875rem;
      color: #6b7280;
      margin: 0 0 0.5rem;
    }

    .tasker-city {
      font-size: 0.8125rem;
      color: #9ca3af;
      margin: 0 0 0.75rem;
    }

    .tasker-stats {
      margin-bottom: 1rem;
    }

    .missions {
      font-size: 0.875rem;
      color: #15803d;
      font-weight: 600;
    }

    .hire-btn {
      width: 100%;
      border-color: #16a34a !important;
      color: #15803d !important;
      font-weight: 600;
    }

    .section-actions {
      text-align: center;
      margin-top: 2rem;
    }

    .more-btn {
      background: #15803d !important;
      color: #ffffff !important;
      padding: 0.75rem 1.75rem !important;
      font-weight: 600;
    }

    /* Entreprises */
    .enterprises-section {
      padding: 5rem 5%;
      background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
      color: #ffffff;

      h2 {
        text-align: center;
        font-size: 2rem;
        font-weight: 800;
        margin: 0 0 0.5rem;
      }

      .section-subtitle {
        color: #94a3b8;
      }

      .empty-message {
        color: #94a3b8;

        a {
          color: #86efac;
        }
      }

      .section-actions {
        margin-bottom: 1.5rem;
      }
    }

    .enterprises-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.25rem;
      margin-bottom: 2rem;
    }

    .enterprise-card {
      display: flex;
      gap: 1rem;
      padding: 1.25rem;
      border-radius: 0.75rem;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #ffffff;
    }

    .enterprise-logo {
      width: 3.5rem;
      height: 3.5rem;
      border-radius: 0.75rem;
      background: rgba(99, 102, 241, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      overflow: hidden;

      mat-icon {
        color: #86efac;
        font-size: 1.75rem;
        width: 1.75rem;
        height: 1.75rem;
      }

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    .enterprise-body {
      flex: 1;
      min-width: 0;

      h3 {
        margin: 0 0 0.375rem;
        font-size: 1rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 0.25rem;
        color: #f8fafc;
      }
    }

    .enterprise-city {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.8125rem;
      color: #94a3b8;
      margin: 0 0 0.5rem;

      mat-icon {
        font-size: 0.875rem;
        width: 0.875rem;
        height: 0.875rem;
      }
    }

    .enterprise-stats {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      font-size: 0.75rem;
      color: #cbd5e1;
      margin-bottom: 0.5rem;

      span {
        display: flex;
        align-items: center;
        gap: 0.25rem;
      }

      mat-icon {
        font-size: 0.875rem;
        width: 0.875rem;
        height: 0.875rem;
        color: #4ade80;
      }
    }

    .enterprise-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-top: 0.75rem;
    }

    .ent-btn {
      flex: 1;
      min-width: 7.5rem;
      font-size: 0.8125rem !important;
      border-color: rgba(255, 255, 255, 0.35) !important;
      color: #f8fafc !important;

      &.primary {
        background: #15803d !important;
        color: #ffffff !important;
        border: none !important;
      }
    }

    .enterprise-more {
      background: #15803d !important;
      color: #ffffff !important;
    }

    .enterprise-cta {
      text-align: center;
      padding-top: 1rem;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .enterprise-benefits {
      display: flex;
      justify-content: center;
      gap: 2rem;
      flex-wrap: wrap;
      margin-bottom: 1.5rem;
    }

    .benefit {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: #cbd5e1;

      mat-icon {
        color: #4ade80;
      }
    }

    .enterprise-btn {
      background: #15803d !important;
      color: #ffffff !important;
      padding: 0.875rem 2rem !important;
      font-weight: 600;
    }

    /* Features */
    .features {
      padding: 5rem 5%;
      background: #ffffff;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .features h2 {
      text-align: center;
      font-size: 2rem;
      font-weight: 800;
      margin: 0 0 0.75rem;
    }

    .features-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2rem;
    }

    .feature-card {
      padding: 2rem;
      text-align: center;
      border-radius: 1rem;
      border: 1px solid #e5e7eb;
    }

    .feature-icon {
      width: 4rem;
      height: 4rem;
      background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%);
      border-radius: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.5rem;

      mat-icon {
        font-size: 2rem;
        width: 2rem;
        height: 2rem;
        color: #ffffff;
      }
    }

    .feature-card h3 {
      font-size: 1.25rem;
      font-weight: 600;
      margin: 0 0 0.75rem;
    }

    .feature-card p {
      color: #6b7280;
      line-height: 1.6;
      margin: 0;
    }

    /* Comment ça marche */
    .how-it-works {
      padding: 5rem 5%;
      background: #f8fafc;

      h2 {
        text-align: center;
        font-size: 2rem;
        font-weight: 800;
        margin: 0 0 0.5rem;
        color: #0f172a;
      }

      .section-subtitle {
        margin-bottom: 2rem;
      }
    }

    .flow-tabs {
      display: flex;
      justify-content: center;
      gap: 0.5rem;
      margin-bottom: 2.5rem;
      flex-wrap: wrap;
    }

    .flow-tab {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1.25rem;
      border: 2px solid #e2e8f0;
      border-radius: 9999px;
      background: #ffffff;
      color: #64748b;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: inherit;

      mat-icon {
        font-size: 1.125rem;
        width: 1.125rem;
        height: 1.125rem;
      }

      &:hover {
        border-color: #16a34a;
        color: #15803d;
      }

      &.active {
        background: #15803d;
        border-color: #15803d;
        color: #ffffff;
      }
    }

    .steps {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.25rem;
      max-width: 1100px;
      margin: 0 auto;
    }

    .step-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      padding: 1.5rem 1.25rem;
      text-align: center;
      transition: transform 0.2s, box-shadow 0.2s;

      &:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 24px rgba(79, 70, 229, 0.12);
        border-color: #bbf7d0;
      }

      h3 {
        font-size: 1rem;
        font-weight: 600;
        margin: 0 0 0.5rem;
        color: #0f172a;
      }

      p {
        font-size: 0.8125rem;
        color: #64748b;
        line-height: 1.55;
        margin: 0;
      }
    }

    .step-icon-wrap {
      position: relative;
      width: 3.5rem;
      height: 3.5rem;
      margin: 0 auto 1rem;
      background: linear-gradient(135deg, #ecfdf5 0%, #dcfce7 100%);
      border-radius: 0.875rem;
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        font-size: 1.75rem;
        width: 1.75rem;
        height: 1.75rem;
        color: #15803d;
      }
    }

    .step-num {
      position: absolute;
      top: -0.375rem;
      right: -0.375rem;
      width: 1.375rem;
      height: 1.375rem;
      background: #15803d;
      color: #ffffff;
      border-radius: 50%;
      font-size: 0.6875rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #ffffff;
    }

    .how-cta {
      text-align: center;
      margin-top: 2.25rem;
    }

    .how-cta-btn {
      background: #15803d !important;
      color: #ffffff !important;
      padding: 0.75rem 1.75rem !important;
      font-weight: 600 !important;
      border-radius: 0.75rem !important;

      mat-icon {
        margin-right: 0.5rem;
      }
    }

    /* CTA */
    .cta-section {
      padding: 5rem 5%;
      background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
      color: #ffffff;
      text-align: center;

      h2 {
        font-size: 2rem;
        font-weight: 800;
        margin: 0 0 1rem;
      }

      p {
        font-size: 1.125rem;
        color: rgba(255, 255, 255, 0.8);
        margin: 0 0 2.5rem;
      }
    }

    .cta-large {
      height: 4rem;
      padding: 0 3rem;
      font-size: 1.125rem;
      background: #16a34a !important;
      color: #ffffff !important;
    }

    /* Footer */
    .footer {
      padding: 4rem 5% 2rem;
      background: #ffffff;
      border-top: 1px solid #e5e7eb;
    }

    .footer-grid {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr;
      gap: 4rem;
      margin-bottom: 3rem;
    }

    .footer-brand {
      .logo-text {
        color: #111827;
      }

      p {
        color: #6b7280;
        margin-top: 1rem;
        line-height: 1.6;
      }
    }

    .footer-links {
      h4 {
        font-size: 0.875rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin: 0 0 1rem;
        color: #111827;
      }

      a {
        display: block;
        color: #6b7280;
        text-decoration: none;
        padding: 0.5rem 0;
        transition: color 0.2s;

        &:hover {
          color: #15803d;
        }
      }
    }

    .footer-bottom {
      text-align: center;
      padding-top: 2rem;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 0.875rem;

      p {
        margin: 0;
      }
    }

    @media (max-width: 1024px) {
      .missions-grid,
      .taskers-grid,
      .enterprises-grid,
      .features-grid,
      .steps {
        grid-template-columns: repeat(2, 1fr);
      }

      .footer-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 2rem;
      }
    }

    @media (max-width: 640px) {
      .nav-center {
        display: none;
      }

      .gg-hero {
        padding: 5.5rem 1rem 2.5rem;
      }

      .hero-container {
        grid-template-columns: 1fr;
        gap: 1.5rem;
      }

      .hero-visual {
        order: -1;
        max-width: 100%;
      }

      .hero-title {
        font-size: clamp(1.75rem, 8vw, 2.25rem);
      }

      .hero-subtitle {
        font-size: 0.95rem;
      }

      .hero-stats {
        flex-wrap: wrap;
        gap: 0.75rem;
      }

      .missions-grid,
      .taskers-grid,
      .enterprises-grid,
      .features-grid,
      .steps {
        grid-template-columns: 1fr;
      }

      .footer-grid {
        grid-template-columns: 1fr;
        gap: 2rem;
      }

      .enterprise-benefits {
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
      }

      .inline-star {
        font-size: 14px !important;
        width: 14px !important;
        height: 14px !important;
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
