from django.db import migrations


def backfill_enterprise_names(apps, schema_editor):
    EnterpriseProfile = apps.get_model('users', 'EnterpriseProfile')
    for profile in EnterpriseProfile.objects.select_related('user').iterator():
        user = profile.user
        updates = {}
        if not (profile.company_name or '').strip():
            name = (user.first_name or user.username or user.email.split('@')[0]).strip()
            if user.last_name and user.first_name:
                full = f'{user.first_name} {user.last_name}'.strip()
                if len(full) > len(name):
                    name = full
            updates['company_name'] = name
        if not (profile.city or '').strip() and (user.city or '').strip():
            updates['city'] = user.city.strip()
        if updates:
            EnterpriseProfile.objects.filter(pk=profile.pk).update(**updates)


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0005_backfill_dual_roles'),
    ]

    operations = [
        migrations.RunPython(backfill_enterprise_names, migrations.RunPython.noop),
    ]
