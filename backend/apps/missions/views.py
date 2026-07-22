from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Avg, Sum
from django.utils import timezone
from django.shortcuts import get_object_or_404

from .models import (
    Category, Mission, MissionApplication, MissionSolicitation,
    MissionStatusHistory, MissionBookmark, MissionReview
)
from .serializers import (
    CategorySerializer, MissionListSerializer, MissionDetailSerializer,
    MissionCreateSerializer, MissionApplicationSerializer,
    MissionSolicitationSerializer, MissionSolicitationPreviewSerializer,
    ClientPreviewSerializer, OtherSolicitationSerializer,
    MissionStatusHistorySerializer, MissionBookmarkSerializer,
    MissionReviewSerializer, MissionStatsSerializer
)
from .permissions import IsMissionOwner, IsMissionProvider, CanApplyToMission
from apps.users.permissions import HasKycPlatformAccess
from apps.users.roles import get_effective_role
from apps.users.employee_helpers import primary_employee, user_has_active_employee_link


def _accept_application(mission, application, changed_by):
    """Accepte une candidature et assigne le prestataire."""
    from datetime import timedelta
    from apps.escrow.services import escrow_service
    from .category_rules import calculate_category_deposit
    from .services import schedule_deposit_deadline

    application.status = MissionApplication.Status.ACCEPTED
    application.responded_at = timezone.now()
    application.save()

    mission.provider = application.provider
    mission.status = Mission.Status.ACCEPTED
    mission.final_price = application.proposed_price or mission.budget
    mission.deposit_paid = False
    mission.deposit_tx_hash = None
    required = calculate_category_deposit(mission, application.provider)
    mission.required_deposit = required
    mission.deposit_amount = required
    schedule_deposit_deadline(mission)
    mission.save()

    MissionStatusHistory.objects.create(
        mission=mission,
        old_status=Mission.Status.FUNDED,
        new_status=Mission.Status.ACCEPTED,
        changed_by=changed_by,
        reason=f'Candidature acceptée: {application.provider.get_full_name()}'
    )

    mission.applications.filter(status=MissionApplication.Status.PENDING).update(
        status=MissionApplication.Status.REJECTED,
        responded_at=timezone.now()
    )

    from apps.notifications.services import notify_mission_event
    notify_mission_event(
        mission, 'accepted', application.provider,
        'Candidature acceptée — déposez votre caution',
        (
            f'Votre candidature pour « {mission.title} » a été acceptée. '
            f'Déposez {mission.required_deposit} {mission.currency} de caution '
            f'dans les 4 heures pour démarrer la mission.'
        )
    )


class CategoryViewSet(viewsets.ModelViewSet):
    """Catégories : lecture publique, écriture réservée admin/staff."""
    serializer_class = CategorySerializer
    lookup_field = 'slug'

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and (user.is_staff or getattr(user, 'user_type', '') == 'admin'):
            return Category.objects.all().order_by('order', 'name')
        return Category.objects.filter(is_active=True)

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated()]
        return []

    def _require_admin(self, request):
        if not (request.user.is_staff or getattr(request.user, 'user_type', '') == 'admin'):
            return Response({'error': 'Accès non autorisé'}, status=403)
        return None

    def create(self, request, *args, **kwargs):
        denied = self._require_admin(request)
        if denied:
            return denied
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        if not data.get('slug') and data.get('name'):
            from django.utils.text import slugify
            data['slug'] = slugify(data['name'])
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        denied = self._require_admin(request)
        if denied:
            return denied
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        denied = self._require_admin(request)
        if denied:
            return denied
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['get'])
    def missions(self, request, slug=None):
        """Récupérer les missions d'une catégorie"""
        category = self.get_object()
        missions = Mission.objects.filter(
            category=category,
            status=Mission.Status.FUNDED
        ).order_by('-created_at')
        
        serializer = MissionListSerializer(missions, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def deposit_preview(self, request, slug=None):
        """Aperçu caution selon budget et valeur marchandise."""
        from .category_rules import estimate_deposit_preview
        category = self.get_object()
        try:
            budget = float(request.query_params.get('budget', 0))
        except (TypeError, ValueError):
            return Response({'error': 'budget invalide'}, status=400)
        try:
            merchandise_value = float(request.query_params.get('merchandise_value', 0))
        except (TypeError, ValueError):
            merchandise_value = 0
        
        preview = estimate_deposit_preview(budget, merchandise_value, category)
        return Response(preview)

    @action(detail=True, methods=['get'])
    def schema(self, request, slug=None):
        """Schéma complet de la catégorie avec blocs et champs personnalisés."""
        from .category_rules import get_category_rule
        from .field_blocks import get_blocks, get_all_blocks
        
        category = self.get_object()
        rule = get_category_rule(category)
        
        # Récupérer les blocs activés
        enabled_blocks = get_blocks(rule.enabled_blocks) if rule.enabled_blocks else []
        all_blocks = get_all_blocks()
        
        # Construire le schéma
        schema = {
            'category': CategorySerializer(category).data,
            'rule': rule.to_dict(),
            'enabled_blocks': [b.to_dict() for b in enabled_blocks],
            'all_blocks': [b.to_dict() for b in all_blocks],
            'custom_fields': [f.to_dict() for f in rule.custom_fields],
            'field_overrides': {k: v.to_dict() for k, v in rule.field_overrides.items()},
            'deposit_policy': {
                'requires_deposit': rule.requires_deposit,
                'deposit_mode': rule.deposit_mode,
                'deposit_percent': rule.deposit_percent,
                'deposit_fixed': rule.deposit_fixed,
                'deposit_floor': rule.deposit_floor,
                'deposit_cap': rule.deposit_cap,
                'deposit_reason': rule.deposit_reason,
                'requires_merchandise_value': rule.requires_merchandise_value,
            },
        }
        
        return Response(schema)


class MissionViewSet(viewsets.ModelViewSet):
    """ViewSet pour la gestion des missions"""
    queryset = Mission.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        'status': ['exact', 'in'],
        'category': ['exact'],
        'priority': ['exact'],
        'requires_verified_provider': ['exact'],
        'created_at': ['gte', 'lte'],
        'budget': ['gte', 'lte'],
    }
    search_fields = ['title', 'description', 'pickup_address', 'delivery_address']
    ordering_fields = ['created_at', 'deadline', 'budget', 'priority']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """Retourne le serializer approprié selon l'action"""
        if self.action == 'list':
            return MissionListSerializer
        elif self.action == 'create':
            return MissionCreateSerializer
        elif self.action in ['retrieve', 'update', 'partial_update']:
            return MissionDetailSerializer
        return MissionListSerializer
    
    def get_permissions(self):
        """Permissions selon l'action"""
        if self.action in ['create']:
            permission_classes = [IsAuthenticated, HasKycPlatformAccess]
        elif self.action in ['update', 'partial_update', 'destroy', 'cancel']:
            permission_classes = [IsAuthenticated, IsMissionOwner]
        elif self.action in ['accept_application', 'validate', 'solicit', 'expire_decision']:
            permission_classes = [IsAuthenticated, IsMissionOwner]
        elif self.action in ['start', 'submit_proof', 'complete']:
            permission_classes = [IsAuthenticated, IsMissionProvider]
        elif self.action in ['pay_deposit']:
            permission_classes = [IsAuthenticated]
        elif self.action in ['apply']:
            permission_classes = [IsAuthenticated, HasKycPlatformAccess]
        elif self.action in ['my_missions', 'my_applications']:
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    def initial(self, request, *args, **kwargs):
        from django.core.cache import cache
        from .services import process_expired_missions
        # Évite de scanner toute la base à chaque requête mobile (max 1× / minute).
        if cache.add('missions:process_expired_tick', 1, 60):
            process_expired_missions()
        return super().initial(request, *args, **kwargs)
    
    def get_queryset(self):
        """Filtre les missions selon l'utilisateur"""
        queryset = Mission.objects.all()
        user = self.request.user

        if self.action == 'my_missions':
            from apps.users.roles import resolve_request_role
            scope = self.request.query_params.get('scope')
            role = resolve_request_role(user, self.request.query_params.get('role'))

            if user.user_type == 'enterprise':
                profile = getattr(user, 'enterprise_profile', None)
                if scope in ('provider', 'received') and profile:
                    queryset = queryset.filter(
                        Q(assigned_enterprise=profile)
                        | Q(provider__employee_links__enterprise=profile)
                    )
                else:
                    queryset = queryset.filter(client=user)
            elif role in ('client', 'enterprise') or user.user_type == 'enterprise':
                queryset = queryset.filter(client=user)
            elif role == 'provider':
                queryset = queryset.filter(provider=user)
            else:
                queryset = queryset.filter(client=user)

        elif self.action == 'list' and user.is_authenticated and not user.is_staff:
            from apps.users.roles import resolve_request_role
            role = resolve_request_role(user, self.request.query_params.get('role'))
            if role == 'provider':
                queryset = queryset.filter(
                    status=Mission.Status.FUNDED,
                    provider__isnull=True,
                )
            elif role in ('client', 'enterprise') or user.user_type == 'enterprise':
                queryset = queryset.filter(client=user)
            elif getattr(user, 'user_type', '') == 'admin':
                pass
            else:
                queryset = queryset.none()

        if self.action == 'list':
            queryset = queryset.exclude(status__in=['cancelled', 'failed', 'expired'])
        
        # Optimiser les requêtes
        queryset = queryset.select_related('client', 'provider', 'category')
        queryset = queryset.prefetch_related('applications', 'status_history')
        
        return queryset
    
    def get_serializer_context(self):
        """Ajoute le request au contexte du serializer"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        mission = serializer.save()
        detail = MissionDetailSerializer(mission, context={'request': request}).data
        return Response(detail, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='media')
    def upload_media(self, request, pk=None):
        """Upload de photos/documents contextuels (client, à la création)."""
        from .models import MissionMedia
        from .serializers import MissionMediaSerializer
        from .category_rules import get_category_rule

        mission = self.get_object()
        if mission.client_id != request.user.id:
            return Response({'error': 'Seul le client peut ajouter des médias à cette mission.'}, status=403)

        upload = request.FILES.get('file')
        if not upload:
            return Response({'error': 'Fichier requis (champ file).'}, status=400)

        field_name = (request.data.get('field_name') or 'context_photos').strip()
        label = (request.data.get('label') or '').strip()
        kind = (request.data.get('kind') or MissionMedia.MediaKind.CONTEXT).strip()

        rule = get_category_rule(mission.category)
        field_def = next((f for f in rule.custom_fields if f.name == field_name), None)
        if field_def:
            label = label or field_def.label
            if field_def.validation and field_def.validation.get('mime_types'):
                allowed = field_def.validation['mime_types']
                mime = getattr(upload, 'content_type', '') or ''
                ok = any(
                    (a.endswith('/*') and mime.startswith(a.replace('/*', '/')))
                    or mime == a
                    for a in allowed
                )
                if allowed and mime and not ok:
                    return Response({'error': f'Type de fichier non autorisé ({mime}).'}, status=400)

        media = MissionMedia.objects.create(
            mission=mission,
            uploaded_by=request.user,
            field_name=field_name,
            label=label or field_name,
            kind=kind if kind in dict(MissionMedia.MediaKind.choices) else MissionMedia.MediaKind.CONTEXT,
            file=upload,
            file_name=getattr(upload, 'name', 'upload')[:255],
            file_size=getattr(upload, 'size', 0) or 0,
            mime_type=getattr(upload, 'content_type', '') or '',
        )
        return Response(
            MissionMediaSerializer(media, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )
    
    @action(detail=False, methods=['get'])
    def available(self, request):
        """Missions ouvertes aux candidatures (prestataire ou entreprise)."""
        from apps.users.roles import can_act_as_provider, resolve_request_role, is_enterprise_manager
        from apps.users.enterprise_services import enterprise_can_apply

        user = request.user
        role = resolve_request_role(user, request.query_params.get('role'))

        if is_enterprise_manager(user) and role == 'enterprise':
            queryset = Mission.objects.filter(
                status=Mission.Status.FUNDED,
                provider__isnull=True,
                assigned_enterprise__isnull=True,
            ).exclude(client=user).select_related(
                'client', 'provider', 'category'
            ).prefetch_related('applications')
        elif can_act_as_provider(user) and role == 'provider':
            queryset = Mission.objects.filter(
                status=Mission.Status.FUNDED,
                provider__isnull=True,
            ).exclude(client=user).select_related(
                'client', 'provider', 'category'
            ).prefetch_related('applications')
            if user_has_active_employee_link(user):
                return Response({'error': 'Les agents entreprise voient leurs missions assignées'}, status=403)
        else:
            return Response({'error': 'Activez l\'espace prestataire ou entreprise'}, status=403)
        
        # Filtres géographiques (si latitude/longitude fournies)
        lat = request.query_params.get('lat')
        lng = request.query_params.get('lng')
        radius = request.query_params.get('radius', 10)  # km par défaut
        
        if lat and lng:
            import math
            lat_f, lng_f = float(lat), float(lng)
            radius_km = float(radius)

            def haversine_km(lat1, lon1, lat2, lon2):
                r = 6371
                p = math.pi / 180
                a = (
                    0.5 - math.cos((lat2 - lat1) * p) / 2
                    + math.cos(lat1 * p) * math.cos(lat2 * p) * (1 - math.cos((lon2 - lon1) * p)) / 2
                )
                return 2 * r * math.asin(math.sqrt(a))

            filtered = []
            for m in queryset:
                m_lat = m.pickup_latitude or m.delivery_latitude
                m_lng = m.pickup_longitude or m.delivery_longitude
                if m_lat is not None and m_lng is not None:
                    if haversine_km(lat_f, lng_f, m_lat, m_lng) <= radius_km:
                        filtered.append(m.id)
            queryset = queryset.filter(id__in=filtered)
        
        # Pagination
        page = self.paginate_queryset(queryset)
        ctx = {'request': request}
        if page is not None:
            serializer = MissionListSerializer(page, many=True, context=ctx)
            return self.get_paginated_response(serializer.data)
        
        serializer = MissionListSerializer(queryset, many=True, context=ctx)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_missions(self, request):
        """Missions creees (client/entreprise) ou assignees (prestataire)."""
        queryset = self.get_queryset().order_by('-created_at')
        serializer = MissionListSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def apply(self, request, pk=None):
        """Postuler à une mission (prestataire ou entreprise)."""
        mission = self.get_object()

        from apps.users.kyc_access import can_access_platform, get_kyc_block_message
        from apps.users.models import User
        from apps.users.enterprise_services import enterprise_can_apply
        from .requirements import mission_requires_id_verification

        if not can_access_platform(request.user):
            return Response(
                {
                    'error': get_kyc_block_message(request.user),
                    'kyc_access_status': request.user.kyc_status,
                    'kyc_required': True,
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        is_enterprise = request.user.user_type == User.UserType.ENTERPRISE

        if is_enterprise:
            if not enterprise_can_apply(request.user, mission):
                return Response(
                    {'error': 'Votre entreprise ne peut pas postuler à cette mission'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            from apps.users.roles import can_act_as_provider, get_effective_role
            if not can_act_as_provider(request.user) or get_effective_role(request.user) != 'provider':
                return Response({'error': 'Activez l\'espace prestataire'}, status=status.HTTP_403_FORBIDDEN)
            if user_has_active_employee_link(request.user):
                return Response(
                    {'error': 'Les agents entreprise ne postulent pas — le gérant postule pour l\'entreprise'},
                    status=status.HTTP_403_FORBIDDEN,
                )

        if mission.requires_verified_provider and request.user.kyc_status != User.KYCStatus.VERIFIED:
            return Response(
                {'error': 'Cette mission exige un prestataire dont l\'identité est vérifiée par BlockTask.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if mission_requires_id_verification(mission) and request.user.kyc_status != User.KYCStatus.VERIFIED:
            return Response(
                {'error': 'Cette mission exige une vérification d\'identité approuvée pour postuler.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        
        # Vérifier que la mission est ouverte aux candidatures
        if mission.status != Mission.Status.FUNDED:
            return Response(
                {'error': 'Cette mission n\'est plus ouverte aux candidatures'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if mission.provider_id:
            return Response(
                {
                    'error': 'Cette mission a déjà un prestataire assigné — candidatures fermées.',
                    'mission_assigned': True,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if mission.assigned_enterprise_id:
            return Response(
                {
                    'error': 'Cette mission a déjà été confiée à une entreprise — candidatures fermées.',
                    'mission_assigned': True,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if MissionApplication.objects.filter(mission=mission, provider=request.user).exists():
            return Response(
                {
                    'error': 'Vous avez déjà postulé à cette mission',
                    'already_applied': True,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        from apps.payments.models import UserPaymentMethod
        if not is_enterprise and not UserPaymentMethod.objects.filter(user=request.user, is_active=True).exists():
            return Response(
                {
                    'error': (
                        'Enregistrez une méthode de paiement Mobile Money avant de postuler. '
                        'Elle servira à recevoir vos gains après validation de la mission.'
                    ),
                    'payment_method_required': True,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        # Créer la candidature
        data = request.data.copy()
        data['mission'] = mission.pk
        if 'message' in data and 'cover_message' not in data:
            data['message'] = data.get('message', '')
        serializer = MissionApplicationSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            application = serializer.save(
                mission=mission,
                provider=request.user,
                status=MissionApplication.Status.PENDING,
                proposed_price=request.data.get('proposed_price') or mission.budget,
                message=request.data.get('message', '')
            )
            mission.applications_count = mission.applications.count()
            mission.save(update_fields=['applications_count'])
            
            # Notifier le client
            from apps.notifications.services import notify_mission_event
            notify_mission_event(
                mission, 'application', mission.client,
                'Nouvelle candidature' if not is_enterprise else 'Candidature entreprise',
                (
                    f'{request.user.get_full_name()} a postulé à votre mission « {mission.title} »'
                    if not is_enterprise
                    else f'L\'entreprise {request.user.enterprise_profile.company_name} '
                         f'a postulé à votre mission « {mission.title} »'
                ),
            )
            
            return Response(MissionApplicationSerializer(application).data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def accept_application(self, request, pk=None):
        """Accepter une candidature (client)"""
        mission = self.get_object()
        application_id = request.data.get('application_id')
        
        try:
            application = MissionApplication.objects.get(
                id=application_id,
                mission=mission,
                status='pending'
            )
        except MissionApplication.DoesNotExist:
            return Response(
                {'error': 'Candidature non trouvée'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Accepter la candidature
        if application.provider.user_type == 'enterprise':
            from apps.users.enterprise_services import accept_enterprise_as_provider
            application.status = MissionApplication.Status.ACCEPTED
            application.responded_at = timezone.now()
            application.save()
            accept_enterprise_as_provider(
                mission,
                application.provider.enterprise_profile,
                request.user,
                reason=f'Candidature entreprise acceptée: {application.provider.enterprise_profile.company_name}',
            )
            mission.applications.filter(status=MissionApplication.Status.PENDING).exclude(
                pk=application.pk
            ).update(status=MissionApplication.Status.REJECTED, responded_at=timezone.now())
        else:
            _accept_application(mission, application, request.user)
        
        return Response({'status': 'Candidature acceptée'})

    @action(detail=True, methods=['post'])
    def solicit(self, request, pk=None):
        """Solliciter un prestataire ou une entreprise pour une mission financée (client)."""
        from apps.users.models import User, EnterpriseProfile
        from apps.users.roles import can_act_as_provider

        mission = self.get_object()
        provider_id = request.data.get('provider_id')
        enterprise_id = request.data.get('enterprise_id')
        message = (request.data.get('message') or '').strip()

        if mission.client != request.user:
            return Response({'error': 'Non autorisé'}, status=status.HTTP_403_FORBIDDEN)
        if mission.status != Mission.Status.FUNDED:
            return Response(
                {'error': 'Seules les missions financées peuvent être proposées'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if mission.provider_id:
            return Response(
                {'error': 'Cette mission a déjà un prestataire assigné'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if provider_id and enterprise_id:
            return Response(
                {'error': 'Indiquez un prestataire ou une entreprise, pas les deux'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not provider_id and not enterprise_id:
            return Response(
                {'error': 'provider_id ou enterprise_id requis'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from apps.notifications.services import create_notification
        client_name = request.user.get_full_name()

        if enterprise_id:
            try:
                enterprise = EnterpriseProfile.objects.select_related('user').get(
                    user_id=enterprise_id,
                    user__is_active=True,
                )
            except EnterpriseProfile.DoesNotExist:
                return Response({'error': 'Entreprise introuvable'}, status=status.HTTP_404_NOT_FOUND)

            existing = MissionSolicitation.objects.filter(
                mission=mission,
                enterprise=enterprise,
                target_type=MissionSolicitation.TargetType.ENTERPRISE,
                status=MissionSolicitation.Status.PENDING,
            ).first()
            if existing:
                return Response(
                    MissionSolicitationSerializer(existing, context={'request': request}).data,
                    status=status.HTTP_200_OK,
                )

            solicitation = MissionSolicitation.objects.create(
                mission=mission,
                target_type=MissionSolicitation.TargetType.ENTERPRISE,
                enterprise=enterprise,
                client=request.user,
                message=message,
                status=MissionSolicitation.Status.PENDING,
            )

            create_notification(
                enterprise.user,
                'mission_created',
                'Nouvelle sollicitation entreprise',
                f'{client_name} souhaite confier la mission « {mission.title} » à {enterprise.company_name}.',
                mission=mission,
                action_url='/enterprise/solicitations',
            )
        else:
            try:
                provider = User.objects.get(pk=provider_id, is_active=True)
            except User.DoesNotExist:
                return Response({'error': 'Prestataire introuvable'}, status=status.HTTP_404_NOT_FOUND)

            if not can_act_as_provider(provider):
                return Response({'error': 'Cet utilisateur n\'est pas prestataire'}, status=status.HTTP_400_BAD_REQUEST)
            if provider.pk == request.user.pk:
                return Response({'error': 'Vous ne pouvez pas vous solliciter vous-même'}, status=status.HTTP_400_BAD_REQUEST)

            existing = MissionSolicitation.objects.filter(
                mission=mission,
                provider=provider,
                target_type=MissionSolicitation.TargetType.PROVIDER,
                status=MissionSolicitation.Status.PENDING,
            ).first()
            if existing:
                return Response(
                    MissionSolicitationSerializer(existing, context={'request': request}).data,
                    status=status.HTTP_200_OK,
                )

            if MissionSolicitation.objects.filter(
                mission=mission,
                provider=provider,
                target_type=MissionSolicitation.TargetType.PROVIDER,
                status=MissionSolicitation.Status.ACCEPTED,
            ).exists():
                return Response(
                    {'error': 'Ce prestataire a déjà accepté une sollicitation pour cette mission'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            solicitation = MissionSolicitation.objects.create(
                mission=mission,
                target_type=MissionSolicitation.TargetType.PROVIDER,
                provider=provider,
                client=request.user,
                message=message,
                status=MissionSolicitation.Status.PENDING,
            )

            create_notification(
                provider,
                'mission_created',
                'Nouvelle sollicitation',
                f'{client_name} souhaite vous confier la mission « {mission.title} ».',
                mission=mission,
                action_url='/provider/missions/solicitations',
            )

        return Response(
            MissionSolicitationSerializer(solicitation, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )
    
    @action(detail=True, methods=['post'])
    def pay_deposit(self, request, pk=None):
        """Déposer la caution mission (prestataire ou solde entreprise)."""
        mission = self.get_object()

        from decimal import Decimal
        from apps.escrow.services import escrow_service

        if mission.assigned_enterprise_id:
            enterprise = mission.assigned_enterprise
            if request.user != enterprise.user:
                return Response(
                    {'error': 'Seul le gérant peut déposer la caution entreprise'},
                    status=403,
                )
            if mission.status != Mission.Status.ACCEPTED:
                return Response({'error': 'La mission n\'est pas en attente de caution'}, status=400)
            if mission.deposit_paid:
                return Response({'message': 'Caution déjà déposée'}, status=200)
            if mission.deposit_deadline and mission.deposit_deadline < timezone.now():
                return Response(
                    {'error': 'Délai de caution dépassé.', 'deposit_expired': True},
                    status=400,
                )
            top_up = request.data.get('amount')
            if top_up is not None:
                from apps.payments.deposit_funding import fund_deposit_balance
                from apps.payments.mobile_money import MobileMoneyError
                try:
                    fund_deposit_balance(request.user, {
                        'amount': top_up,
                        'phone_number': request.data.get('phone_number'),
                        'operator': request.data.get('operator'),
                        'otp': request.data.get('otp') or request.data.get('pin'),
                    })
                    enterprise.refresh_from_db()
                except MobileMoneyError as exc:
                    body = {'error': str(exc), 'code': exc.code}
                    if exc.code == 'payment_method_required':
                        body['payment_method_required'] = True
                    return Response(body, status=400)
            required = mission.required_deposit or calculate_category_deposit(mission, request.user)
            if enterprise.deposit_balance < required:
                return Response(
                    {
                        'error': (
                            f'Solde caution entreprise insuffisant ({enterprise.deposit_balance} XOF). '
                            f'Déposez au moins {required} XOF.'
                        ),
                        'required_deposit': float(required),
                        'current_balance': float(enterprise.deposit_balance),
                        'deposit_deadline': mission.deposit_deadline.isoformat() if mission.deposit_deadline else None,
                    },
                    status=400,
                )
            deposit = escrow_service.lock_enterprise_deposit(mission, enterprise)
            if not deposit:
                return Response({'error': 'Impossible de bloquer la caution entreprise'}, status=400)
            from apps.notifications.services import notify_mission_event
            enterprise_name = enterprise.company_name or enterprise.user.get_full_name() or 'Entreprise'
            notify_mission_event(
                mission, 'deposit_paid', mission.client,
                'Caution entreprise déposée',
                (
                    f'L\'entreprise « {enterprise_name} » a confirmé son engagement '
                    f'pour « {mission.title} » en déposant sa caution. '
                    'Vous serez notifié lorsque la mission démarre.'
                ),
            )
            return Response({
                'status': 'Caution entreprise déposée',
                'deposit_paid': True,
                'required_deposit': float(required),
                'next_step': 'assign_employee',
            })

        if mission.provider != request.user:
            return Response({'error': 'Seul le prestataire assigné peut déposer la caution'}, status=403)
        if mission.status != Mission.Status.ACCEPTED:
            return Response({'error': 'La mission n\'est pas en attente de caution'}, status=400)
        if mission.deposit_paid:
            return Response({'message': 'Caution déjà déposée'}, status=200)
        if mission.deposit_deadline and mission.deposit_deadline < timezone.now():
            return Response(
                {'error': 'Délai de caution dépassé. La mission sera réouverte.', 'deposit_expired': True},
                status=400,
            )

        from decimal import Decimal
        from apps.escrow.services import escrow_service

        profile = request.user.provider_profile
        top_up = request.data.get('amount')
        if top_up is not None:
            from apps.payments.deposit_funding import fund_deposit_balance
            from apps.payments.mobile_money import MobileMoneyError
            try:
                fund_deposit_balance(request.user, {
                    'amount': top_up,
                    'phone_number': request.data.get('phone_number'),
                    'operator': request.data.get('operator'),
                    'otp': request.data.get('otp') or request.data.get('pin'),
                })
                profile.refresh_from_db()
            except MobileMoneyError as exc:
                body = {'error': str(exc), 'code': exc.code}
                if exc.code == 'payment_method_required':
                    body['payment_method_required'] = True
                return Response(body, status=400)

        from .category_rules import calculate_category_deposit
        required = mission.required_deposit or calculate_category_deposit(mission, request.user)
        if profile.deposit_balance < required:
            return Response(
                {
                    'error': (
                        f'Solde caution insuffisant ({profile.deposit_balance} XOF). '
                        f'Déposez au moins {required} XOF.'
                    ),
                    'required_deposit': float(required),
                    'current_balance': float(profile.deposit_balance),
                    'deposit_deadline': mission.deposit_deadline.isoformat() if mission.deposit_deadline else None,
                },
                status=400,
            )

        deposit = escrow_service.lock_provider_deposit(mission, request.user)
        if not deposit:
            return Response({'error': 'Impossible de bloquer la caution'}, status=400)

        from apps.notifications.services import notify_mission_event
        notify_mission_event(
            mission,
            'deposit_paid',
            mission.client,
            'Caution reçue',
            f'Le prestataire a déposé la caution pour « {mission.title} ». La mission peut démarrer.',
        )

        if _truthy(request.data.get('gps_consent')):
            _apply_gps_consent(mission, request.user)

        response_data = {
            'status': 'Caution déposée',
            'deposit_paid': True,
            'required_deposit': float(required),
            'deposit_deadline': mission.deposit_deadline.isoformat() if mission.deposit_deadline else None,
            'provider_gps_consent_at': (
                mission.provider_gps_consent_at.isoformat()
                if mission.provider_gps_consent_at else None
            ),
        }

        if _truthy(request.data.get('auto_start')):
            if _start_mission_record(
                mission,
                request.user,
                reason='Mission démarrée automatiquement après dépôt de caution',
            ):
                response_data['mission_started'] = True
                response_data['status'] = 'Caution déposée — mission démarrée'
                notify_mission_event(
                    mission,
                    'started',
                    mission.client,
                    'Mission démarrée',
                    f'Le prestataire a démarré « {mission.title} ».',
                )

        return Response(response_data)

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """Démarrer une mission (prestataire)"""
        mission = self.get_object()

        if not _mission_start_allowed(request.user, mission):
            # Analyser pourquoi l'utilisateur ne peut pas démarrer
            reasons = []
            
            # Vérifier si c'est le bon utilisateur
            is_provider = mission.provider_id == request.user.id
            is_enterprise = mission.assigned_enterprise and mission.assigned_enterprise.user_id == request.user.id
            is_employee = mission.executing_employee and mission.executing_employee.user_id == request.user.id
            
            if not (is_provider or is_enterprise or is_employee):
                reasons.append("Vous n'êtes pas autorisé à démarrer cette mission")
                
                # Suggérer qui peut démarrer
                if mission.executing_employee and mission.executing_employee.user:
                    reasons.append(f"Employé désigné: {mission.executing_employee.first_name} {mission.executing_employee.last_name}")
                elif mission.provider:
                    reasons.append(f"Prestataire: {mission.provider.get_full_name()}")
                elif mission.assigned_enterprise:
                    reasons.append(f"Entreprise: {mission.assigned_enterprise.company_name}")
            
            # Vérifier si le dépôt est payé
            if not mission.deposit_paid:
                reasons.append("La caution n'a pas été payée")
                if mission.required_deposit:
                    reasons.append(f"Caution requise: {mission.required_deposit} {mission.currency}")
                if mission.deposit_deadline:
                    from django.utils import timezone
                    if mission.deposit_deadline < timezone.now():
                        reasons.append("⚠️ Le délai de dépôt est dépassé")
                    else:
                        time_left = mission.deposit_deadline - timezone.now()
                        hours_left = time_left.total_seconds() / 3600
                        reasons.append(f"Temps restant: {hours_left:.1f} heures")
            
            # Vérifier si l'échéance est dépassée
            from django.utils import timezone
            if mission.deposit_deadline and mission.deposit_deadline < timezone.now():
                if mission.deposit_paid:
                    reasons.append("⚠️ L'échéance est dépassée mais la caution est payée")
                    reasons.append("L'employé peut signaler l'échéance pour continuer")
                else:
                    reasons.append("⚠️ L'échéance est dépassée et la caution n'est pas payée")
                    reasons.append("La mission est expirée - contactez le client")
            
            return Response({
                'error': 'Impossible de démarrer cette mission',
                'reasons': reasons,
                'mission_info': {
                    'title': mission.title,
                    'status': mission.status,
                    'deposit_paid': mission.deposit_paid,
                    'deposit_required': float(mission.required_deposit or 0),
                    'deposit_deadline': mission.deposit_deadline.isoformat() if mission.deposit_deadline else None,
                    'assigned_employee': f"{mission.executing_employee.first_name} {mission.executing_employee.last_name}" if mission.executing_employee else None,
                    'assigned_enterprise': mission.assigned_enterprise.company_name if mission.assigned_enterprise else None
                },
                'suggestions': get_start_suggestions(mission, request.user)
            }, status=status.HTTP_403_FORBIDDEN)

        if not mission.deposit_paid:
            return Response(
                {
                    'error': 'Déposez la caution avant de démarrer la mission',
                    'deposit_required': True,
                    'required_deposit': float(mission.required_deposit or 0),
                    'deposit_deadline': mission.deposit_deadline.isoformat() if mission.deposit_deadline else None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if mission.deposit_deadline and mission.deposit_deadline < timezone.now() and not mission.deposit_paid:
            return Response(
                {'error': 'Délai de caution dépassé', 'deposit_expired': True},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        if mission.status != Mission.Status.ACCEPTED:
            return Response(
                {'error': 'La mission doit être acceptée pour être démarrée'},
                status=status.HTTP_400_BAD_REQUEST
            )

        _start_mission_record(mission, request.user, reason='Mission démarrée par le prestataire')

        return Response({'status': 'Mission démarrée'})
    
    @action(detail=True, methods=['post'])
    def submit_proof(self, request, pk=None):
        """Soumettre une preuve d'exécution"""
        mission = self.get_object()
        
        if mission.status not in [Mission.Status.IN_PROGRESS, Mission.Status.SUBMITTED]:
            return Response(
                {'error': 'Impossible de soumettre des preuves pour cette mission'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from apps.proofs.models import MissionProof, ProofChecklist
        from apps.notifications.services import notify_mission_event
        from .services import schedule_auto_validation, DEFAULT_AUTO_VALIDATION_HOURS

        proof_count = MissionProof.objects.filter(mission=mission).count()
        if proof_count == 0 and not request.data.get('force'):
            return Response(
                {'error': 'Ajoutez au moins une preuve via POST /api/proofs/proofs/'},
                status=status.HTTP_400_BAD_REQUEST
            )

        old_status = mission.status
        mission.status = Mission.Status.SUBMITTED
        mission.save(update_fields=['status', 'updated_at'])

        checklist, _ = ProofChecklist.objects.get_or_create(mission=mission)
        if checklist.completion_percentage >= 100:
            checklist.is_complete = True
            checklist.completed_at = timezone.now()
            checklist.save()
        
        MissionStatusHistory.objects.create(
            mission=mission,
            old_status=old_status,
            new_status=Mission.Status.SUBMITTED,
            changed_by=request.user,
            reason='Preuves soumises par le prestataire'
        )

        schedule_auto_validation(mission)

        notify_mission_event(
            mission, 'proof_submitted', mission.client,
            'Preuves soumises',
            (
                f'Le prestataire a soumis les preuves pour « {mission.title} ». '
                f'Validez sous {mission.auto_validation_delay or DEFAULT_AUTO_VALIDATION_HOURS}h '
                f'sinon le paiement sera libéré automatiquement.'
            ),
        )
        
        return Response({
            'status': 'Preuves soumises',
            'proof_count': proof_count,
            'auto_validation_scheduled_at': mission.auto_validation_scheduled_at,
            'auto_validation_delay_hours': mission.auto_validation_delay or DEFAULT_AUTO_VALIDATION_HOURS,
        })
    
    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        """Valider la mission (client)"""
        mission = self.get_object()
        
        if mission.client_id != request.user.id:
            return Response({'error': 'Seul le client peut valider cette mission'}, status=403)

        from .services import complete_mission_and_payout
        result = complete_mission_and_payout(
            mission,
            changed_by=request.user,
            reason='Mission validée par le client',
        )
        if not result.get('ok'):
            return Response({'error': result.get('error', 'Validation impossible')}, status=400)

        payload = {'status': 'Mission validée et terminée', 'payout': result.get('payout')}
        if result.get('payout_error'):
            payload['status'] = 'Mission validée, paiement prestataire en attente'
            payload['error'] = result['payout_error']
        return Response(payload)
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Marquer la mission comme complétée (après validation et paiement)"""
        mission = self.get_object()
        
        if mission.status != Mission.Status.COMPLETED:
            return Response(
                {'error': 'La mission est déjà complétée'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response({'status': 'Mission déjà complétée'})
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Annuler une mission (client) ou abandonner en cours (prestataire)."""
        mission = self.get_object()
        reason = (request.data.get('reason') or '').strip()

        # Prestataire : annulation uniquement si mission en cours
        if mission.provider_id == request.user.id and mission.client_id != request.user.id:
            from .services import provider_cancel_in_progress
            result = provider_cancel_in_progress(
                mission,
                changed_by=request.user,
                reason=reason or 'Abandon de la mission par le prestataire',
            )
            if not result.get('ok'):
                return Response({'error': result.get('error')}, status=400)
            return Response({
                'status': 'Mission annulée',
                'client_refunded': bool(result.get('client_refund')),
                'deposit_forfeited': result.get('deposit_forfeited', False),
                'message': (
                    'Fonds remboursés au client. Votre caution a été confisquée '
                    'suite à l\'abandon en cours d\'exécution.'
                ),
            })

        if mission.client != request.user:
            return Response({'error': 'Seul le client ou le prestataire assigné peut annuler'}, status=403)

        from .services import cancel_mission_with_refunds, DISPUTE_REQUIRED_STATUSES

        if mission.status in DISPUTE_REQUIRED_STATUSES:
            return Response(
                {
                    'error': (
                        'La mission est en cours ou des preuves ont été soumises. '
                        'Ouvrez un litige pour résoudre la situation.'
                    ),
                    'dispute_required': True,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        reason = request.data.get('reason', 'Mission annulée par le client')
        result = cancel_mission_with_refunds(
            mission,
            changed_by=request.user,
            reason=reason,
            new_status=Mission.Status.CANCELLED,
        )

        if not result.get('ok'):
            return Response({'error': result.get('error', 'Annulation impossible')}, status=400)

        return Response({
            'status': 'Mission annulée',
            'client_refund': result.get('client_refund'),
            'deposit_refunded': result.get('deposit_refunded'),
        })

    @action(detail=True, methods=['post'])
    def expire_decision(self, request, pk=None):
        """
        Décision client après expiration de l'échéance (prestataire assigné).
        action: continue | cancel
        new_deadline: requis si action=continue (ISO 8601)
        """
        mission = self.get_object()

        if mission.client != request.user:
            return Response({'error': 'Seul le client peut décider'}, status=403)

        action_type = (request.data.get('action') or '').strip().lower()
        if action_type not in ('continue', 'cancel'):
            return Response(
                {'error': 'action requise : continue ou cancel'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from .services import (
            cancel_mission_with_refunds,
            continue_expired_mission,
            DISPUTE_REQUIRED_STATUSES,
        )

        if mission.status in DISPUTE_REQUIRED_STATUSES:
            return Response(
                {
                    'error': 'Mission en cours — ouvrez un litige pour annuler.',
                    'dispute_required': True,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if action_type == 'continue':
            new_deadline_raw = request.data.get('new_deadline')
            if not new_deadline_raw:
                return Response(
                    {'error': 'new_deadline requis pour prolonger la mission'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            try:
                from django.utils.dateparse import parse_datetime
                new_deadline = parse_datetime(new_deadline_raw)
                if new_deadline is None:
                    raise ValueError('invalid')
                if timezone.is_naive(new_deadline):
                    new_deadline = timezone.make_aware(new_deadline)
            except (ValueError, TypeError):
                return Response({'error': 'new_deadline invalide (format ISO 8601)'}, status=400)

            result = continue_expired_mission(
                mission,
                new_deadline=new_deadline,
                changed_by=request.user,
            )
            if not result.get('ok'):
                return Response({'error': result.get('error')}, status=400)
            mission.refresh_from_db()
            return Response({
                'status': 'Mission prolongée',
                'deadline': result['deadline'],
                'mission': MissionDetailSerializer(mission, context={'request': request}).data,
            })

        # cancel
        reason = request.data.get(
            'reason',
            'Mission annulée par le client après expiration de l\'échéance',
        )
        result = cancel_mission_with_refunds(
            mission,
            changed_by=request.user,
            reason=reason,
            new_status=Mission.Status.CANCELLED,
        )
        if not result.get('ok'):
            return Response({'error': result.get('error')}, status=400)
        return Response({
            'status': 'Mission annulée',
            'client_refund': result.get('client_refund'),
            'deposit_refunded': result.get('deposit_refunded'),
        })
    
    @action(detail=True, methods=['post'])
    def dispute(self, request, pk=None):
        """Ouvrir un litige sur une mission"""
        mission = self.get_object()
        
        if mission.status not in [Mission.Status.IN_PROGRESS, Mission.Status.SUBMITTED, Mission.Status.COMPLETED]:
            return Response(
                {'error': 'Impossible d\'ouvrir un litige sur cette mission'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if mission.disputes.filter(status__in=['open', 'under_review', 'arbitration']).exists():
            return Response({'error': 'Un litige est déjà ouvert pour cette mission'}, status=400)
        
        old_status = mission.status
        mission.status = Mission.Status.DISPUTED
        mission.save()
        
        MissionStatusHistory.objects.create(
            mission=mission,
            old_status=old_status,
            new_status=Mission.Status.DISPUTED,
            changed_by=request.user,
            reason='Litige ouvert'
        )

        defendant = mission.provider if request.user == mission.client else mission.client
        if not defendant:
            return Response({'error': 'Mission sans contrepartie'}, status=400)

        from apps.disputes.models import Dispute
        from apps.notifications.services import create_notification

        dispute = Dispute.objects.create(
            mission=mission,
            plaintiff=request.user,
            defendant=defendant,
            reason=request.data.get('reason', 'other'),
            description=request.data.get('description', ''),
            requested_resolution=request.data.get('requested_resolution', ''),
            status=Dispute.Status.OPEN,
        )

        create_notification(
            defendant,
            'dispute_opened',
            'Litige ouvert',
            f'Un litige a été ouvert pour la mission « {mission.title} »',
            mission=mission,
            dispute=dispute,
            priority='high',
        )

        if mission.provider_id:
            from apps.reputation.services import recalculate_reputation
            recalculate_reputation(
                mission.provider,
                event_type='dispute_opened',
                mission=mission,
                description='Litige ouvert sur une mission',
            )
        
        return Response({
            'status': 'Litige ouvert',
            'dispute_id': str(dispute.id),
        })
    
    @action(detail=True, methods=['get'])
    def applications(self, request, pk=None):
        """Récupérer les candidatures d'une mission"""
        mission = self.get_object()
        
        # Vérifier que l'utilisateur est le client
        if request.user != mission.client:
            return Response(
                {'error': 'Accès non autorisé'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        applications = mission.applications.select_related(
            'provider', 'provider__provider_profile'
        ).order_by('-created_at')
        serializer = MissionApplicationSerializer(applications, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def admin_list(self, request):
        """Liste complète de toutes les missions pour l'admin"""
        if not request.user.is_staff and not request.user.user_type == 'admin':
            from rest_framework.response import Response as R
            return R({'error': 'Accès non autorisé'}, status=403)
        
        queryset = Mission.objects.select_related('client', 'provider', 'category').order_by('-created_at')
        
        # Filtres optionnels
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(client__first_name__icontains=search) |
                Q(client__last_name__icontains=search) |
                Q(client__email__icontains=search)
            )
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = MissionListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = MissionListSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def admin_cancel(self, request, pk=None):
        """Annuler une mission (admin uniquement)"""
        if not request.user.is_staff and not request.user.user_type == 'admin':
            return Response({'error': 'Accès non autorisé'}, status=403)
        
        mission = self.get_object()
        if mission.status in ['completed', 'cancelled']:
            return Response({'error': 'Mission déjà terminée ou annulée'}, status=400)
        
        old_status = mission.status
        mission.status = 'cancelled'
        mission.save()
        
        MissionStatusHistory.objects.create(
            mission=mission,
            old_status=old_status,
            new_status='cancelled',
            changed_by=request.user,
            reason=request.data.get('reason', 'Annulée par un administrateur')
        )
        return Response({'status': 'Mission annulée'})

    @action(detail=True, methods=['post'], url_path='admin_action')
    def admin_action(self, request, pk=None):
        """Actions admin : fund | complete | release_payment."""
        if not request.user.is_staff and getattr(request.user, 'user_type', '') != 'admin':
            return Response({'error': 'Accès non autorisé'}, status=403)

        mission = self.get_object()
        action_name = (request.data.get('action') or '').strip().lower()
        reason = request.data.get('reason') or f'Action admin : {action_name}'

        if action_name == 'fund':
            if mission.status not in (Mission.Status.PENDING, Mission.Status.DRAFT, 'pending', 'draft'):
                return Response({'error': f'Statut incompatible: {mission.status}'}, status=400)
            old = mission.status
            mission.status = Mission.Status.FUNDED
            mission.save(update_fields=['status', 'updated_at'])
            MissionStatusHistory.objects.create(
                mission=mission, old_status=old, new_status=Mission.Status.FUNDED,
                changed_by=request.user, reason=reason,
            )
            return Response({'ok': True, 'status': mission.status})

        if action_name in ('release_payment', 'complete'):
            if mission.status != Mission.Status.SUBMITTED and action_name == 'release_payment':
                return Response(
                    {'error': 'Libération possible uniquement pour missions avec preuves soumises'},
                    status=400,
                )
            if action_name == 'complete' and mission.status not in (
                Mission.Status.SUBMITTED, Mission.Status.IN_PROGRESS, Mission.Status.ACCEPTED,
            ):
                return Response({'error': f'Statut incompatible: {mission.status}'}, status=400)

            from .services import complete_mission_and_payout
            result = complete_mission_and_payout(
                mission,
                changed_by=request.user,
                reason=reason or 'Admin : validation et libération du paiement',
            )
            if not result.get('ok'):
                return Response(result, status=400)
            return Response(result)

        return Response(
            {'error': 'Action inconnue. Utilisez: fund, release_payment, complete'},
            status=400,
        )

    @action(detail=True, methods=['get'])
    def tracking(self, request, pk=None):
        """Données de suivi GPS pour une mission (client / prestataire)."""
        mission = self.get_object()
        if request.user not in (mission.client, mission.provider) and not request.user.is_staff:
            return Response({'error': 'Non autorisé'}, status=403)

        from apps.proofs.models import GPSLocation

        pickup = {
            'latitude': mission.pickup_latitude or 12.6392,
            'longitude': mission.pickup_longitude or -8.0029,
            'timestamp': mission.created_at.isoformat(),
        }
        delivery = {
            'latitude': mission.delivery_latitude or pickup['latitude'],
            'longitude': mission.delivery_longitude or pickup['longitude'],
            'timestamp': mission.deadline.isoformat() if mission.deadline else mission.created_at.isoformat(),
        }

        route = GPSLocation.objects.filter(mission=mission).order_by('timestamp')
        path = [
            {
                'latitude': p.latitude,
                'longitude': p.longitude,
                'timestamp': p.timestamp.isoformat(),
            }
            for p in route
        ]
        current = path[-1] if path else None

        return Response({
            'missionId': str(mission.id),
            'providerId': str(mission.provider_id) if mission.provider_id else '',
            'providerName': mission.provider.get_full_name() if mission.provider else '',
            'pickup': pickup,
            'delivery': delivery,
            'currentPosition': current,
            'path': path,
            'status': mission.status,
        })

    @action(detail=True, methods=['post'], url_path='location')
    def post_location(self, request, pk=None):
        """Enregistre une position GPS (prestataire)."""
        mission = self.get_object()
        if mission.provider != request.user and not request.user.is_staff:
            return Response({'error': 'Seul le prestataire peut partager sa position'}, status=403)
        if mission.status not in [Mission.Status.ACCEPTED, Mission.Status.IN_PROGRESS]:
            return Response({'error': 'Mission non en cours'}, status=400)

        from apps.proofs.models import GPSLocation
        from apps.proofs.serializers import GPSLocationSerializer, GPSLocationCreateSerializer
        from apps.tracking.broadcast import broadcast_gps_location

        serializer = GPSLocationCreateSerializer(
            data={**request.data, 'location_type': request.data.get('location_type', 'current')},
            context={'request': request, 'mission_id': str(mission.id)},
        )
        serializer.is_valid(raise_exception=True)
        location = serializer.save()

        if hasattr(request.user, 'provider_profile'):
            profile = request.user.provider_profile
            profile.current_latitude = location.latitude
            profile.current_longitude = location.longitude
            profile.location_updated_at = timezone.now()
            profile.save(update_fields=['current_latitude', 'current_longitude', 'location_updated_at'])

        broadcast_gps_location(mission.id, GPSLocationSerializer(location).data)
        return Response(GPSLocationSerializer(location).data, status=201)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Statistiques des missions pour l'utilisateur"""
        user = request.user
        from apps.users.roles import resolve_request_role
        role = resolve_request_role(user, request.query_params.get('role'))

        if role in ('client', 'enterprise'):
            stats = Mission.objects.filter(client=user).aggregate(
                total_missions=Count('id'),
                funded_missions=Count('id', filter=Q(status=Mission.Status.FUNDED)),
                in_progress_missions=Count('id', filter=Q(status=Mission.Status.IN_PROGRESS)),
                completed_missions=Count('id', filter=Q(status=Mission.Status.COMPLETED)),
                total_spent=Sum('budget', filter=Q(status='completed')),
                average_mission_value=Avg('budget')
            )
        elif role == 'provider':
            from django.db.models import F, Value, DecimalField
            from django.db.models.functions import Coalesce
            earnings = Coalesce(
                F('final_price'), F('budget'), Value(0),
                output_field=DecimalField(max_digits=15, decimal_places=2),
            )
            stats = Mission.objects.filter(provider=user).aggregate(
                total_missions=Count('id'),
                in_progress_missions=Count('id', filter=Q(status=Mission.Status.IN_PROGRESS)),
                completed_missions=Count('id', filter=Q(status=Mission.Status.COMPLETED)),
                total_earned=Sum(earnings, filter=Q(status=Mission.Status.COMPLETED)),
                average_mission_value=Avg(earnings, filter=Q(status=Mission.Status.COMPLETED)),
            )
        else:
            stats = {}
        
        return Response(stats)


class MissionApplicationViewSet(viewsets.ModelViewSet):
    """ViewSet pour les candidatures"""
    serializer_class = MissionApplicationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filtrer les candidatures selon l'utilisateur"""
        user = self.request.user
        from django.db.models import Q
        return MissionApplication.objects.filter(
            Q(provider=user) | Q(mission__client=user)
        ).select_related('provider', 'provider__provider_profile', 'mission')
    
    @action(detail=False, methods=['get'])
    def my_applications(self, request):
        """Candidatures du prestataire ou d un client."""
        user = request.user
        scope = request.query_params.get('scope')
        if scope == 'provider':
            queryset = MissionApplication.objects.filter(provider=user)
        elif scope == 'client':
            queryset = MissionApplication.objects.filter(mission__client=user)
        else:
            queryset = self.get_queryset()
        queryset = queryset.select_related('provider', 'provider__provider_profile', 'mission')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def withdraw(self, request, pk=None):
        """Retirer une candidature"""
        application = self.get_object()
        
        if application.provider != request.user:
            return Response(
                {'error': 'Accès non autorisé'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if application.status != 'pending':
            return Response(
                {'error': 'Impossible de retirer cette candidature'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        application.status = 'withdrawn'
        application.save()
        
        return Response({'status': 'Candidature retirée'})

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """Accepter une candidature (client) — endpoint /applications/{id}/accept/"""
        application = self.get_object()
        mission = application.mission

        if mission.client != request.user and not request.user.is_staff:
            return Response({'error': 'Non autorisé'}, status=status.HTTP_403_FORBIDDEN)
        if application.status != MissionApplication.Status.PENDING:
            return Response({'error': 'Candidature déjà traitée'}, status=status.HTTP_400_BAD_REQUEST)

        _accept_application(mission, application, request.user)
        return Response({'status': 'Candidature acceptée'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Refuser une candidature (client)"""
        application = self.get_object()
        mission = application.mission

        if mission.client != request.user and not request.user.is_staff:
            return Response({'error': 'Non autorisé'}, status=status.HTTP_403_FORBIDDEN)
        if application.status != MissionApplication.Status.PENDING:
            return Response({'error': 'Candidature déjà traitée'}, status=status.HTTP_400_BAD_REQUEST)

        application.status = MissionApplication.Status.REJECTED
        application.responded_at = timezone.now()
        application.save()

        from apps.notifications.services import create_notification
        create_notification(
            application.provider,
            'mission_cancelled',
            'Candidature refusée',
            f'Votre candidature pour « {mission.title} » a été refusée.',
            mission=mission,
        )
        return Response({'status': 'Candidature refusée'})


def _expire_other_solicitations(mission, keep_pk):
    MissionSolicitation.objects.filter(
        mission=mission,
        status=MissionSolicitation.Status.PENDING,
    ).exclude(pk=keep_pk).update(
        status=MissionSolicitation.Status.EXPIRED,
        responded_at=timezone.now(),
    )


def _accept_solicitation(solicitation, changed_by):
    """Accepte une sollicitation prestataire : crée la candidature et assigne le prestataire."""
    mission = solicitation.mission
    provider = solicitation.provider

    application, created = MissionApplication.objects.get_or_create(
        mission=mission,
        provider=provider,
        defaults={
            'message': solicitation.message or 'Acceptation de la sollicitation client',
            'proposed_price': mission.budget,
            'status': MissionApplication.Status.PENDING,
        },
    )
    if not created and application.status != MissionApplication.Status.PENDING:
        raise ValueError('Candidature déjà traitée')

    _accept_application(mission, application, changed_by)

    solicitation.status = MissionSolicitation.Status.ACCEPTED
    solicitation.responded_at = timezone.now()
    solicitation.save(update_fields=['status', 'responded_at', 'updated_at'])

    _expire_other_solicitations(mission, solicitation.pk)


def _accept_enterprise_solicitation(solicitation):
    """Accepte une sollicitation entreprise — caution sur solde entreprise."""
    from apps.users.enterprise_services import accept_enterprise_as_provider

    mission = solicitation.mission
    accept_enterprise_as_provider(
        mission,
        solicitation.enterprise,
        solicitation.enterprise.user,
        reason=f'Sollicitation acceptée par {solicitation.enterprise.company_name}',
    )

    solicitation.status = MissionSolicitation.Status.ACCEPTED
    solicitation.responded_at = timezone.now()
    solicitation.save(update_fields=['status', 'responded_at', 'updated_at'])
    _expire_other_solicitations(mission, solicitation.pk)


def _solicitation_workflow_state(request, solicitation, mission):
    """Étapes : accepter → caution → assigner employé (entreprise) → démarrer."""
    is_enterprise = solicitation.target_type == MissionSolicitation.TargetType.ENTERPRISE
    sol_done = solicitation.status == MissionSolicitation.Status.ACCEPTED

    if solicitation.status == MissionSolicitation.Status.PENDING:
        current_step = 'accept'
    elif mission.status == Mission.Status.ACCEPTED and not mission.deposit_paid:
        current_step = 'deposit'
    elif is_enterprise and mission.deposit_paid and not mission.executing_employee_id:
        current_step = 'assign_employee'
    elif mission.status == Mission.Status.ACCEPTED and mission.deposit_paid:
        current_step = 'start'
    elif mission.status in (
        Mission.Status.IN_PROGRESS,
        Mission.Status.SUBMITTED,
        Mission.Status.COMPLETED,
    ):
        current_step = 'started'
    else:
        current_step = 'accept'

    deposit_balance = None
    if is_enterprise and solicitation.enterprise_id:
        deposit_balance = float(solicitation.enterprise.deposit_balance or 0)
    elif not is_enterprise:
        profile = getattr(request.user, 'provider_profile', None)
        if profile:
            deposit_balance = float(profile.deposit_balance or 0)

    can_start = (
        mission.status == Mission.Status.ACCEPTED
        and mission.deposit_paid
        and _mission_start_allowed(request.user, mission)
    )

    return {
        'current_step': current_step,
        'solicitation_accepted': sol_done,
        'deposit_required': mission.status == Mission.Status.ACCEPTED and not mission.deposit_paid,
        'deposit_paid': mission.deposit_paid,
        'required_deposit': float(mission.required_deposit or 0),
        'deposit_deadline': mission.deposit_deadline.isoformat() if mission.deposit_deadline else None,
        'employee_assigned': bool(mission.executing_employee_id),
        'can_start': can_start,
        'deposit_balance': deposit_balance,
        'is_enterprise': is_enterprise,
    }


def _truthy(value) -> bool:
    return value in (True, 'true', 'True', '1', 1)


def _start_mission_record(mission, user, reason='Mission démarrée'):
    if mission.status != Mission.Status.ACCEPTED:
        return False
    old_status = mission.status
    mission.status = Mission.Status.IN_PROGRESS
    mission.started_at = timezone.now()
    mission.save(update_fields=['status', 'started_at', 'updated_at'])
    MissionStatusHistory.objects.create(
        mission=mission,
        old_status=old_status,
        new_status=Mission.Status.IN_PROGRESS,
        changed_by=user,
        reason=reason,
    )
    return True


def _apply_gps_consent(mission, user):
    mission.provider_gps_consent_at = timezone.now()
    mission.save(update_fields=['provider_gps_consent_at', 'updated_at'])
    user.gps_tracking_enabled = True
    user.save(update_fields=['gps_tracking_enabled'])


def get_start_suggestions(mission, user):
    """Retourne des suggestions utiles pour l'utilisateur qui ne peut pas démarrer la mission."""
    suggestions = []
    
    # Vérifier si l'utilisateur est un employé
    employee = primary_employee(user)
    if employee and employee == mission.executing_employee:
        suggestions.append({
            'action': 'use_employee_view',
            'label': 'Voir les détails employé',
            'url': f'/api/missions/{mission.id}/employee-view/',
            'description': 'Utilisez la vue employé pour voir l\'état réel et les actions disponibles'
        })

        # Si échéance dépassée
        from django.utils import timezone
        if mission.deposit_deadline and mission.deposit_deadline < timezone.now() and not mission.deposit_paid:
            suggestions.append({
                'action': 'claim_timeout',
                'label': 'Signaler l\'échéance',
                'url': f'/api/missions/{mission.id}/claim-timeout/',
                'description': 'Le délai est dépassé, signalez-le pour faire avancer la mission'
            })
    
    # Si le dépôt n'est pas payé et l'utilisateur est de l'entreprise
    if not mission.deposit_paid and mission.assigned_enterprise:
        if user == mission.assigned_enterprise.user:
            suggestions.append({
                'action': 'pay_deposit',
                'label': 'Payer la caution',
                'url': f'/api/missions/{mission.id}/pay-deposit/',
                'description': f'Payez la caution de {mission.required_deposit} {mission.currency} pour permettre le démarrage'
            })
    
    # Si l'utilisateur est le client et la mission est expirée
    if mission.client == user:
        from django.utils import timezone
        if mission.deposit_deadline and mission.deposit_deadline < timezone.now():
            suggestions.append({
                'action': 'cancel_and_refund',
                'label': 'Annuler et rembourser',
                'url': f'/api/missions/{mission.id}/cancel-expired/',
                'description': 'Annulez la mission et obtenez un remboursement complet'
            })
            suggestions.append({
                'action': 'renegotiate',
                'label': 'Renégocier',
                'url': f'/api/missions/{mission.id}/renegotiate/',
                'description': 'Proposez une nouvelle échéance à l\'entreprise'
            })
    
    # Suggestion de contact
    if not suggestions:
        suggestions.append({
            'action': 'contact_support',
            'label': 'Contacter le support',
            'url': '/support/',
            'description': 'Contactez le support technique pour obtenir de l\'aide'
        })
    
    return suggestions


def _mission_start_allowed(user, mission) -> bool:
    # Le prestataire directement assigné
    if mission.provider_id == user.id:
        return True
    
    # L'entreprise assignée peut démarrer si le dépôt est payé
    ent = mission.assigned_enterprise
    if ent and ent.user_id == user.id and mission.executing_employee_id and mission.deposit_paid:
        return True
    
    # L'employé assigné peut démarrer la mission
    if mission.executing_employee_id and mission.executing_employee.user_id == user.id and mission.deposit_paid:
        return True
    
    return False


def _user_can_preview_solicitation(user, solicitation):
    if solicitation.client_id == user.id:
        return True
    if (
        solicitation.target_type == MissionSolicitation.TargetType.PROVIDER
        and solicitation.provider_id == user.id
    ):
        return True
    if solicitation.target_type == MissionSolicitation.TargetType.ENTERPRISE:
        from apps.users.models import EnterpriseProfile
        try:
            profile = EnterpriseProfile.objects.get(user=user)
        except EnterpriseProfile.DoesNotExist:
            return False
        return solicitation.enterprise_id == profile.id
    return False


class MissionSolicitationViewSet(viewsets.ReadOnlyModelViewSet):
    """Sollicitations directes client → prestataire."""
    serializer_class = MissionSolicitationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = MissionSolicitation.objects.select_related(
            'mission', 'provider', 'provider__provider_profile', 'client',
            'enterprise', 'enterprise__user',
        )
        scope = self.request.query_params.get('scope')
        if scope == 'provider':
            return qs.filter(
                target_type=MissionSolicitation.TargetType.PROVIDER,
                provider=user,
            )
        if scope == 'enterprise':
            from apps.users.models import EnterpriseProfile
            try:
                profile = EnterpriseProfile.objects.get(user=user)
            except EnterpriseProfile.DoesNotExist:
                return qs.none()
            return qs.filter(
                target_type=MissionSolicitation.TargetType.ENTERPRISE,
                enterprise=profile,
            )
        if scope == 'client':
            return qs.filter(client=user)
        return qs.filter(
            Q(provider=user) | Q(client=user) | Q(enterprise__user=user)
        )

    @action(detail=False, methods=['get'])
    def my_solicitations(self, request):
        """Sollicitations reçues (prestataire ou entreprise)."""
        scope = request.query_params.get('scope', 'provider')
        status_filter = request.query_params.get('status')

        if scope == 'enterprise':
            from apps.users.models import EnterpriseProfile
            try:
                profile = EnterpriseProfile.objects.get(user=request.user)
            except EnterpriseProfile.DoesNotExist:
                return Response([])
            queryset = MissionSolicitation.objects.filter(
                target_type=MissionSolicitation.TargetType.ENTERPRISE,
                enterprise=profile,
            ).select_related(
                'mission', 'client', 'enterprise', 'enterprise__user',
            )
        else:
            queryset = MissionSolicitation.objects.filter(
                target_type=MissionSolicitation.TargetType.PROVIDER,
                provider=request.user,
            ).select_related(
                'mission', 'client', 'provider', 'provider__provider_profile',
            )

        if status_filter:
            queryset = queryset.filter(status=status_filter)

        serializer = self.get_serializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def sent(self, request):
        """Sollicitations envoyées par le client connecté."""
        queryset = self.get_queryset().filter(client=request.user)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='preview')
    def preview(self, request, pk=None):
        """Détail mission + client + candidatures avant acceptation/refus."""
        solicitation = self.get_object()
        if not _user_can_preview_solicitation(request.user, solicitation):
            return Response({'error': 'Accès non autorisé'}, status=status.HTTP_403_FORBIDDEN)

        mission = Mission.objects.select_related(
            'client', 'provider', 'category', 'assigned_enterprise', 'executing_employee',
        ).prefetch_related(
            'status_history',
            'applications__provider__provider_profile',
        ).get(pk=solicitation.mission_id)

        applications = mission.applications.filter(
            status=MissionApplication.Status.PENDING,
        ).select_related('provider', 'provider__provider_profile').order_by('-created_at')

        other_solicitations = MissionSolicitation.objects.filter(
            mission=mission,
        ).exclude(pk=solicitation.pk).select_related(
            'provider', 'enterprise',
        ).order_by('-created_at')

        payload = {
            'solicitation': MissionSolicitationSerializer(
                solicitation, context={'request': request},
            ).data,
            'mission': MissionDetailSerializer(mission, context={'request': request}).data,
            'client': ClientPreviewSerializer(mission.client, context={'request': request}).data,
            'applications': MissionApplicationSerializer(
                applications, many=True, context={'request': request},
            ).data,
            'other_solicitations': OtherSolicitationSerializer(
                other_solicitations, many=True, context={'request': request},
            ).data,
            'workflow': _solicitation_workflow_state(request, solicitation, mission),
        }
        if solicitation.target_type == MissionSolicitation.TargetType.ENTERPRISE and solicitation.enterprise_id:
            from apps.users.models import Employee
            payload['enterprise_employees'] = [
                {
                    'id': str(e.id),
                    'first_name': e.first_name,
                    'last_name': e.last_name,
                    'position': e.position or '',
                }
                for e in Employee.objects.filter(
                    enterprise=solicitation.enterprise, is_active=True,
                ).order_by('first_name')
            ]
        else:
            payload['enterprise_employees'] = []
        return Response(payload)

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """Accepter une sollicitation (prestataire ou entreprise)."""
        from apps.payments.models import UserPaymentMethod
        from apps.users.kyc_access import can_access_platform, get_kyc_block_message
        from apps.users.models import User, EnterpriseProfile
        from .requirements import mission_requires_id_verification

        solicitation = self.get_object()
        mission = solicitation.mission

        if solicitation.status != MissionSolicitation.Status.PENDING:
            return Response({'error': 'Sollicitation déjà traitée'}, status=status.HTTP_400_BAD_REQUEST)
        if mission.status != Mission.Status.FUNDED or mission.provider_id:
            solicitation.status = MissionSolicitation.Status.EXPIRED
            solicitation.responded_at = timezone.now()
            solicitation.save(update_fields=['status', 'responded_at', 'updated_at'])
            return Response(
                {'error': 'Cette mission n\'est plus disponible'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if solicitation.target_type == MissionSolicitation.TargetType.ENTERPRISE:
            try:
                profile = EnterpriseProfile.objects.get(user=request.user)
            except EnterpriseProfile.DoesNotExist:
                return Response({'error': 'Non autorisé'}, status=status.HTTP_403_FORBIDDEN)
            if solicitation.enterprise_id != profile.id:
                return Response({'error': 'Non autorisé'}, status=status.HTTP_403_FORBIDDEN)

            _accept_enterprise_solicitation(solicitation)

            from apps.notifications.services import create_notification
            create_notification(
                mission.client,
                'mission_accepted',
                'Entreprise intéressée',
                f'{profile.company_name} a accepté votre mission « {mission.title} ». Un employé sera assigné prochainement.',
                mission=mission,
                action_url=f'/client/missions/{mission.id}',
            )

            mission.refresh_from_db()
            return Response({
                'status': 'Sollicitation acceptée',
                'mission_id': str(mission.id),
                'next_step': 'pay_deposit',
                'deposit_required': True,
                'required_deposit': float(mission.required_deposit or 0),
                'deposit_deadline': mission.deposit_deadline.isoformat() if mission.deposit_deadline else None,
            })

        if solicitation.provider != request.user:
            return Response({'error': 'Non autorisé'}, status=status.HTTP_403_FORBIDDEN)

        if not can_access_platform(request.user):
            return Response(
                {'error': get_kyc_block_message(request.user), 'kyc_required': True},
                status=status.HTTP_403_FORBIDDEN,
            )
        if mission.requires_verified_provider and request.user.kyc_status != User.KYCStatus.VERIFIED:
            return Response(
                {'error': 'Cette mission exige un prestataire vérifié KYC.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        if mission_requires_id_verification(mission) and request.user.kyc_status != User.KYCStatus.VERIFIED:
            return Response(
                {'error': 'Vérification d\'identité requise pour cette mission.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not UserPaymentMethod.objects.filter(user=request.user, is_active=True).exists():
            return Response(
                {
                    'error': 'Enregistrez une méthode Mobile Money avant d\'accepter.',
                    'payment_method_required': True,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            _accept_solicitation(solicitation, request.user)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        mission.refresh_from_db()
        from apps.notifications.services import create_notification
        create_notification(
            mission.client,
            'mission_accepted',
            'Sollicitation acceptée',
            f'{request.user.get_full_name()} a accepté votre mission « {mission.title} ».',
            mission=mission,
            action_url=f'/client/missions/{mission.id}',
        )

        return Response({
            'status': 'Sollicitation acceptée',
            'mission_id': str(mission.id),
            'next_step': 'pay_deposit',
            'deposit_required': True,
            'required_deposit': float(mission.required_deposit or 0),
            'deposit_deadline': mission.deposit_deadline.isoformat() if mission.deposit_deadline else None,
        })

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Refuser une sollicitation (prestataire ou entreprise)."""
        solicitation = self.get_object()
        mission = solicitation.mission

        if solicitation.target_type == MissionSolicitation.TargetType.ENTERPRISE:
            from apps.users.models import EnterpriseProfile
            try:
                profile = EnterpriseProfile.objects.get(user=request.user)
            except EnterpriseProfile.DoesNotExist:
                return Response({'error': 'Non autorisé'}, status=status.HTTP_403_FORBIDDEN)
            if solicitation.enterprise_id != profile.id:
                return Response({'error': 'Non autorisé'}, status=status.HTTP_403_FORBIDDEN)
            rejecter_name = profile.company_name
        else:
            if solicitation.provider != request.user:
                return Response({'error': 'Non autorisé'}, status=status.HTTP_403_FORBIDDEN)
            rejecter_name = request.user.get_full_name()

        if solicitation.status != MissionSolicitation.Status.PENDING:
            return Response({'error': 'Sollicitation déjà traitée'}, status=status.HTTP_400_BAD_REQUEST)

        solicitation.status = MissionSolicitation.Status.REJECTED
        solicitation.responded_at = timezone.now()
        solicitation.save(update_fields=['status', 'responded_at', 'updated_at'])

        from apps.notifications.services import create_notification
        create_notification(
            mission.client,
            'mission_cancelled',
            'Sollicitation refusée',
            f'{rejecter_name} a décliné la mission « {mission.title} ».',
            mission=mission,
            action_url=f'/client/missions/{mission.id}',
        )

        return Response({'status': 'Sollicitation refusée'})

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Annuler une sollicitation en attente (client)."""
        solicitation = self.get_object()

        if solicitation.client != request.user:
            return Response({'error': 'Non autorisé'}, status=status.HTTP_403_FORBIDDEN)
        if solicitation.status != MissionSolicitation.Status.PENDING:
            return Response({'error': 'Impossible d\'annuler cette sollicitation'}, status=status.HTTP_400_BAD_REQUEST)

        solicitation.status = MissionSolicitation.Status.CANCELLED
        solicitation.responded_at = timezone.now()
        solicitation.save(update_fields=['status', 'responded_at', 'updated_at'])

        return Response({'status': 'Sollicitation annulée'})


class MissionBookmarkViewSet(viewsets.ModelViewSet):
    """ViewSet pour les favoris"""
    serializer_class = MissionBookmarkSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return MissionBookmark.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['post'])
    def toggle(self, request):
        """Ajouter/retirer des favoris"""
        mission_id = request.data.get('mission_id')
        
        try:
            mission = Mission.objects.get(id=mission_id)
        except Mission.DoesNotExist:
            return Response(
                {'error': 'Mission non trouvée'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        bookmark, created = MissionBookmark.objects.get_or_create(
            user=request.user,
            mission=mission
        )
        
        if not created:
            bookmark.delete()
            return Response({'status': 'Retiré des favoris', 'bookmarked': False})
        
        return Response({
            'status': 'Ajouté aux favoris',
            'bookmarked': True,
            'bookmark': MissionBookmarkSerializer(bookmark).data
        })
