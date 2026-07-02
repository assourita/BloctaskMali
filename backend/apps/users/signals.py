from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone

from .enterprise_helpers import enterprise_profile_defaults
from .models import User, ProviderProfile, EnterpriseProfile, WalletTransaction
from .kyc_access import handle_kyc_status_change


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Crée automatiquement le profil selon le type d'utilisateur"""
    if created:
        if instance.user_type == 'provider':
            ProviderProfile.objects.create(user=instance)
        elif instance.user_type == 'enterprise':
            EnterpriseProfile.objects.get_or_create(
                user=instance,
                defaults=enterprise_profile_defaults(instance),
            )


@receiver(post_save, sender=WalletTransaction)
def notify_wallet_transaction(sender, instance, created, **kwargs):
    if created:
        pass


@receiver(pre_save, sender=User)
def prepare_kyc_status_change(sender, instance, **kwargs):
    if not instance.pk:
        return
    try:
        old_instance = User.objects.get(pk=instance.pk)
    except User.DoesNotExist:
        return

    if old_instance.kyc_status != instance.kyc_status:
        if instance.kyc_status == User.KYCStatus.VERIFIED and not instance.kyc_verified_at:
            instance.kyc_verified_at = timezone.now()
        instance._kyc_status_changed = (old_instance.kyc_status, instance.kyc_status)


@receiver(post_save, sender=User)
def notify_kyc_status_change(sender, instance, created, **kwargs):
    if created:
        return
    changed = getattr(instance, '_kyc_status_changed', None)
    if changed:
        handle_kyc_status_change(instance, changed[0], changed[1])
        delattr(instance, '_kyc_status_changed')
