"""
Service de création et envoi des notifications.
"""
import logging
from django.utils import timezone

from .models import Notification, NotificationPreference

logger = logging.getLogger(__name__)


def get_or_create_preferences(user):
    prefs, _ = NotificationPreference.objects.get_or_create(user=user)
    return prefs


def create_notification(
    user,
    notification_type: str,
    title: str,
    message: str,
    *,
    mission=None,
    dispute=None,
    priority='normal',
    channel='in_app',
    action_url='',
    data=None,
):
    """Crée une notification in-app (push/email/SMS à brancher ultérieurement)."""
    notification = Notification.objects.create(
        user=user,
        notification_type=notification_type,
        title=title,
        message=message,
        mission=mission,
        dispute=dispute,
        priority=priority,
        channel=channel,
        action_url=action_url,
        data=data or {},
        in_app_sent=True,
        sent_at=timezone.now(),
    )
    return notification


def notify_mission_event(mission, event_type: str, recipient, title: str, message: str):
    type_map = {
        'application': Notification.Type.MISSION_CREATED,
        'accepted': Notification.Type.MISSION_ACCEPTED,
        'started': Notification.Type.MISSION_STARTED,
        'proof_submitted': Notification.Type.MISSION_SUBMITTED,
        'completed': Notification.Type.MISSION_COMPLETED,
        'cancelled': Notification.Type.MISSION_CANCELLED,
    }
    return create_notification(
        user=recipient,
        notification_type=type_map.get(event_type, Notification.Type.MISSION_CREATED),
        title=title,
        message=message,
        mission=mission,
        action_url=f'/missions/{mission.id}',
    )
