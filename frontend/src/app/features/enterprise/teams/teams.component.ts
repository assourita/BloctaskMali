import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  EnterpriseService,
  EnterpriseEmployee,
  EnterpriseTeam,
} from '../../../core/services/enterprise.service';

interface MemberDraft {
  employee_id: string;
  category: string;
}

@Component({
  selector: 'app-enterprise-teams',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatSnackBarModule,
  ],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1><mat-icon>groups</mat-icon> Équipes</h1>
          <p>Créez des équipes réutilisables, ajoutez des membres et désignez un chef.</p>
        </div>
        <button mat-raised-button color="primary" (click)="showForm = !showForm">
          <mat-icon>add</mat-icon> {{ showForm ? 'Fermer' : 'Nouvelle équipe' }}
        </button>
      </header>

      <mat-card *ngIf="showForm" class="form-card">
        <h3>{{ formTitle }}</h3>
        <div class="form-grid">
          <input class="field full" [(ngModel)]="form.name" placeholder="Nom de l'équipe *" />
          <textarea class="field full" [(ngModel)]="form.description" rows="2" placeholder="Description"></textarea>
          <select class="field full" [(ngModel)]="form.manager">
            <option value="">Chef d'équipe (optionnel)</option>
            <option *ngFor="let e of employees" [value]="e.id">{{ e.first_name }} {{ e.last_name }}</option>
          </select>
        </div>

        <div class="members-block">
          <div class="members-head">
            <h4>Membres de l'équipe</h4>
            <span class="hint">Sélectionnez les employés. La catégorie est optionnelle.</span>
          </div>
          <div class="member-pick" *ngFor="let e of employees">
            <label class="check">
              <input type="checkbox"
                [checked]="isSelected(e.id)"
                (change)="toggleMember(e.id, $any($event.target).checked)" />
              <span>{{ e.first_name }} {{ e.last_name }}</span>
              <span class="meta" *ngIf="e.position">{{ e.position }}</span>
            </label>
            <input *ngIf="isSelected(e.id)"
              class="field cat"
              [(ngModel)]="memberCategories[e.id]"
              placeholder="Catégorie (optionnel)" />
          </div>
          <p class="empty-inline" *ngIf="!employees.length">Aucun employé actif disponible.</p>
        </div>

        <div class="form-actions">
          <button mat-button (click)="cancelForm()">Annuler</button>
          <button mat-raised-button color="primary" (click)="save()" [disabled]="saving">
            {{ saving ? 'Enregistrement…' : (editingId ? 'Enregistrer' : 'Créer') }}
          </button>
        </div>
      </mat-card>

      <div class="loading" *ngIf="loading"><mat-spinner diameter="36"></mat-spinner></div>

      <div class="list" *ngIf="!loading">
        <mat-card class="team-card" *ngFor="let team of teams">
          <div class="team-top">
            <div>
              <div class="badges">
                <span class="badge" [class.active]="team.is_active">{{ team.is_active ? 'Active' : 'Inactive' }}</span>
                <span class="badge muted">{{ team.members_count || team.members?.length || 0 }} membre(s)</span>
              </div>
              <h3>{{ team.name }}</h3>
              <p *ngIf="team.manager_name">Chef : {{ team.manager_name }}</p>
              <p class="desc" *ngIf="team.description">{{ team.description }}</p>
            </div>
            <div class="actions">
              <button mat-stroked-button (click)="toggleExpand(team)">
                {{ expandedId === team.id ? 'Masquer' : 'Membres' }}
              </button>
              <button mat-stroked-button (click)="edit(team)">Modifier</button>
              <button mat-stroked-button color="warn" (click)="remove(team)">Supprimer</button>
            </div>
          </div>

          <div class="members" *ngIf="expandedId === team.id">
            <div class="add-row">
              <select class="field" [(ngModel)]="memberPick[team.id]">
                <option value="">Ajouter un employé…</option>
                <option *ngFor="let e of availableEmployees(team)" [value]="e.id">
                  {{ e.first_name }} {{ e.last_name }}
                </option>
              </select>
              <input class="field cat"
                [(ngModel)]="memberCategoryPick[team.id]"
                placeholder="Catégorie (optionnel)" />
              <button mat-flat-button color="primary"
                (click)="addMember(team)"
                [disabled]="!memberPick[team.id] || busyId === team.id">
                Ajouter
              </button>
            </div>
            <div class="member-row" *ngFor="let m of team.members || []">
              <div>
                <strong>{{ m.first_name }} {{ m.last_name }}</strong>
                <span class="meta">{{ m.email }}</span>
                <span class="meta" *ngIf="m.category">Catégorie : {{ m.category }}</span>
                <span class="badge chef" *ngIf="m.is_manager || team.manager === m.employee_id">Chef</span>
              </div>
              <div class="actions">
                <button mat-stroked-button *ngIf="team.manager !== m.employee_id"
                  (click)="makeManager(team, m.employee_id)" [disabled]="busyId === team.id">
                  Définir chef
                </button>
                <button mat-stroked-button color="warn"
                  (click)="removeMember(team, m.employee_id)" [disabled]="busyId === team.id">
                  Retirer
                </button>
              </div>
            </div>
            <p class="empty-inline" *ngIf="!(team.members || []).length">Aucun membre.</p>
          </div>
        </mat-card>

        <div class="empty" *ngIf="!teams.length">
          <mat-icon>groups</mat-icon>
          <h3>Aucune équipe</h3>
          <p>Créez une équipe pour l’affecter ensuite à une mission.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 960px; margin: 0 auto; padding-bottom: 40px; }
    .page-header {
      display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 16px;
      h1 { display: flex; align-items: center; gap: 8px; margin: 0 0 4px; font-size: 22px; }
      p { margin: 0; color: #64748b; font-size: 14px; max-width: 480px; }
    }
    .form-card { padding: 18px; margin-bottom: 16px; border: 1px solid #e2e8f0; border-radius: 12px;
      h3 { margin: 0 0 12px; font-size: 16px; }
    }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .field {
      border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; font: inherit; width: 100%;
      box-sizing: border-box; background: #fff;
      &.full { grid-column: 1 / -1; }
      &.cat { max-width: 220px; }
    }
    .members-block {
      margin-top: 14px; padding-top: 14px; border-top: 1px solid #e2e8f0;
      h4 { margin: 0 0 4px; font-size: 14px; }
      .hint { display: block; font-size: 12px; color: #94a3b8; margin-bottom: 10px; }
    }
    .member-pick {
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
      padding: 8px 0; border-bottom: 1px solid #f1f5f9;
      .check {
        display: flex; align-items: center; gap: 8px; flex: 1; min-width: 200px; cursor: pointer;
        input { width: auto; }
        .meta { font-size: 12px; color: #94a3b8; }
      }
    }
    .form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
    .loading { display: flex; justify-content: center; padding: 32px; }
    .team-card { padding: 16px 18px; margin-bottom: 10px; border: 1px solid #e2e8f0; border-radius: 12px; }
    .team-top { display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
    .badges { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; }
    .badge {
      font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 999px; display: inline-block;
      &.active { background: #dcfce7; color: #166534; }
      &:not(.active):not(.muted):not(.chef) { background: #f1f5f9; color: #64748b; }
      &.muted { background: #eef2ff; color: #3730a3; }
      &.chef { background: #fef3c7; color: #92400e; margin-left: 6px; }
    }
    h3 { margin: 0 0 4px; font-size: 16px; }
    p { margin: 0; font-size: 13px; color: #64748b; }
    .desc { margin-top: 6px !important; color: #475569 !important; }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-start; }
    .members { margin-top: 14px; padding-top: 14px; border-top: 1px solid #e2e8f0; }
    .add-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; align-items: center;
      .field:not(.cat) { max-width: 280px; }
    }
    .member-row {
      display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap;
      padding: 10px 0; border-bottom: 1px solid #f1f5f9;
      strong { display: block; }
      .meta { display: block; font-size: 12px; color: #94a3b8; }
    }
    .empty-inline { color: #94a3b8; font-size: 13px; }
    .empty { text-align: center; padding: 48px 16px; color: #94a3b8;
      mat-icon { font-size: 40px; width: 40px; height: 40px; }
      h3 { color: #334155; margin: 8px 0 4px; }
    }
    @media (max-width: 640px) { .form-grid { grid-template-columns: 1fr; } }
  `],
})
export class EnterpriseTeamsComponent implements OnInit {
  teams: EnterpriseTeam[] = [];
  employees: EnterpriseEmployee[] = [];
  loading = true;
  saving = false;
  showForm = false;
  editingId: string | null = null;
  expandedId: string | null = null;
  busyId: string | null = null;
  memberPick: Record<string, string> = {};
  memberCategoryPick: Record<string, string> = {};
  selectedMemberIds: string[] = [];
  memberCategories: Record<string, string> = {};
  form = { name: '', description: '', manager: '' };

  constructor(
    private enterpriseService: EnterpriseService,
    private snack: MatSnackBar,
  ) {}

  get formTitle(): string {
    return this.editingId ? "Modifier l'équipe" : 'Créer une équipe';
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.enterpriseService.getTeams().subscribe({
      next: (list) => {
        this.teams = list || [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snack.open('Erreur chargement équipes', 'Fermer', { duration: 3000 });
      },
    });
    this.enterpriseService.getEmployees().subscribe({
      next: (list) => { this.employees = (list || []).filter((e) => e.is_active); },
    });
  }

  isSelected(employeeId: string): boolean {
    return this.selectedMemberIds.includes(employeeId);
  }

  toggleMember(employeeId: string, checked: boolean): void {
    if (checked) {
      if (!this.selectedMemberIds.includes(employeeId)) {
        this.selectedMemberIds = [...this.selectedMemberIds, employeeId];
      }
      if (!(employeeId in this.memberCategories)) {
        this.memberCategories[employeeId] = '';
      }
    } else {
      this.selectedMemberIds = this.selectedMemberIds.filter((id) => id !== employeeId);
      delete this.memberCategories[employeeId];
      if (this.form.manager === employeeId) {
        this.form.manager = '';
      }
    }
  }

  buildMembersPayload(): MemberDraft[] {
    return this.selectedMemberIds.map((employee_id) => ({
      employee_id,
      category: (this.memberCategories[employee_id] || '').trim(),
    }));
  }

  availableEmployees(team: EnterpriseTeam): EnterpriseEmployee[] {
    const ids = new Set((team.members || []).map((m) => m.employee_id));
    return this.employees.filter((e) => !ids.has(e.id));
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingId = null;
    this.form = { name: '', description: '', manager: '' };
    this.selectedMemberIds = [];
    this.memberCategories = {};
  }

  edit(team: EnterpriseTeam): void {
    this.editingId = team.id;
    this.form = {
      name: team.name,
      description: team.description || '',
      manager: (team.manager as string) || '',
    };
    this.selectedMemberIds = (team.members || []).map((m) => m.employee_id);
    this.memberCategories = {};
    for (const m of team.members || []) {
      this.memberCategories[m.employee_id] = m.category || '';
    }
    this.showForm = true;
  }

  save(): void {
    if (!this.form.name.trim()) {
      this.snack.open('Nom requis', 'Fermer', { duration: 2500 });
      return;
    }
    if (!this.selectedMemberIds.length && !this.form.manager) {
      this.snack.open('Ajoutez au moins un membre ou un chef', 'Fermer', { duration: 3000 });
      return;
    }
    this.saving = true;
    const members_payload = this.buildMembersPayload();
    // Si un chef est choisi mais pas coché membre, l'inclure
    if (this.form.manager && !members_payload.some((m) => m.employee_id === this.form.manager)) {
      members_payload.push({ employee_id: this.form.manager, category: '' });
    }
    const payload = {
      name: this.form.name.trim(),
      description: this.form.description.trim(),
      manager: this.form.manager || null,
      is_active: true,
      members_payload,
    };
    const req = this.editingId
      ? this.enterpriseService.updateTeam(this.editingId, payload)
      : this.enterpriseService.createTeam(payload);
    req.subscribe({
      next: () => {
        this.saving = false;
        this.cancelForm();
        this.snack.open('Équipe enregistrée', 'Fermer', { duration: 2500 });
        this.load();
      },
      error: (err) => {
        this.saving = false;
        this.snack.open(err.error?.detail || err.error?.error || 'Erreur', 'Fermer', { duration: 4000 });
      },
    });
  }

  remove(team: EnterpriseTeam): void {
    if (!confirm(`Supprimer l'équipe « ${team.name} » ?`)) return;
    this.enterpriseService.deleteTeam(team.id).subscribe({
      next: () => {
        this.snack.open('Équipe supprimée', 'Fermer', { duration: 2500 });
        this.load();
      },
      error: () => this.snack.open('Suppression impossible', 'Fermer', { duration: 3000 }),
    });
  }

  toggleExpand(team: EnterpriseTeam): void {
    this.expandedId = this.expandedId === team.id ? null : team.id;
  }

  addMember(team: EnterpriseTeam): void {
    const employeeId = this.memberPick[team.id];
    if (!employeeId) return;
    const category = (this.memberCategoryPick[team.id] || '').trim();
    this.busyId = team.id;
    this.enterpriseService.addTeamMember(team.id, employeeId, category).subscribe({
      next: (updated) => {
        this.busyId = null;
        this.memberPick[team.id] = '';
        this.memberCategoryPick[team.id] = '';
        this.replaceTeam(updated);
      },
      error: (err) => {
        this.busyId = null;
        this.snack.open(err.error?.error || 'Erreur', 'Fermer', { duration: 3000 });
      },
    });
  }

  removeMember(team: EnterpriseTeam, employeeId: string): void {
    this.busyId = team.id;
    this.enterpriseService.removeTeamMember(team.id, employeeId).subscribe({
      next: (updated) => {
        this.busyId = null;
        this.replaceTeam(updated);
      },
      error: () => {
        this.busyId = null;
        this.snack.open('Retrait impossible', 'Fermer', { duration: 3000 });
      },
    });
  }

  makeManager(team: EnterpriseTeam, employeeId: string): void {
    this.busyId = team.id;
    this.enterpriseService.setTeamManager(team.id, employeeId).subscribe({
      next: (updated) => {
        this.busyId = null;
        this.replaceTeam(updated);
        this.snack.open('Chef mis à jour', 'Fermer', { duration: 2500 });
      },
      error: () => {
        this.busyId = null;
        this.snack.open('Erreur', 'Fermer', { duration: 3000 });
      },
    });
  }

  private replaceTeam(updated: EnterpriseTeam): void {
    this.teams = this.teams.map((t) => (t.id === updated.id ? updated : t));
  }
}
