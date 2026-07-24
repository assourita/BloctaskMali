"""Purge des missions terminées anciennes sans litige ouvert.

Usage :
    python manage.py purge_completed_missions --dry-run
    python manage.py purge_completed_missions
    python manage.py purge_completed_missions --days 30
"""
from django.core.management.base import BaseCommand

from apps.missions.services import COMPLETED_RETENTION_DAYS, purge_old_completed_missions


class Command(BaseCommand):
    help = (
        "Supprime les missions status=completed datant de plus de N jours "
        "lorsqu'aucun litige n'est ouvert."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=COMPLETED_RETENTION_DAYS,
            help=f'Rétention en jours (défaut : {COMPLETED_RETENTION_DAYS}).',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Liste le nombre de candidates sans supprimer.',
        )

    def handle(self, *args, **options):
        stats = purge_old_completed_missions(
            retention_days=options['days'],
            dry_run=options['dry_run'],
        )
        mode = 'dry-run' if stats['dry_run'] else 'appliqué'
        self.stdout.write(
            self.style.SUCCESS(
                f"Purge ({mode}) — rétention {stats['retention_days']}j : "
                f"candidates={stats['candidates']}, deleted={stats['deleted']}, "
                f"conservées (litige ouvert)={stats['skipped_open_dispute']}"
                + (
                    f", objets cascade={stats.get('cascaded_objects', 0)}"
                    if not stats['dry_run']
                    else ''
                )
            )
        )
