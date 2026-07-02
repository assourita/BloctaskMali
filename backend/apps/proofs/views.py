from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone

from apps.missions.models import Mission
from .models import MissionProof, ProofChecklist, SignatureRecord, QRValidation
from .serializers import (
    MissionProofSerializer, MissionProofCreateSerializer,
    ProofChecklistSerializer, SignatureRecordSerializer
)
from .qr_service import generate_qr_for_mission, scan_qr_code

VIDEO_MIME_TYPES = {'video/mp4', 'video/webm', 'video/quicktime'}
MAX_VIDEO_SIZE = 50 * 1024 * 1024  # 50 Mo


def _user_can_access_mission(user, mission):
    if user.is_staff or getattr(user, 'user_type', '') == 'admin':
        return True
    if mission.client_id == user.id:
        return True
    if mission.provider_id == user.id:
        return True
    return False


class MissionProofViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']

    def get_serializer_class(self):
        if self.action == 'create':
            return MissionProofCreateSerializer
        return MissionProofSerializer

    def get_queryset(self):
        qs = MissionProof.objects.select_related('submitted_by', 'mission')
        mission_id = self.request.query_params.get('mission')
        if mission_id:
            qs = qs.filter(mission_id=mission_id)
        if not (self.request.user.is_staff or getattr(self.request.user, 'user_type', '') == 'admin'):
            user = self.request.user
            qs = qs.filter(
                Q(mission__client=user) | Q(mission__provider=user) | Q(submitted_by=user)
            )
        return qs.distinct()

    def create(self, request, *args, **kwargs):
        mission_id = request.data.get('mission') or request.query_params.get('mission')
        if not mission_id:
            return Response({'error': 'mission requis'}, status=status.HTTP_400_BAD_REQUEST)

        mission = get_object_or_404(Mission, id=mission_id)
        if mission.provider != request.user and not request.user.is_staff:
            return Response({'error': 'Seul le prestataire peut soumettre des preuves'}, status=403)
        if mission.status not in ['in_progress', 'provider_done', 'submitted']:
            return Response({'error': 'Mission non éligible pour les preuves'}, status=400)

        serializer = self.get_serializer(
            data=request.data,
            context={'request': request, 'mission_id': mission_id}
        )
        serializer.is_valid(raise_exception=True)

        proof_type = serializer.validated_data.get('proof_type', '')
        file = serializer.validated_data.get('file')
        if proof_type == 'video' and file:
            mime = getattr(file, 'content_type', '')
            if mime and mime not in VIDEO_MIME_TYPES:
                return Response(
                    {'error': f'Type vidéo non supporté: {mime}'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if file.size > MAX_VIDEO_SIZE:
                return Response(
                    {'error': 'Vidéo trop volumineuse (max 50 Mo)'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        proof = serializer.save()

        from .analysis_service import run_photo_analysis
        run_photo_analysis(proof)

        checklist, _ = ProofChecklist.objects.get_or_create(mission=mission)
        if proof.proof_type in ('photo_before', 'photo_during'):
            checklist.pickup_photo_done = True
        elif proof.proof_type == 'photo_after':
            checklist.delivery_photo_done = True
        elif proof.proof_type == 'signature_client':
            checklist.signature_done = True
        elif proof.proof_type == 'receipt':
            checklist.receipt_done = True
        elif proof.proof_type == 'video':
            checklist.delivery_photo_done = True
        elif proof.proof_type == 'qr_code':
            checklist.qr_code_done = True
        checklist.save()

        return Response(MissionProofSerializer(proof).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        proof = self.get_object()
        if not (request.user.is_staff or proof.mission.client == request.user):
            return Response({'error': 'Non autorisé'}, status=403)
        proof.verification_status = request.data.get('status', 'verified')
        proof.verified_by = request.user
        proof.verification_notes = request.data.get('notes', '')
        proof.save()
        return Response(MissionProofSerializer(proof).data)


class ProofChecklistViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ProofChecklistSerializer

    def get_queryset(self):
        qs = ProofChecklist.objects.select_related('mission')
        mission_id = self.request.query_params.get('mission')
        if mission_id:
            qs = qs.filter(mission_id=mission_id)
        if not (self.request.user.is_staff or getattr(self.request.user, 'user_type', '') == 'admin'):
            qs = qs.filter(
                mission__client=self.request.user
            ) | qs.filter(
                mission__provider=self.request.user
            )
        return qs.distinct()


class QRValidationViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'], url_path='generate')
    def generate(self, request):
        mission_id = request.data.get('mission')
        if not mission_id:
            return Response({'error': 'mission requis'}, status=400)
        mission = get_object_or_404(Mission, id=mission_id)
        if request.user != mission.client and not request.user.is_staff:
            return Response({'error': 'Seul le client peut générer le QR'}, status=403)

        qr = generate_qr_for_mission(mission)
        image_url = None
        if qr.qr_code_image:
            image_url = request.build_absolute_uri(qr.qr_code_image.url)
        return Response({
            'id': str(qr.id),
            'mission': str(mission.id),
            'qr_code_data': qr.qr_code_data,
            'qr_code_image': image_url,
            'expires_at': qr.expires_at.isoformat(),
            'status': qr.status,
        })

    @action(detail=False, methods=['post'], url_path='scan')
    def scan(self, request):
        qr_data = request.data.get('qr_code_data') or request.data.get('data')
        if not qr_data:
            return Response({'error': 'qr_code_data requis'}, status=400)
        try:
            qr = scan_qr_code(
                qr_data,
                request.user,
                latitude=request.data.get('latitude'),
                longitude=request.data.get('longitude'),
            )
        except ValueError as exc:
            return Response({'error': str(exc)}, status=400)

        return Response({
            'status': 'validated',
            'mission_id': str(qr.mission_id),
            'scanned_at': qr.scanned_at.isoformat() if qr.scanned_at else None,
        })
