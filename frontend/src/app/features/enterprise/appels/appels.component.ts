import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

/** Ancien « appels missions » → invitations à rejoindre l'entreprise. */
@Component({
  selector: 'app-enterprise-appels',
  standalone: true,
  template: '',
})
export class EnterpriseAppelsComponent implements OnInit {
  constructor(private router: Router) {}

  ngOnInit(): void {
    this.router.navigate(['/enterprise/invitations'], { replaceUrl: true });
  }
}
