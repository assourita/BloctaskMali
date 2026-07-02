"""Broadcast GPS updates via Django Channels."""
import logging

logger = logging.getLogger(__name__)
_broadcast_unavailable_logged = False


def broadcast_gps_location(mission_id, location_data: dict):
    global _broadcast_unavailable_logged
    try:
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer

        channel_layer = get_channel_layer()
        if not channel_layer:
            return
        async_to_sync(channel_layer.group_send)(
            f'mission_gps_{mission_id}',
            {
                'type': 'gps_update',
                'location': location_data,
            },
        )

        from apps.missions.models import Mission
        try:
            mission = Mission.objects.select_related('client').get(id=mission_id)
            client = mission.client
            if getattr(client, 'user_type', '') == 'enterprise':
                async_to_sync(channel_layer.group_send)(
                    f'enterprise_gps_{client.id}',
                    {
                        'type': 'gps_update',
                        'location': location_data,
                    },
                )
        except Mission.DoesNotExist:
            pass
    except Exception as exc:
        if not _broadcast_unavailable_logged:
            logger.info(
                'GPS broadcast temps réel indisponible (%s) — les positions REST restent enregistrées.',
                exc,
            )
            _broadcast_unavailable_logged = True
