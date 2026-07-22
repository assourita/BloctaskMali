"""Tâches Celery planifiées (expiration missions, sync blockchain)."""
import logging

from celery import shared_task
from django.core.management import call_command

logger = logging.getLogger(__name__)


@shared_task(name='missions.expire_missions')
def expire_missions_task():
    """Traite les missions expirées (remboursements, notifications)."""
    try:
        call_command('expire_missions')
        return {'ok': True}
    except Exception as exc:
        logger.exception('expire_missions failed: %s', exc)
        raise


@shared_task(name='missions.auto_validate_missions')
def auto_validate_missions_task():
    """Valide automatiquement les missions soumises sans action client (48h)."""
    try:
        call_command('auto_validate_missions')
        return {'ok': True}
    except Exception as exc:
        logger.exception('auto_validate_missions failed: %s', exc)
        raise


@shared_task(name='escrow.sync_blockchain_events')
def sync_blockchain_events_task(from_block: int = 0):
    """Synchronise les événements EscrowContract depuis Sepolia."""
    try:
        call_command('sync_blockchain_events', from_block=from_block)
        return {'ok': True}
    except Exception as exc:
        logger.exception('sync_blockchain_events failed: %s', exc)
        raise
