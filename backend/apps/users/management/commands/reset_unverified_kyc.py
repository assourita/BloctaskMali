"""Retire le statut « vérifié » des comptes sans validation KYC réelle.

Un compte est considéré comme réellement vérifié uniquement si :
    kyc_status == 'verified'  ET  kyc_verified_at IS NOT NULL
(c.-à-d. validé explicitement par un administrateur).

Pour tous les autres comptes (hors admin/staff), la commande :
    - rétrograde kyc_status='verified' (sans kyc_verified_at) vers 'pending'
      s'ils ont soumis un dossier, sinon 'not_required' ;
    - remet TrustFactor.identity_verified = False ;
    - remet EnterpriseProfile.is_verified = False.

Usage :
    python manage.py reset_unverified_kyc --dry-run   # aperçu sans écrire
    python manage.py reset_unverified_kyc             # applique les changements
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.users.models import User, EnterpriseProfile


class Command(BaseCommand):
    help = "Retire le statut vérifié des comptes dont le KYC n'a pas été validé par un admin."

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help="Affiche les comptes concernés sans modifier la base de données.",
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        users = User.objects.exclude(user_type=User.UserType.ADMIN).exclude(is_staff=True)

        kyc_downgraded = 0
        identity_cleared = 0
        enterprises_cleared = 0

        for user in users.iterator():
            genuinely_verified = (
                user.kyc_status == User.KYCStatus.VERIFIED and user.kyc_verified_at is not None
            )
            if genuinely_verified:
                continue

            changed_fields = []

            # 1) Rétrograder un statut "verified" non validé par l'admin.
            if user.kyc_status == User.KYCStatus.VERIFIED and user.kyc_verified_at is None:
                has_dossier = bool(
                    user.kyc_submitted_at
                    or user.nina
                    or user.id_card_front
                    or user.selfie_verification
                )
                user.kyc_status = (
                    User.KYCStatus.PENDING if has_dossier else User.KYCStatus.NOT_REQUIRED
                )
                changed_fields.append('kyc_status')
                kyc_downgraded += 1

            # 2) Retirer le marqueur d'identité vérifiée dans TrustFactor.
            trust = getattr(user, 'trust_factor', None)
            if trust is not None and trust.identity_verified:
                if not dry_run:
                    trust.identity_verified = False
                    trust.save(update_fields=['identity_verified', 'updated_at'])
                identity_cleared += 1

            if changed_fields and not dry_run:
                with transaction.atomic():
                    user.save(update_fields=changed_fields + ['updated_at'])

            if changed_fields or (trust is not None and not trust.identity_verified):
                self.stdout.write(f'  - {user.email} : {", ".join(changed_fields) or "identité réinitialisée"}')

        # 3) Entreprises : is_verified = False si le propriétaire n'est pas réellement vérifié.
        for ent in EnterpriseProfile.objects.select_related('user').filter(is_verified=True):
            owner = ent.user
            owner_verified = (
                owner is not None
                and owner.kyc_status == User.KYCStatus.VERIFIED
                and owner.kyc_verified_at is not None
            )
            if not owner_verified:
                enterprises_cleared += 1
                if not dry_run:
                    ent.is_verified = False
                    ent.verified_at = None
                    ent.save(update_fields=['is_verified', 'verified_at', 'updated_at'])

        prefix = '[DRY-RUN] ' if dry_run else ''
        self.stdout.write(self.style.SUCCESS(
            f'\n{prefix}Terminé : '
            f'{kyc_downgraded} statut(s) KYC rétrogradé(s), '
            f'{identity_cleared} identité(s) réinitialisée(s), '
            f'{enterprises_cleared} entreprise(s) dévérifiée(s).'
        ))
        if dry_run:
            self.stdout.write(self.style.WARNING(
                'Aucune modification écrite. Relancez sans --dry-run pour appliquer.'
            ))
