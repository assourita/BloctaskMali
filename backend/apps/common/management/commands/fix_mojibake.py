"""Repère et corrige les caractères mal encodés (mojibake) en base.

Usage (Render / local) :
    python manage.py fix_mojibake
    python manage.py fix_mojibake --apply
    python manage.py fix_mojibake --model missions.Category --apply
    python manage.py fix_mojibake --only-apps missions,users --apply

Par défaut : dry-run (affiche les corrections sans écrire).
"""
from __future__ import annotations

from django.apps import apps
from django.core.management.base import BaseCommand
from django.db import models, transaction
from django.db.models import Q

from apps.common.mojibake import (
    fix_mojibake,
    looks_mojibake,
    should_skip_field,
    walk_fix_json,
)


class Command(BaseCommand):
    help = (
        "Detecte les chaines UTF-8 mal encodees (ex. Menage mojibake -> Menage) "
        "et les corrige. Dry-run par defaut ; passer --apply pour ecrire."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--apply',
            action='store_true',
            help='Applique les corrections en base (sinon dry-run).',
        )
        parser.add_argument(
            '--model',
            action='append',
            dest='models',
            default=[],
            help='Limiter à un modèle (app_label.ModelName). Répétable.',
        )
        parser.add_argument(
            '--only-apps',
            type=str,
            default='',
            help='Limiter aux apps locales (ex. missions,users,common).',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=0,
            help='Max de corrections à afficher/appliquer (0 = illimité).',
        )

    def handle(self, *args, **options):
        apply = options['apply']
        limit = options['limit']
        only_apps = {
            a.strip() for a in options['only_apps'].split(',') if a.strip()
        }
        model_filters = options['models']

        targets = self._resolve_models(model_filters, only_apps)
        if not targets:
            self.stderr.write(self.style.ERROR('Aucun modèle à scanner.'))
            return

        mode = 'APPLY' if apply else 'DRY-RUN'
        self.stdout.write(self.style.WARNING(f'fix_mojibake [{mode}] — {len(targets)} modèle(s)'))

        total_hits = 0
        total_fixed = 0

        for model in targets:
            hits, fixed = self._scan_model(model, apply=apply, limit=limit, already=total_hits)
            total_hits += hits
            total_fixed += fixed
            if limit and total_hits >= limit:
                break

        self.stdout.write('')
        self.stdout.write(
            self.style.SUCCESS(
                f'Terminé — champs touchés: {total_hits}, '
                f'enregistrements mis à jour: {total_fixed}'
                + ('' if apply else ' (dry-run, rien écrit ; relancer avec --apply)')
            )
        )

    def _resolve_models(self, model_filters, only_apps):
        if model_filters:
            out = []
            for label in model_filters:
                try:
                    out.append(apps.get_model(label))
                except LookupError:
                    self.stderr.write(self.style.ERROR(f'Modèle inconnu: {label}'))
            return out

        local_prefixes = ('apps.',)
        out = []
        for model in apps.get_models():
            app_label = model._meta.app_label
            app_config = apps.get_app_config(app_label)
            module = getattr(app_config, 'name', '') or ''
            if not module.startswith(local_prefixes):
                continue
            if only_apps and app_label not in only_apps:
                continue
            out.append(model)
        return out

    def _text_fields(self, model):
        fields = []
        for field in model._meta.get_fields():
            if not isinstance(field, models.Field) or field.many_to_many or field.one_to_many:
                continue
            if should_skip_field(field.name):
                continue
            if isinstance(field, (models.CharField, models.TextField)):
                fields.append(('text', field))
            elif isinstance(field, models.JSONField):
                fields.append(('json', field))
        return fields

    def _scan_model(self, model, apply: bool, limit: int, already: int):
        fields = self._text_fields(model)
        if not fields:
            return 0, 0

        label = f'{model._meta.app_label}.{model.__name__}'
        text_names = [f.name for kind, f in fields if kind == 'text']
        json_names = [f.name for kind, f in fields if kind == 'json']

        # Filtre SQL approximatif pour accélérer (marqueurs Latin-1 courants)
        q = Q()
        for name in text_names:
            q |= Q(**{f'{name}__contains': 'Ã'}) | Q(**{f'{name}__contains': 'Â'}) | Q(**{f'{name}__contains': 'â'})

        qs = model.objects.all()
        if text_names and q:
            # Inclure aussi les lignes JSON (scan complet si JSON présent)
            if json_names:
                qs = model.objects.all()
            else:
                qs = model.objects.filter(q)

        hits = 0
        updated_rows = 0
        shown_header = False

        for obj in qs.iterator(chunk_size=200):
            if limit and already + hits >= limit:
                break

            changes = {}
            for kind, field in fields:
                raw = getattr(obj, field.name, None)
                if raw is None:
                    continue
                if kind == 'text':
                    if not isinstance(raw, str) or not looks_mojibake(raw):
                        continue
                    fixed = fix_mojibake(raw)
                    if fixed is None:
                        continue
                    changes[field.name] = (raw, fixed)
                else:  # json
                    new_val, changed = walk_fix_json(raw)
                    if changed:
                        changes[field.name] = (raw, new_val)

            if not changes:
                continue

            if not shown_header:
                self.stdout.write(self.style.MIGRATE_HEADING(f'\n[{label}]'))
                shown_header = True

            pk = obj.pk
            for fname, (old, new) in changes.items():
                hits += 1
                old_preview = self._preview(old)
                new_preview = self._preview(new)
                self.stdout.write(f'  pk={pk}  {fname}:')
                self.stdout.write(f'    - {old_preview}')
                self.stdout.write(self.style.SUCCESS(f'    + {new_preview}'))
                if limit and already + hits >= limit:
                    break

            if apply:
                with transaction.atomic():
                    for fname, (_old, new) in changes.items():
                        setattr(obj, fname, new)
                    update_fields = list(changes.keys())
                    # Toucher updated_at si présent
                    if hasattr(obj, 'updated_at') and 'updated_at' not in update_fields:
                        try:
                            from django.utils import timezone
                            obj.updated_at = timezone.now()
                            update_fields.append('updated_at')
                        except Exception:
                            pass
                    obj.save(update_fields=update_fields)
                updated_rows += 1

        return hits, updated_rows

    @staticmethod
    def _preview(value, max_len: int = 120) -> str:
        if isinstance(value, (dict, list)):
            text = repr(value)
        else:
            text = str(value).replace('\n', ' ')
        if len(text) > max_len:
            return text[: max_len - 1] + '…'
        return text
