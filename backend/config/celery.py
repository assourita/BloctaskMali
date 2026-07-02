import os

from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('blocktask')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

app.conf.beat_schedule = {
    'expire-missions-hourly': {
        'task': 'missions.expire_missions',
        'schedule': crontab(minute=0),
    },
    'sync-blockchain-events': {
        'task': 'escrow.sync_blockchain_events',
        'schedule': crontab(minute='*/5'),
        'kwargs': {'from_block': 0},
    },
}
