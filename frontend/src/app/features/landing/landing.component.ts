import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Observable } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import type { User } from '../../core/services/auth.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule
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
            <a href="#taskers">Prestataires</a>
            <a href="#how-it-works">Comment ça marche</a>
          </div>
          <div class="nav-actions" *ngIf="currentUser$ | async as user; else guestActions">
            <button mat-button [routerLink]="['/', user.user_type, 'dashboard']" class="nav-btn">
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
          <p class="hero-subtitle">Des milliers de prestataires de confiance pour vos missions quotidiennes</p>
          
          <!-- Search Bar -->
          <div class="search-box">
            <mat-icon class="search-icon">search</mat-icon>
            <input type="text" placeholder="De quoi avez-vous besoin ? (Livraison, déménagement, réparation...)" />
            <button mat-raised-button class="search-btn">Rechercher</button>
          </div>
          
          <!-- Popular Searches -->
      <div class="popular-searches">
            <span>Populaire :</span>
            <a href="#">Livraison colis</a>
            <a href="#">Déménagement</a>
            <a href="#">Courses</a>
            <a href="#">Réparation</a>
          </div>
        </div>
      </section>

      <!-- Service Categories - Grid Style TaskRabbit -->
      <section id="services" class="services-section">
        <div class="section-container">
          <h2>Explorez nos services</h2>
          <div class="services-grid">
            <div class="service-card" *ngFor="let service of services">
              <div class="service-icon" [style.background]="service.color">
                <mat-icon>{{service.icon}}</mat-icon>
              </div>
              <h3>{{service.name}}</h3>
              <p>{{service.description}}</p>
              <span class="task-count">{{service.count}} prestataires</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Featured Taskers -->
      <section id="taskers" class="taskers-section">
        <div class="section-container">
          <h2>Nos meilleurs prestataires</h2>
          <p class="section-subtitle">Évalués et vérifiés par la communauté</p>
          <div class="taskers-grid">
            <div class="tasker-card" *ngFor="let tasker of featuredTaskers">
              <div class="tasker-header" [style.background]="tasker.bgColor">
                <div class="tasker-avatar">{{tasker.name[0]}}</div>
              </div>
              <div class="tasker-body">
                <h4>{{tasker.name}}</h4>
                <div class="tasker-rating">
                  <span class="stars">⭐ {{tasker.rating}}</span>
                  <span class="reviews">({{tasker.reviews}} avis)</span>
                </div>
                <p class="tasker-skills">{{tasker.skills}}</p>
                <div class="tasker-stats">
                  <span class="missions">{{tasker.missions}} missions réalisées</span>
                </div>
                <button mat-stroked-button class="hire-btn">Voir le profil</button>
              </div>
            </div>
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
          <div class="steps">
            <div class="step">
              <div class="step-number">1</div>
              <h3>Publiez votre mission</h3>
              <p>Décrivez votre besoin, définissez le budget et la deadline. Options avancées : multi-étapes, preuves requises, dépôt de garantie.</p>
            </div>
            <div class="step-arrow">
              <mat-icon>arrow_forward</mat-icon>
            </div>
            <div class="step">
              <div class="step-number">2</div>
              <h3>Choisissez un prestataire</h3>
              <p>Comparez les profils, les scores de réputation et les historiques. Acceptez manuellement ou laissez l'auto-assignation choisir.</p>
            </div>
            <div class="step-arrow">
              <mat-icon>arrow_forward</mat-icon>
            </div>
            <div class="step">
              <div class="step-number">3</div>
              <h3>Suivi et validation</h3>
              <p>Suivez en temps réel sur la carte. Le prestataire soumet des preuves. Vous validez et le paiement est libéré automatiquement.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- CTA Section -->
      <section class="cta-section">
        <div class="container">
          <h2>Prêt à révolutionner votre productivité ?</h2>
          <p>Rejoignez des milliers d'utilisateurs qui font confiance à BlockTask pour leurs missions quotidiennes.</p>
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
              <a href="#">Fonctionnalités</a>
              <a href="#">Tarifs</a>
              <a href="#">API</a>
            </div>
            <div class="footer-links">
              <h4>Ressources</h4>
              <a href="#">Documentation</a>
              <a href="#">Blog</a>
              <a href="#">Support</a>
            </div>
            <div class="footer-links">
              <h4>Légal</h4>
              <a href="#">CGU</a>
              <a href="#">Confidentialité</a>
              <a href="#">Cookies</a>
            </div>
          </div>
          <div class="footer-bottom">
            <p>&copy; 2026 BlockTask. Tous droits réservés. Créé par Master MrMaiga.</p>
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
      padding: 100px 5%;
      background: #f9fafb;
    }

    .how-it-works h2 {
      text-align: center;
      font-size: 40px;
      font-weight: 700;
      margin-bottom: 64px;
    }

    .steps {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      gap: 32px;
    }

    .step {
      flex: 1;
      max-width: 300px;
      text-align: center;
    }

    .step-number {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: 700;
      margin: 0 auto 24px;
    }

    .step h3 {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 12px;
    }

    .step p {
      color: #6b7280;
      line-height: 1.6;
    }

    .step-arrow {
      color: #d1d5db;
      margin-top: 12px;
    }

    .step-arrow mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
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
        flex-direction: column;
        align-items: center;
      }

      .step-arrow {
        transform: rotate(90deg);
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
      margin-bottom: 40px;
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

    /* Responsive */
    @media (max-width: 1024px) {
      .services-grid, .taskers-grid {
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

      .services-grid, .taskers-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class LandingComponent implements OnInit {
  currentUser$: Observable<User | null>;

  constructor(private authService: AuthService) {
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit(): void {}

  logout(): void {
    this.authService.logout();
  }

  // Service categories data
  services = [
    { name: 'Livraison', description: 'Colis, documents, courses', icon: 'local_shipping', color: '#3CB371', count: 245 },
    { name: 'Déménagement', description: 'Transport, montage meubles', icon: 'moving', color: '#4ECDC4', count: 128 },
    { name: 'Réparation', description: 'Électronique, électroménager', icon: 'build', color: '#FF6B6B', count: 189 },
    { name: 'Courses', description: 'Supermarché, marché, pharmacie', icon: 'shopping_cart', color: '#FFE66D', count: 312 },
    { name: 'Ménage', description: 'Nettoyage, repassage, jardinage', icon: 'cleaning_services', color: '#A8E6CF', count: 156 },
    { name: 'Bricolage', description: 'Peinture, plomberie, électricité', icon: 'handyman', color: '#FFD93D', count: 98 },
    { name: 'Informatique', description: 'Dépannage PC, installation', icon: 'computer', color: '#6C5CE7', count: 87 },
    { name: 'Événements', description: 'Service, animation, décoration', icon: 'celebration', color: '#FD79A8', count: 64 }
  ];

  // Featured taskers data - no price shown (client sets price)
  featuredTaskers = [
    { name: 'Amadou D.', rating: 4.9, reviews: 127, skills: 'Livraison express, Courses', missions: 234, bgColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { name: 'Fatima K.', rating: 5.0, reviews: 89, skills: 'Ménage, Repassage', missions: 156, bgColor: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
    { name: 'Koffi M.', rating: 4.8, reviews: 203, skills: 'Déménagement, Bricolage', missions: 312, bgColor: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
    { name: 'Aminata B.', rating: 4.9, reviews: 156, skills: 'Réparation, Informatique', missions: 198, bgColor: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }
  ];

  isScrolled = false;

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled = window.scrollY > 20;
  }
}
