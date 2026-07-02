"""Analyse automatique des photos de preuve (qualité, fraude légère)."""
from __future__ import annotations

import logging
from datetime import datetime

from django.utils import timezone

logger = logging.getLogger(__name__)


def _laplacian_variance(gray) -> float:
    import numpy as np
    arr = np.asarray(gray, dtype=np.float64)
    if arr.size < 9:
        return 0.0
    return float(
        arr[1:-1, 1:-1] * 4
        - arr[:-2, 1:-1]
        - arr[2:, 1:-1]
        - arr[1:-1, :-2]
        - arr[1:-1, 2:]
    ).var()


def analyze_proof_photo(proof, mission) -> dict:
    """Retourne les champs pour PhotoAnalysis."""
    from .models import PhotoAnalysis

    flags: list[str] = []
    fraud_score = 0.0
    is_blurry = False
    blur_score = None
    is_dark = False
    brightness_score = None
    text_detected = ''
    exif_timestamp = None
    matches_location = False
    distance_m = None

    file_field = getattr(proof, 'file', None)
    if not file_field:
        return {}

    try:
        from PIL import Image, ImageStat, ExifTags

        file_field.open('rb')
        img = Image.open(file_field)
        img.load()
        gray = img.convert('L')
        stat = ImageStat.Stat(gray)
        brightness_score = float(stat.mean[0])
        is_dark = brightness_score < 45
        if is_dark:
            flags.append('image_too_dark')
            fraud_score += 15

        blur_score = _laplacian_variance(gray)
        is_blurry = blur_score < 80
        if is_blurry:
            flags.append('image_blurry')
            fraud_score += 20

        exif = img.getexif() if hasattr(img, 'getexif') else None
        if exif:
            for tag_id, value in exif.items():
                tag = ExifTags.TAGS.get(tag_id, tag_id)
                if tag == 'DateTimeOriginal' and value:
                    try:
                        exif_timestamp = datetime.strptime(str(value), '%Y:%m:%d %H:%M:%S')
                        exif_timestamp = timezone.make_aware(exif_timestamp) if timezone.is_naive(exif_timestamp) else exif_timestamp
                    except (ValueError, TypeError):
                        pass

        lat = getattr(mission, 'pickup_latitude', None) or getattr(mission, 'delivery_latitude', None)
        lng = getattr(mission, 'pickup_longitude', None) or getattr(mission, 'delivery_longitude', None)
        proof_lat = getattr(proof, 'latitude', None)
        proof_lng = getattr(proof, 'longitude', None)
        if lat is not None and lng is not None and proof_lat is not None and proof_lng is not None:
            import math
            r = 6371000
            p = math.pi / 180
            a = (
                0.5 - math.cos((float(proof_lat) - float(lat)) * p) / 2
                + math.cos(float(lat) * p) * math.cos(float(proof_lat) * p)
                * (1 - math.cos((float(proof_lng) - float(lng)) * p)) / 2
            )
            distance_m = 2 * r * math.asin(math.sqrt(a))
            matches_location = distance_m <= 500
            if distance_m > 2000:
                flags.append('far_from_mission')
                fraud_score += 25

        if exif_timestamp and mission.started_at:
            delta = abs((exif_timestamp - mission.started_at).total_seconds())
            if delta > 86400 * 7:
                flags.append('exif_timestamp_suspicious')
                fraud_score += 10

        fraud_score = min(100.0, fraud_score)
        file_field.close()
    except Exception as exc:
        logger.warning('Photo analysis failed for proof %s: %s', proof.id, exc)
        flags.append('analysis_error')

    return {
        'objects_detected': [],
        'text_detected': text_detected,
        'faces_count': 0,
        'is_blurry': is_blurry,
        'blur_score': blur_score,
        'is_dark': is_dark,
        'brightness_score': brightness_score,
        'exif_timestamp': exif_timestamp,
        'matches_mission_location': matches_location,
        'distance_from_mission': distance_m,
        'fraud_score': fraud_score,
        'fraud_flags': flags,
    }


def run_photo_analysis(proof) -> None:
    from .models import PhotoAnalysis

    if proof.proof_type not in ('photo_before', 'photo_during', 'photo_after', 'video'):
        return
    if not proof.file:
        return

    data = analyze_proof_photo(proof, proof.mission)
    if not data:
        return

    PhotoAnalysis.objects.update_or_create(proof=proof, defaults=data)
