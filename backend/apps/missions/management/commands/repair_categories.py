"""Répare les noms/descriptions de catégories (accents corrompus).

Usage :
    python manage.py repair_categories
    python manage.py repair_categories --dry-run
"""
from django.core.management.base import BaseCommand

from apps.missions.category_rules import repair_category_row
from apps.missions.models import Category


class Command(BaseCommand):
    help = 'Corrige name/description des catégories (M??nage → Ménage, etc.).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Affiche les corrections sans écrire.',
        )

    def handle(self, *args, **options):
        dry = options['dry_run']
        fixed = 0
        for cat in Category.objects.all().iterator():
            before_name = cat.name
            before_desc = cat.description
            changed = repair_category_row(cat)
            if not changed:
                continue
            fixed += 1
            self.stdout.write(f'  [{cat.slug}]')
            if 'name' in changed:
                self.stdout.write(f'    name: {before_name!r} -> {cat.name!r}')
            if 'description' in changed:
                self.stdout.write(f'    desc: {before_desc!r} -> {cat.description!r}')
            if not dry:
                cat.save(update_fields=changed)

        mode = 'dry-run' if dry else 'appliqué'
        self.stdout.write(self.style.SUCCESS(f'Terminé ({mode}) — {fixed} catégorie(s) corrigée(s)'))
