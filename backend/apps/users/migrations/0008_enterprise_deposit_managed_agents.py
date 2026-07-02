from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0007_kyc_rejection_reason'),
    ]

    operations = [
        migrations.AddField(
            model_name='enterpriseprofile',
            name='deposit_balance',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=15),
        ),
        migrations.AddField(
            model_name='enterpriseprofile',
            name='deposit_locked',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=15),
        ),
        migrations.AddField(
            model_name='providerprofile',
            name='managed_by_enterprise',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='field_agents',
                to='users.enterpriseprofile',
            ),
        ),
    ]
