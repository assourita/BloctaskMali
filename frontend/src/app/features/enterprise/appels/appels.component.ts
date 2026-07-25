import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Mission, MissionService } from '../../../core/services/mission.service';
import { EnterpriseMissionsNavComponent } from '../enterprise-missions-nav.component';

@Component({
  selector: 'app-enterprise-appels',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    EnterpriseMissionsNavComponent,
  ],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1><mat-icon>campaign</mat-icon> Appels à prestataires</h1>
          <p>Publiez un besoin ouvert : les prestataires voient l'appel et postulent. Vous choisissez ensuite le meilleur profil.</p>
        </div>
        <a mat-raised-button color="primary" routerLink="/enterprise/missions/create" [queryParams]="{ mode: 'appel' }">
          <mat-icon>add</mat-icon> Publier un appel
        </a>
      </header>

      <app-enterprise-missions-nav />

      <div class="how">
        <div class="how-step"><span>1</span> Décrivez le besoin et financez l'escrow</div>
        <div class="how-step"><span>2</span> L'appel apparaît chez les prestataires</div>
        <div class="how-step"><span>3</span> Comparez les candidatures et acceptez</div>
      </div>

      <div class="loading" *ngIf="loading"><mat-spinner diameter="36"></mat-spinner></div>

      <div class="list" *ngIf="!loading">
        <mat-card class="appel-card" *ngFor="let m of appels">
          <div class="appel-main">
            <div>
              <div class="badges">
                <span class="badge open" *ngIf="m.listing_mode !== 'invite_only'">Appel ouvert</span>
                <span class="badge invite" *ngIf="m.listing_mode === 'invite_only'">Sur invitation</span>
                <span class="badge status">{{ statusLabel(m.status) }}</span>
              </div>
              <h3>{{ m.title }}</h3>
              <p>{{ m.budget | number:'1.0-0' }} {{ m.currency || 'XOF' }}
                · {{ (m.application_count || m.applications_count || 0) }} candidature(s)
                · échéance {{ m.deadline | date:'short' }}
              </p>
            </div>
            <div class="actions">
              <a mat-stroked-button [routerLink]="['/enterprise/missions', m.id]">Voir / candidatures</a>
            </div>
          </div>
        </mat-card>

        <div class="empty" *ngIf="!appels.length">
          <mat-icon>campaign</mat-icon>
          <h3>Aucun appel publié</h3>
          <p>Publiez un appel ouvert pour recevoir des candidatures de prestataires.</p>
          <a mat-raised-button color="primary" routerLink="/enterprise/missions/create" [queryParams]="{ mode: 'appel' }">
            Publier un appel
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 960px; margin: 0 auto; padding-bottom: 40px; }
    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      gap: 16px; flex-wrap: wrap; margin-bottom: 8px;
      h1 { display: flex; align-items: center; gap: 8px; margin: 0 0 6px; font-size: 22px; }
      p { margin: 0; color: #64748b; font-size: 14px; max-width: 560px; }
    }
    .how {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px;
    }
    .how-step {
      display: flex; align-items: center; gap: 10px; padding: 12px 14px;
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;
      font-size: 13px; color: #475569;
      span {
        width: 24px; height: 24px; border-radius: 50%; background: #16a34a; color: #fff;
        display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px;
      }
    }
    .loading { display: flex; justify-content: center; padding: 40px; }
    .appel-card { padding: 16px 18px; margin-bottom: 10px; border: 1px solid #e2e8f0; border-radius: 12px; }
    .appel-main { display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; align-items: center; }
    .badges { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; }
    .badge {
      font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 999px;
      &.open { background: #dcfce7; color: #166534; }
      &.invite { background: #e0e7ff; color: #3730a3; }
      &.status { background: #f1f5f9; color: #475569; }
    }
    h3 { margin: 0 0 4px; font-size: 16px; color: #0f172a; }
    p { margin: 0; font-size: 13px; color: #64748b; }
    .actions { display: flex; gap: 8px; }
    .empty {
      text-align: center; padding: 48px 16px; color: #94a3b8;
      mat-icon { font-size: 40px; width: 40px; height: 40px; margin-bottom: 8px; }
      h3 { color: #334155; margin: 0 0 6px; }
      p { margin: 0 0 16px; }
    }
    @media (max-width: 768px) {
      .how { grid-template-columns: 1fr; }
    }
  `],
})
export class EnterpriseAppelsComponent implements OnInit {
  appels: Mission[] = [];
  loading = true;

  constructor(private missionService: MissionService) {}

  ngOnInit(): void {
    this.missionService.getMyMissions('client').subscribe({
      next: (missions) => {
        this.appels = (missions || []).filter((m) =>
          ['pending', 'funded'].includes(m.status) && !m.provider &&
          (m.listing_mode || 'open') === 'open'
        );
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      pending: 'En attente de paiement',
      funded: 'Publié — candidatures ouvertes',
      accepted: 'Prestataire choisi',
      in_progress: 'En cours',
      completed: 'Terminé',
      cancelled: 'Annulé',
    };
    return map[status] || status;
  }
}
