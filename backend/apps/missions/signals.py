from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Mission, MissionReview


@receiver(post_save, sender=Mission)
def on_mission_status_change(sender, instance, **kwargs):
    if instance.provider_id and instance.status == Mission.Status.COMPLETED:
        from apps.reputation.services import recalculate_reputation
        recalculate_reputation(
            instance.provider,
            event_type='mission_completed',
            mission=instance,
            description=f'Mission terminée: {instance.title}',
        )


@receiver(post_save, sender=MissionReview)
def on_review_received(sender, instance, created, **kwargs):
    if not created:
        return
    from apps.reputation.services import recalculate_reputation
    mission = instance.mission
    if instance.client_rating and mission.provider_id:
        recalculate_reputation(
            mission.provider,
            event_type='rating_received',
            mission=mission,
            description=f'Évaluation reçue: {instance.client_rating}/5',
        )
    if instance.provider_rating and mission.client_id:
        recalculate_reputation(
            mission.client,
            event_type='rating_received',
            mission=mission,
            description=f'Évaluation reçue: {instance.provider_rating}/5',
        )
