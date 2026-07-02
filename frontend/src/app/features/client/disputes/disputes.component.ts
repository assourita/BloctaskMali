import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { environment } from '../../../../environments/environment';
import { MissionService } from '../../../core/services/mission.service';

interface Dispute {
  id: string;
  mission_id: string;
  mission_title: string;
  reason: string;
  description: string;
  status: string;
  requested_resolution: string;
  created_at: string;
  plaintiff: { first_name: string; last_name: string };
  defendant: { first_name: string; last_name: string };
}

interface MissionOption { id: string; title: string; status: string; }

@Component({
  selector: 'app-client-disputes',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatDividerModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1><mat-icon>gavel</mat-icon> Litiges</h1>
          <p>Ouvrez ou suivez un litige sur une mission</p>
        </div>
        <button mat-raised-button color="primary" (click)="showForm = !showForm">
          <mat-icon>add</mat-icon> Nouveau litige
        </button>
      </div>

      <mat-card class="form-card" *ngIf="showForm">
        <mat-card-header><mat-card-title>Ouvrir un litige</mat-card-title></mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="submit()" class="dispute-form">
            <label class="lbl">Mission</label>
            <select class="field" formControlName="mission_id">
              <option value="">Sélectionner une mission</option>
              <option *ngFor="let m of eligibleMissions" [value]="m.id">{{ m.title }} ({{ m.status }})</option>
            </select>
            <label class="lbl">Motif</label>
            <select class="field" formControlName="reason">
              <option value="non_delivery">Non-livraison</option>
              <option value="poor_quality">Qualité insuffisante</option>
              <option value="damage">Dommages</option>
              <option value="fraud">Fraude</option>
              <option value="other">Autre</option>
            </select>
            <label class="lbl">Description</label>
            <textarea class="field" formControlName="description" rows="4" placeholder="Décrivez le problème..."></textarea>
            <label class="lbl">Résolution souhaitée</label>
            <input class="field" formControlName="requested_resolution" placeholder="Remboursement, nouvelle exécution..." />
            <div class="form-actions">
              <button mat-button type="button" (click)="showForm = false">Annuler</button>
              <button mat-raised-button color="warn" type="submit" [disabled]="form.invalid || submitting">Soumettre</button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      <div class="loading" *ngIf="loading"><mat-spinner diameter="36"></mat-spinner></div>

      <div class="dispute-list" *ngIf="!loading">
        <mat-card *ngFor="let d of disputes" class="dispute-card">
          <div class="dispute-head">
            <div>
              <h3>{{ d.mission_title }}</h3>
              <span class="date">{{ d.created_at | date:'medium' }}</span>
            </div>
            <mat-chip [class]="'st-' + d.status">{{ statusLabel(d.status) }}</mat-chip>
          </div>
          <p class="reason"><strong>Motif :</strong> {{ reasonLabel(d.reason) }}</p>
          <p class="desc">{{ d.description }}</p>
          <div class="parties">
            <span><mat-icon>person</mat-icon> Plaignant : {{ d.plaintiff.first_name }} {{ d.plaintiff.last_name }}</span>
            <span><mat-icon>person_outline</mat-icon> Défendeur : {{ d.defendant.first_name }} {{ d.defendant.last_name }}</span>
          </div>
          <p class="resolution" *ngIf="d.requested_resolution"><strong>Résolution demandée :</strong> {{ d.requested_resolution }}</p>
        </mat-card>
        <p class="empty" *ngIf="!disputes.length">Aucun litige pour le moment</p>
      </div>
    </div>
  `,
  styles: [`
    .page-container { max-width: 900px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;
      h1 { margin: 0 0 4px; display: flex; align-items: center; gap: 8px; font-size: 22px; }
      p { margin: 0; color: #6b7280; font-size: 14px; }
    }
    .form-card { margin-bottom: 24px; }
    .dispute-form { display: flex; flex-direction: column; gap: 8px; }
    .lbl { font-size: 13px; font-weight: 600; margin-top: 8px; }
    .field { padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-family: inherit; }
    .form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
    .loading { display: flex; justify-content: center; padding: 40px; }
    .dispute-list { display: flex; flex-direction: column; gap: 16px; }
    .dispute-card { padding: 20px; }
    .dispute-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;
      h3 { margin: 0 0 4px; font-size: 16px; } .date { font-size: 12px; color: #9ca3af; }
    }
    .reason, .desc, .resolution { font-size: 14px; color: #374151; margin: 8px 0; }
    .parties { display: flex; flex-wrap: wrap; gap: 16px; font-size: 13px; color: #6b7280; margin-top: 8px;
      span { display: flex; align-items: center; gap: 4px; mat-icon { font-size: 16px; width: 16px; height: 16px; } }
    }
    .st-open { background: #fee2e2 !important; color: #991b1b !important; }
    .st-under_review, .st-pending_evidence { background: #fef3c7 !important; color: #92400e !important; }
    .st-resolved, .st-closed { background: #d1fae5 !important; color: #065f46 !important; }
    .empty { text-align: center; color: #9ca3af; padding: 40px; }
  `]
})
export class ClientDisputesComponent implements OnInit {
  private apiUrl = environment.apiUrl;
  disputes: Dispute[] = [];
  eligibleMissions: MissionOption[] = [];
  loading = true;
  showForm = false;
  submitting = false;
  form: FormGroup;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private snack: MatSnackBar,
    private missionService: MissionService,
  ) {
    this.form = this.fb.group({
      mission_id: ['', Validators.required],
      reason: ['non_delivery', Validators.required],
      description: ['', [Validators.required, Validators.minLength(20)]],
      requested_resolution: [''],
    });
  }

  ngOnInit(): void { this.load(); this.loadMissions(); }

  private h(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });
  }

  load(): void {
    this.loading = true;
    this.http.get<Dispute[]>(`${this.apiUrl}/disputes/mine/`, { headers: this.h() }).subscribe({
      next: (d) => { this.disputes = d; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  loadMissions(): void {
    this.missionService.getMyMissionsByStatuses(['in_progress', 'submitted', 'completed'], 'client').subscribe({
      next: (list) => { this.eligibleMissions = list as MissionOption[]; },
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.submitting = true;
    this.http.post(`${this.apiUrl}/disputes/`, this.form.value, { headers: this.h() }).subscribe({
      next: () => {
        this.submitting = false;
        this.showForm = false;
        this.form.reset({ reason: 'non_delivery' });
        this.snack.open('Litige ouvert', 'Fermer', { duration: 3000 });
        this.load();
      },
      error: (e) => {
        this.submitting = false;
        this.snack.open(e.error?.detail || e.error?.mission_id?.[0] || 'Erreur', 'Fermer', { duration: 4000 });
      },
    });
  }

  statusLabel(s: string): string {
    const m: Record<string, string> = { open: 'Ouvert', under_review: 'En examen', pending_evidence: 'Preuves requises', resolved: 'Résolu', closed: 'Fermé', arbitration: 'Arbitrage' };
    return m[s] || s;
  }

  reasonLabel(r: string): string {
    const m: Record<string, string> = { non_delivery: 'Non-livraison', poor_quality: 'Qualité insuffisante', damage: 'Dommages', fraud: 'Fraude', other: 'Autre' };
    return m[r] || r;
  }
}
