from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('missions', '0010_auto_validation_delay_48h'),
    ]

    operations = [
        migrations.AddField(
            model_name='mission',
            name='listing_mode',
            field=models.CharField(
                choices=[('open', 'Appel ouvert'), ('invite_only', 'Sur invitation')],
                default='open',
                help_text='open = visible sur le marché / appels ; invite_only = sollicitation ciblée uniquement',
                max_length=20,
            ),
        ),
    ]
