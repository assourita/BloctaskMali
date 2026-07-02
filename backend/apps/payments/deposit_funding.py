"""Alimentation du solde caution via Mobile Money (prestataire / entreprise)."""
from decimal import Decimal, InvalidOperation

from django.utils import timezone

from apps.payments.mobile_money import MobileMoneyError, MobileMoneyService
from apps.payments.models import UserPaymentMethod
from apps.users.models import WalletTransaction


def resolve_mobile_money_details(user, data: dict) -> tuple[str, str]:
    phone = (data.get('phone_number') or '').strip()
    operator = (data.get('operator') or '').strip()
    if phone and operator:
        return phone, operator

    default_pm = (
        UserPaymentMethod.objects.filter(
            user=user,
            is_active=True,
            type=UserPaymentMethod.Type.MOBILE_MONEY,
        )
        .order_by('-is_default', '-created_at')
        .first()
    )
    if default_pm:
        phone = phone or (default_pm.phone_number or '')
        operator = operator or (default_pm.operator or '')
    return phone, operator


def fund_deposit_balance(user, data: dict) -> dict:
    """
    Débite Mobile Money et crédite deposit_balance (prestataire ou entreprise).
    data: amount, phone_number?, operator?, otp?
    """
    try:
        amount = Decimal(str(data.get('amount', 0)))
    except (InvalidOperation, TypeError) as exc:
        raise MobileMoneyError('Montant invalide', 'invalid_amount') from exc

    if amount < 1000:
        raise MobileMoneyError('Montant minimum : 1 000 FCFA', 'amount_too_low')

    phone, operator = resolve_mobile_money_details(user, data)
    if not phone:
        raise MobileMoneyError(
            'Numéro Mobile Money requis. Enregistrez une méthode de paiement ou saisissez votre numéro.',
            'payment_method_required',
        )
    if not operator:
        raise MobileMoneyError(
            'Opérateur Mobile Money requis (orange ou moov).',
            'operator_required',
        )

    user_type = getattr(user, 'user_type', '')
    if user_type == 'enterprise':
        profile = user.enterprise_profile
        profile_label = 'entreprise'
    elif user_type == 'provider':
        profile = user.provider_profile
        profile_label = 'prestataire'
    else:
        raise MobileMoneyError(
            'Réservé aux prestataires et entreprises',
            'forbidden',
        )

    otp = data.get('otp') or data.get('pin')
    result = MobileMoneyService.charge_deposit(
        amount=amount,
        phone_number=phone,
        operator=operator,
        otp=otp,
        reference=f'deposit-{user.id}',
    )

    tx_id = result.get('transaction_id', '')
    profile.deposit_balance += amount
    profile.save(update_fields=['deposit_balance'])

    WalletTransaction.objects.create(
        user=user,
        transaction_type=WalletTransaction.TransactionType.DEPOSIT,
        amount=amount,
        currency='XOF',
        status=WalletTransaction.Status.COMPLETED,
        blockchain_tx_hash=(tx_id or '')[:66] or None,
        mobile_money_provider=operator,
        mobile_money_reference=tx_id,
        description=f'Alimentation caution {profile_label}',
        metadata={
            'sandbox': result.get('sandbox', False),
            'fund_type': 'deposit_balance',
            'phone_number': phone,
        },
        completed_at=timezone.now(),
    )

    return {
        'deposit_balance': float(profile.deposit_balance),
        'deposit_locked': float(profile.deposit_locked),
        'transaction_id': tx_id,
        'message': result.get('message')
        or f'{amount} FCFA débités depuis votre compte Mobile Money',
        'sandbox': result.get('sandbox', False),
    }
