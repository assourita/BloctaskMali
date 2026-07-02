from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Sum, Avg, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from django.contrib.auth import get_user_model

from apps.missions.models import Mission
from apps.payments.models import Payment
from apps.disputes.models import Dispute
from apps.reputation.models import ReputationScore
from apps.users.models import Employee, EnterpriseProfile
from apps.users.roles import resolve_request_role

User = get_user_model()


def _is_admin(user):
    return user.is_staff or getattr(user, 'user_type', '') == 'admin'


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """Statistiques globales ou par rôle."""
    user = request.user
    now = timezone.now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    if _is_admin(user):
        missions = Mission.objects.all()
        return Response({
            'scope': 'admin',
            'users': {
                'total': User.objects.count(),
                'clients': User.objects.filter(user_type='client').count(),
                'providers': User.objects.filter(user_type='provider').count(),
                'enterprises': User.objects.filter(user_type='enterprise').count(),
            },
            'missions': {
                'total': missions.count(),
                'active': missions.filter(status__in=['open', 'assigned', 'in_progress', 'provider_done']).count(),
                'completed': missions.filter(status='completed').count(),
                'disputed': missions.filter(status='disputed').count(),
            },
            'payments': {
                'total_volume': Payment.objects.filter(status='completed').aggregate(
                    total=Sum('amount')
                )['total'] or 0,
                'this_month': Payment.objects.filter(
                    status='completed', completed_at__gte=month_start
                ).aggregate(total=Sum('amount'))['total'] or 0,
            },
            'disputes': {
                'open': Dispute.objects.filter(status__in=['open', 'under_review']).count(),
                'resolved': Dispute.objects.filter(status='resolved').count(),
            },
            'reputation': {
                'average_score': ReputationScore.objects.aggregate(a=Avg('overall_score'))['a'] or 0,
            },
        })

    role = resolve_request_role(user, request.query_params.get('role'))

    if role == 'client':
        missions = Mission.objects.filter(client=user)
        return Response({
            'scope': 'client',
            'active_missions': missions.filter(
                status__in=['accepted', 'in_progress', 'submitted']
            ).count(),
            'pending_missions': missions.filter(status__in=['draft', 'pending', 'funded']).count(),
            'completed_missions': missions.filter(status='completed').count(),
            'total_spent': missions.filter(status='completed').aggregate(t=Sum('budget'))['t'] or 0,
            'spent_this_month': missions.filter(
                status='completed', updated_at__gte=month_start
            ).aggregate(t=Sum('budget'))['t'] or 0,
        })

    if role == 'provider':
        missions = Mission.objects.filter(provider=user)
        rep = ReputationScore.objects.filter(user=user).first()
        return Response({
            'scope': 'provider',
            'active_missions': missions.filter(
                status__in=['accepted', 'in_progress', 'submitted']
            ).count(),
            'completed_missions': missions.filter(status='completed').count(),
            'total_earned': missions.filter(status='completed').aggregate(
                t=Sum('final_price')
            )['t'] or 0,
            'earned_this_month': missions.filter(
                status='completed', updated_at__gte=month_start
            ).aggregate(t=Sum('final_price'))['t'] or 0,
            'reputation_score': rep.overall_score if rep else 50,
            'reputation_level': rep.level if rep else 'bronze',
        })

    if user.user_type == 'enterprise':
        missions = Mission.objects.filter(client=user)
        profile = None
        try:
            profile = user.enterprise_profile
        except EnterpriseProfile.DoesNotExist:
            pass
        employees_count = 0
        if profile:
            employees_count = Employee.objects.filter(enterprise=profile, is_active=True).count()
        return Response({
            'scope': 'enterprise',
            'missions_total': missions.count(),
            'missions_active': missions.filter(
                status__in=['accepted', 'in_progress', 'submitted']
            ).count(),
            'missions_completed': missions.filter(status='completed').count(),
            'missions_completed_today': missions.filter(
                status='completed', updated_at__date=now.date()
            ).count(),
            'spent_total': missions.filter(status='completed').aggregate(t=Sum('budget'))['t'] or 0,
            'spent_this_month': missions.filter(
                status='completed', updated_at__gte=month_start
            ).aggregate(t=Sum('budget'))['t'] or 0,
            'employees_count': employees_count,
        })

    return Response({'scope': 'unknown'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mission_trends(request):
    """Tendances missions sur 30 jours (admin)."""
    if not _is_admin(request.user):
        return Response({'error': 'Accès non autorisé'}, status=403)

    since = timezone.now() - timezone.timedelta(days=30)
    daily = (
        Mission.objects.filter(created_at__gte=since)
        .extra(select={'day': "date(created_at)"})
        .values('day')
        .annotate(created=Count('id'), completed=Count('id', filter=Q(status='completed')))
        .order_by('day')
    )
    return Response(list(daily))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def enterprise_mission_trends(request):
    """Tendances et répartition des missions entreprise (30 jours)."""
    user = request.user
    if getattr(user, 'user_type', '') != 'enterprise':
        return Response({'error': 'Accès réservé aux entreprises'}, status=403)

    since = timezone.now() - timezone.timedelta(days=30)
    missions = Mission.objects.filter(client=user)

    daily = (
        missions.filter(created_at__gte=since)
        .annotate(day=TruncDate('created_at'))
        .values('day')
        .annotate(
            created=Count('id'),
            completed=Count('id', filter=Q(status='completed')),
        )
        .order_by('day')
    )

    by_status = list(
        missions.values('status').annotate(count=Count('id')).order_by('-count')
    )

    return Response({
        'daily': [
            {
                'day': row['day'].isoformat() if row['day'] else None,
                'created': row['created'],
                'completed': row['completed'],
            }
            for row in daily
        ],
        'by_status': by_status,
    })
