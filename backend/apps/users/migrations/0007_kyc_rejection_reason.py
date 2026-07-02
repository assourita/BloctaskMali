from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0006_backfill_enterprise_names'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='kyc_rejection_reason',
            field=models.TextField(blank=True, default=''),
        ),
    ]
