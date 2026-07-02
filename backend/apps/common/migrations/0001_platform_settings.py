from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='PlatformSettings',
            fields=[
                ('singleton_key', models.CharField(default='default', max_length=20, primary_key=True, serialize=False)),
                ('maintenance_mode', models.BooleanField(default=False)),
                ('registration_open', models.BooleanField(default=True)),
                ('email_notifications', models.BooleanField(default=True)),
                ('service_fee_percent', models.DecimalField(decimal_places=2, default=5, max_digits=5)),
                ('default_currency', models.CharField(default='FCFA', max_length=10)),
                ('require_2fa_admin', models.BooleanField(default=True)),
                ('require_kyc', models.BooleanField(default=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Paramètres plateforme',
                'verbose_name_plural': 'Paramètres plateforme',
                'db_table': 'platform_settings',
            },
        ),
    ]
