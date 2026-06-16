from django.apps import AppConfig


class ReputationConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.reputation'
    verbose_name = 'Réputation'
    
    def ready(self):
        import apps.reputation.signals  # noqa
