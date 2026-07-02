import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  EnterpriseService,
  EnterpriseEmployee,
  EmployeeAssignment,
} from '../../../core/services/enterprise.service';

const ROLE_LABELS: Record<string, string> = {
  agent: 'Agent terrain',
  manager: 'Manager',
  admin: 'Administrateur',
  hr: 'Ressources humaines',
  accountant: 'Comptable',
};

type EmployeeFilter = 'all' | 'active' | 'inactive';
type PageTab = 'employees' | 'assignments';

@Component({
  selector: 'app-enterprise-employees',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatProgressSpinnerModule, MatSnackBarModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1><mat-icon>people</mat-icon> Employés</h1>
          <p>{{ activeCount }} actif(s) · {{ employees.length }} au total</p>
        </div>
        <button mat-raised-button color="primary" (click)="openCreateForm()" *ngIf="pageTab === 'employees'">
          <mat-icon>person_add</mat-icon> Nouvel employé
        </button>
      </div>

      <nav class="page-tabs">
        <button mat-stroked-button [class.active]="pageTab === 'employees'" (click)="pageTab = 'employees'">
          Liste des employés
        </button>
        <button mat-stroked-button [class.active]="pageTab === 'assignments'" (click)="pageTab = 'assignments'">
          Affectations ({{ assignments.length }})
        </button>
      </nav>

      <ng-container *ngIf="pageTab === 'employees'">
        <div class="filters">
          <button mat-stroked-button [color]="filter === 'all' ? 'primary' : undefined" (click)="filter = 'all'">Tous</button>
          <button mat-stroked-button [color]="filter === 'active' ? 'primary' : undefined" (click)="filter = 'active'">Actifs</button>
          <button mat-stroked-button [color]="filter === 'inactive' ? 'primary' : undefined" (click)="filter = 'inactive'">Inactifs</button>
          <button mat-stroked-button (click)="load()"><mat-icon>refresh</mat-icon> Actualiser</button>
        </div>

        <mat-card *ngIf="showForm" class="form-card">
          <h3>Nouvel employé</h3>
          <div class="form-grid">
            <input class="field" [(ngModel)]="form.first_name" placeholder="Prénom *" />
            <input class="field" [(ngModel)]="form.last_name" placeholder="Nom *" />
            <input class="field" [(ngModel)]="form.email" placeholder="Email *" />
            <input class="field" [(ngModel)]="form.phone" placeholder="Téléphone" />
            <input class="field" [(ngModel)]="form.position" placeholder="Poste" />
            <select class="field" [(ngModel)]="form.role">
              <option value="agent">Agent terrain</option>
              <option value="manager">Manager</option>
              <option value="admin">Administrateur</option>
              <option value="hr">Ressources humaines</option>
              <option value="accountant">Comptable</option>
            </select>
          </div>
          <div class="form-actions">
            <button mat-button (click)="cancelForm()">Annuler</button>
            <button mat-raised-button color="primary" (click)="saveEmployee()" [disabled]="saving">
              {{ saving ? 'Enregistrement...' : 'Créer le compte' }}
            </button>
          </div>
        </mat-card>

        <div class="loading" *ngIf="loading"><mat-spinner diameter="36"></mat-spinner></div>

        <div class="emp-grid" *ngIf="!loading">
          <mat-card class="emp-card clickable" *ngFor="let e of filteredEmployees" (click)="selectEmployee(e)">
            <div class="emp-avatar">{{ e.first_name[0] }}{{ e.last_name[0] }}</div>
            <div class="emp-info">
              <h3>{{ e.first_name }} {{ e.last_name }}</h3>
              <p>{{ e.position || roleLabel(e.role) }} · {{ e.email }}</p>
              <span class="missions">{{ e.missions_completed }} mission(s) terminée(s)</span>
            </div>
            <mat-chip [class]="e.is_active ? 'active' : 'inactive'">{{ e.is_active ? 'Actif' : 'Inactif' }}</mat-chip>
          </mat-card>
          <p class="empty" *ngIf="!filteredEmployees.length">Aucun employé pour ce filtre</p>
        </div>

        <mat-card class="detail-card" *ngIf="selectedEmployee">
          <div class="detail-header">
            <h2>{{ selectedEmployee.first_name }} {{ selectedEmployee.last_name }}</h2>
            <button mat-icon-button (click)="closeDetail()" title="Fermer"><mat-icon>close</mat-icon></button>
          </div>
          <mat-chip [class]="selectedEmployee.is_active ? 'active' : 'inactive'" class="detail-chip">
            {{ selectedEmployee.is_active ? 'Actif' : 'Inactif' }}
          </mat-chip>

          <div class="form-grid" *ngIf="detailEditing">
            <input class="field" [(ngModel)]="detailForm.first_name" placeholder="Prénom *" />
            <input class="field" [(ngModel)]="detailForm.last_name" placeholder="Nom *" />
            <input class="field" [(ngModel)]="detailForm.email" placeholder="Email" readonly />
            <input class="field" [(ngModel)]="detailForm.phone" placeholder="Téléphone" />
            <input class="field" [(ngModel)]="detailForm.position" placeholder="Poste" />
            <select class="field" [(ngModel)]="detailForm.role">
              <option value="agent">Agent terrain</option>
              <option value="manager">Manager</option>
              <option value="admin">Administrateur</option>
              <option value="hr">Ressources humaines</option>
              <option value="accountant">Comptable</option>
            </select>
          </div>

          <div class="detail-info" *ngIf="!detailEditing">
            <p><strong>Email :</strong> {{ selectedEmployee.email }}</p>
            <p><strong>Téléphone :</strong> {{ selectedEmployee.phone || '—' }}</p>
            <p><strong>Poste :</strong> {{ selectedEmployee.position || '—' }}</p>
            <p><strong>Rôle :</strong> {{ roleLabel(selectedEmployee.role) }}</p>
            <p><strong>Missions :</strong> {{ selectedEmployee.missions_completed }} terminée(s)</p>
          </div>

          <div class="detail-actions">
            <ng-container *ngIf="detailEditing">
              <button mat-raised-button color="primary" (click)="saveDetail()" [disabled]="saving">Enregistrer</button>
              <button mat-button (click)="detailEditing = false">Annuler</button>
            </ng-container>
            <ng-container *ngIf="!detailEditing">
              <button mat-raised-button color="primary" (click)="startEditDetail()"><mat-icon>edit</mat-icon> Modifier</button>
              <button mat-stroked-button (click)="toggleActive(selectedEmployee)">
                {{ selectedEmployee.is_active ? 'Désactiver' : 'Activer' }}
              </button>
              <button mat-stroked-button color="warn" (click)="removeEmployee(selectedEmployee)">
                <mat-icon>delete</mat-icon> Supprimer
              </button>
            </ng-container>
          </div>
        </mat-card>
      </ng-container>

      <ng-container *ngIf="pageTab === 'assignments'">
        <div class="loading" *ngIf="loading"><mat-spinner diameter="36"></mat-spinner></div>
        <div class="mission-list" *ngIf="!loading">
          <mat-card class="mission-card" *ngFor="let a of assignments">
            <div>
              <h3>{{ a.mission_title || ('Mission ' + (a.mission | slice:0:8)) }}</h3>
              <span class="meta">Employé : {{ a.employee_name || '—' }} · {{ a.assigned_at | date:'short' }}</span>
            </div>
            <mat-chip>{{ assignmentLabel(a.assignment_status) }}</mat-chip>
          </mat-card>
          <p class="empty" *ngIf="!assignments.length">Aucune affectation — assignez un employé depuis une mission reçue</p>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .page-container { max-width: 1100px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;
      h1 { margin: 0 0 4px; display: flex; align-items: center; gap: 8px; font-size: 22px; }
      p { margin: 0; color: #6b7280; font-size: 14px; }
    }
    .page-tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
    .page-tabs button.active { border-color: #2e7d32; color: #2e7d32; }
    .filters { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
    .form-card { padding: 20px; margin-bottom: 20px;
      h3 { margin: 0 0 12px; font-size: 16px; }
    }
    .form-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 12px; }
    .field { padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; }
    .form-actions { display: flex; justify-content: flex-end; gap: 8px; }
    .loading { display: flex; justify-content: center; padding: 40px; }
    .emp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }
    .emp-card { padding: 20px; display: flex; align-items: flex-start; gap: 16px; }
    .emp-card.clickable { cursor: pointer; transition: box-shadow 0.15s; }
    .emp-card.clickable:hover { box-shadow: 0 4px 14px rgba(0,0,0,0.08); }
    .detail-card { padding: 24px; margin-top: 20px; }
    .detail-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;
      h2 { margin: 0; font-size: 20px; }
    }
    .detail-chip { margin-bottom: 16px; }
    .detail-info p { margin: 0 0 8px; color: #374151; font-size: 14px; }
    .detail-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 20px; }
    mat-chip.active { background: #d1fae5 !important; color: #065f46 !important; }
    mat-chip.inactive { background: #f3f4f6 !important; color: #6b7280 !important; }
    .emp-avatar { width: 48px; height: 48px; border-radius: 50%; background: #3CB371; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; }
    .emp-info { flex: 1; min-width: 0;
      h3 { margin: 0 0 4px; font-size: 16px; }
      p { margin: 0; font-size: 13px; color: #6b7280; }
      .missions { display: block; font-size: 12px; color: #9ca3af; margin-top: 4px; }
    }
    .mission-card { padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 12px;
      h3 { margin: 0 0 4px; font-size: 15px; } .meta { font-size: 12px; color: #9ca3af; }
    }
    .empty { grid-column: 1 / -1; text-align: center; color: #9ca3af; padding: 40px; }
    @media (max-width: 768px) { .form-grid { grid-template-columns: 1fr; } .emp-card { flex-direction: column; } }
  `],
})
export class EnterpriseEmployeesComponent implements OnInit {
  employees: EnterpriseEmployee[] = [];
  assignments: EmployeeAssignment[] = [];
  loading = true;
  saving = false;
  showForm = false;
  selectedEmployee: EnterpriseEmployee | null = null;
  detailEditing = false;
  filter: EmployeeFilter = 'all';
  pageTab: PageTab = 'employees';
  form = { first_name: '', last_name: '', email: '', phone: '', position: '', role: 'agent' };
  detailForm = { first_name: '', last_name: '', email: '', phone: '', position: '', role: 'agent' };

  constructor(
    private enterpriseService: EnterpriseService,
    private snack: MatSnackBar,
  ) {}

  ngOnInit(): void { this.load(); }

  get activeCount(): number {
    return this.employees.filter((e) => e.is_active).length;
  }

  get filteredEmployees(): EnterpriseEmployee[] {
    if (this.filter === 'active') return this.employees.filter((e) => e.is_active);
    if (this.filter === 'inactive') return this.employees.filter((e) => !e.is_active);
    return this.employees;
  }

  roleLabel(role: string): string {
    return ROLE_LABELS[role] || role;
  }

  assignmentLabel(s?: string): string {
    const m: Record<string, string> = {
      pending: 'En attente', accepted: 'Confirmée', rejected: 'Refusée', completed: 'Terminée',
    };
    return m[s || ''] || s || '—';
  }

  load(): void {
    this.loading = true;
    this.enterpriseService.getEmployees().subscribe({
      next: (e) => {
        this.employees = e;
        if (this.selectedEmployee) {
          const fresh = e.find((x) => x.id === this.selectedEmployee!.id);
          if (fresh) this.selectedEmployee = fresh;
          else this.closeDetail();
        }
      },
    });
    this.enterpriseService.getAssignments().subscribe({
      next: (a) => { this.assignments = a; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  openCreateForm(): void {
    this.closeDetail();
    this.form = { first_name: '', last_name: '', email: '', phone: '', position: '', role: 'agent' };
    this.showForm = true;
  }

  selectEmployee(e: EnterpriseEmployee): void {
    this.showForm = false;
    this.selectedEmployee = e;
    this.detailEditing = false;
    this.detailForm = {
      first_name: e.first_name,
      last_name: e.last_name,
      email: e.email,
      phone: e.phone || '',
      position: e.position || '',
      role: e.role || 'agent',
    };
  }

  closeDetail(): void {
    this.selectedEmployee = null;
    this.detailEditing = false;
  }

  startEditDetail(): void {
    this.detailEditing = true;
  }

  cancelForm(): void {
    this.showForm = false;
  }

  saveEmployee(): void {
    if (!this.form.first_name || !this.form.last_name || !this.form.email) {
      this.snack.open('Prénom, nom et email sont requis', 'Fermer', { duration: 3000 });
      return;
    }
    this.saving = true;
    this.enterpriseService.createEmployee(this.form).subscribe({
      next: (res) => {
        this.saving = false;
        const msg = res.temporary_password
          ? `Compte créé — mot de passe temporaire : ${res.temporary_password}`
          : 'Employé ajouté';
        this.snack.open(msg, 'Fermer', { duration: res.temporary_password ? 15000 : 3000 });
        this.cancelForm();
        this.load();
      },
      error: (err) => {
        this.saving = false;
        this.snack.open(err.error?.detail || 'Erreur', 'Fermer', { duration: 4000 });
      },
    });
  }

  saveDetail(): void {
    if (!this.selectedEmployee) return;
    this.saving = true;
    this.enterpriseService.updateEmployee(this.selectedEmployee.id, this.detailForm).subscribe({
      next: (updated) => {
        this.saving = false;
        this.selectedEmployee = updated;
        this.detailEditing = false;
        this.snack.open('Employé mis à jour', 'Fermer', { duration: 3000 });
        this.load();
      },
      error: (err) => {
        this.saving = false;
        this.snack.open(err.error?.detail || 'Erreur', 'Fermer', { duration: 4000 });
      },
    });
  }

  toggleActive(e: EnterpriseEmployee): void {
    const next = !e.is_active;
    this.enterpriseService.updateEmployee(e.id, { is_active: next }).subscribe({
      next: (updated) => {
        this.snack.open(next ? 'Employé réactivé' : 'Employé désactivé', 'Fermer', { duration: 2500 });
        if (this.selectedEmployee?.id === e.id) this.selectedEmployee = updated;
        this.load();
      },
      error: (err) => this.snack.open(err.error?.detail || 'Erreur', 'Fermer', { duration: 4000 }),
    });
  }

  removeEmployee(e: EnterpriseEmployee): void {
    if (!confirm(`Supprimer ${e.first_name} ${e.last_name} ? Le compte sera désactivé.`)) return;
    this.enterpriseService.deactivateEmployee(e.id).subscribe({
      next: () => {
        this.snack.open('Employé supprimé', 'Fermer', { duration: 3000 });
        this.closeDetail();
        this.load();
      },
      error: (err) => this.snack.open(err.error?.detail || 'Erreur', 'Fermer', { duration: 4000 }),
    });
  }
}
