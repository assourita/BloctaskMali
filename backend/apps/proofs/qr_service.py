"""Génération et validation des QR codes de mission."""
import hashlib
import io
import json
import uuid
from datetime import timedelta

from django.core.files.base import ContentFile
from django.utils import timezone

from apps.proofs.models import QRValidation


def generate_qr_for_mission(mission):
    """Crée ou régénère un QR code de validation pour une mission."""
    token = uuid.uuid4().hex
    payload = {
        'mission_id': str(mission.id),
        'token': token,
        'type': 'blocktask_delivery',
    }
    qr_data = json.dumps(payload)
    qr_hash = hashlib.sha256(qr_data.encode()).hexdigest()

    expires_at = timezone.now() + timedelta(hours=24)
    qr_validation, _ = QRValidation.objects.update_or_create(
        mission=mission,
        defaults={
            'qr_code_data': qr_data,
            'status': QRValidation.Status.PENDING,
            'expires_at': expires_at,
        },
    )

    try:
        import qrcode
        img = qrcode.make(qr_data)
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        filename = f'qr_{str(mission.id)[:8]}.png'
        qr_validation.qr_code_image.save(filename, ContentFile(buffer.getvalue()), save=True)
    except ImportError:
        qr_validation.save()

    return qr_validation


def scan_qr_code(qr_data: str, user, *, latitude=None, longitude=None):
    """Valide un scan QR et marque la mission comme livrée côté preuve."""
    try:
        payload = json.loads(qr_data)
    except json.JSONDecodeError:
        raise ValueError('QR code invalide')

    mission_id = payload.get('mission_id')
    if not mission_id:
        raise ValueError('QR code invalide')

    from apps.missions.models import Mission
    mission = Mission.objects.get(id=mission_id)

    try:
        qr_validation = QRValidation.objects.get(mission=mission)
    except QRValidation.DoesNotExist:
        raise ValueError('Aucun QR généré pour cette mission')

    if qr_validation.status == QRValidation.Status.VALIDATED:
        raise ValueError('QR déjà validé')
    if qr_validation.expires_at < timezone.now():
        qr_validation.status = QRValidation.Status.EXPIRED
        qr_validation.save(update_fields=['status'])
        raise ValueError('QR expiré')
    if qr_validation.qr_code_data != qr_data:
        raise ValueError('QR code non reconnu')

    qr_validation.status = QRValidation.Status.VALIDATED
    qr_validation.scanned_by = user
    qr_validation.scanned_at = timezone.now()
    qr_validation.save()

    from apps.proofs.models import ProofChecklist, MissionProof
    checklist, _ = ProofChecklist.objects.get_or_create(mission=mission)
    checklist.qr_code_done = True
    checklist.save(update_fields=['qr_code_done'])

    MissionProof.objects.get_or_create(
        mission=mission,
        proof_type='qr_code',
        submitted_by=user,
        defaults={
            'title': 'Validation QR',
            'description': 'Scan QR de livraison validé',
            'metadata': {'latitude': latitude, 'longitude': longitude},
        },
    )

    return qr_validation
