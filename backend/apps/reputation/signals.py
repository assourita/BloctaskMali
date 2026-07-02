from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import ReputationScore, ReputationPenalty
from .services import recalculate_reputation


@receiver(post_save, sender=ReputationPenalty)
def on_penalty_applied(sender, instance, created, **kwargs):
    if created:
        recalculate_reputation(
            instance.user,
            event_type='penalty',
            mission=instance.mission,
            description=f'Pénalité: {instance.get_penalty_type_display()} (-{instance.points_deducted})',
        )
