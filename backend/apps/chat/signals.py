from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.missions.models import Mission

from .services import close_conversation_for_mission, get_or_create_conversation


@receiver(post_save, sender=Mission)
def sync_mission_chat(sender, instance: Mission, **kwargs):
    if instance.status == Mission.Status.IN_PROGRESS and instance.provider_id:
        get_or_create_conversation(instance)
    elif instance.status == Mission.Status.COMPLETED:
        close_conversation_for_mission(instance)
