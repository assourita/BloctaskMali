"""
Intégration Mobile Money — Mali (Orange Money, Moov Money).
Mode sandbox par défaut ; brancher les APIs réelles via les variables d'environnement.
"""
import logging
import os
import uuid
from decimal import Decimal
from typing import Optional

import requests
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


class MobileMoneyError(Exception):
    def __init__(self, message: str, code: str = 'payment_failed'):
        self.code = code
        super().__init__(message)


class BaseMobileMoneyProvider:
    operator_id: str = ''
    operator_name: str = ''

    def initiate_payment(self, payment, otp: Optional[str] = None) -> dict:
        raise NotImplementedError


class OrangeMoneyMali(BaseMobileMoneyProvider):
    operator_id = 'orange'
    operator_name = 'Orange Money Mali'

    def initiate_payment(self, payment, otp: Optional[str] = None) -> dict:
        cfg = getattr(settings, 'MOBILE_MONEY_CONFIG', {})
        api_key = cfg.get('ORANGE_MONEY_API_KEY', '')
        merchant_id = cfg.get('ORANGE_MONEY_MERCHANT_ID', '')
        sandbox = cfg.get('SANDBOX', True)

        if sandbox or not api_key:
            return self._sandbox_payment(payment, otp)

        # Production — API Orange Money Mali (Omci)
        base_url = cfg.get('ORANGE_MONEY_API_URL', 'https://api.orange.com/orange-money-webpay/ml/v1')
        payload = {
            'merchant_key': merchant_id,
            'currency': payment.currency,
            'order_id': str(payment.id),
            'amount': str(int(payment.amount)),
            'return_url': cfg.get('PAYMENT_RETURN_URL', ''),
            'cancel_url': cfg.get('PAYMENT_CANCEL_URL', ''),
            'notif_url': cfg.get('PAYMENT_WEBHOOK_URL', ''),
            'lang': 'fr',
            'reference': f'BlockTask-{payment.mission_id}',
        }
        try:
            resp = requests.post(
                f'{base_url}/webpayment',
                json=payload,
                headers={'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'},
                timeout=30,
            )
            resp.raise_for_status()
            data = resp.json()
            return {
                'success': True,
                'transaction_id': data.get('pay_token') or data.get('transaction_id', ''),
                'payment_url': data.get('payment_url'),
                'message': 'Paiement Orange Money initié',
                'sandbox': False,
            }
        except requests.RequestException as exc:
            logger.error('Orange Money API error: %s', exc)
            raise MobileMoneyError('Échec Orange Money Mali', 'orange_api_error') from exc

    def _sandbox_payment(self, payment, otp: Optional[str]) -> dict:
        if otp and otp not in ('1234', '0000', '1111'):
            raise MobileMoneyError(
                'Code OTP invalide. En mode test, utilisez 1234.',
                'invalid_otp'
            )
        tx_id = f'OM-SBX-{uuid.uuid4().hex[:12].upper()}'
        return {
            'success': True,
            'transaction_id': tx_id,
            'message': f'[Sandbox] Paiement Orange Money {payment.amount} {payment.currency} confirmé',
            'sandbox': True,
        }


class MoovMoneyMali(BaseMobileMoneyProvider):
    operator_id = 'moov'
    operator_name = 'Moov Money Mali'

    def initiate_payment(self, payment, otp: Optional[str] = None) -> dict:
        cfg = getattr(settings, 'MOBILE_MONEY_CONFIG', {})
        api_key = cfg.get('MOOV_MONEY_API_KEY', '')
        sandbox = cfg.get('SANDBOX', True)

        if sandbox or not api_key:
            return self._sandbox_payment(payment, otp)

        base_url = cfg.get('MOOV_MONEY_API_URL', 'https://api.moov-africa.ml/payment/v1')
        payload = {
            'amount': str(int(payment.amount)),
            'currency': payment.currency,
            'phone': payment.phone_number,
            'reference': str(payment.id),
            'description': f'BlockTask mission {payment.mission_id}',
        }
        try:
            resp = requests.post(
                f'{base_url}/charge',
                json=payload,
                headers={'X-API-Key': api_key, 'Content-Type': 'application/json'},
                timeout=30,
            )
            resp.raise_for_status()
            data = resp.json()
            return {
                'success': True,
                'transaction_id': data.get('transaction_id', ''),
                'message': 'Paiement Moov Money initié',
                'sandbox': False,
            }
        except requests.RequestException as exc:
            logger.error('Moov Money API error: %s', exc)
            raise MobileMoneyError('Échec Moov Money Mali', 'moov_api_error') from exc

    def _sandbox_payment(self, payment, otp: Optional[str]) -> dict:
        if otp and otp not in ('1234', '0000', '1111'):
            raise MobileMoneyError(
                'Code OTP invalide. En mode test, utilisez 1234.',
                'invalid_otp'
            )
        tx_id = f'MV-SBX-{uuid.uuid4().hex[:12].upper()}'
        return {
            'success': True,
            'transaction_id': tx_id,
            'message': f'[Sandbox] Paiement Moov Money {payment.amount} {payment.currency} confirmé',
            'sandbox': True,
        }


PROVIDERS = {
    'orange': OrangeMoneyMali(),
    'moov': MoovMoneyMali(),
}


class MobileMoneyService:
    """Orchestre les paiements Mobile Money UEMOA."""

    @staticmethod
    def get_provider(operator: str) -> BaseMobileMoneyProvider:
        provider = PROVIDERS.get(operator)
        if not provider:
            raise MobileMoneyError(
                f'Opérateur « {operator} » non supporté pour le Mali. Utilisez orange ou moov.',
                'unsupported_operator'
            )
        return provider

    @classmethod
    def charge_deposit(
        cls,
        *,
        amount,
        phone_number: str,
        operator: str,
        otp: Optional[str] = None,
        reference: str = '',
    ) -> dict:
        """Débite un compte Mobile Money pour alimenter le solde caution."""
        from types import SimpleNamespace

        payment = SimpleNamespace(
            id=uuid.uuid4(),
            amount=amount,
            currency='XOF',
            phone_number=phone_number,
            operator=operator,
            mission_id=reference or 'deposit-fund',
            payment_method='mobile_money',
        )
        provider = cls.get_provider(operator)
        return provider.initiate_payment(payment, otp=otp)

    @classmethod
    def process_payment(cls, payment, otp: Optional[str] = None) -> dict:
        if payment.payment_method != payment.PaymentMethod.MOBILE_MONEY:
            raise MobileMoneyError('Méthode de paiement non Mobile Money')

        if not payment.phone_number:
            raise MobileMoneyError('Numéro Mobile Money requis')
        if not payment.operator:
            raise MobileMoneyError('Opérateur Mobile Money requis (orange ou moov)')

        provider = cls.get_provider(payment.operator)
        result = provider.initiate_payment(payment, otp=otp)

        payment.external_transaction_id = result.get('transaction_id', '')
        payment.external_reference = f'BT-{payment.id}'
        payment.status = payment.Status.COMPLETED
        payment.processed_at = timezone.now()
        payment.completed_at = timezone.now()
        payment.metadata = {
            **(payment.metadata or {}),
            'mobile_money_result': result,
            'operator_name': provider.operator_name,
        }
        payment.save()

        mission = payment.mission
        mission.status = mission.Status.FUNDED
        mission.escrow_tx_hash = result.get('transaction_id', '')
        mission.save(update_fields=['status', 'escrow_tx_hash', 'updated_at'])

        from apps.escrow.services import escrow_service
        escrow_service.confirm_escrow_deposit(
            mission,
            tx_hash=result.get('transaction_id', ''),
        )

        from apps.notifications.services import notify_mission_event
        notify_mission_event(
            mission, 'accepted', payment.client,
            'Mission financée',
            f'Votre paiement de {payment.amount} {payment.currency} est confirmé. La mission est publiée.'
        )

        return result

    @classmethod
    def release_to_provider(cls, payment) -> dict:
        """Libère les fonds au prestataire après validation mission."""
        mission = payment.mission
        provider = mission.provider
        if not provider:
            raise MobileMoneyError('Aucun prestataire assigné')

        amount = payment.provider_amount or (payment.amount * Decimal('0.95'))
        tx_id = f'PAYOUT-{uuid.uuid4().hex[:12].upper()}'

        payment.metadata = {
            **(payment.metadata or {}),
            'provider_payout': {
                'transaction_id': tx_id,
                'amount': str(amount),
                'provider_id': str(provider.id),
                'released_at': timezone.now().isoformat(),
            },
        }
        payment.save(update_fields=['metadata'])

        from apps.notifications.services import notify_mission_event
        notify_mission_event(
            mission, 'completed', provider,
            'Paiement reçu',
            f'Vous avez reçu {amount} {payment.currency} pour la mission « {mission.title} »'
        )

        return {'transaction_id': tx_id, 'amount': str(amount), 'sandbox': True}

    @classmethod
    def refund_to_client(cls, payment, reason: str = '') -> dict:
        """Rembourse le client (annulation ou expiration de mission)."""
        if payment.status == payment.Status.REFUNDED:
            return {
                'transaction_id': payment.metadata.get('client_refund', {}).get('transaction_id', ''),
                'amount': str(payment.escrow_amount or payment.amount),
                'sandbox': True,
                'already_refunded': True,
            }

        amount = payment.escrow_amount or payment.amount
        tx_id = f'REFUND-{uuid.uuid4().hex[:12].upper()}'

        payment.metadata = {
            **(payment.metadata or {}),
            'client_refund': {
                'transaction_id': tx_id,
                'amount': str(amount),
                'reason': reason,
                'refunded_at': timezone.now().isoformat(),
            },
        }
        payment.save(update_fields=['metadata'])

        from apps.notifications.services import notify_mission_event
        notify_mission_event(
            payment.mission,
            'cancelled',
            payment.client,
            'Remboursement reçu',
            f'Vous avez été remboursé de {amount} {payment.currency} pour « {payment.mission.title} ».',
        )

        return {'transaction_id': tx_id, 'amount': str(amount), 'sandbox': True}
