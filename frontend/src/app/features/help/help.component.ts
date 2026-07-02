import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    MatCardModule, MatButtonModule, MatIconModule, MatExpansionModule,
  ],
  template: `
    <div class="help-page">
      <header class="help-hero">
        <mat-icon>support_agent</mat-icon>
        <h1>Aide & Support</h1>
        <p>Trouvez des réponses rapides ou contactez l'équipe BlockTask Mali.</p>
      </header>

      <div class="quick-links">
        <a class="quick-card" [routerLink]="createMissionLink">
          <mat-icon>add_task</mat-icon>
          <span>Publier une mission</span>
        </a>
        <a class="quick-card" [routerLink]="availableMissionsLink">
          <mat-icon>search</mat-icon>
          <span>Missions disponibles</span>
        </a>
        <a class="quick-card" [routerLink]="disputesLink">
          <mat-icon>gavel</mat-icon>
          <span>Litiges</span>
        </a>
        <a class="quick-card" href="mailto:support&#64;blocktask.ml">
          <mat-icon>email</mat-icon>
          <span>support&#64;blocktask.ml</span>
        </a>
      </div>

      <mat-card class="faq-card">
        <mat-card-header>
          <mat-card-title>Questions fréquentes</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <mat-accordion>
            <mat-expansion-panel *ngFor="let faq of faqs">
              <mat-expansion-panel-header>
                <mat-panel-title>{{ faq.q }}</mat-panel-title>
              </mat-expansion-panel-header>
              <p>{{ faq.a }}</p>
            </mat-expansion-panel>
          </mat-accordion>
        </mat-card-content>
      </mat-card>

      <div class="contact-grid">
        <mat-card>
          <mat-icon>phone</mat-icon>
          <h3>Téléphone</h3>
          <p>+223 70 00 00 00</p>
          <small>Lun–Sam, 8h–18h (Bamako)</small>
        </mat-card>
        <mat-card>
          <mat-icon>chat</mat-icon>
          <h3>Messagerie</h3>
          <p>Utilisez le chat intégré depuis une mission active pour contacter l'autre partie.</p>
        </mat-card>
        <mat-card>
          <mat-icon>verified_user</mat-icon>
          <h3>Vérification KYC</h3>
          <p>Complétez votre NINA et vérifiez votre téléphone depuis Mon profil pour débloquer toutes les fonctionnalités.</p>
          <button mat-stroked-button [routerLink]="profileLink">Mon profil</button>
        </mat-card>
      </div>

      <mat-card class="tips-card">
        <mat-card-header>
          <mat-card-title><mat-icon>lightbulb</mat-icon> Conseils de sécurité</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <ul>
            <li>Ne payez jamais en dehors de la plateforme — l'escrow protège client et prestataire.</li>
            <li>Vérifiez les preuves photo et le suivi GPS avant de valider une mission.</li>
            <li>En cas de problème, ouvrez un litige depuis la mission dans les 48 h.</li>
            <li>Mode test Mobile Money : code OTP <strong>1234</strong>.</li>
          </ul>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .help-page { max-width: 900px; margin: 0 auto; }

    .help-hero {
      text-align: center;
      padding: 32px 24px;
      background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
      border: 1px solid #bbf7d0;
      border-radius: 16px;
      margin-bottom: 24px;
    }
    .help-hero mat-icon {
      font-size: 48px; width: 48px; height: 48px;
      color: #3CB371; margin-bottom: 8px;
    }
    .help-hero h1 { margin: 0 0 8px; font-size: 28px; color: #111827; }
    .help-hero p { margin: 0; color: #6b7280; }

    .quick-links {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    .quick-card {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 16px; background: white; border: 1px solid #e5e7eb;
      border-radius: 12px; text-decoration: none; color: #374151;
      font-size: 13px; font-weight: 500; transition: all 0.2s;
    }
    .quick-card:hover { border-color: #3CB371; color: #3CB371; }
    .quick-card mat-icon { color: #3CB371; }

    .faq-card, .tips-card { border-radius: 12px; margin-bottom: 24px; }
    .faq-card p { color: #4b5563; line-height: 1.6; margin: 0; }

    .contact-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    .contact-grid mat-card {
      padding: 20px; text-align: center; border-radius: 12px;
    }
    .contact-grid mat-icon { font-size: 32px; width: 32px; height: 32px; color: #3CB371; }
    .contact-grid h3 { margin: 8px 0; font-size: 16px; }
    .contact-grid p { font-size: 14px; color: #6b7280; margin: 0 0 8px; }
    .contact-grid small { color: #9ca3af; font-size: 12px; }

    .tips-card mat-card-title { display: flex; align-items: center; gap: 8px; }
    .tips-card mat-card-title mat-icon { color: #3CB371; }
    .tips-card ul { margin: 0; padding-left: 20px; color: #4b5563; line-height: 1.8; }

    @media (max-width: 768px) {
      .quick-links { grid-template-columns: repeat(2, 1fr); }
      .contact-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class HelpComponent {
  constructor(private authService: AuthService) {}

  get createMissionLink(): string {
    const user = this.authService.getCurrentUser();
    if (!user) return '/register';
    if (user.user_type === 'enterprise') return '/enterprise/missions/create';
    return '/client/missions/create';
  }

  get availableMissionsLink(): string {
    const user = this.authService.getCurrentUser();
    if (!user) return '/register';
    return '/provider/missions/available';
  }

  get disputesLink(): string {
    const user = this.authService.getCurrentUser();
    if (!user) return '/login';
    if (user.user_type === 'enterprise') return '/enterprise/disputes';
    if (user.user_type === 'admin') return '/admin/disputes';
    return '/client/disputes';
  }

  get profileLink(): string {
    const user = this.authService.getCurrentUser();
    if (!user) return '/login';
    const role = user.active_role || user.user_type;
    return `/${role}/profile`;
  }

  faqs = [
    {
      q: 'Comment publier une mission ?',
      a: 'Connectez-vous en tant que client, cliquez sur « Nouvelle mission », décrivez votre besoin, fixez le budget et payez via Mobile Money (Orange ou Moov). La mission est publiée après confirmation du paiement.',
    },
    {
      q: 'Comment devenir prestataire ?',
      a: 'Inscrivez-vous, activez le profil prestataire depuis votre espace client, complétez le KYC (NINA + téléphone) et ajoutez une méthode Mobile Money pour recevoir vos gains.',
    },
    {
      q: 'Comment fonctionne l\'escrow ?',
      a: 'Les fonds du client sont bloqués jusqu\'à validation de la mission. Le prestataire dépose une caution avant de démarrer. Le paiement est libéré automatiquement après votre validation ou après le délai d\'auto-validation.',
    },
    {
      q: 'Que faire en cas de litige ?',
      a: 'Ouvrez un litige depuis la mission concernée, joignez vos preuves (photos, messages). L\'équipe BlockTask arbitre selon les éléments fournis.',
    },
    {
      q: 'Paiement Mobile Money en test',
      a: 'En environnement de démonstration, utilisez le code OTP 1234 pour confirmer les paiements et retraits.',
    },
    {
      q: 'La blockchain est-elle obligatoire ?',
      a: 'Non. BlockTask fonctionne en mode hybride : paiements en FCFA via Mobile Money, avec ancrage blockchain optionnel sur Sepolia pour l\'escrow et les preuves.',
    },
  ];
}
