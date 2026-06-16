from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Notification


@receiver(post_save, sender=Notification)
def send_notification(sender, instance, created, **kwargs):
    """Envoie la notification via les canaux configurés"""
    if created:
        # TODO: Envoyer push, email, SMS selon les préférences
        pass
