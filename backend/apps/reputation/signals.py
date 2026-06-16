from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import ReputationScore, ReputationHistory


@receiver(post_save, sender=ReputationScore)
def log_reputation_change(sender, instance, created, **kwargs):
    """Log les changements de réputation"""
    if not created:
        # TODO: Implémenter le calcul automatique
        pass
