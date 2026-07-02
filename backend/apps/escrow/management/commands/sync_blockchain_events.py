"""Synchronise les événements blockchain vers la base de données."""
import logging
from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Synchronise les événements EscrowContract depuis la blockchain'

    def add_arguments(self, parser):
        parser.add_argument('--from-block', type=int, default=0)

    def handle(self, *args, **options):
        from apps.escrow.services import blockchain_service

        result = blockchain_service.sync_events(from_block=options['from_block'])
        if result.get('error'):
            self.stderr.write(result['error'])
            return

        for name, count in result.get('by_event', {}).items():
            self.stdout.write(f'{name}: {count} événement(s)')
        self.stdout.write(self.style.SUCCESS(f"Synchronisation terminée ({result.get('synced', 0)} total)"))
