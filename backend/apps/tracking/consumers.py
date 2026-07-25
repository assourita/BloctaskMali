import json
import logging

from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async

logger = logging.getLogger(__name__)


class MissionGPSConsumer(AsyncJsonWebsocketConsumer):
    """WebSocket temps réel pour le suivi GPS d'une mission."""

    async def connect(self):
        self.mission_id = self.scope['url_route']['kwargs']['mission_id']
        self.group_name = f'mission_gps_{self.mission_id}'

        user = self.scope.get('user')
        if not user or not user.is_authenticated:
            await self.close()
            return

        allowed = await self._user_can_access(user.id, self.mission_id)
        if not allowed:
            await self.close()
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        await self.send_json({'type': 'connected', 'mission_id': self.mission_id})

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        action = content.get('action')
        if action == 'ping':
            await self.send_json({'type': 'pong'})

    async def gps_update(self, event):
        await self.send_json({
            'type': 'gps_update',
            'location': event['location'],
        })

    @database_sync_to_async
    def _user_can_access(self, user_id, mission_id):
        from django.contrib.auth import get_user_model
        from apps.missions.models import Mission
        from apps.enterprises.models import EmployeeAssignment

        User = get_user_model()
        try:
            mission = Mission.objects.select_related(
                'assigned_enterprise', 'executing_employee',
            ).get(id=mission_id)
            user = User.objects.get(id=user_id)
        except (Mission.DoesNotExist, User.DoesNotExist):
            return False

        if user.is_staff or getattr(user, 'user_type', '') == 'admin':
            return True
        if user_id in (mission.client_id, mission.provider_id):
            return True
        # Entreprise contractuelle / gérant
        if mission.assigned_enterprise_id and getattr(user, 'user_type', '') == 'enterprise':
            profile = getattr(user, 'enterprise_profile', None)
            if profile and profile.id == mission.assigned_enterprise_id:
                return True
        # Employé exécutant / affecté
        if (
            mission.executing_employee_id
            and mission.executing_employee
            and mission.executing_employee.user_id == user_id
        ):
            return True
        if EmployeeAssignment.objects.filter(mission_id=mission_id, employee__user_id=user_id).exists():
            return True
        # Employé de l'entreprise assignée
        if mission.assigned_enterprise_id and user.employee_links.filter(
            enterprise_id=mission.assigned_enterprise_id, is_active=True,
        ).exists():
            return True
        return False


class EnterpriseFleetGPSConsumer(AsyncJsonWebsocketConsumer):
    """WebSocket temps réel pour la flotte GPS d'une entreprise (toutes ses missions)."""

    async def connect(self):
        user = self.scope.get('user')
        if not user or not user.is_authenticated:
            await self.close()
            return

        if getattr(user, 'user_type', '') != 'enterprise' and not user.is_staff:
            await self.close()
            return

        self.group_name = f'enterprise_gps_{user.id}'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        await self.send_json({'type': 'connected', 'scope': 'enterprise_fleet'})

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        if content.get('action') == 'ping':
            await self.send_json({'type': 'pong'})

    async def gps_update(self, event):
        await self.send_json({
            'type': 'gps_update',
            'location': event['location'],
        })
