"""Répare les libellés de catégories corrompus (M??nage, R??paration, etc.)."""

from django.db import migrations


def forwards(apps, schema_editor):
    from apps.missions.category_rules import repair_category_row

    Category = apps.get_model('missions', 'Category')
    for cat in Category.objects.all().iterator():
        changed = repair_category_row(cat)
        if changed:
            cat.save(update_fields=changed)


def backwards(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('common', '0002_fix_mojibake_text'),
        ('missions', '0010_auto_validation_delay_48h'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
