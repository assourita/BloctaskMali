"""Présence utilisateurs sur la carte BlockTask (style Snap Map)."""
import hashlib
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone

from apps.common.africa_config import DEFAULT_MAP_CENTER
from apps.missions.models import Mission

User = get_user_model()

# Missions « en cours » — lien actif sur la carte
ACTIVE_MISSION_STATUSES = {
    Mission.Status.ACCEPTED,
    Mission.Status.IN_PROGRESS,
    Mission.Status.SUBMITTED,
}

# Contact chat autorisé (mission démarrée, pas encore clôturée)
CONTACT_MISSION_STATUSES = {
    Mission.Status.IN_PROGRESS,
    Mission.Status.SUBMITTED,
    Mission.Status.DISPUTED,
}

CITY_COORDS = {
    'bamako': (12.6392, -8.0029),
    'ségou': (13.4317, -6.2157),
    'segou': (13.4317, -6.2157),
    'sikasso': (11.3175, -5.6667),
    'mopti': (14.4843, -4.1820),
    'kayes': (14.4469, -11.4345),
    'gao': (16.2719, -0.0447),
    'koutiala': (12.3917, -5.4642),
    'kati': (12.7444, -8.0722),
    'markala': (13.6731, -6.0739),
    'tombouctou': (16.7666, -3.0026),
    'timbuktu': (16.7666, -3.0026),
    'san': (13.3031, -4.8956),
    'bougouni': (11.4177, -7.4833),
}


def _jitter(user_id, lat: float, lng: float) -> tuple[float, float]:
    digest = hashlib.md5(str(user_id).encode()).hexdigest()[:8]
    h = int(digest, 16)
    return (
        lat + ((h % 1000) - 500) / 80000,
        lng + (((h // 1000) % 1000) - 500) / 80000,
    )


def _city_coords(city: str) -> tuple[float, float]:
    key = (city or 'bamako').strip().lower()
    return CITY_COORDS.get(key, (DEFAULT_MAP_CENTER['lat'], DEFAULT_MAP_CENTER['lng']))


def resolve_user_coords(user, *, exact: bool = False) -> tuple[float, float, str]:
    profile = getattr(user, 'provider_profile', None)
    if profile and profile.current_latitude is not None and profile.current_longitude is not None:
        updated = profile.location_updated_at
        fresh = not updated or updated >= timezone.now() - timedelta(hours=24)
        if exact or fresh:
            return (
                float(profile.current_latitude),
                float(profile.current_longitude),
                'gps',
            )

    city = (user.city or '').strip()
    if not city and getattr(user, 'enterprise_profile', None):
        city = (user.enterprise_profile.city or '').strip()

    lat, lng = _city_coords(city)
    if exact:
        return lat, lng, 'city'
    jlat, jlng = _jitter(user.id, lat, lng)
    return jlat, jlng, 'city'


def _display_name(user) -> str:
    if user.user_type == User.UserType.ENTERPRISE:
        ep = getattr(user, 'enterprise_profile', None)
        if ep and ep.company_name:
            return ep.company_name
    full = user.get_full_name().strip()
    return full or user.username


def _avatar_url(user, request) -> str | None:
    if not user.profile_picture:
        return None
    try:
        return request.build_absolute_uri(user.profile_picture.url)
    except Exception:
        return None


def mission_participant_ids(mission: Mission) -> set:
    ids = {mission.client_id}
    if mission.provider_id:
        ids.add(mission.provider_id)
    if mission.assigned_enterprise_id:
        ids.add(mission.assigned_enterprise.user_id)
    if mission.executing_employee_id and mission.executing_employee.user_id:
        ids.add(mission.executing_employee.user_id)
    return ids


def get_shared_active_missions(viewer, target_user) -> list[Mission]:
    """Missions en cours où viewer et target sont tous deux impliqués."""
    viewer_id = viewer.id
    target_id = target_user.id

    def participant_q(user_id):
        return (
            Q(client_id=user_id)
            | Q(provider_id=user_id)
            | Q(assigned_enterprise__user_id=user_id)
            | Q(executing_employee__user_id=user_id)
        )

    return list(
        Mission.objects.filter(status__in=ACTIVE_MISSION_STATUSES)
        .filter(participant_q(viewer_id))
        .filter(participant_q(target_id))
        .select_related('client', 'provider', 'assigned_enterprise', 'executing_employee')
        .order_by('-updated_at')
    )


def _latest_gps_on_missions(user, missions: list[Mission]):
    if not missions:
        return None
    from apps.proofs.models import GPSLocation
    mission_ids = [m.id for m in missions]
    return (
        GPSLocation.objects.filter(user=user, mission_id__in=mission_ids)
        .order_by('-timestamp')
        .first()
    )


def build_mission_link(viewer, target_user, missions: list[Mission]) -> dict | None:
    if not missions:
        return None
    mission = missions[0]
    can_contact = mission.status in CONTACT_MISSION_STATUSES
    return {
        'mission_id': str(mission.id),
        'mission_title': mission.title,
        'mission_status': mission.status,
        'mission_count': len(missions),
        'can_contact': can_contact,
        'can_navigate': True,
        'can_see_exact_location': True,
    }


def build_map_user_entry(request, viewer, user, shared_missions: list[Mission] | None = None) -> dict:
    if shared_missions is None:
        shared_missions = get_shared_active_missions(viewer, user)

    mission_link = build_mission_link(viewer, user, shared_missions)
    linked = mission_link is not None

    lat, lng, source = resolve_user_coords(user, exact=linked)

    if linked:
        gps = _latest_gps_on_missions(user, shared_missions)
        if gps:
            lat, lng = float(gps.latitude), float(gps.longitude)
            source = 'gps'

    precision = 'exact' if linked and source == 'gps' else 'approximate'

    return {
        'id': str(user.id),
        'name': _display_name(user),
        'first_name': user.first_name or '',
        'last_name': user.last_name or '',
        'user_type': user.user_type,
        'latitude': round(lat, 6),
        'longitude': round(lng, 6),
        'city': user.city or '',
        'source': source,
        'location_precision': precision,
        'profile_picture': _avatar_url(user, request),
        'is_live': source == 'gps',
        'mission_link': mission_link,
    }


def build_map_presence(request, *, search: str = '') -> list[dict]:
    viewer = request.user
    qs = (
        User.objects.filter(is_active=True)
        .exclude(user_type=User.UserType.ADMIN)
        .exclude(id=viewer.id)
        .select_related('provider_profile', 'enterprise_profile')
    )

    if search.strip():
        term = search.strip()
        qs = qs.filter(
            Q(first_name__icontains=term)
            | Q(last_name__icontains=term)
            | Q(username__icontains=term)
            | Q(city__icontains=term)
            | Q(enterprise_profile__company_name__icontains=term)
        )

    qs = qs.order_by('first_name', 'last_name')[:200]

    results = []
    for user in qs:
        results.append(build_map_user_entry(request, viewer, user))
    return results


def get_map_user_detail(request, user_id) -> dict | None:
    try:
        user = User.objects.select_related(
            'provider_profile', 'enterprise_profile',
        ).get(id=user_id, is_active=True)
    except User.DoesNotExist:
        return None

    if user.user_type == User.UserType.ADMIN:
        return None

    shared = get_shared_active_missions(request.user, user)
    return build_map_user_entry(request, request.user, user, shared)


def update_user_map_location(user, latitude, longitude) -> None:
    profile = getattr(user, 'provider_profile', None)
    if profile is None:
        from apps.users.models import ProviderProfile
        profile, _ = ProviderProfile.objects.get_or_create(user=user)

    profile.current_latitude = float(latitude)
    profile.current_longitude = float(longitude)
    profile.location_updated_at = timezone.now()
    profile.save(update_fields=['current_latitude', 'current_longitude', 'location_updated_at', 'updated_at'])
