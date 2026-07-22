# Generated manually for multi-enterprise employee links + invites

import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0010_user_kyc_admin_override_user_kyc_admin_override_at_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='employee',
            name='user',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='employee_links',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddConstraint(
            model_name='employee',
            constraint=models.UniqueConstraint(
                condition=models.Q(('user__isnull', False)),
                fields=('enterprise', 'user'),
                name='uniq_employee_enterprise_user',
            ),
        ),
        migrations.CreateModel(
            name='EnterpriseInvite',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('email', models.EmailField(max_length=254)),
                ('role', models.CharField(choices=[('admin', 'Administrateur'), ('manager', 'Manager'), ('accountant', 'Comptable'), ('hr', 'Ressources Humaines'), ('agent', 'Agent')], default='agent', max_length=20)),
                ('position', models.CharField(blank=True, default='Agent terrain', max_length=100)),
                ('token', models.CharField(db_index=True, max_length=64, unique=True)),
                ('status', models.CharField(choices=[('pending', 'En attente'), ('accepted', 'Acceptée'), ('rejected', 'Refusée'), ('cancelled', 'Annulée'), ('expired', 'Expirée')], db_index=True, default='pending', max_length=20)),
                ('message', models.TextField(blank=True)),
                ('expires_at', models.DateTimeField()),
                ('responded_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('enterprise', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='provider_invites', to='users.enterpriseprofile')),
                ('invited_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='sent_enterprise_invites', to=settings.AUTH_USER_MODEL)),
                ('user', models.ForeignKey(blank=True, help_text='Prestataire cible si le compte existe déjà', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='enterprise_invites', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'enterprise_invites',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='enterpriseinvite',
            index=models.Index(fields=['email', 'status'], name='enterprise__email_7c8a1a_idx'),
        ),
        migrations.AddIndex(
            model_name='enterpriseinvite',
            index=models.Index(fields=['enterprise', 'status'], name='enterprise__enterpr_9b2c4d_idx'),
        ),
    ]
