# Generated manually — fix UTF-8 mojibake in DB text fields on deploy

from django.db import migrations


def forwards(apps, schema_editor):
    from apps.common.mojibake import (
        fix_mojibake,
        looks_mojibake,
        should_skip_field,
        walk_fix_json,
    )
    from django.apps import apps as django_apps
    from django.db import models

    from django.db import connection

    existing_tables = set(connection.introspection.table_names())
    local_prefixes = ('apps.',)
    for model in django_apps.get_models():
        app_config = django_apps.get_app_config(model._meta.app_label)
        module = getattr(app_config, 'name', '') or ''
        if not module.startswith(local_prefixes):
            continue
        # Skip models whose table is not created yet (e.g. LandingSlide before 0005)
        if model._meta.db_table not in existing_tables:
            continue

        text_fields = []
        json_fields = []
        for field in model._meta.get_fields():
            if not isinstance(field, models.Field) or field.many_to_many or field.one_to_many:
                continue
            if should_skip_field(field.name):
                continue
            if isinstance(field, (models.CharField, models.TextField)):
                text_fields.append(field.name)
            elif isinstance(field, models.JSONField):
                json_fields.append(field.name)

        if not text_fields and not json_fields:
            continue

        for obj in model.objects.all().iterator(chunk_size=200):
            update_fields = []
            for name in text_fields:
                raw = getattr(obj, name, None)
                if not isinstance(raw, str) or not looks_mojibake(raw):
                    continue
                fixed = fix_mojibake(raw)
                if fixed is None:
                    continue
                setattr(obj, name, fixed)
                update_fields.append(name)
            for name in json_fields:
                raw = getattr(obj, name, None)
                if raw is None:
                    continue
                new_val, changed = walk_fix_json(raw)
                if changed:
                    setattr(obj, name, new_val)
                    update_fields.append(name)
            if update_fields:
                obj.save(update_fields=update_fields)


def backwards(apps, schema_editor):
    # Irreversible text repair
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('common', '0001_platform_settings'),
        ('missions', '0010_auto_validation_delay_48h'),
        ('users', '0011_employee_multi_enterprise_invites'),
        ('notifications', '0005_remove_notification_is_compact_and_more'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
