import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { environment } from '../../../../environments/environment';

interface ReputationScore {
  overall_score: number;
  level: string;
  total_missions: number;
  successful_missions: number;
  average_rating: number;
  rating_count: number;
  on_time_rate: number;
  dispute_count: number;
  success_rate: number;
}

interface RepHistory {
  event_type: string;
  old_score: number;
  new_score: number;
  change_amount: number;
  description: string;
  created_at: string;
  mission_title?: string;
}

interface Penalty {
  penalty_type: string;
  points_deducted: number;
  description: string;
  created_at: string;
  mission_title?: string;
}

@Component({
  selector: 'app-provider-reputation',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatProgressBarModule, MatProgressSpinnerModule, MatChipsModule, MatDividerModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1><mat-icon>verified</mat-icon> Réputation</h1>
          <p>Votre score de confiance sur BlockTask</p>
        </div>
        <button mat-stroked-button (click)="load()"><mat-icon>refresh</mat-icon> Actualiser</button>
      </div>

      <div class="loading" *ngIf="loading"><mat-spinner diameter="36"></mat-spinner></div>

      <ng-container *ngIf="!loading && score">
        <div class="score-hero">
          <div class="score-circle">
            <span class="score-num">{{ score.overall_score | number:'1.0-1' }}</span>
            <span class="score-max">/100</span>
          </div>
          <div class="score-info">
            <span class="level-badge">{{ levelLabel(score.level) }}</span>
            <mat-progress-bar mode="determinate" [value]="score.overall_score" color="primary"></mat-progress-bar>
            <div class="score-stats">
              <span><mat-icon>star</mat-icon> {{ score.average_rating | number:'1.1-1' }} ({{ score.rating_count }} avis)</span>
              <span><mat-icon>check_circle</mat-icon> {{ score.success_rate | number:'1.0-0' }}% succès</span>
              <span><mat-icon>schedule</mat-icon> {{ score.on_time_rate | number:'1.0-0' }}% à l'heure</span>
            </div>
          </div>
        </div>

        <div class="kpi-row">
          <div class="kpi"><span class="val">{{ score.total_missions }}</span><span class="lbl">Missions</span></div>
          <div class="kpi"><span class="val">{{ score.successful_missions }}</span><span class="lbl">Réussies</span></div>
          <div class="kpi"><span class="val">{{ score.dispute_count }}</span><span class="lbl">Litiges</span></div>
        </div>

        <mat-card *ngIf="penalties.length">
          <mat-card-header><mat-card-title>Pénalités</mat-card-title></mat-card-header>
          <mat-card-content>
            <div class="hist-item penalty" *ngFor="let p of penalties">
              <mat-icon>warning</mat-icon>
              <div>
                <strong>-{{ p.points_deducted }} pts — {{ p.penalty_type }}</strong>
                <p>{{ p.description }}</p>
                <span class="date">{{ p.created_at | date:'medium' }}</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-header><mat-card-title>Historique</mat-card-title></mat-card-header>
          <mat-card-content>
            <div class="hist-item" *ngFor="let h of history">
              <mat-icon [class]="h.change_amount >= 0 ? 'up' : 'down'">{{ h.change_amount >= 0 ? 'trending_up' : 'trending_down' }}</mat-icon>
              <div>
                <strong>{{ h.description }}</strong>
                <span class="change" [class.up]="h.change_amount >= 0" [class.down]="h.change_amount < 0">
                  {{ h.change_amount >= 0 ? '+' : '' }}{{ h.change_amount }} pts
                </span>
                <span class="date">{{ h.created_at | date:'medium' }}</span>
              </div>
            </div>
            <p class="empty" *ngIf="!history.length">Aucun historique</p>
          </mat-card-content>
        </mat-card>
      </ng-container>
    </div>
  `,
  styles: [`
    .page-container { max-width: 800px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;
      h1 { margin: 0 0 4px; display: flex; align-items: center; gap: 8px; font-size: 22px; }
      p { margin: 0; color: #6b7280; font-size: 14px; }
    }
    .loading { display: flex; justify-content: center; padding: 40px; }
    .score-hero {
      background: linear-gradient(135deg, #1a1a2e, #0f3460); color: #fff; border-radius: 16px;
      padding: 28px; display: flex; gap: 24px; align-items: center; margin-bottom: 20px; flex-wrap: wrap;
    }
    .score-circle { text-align: center; min-width: 100px; }
    .score-num { font-size: 48px; font-weight: 800; color: #a29bfe; }
    .score-max { font-size: 18px; opacity: 0.6; }
    .score-info { flex: 1; }
    .level-badge { background: rgba(0,184,148,0.3); border: 1px solid #00b894; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 700; }
    .score-stats { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 12px; font-size: 13px; opacity: 0.9;
      span { display: flex; align-items: center; gap: 4px; mat-icon { font-size: 16px; width: 16px; height: 16px; } }
    }
    .kpi-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
    .kpi { background: #fff; border-radius: 12px; padding: 16px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      .val { font-size: 24px; font-weight: 700; display: block; } .lbl { font-size: 12px; color: #6b7280; }
    }
    .hist-item { display: flex; gap: 12px; padding: 12px 0; border-bottom: 1px solid #f3f4f6;
      mat-icon { color: #6b7280; &.up { color: #00b894; } &.down { color: #e17055; } }
      p { margin: 4px 0; font-size: 13px; color: #6b7280; }
      .change { font-weight: 700; margin-left: 8px; &.up { color: #00b894; } &.down { color: #e17055; } }
      .date { font-size: 11px; color: #9ca3af; display: block; margin-top: 4px; }
      &.penalty mat-icon { color: #e17055; }
    }
    .empty { text-align: center; color: #9ca3af; padding: 24px; }
    mat-card { margin-bottom: 16px; }
  `]
})
export class ProviderReputationComponent implements OnInit {
  private apiUrl = environment.apiUrl;
  score: ReputationScore | null = null;
  history: RepHistory[] = [];
  penalties: Penalty[] = [];
  loading = true;
  scoreId = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void { this.load(); }

  private h(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('access_token')}` });
  }

  load(): void {
    this.loading = true;
    this.http.get<any>(`${this.apiUrl}/reputation/scores/`, { headers: this.h() }).subscribe({
      next: (r) => {
        const list = Array.isArray(r) ? r : r?.results ?? [];
        if (list.length) {
          this.score = list[0];
          this.scoreId = list[0].id;
          this.loadHistory();
        }
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
    this.http.get<Penalty[]>(`${this.apiUrl}/reputation/penalties/`, { headers: this.h() }).subscribe({
      next: (p) => { this.penalties = (Array.isArray(p) ? p : (p as any)?.results ?? []) as Penalty[]; },
    });
  }

  loadHistory(): void {
    if (!this.scoreId) return;
    this.http.get<RepHistory[]>(`${this.apiUrl}/reputation/scores/${this.scoreId}/history/`, { headers: this.h() }).subscribe({
      next: (h) => { this.history = h; },
    });
  }

  levelLabel(level: string): string {
    const m: Record<string, string> = { bronze: 'Bronze', silver: 'Argent', gold: 'Or', platinum: 'Platine' };
    return m[level] || level;
  }
}
