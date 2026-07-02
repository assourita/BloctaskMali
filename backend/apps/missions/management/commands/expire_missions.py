"""Traite les missions dont l'échéance est dépassée (remboursements, décisions client).

Usage :
    python manage.py expire_missions --dry-run   # aperçu sans écrire
    python manage.py expire_missions             # applique les changements

À planifier via cron / Tâches planifiées Windows (ex. toutes les heures).
"""
from django.core.management.base import BaseCommand

from apps.missions.services import process_expired_missions


class Command(BaseCommand):
    help = "Expire les missions en retard et gère les remboursements / décisions client."

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Affiche un message sans exécuter le traitement.',
        )

    def handle(self, *args, **options):
        if options['dry_run']:
            self.stdout.write(
                self.style.WARNING('Mode dry-run : aucune modification. Lancez sans --dry-run.')
            )
            return

        stats = process_expired_missions()
        self.stdout.write(
            self.style.SUCCESS(
                f"Traitement terminé — "
                f"expirées auto: {stats['auto_expired']}, "
                f"décisions notifiées: {stats['decision_notified']}, "
                f"annulées auto: {stats['auto_cancelled']}"
            )
        )
