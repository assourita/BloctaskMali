from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('missions', '0007_mission_enterprise_provider'),
    ]

    operations = [
        migrations.AddField(
            model_name='mission',
            name='provider_gps_consent_at',
            field=models.DateTimeField(
                blank=True,
                null=True,
                help_text="Prestataire a accepté le partage GPS jusqu'à la fin de la mission",
            ),
        ),
    ]
