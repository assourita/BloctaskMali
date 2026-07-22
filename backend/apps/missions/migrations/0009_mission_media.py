# Generated manually for MissionMedia (client context photos)

import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('missions', '0008_mission_provider_gps_consent'),
    ]

    operations = [
        migrations.CreateModel(
            name='MissionMedia',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('field_name', models.CharField(help_text='Nom du champ schéma (ex: context_photos, defect_photos)', max_length=100)),
                ('label', models.CharField(blank=True, max_length=255)),
                ('kind', models.CharField(choices=[('context', 'Photo contexte'), ('document', 'Document'), ('other', 'Autre')], default='context', max_length=20)),
                ('file', models.FileField(upload_to='missions/media/%Y/%m/%d/')),
                ('file_name', models.CharField(max_length=255)),
                ('file_size', models.PositiveIntegerField(default=0)),
                ('mime_type', models.CharField(blank=True, max_length=100)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('mission', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='media_files', to='missions.mission')),
                ('uploaded_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='uploaded_mission_media', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'mission_media',
                'ordering': ['created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='missionmedia',
            index=models.Index(fields=['mission', 'field_name'], name='mission_med_mission_6c0a0a_idx'),
        ),
    ]
