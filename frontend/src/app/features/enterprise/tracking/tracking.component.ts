import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-enterprise-tracking',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `<mat-card><mat-card-title>Suivi Entreprise</mat-card-title></mat-card>`
})
export class EnterpriseTrackingComponent {}
