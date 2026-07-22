# Generated manually for ConversationParticipant

import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('chat', '0002_message_delivered_at'),
    ]

    operations = [
        migrations.CreateModel(
            name='ConversationParticipant',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('role', models.CharField(choices=[('pickup_contact', 'Contact départ'), ('delivery_contact', 'Contact arrivée'), ('other', 'Autre')], default='other', max_length=30)),
                ('label', models.CharField(blank=True, max_length=120)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('conversation', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='extra_participants', to='chat.conversation')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='mission_chat_participations', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'chat_conversation_participants',
                'ordering': ['created_at'],
                'unique_together': {('conversation', 'user')},
            },
        ),
    ]
