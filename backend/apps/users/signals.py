from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.core.mail import send_mail
from .models import User, ProviderProfile, EnterpriseProfile, WalletTransaction


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Crée automatiquement le profil selon le type d'utilisateur"""
    if created:
        if instance.user_type == 'provider':
            ProviderProfile.objects.create(user=instance)
        elif instance.user_type == 'enterprise':
            EnterpriseProfile.objects.create(user=instance)


@receiver(post_save, sender=WalletTransaction)
def notify_wallet_transaction(sender, instance, created, **kwargs):
    """Envoie une notification lors d'une transaction wallet"""
    if created:
        # TODO: Envoyer notification push/email
        pass


@receiver(pre_save, sender=User)
def track_kyc_changes(sender, instance, **kwargs):
    """Track les changements de statut KYC"""
    if not instance.pk:
        return  # Nouvel utilisateur, pas de changement KYC
    try:
        old_instance = User.objects.get(pk=instance.pk)
        if old_instance.kyc_status != instance.kyc_status:
            # TODO: Envoyer notification
            print(f"KYC status changed from {old_instance.kyc_status} to {instance.kyc_status}")
    except User.DoesNotExist:
        pass  # Utilisateur n'existe pas encore
