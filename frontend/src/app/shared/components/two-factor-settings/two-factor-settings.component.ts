import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-two-factor-settings',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatButtonModule, MatIconModule,
    MatSnackBarModule, MatFormFieldModule, MatInputModule,
  ],
  template: `
    <div class="twofa-card">
      <h3><mat-icon>security</mat-icon> Authentification à deux facteurs (2FA)</h3>
      <p *ngIf="!enabled">Protégez votre compte avec Google Authenticator ou une app TOTP.</p>
      <p *ngIf="enabled" class="enabled">2FA activée sur ce compte.</p>

      <div *ngIf="setupQr" class="setup-box">
        <img [src]="setupQr" alt="QR Code 2FA" class="qr" />
        <p class="hint">Scannez le QR code, puis entrez le code à 6 chiffres.</p>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Code de vérification</mat-label>
          <input matInput [(ngModel)]="confirmCode" maxlength="6" inputmode="numeric" />
        </mat-form-field>
        <button mat-raised-button color="primary" (click)="confirmSetup()" [disabled]="loading || confirmCode.length < 6">
          Activer la 2FA
        </button>
      </div>

      <div class="actions" *ngIf="!setupQr">
        <button mat-raised-button color="primary" *ngIf="!enabled" (click)="startSetup()" [disabled]="loading">
          Configurer la 2FA
        </button>
        <ng-container *ngIf="enabled">
          <mat-form-field appearance="outline" class="full">
            <mat-label>Code 2FA pour désactiver</mat-label>
            <input matInput [(ngModel)]="disableCode" maxlength="6" inputmode="numeric" />
          </mat-form-field>
          <button mat-stroked-button color="warn" (click)="disable()" [disabled]="loading || disableCode.length < 6">
            Désactiver la 2FA
          </button>
        </ng-container>
      </div>
    </div>
  `,
  styles: [`
    .twofa-card {
      padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background: #fafafa;
      h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 8px; font-size: 16px; }
      p { margin: 0 0 16px; color: #6b7280; font-size: 14px; }
      .enabled { color: #047857; font-weight: 600; }
      .setup-box { text-align: center; }
      .qr { width: 180px; height: 180px; margin: 0 auto 12px; display: block; }
      .hint { font-size: 13px; color: #6b7280; }
      .full { width: 100%; margin-bottom: 12px; }
      .actions { display: flex; flex-direction: column; gap: 12px; max-width: 320px; }
    }
  `],
})
export class TwoFactorSettingsComponent implements OnInit {
  private apiUrl = environment.apiUrl;
  enabled = false;
  loading = false;
  setupQr: string | null = null;
  confirmCode = '';
  disableCode = '';

  constructor(private http: HttpClient, private snack: MatSnackBar) {}

  ngOnInit(): void {
    this.loadStatus();
  }

  private h(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });
  }

  loadStatus(): void {
    this.http.get<{ enabled: boolean }>(`${this.apiUrl}/users/2fa/status/`, { headers: this.h() }).subscribe({
      next: (r) => { this.enabled = r.enabled; },
    });
  }

  startSetup(): void {
    this.loading = true;
    this.http.post<{ qr_code: string }>(`${this.apiUrl}/users/2fa/setup/`, {}, { headers: this.h() }).subscribe({
      next: (r) => {
        this.setupQr = r.qr_code;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snack.open('Erreur configuration 2FA', 'Fermer', { duration: 3000 });
      },
    });
  }

  confirmSetup(): void {
    this.loading = true;
    this.http.post(`${this.apiUrl}/users/2fa/confirm/`, { code: this.confirmCode }, { headers: this.h() }).subscribe({
      next: () => {
        this.enabled = true;
        this.setupQr = null;
        this.confirmCode = '';
        this.loading = false;
        this.snack.open('2FA activée', 'Fermer', { duration: 3000 });
      },
      error: () => {
        this.loading = false;
        this.snack.open('Code invalide', 'Fermer', { duration: 3000 });
      },
    });
  }

  disable(): void {
    this.loading = true;
    this.http.post(`${this.apiUrl}/users/2fa/disable/`, { code: this.disableCode }, { headers: this.h() }).subscribe({
      next: () => {
        this.enabled = false;
        this.disableCode = '';
        this.loading = false;
        this.snack.open('2FA désactivée', 'Fermer', { duration: 3000 });
      },
      error: () => {
        this.loading = false;
        this.snack.open('Code invalide', 'Fermer', { duration: 3000 });
      },
    });
  }
}
