"""Chat participants + matching contacts livraison."""
from __future__ import annotations

import re

from django.contrib.auth import get_user_model

from apps.missions.models import Mission
from apps.missions.requirements import parse_mission_requirements

from .models import Conversation, ConversationParticipant, Message

User = get_user_model()

# Lecture : mission démarrée jusqu'à clôture (fonds libérés)
CHAT_READ_STATUSES = {
    Mission.Status.IN_PROGRESS,
    Mission.Status.SUBMITTED,
    Mission.Status.DISPUTED,
    Mission.Status.COMPLETED,
}

# Écriture : tant que la mission n'est pas terminée
CHAT_WRITE_STATUSES = {
    Mission.Status.IN_PROGRESS,
    Mission.Status.SUBMITTED,
    Mission.Status.DISPUTED,
}


def _normalize_phone(phone: str | None) -> str:
    if not phone:
        return ''
    digits = re.sub(r'\D+', '', str(phone))
    if digits.startswith('00223'):
        digits = digits[5:]
    if digits.startswith('223') and len(digits) > 8:
        digits = digits[3:]
    return digits[-9:] if len(digits) >= 9 else digits


def find_user_by_phone(phone: str | None):
    norm = _normalize_phone(phone)
    if not norm or len(norm) < 8:
        return None
    for user in User.objects.exclude(phone_number='').exclude(phone_number__isnull=True).iterator():
        if _normalize_phone(user.phone_number) == norm:
            return user
    return None


def user_is_participant(user, mission: Mission) -> bool:
    if not user or not user.is_authenticated:
        return False
    if mission.client_id == user.id:
        return True
    if mission.provider_id == user.id:
        return True
    try:
        conv = mission.conversation
    except Conversation.DoesNotExist:
        return False
    return conv.extra_participants.filter(user_id=user.id).exists()


def can_read_chat(user, mission: Mission) -> bool:
    return user_is_participant(user, mission) and mission.status in CHAT_READ_STATUSES


def can_write_chat(user, mission: Mission) -> bool:
    if not user_is_participant(user, mission) or mission.status not in CHAT_WRITE_STATUSES:
        return False
    try:
        return not mission.conversation.is_closed
    except Conversation.DoesNotExist:
        return True


def sync_delivery_contact_participants(conversation: Conversation, mission: Mission) -> list[ConversationParticipant]:
    """Ajoute les contacts départ/arrivée s'ils ont un compte BlockTask (missions livraison)."""
    from apps.missions.category_rules import get_category_rule

    rule = get_category_rule(mission.category)
    if rule.mission_type not in ('delivery', 'transport'):
        return []

    req = parse_mission_requirements(mission)
    added: list[ConversationParticipant] = []
    pairs = [
        (
            ConversationParticipant.Role.PICKUP_CONTACT,
            req.get('pickup_contact_phone'),
            req.get('pickup_contact_name') or 'Contact départ',
        ),
        (
            ConversationParticipant.Role.DELIVERY_CONTACT,
            req.get('delivery_contact_phone'),
            req.get('delivery_contact_name') or 'Contact arrivée',
        ),
    ]
    for role, phone, label in pairs:
        contact_user = find_user_by_phone(phone)
        if not contact_user:
            continue
        if contact_user.id in (conversation.client_id, conversation.provider_id):
            continue
        participant, created = ConversationParticipant.objects.get_or_create(
            conversation=conversation,
            user=contact_user,
            defaults={'role': role, 'label': label},
        )
        if created:
            added.append(participant)
            Message.objects.create(
                conversation=conversation,
                sender=conversation.client,
                content=(
                    f'{label} ({contact_user.get_full_name() or contact_user.username}) '
                    f'a rejoint la conversation (compte BlockTask lié au numéro de contact).'
                ),
                message_type=Message.MessageType.SYSTEM,
            )
    return added


def get_or_create_conversation(mission: Mission) -> Conversation | None:
    if mission.status not in CHAT_READ_STATUSES:
        return None
    if not mission.provider_id:
        return None

    conversation, created = Conversation.objects.get_or_create(
        mission=mission,
        defaults={
            'client_id': mission.client_id,
            'provider_id': mission.provider_id,
        },
    )
    if created:
        Message.objects.create(
            conversation=conversation,
            sender=mission.client,
            content='Mission démarrée — vous pouvez échanger ici jusqu\'à la fin de la mission.',
            message_type=Message.MessageType.SYSTEM,
        )
    sync_delivery_contact_participants(conversation, mission)
    return conversation


def close_conversation_for_mission(mission: Mission) -> None:
    """Ferme le chat quand la mission est terminée (fonds libérés)."""
    try:
        conv = mission.conversation
    except Conversation.DoesNotExist:
        return
    if conv.is_closed:
        return
    conv.is_closed = True
    conv.save(update_fields=['is_closed', 'updated_at'])
    Message.objects.create(
        conversation=conv,
        sender=mission.client,
        content='Mission terminée — messagerie fermée. Les fonds ont été libérés.',
        message_type=Message.MessageType.SYSTEM,
    )
