from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('missions', '0005_solicitation_enterprise'),
    ]

    operations = [
        migrations.AddField(
            model_name='mission',
            name='expiry_decision_pending',
            field=models.BooleanField(
                default=False,
                help_text="Le client doit choisir de continuer ou annuler après expiration de l'échéance",
            ),
        ),
        migrations.AddField(
            model_name='mission',
            name='expiry_decision_due_at',
            field=models.DateTimeField(
                blank=True,
                null=True,
                help_text='Date limite pour la décision client avant annulation automatique',
            ),
        ),
    ]
