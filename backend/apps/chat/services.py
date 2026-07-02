from apps.missions.models import Mission

from .models import Conversation, Message

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


def user_is_participant(user, mission: Mission) -> bool:
    if not user or not user.is_authenticated:
        return False
    if mission.client_id == user.id:
        return True
    if mission.provider_id == user.id:
        return True
    return False


def can_read_chat(user, mission: Mission) -> bool:
    return user_is_participant(user, mission) and mission.status in CHAT_READ_STATUSES


def can_write_chat(user, mission: Mission) -> bool:
    if not user_is_participant(user, mission) or mission.status not in CHAT_WRITE_STATUSES:
        return False
    try:
        return not mission.conversation.is_closed
    except Conversation.DoesNotExist:
        return True


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
