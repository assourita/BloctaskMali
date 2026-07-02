"""Modèles partagés BlockTask."""
from django.db import models


class PlatformSettings(models.Model):
    """Configuration globale de la plateforme (singleton)."""

    singleton_key = models.CharField(max_length=20, primary_key=True, default='default')
    maintenance_mode = models.BooleanField(default=False)
    registration_open = models.BooleanField(default=True)
    email_notifications = models.BooleanField(default=True)
    service_fee_percent = models.DecimalField(max_digits=5, decimal_places=2, default=5)
    default_currency = models.CharField(max_length=10, default='FCFA')
    require_2fa_admin = models.BooleanField(default=True)
    require_kyc = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'platform_settings'
        verbose_name = 'Paramètres plateforme'
        verbose_name_plural = 'Paramètres plateforme'

    def __str__(self):
        return 'Paramètres BlockTask'

    @classmethod
    def get_solo(cls) -> 'PlatformSettings':
        obj, _ = cls.objects.get_or_create(pk='default')
        return obj
