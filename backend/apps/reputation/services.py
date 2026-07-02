"""
Calcul automatique de la réputation BlockTask.
"""
import logging
from django.db.models import Avg, Count, Q
from django.utils import timezone

from .models import ReputationScore, ReputationHistory

logger = logging.getLogger(__name__)

LEVEL_THRESHOLDS = [
    ('platinum', 90),
    ('gold', 75),
    ('silver', 60),
    ('bronze', 0),
]


def get_or_create_score(user):
    score, _ = ReputationScore.objects.get_or_create(user=user)
    return score


def _level_for_score(overall: float) -> str:
    for name, minimum in LEVEL_THRESHOLDS:
        if overall >= minimum:
            return name
    return 'bronze'


def recalculate_reputation(user, *, event_type='recalculation', mission=None, description=''):
    """Recalcule le score de réputation à partir des missions, avis et litiges."""
    from apps.missions.models import Mission, MissionReview
    from apps.disputes.models import Dispute

    score = get_or_create_score(user)
    old_overall = score.overall_score

    provider_missions = Mission.objects.filter(provider=user)
    stats = provider_missions.aggregate(
        total=Count('id'),
        successful=Count('id', filter=Q(status=Mission.Status.COMPLETED)),
        failed=Count('id', filter=Q(status__in=[Mission.Status.CANCELLED, Mission.Status.EXPIRED])),
        cancelled=Count('id', filter=Q(status=Mission.Status.CANCELLED)),
    )

    score.total_missions = stats['total'] or 0
    score.successful_missions = stats['successful'] or 0
    score.failed_missions = stats['failed'] or 0
    score.cancelled_missions = stats['cancelled'] or 0

    reviews = MissionReview.objects.filter(
        mission__provider=user,
        client_rating__isnull=False,
    )
    rating_data = reviews.aggregate(
        count=Count('id'),
        avg_rating=Avg('client_rating'),
    )
    score.rating_count = rating_data['count'] or 0
    score.average_rating = float(rating_data['avg_rating'] or 0)
    if score.rating_count and rating_data['avg_rating']:
        score.total_rating_sum = int(float(rating_data['avg_rating']) * score.rating_count)

    disputes = Dispute.objects.filter(Q(plaintiff=user) | Q(defendant=user))
    score.dispute_count = disputes.count()
    score.dispute_won = disputes.filter(
        decision__in=['provider_wins', 'partial_provider'],
        defendant=user,
    ).count() + disputes.filter(
        decision__in=['client_wins', 'partial_client'],
        plaintiff=user,
    ).count()
    score.dispute_lost = disputes.filter(
        decision__in=['client_wins', 'partial_client'],
        defendant=user,
    ).count() + disputes.filter(
        decision__in=['provider_wins', 'partial_provider'],
        plaintiff=user,
    ).count()

    on_time = 0
    late = 0
    for m in provider_missions.filter(status=Mission.Status.COMPLETED, completed_at__isnull=False):
        if m.completed_at <= m.deadline:
            on_time += 1
        else:
            late += 1
    score.on_time_count = on_time
    score.late_count = late
    total_done = on_time + late
    score.on_time_rate = (on_time / total_done * 100) if total_done else 100.0

    success_rate = score.success_rate
    score.success_rate_score = min(40.0, success_rate * 0.4)

    if score.rating_count > 0:
        score.rating_score = min(30.0, (score.average_rating / 5.0) * 30.0)
    else:
        score.rating_score = 15.0

    if score.total_missions > 0:
        dispute_penalty = min(20.0, score.dispute_count / score.total_missions * 20.0)
        score.dispute_score = max(0.0, 20.0 - dispute_penalty)
    else:
        score.dispute_score = 20.0

    volume_bonus = min(10.0, score.successful_missions * 0.5)
    score.volume_score = volume_bonus

    score.overall_score = round(
        score.success_rate_score + score.rating_score + score.dispute_score + score.volume_score,
        2,
    )
    score.overall_score = max(0.0, min(100.0, score.overall_score))

    old_level = score.level
    score.level = _level_for_score(score.overall_score)
    score.last_calculated_at = timezone.now()
    score.save()

    if hasattr(user, 'provider_profile'):
        profile = user.provider_profile
        profile.reputation_score = score.overall_score
        profile.level = score.level
        profile.total_missions_completed = score.successful_missions
        profile.save(update_fields=['reputation_score', 'level', 'total_missions_completed'])

    change = score.overall_score - old_overall
    if abs(change) >= 0.01 or event_type != 'recalculation':
        ReputationHistory.objects.create(
            user=user,
            event_type=event_type,
            mission=mission,
            old_score=old_overall,
            new_score=score.overall_score,
            change_amount=change,
            description=description or f'Score mis à jour: {old_overall:.1f} → {score.overall_score:.1f}',
        )

    if score.level != old_level and score.level != 'bronze':
        ReputationHistory.objects.create(
            user=user,
            event_type=ReputationHistory.EventType.LEVEL_UP,
            mission=mission,
            old_score=old_overall,
            new_score=score.overall_score,
            change_amount=change,
            description=f'Niveau {old_level} → {score.level}',
        )

    return score
