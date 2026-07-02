import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterModule } from '@angular/router';

import { Mission, MissionService } from '../../../core/services/mission.service';
import type { LandingProvider, LandingEnterprise } from '../../../core/services/landing.service';

export interface AssignMissionDialogData {
  provider?: LandingProvider;
  providerName?: string;
  enterprise?: LandingEnterprise;
  enterpriseName?: string;
  preselectedMissionId?: string;
}

@Component({
  selector: 'app-assign-mission-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    MatDialogModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatProgressSpinnerModule, MatSnackBarModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>assignment_ind</mat-icon>
      Attribuer une mission
    </h2>

    <mat-dialog-content>
      <p class="intro">
        Choisissez une mission financée à proposer à
        <strong>{{ data.providerName || data.enterpriseName }}</strong>.
      </p>

      <div class="loading" *ngIf="loading">
        <mat-spinner diameter="32"></mat-spinner>
        <span>Chargement de vos missions…</span>
      </div>

      <div class="empty" *ngIf="!loading && !missions.length">
        <mat-icon>info</mat-icon>
        <p>Aucune mission financée disponible pour sollicitation.</p>
        <p class="hint">Créez et financez une mission avant de solliciter un prestataire.</p>
        <a mat-stroked-button routerLink="/client/missions/create" (click)="closeAndNavigate()">
          <mat-icon>add_circle</mat-icon> Créer une mission
        </a>
      </div>

      <form *ngIf="!loading && missions.length" class="assign-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Mission à confier</mat-label>
          <mat-select [(ngModel)]="selectedMissionId" name="mission" required>
            <mat-option *ngFor="let m of missions" [value]="m.id">
              {{ m.title }} — {{ m.budget | number:'1.0-0' }} {{ m.currency }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Message (optionnel)</mat-label>
          <textarea
            matInput
            [(ngModel)]="message"
            name="message"
            rows="3"
            [placeholder]="messagePlaceholder"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="close()">Annuler</button>
      <button
        mat-raised-button
        color="primary"
        [disabled]="!selectedMissionId || submitting"
        (click)="submit()">
        <mat-spinner diameter="18" *ngIf="submitting"></mat-spinner>
        <mat-icon *ngIf="!submitting">send</mat-icon>
        <span *ngIf="!submitting">Envoyer la sollicitation</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2[mat-dialog-title] {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      font-size: 20px;
    }

    mat-dialog-content {
      min-width: min(420px, 90vw);
      padding-top: 8px !important;
    }

    .intro {
      color: #64748b;
      font-size: 14px;
      margin: 0 0 16px;
      line-height: 1.5;
    }

    .loading, .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      text-align: center;
      padding: 16px 0;
      color: #64748b;
    }

    .empty mat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: #94a3b8;
    }

    .empty p { margin: 0; }
    .hint { font-size: 13px; }

    .assign-form {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .full-width { width: 100%; }

    mat-dialog-actions button mat-spinner {
      display: inline-block;
      margin-right: 8px;
    }
  `]
})
export class AssignMissionDialogComponent implements OnInit {
  missions: Mission[] = [];
  selectedMissionId = '';
  message = '';
  loading = true;
  submitting = false;

  get messagePlaceholder(): string {
    return this.data.enterprise
      ? 'Bonjour, nous souhaitons confier cette mission à votre entreprise…'
      : 'Bonjour, j\'aimerais vous confier cette mission…';
  }

  get targetLabel(): string {
    return this.data.providerName || this.data.enterpriseName || '';
  }

  constructor(
    private dialogRef: MatDialogRef<AssignMissionDialogComponent>,
    private missionService: MissionService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: AssignMissionDialogData,
  ) {}

  ngOnInit(): void {
    this.missionService.getMyMissionsByStatuses(['funded'], 'client').subscribe({
      next: (missions) => {
        this.missions = missions.filter(m => !m.provider);
        const preset = this.data.preselectedMissionId;
        if (preset && this.missions.some(m => m.id === preset)) {
          this.selectedMissionId = preset;
        } else if (this.missions.length === 1) {
          this.selectedMissionId = this.missions[0].id;
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Impossible de charger vos missions', 'Fermer', { duration: 4000 });
      },
    });
  }

  submit(): void {
    if (!this.selectedMissionId || this.submitting) return;

    this.submitting = true;
    const message = this.message.trim();
    const request$ = this.data.enterprise
      ? this.missionService.solicitEnterprise(this.selectedMissionId, this.data.enterprise.id, message)
      : this.missionService.solicitProvider(this.selectedMissionId, this.data.provider!.id, message);

    request$.subscribe({
      next: () => {
        this.submitting = false;
        this.snackBar.open(
          `Sollicitation envoyée à ${this.targetLabel}`,
          'Fermer',
          { duration: 4000 },
        );
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.submitting = false;
        this.snackBar.open(
          err.error?.error || 'Erreur lors de l\'envoi',
          'Fermer',
          { duration: 5000 },
        );
      },
    });
  }

  close(): void {
    this.dialogRef.close(false);
  }

  closeAndNavigate(): void {
    this.dialogRef.close(false);
  }
}
