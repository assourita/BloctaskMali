import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import {
  EnterpriseService,
  EnterpriseDispute,
  EnterpriseMission,
} from '../../../core/services/enterprise.service';

@Component({
  selector: 'app-enterprise-disputes',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatProgressSpinnerModule, MatFormFieldModule, MatSelectModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1><mat-icon>gavel</mat-icon> Litiges</h1>
          <p>Litiges liés aux missions de l'entreprise</p>
        </div>
        <button mat-stroked-button (click)="load()"><mat-icon>refresh</mat-icon> Actualiser</button>
      </div>

      <div class="filters">
        <mat-form-field appearance="outline">
          <mat-label>Mission</mat-label>
          <mat-select [(ngModel)]="missionFilter" (selectionChange)="load()">
            <mat-option value="">Toutes les missions</mat-option>
            <mat-option *ngFor="let m of missions" [value]="m.id">{{ m.title }}</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Statut</mat-label>
          <mat-select [(ngModel)]="statusFilter" (selectionChange)="load()">
            <mat-option value="">Tous</mat-option>
            <mat-option value="open">Ouvert</mat-option>
            <mat-option value="under_review">En examen</mat-option>
            <mat-option value="pending_evidence">Preuves en attente</mat-option>
            <mat-option value="arbitration">Arbitrage</mat-option>
            <mat-option value="resolved">Résolu</mat-option>
            <mat-option value="closed">Fermé</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <div class="loading" *ngIf="loading"><mat-spinner diameter="36"></mat-spinner></div>

      <div class="dispute-list" *ngIf="!loading">
        <mat-card *ngFor="let d of disputes" class="dispute-card">
          <div class="head">
            <h3>{{ d.mission_title }}</h3>
            <mat-chip [class]="'st-' + d.status">{{ statusLabel(d.status) }}</mat-chip>
          </div>
          <p class="reason">{{ reasonLabel(d.reason) }}</p>
          <p class="desc">{{ d.description }}</p>
          <div class="parties">
            <span>{{ d.plaintiff.first_name }} {{ d.plaintiff.last_name }}</span>
            <mat-icon>arrow_forward</mat-icon>
            <span>{{ d.defendant.first_name }} {{ d.defendant.last_name }}</span>
          </div>
          <span class="date">{{ d.created_at | date:'medium' }}</span>
        </mat-card>
        <p class="empty" *ngIf="!disputes.length">Aucun litige pour ces critères</p>
      </div>
    </div>
  `,
  styles: [`
    .page-container { max-width: 900px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;
      h1 { margin: 0 0 4px; display: flex; align-items: center; gap: 8px; font-size: 22px; }
      p { margin: 0; color: #6b7280; font-size: 14px; }
    }
    .filters {
      display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap;
      mat-form-field { min-width: 220px; flex: 1; }
    }
    .loading { display: flex; justify-content: center; padding: 40px; }
    .dispute-card { padding: 20px; margin-bottom: 16px; }
    .head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;
      h3 { margin: 0; font-size: 16px; }
    }
    .reason { font-weight: 600; font-size: 14px; margin: 8px 0 4px; }
    .desc { font-size: 14px; color: #6b7280; margin: 0 0 12px; }
    .parties { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #374151; mat-icon { font-size: 16px; } }
    .date { font-size: 11px; color: #9ca3af; display: block; margin-top: 8px; }
    .st-open, .st-under_review, .st-pending_evidence, .st-arbitration {
      background: #fee2e2 !important; color: #991b1b !important;
    }
    .st-resolved, .st-closed { background: #d1fae5 !important; color: #065f46 !important; }
    .empty { text-align: center; color: #9ca3af; padding: 40px; }
  `]
})
export class EnterpriseDisputesComponent implements OnInit {
  disputes: EnterpriseDispute[] = [];
  missions: EnterpriseMission[] = [];
  loading = true;
  statusFilter = '';
  missionFilter = '';

  constructor(private enterpriseService: EnterpriseService) {}

  ngOnInit(): void {
    this.enterpriseService.getMissions().subscribe({
      next: (m) => { this.missions = m; },
      error: () => {},
    });
    this.load();
  }

  load(): void {
    this.loading = true;
    this.enterpriseService.getDisputes({
      status: this.statusFilter || undefined,
      mission: this.missionFilter || undefined,
    }).subscribe({
      next: (d) => { this.disputes = d; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  statusLabel(s: string): string {
    const m: Record<string, string> = {
      open: 'Ouvert', under_review: 'En examen', pending_evidence: 'Preuves en attente',
      arbitration: 'Arbitrage', resolved: 'Résolu', closed: 'Fermé',
    };
    return m[s] || s;
  }

  reasonLabel(r: string): string {
    const m: Record<string, string> = {
      non_delivery: 'Non-livraison', poor_quality: 'Qualité', damage: 'Dommages', fraud: 'Fraude', other: 'Autre',
    };
    return m[r] || r;
  }
}
