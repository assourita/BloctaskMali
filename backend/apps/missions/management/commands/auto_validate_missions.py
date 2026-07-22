"""Validation automatique des missions soumises (délai client)."""
from django.core.management.base import BaseCommand

from apps.missions.services import process_auto_validations


class Command(BaseCommand):
    help = 'Valide automatiquement les missions soumises dont le délai client est dépassé'

    def handle(self, *args, **options):
        stats = process_auto_validations()
        self.stdout.write(self.style.SUCCESS(
            f"Auto-validation: {stats['validated']} validée(s), "
            f"{stats['skipped_dispute']} litige(s), {stats['errors']} erreur(s)"
        ))
