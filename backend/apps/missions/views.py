from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Avg, Sum
from django.utils import timezone
from django.shortcuts import get_object_or_404

from .models import (
    Category, Mission, MissionApplication,
    MissionStatusHistory, MissionBookmark, MissionReview
)
from .serializers import (
    CategorySerializer, MissionListSerializer, MissionDetailSerializer,
    MissionCreateSerializer, MissionApplicationSerializer,
    MissionStatusHistorySerializer, MissionBookmarkSerializer,
    MissionReviewSerializer, MissionStatsSerializer
)
from .permissions import IsMissionOwner, IsMissionProvider, CanApplyToMission


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet pour les catégories de missions"""
    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer
    lookup_field = 'slug'
    
    @action(detail=True, methods=['get'])
    def missions(self, request, slug=None):
        """Récupérer les missions d'une catégorie"""
        category = self.get_object()
        missions = Mission.objects.filter(
            category=category,
            status='open'
        ).order_by('-created_at')
        
        serializer = MissionListSerializer(missions, many=True)
        return Response(serializer.data)


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
            permission_classes = [IsAuthenticated]
        elif self.action in ['update', 'partial_update', 'destroy', 'cancel']:
            permission_classes = [IsAuthenticated, IsMissionOwner]
        elif self.action in ['accept_application', 'validate', 'start']:
            permission_classes = [IsAuthenticated, IsMissionOwner]
        elif self.action in ['apply', 'submit_proof', 'complete']:
            permission_classes = [IsAuthenticated, CanApplyToMission]
        elif self.action in ['my_missions', 'my_applications']:
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """Filtre les missions selon l'utilisateur"""
        queryset = Mission.objects.all()
        user = self.request.user
        
        # Filtrer par rôle pour certaines actions
        if self.action == 'my_missions':
            if user.user_type == 'client':
                queryset = queryset.filter(client=user)
            elif user.user_type == 'provider':
                queryset = queryset.filter(provider=user)
            elif user.user_type == 'enterprise':
                queryset = queryset.filter(client=user)
        
        # Exclure les missions annulées pour la liste publique
        if self.action == 'list':
            queryset = queryset.exclude(status__in=['cancelled', 'failed'])
        
        # Optimiser les requêtes
        queryset = queryset.select_related('client', 'provider', 'category')
        queryset = queryset.prefetch_related('applications', 'status_history')
        
        return queryset
    
    def get_serializer_context(self):
        """Ajoute le request au contexte du serializer"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    @action(detail=False, methods=['get'])
    def available(self, request):
        """Récupérer les missions disponibles pour les prestataires"""
        # Filtrer les missions ouvertes
        queryset = self.get_queryset().filter(status='open', provider__isnull=True)
        
        # Filtres géographiques (si latitude/longitude fournies)
        lat = request.query_params.get('lat')
        lng = request.query_params.get('lng')
        radius = request.query_params.get('radius', 10)  # km par défaut
        
        if lat and lng:
            # Filtrage par proximité (simplifié - en production utiliser PostGIS)
            from django.db.models import F, FloatField
            from django.db.models.functions import Cast
            # TODO: Implémenter le filtrage géospatial
            pass
        
        # Pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = MissionListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = MissionListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_missions(self, request):
        """Récupérer les missions de l'utilisateur courant"""
        queryset = self.get_queryset()
        
        # Filtrer selon le type d'utilisateur
        if request.user.user_type == 'client':
            queryset = queryset.filter(client=request.user)
        elif request.user.user_type == 'provider':
            queryset = queryset.filter(provider=request.user)
        
        serializer = MissionListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def apply(self, request, pk=None):
        """Postuler à une mission (prestataire)"""
        mission = self.get_object()
        
        # Vérifier que la mission est ouverte
        if mission.status != 'open':
            return Response(
                {'error': 'Cette mission n\'est plus ouverte aux candidatures'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Créer la candidature
        serializer = MissionApplicationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(
                mission=mission,
                provider=request.user,
                status='pending'
            )
            
            # Créer une notification pour le client
            # TODO: Envoyer notification
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
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
        application.status = 'accepted'
        application.accepted_at = timezone.now()
        application.save()
        
        # Mettre à jour la mission
        mission.provider = application.provider
        mission.status = 'assigned'
        mission.provider_accepted_price = application.proposed_price
        mission.save()
        
        # Créer l'historique
        MissionStatusHistory.objects.create(
            mission=mission,
            old_status='open',
            new_status='assigned',
            changed_by=request.user,
            reason=f'Candidature acceptée: {application.provider.get_full_name()}'
        )
        
        # Refuser les autres candidatures
        mission.applications.filter(status='pending').update(
            status='rejected',
            rejected_at=timezone.now()
        )
        
        return Response({'status': 'Candidature acceptée'})
    
    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """Démarrer une mission (prestataire)"""
        mission = self.get_object()
        
        if mission.status != 'assigned':
            return Response(
                {'error': 'La mission doit être assignée pour être démarrée'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        mission.status = 'in_progress'
        mission.actual_start_time = timezone.now()
        mission.save()
        
        MissionStatusHistory.objects.create(
            mission=mission,
            old_status='assigned',
            new_status='in_progress',
            changed_by=request.user,
            reason='Mission démarrée par le prestataire'
        )
        
        return Response({'status': 'Mission démarrée'})
    
    @action(detail=True, methods=['post'])
    def submit_proof(self, request, pk=None):
        """Soumettre une preuve d'exécution"""
        mission = self.get_object()
        
        if mission.status not in ['in_progress', 'provider_done']:
            return Response(
                {'error': 'Impossible de soumettre des preuves pour cette mission'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # TODO: Créer les objets Proof
        # from apps.proofs.models import MissionProof
        
        mission.status = 'provider_done'
        mission.save()
        
        MissionStatusHistory.objects.create(
            mission=mission,
            old_status='in_progress',
            new_status='provider_done',
            changed_by=request.user,
            reason='Preuves soumises par le prestataire'
        )
        
        return Response({'status': 'Preuves soumises'})
    
    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        """Valider la mission (client)"""
        mission = self.get_object()
        
        if mission.status != 'provider_done':
            return Response(
                {'error': 'La mission doit avoir des preuves soumises pour être validée'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        mission.status = 'validated'
        mission.actual_end_time = timezone.now()
        mission.save()
        
        MissionStatusHistory.objects.create(
            mission=mission,
            old_status='provider_done',
            new_status='validated',
            changed_by=request.user,
            reason='Mission validée par le client'
        )
        
        # TODO: Déclencher le paiement sur la blockchain
        # TODO: Mettre à jour la réputation
        
        return Response({'status': 'Mission validée'})
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Marquer la mission comme complétée (après validation et paiement)"""
        mission = self.get_object()
        
        if mission.status != 'validated':
            return Response(
                {'error': 'La mission doit être validée avant d\'être complétée'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        mission.status = 'completed'
        mission.save()
        
        MissionStatusHistory.objects.create(
            mission=mission,
            old_status='validated',
            new_status='completed',
            changed_by=request.user,
            reason='Mission complétée - paiement effectué'
        )
        
        return Response({'status': 'Mission complétée'})
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Annuler une mission"""
        mission = self.get_object()
        
        # Vérifier les conditions d'annulation
        if mission.status in ['completed', 'cancelled', 'failed']:
            return Response(
                {'error': 'Cette mission ne peut plus être annulée'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        old_status = mission.status
        mission.status = 'cancelled'
        mission.save()
        
        MissionStatusHistory.objects.create(
            mission=mission,
            old_status=old_status,
            new_status='cancelled',
            changed_by=request.user,
            reason=request.data.get('reason', 'Mission annulée')
        )
        
        return Response({'status': 'Mission annulée'})
    
    @action(detail=True, methods=['post'])
    def dispute(self, request, pk=None):
        """Ouvrir un litige sur une mission"""
        mission = self.get_object()
        
        if mission.status not in ['in_progress', 'provider_done', 'validated']:
            return Response(
                {'error': 'Impossible d\'ouvrir un litige sur cette mission'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        old_status = mission.status
        mission.status = 'disputed'
        mission.save()
        
        MissionStatusHistory.objects.create(
            mission=mission,
            old_status=old_status,
            new_status='disputed',
            changed_by=request.user,
            reason='Litige ouvert'
        )
        
        # TODO: Créer l'objet Dispute
        
        return Response({'status': 'Litige ouvert', 'dispute_id': None})
    
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
        
        applications = mission.applications.all().order_by('-created_at')
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

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Statistiques des missions pour l'utilisateur"""
        user = request.user
        
        if user.user_type == 'client':
            stats = Mission.objects.filter(client=user).aggregate(
                total_missions=Count('id'),
                open_missions=Count('id', filter=Q(status='open')),
                in_progress_missions=Count('id', filter=Q(status='in_progress')),
                completed_missions=Count('id', filter=Q(status='completed')),
                total_spent=Sum('budget', filter=Q(status='completed')),
                average_mission_value=Avg('budget')
            )
        elif user.user_type == 'provider':
            stats = Mission.objects.filter(provider=user).aggregate(
                total_missions=Count('id'),
                in_progress_missions=Count('id', filter=Q(status='in_progress')),
                completed_missions=Count('id', filter=Q(status='completed')),
                total_earned=Sum('provider_accepted_price', filter=Q(status='completed')),
                average_mission_value=Avg('provider_accepted_price')
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
        
        if user.user_type == 'provider':
            return MissionApplication.objects.filter(provider=user)
        elif user.user_type == 'client':
            return MissionApplication.objects.filter(mission__client=user)
        return MissionApplication.objects.none()
    
    @action(detail=False, methods=['get'])
    def my_applications(self, request):
        """Candidatures de l'utilisateur"""
        queryset = self.get_queryset()
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
