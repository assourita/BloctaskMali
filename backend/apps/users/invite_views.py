"""APIs invitations entreprise <-> prestataire."""
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.users.models import EnterpriseInvite, EnterpriseProfile, Employee
from apps.users.enterprise_services import (
    invite_provider_to_enterprise,
    accept_enterprise_invite,
    reject_enterprise_invite,
    cancel_enterprise_invite,
)
from apps.users.employee_helpers import employee_links_qs


def _enterprise_profile(user):
    try:
        return user.enterprise_profile
    except EnterpriseProfile.DoesNotExist:
        return None


def _serialize_enterprise_summary(enterprise: EnterpriseProfile, request=None) -> dict:
    user = enterprise.user
    logo = None
    if user.profile_picture:
        try:
            url = user.profile_picture.url
            logo = request.build_absolute_uri(url) if request else url
        except Exception:
            logo = None
    return {
        'id': str(enterprise.id),
        'user_id': str(user.id),
        'company_name': enterprise.company_name or '',
        'city': enterprise.city or getattr(user, 'city', '') or '',
        'country': getattr(user, 'country', None) or 'Mali',
        'address': enterprise.address or '',
        'website': enterprise.website or '',
        'description': getattr(user, 'bio', '') or '',
        'company_email': enterprise.company_email or '',
        'company_phone': enterprise.company_phone or getattr(user, 'phone_number', '') or '',
        'logo': logo,
        'is_verified': bool(enterprise.is_verified),
        'reputation_score': float(enterprise.reputation_score or 0),
        'total_employees': int(enterprise.total_employees or 0),
        'total_missions_posted': int(enterprise.total_missions_posted or 0),
        'member_since': enterprise.created_at.isoformat() if enterprise.created_at else None,
    }


def _serialize_invite(invite: EnterpriseInvite, request=None) -> dict:
    enterprise = invite.enterprise if invite.enterprise_id else None
    return {
        'id': str(invite.id),
        'email': invite.email,
        'status': invite.status,
        'role': invite.role,
        'position': invite.position,
        'message': invite.message,
        'expires_at': invite.expires_at.isoformat() if invite.expires_at else None,
        'created_at': invite.created_at.isoformat() if invite.created_at else None,
        'responded_at': invite.responded_at.isoformat() if invite.responded_at else None,
        'enterprise_id': str(invite.enterprise_id),
        'enterprise_name': enterprise.company_name if enterprise else '',
        'enterprise': _serialize_enterprise_summary(enterprise, request) if enterprise else None,
        'user_id': str(invite.user_id) if invite.user_id else None,
        'user_exists': bool(invite.user_id),
        'invited_by_name': (
            invite.invited_by.get_full_name() if invite.invited_by_id else ''
        ),
    }


def _serialize_membership(emp: Employee, request=None) -> dict:
    return {
        'id': str(emp.id),
        'enterprise_id': str(emp.enterprise_id),
        'enterprise_name': emp.enterprise.company_name,
        'enterprise': _serialize_enterprise_summary(emp.enterprise, request) if emp.enterprise_id else None,
        'role': emp.role,
        'position': emp.position,
        'is_active': emp.is_active,
        'hired_at': emp.hired_at.isoformat() if emp.hired_at else None,
    }


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def enterprise_invite_provider(request):
    """POST /users/enterprise/employees/invite/ — invite un prestataire par email."""
    profile = _enterprise_profile(request.user)
    if not profile:
        return Response({'error': 'Profil entreprise requis'}, status=403)

    email = (request.data.get('email') or '').strip()
    try:
        invite = invite_provider_to_enterprise(
            enterprise=profile,
            email=email,
            invited_by=request.user,
            role=request.data.get('role') or 'agent',
            position=request.data.get('position') or 'Agent terrain',
            message=request.data.get('message') or '',
        )
    except ValueError as exc:
        return Response({'error': str(exc)}, status=400)

    return Response(_serialize_invite(invite, request), status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def enterprise_list_invites(request):
    """GET /users/enterprise/invites/"""
    profile = _enterprise_profile(request.user)
    if not profile:
        return Response({'error': 'Profil entreprise requis'}, status=403)

    status_filter = request.query_params.get('status', 'pending')
    qs = EnterpriseInvite.objects.filter(enterprise=profile).select_related(
        'enterprise', 'enterprise__user', 'user', 'invited_by'
    )
    if status_filter and status_filter != 'all':
        if status_filter == 'pending':
            qs = qs.filter(
                status=EnterpriseInvite.Status.PENDING,
                expires_at__gt=timezone.now(),
            )
        elif status_filter == 'expired':
            from django.db.models import Q
            qs = qs.filter(
                Q(status=EnterpriseInvite.Status.EXPIRED)
                | Q(status=EnterpriseInvite.Status.PENDING, expires_at__lte=timezone.now())
            )
        else:
            qs = qs.filter(status=status_filter)

    return Response([_serialize_invite(i, request) for i in qs[:100]])


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def enterprise_cancel_invite(request, invite_id):
    profile = _enterprise_profile(request.user)
    if not profile:
        return Response({'error': 'Profil entreprise requis'}, status=403)

    invite = EnterpriseInvite.objects.filter(id=invite_id, enterprise=profile).first()
    if not invite:
        return Response({'error': 'Invitation introuvable'}, status=404)
    try:
        cancel_enterprise_invite(invite=invite, enterprise=profile)
    except ValueError as exc:
        return Response({'error': str(exc)}, status=400)
    return Response(_serialize_invite(invite, request))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_enterprise_invites(request):
    """GET /users/me/enterprise-invites/?status=pending|accepted|rejected|cancelled|expired|all"""
    from django.db.models import Q

    email = (request.user.email or '').strip().lower()
    status_filter = (request.query_params.get('status') or 'pending').strip().lower()

    qs = (
        EnterpriseInvite.objects.filter(Q(user=request.user) | Q(email__iexact=email))
        .select_related('enterprise', 'enterprise__user', 'invited_by')
        .order_by('-created_at')
    )

    if status_filter and status_filter != 'all':
        if status_filter == 'pending':
            qs = qs.filter(
                status=EnterpriseInvite.Status.PENDING,
                expires_at__gt=timezone.now(),
            )
        elif status_filter == 'expired':
            qs = qs.filter(
                Q(status=EnterpriseInvite.Status.EXPIRED)
                | Q(status=EnterpriseInvite.Status.PENDING, expires_at__lte=timezone.now())
            )
        else:
            qs = qs.filter(status=status_filter)

    return Response([_serialize_invite(i, request) for i in qs[:100]])


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def accept_my_enterprise_invite(request, invite_id):
    invite = EnterpriseInvite.objects.filter(id=invite_id).select_related(
        'enterprise', 'enterprise__user'
    ).first()
    if not invite:
        return Response({'error': 'Invitation introuvable'}, status=404)
    try:
        employee = accept_enterprise_invite(invite=invite, user=request.user)
    except ValueError as exc:
        return Response({'error': str(exc)}, status=400)
    return Response({
        'invite': _serialize_invite(invite, request),
        'membership': _serialize_membership(employee, request),
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reject_my_enterprise_invite(request, invite_id):
    invite = EnterpriseInvite.objects.filter(id=invite_id).first()
    if not invite:
        return Response({'error': 'Invitation introuvable'}, status=404)
    try:
        reject_enterprise_invite(invite=invite, user=request.user)
    except ValueError as exc:
        return Response({'error': str(exc)}, status=400)
    return Response(_serialize_invite(invite, request))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_enterprises(request):
    """GET /users/me/enterprises/ — entreprises liées (actives)."""
    links = employee_links_qs(request.user, active_only=True).select_related(
        'enterprise', 'enterprise__user'
    )
    return Response([_serialize_membership(e, request) for e in links])
