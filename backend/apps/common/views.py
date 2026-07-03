from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, Q, Case, When, Value, IntegerField
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from apps.missions.models import Category, Mission
from apps.users.models import EnterpriseProfile
from apps.users.enterprise_helpers import enterprise_profile_defaults
from .africa_config import get_market_config, get_operators_for_country
from .models import PlatformSettings
from .serializers import PlatformSettingsSerializer

User = get_user_model()


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Endpoint simple pour les health checks (Render, load balancers)."""
    return Response({'status': 'ok', 'service': 'blocktask-backend'})


@api_view(['GET'])
@permission_classes([AllowAny])
def market_config(request):
    """Configuration marché Afrique de l'Ouest (pays, Mobile Money, XOF)."""
    config = get_market_config()
    country_code = request.query_params.get('country')
    if country_code:
        config['operators'] = get_operators_for_country(country_code)
    return Response(config)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def platform_settings(request):
    """Lecture / mise à jour des paramètres plateforme (admin)."""
    if not request.user.is_staff:
        return Response({'error': 'Accès réservé aux administrateurs.'}, status=status.HTTP_403_FORBIDDEN)

    settings_obj = PlatformSettings.get_solo()

    if request.method == 'GET':
        return Response(PlatformSettingsSerializer(settings_obj).data)

    serializer = PlatformSettingsSerializer(settings_obj, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


def _provider_queryset():
    """Tous les prestataires actifs, triés par réputation."""
    return User.objects.filter(
        provider_profile__isnull=False,
        is_active=True,
    ).select_related('provider_profile')


def _annotate_providers(qs):
    return qs.annotate(
        review_count=Count(
            'provider_missions__review',
            filter=Q(provider_missions__review__client_rating__isnull=False),
        ),
        avg_rating=Avg(
            'provider_missions__review__client_rating',
            filter=Q(provider_missions__review__client_rating__isnull=False),
        ),
    )


def _serialize_provider(user, request):
    return {
        'id': str(user.id),
        'first_name': user.first_name,
        'last_name': user.last_name,
        'city': user.city,
        'profile_picture': (
            request.build_absolute_uri(user.profile_picture.url)
            if user.profile_picture else None
        ),
        'skills': user.provider_profile.skills or [],
        'level': user.provider_profile.level,
        'reputation_score': user.provider_profile.reputation_score,
        'completed_missions': user.provider_profile.total_missions_completed,
        'review_count': user.review_count or 0,
        'avg_rating': round(float(user.avg_rating), 1) if user.avg_rating else None,
        'identity_verified': user.kyc_status == User.KYCStatus.VERIFIED,
        'is_available': user.provider_profile.is_available,
    }


def _serialize_enterprise(profile, request):
    defaults = enterprise_profile_defaults(profile.user)
    company_name = (profile.company_name or defaults['company_name'] or '').strip()
    if not company_name:
        company_name = profile.user.get_full_name() or profile.user.username
    city = (profile.city or defaults['city'] or profile.user.city or '').strip()
    return {
        'id': str(profile.user_id),
        'company_name': company_name,
        'city': city,
        'website': profile.website or '',
        'total_employees': profile.total_employees or 0,
        'total_missions_posted': profile.total_missions_posted or 0,
        'reputation_score': profile.reputation_score,
        'is_verified': profile.is_verified,
        'logo': (
            request.build_absolute_uri(profile.user.profile_picture.url)
            if profile.user.profile_picture else None
        ),
    }


@api_view(['GET'])
@permission_classes([AllowAny])
def landing_data(request):
    """Données publiques pour la page d'accueil (sans authentification)."""
    providers_qs = _provider_queryset()
    open_missions_qs = Mission.objects.filter(
        status=Mission.Status.FUNDED,
        provider__isnull=True,
    )

    stats = {
        'total_providers': providers_qs.count(),
        'total_enterprises': EnterpriseProfile.objects.filter(user__is_active=True).count(),
        'total_missions': Mission.objects.exclude(status=Mission.Status.DRAFT).count(),
        'open_missions': open_missions_qs.count(),
        'completed_missions': Mission.objects.filter(status=Mission.Status.COMPLETED).count(),
    }

    try:
        providers_limit = min(int(request.query_params.get('providers_limit', 8)), 100)
    except (TypeError, ValueError):
        providers_limit = 8

    featured_providers = (
        _annotate_providers(providers_qs)
        .order_by(
            '-provider_profile__reputation_score',
            '-provider_profile__total_missions_completed',
            'first_name',
        )[:providers_limit]
    )

    featured_enterprises = (
        EnterpriseProfile.objects.filter(user__is_active=True)
        .select_related('user')
        .annotate(
            profile_complete=Case(
                When(company_name__gt='', then=Value(1)),
                default=Value(0),
                output_field=IntegerField(),
            )
        )
        .order_by(
            '-profile_complete',
            '-is_verified',
            '-total_missions_posted',
            '-reputation_score',
            'company_name',
        )
    )
    try:
        enterprises_limit = min(int(request.query_params.get('enterprises_limit', 6)), 100)
    except (TypeError, ValueError):
        enterprises_limit = 6
    featured_enterprises = featured_enterprises[:enterprises_limit]

    categories = (
        Category.objects.filter(is_active=True)
        .annotate(
            open_mission_count=Count(
                'missions',
                filter=Q(
                    missions__status=Mission.Status.FUNDED,
                    missions__provider__isnull=True,
                ),
            ),
            provider_count=Count(
                'missions__provider',
                distinct=True,
                filter=Q(missions__provider__isnull=False),
            ),
        )
        .order_by('order', 'name')[:8]
    )

    missions_qs = (
        open_missions_qs.select_related('category')
        .prefetch_related('applications')
        .order_by('-created_at')
    )
    search_q = request.query_params.get('q', '').strip()
    if search_q:
        missions_qs = missions_qs.filter(
            Q(title__icontains=search_q)
            | Q(description__icontains=search_q)
            | Q(category__name__icontains=search_q)
        )
    featured_missions = missions_qs[:6]

    return Response({
        'stats': stats,
        'categories': [
            {
                'id': str(cat.id),
                'name': cat.name,
                'slug': cat.slug,
                'description': cat.description,
                'icon': cat.icon or 'category',
                'open_mission_count': cat.open_mission_count,
                'provider_count': cat.provider_count,
            }
            for cat in categories
        ],
        'featured_providers': [
            _serialize_provider(user, request) for user in featured_providers
        ],
        'featured_enterprises': [
            _serialize_enterprise(ep, request) for ep in featured_enterprises
        ],
        'featured_missions': [
            {
                'id': str(mission.id),
                'title': mission.title,
                'category_name': mission.category.name if mission.category else '',
                'category_icon': mission.category.icon if mission.category else 'assignment',
                'budget': float(mission.budget),
                'currency': mission.currency,
                'pickup_address': mission.pickup_address,
                'deadline': mission.deadline.isoformat() if mission.deadline else None,
                'application_count': mission.applications.count(),
                'created_at': mission.created_at.isoformat(),
            }
            for mission in featured_missions
        ],
        'popular_categories': [
            cat.name
            for cat in Category.objects.filter(is_active=True)
            .annotate(
                cnt=Count(
                    'missions',
                    filter=~Q(missions__status=Mission.Status.DRAFT),
                ),
            )
            .order_by('-cnt', 'order')[:4]
            if cat.cnt > 0
        ],
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def map_presence(request):
    """Utilisateurs BlockTask visibles sur la carte (hors admin)."""
    from apps.common.africa_config import DEFAULT_MAP_CENTER
    from apps.common.map import build_map_presence

    search = request.query_params.get('search', '')
    users = build_map_presence(request, search=search)
    return Response({
        'center': DEFAULT_MAP_CENTER,
        'users': users,
        'count': len(users),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def map_user_detail(request, user_id):
    """Détail d'un utilisateur sur la carte (position exacte si mission en cours)."""
    from apps.common.map import get_map_user_detail

    detail = get_map_user_detail(request, user_id)
    if not detail:
        return Response({'detail': 'Utilisateur introuvable.'}, status=status.HTTP_404_NOT_FOUND)
    return Response(detail)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def map_update_location(request):
    """Met à jour la position de l'utilisateur courant sur la carte."""
    from apps.common.map import update_user_map_location

    try:
        latitude = float(request.data.get('latitude'))
        longitude = float(request.data.get('longitude'))
    except (TypeError, ValueError):
        return Response({'detail': 'latitude et longitude requises.'}, status=status.HTTP_400_BAD_REQUEST)

    if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
        return Response({'detail': 'Coordonnées invalides.'}, status=status.HTTP_400_BAD_REQUEST)

    update_user_map_location(request.user, latitude, longitude)
    return Response({
        'detail': 'Position mise à jour.',
        'latitude': latitude,
        'longitude': longitude,
    })
