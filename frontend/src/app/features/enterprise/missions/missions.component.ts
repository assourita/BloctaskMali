import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-enterprise-missions',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `<mat-card><mat-card-title>Missions Entreprise</mat-card-title></mat-card>`
})
export class EnterpriseMissionsComponent {}
