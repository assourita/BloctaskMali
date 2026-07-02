from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Notification
from .dispatchers import dispatch_notification


@receiver(post_save, sender=Notification)
def send_notification(sender, instance, created, **kwargs):
    if created:
        dispatch_notification(instance)
