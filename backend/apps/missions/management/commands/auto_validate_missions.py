"""Validation automatique des missions soumises (délai client)."""
from django.core.management.base import BaseCommand

from apps.missions.models import Mission
from apps.missions.services import complete_mission_and_payout, process_auto_validations


class Command(BaseCommand):
    help = 'Valide automatiquement les missions soumises dont le délai client est dépassé'

    def add_arguments(self, parser):
        parser.add_argument(
            '--all-submitted',
            action='store_true',
            help='Libère le paiement pour TOUTES les missions submitted sans litige ouvert (rattrapage).',
        )

    def handle(self, *args, **options):
        if options.get('all_submitted'):
            qs = Mission.objects.filter(status=Mission.Status.SUBMITTED).select_related(
                'client', 'provider', 'payment',
            )
            stats = {'validated': 0, 'skipped_dispute': 0, 'errors': 0, 'candidates': qs.count()}
            for mission in qs:
                result = complete_mission_and_payout(
                    mission,
                    changed_by=mission.client,
                    reason=(
                        'Rattrapage : preuves soumises, aucune validation ni litige client — '
                        'paiement libéré au prestataire'
                    ),
                )
                if result.get('ok'):
                    stats['validated'] += 1
                    self.stdout.write(f"  OK {mission.id} — {mission.title}")
                elif result.get('dispute_open'):
                    stats['skipped_dispute'] += 1
                else:
                    stats['errors'] += 1
                    self.stdout.write(self.style.WARNING(
                        f"  SKIP {mission.id}: {result.get('error')}"
                    ))
        else:
            stats = process_auto_validations()

        self.stdout.write(self.style.SUCCESS(
            f"Auto-validation: {stats.get('candidates', '?')} candidate(s), "
            f"{stats['validated']} validée(s), "
            f"{stats['skipped_dispute']} litige(s), {stats['errors']} erreur(s)"
        ))
