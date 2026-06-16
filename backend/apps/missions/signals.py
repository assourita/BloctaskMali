from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from .models import Mission, MissionStatusHistory, MissionApplication


@receiver(post_save, sender=Mission)
def log_mission_creation(sender, instance, created, **kwargs):
    """Log la création d'une mission"""
    if created:
        MissionStatusHistory.objects.create(
            mission=instance,
            old_status='',
            new_status=instance.status,
            changed_by=instance.client,
            reason='Mission créée'
        )


@receiver(pre_save, sender=Mission)
def track_status_change(sender, instance, **kwargs):
    """Track les changements de statut"""
    # Ne rien faire si c'est une création (pas d'ancienne instance)
    if instance._state.adding or not instance.pk:
        return
    
    try:
        old = Mission.objects.get(pk=instance.pk)
        if old.status != instance.status:
            # Le changement sera loggé par la vue
            pass
    except Mission.DoesNotExist:
        # Mission n'existe pas encore, ignorer
        pass
