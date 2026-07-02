from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0008_enterprise_deposit_managed_agents'),
        ('missions', '0006_mission_expiry_decision'),
    ]

    operations = [
        migrations.AddField(
            model_name='mission',
            name='assigned_enterprise',
            field=models.ForeignKey(
                blank=True,
                help_text='Entreprise prestataire contractuelle (caution sur solde entreprise)',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='provider_missions',
                to='users.enterpriseprofile',
            ),
        ),
        migrations.AddField(
            model_name='mission',
            name='executing_employee',
            field=models.ForeignKey(
                blank=True,
                help_text='Employé terrain qui exécute la mission',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='executed_missions',
                to='users.employee',
            ),
        ),
    ]
