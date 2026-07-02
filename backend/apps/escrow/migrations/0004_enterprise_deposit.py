from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0008_enterprise_deposit_managed_agents'),
        ('missions', '0007_mission_enterprise_provider'),
        ('escrow', '0003_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='EnterpriseDeposit',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=15)),
                ('currency', models.CharField(default='XOF', max_length=10)),
                ('status', models.CharField(
                    choices=[
                        ('active', 'Active'),
                        ('locked', 'Verrouillée'),
                        ('released', 'Libérée'),
                        ('forfeited', 'Confisquée'),
                    ],
                    default='active',
                    max_length=20,
                )),
                ('blockchain_deposit_id', models.CharField(blank=True, max_length=100)),
                ('deposit_tx_hash', models.CharField(blank=True, max_length=100)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('locked_at', models.DateTimeField(blank=True, null=True)),
                ('released_at', models.DateTimeField(blank=True, null=True)),
                ('enterprise', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='deposits',
                    to='users.enterpriseprofile',
                )),
                ('locked_for_mission', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='locked_enterprise_deposits',
                    to='missions.mission',
                )),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
