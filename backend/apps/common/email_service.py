"""Envoi d'emails transactionnels (SendGrid, Resend, SMTP Django)."""
import logging

import requests
from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def send_platform_email(
    *,
    to: str,
    subject: str,
    message: str,
    html: str | None = None,
    fail_silently: bool = False,
) -> bool:
    if not to:
        return False

    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@blocktask.ml')

    resend_key = getattr(settings, 'RESEND_API_KEY', '')
    if resend_key:
        try:
            payload = {
                'from': from_email,
                'to': [to],
                'subject': subject,
                'text': message,
            }
            if html:
                payload['html'] = html
            resp = requests.post(
                'https://api.resend.com/emails',
                headers={
                    'Authorization': f'Bearer {resend_key}',
                    'Content-Type': 'application/json',
                },
                json=payload,
                timeout=20,
            )
            if resp.status_code in (200, 201):
                return True
            logger.warning('Resend email failed (%s): %s', resp.status_code, resp.text[:300])
            if fail_silently:
                return False
            raise RuntimeError(f'Resend error: {resp.text[:200]}')
        except Exception as exc:
            logger.warning('Resend email exception: %s', exc)
            if fail_silently:
                return False
            raise

    sendgrid_key = getattr(settings, 'SENDGRID_API_KEY', '')
    if sendgrid_key:
        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail

            mail = Mail(
                from_email=from_email,
                to_emails=to,
                subject=subject,
                plain_text_content=message,
            )
            if html:
                mail.add_content(html, 'text/html')
            SendGridAPIClient(sendgrid_key).send(mail)
            return True
        except Exception as exc:
            logger.warning('SendGrid email exception: %s', exc)
            if fail_silently:
                return False
            raise

    send_mail(
        subject=subject,
        message=message,
        from_email=from_email,
        recipient_list=[to],
        fail_silently=fail_silently,
        html_message=html,
    )
    return True
