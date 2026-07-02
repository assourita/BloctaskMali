from django.db import migrations


def backfill_dual_roles(apps, schema_editor):
    User = apps.get_model('users', 'User')
    for user in User.objects.filter(user_type='provider', secondary_role__isnull=True):
        user.secondary_role = 'client'
        user.save(update_fields=['secondary_role'])
    for user in User.objects.filter(active_role__isnull=True):
        user.active_role = user.user_type
        user.save(update_fields=['active_role'])
    for user in User.objects.filter(active_role=''):
        user.active_role = user.user_type
        user.save(update_fields=['active_role'])


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0004_pan_africa_market_defaults'),
    ]

    operations = [
        migrations.RunPython(backfill_dual_roles, migrations.RunPython.noop),
    ]
