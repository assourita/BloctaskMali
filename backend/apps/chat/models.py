import uuid

from django.conf import settings
from django.db import models


class Conversation(models.Model):
    """Fil de discussion lié à une mission (client ↔ prestataire)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    mission = models.OneToOneField(
        'missions.Mission',
        on_delete=models.CASCADE,
        related_name='conversation',
    )
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='client_conversations',
    )
    provider = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='provider_conversations',
    )
    is_closed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['client', '-updated_at']),
            models.Index(fields=['provider', '-updated_at']),
        ]

    def __str__(self):
        return f'Chat mission {self.mission_id}'


class Message(models.Model):
    class MessageType(models.TextChoices):
        TEXT = 'text', 'Texte'
        IMAGE = 'image', 'Image'
        LOCATION = 'location', 'Position'
        SYSTEM = 'system', 'Système'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages',
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='chat_messages',
    )
    content = models.TextField()
    message_type = models.CharField(
        max_length=20,
        choices=MessageType.choices,
        default=MessageType.TEXT,
    )
    attachment_url = models.URLField(blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['conversation', 'created_at']),
        ]

    def __str__(self):
        return f'{self.sender_id}: {self.content[:40]}'
