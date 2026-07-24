"""Envoie un email de test via la stack plateforme (SMTP / Resend / SendGrid).

Usage :
    python manage.py send_test_email vous@gmail.com
"""
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.common.email_service import send_platform_email


class Command(BaseCommand):
    help = 'Envoie un email de test pour valider la configuration SMTP.'

    def add_arguments(self, parser):
        parser.add_argument('to', type=str, help='Adresse destinataire')

    def handle(self, *args, **options):
        to = options['to'].strip()
        if '@' not in to:
            raise CommandError('Adresse email invalide.')

        backend = settings.EMAIL_BACKEND
        host = settings.EMAIL_HOST
        user = settings.EMAIL_HOST_USER or '(vide)'
        from_email = settings.DEFAULT_FROM_EMAIL
        has_smtp = bool(settings.EMAIL_HOST_USER and settings.EMAIL_HOST_PASSWORD)
        has_resend = bool(getattr(settings, 'RESEND_API_KEY', ''))
        has_sendgrid = bool(getattr(settings, 'SENDGRID_API_KEY', ''))

        self.stdout.write(f'EMAIL_BACKEND={backend}')
        self.stdout.write(f'DEFAULT_FROM_EMAIL={from_email}')
        self.stdout.write(f'EMAIL_HOST={host} user={user}')
        self.stdout.write(
            f'Providers: resend={"oui" if has_resend else "non"} '
            f'sendgrid={"oui" if has_sendgrid else "non"} '
            f'smtp={"oui" if has_smtp else "non"}'
        )

        if not has_resend and not has_sendgrid and not has_smtp:
            raise CommandError(
                'Aucune credentielle email. '
                'Renseignez EMAIL_HOST_USER + EMAIL_HOST_PASSWORD (Gmail App Password), '
                'ou RESEND_API_KEY / SENDGRID_API_KEY.'
            )

        send_platform_email(
            to=to,
            subject='BlockTask — test SMTP',
            message=(
                'Ceci est un email de test BlockTask.\n'
                'Si vous le recevez, la verification email SMTP fonctionne.\n'
            ),
            html=(
                '<p>Ceci est un email de test <strong>BlockTask</strong>.</p>'
                '<p>Si vous le recevez, la verification email SMTP fonctionne.</p>'
            ),
            fail_silently=False,
        )
        self.stdout.write(self.style.SUCCESS(f'Email envoye a {to}'))
