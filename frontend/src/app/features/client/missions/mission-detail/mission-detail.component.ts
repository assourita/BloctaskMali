import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { environment } from '../../../../../environments/environment';

interface Mission {
  id: string;
  title: string;
  description: string;
  status: string;
  budget: number;
  currency: string;
  deposit_amount: number;
  pickup_address: string;
  delivery_address: string;
  pickup_contact_name: string;
  pickup_contact_phone: string;
  delivery_contact_name: string;
  delivery_contact_phone: string;
  deadline: string;
  created_at: string;
  category?: { id: string; name: string; icon: string };
  provider?: { id: string; first_name: string; last_name: string; phone_number: string; profile_picture?: string };
  requires_vehicle: boolean;
  requires_photo: boolean;
  requires_signature: boolean;
  special_instructions: string;
}

@Component({
  selector: 'app-mission-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, MatCardModule, MatButtonModule, MatIconModule, MatChipsModule, MatProgressBarModule, MatSnackBarModule],
  template: `
    <div class="container">
      <div class="header">
        <button mat-button (click)="goBack()"><mat-icon>arrow_back</mat-icon>Retour</button>
        <div class="badge" [class]="'status-' + mission?.status">
          <mat-icon>{{ getStatusIcon(mission?.status) }}</mat-icon>
          {{ getStatusLabel(mission?.status) }}
        </div>
      </div>
      <mat-progress-bar mode="indeterminate" *ngIf="loading"></mat-progress-bar>
      <div class="content" *ngIf="!loading && mission">
        <mat-card class="main-card">
          <mat-card-header>
            <mat-card-title>{{ mission.title }}</mat-card-title>
            <mat-card-subtitle>{{ mission.category?.name }}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <p class="desc">{{ mission.description }}</p>
            <div class="section">
              <h4><mat-icon>attach_money</mat-icon>Financier</h4>
              <div class="grid">
                <div class="item"><span class="label">Budget</span><span class="value">{{ mission.budget | number }} {{ mission.currency }}</span></div>
                <div class="item"><span class="label">Caution</span><span class="value">{{ mission.deposit_amount | number }} {{ mission.currency }}</span></div>
              </div>
            </div>
            <div class="section">
              <h4><mat-icon>location_on</mat-icon>Itineraire</h4>
              <div class="route">
                <div class="point"><mat-icon class="pickup">trip_origin</mat-icon><div><strong>Retrait</strong><p>{{ mission.pickup_address }}</p><small *ngIf="mission.pickup_contact_name">Contact: {{ mission.pickup_contact_name }}</small></div></div>
                <div class="line"></div>
                <div class="point"><mat-icon class="delivery">place</mat-icon><div><strong>Livraison</strong><p>{{ mission.delivery_address }}</p><small *ngIf="mission.delivery_contact_name">Contact: {{ mission.delivery_contact_name }}</small></div></div>
              </div>
            </div>
            <div class="section" *ngIf="mission.special_instructions">
              <h4><mat-icon>info</mat-icon>Instructions</h4>
              <p class="instructions">{{ mission.special_instructions }}</p>
            </div>
            <div class="reqs" *ngIf="mission.requires_vehicle || mission.requires_photo || mission.requires_signature">
              <h4>Exigences</h4>
              <mat-chip-set>
                <mat-chip *ngIf="mission.requires_vehicle"><mat-icon>local_shipping</mat-icon>Vehicule</mat-chip>
                <mat-chip *ngIf="mission.requires_photo"><mat-icon>photo_camera</mat-icon>Photo</mat-chip>
                <mat-chip *ngIf="mission.requires_signature"><mat-icon>draw</mat-icon>Signature</mat-chip>
              </mat-chip-set>
            </div>
          </mat-card-content>
          <mat-card-actions align="end" *ngIf="mission.status !== 'completed' && mission.status !== 'cancelled'">
            <button mat-button color="warn" (click)="cancelMission()" *ngIf="canCancel()"><mat-icon>cancel</mat-icon>Annuler</button>
            <button mat-raised-button color="primary" (click)="validateMission()" *ngIf="mission.status === 'submitted'"><mat-icon>check_circle</mat-icon>Valider</button>
          </mat-card-actions>
        </mat-card>
        <mat-card class="provider-card" *ngIf="mission.provider">
          <mat-card-header>
            <img mat-card-avatar [src]="mission.provider.profile_picture || 'assets/default-avatar.png'" />
            <mat-card-title>{{ mission.provider.first_name }} {{ mission.provider.last_name }}</mat-card-title>
            <mat-card-subtitle>Prestataire assigne</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content><p><mat-icon>phone</mat-icon>{{ mission.provider.phone_number }}</p></mat-card-content>
          <mat-card-actions><button mat-button color="primary"><mat-icon>chat</mat-icon>Contacter</button></mat-card-actions>
        </mat-card>
        <mat-card class="waiting-card" *ngIf="!mission.provider && mission.status === 'funded'">
          <mat-card-content><mat-icon>hourglass_empty</mat-icon><h4>En attente de prestataire</h4><p>Votre mission est publiee. Les prestataires peuvent postuler.</p></mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .container { padding: 24px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .badge { display: flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
    .badge mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .status-funded { background: #dbeafe; color: #1e40af; }
    .status-accepted { background: #ede9fe; color: #6C5CE7; }
    .status-in_progress { background: #d1fae5; color: #065f46; }
    .status-submitted { background: #cffafe; color: #155e75; }
    .status-completed { background: #d1fae5; color: #065f46; }
    .status-cancelled { background: #fee2e2; color: #991b1b; }
    .main-card { margin-bottom: 20px; }
    .desc { font-size: 16px; line-height: 1.6; color: #4b5563; margin-bottom: 24px; }
    .section { margin-bottom: 24px; }
    .section h4 { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 12px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .item { background: #f9fafb; padding: 12px 16px; border-radius: 8px; }
    .item .label { display: block; font-size: 12px; color: #6b7280; margin-bottom: 4px; }
    .item .value { font-size: 18px; font-weight: 600; color: #1a1a2e; }
    .route { background: #f9fafb; padding: 16px; border-radius: 12px; }
    .point { display: flex; gap: 12px; margin-bottom: 8px; }
    .point mat-icon { margin-top: 2px; }
    .point .pickup { color: #6C5CE7; }
    .point .delivery { color: #00b894; }
    .point strong { font-size: 14px; color: #374151; }
    .point p { margin: 4px 0; font-size: 14px; color: #6b7280; }
    .point small { font-size: 12px; color: #9ca3af; }
    .line { width: 2px; height: 30px; background: #e5e7eb; margin-left: 11px; margin-bottom: 8px; }
    .instructions { background: #fef3c7; padding: 12px 16px; border-radius: 8px; font-size: 14px; color: #92400e; }
    .reqs { margin-top: 16px; }
    .reqs h4 { font-size: 14px; color: #374151; margin-bottom: 8px; }
    .provider-card, .waiting-card { margin-top: 16px; }
    .waiting-card { text-align: center; padding: 24px; background: #fef3c7; }
    .waiting-card mat-icon { font-size: 48px; width: 48px; height: 48px; color: #f59e0b; margin-bottom: 12px; }
    .waiting-card h4 { margin: 0 0 8px; color: #92400e; }
    .waiting-card p { margin: 0; color: #b45309; font-size: 14px; }
  `]
})
export class MissionDetailComponent implements OnInit {
  private apiUrl = environment.apiUrl;
  mission: Mission | null = null;
  loading = true;
  missionId = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.missionId = this.route.snapshot.paramMap.get('id') || '';
    this.loadMission();
  }

  private h(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });
  }

  loadMission(): void {
    this.loading = true;
    this.http.get<Mission>(`${this.apiUrl}/missions/${this.missionId}/`, { headers: this.h() }).subscribe({
      next: (m) => { this.mission = m; this.loading = false; },
      error: () => { this.snackBar.open('Erreur chargement mission', 'Fermer', { duration: 3000 }); this.loading = false; }
    });
  }

  goBack(): void { this.router.navigate(['/client/missions']); }

  getStatusIcon(status: string | undefined): string {
    if (!status) return 'help';
    const icons: Record<string, string> = {
      funded: 'account_balance', accepted: 'person', in_progress: 'local_shipping',
      submitted: 'task', completed: 'check_circle', cancelled: 'cancel'
    };
    return icons[status] || 'help';
  }

  getStatusLabel(status: string | undefined): string {
    if (!status) return 'Inconnu';
    const labels: Record<string, string> = {
      funded: 'Financee', accepted: 'Acceptee', in_progress: 'En cours',
      submitted: 'Preuves soumises', completed: 'Terminee', cancelled: 'Annulee'
    };
    return labels[status] || status;
  }

  canCancel(): boolean {
    return ['funded', 'accepted'].includes(this.mission?.status || '');
  }

  cancelMission(): void {
    if (!confirm('Annuler cette mission ?')) return;
    this.http.post(`${this.apiUrl}/missions/${this.missionId}/cancel/`, {}, { headers: this.h() }).subscribe({
      next: () => { if (this.mission) this.mission.status = 'cancelled'; this.snackBar.open('Mission annulee', 'Fermer', { duration: 3000 }); },
      error: () => this.snackBar.open('Erreur annulation', 'Fermer', { duration: 3000 })
    });
  }

  validateMission(): void {
    this.http.post(`${this.apiUrl}/missions/${this.missionId}/validate/`, {}, { headers: this.h() }).subscribe({
      next: () => { if (this.mission) this.mission.status = 'completed'; this.snackBar.open('Mission validee !', 'Fermer', { duration: 3000 }); },
      error: () => this.snackBar.open('Erreur validation', 'Fermer', { duration: 3000 })
    });
  }
}
