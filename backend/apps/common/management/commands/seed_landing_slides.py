"""Importe les images du carrousel landing vers le stockage media (local / R2)."""
from pathlib import Path

from django.conf import settings
from django.core.files import File
from django.core.management.base import BaseCommand

from apps.common.models import LandingSlide

SLIDES = [
    ('aidemeanagere.webp', 'Aide ménagère', 'Aide ménagère', 10),
    ('coursesetachats.webp', 'Courses et achats', 'Courses', 20),
    ('demenagement.webp', 'Déménagement', 'Déménagement', 30),
    ('gardiennage.webp', 'Gardiennage', 'Gardiennage', 40),
    ('jardinage.webp', 'Jardinage', 'Jardinage', 50),
    ('livraisondecolis.webp', 'Livraison de colis', 'Livraison', 60),
    ('livraisonmedicale.webp', 'Livraison médicale', 'Livraison médicale', 70),
    ('reparation.webp', 'Réparation', 'Réparation', 80),
]


class Command(BaseCommand):
    help = 'Seed landing carousel slides into media storage (MEDIA_ROOT or R2)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Replace existing slide images even if already present',
        )

    def handle(self, *args, **options):
        force = options['force']
        source_dirs = [
            Path(settings.BASE_DIR) / 'fixtures' / 'carousel',
            Path(settings.BASE_DIR).parent / 'frontend' / 'src' / 'assets' / 'images' / 'carousel',
        ]
        source_dir = next((d for d in source_dirs if d.is_dir()), None)
        if not source_dir:
            self.stderr.write(self.style.ERROR(
                'Dossier carousel introuvable. Attendu: backend/fixtures/carousel/ '
                'ou frontend/src/assets/images/carousel/'
            ))
            return

        created = updated = skipped = 0
        for filename, title, query, order in SLIDES:
            src = source_dir / filename
            if not src.is_file():
                self.stderr.write(self.style.WARNING(f'Manquant: {src.name}'))
                skipped += 1
                continue

            slide, was_created = LandingSlide.objects.get_or_create(
                title=title,
                defaults={
                    'search_query': query,
                    'order': order,
                    'is_active': True,
                },
            )
            if was_created:
                created += 1
            else:
                slide.search_query = query
                slide.order = order
                slide.is_active = True
                updated += 1

            if was_created or force or not slide.image:
                with src.open('rb') as fh:
                    slide.image.save(filename, File(fh), save=True)
                self.stdout.write(self.style.SUCCESS(f'OK {title} -> {slide.image.name}'))
            else:
                slide.save(update_fields=['search_query', 'order', 'is_active', 'updated_at'])
                self.stdout.write(f'- {title} (image existante)')

        self.stdout.write(self.style.SUCCESS(
            f'Termine: {created} crees, {updated} mis a jour, {skipped} manquants'
        ))
