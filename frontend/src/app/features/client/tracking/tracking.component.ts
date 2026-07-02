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
import { MatChipsModule } from '@angular/material/chips';
import { environment } from '../../../../environments/environment';
import { MissionService } from '../../../core/services/mission.service';
import { GpsTrackingComponent } from '../../../shared/components/gps-tracking/gps-tracking.component';

interface MissionOption {
  id: string;
  title: string;
  status: string;
  provider?: { first_name: string; last_name: string };
}

@Component({
  selector: 'app-client-tracking',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatSelectModule, MatFormFieldModule, MatProgressSpinnerModule, MatChipsModule,
    GpsTrackingComponent,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1><mat-icon>my_location</mat-icon> Suivi en temps réel</h1>
          <p>Suivez la position de votre prestataire pendant les missions actives</p>
        </div>
        <button mat-stroked-button (click)="loadMissions()">
          <mat-icon>refresh</mat-icon> Actualiser
        </button>
      </div>

      <div class="loading" *ngIf="loading">
        <mat-spinner diameter="36"></mat-spinner>
      </div>

      <mat-card class="selector-card" *ngIf="!loading">
        <mat-card-content>
          <div class="selector-row" *ngIf="missions.length; else noMissions">
            <mat-form-field appearance="outline" class="mission-select">
              <mat-label>Mission à suivre</mat-label>
              <mat-select [(value)]="selectedMissionId" (selectionChange)="onMissionChange()">
                <mat-option *ngFor="let m of missions" [value]="m.id">
                  {{ m.title }} — {{ statusLabel(m.status) }}
                </mat-option>
              </mat-select>
            </mat-form-field>
            <mat-chip-set *ngIf="selectedMission?.provider">
              <mat-chip>
                <mat-icon matChipAvatar>person</mat-icon>
                {{ selectedMission!.provider!.first_name }} {{ selectedMission!.provider!.last_name }}
              </mat-chip>
            </mat-chip-set>
          </div>
          <ng-template #noMissions>
            <div class="empty">
              <mat-icon>location_off</mat-icon>
              <p>Aucune mission active à suivre</p>
              <a mat-raised-button color="primary" routerLink="/client/missions">Voir mes missions</a>
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
    .selector-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .mission-select { min-width: 320px; flex: 1; }
    .empty {
      text-align: center; padding: 32px; color: #6b7280;
      mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 8px; }
      p { margin: 0 0 16px; }
    }
  `]
})
export class ClientTrackingComponent implements OnInit {
  private apiUrl = environment.apiUrl;
  missions: MissionOption[] = [];
  selectedMissionId = '';
  loading = true;

  get selectedMission(): MissionOption | undefined {
    return this.missions.find(m => m.id === this.selectedMissionId);
  }

  constructor(private http: HttpClient, private missionService: MissionService) {}

  ngOnInit(): void { this.loadMissions(); }

  private h(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });
  }

  loadMissions(): void {
    this.loading = true;
    this.missionService.getMyMissionsByStatuses(['accepted', 'in_progress'], 'client').subscribe({
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

  onMissionChange(): void {}

  statusLabel(s: string): string {
    const m: Record<string, string> = { accepted: 'Acceptée', in_progress: 'En cours' };
    return m[s] || s;
  }
}
