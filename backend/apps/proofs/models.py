"""
BlockTask Proof Models
Preuves d'exécution des missions
"""

from django.db import models
import uuid


class MissionProof(models.Model):
    """Preuve soumise pour une mission"""
    
    class ProofType(models.TextChoices):
        PHOTO_BEFORE = 'photo_before', 'Photo - Avant'
        PHOTO_DURING = 'photo_during', 'Photo - Pendant'
        PHOTO_AFTER = 'photo_after', 'Photo - Après'
        VIDEO = 'video', 'Vidéo'
        SIGNATURE_CLIENT = 'signature_client', 'Signature Client'
        SIGNATURE_PROVIDER = 'signature_provider', 'Signature Prestataire'
        GPS_LOCATION = 'gps_location', 'Localisation GPS'
        QR_CODE = 'qr_code', 'QR Code'
        RECEIPT = 'receipt', 'Reçu'
        DOCUMENT = 'document', 'Document'
        BARCODE = 'barcode', 'Code-barres'
        TIMESTAMP = 'timestamp', 'Horodatage'
        CHECKLIST = 'checklist', 'Checklist'
    
    class VerificationStatus(models.TextChoices):
        PENDING = 'pending', 'En attente'
        VERIFIED = 'verified', 'Vérifié'
        REJECTED = 'rejected', 'Rejeté'
        FLAGGED = 'flagged', 'Signalé'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    mission = models.ForeignKey(
        'missions.Mission',
        on_delete=models.CASCADE,
        related_name='proofs'
    )
    submitted_by = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='submitted_proofs'
    )
    
    proof_type = models.CharField(max_length=30, choices=ProofType.choices)
    title = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    
    # Fichier
    file = models.FileField(upload_to='missions/proofs/%Y/%m/%d/')
    file_name = models.CharField(max_length=255)
    file_size = models.PositiveIntegerField()  # Bytes
    mime_type = models.CharField(max_length=100)
    
    # Blockchain
    ipfs_hash = models.CharField(max_length=64, blank=True)
    blockchain_hash = models.CharField(max_length=66, blank=True, null=True)
    
    # Vérification
    verification_status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING
    )
    verified_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_proofs'
    )
    verification_notes = models.TextField(blank=True)
    
    # Métadonnées
    metadata = models.JSONField(default=dict, blank=True)  # EXIF, GPS, etc.
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'mission_proofs'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.proof_type} - Mission {str(self.mission.id)[:8]}"


class GPSLocation(models.Model):
    """Point GPS enregistré pendant une mission"""
    
    class LocationType(models.TextChoices):
        PICKUP = 'pickup', 'Point de retrait'
        DELIVERY = 'delivery', 'Point de livraison'
        CHECKPOINT = 'checkpoint', 'Point de contrôle'
        CURRENT = 'current', 'Position actuelle'
        START = 'start', 'Début mission'
        END = 'end', 'Fin mission'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    mission = models.ForeignKey(
        'missions.Mission',
        on_delete=models.CASCADE,
        related_name='gps_locations'
    )
    user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='gps_history'
    )
    
    location_type = models.CharField(max_length=20, choices=LocationType.choices)
    
    # Coordonnées
    latitude = models.FloatField()
    longitude = models.FloatField()
    accuracy = models.FloatField(blank=True, null=True)  # Précision en mètres
    altitude = models.FloatField(blank=True, null=True)
    # point = gis_models.PointField(geography=True, srid=4326)  # GIS removed
    
    # Contexte
    speed = models.FloatField(blank=True, null=True)  # km/h
    heading = models.FloatField(blank=True, null=True)  # Degrés
    battery_level = models.PositiveSmallIntegerField(blank=True, null=True)
    
    # Adresse décodée
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    
    # Métadonnées
    device_id = models.CharField(max_length=100, blank=True)
    app_version = models.CharField(max_length=20, blank=True)
    
    timestamp = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'gps_locations'
        ordering = ['timestamp']
        indexes = [
            models.Index(fields=['mission', 'timestamp']),
            models.Index(fields=['user', 'timestamp']),
        ]
    
    def __str__(self):
        return f"GPS {self.location_type} - {self.latitude:.4f}, {self.longitude:.4f}"


class QRValidation(models.Model):
    """Validation par QR Code"""
    
    class Status(models.TextChoices):
        PENDING = 'pending', 'En attente'
        SCANNED = 'scanned', 'Scanné'
        VALIDATED = 'validated', 'Validé'
        EXPIRED = 'expired', 'Expiré'
        CANCELLED = 'cancelled', 'Annulé'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    mission = models.OneToOneField(
        'missions.Mission',
        on_delete=models.CASCADE,
        related_name='qr_validation'
    )
    
    # QR Code
    qr_code_data = models.TextField()
    qr_code_image = models.ImageField(upload_to='qr_codes/', blank=True, null=True)
    
    # Statut
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    
    # Scan
    scanned_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    scanned_at = models.DateTimeField(blank=True, null=True)
    # scan_location = gis_models.PointField(blank=True, null=True, geography=True, srid=4326)  # GIS removed
    
    # Expiration
    expires_at = models.DateTimeField()
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'qr_validations'
    
    def __str__(self):
        return f"QR - Mission {str(self.mission.id)[:8]}"


class SignatureRecord(models.Model):
    """Signature numérique"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    mission = models.ForeignKey(
        'missions.Mission',
        on_delete=models.CASCADE,
        related_name='signatures'
    )
    
    signer = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='signatures'
    )
    signer_role = models.CharField(max_length=20)  # 'client' ou 'provider'
    
    # Données de signature
    signature_image = models.ImageField(upload_to='signatures/')
    signature_data = models.JSONField()  # Coordonnées du tracé
    
    # Contexte
    signed_at = models.DateTimeField()
    # location = gis_models.PointField(blank=True, null=True, geography=True, srid=4326)  # GIS removed
    device_info = models.JSONField(default=dict, blank=True)
    
    # Validation
    is_valid = models.BooleanField(default=True)
    validation_notes = models.TextField(blank=True)
    
    # Blockchain
    blockchain_hash = models.CharField(max_length=66, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'signature_records'
        ordering = ['-signed_at']
    
    def __str__(self):
        return f"Signature {self.signer_role} - {self.mission}"


class PhotoAnalysis(models.Model):
    """Analyse automatique des photos"""
    
    proof = models.OneToOneField(
        MissionProof,
        on_delete=models.CASCADE,
        related_name='analysis'
    )
    
    # Résultats d'analyse
    objects_detected = models.JSONField(default=list, blank=True)
    text_detected = models.TextField(blank=True)  # OCR
    faces_count = models.PositiveSmallIntegerField(default=0)
    
    # Vérification
    is_blurry = models.BooleanField(default=False)
    blur_score = models.FloatField(blank=True, null=True)
    
    is_dark = models.BooleanField(default=False)
    brightness_score = models.FloatField(blank=True, null=True)
    
    # Timestamp EXIF
    exif_timestamp = models.DateTimeField(blank=True, null=True)
    # exif_gps = gis_models.PointField(blank=True, null=True, geography=True, srid=4326)  # GIS removed
    
    # Comparaison
    matches_mission_location = models.BooleanField(default=False)
    distance_from_mission = models.FloatField(blank=True, null=True)  # Mètres
    
    # Fraude potentielle
    fraud_score = models.FloatField(default=0)  # 0-100
    fraud_flags = models.JSONField(default=list, blank=True)
    
    analyzed_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'photo_analyses'
    
    def __str__(self):
        return f"Analyse - {self.proof}"


class ProofChecklist(models.Model):
    """Checklist des preuves requises"""
    
    mission = models.OneToOneField(
        'missions.Mission',
        on_delete=models.CASCADE,
        related_name='proof_checklist'
    )
    
    # Items requis
    requires_pickup_photo = models.BooleanField(default=False)
    requires_delivery_photo = models.BooleanField(default=False)
    requires_signature = models.BooleanField(default=False)
    requires_qr_code = models.BooleanField(default=False)
    requires_receipt = models.BooleanField(default=False)
    
    # Statut
    pickup_photo_done = models.BooleanField(default=False)
    delivery_photo_done = models.BooleanField(default=False)
    signature_done = models.BooleanField(default=False)
    qr_code_done = models.BooleanField(default=False)
    receipt_done = models.BooleanField(default=False)
    
    # Complétion
    is_complete = models.BooleanField(default=False)
    completed_at = models.DateTimeField(blank=True, null=True)
    
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'proof_checklists'
    
    def __str__(self):
        return f"Checklist - {self.mission}"
    
    @property
    def completion_percentage(self):
        required = [
            self.requires_pickup_photo,
            self.requires_delivery_photo,
            self.requires_signature,
            self.requires_qr_code,
            self.requires_receipt
        ]
        done = [
            self.pickup_photo_done if self.requires_pickup_photo else True,
            self.delivery_photo_done if self.requires_delivery_photo else True,
            self.signature_done if self.requires_signature else True,
            self.qr_code_done if self.requires_qr_code else True,
            self.receipt_done if self.requires_receipt else True
        ]
        
        required_count = sum(required)
        if required_count == 0:
            return 100
        done_count = sum(done)
        return (done_count / required_count) * 100
