"""Envoi multi-canal des notifications (push, email, SMS)."""
import logging

import requests
from django.conf import settings

from apps.common.email_service import send_platform_email

logger = logging.getLogger(__name__)


def _send_email(user, notification):
    if not user.email:
        return False
    try:
        return send_platform_email(
            to=user.email,
            subject=notification.title,
            message=notification.message,
            fail_silently=True,
        )
    except Exception as exc:
        logger.warning(f'Email notification failed: {exc}')
        return False


def _send_sms(user, notification):
    sid = getattr(settings, 'TWILIO_ACCOUNT_SID', '')
    token = getattr(settings, 'TWILIO_AUTH_TOKEN', '')
    from_number = getattr(settings, 'TWILIO_PHONE_NUMBER', '')
    phone = getattr(user, 'phone_number', '') or ''
    if not all([sid, token, from_number, phone]):
        return False
    try:
        from twilio.rest import Client
        client = Client(sid, token)
        client.messages.create(
            body=f'{notification.title}: {notification.message[:140]}',
            from_=from_number,
            to=phone,
        )
        return True
    except Exception as exc:
        logger.warning(f'SMS notification failed: {exc}')
        return False


def _is_expo_push_token(token: str) -> bool:
    return token.startswith('ExponentPushToken[') or token.startswith('ExpoPushToken[')


def _send_expo_push(tokens, notification):
    if not tokens:
        return False
    try:
        payload = []
        for token in tokens:
            item = {
                'to': token,
                'title': notification.title[:200],
                'body': notification.message[:200],
                'sound': 'default',
                'data': {
                    'notification_id': str(notification.id),
                    'notification_type': notification.notification_type,
                    'action_url': notification.action_url or '',
                },
            }
            if notification.mission_id:
                item['data']['mission_id'] = str(notification.mission_id)
            payload.append(item)

        resp = requests.post(
            'https://exp.host/--/api/v2/push/send',
            json=payload,
            headers={
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            timeout=20,
        )
        if resp.status_code != 200:
            logger.warning('Expo push failed (%s): %s', resp.status_code, resp.text[:300])
            return False
        body = resp.json()
        tickets = body.get('data') or []
        return any(t.get('status') == 'ok' for t in tickets)
    except Exception as exc:
        logger.warning(f'Expo push notification failed: {exc}')
        return False


def _send_fcm_push(user, notification, tokens):
    creds_path = getattr(settings, 'FIREBASE_CREDENTIALS_PATH', '')
    if not creds_path:
        return False
    try:
        import firebase_admin
        from firebase_admin import credentials, messaging

        if not firebase_admin._apps:
            cred = credentials.Certificate(creds_path)
            firebase_admin.initialize_app(cred)

        message = messaging.MulticastMessage(
            notification=messaging.Notification(
                title=notification.title,
                body=notification.message[:200],
            ),
            tokens=tokens,
        )
        messaging.send_each_for_multicast(message)
        return True
    except Exception as exc:
        logger.warning(f'FCM push notification failed: {exc}')
        return False


def _send_push(user, notification):
    from apps.notifications.models import PushSubscription

    tokens = list(
        PushSubscription.objects.filter(user=user, is_active=True)
        .values_list('fcm_token', flat=True)
    )
    if not tokens:
        return False

    expo_tokens = [t for t in tokens if _is_expo_push_token(t)]
    fcm_tokens = [t for t in tokens if not _is_expo_push_token(t)]

    sent = False
    if expo_tokens:
        sent = _send_expo_push(expo_tokens, notification) or sent
    if fcm_tokens:
        sent = _send_fcm_push(user, notification, fcm_tokens) or sent
    return sent


def dispatch_notification(notification):
    """Envoie la notification selon les préférences utilisateur."""
    from apps.notifications.models import NotificationPreference

    prefs, _ = NotificationPreference.objects.get_or_create(user=notification.user)
    user = notification.user

    email_sent = False
    sms_sent = False
    push_sent = False

    if prefs.email_enabled and notification.priority in ('normal', 'high', 'urgent'):
        email_sent = _send_email(user, notification)
    if prefs.sms_enabled and notification.priority in ('high', 'urgent'):
        sms_sent = _send_sms(user, notification)
    if prefs.push_enabled:
        push_sent = _send_push(user, notification)

    notification.email_sent = email_sent
    notification.sms_sent = sms_sent
    notification.push_sent = push_sent
    notification.save(update_fields=['email_sent', 'sms_sent', 'push_sent'])
