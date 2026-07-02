import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { environment } from '../../../../environments/environment';
import { MissionService } from '../../../core/services/mission.service';
import { GpsTrackingComponent } from '../../../shared/components/gps-tracking/gps-tracking.component';

interface MissionOption {
  id: string;
  title: string;
  status: string;
}

@Component({
  selector: 'app-provider-tracking',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatSelectModule, MatFormFieldModule, MatProgressSpinnerModule,
    MatSnackBarModule, MatSlideToggleModule,
    GpsTrackingComponent,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1><mat-icon>gps_fixed</mat-icon> Suivi GPS</h1>
          <p>Partagez votre position pendant vos missions en cours</p>
        </div>
        <button mat-stroked-button (click)="loadMissions()">
          <mat-icon>refresh</mat-icon> Actualiser
        </button>
      </div>

      <div class="loading" *ngIf="loading"><mat-spinner diameter="36"></mat-spinner></div>

      <mat-card class="selector-card" *ngIf="!loading">
        <mat-card-content>
          <div class="selector-row" *ngIf="missions.length; else noMissions">
            <mat-form-field appearance="outline" class="mission-select">
              <mat-label>Mission active</mat-label>
              <mat-select [(value)]="selectedMissionId">
                <mat-option *ngFor="let m of missions" [value]="m.id">{{ m.title }}</mat-option>
              </mat-select>
            </mat-form-field>
            <div class="gps-toggle">
              <mat-slide-toggle [checked]="gpsEnabled" (change)="toggleGps($event.checked)">
                GPS activé sur le compte
              </mat-slide-toggle>
            </div>
          </div>
          <ng-template #noMissions>
            <div class="empty">
              <mat-icon>assignment_late</mat-icon>
              <p>Aucune mission en cours</p>
              <a mat-raised-button color="primary" routerLink="/provider/missions/available">Trouver des missions</a>
            </div>
          </ng-template>
        </mat-card-content>
      </mat-card>

      <app-gps-tracking *ngIf="selectedMissionId" [missionId]="selectedMissionId"></app-gps-tracking>
    </div>
  `,
  styles: [`
    .page-container { max-width: 1200px; margin: 0 auto; }
    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;
      margin-bottom: 24px;
      h1 { margin: 0 0 4px; display: flex; align-items: center; gap: 10px; font-size: 22px; }
      p { margin: 0; color: #6b7280; font-size: 14px; }
    }
    .loading { display: flex; justify-content: center; padding: 48px; }
    .selector-card { margin-bottom: 20px; }
    .selector-row { display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }
    .mission-select { min-width: 300px; flex: 1; }
    .empty { text-align: center; padding: 32px; color: #6b7280;
      mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 8px; }
      p { margin: 0 0 16px; }
    }
  `]
})
export class ProviderTrackingComponent implements OnInit {
  private apiUrl = environment.apiUrl;
  missions: MissionOption[] = [];
  selectedMissionId = '';
  loading = true;
  gpsEnabled = false;

  constructor(private http: HttpClient, private snack: MatSnackBar, private missionService: MissionService) {}

  ngOnInit(): void {
    this.loadMissions();
    this.http.get<any>(`${this.apiUrl}/users/me/`, { headers: this.h() }).subscribe({
      next: (u) => { this.gpsEnabled = !!u.gps_tracking_enabled; },
    });
  }

  private h(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });
  }

  loadMissions(): void {
    this.loading = true;
    this.missionService.getMyMissionsByStatuses(['accepted', 'in_progress'], 'provider').subscribe({
      next: (list) => {
        this.missions = list as MissionOption[];
        if (!this.selectedMissionId && this.missions.length) {
          this.selectedMissionId = this.missions[0].id;
        }
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  toggleGps(enabled: boolean): void {
    this.http.post<any>(`${this.apiUrl}/users/toggle-gps/`, {}, { headers: this.h() }).subscribe({
      next: (res) => {
        this.gpsEnabled = res.gps_tracking_enabled;
        this.snack.open(res.message || 'GPS mis à jour', 'Fermer', { duration: 3000 });
      },
      error: () => { this.gpsEnabled = !enabled; },
    });
  }
}
