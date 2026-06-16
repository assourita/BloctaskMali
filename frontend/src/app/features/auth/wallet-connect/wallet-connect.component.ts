import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatStepperModule } from '@angular/material/stepper';

import { Web3Service, WalletInfo } from '../../../core/services/web3.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-wallet-connect',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatStepperModule
  ],
  template: `
    <div class="wallet-container">
      <mat-card class="wallet-card">
        <mat-card-header class="wallet-header">
          <div class="logo">
            <span class="logo-icon">⛓️</span>
            <span class="logo-text">BlockTask</span>
          </div>
          <p class="subtitle">Connexion avec Wallet</p>
        </mat-card-header>

        <mat-card-content>
          <!-- Étape 1: Vérification -->
          <div *ngIf="!wallet" class="step">
            <div class="wallet-icon">
              <mat-icon>account_balance_wallet</mat-icon>
            </div>
            <h2>Connectez votre wallet</h2>
            <p class="description">
              Connectez votre wallet MetaMask ou tout autre portefeuille Web3 pour accéder à BlockTask de manière sécurisée et décentralisée.
            </p>

            <div class="wallet-options">
              <button 
                mat-raised-button 
                class="metamask-btn"
                (click)="connectMetaMask()"
                [disabled]="isLoading"
              >
                <img src="assets/images/metamask.svg" alt="MetaMask" class="wallet-logo">
                <span>MetaMask</span>
              </button>

              <button 
                mat-stroked-button 
                class="wallet-btn"
                (click)="connectWalletConnect()"
                [disabled]="isLoading"
              >
                <mat-icon>qr_code_scanner</mat-icon>
                <span>WalletConnect</span>
              </button>
            </div>

            <div *ngIf="isLoading" class="loading-state">
              <mat-spinner diameter="40"></mat-spinner>
              <p>Connexion en cours...</p>
            </div>

            <div *ngIf="error" class="error-message">
              <mat-icon color="warn">error</mat-icon>
              <p>{{ error }}</p>
            </div>
          </div>

          <!-- Étape 2: Wallet connecté -->
          <div *ngIf="wallet && !isRegistered" class="step">
            <div class="success-icon">
              <mat-icon color="primary">check_circle</mat-icon>
            </div>
            <h2>Wallet connecté !</h2>
            
            <div class="wallet-details">
              <div class="detail-row">
                <span class="label">Adresse:</span>
                <span class="value address">{{ wallet.address }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Solde:</span>
                <span class="value">{{ wallet.balance | number:'1.4-4' }} ETH</span>
              </div>
              <div class="detail-row">
                <span class="label">Réseau:</span>
                <span class="value network">{{ getNetworkName(wallet.chainId) }}</span>
              </div>
            </div>

            <p class="info-text">
              Ce wallet n'est pas encore associé à un compte BlockTask. Veuillez créer un compte ou connectez-vous avec votre email.
            </p>

            <div class="actions">
              <button mat-button routerLink="/register">Créer un compte</button>
              <button mat-raised-button color="primary" routerLink="/login">
                J'ai déjà un compte
              </button>
            </div>
          </div>
        </mat-card-content>

        <mat-card-footer>
          <a routerLink="/login" class="back-link">
            <mat-icon>arrow_back</mat-icon>
            Retour à la connexion classique
          </a>
        </mat-card-footer>
      </mat-card>
    </div>
  `,
  styles: [`
    .wallet-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }

    .wallet-card {
      width: 100%;
      max-width: 460px;
      padding: 40px;
      border-radius: 16px;
      text-align: center;
    }

    .wallet-header {
      margin-bottom: 32px;
    }

    .logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 8px;
    }

    .logo-icon {
      font-size: 32px;
    }

    .logo-text {
      font-size: 28px;
      font-weight: 700;
      color: #1f2937;
    }

    .subtitle {
      color: #6b7280;
      font-size: 14px;
    }

    .step {
      padding: 20px 0;
    }

    .wallet-icon {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
    }

    .wallet-icon mat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: white;
    }

    h2 {
      font-size: 24px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 16px;
    }

    .description {
      color: #6b7280;
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 32px;
    }

    .wallet-options {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .metamask-btn {
      height: 56px;
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: white;
      font-size: 16px;
      font-weight: 500;
    }

    .wallet-logo {
      width: 24px;
      height: 24px;
      margin-right: 12px;
    }

    .wallet-btn {
      height: 56px;
      font-size: 16px;
    }

    .wallet-btn mat-icon {
      margin-right: 12px;
    }

    .loading-state {
      margin-top: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .loading-state p {
      color: #6b7280;
      font-size: 14px;
    }

    .error-message {
      margin-top: 24px;
      padding: 16px;
      background: #fee2e2;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 12px;
      color: #dc2626;
    }

    .success-icon {
      margin-bottom: 24px;
    }

    .success-icon mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
    }

    .wallet-details {
      background: #f9fafb;
      border-radius: 12px;
      padding: 20px;
      margin: 24px 0;
      text-align: left;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }

    .detail-row:last-child {
      border-bottom: none;
    }

    .label {
      color: #6b7280;
      font-size: 14px;
    }

    .value {
      font-weight: 500;
      color: #1f2937;
      font-size: 14px;
    }

    .value.address {
      font-family: monospace;
      font-size: 12px;
    }

    .network {
      color: #10b981;
    }

    .info-text {
      color: #6b7280;
      font-size: 14px;
      line-height: 1.6;
      margin: 24px 0;
    }

    .actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: #6b7280;
      text-decoration: none;
      font-size: 14px;
      margin-top: 24px;
      transition: color 0.2s;
    }

    .back-link:hover {
      color: #3b82f6;
    }

    mat-card-footer {
      padding-top: 24px;
    }
  `]
})
export class WalletConnectComponent implements OnInit {
  wallet: WalletInfo | null = null;
  isLoading = false;
  error: string | null = null;
  isRegistered = false;

  constructor(
    private web3Service: Web3Service,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.web3Service.wallet$.subscribe(wallet => {
      this.wallet = wallet;
      if (wallet) {
        this.checkRegistration();
      }
    });
  }

  async connectMetaMask(): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      await this.web3Service.connectWallet();
    } catch (err: any) {
      this.error = err.message || 'Erreur de connexion au wallet';
    } finally {
      this.isLoading = false;
    }
  }

  connectWalletConnect(): void {
    this.snackBar.open('WalletConnect bientôt disponible', 'Fermer', { duration: 3000 });
  }

  private checkRegistration(): void {
    // Vérifier si le wallet est déjà associé à un compte
    // Si oui, connecter automatiquement
    // Si non, afficher les options de création/connexion
    this.isRegistered = false;
  }

  getNetworkName(chainId: number): string {
    const networks: { [key: number]: string } = {
      1: 'Ethereum Mainnet',
      11155111: 'Sepolia Testnet',
      137: 'Polygon',
      80001: 'Mumbai Testnet'
    };
    return networks[chainId] || `Chain ${chainId}`;
  }
}
