"""APIs appels à candidature (rejoindre une entreprise — ouvert à tous les prestataires)."""
from datetime import timedelta

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.users.models import (
    Employee,
    EnterpriseProfile,
    EnterpriseRecruitmentApplication,
    EnterpriseRecruitmentCall,
    User,
)
from apps.users.enterprise_services import refresh_enterprise_employee_count
from apps.users.employee_helpers import sync_managed_by_enterprise
from apps.users.invite_views import _serialize_enterprise_summary


def _enterprise_profile(user):
    try:
        return user.enterprise_profile
    except EnterpriseProfile.DoesNotExist:
        return None


def _is_provider(user) -> bool:
    return (
        getattr(user, 'user_type', '') == User.UserType.PROVIDER
        or getattr(user, 'secondary_role', None) == 'provider'
    )


def _serialize_call(call: EnterpriseRecruitmentCall, request=None, viewer=None) -> dict:
    apps_count = getattr(call, 'applications_count', None)
    if apps_count is None:
        apps_count = call.applications.count()
    pending_count = getattr(call, 'pending_applications_count', None)
    if pending_count is None:
        pending_count = call.applications.filter(
            status=EnterpriseRecruitmentApplication.Status.PENDING
        ).count()

    my_application = None
    if viewer and viewer.is_authenticated:
        app = call.applications.filter(provider=viewer).first()
        if app:
            my_application = _serialize_application(app, request, include_call=False)

    return {
        'id': str(call.id),
        'title': call.title,
        'description': call.description,
        'role': call.role,
        'position': call.position,
        'city': call.city,
        'requirements': call.requirements,
        'status': call.status,
        'is_open': call.is_open,
        'expires_at': call.expires_at.isoformat() if call.expires_at else None,
        'created_at': call.created_at.isoformat() if call.created_at else None,
        'applications_count': apps_count,
        'pending_applications_count': pending_count,
        'enterprise_id': str(call.enterprise_id),
        'enterprise_name': call.enterprise.company_name if call.enterprise_id else '',
        'enterprise': (
            _serialize_enterprise_summary(call.enterprise, request)
            if call.enterprise_id else None
        ),
        'my_application': my_application,
    }


def _serialize_application(app: EnterpriseRecruitmentApplication, request=None, include_call=True) -> dict:
    provider = app.provider
    data = {
        'id': str(app.id),
        'status': app.status,
        'message': app.message,
        'created_at': app.created_at.isoformat() if app.created_at else None,
        'reviewed_at': app.reviewed_at.isoformat() if app.reviewed_at else None,
        'provider_id': str(app.provider_id),
        'provider': {
            'id': str(provider.id),
            'first_name': provider.first_name,
            'last_name': provider.last_name,
            'email': provider.email,
            'phone_number': provider.phone_number or '',
            'profile_picture': (
                request.build_absolute_uri(provider.profile_picture.url)
                if request and provider.profile_picture else (
                    provider.profile_picture.url if provider.profile_picture else None
                )
            ),
            'city': provider.city or '',
        },
        'call_id': str(app.call_id),
    }
    if include_call and app.call_id:
        data['call'] = {
            'id': str(app.call_id),
            'title': app.call.title,
            'position': app.call.position,
            'role': app.call.role,
            'enterprise_name': app.call.enterprise.company_name if app.call.enterprise_id else '',
            'enterprise_id': str(app.call.enterprise_id),
        }
    return data


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def enterprise_recruitment_calls(request):
    """GET/POST /users/enterprise/recruitment-calls/"""
    profile = _enterprise_profile(request.user)
    if not profile:
        return Response({'error': 'Profil entreprise requis'}, status=403)

    if request.method == 'GET':
        status_filter = (request.query_params.get('status') or 'all').strip().lower()
        qs = (
            EnterpriseRecruitmentCall.objects.filter(enterprise=profile)
            .select_related('enterprise', 'enterprise__user')
            .annotate(
                applications_count=Count('applications'),
                pending_applications_count=Count(
                    'applications',
                    filter=Q(applications__status=EnterpriseRecruitmentApplication.Status.PENDING),
                ),
            )
            .order_by('-created_at')
        )
        if status_filter and status_filter != 'all':
            qs = qs.filter(status=status_filter)
        return Response([_serialize_call(c, request) for c in qs[:100]])

    title = (request.data.get('title') or '').strip()
    description = (request.data.get('description') or '').strip()
    if not title or not description:
        return Response({'error': 'Titre et description requis'}, status=400)

    days = request.data.get('days_valid', 30)
    try:
        expires_at = timezone.now() + timedelta(days=max(1, int(days)))
    except (TypeError, ValueError):
        expires_at = timezone.now() + timedelta(days=30)

    call = EnterpriseRecruitmentCall.objects.create(
        enterprise=profile,
        created_by=request.user,
        title=title[:255],
        description=description,
        role=request.data.get('role') or Employee.Role.AGENT,
        position=(request.data.get('position') or 'Agent terrain')[:100],
        city=(request.data.get('city') or profile.city or '')[:100],
        requirements=(request.data.get('requirements') or '')[:2000],
        expires_at=expires_at,
        status=EnterpriseRecruitmentCall.Status.OPEN,
    )
    return Response(_serialize_call(call, request), status=201)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def enterprise_recruitment_call_detail(request, call_id):
    profile = _enterprise_profile(request.user)
    if not profile:
        return Response({'error': 'Profil entreprise requis'}, status=403)

    call = (
        EnterpriseRecruitmentCall.objects.filter(id=call_id, enterprise=profile)
        .select_related('enterprise', 'enterprise__user')
        .annotate(
            applications_count=Count('applications'),
            pending_applications_count=Count(
                'applications',
                filter=Q(applications__status=EnterpriseRecruitmentApplication.Status.PENDING),
            ),
        )
        .first()
    )
    if not call:
        return Response({'error': 'Appel introuvable'}, status=404)

    if request.method == 'GET':
        return Response(_serialize_call(call, request))

    for field in ('title', 'description', 'position', 'city', 'requirements', 'role'):
        if field in request.data and request.data.get(field) is not None:
            setattr(call, field, str(request.data.get(field))[:2000] if field in ('description', 'requirements') else str(request.data.get(field))[:255])

    new_status = request.data.get('status')
    if new_status in dict(EnterpriseRecruitmentCall.Status.choices):
        call.status = new_status

    call.save()
    return Response(_serialize_call(call, request))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def enterprise_recruitment_applications(request, call_id):
    profile = _enterprise_profile(request.user)
    if not profile:
        return Response({'error': 'Profil entreprise requis'}, status=403)

    call = EnterpriseRecruitmentCall.objects.filter(id=call_id, enterprise=profile).first()
    if not call:
        return Response({'error': 'Appel introuvable'}, status=404)

    status_filter = (request.query_params.get('status') or 'all').strip().lower()
    qs = call.applications.select_related('provider', 'call', 'call__enterprise').order_by('-created_at')
    if status_filter and status_filter != 'all':
        qs = qs.filter(status=status_filter)
    return Response([_serialize_application(a, request) for a in qs[:200]])


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def enterprise_review_application(request, application_id):
    """POST body: { action: accept|reject }"""
    profile = _enterprise_profile(request.user)
    if not profile:
        return Response({'error': 'Profil entreprise requis'}, status=403)

    app = (
        EnterpriseRecruitmentApplication.objects.filter(
            id=application_id,
            call__enterprise=profile,
        )
        .select_related('provider', 'call', 'call__enterprise')
        .first()
    )
    if not app:
        return Response({'error': 'Candidature introuvable'}, status=404)
    if app.status != EnterpriseRecruitmentApplication.Status.PENDING:
        return Response({'error': 'Cette candidature a déjà été traitée'}, status=400)

    action = (request.data.get('action') or '').strip().lower()
    if action not in ('accept', 'reject'):
        return Response({'error': 'action doit être accept ou reject'}, status=400)

    if action == 'reject':
        app.status = EnterpriseRecruitmentApplication.Status.REJECTED
        app.reviewed_at = timezone.now()
        app.save(update_fields=['status', 'reviewed_at', 'updated_at'])
        from apps.notifications.services import create_notification
        create_notification(
            app.provider,
            'recruitment_rejected',
            'Candidature refusée',
            f'{profile.company_name} a refusé votre candidature pour « {app.call.title} ».',
            action_url='/provider/appels',
        )
        return Response(_serialize_application(app, request))

    # accept → créer/activer Employee
    user = app.provider
    if not _is_provider(user):
        return Response({'error': 'Le candidat n\'est plus un prestataire'}, status=400)

    call = app.call
    employee = Employee.objects.filter(enterprise=profile, user=user).first()
    if employee:
        employee.is_active = True
        employee.terminated_at = None
        employee.role = call.role
        employee.position = call.position or employee.position
        employee.first_name = user.first_name or employee.first_name
        employee.last_name = user.last_name or employee.last_name
        employee.email = (user.email or '').strip().lower()
        employee.phone = user.phone_number or employee.phone
        employee.save()
    else:
        employee = Employee.objects.create(
            enterprise=profile,
            user=user,
            first_name=user.first_name or (user.email or 'Prestataire').split('@')[0],
            last_name=user.last_name or '',
            email=(user.email or '').strip().lower(),
            phone=user.phone_number or '',
            position=call.position or 'Agent terrain',
            role=call.role,
            is_active=True,
        )

    app.status = EnterpriseRecruitmentApplication.Status.ACCEPTED
    app.reviewed_at = timezone.now()
    app.save(update_fields=['status', 'reviewed_at', 'updated_at'])

    sync_managed_by_enterprise(user)
    refresh_enterprise_employee_count(profile)

    from apps.notifications.services import create_notification
    create_notification(
        user,
        'recruitment_accepted',
        'Candidature acceptée',
        f'Vous avez rejoint {profile.company_name} suite à l\'appel « {call.title} ».',
        action_url='/provider/enterprises',
    )

    return Response({
        'application': _serialize_application(app, request),
        'employee_id': str(employee.id),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def open_recruitment_calls(request):
    """GET /users/recruitment-calls/open/ — appels ouverts visibles aux prestataires."""
    if not _is_provider(request.user):
        return Response({'error': 'Espace prestataire requis'}, status=403)

    now = timezone.now()
    qs = (
        EnterpriseRecruitmentCall.objects.filter(status=EnterpriseRecruitmentCall.Status.OPEN)
        .filter(Q(expires_at__isnull=True) | Q(expires_at__gt=now))
        .select_related('enterprise', 'enterprise__user')
        .annotate(applications_count=Count('applications'))
        .order_by('-created_at')
    )
    city = (request.query_params.get('city') or '').strip()
    if city:
        qs = qs.filter(city__icontains=city)

    return Response([_serialize_call(c, request, viewer=request.user) for c in qs[:100]])


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def apply_to_recruitment_call(request, call_id):
    if not _is_provider(request.user):
        return Response({'error': 'Espace prestataire requis'}, status=403)

    call = (
        EnterpriseRecruitmentCall.objects.filter(id=call_id)
        .select_related('enterprise', 'enterprise__user')
        .first()
    )
    if not call or not call.is_open:
        return Response({'error': 'Cet appel n\'est plus ouvert'}, status=400)

    if Employee.objects.filter(enterprise=call.enterprise, user=request.user, is_active=True).exists():
        return Response({'error': 'Vous êtes déjà membre de cette entreprise'}, status=400)

    existing = EnterpriseRecruitmentApplication.objects.filter(call=call, provider=request.user).first()
    if existing:
        if existing.status == EnterpriseRecruitmentApplication.Status.PENDING:
            return Response({'error': 'Vous avez déjà postulé'}, status=400)
        if existing.status == EnterpriseRecruitmentApplication.Status.ACCEPTED:
            return Response({'error': 'Candidature déjà acceptée'}, status=400)
        # allow re-apply after reject/withdraw
        existing.status = EnterpriseRecruitmentApplication.Status.PENDING
        existing.message = (request.data.get('message') or '')[:1000]
        existing.reviewed_at = None
        existing.save(update_fields=['status', 'message', 'reviewed_at', 'updated_at'])
        app = existing
    else:
        app = EnterpriseRecruitmentApplication.objects.create(
            call=call,
            provider=request.user,
            message=(request.data.get('message') or '')[:1000],
        )

    if call.created_by_id:
        from apps.notifications.services import create_notification
        create_notification(
            call.created_by,
            'recruitment_application',
            'Nouvelle candidature',
            f'{request.user.get_full_name() or request.user.email} a postulé à « {call.title} ».',
            action_url='/enterprise/appels',
        )

    return Response(_serialize_application(app, request), status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_recruitment_applications(request):
    if not _is_provider(request.user):
        return Response({'error': 'Espace prestataire requis'}, status=403)

    status_filter = (request.query_params.get('status') or 'all').strip().lower()
    qs = (
        EnterpriseRecruitmentApplication.objects.filter(provider=request.user)
        .select_related('call', 'call__enterprise', 'provider')
        .order_by('-created_at')
    )
    if status_filter and status_filter != 'all':
        qs = qs.filter(status=status_filter)
    return Response([_serialize_application(a, request) for a in qs[:100]])
