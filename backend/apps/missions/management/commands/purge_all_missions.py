"""Purge totale des missions et donnees liees (prod / demo).

Usage :
    python manage.py purge_all_missions --dry-run
    python manage.py purge_all_missions --confirm
    python manage.py purge_all_missions --confirm --keep-balances
"""
from django.core.management.base import BaseCommand, CommandError

from apps.missions.services import purge_all_mission_related_data


class Command(BaseCommand):
    help = (
        'Supprime TOUTES les missions et donnees inherentes '
        '(chats, preuves, litiges, paiements, escrow, cautions, GPS, notifs mission).'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Compte seulement, ne supprime rien.',
        )
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Obligatoire pour executer la suppression reelle.',
        )
        parser.add_argument(
            '--keep-balances',
            action='store_true',
            help='Ne remet pas a zero deposit_balance / compteurs profils.',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        if not dry_run and not options['confirm']:
            raise CommandError(
                'Refuse: ajoute --confirm pour purger, ou --dry-run pour simuler.'
            )

        stats = purge_all_mission_related_data(
            dry_run=dry_run,
            reset_balances=not options['keep_balances'],
        )
        mode = 'dry-run' if dry_run else 'APPLIQUE'
        self.stdout.write(self.style.WARNING(f'Purge missions ({mode})'))
        before = stats['before']
        for key, value in before.items():
            self.stdout.write(f'  avant {key}: {value}')

        if dry_run:
            self.stdout.write(self.style.SUCCESS('Aucune suppression (dry-run).'))
            return

        for key, value in stats.get('deleted', {}).items():
            self.stdout.write(f'  delete {key}: {value}')
        self.stdout.write(
            self.style.SUCCESS(
                f"Termine. Missions restantes: {stats.get('after_missions', '?')}"
            )
        )
