import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  EnterpriseService,
  EnterpriseMission,
  EnterpriseEmployee,
  EmployeeAssignment,
} from '../../../core/services/enterprise.service';
import { EnterpriseMissionsNavComponent } from '../enterprise-missions-nav.component';

@Component({
  selector: 'app-enterprise-missions',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    MatCardModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatProgressSpinnerModule, MatSnackBarModule,
    EnterpriseMissionsNavComponent,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1><mat-icon>assignment</mat-icon> Missions</h1>
          <p>Missions de l'entreprise et affectations employés</p>
        </div>
      </div>

      <mat-card class="assign-card" *ngIf="showAssignForm">
        <h3>Affecter un employé à une mission</h3>
        <div class="form-grid">
          <select class="field" [(ngModel)]="assignForm.mission">
            <option value="">Choisir une mission</option>
            <option *ngFor="let m of missions" [value]="m.id">{{ m.title }} ({{ m.status }})</option>
          </select>
          <select class="field" [(ngModel)]="assignForm.employee">
            <option value="">Choisir un employé</option>
            <option *ngFor="let e of employees" [value]="e.id">{{ e.first_name }} {{ e.last_name }}</option>
          </select>
          <input class="field" [(ngModel)]="assignForm.notes" placeholder="Notes (optionnel)" />
        </div>
        <div class="form-actions">
          <button mat-button (click)="showAssignForm = false">Annuler</button>
          <button mat-raised-button color="primary" (click)="createAssignment()" [disabled]="assigning">
            {{ assigning ? 'Affectation...' : 'Affecter' }}
          </button>
        </div>
      </mat-card>

      <app-enterprise-missions-nav [showRefresh]="true" (refresh)="load()" />

      <div class="loading" *ngIf="loading"><mat-spinner diameter="36"></mat-spinner></div>

      <ng-container *ngIf="!loading">
        <h2 class="section-title">
          {{ missionTab === 'ordered' ? 'Missions commandées' : 'Missions reçues' }} ({{ missions.length }})
        </h2>
        <div class="mission-list">
          <mat-card *ngFor="let m of missions" class="mission-card">
            <div>
              <h3>{{ m.title }}</h3>
              <span class="meta">{{ m.budget | number:'1.0-0' }} {{ m.currency || 'XOF' }} · {{ m.created_at | date:'short' }}</span>
            </div>
            <mat-chip [class]="'st-' + m.status">{{ statusLabel(m.status) }}</mat-chip>
          </mat-card>
          <p class="empty" *ngIf="!missions.length">
            {{ missionTab === 'ordered' ? 'Aucune mission commandée' : 'Aucune mission reçue — postulez ou acceptez une sollicitation' }}
          </p>
        </div>

        <div class="toolbar" *ngIf="missionTab === 'received'">
          <button mat-stroked-button (click)="showAssignForm = !showAssignForm" [disabled]="!missions.length || !employees.length">
            <mat-icon>person_add</mat-icon> Affecter un employé
          </button>
        </div>

        <h2 class="section-title">Affectations ({{ assignments.length }})</h2>
        <div class="mission-list">
          <mat-card *ngFor="let a of assignments" class="mission-card">
            <div>
              <h3>{{ a.mission_title || ('Mission ' + (a.mission | slice:0:8)) }}</h3>
              <span class="meta">Employé : {{ a.employee_name || '—' }} · {{ a.assigned_at | date:'short' }}</span>
            </div>
            <div class="assign-actions">
              <mat-chip [class]="'st-' + a.assignment_status">{{ assignmentLabel(a.assignment_status) }}</mat-chip>
              <button mat-stroked-button color="primary" *ngIf="a.assignment_status === 'pending'" (click)="acceptAssignment(a.id)">
                Confirmer
              </button>
            </div>
          </mat-card>
          <p class="empty" *ngIf="!assignments.length">Aucune affectation</p>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .page-container { max-width: 1000px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;
      h1 { margin: 0 0 4px; display: flex; align-items: center; gap: 8px; font-size: 22px; }
      p { margin: 0; color: #6b7280; font-size: 14px; }
    }
    .assign-card { padding: 20px; margin-bottom: 16px;
      h3 { margin: 0 0 12px; font-size: 15px; }
    }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 12px; }
    .field { padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; }
    .form-actions, .toolbar { display: flex; gap: 8px; justify-content: flex-end; margin-bottom: 16px; }
    .toolbar { justify-content: flex-start; }
    .section-title { font-size: 16px; font-weight: 600; margin: 24px 0 12px; }
    .loading { display: flex; justify-content: center; padding: 40px; }
    .mission-card { padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 12px;
      h3 { margin: 0 0 4px; font-size: 15px; } .meta { font-size: 12px; color: #9ca3af; }
    }
    .assign-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .empty { text-align: center; color: #9ca3af; padding: 24px; }
    mat-chip.st-accepted, mat-chip.st-in_progress { background: #dbeafe !important; color: #1e40af !important; }
    mat-chip.st-completed { background: #d1fae5 !important; color: #065f46 !important; }
    mat-chip.st-pending { background: #fef3c7 !important; color: #92400e !important; }
    mat-chip.st-rejected { background: #fee2e2 !important; color: #991b1b !important; }
    @media (max-width: 768px) { .form-grid { grid-template-columns: 1fr; } .mission-card { flex-direction: column; align-items: flex-start; } }
  `]
})
export class EnterpriseMissionsComponent implements OnInit {
  missions: EnterpriseMission[] = [];
  assignments: EmployeeAssignment[] = [];
  employees: EnterpriseEmployee[] = [];
  loading = true;
  missionTab: 'ordered' | 'received' = 'ordered';
  showAssignForm = false;
  assigning = false;
  assignForm = { mission: '', employee: '', notes: '' };

  constructor(
    private enterpriseService: EnterpriseService,
    private snack: MatSnackBar,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const tab = params.get('tab');
      this.missionTab = tab === 'received' ? 'received' : 'ordered';
      this.load();
    });
  }

  load(): void {
    this.loading = true;
    this.enterpriseService.getMissions(this.missionTab).subscribe({
      next: (m) => { this.missions = m; },
    });
    this.enterpriseService.getEmployees().subscribe({
      next: (e) => { this.employees = e.filter((x) => x.is_active); },
    });
    this.enterpriseService.getAssignments().subscribe({
      next: (a) => {
        this.assignments = a;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  createAssignment(): void {
    if (!this.assignForm.mission || !this.assignForm.employee) {
      this.snack.open('Sélectionnez une mission et un employé', 'Fermer', { duration: 3000 });
      return;
    }
    this.assigning = true;
    this.enterpriseService.createAssignment(this.assignForm).subscribe({
      next: () => {
        this.assigning = false;
        this.showAssignForm = false;
        this.assignForm = { mission: '', employee: '', notes: '' };
        this.snack.open('Employé affecté à la mission', 'Fermer', { duration: 3000 });
        this.load();
      },
      error: (err) => {
        this.assigning = false;
        this.snack.open(err.error?.detail || 'Erreur affectation', 'Fermer', { duration: 4000 });
      },
    });
  }

  acceptAssignment(id: string): void {
    this.enterpriseService.acceptAssignment(id).subscribe({
      next: () => {
        this.snack.open('Affectation confirmée', 'Fermer', { duration: 2000 });
        this.load();
      },
      error: () => this.snack.open('Erreur', 'Fermer', { duration: 3000 }),
    });
  }

  statusLabel(s: string): string {
    const m: Record<string, string> = {
      draft: 'Brouillon', pending: 'En attente', funded: 'Financée',
      accepted: 'Acceptée', in_progress: 'En cours', submitted: 'Soumise',
      completed: 'Terminée', cancelled: 'Annulée', disputed: 'Litige',
    };
    return m[s] || s;
  }

  assignmentLabel(s: string): string {
    const m: Record<string, string> = {
      pending: 'En attente', accepted: 'Confirmée', rejected: 'Refusée', completed: 'Terminée',
    };
    return m[s] || s;
  }
}
