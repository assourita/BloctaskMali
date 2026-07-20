"""
Système de blocs de champs réutilisables pour les catégories de missions.
Permet de composer des formulaires dynamiques à partir de blocs prédéfinis.
"""
from dataclasses import dataclass, field
from typing import Any


@dataclass
class FieldDefinition:
    """Définition d'un champ de formulaire."""
    name: str
    type: str  # text, number, boolean, select, date, time, datetime, file, gps, textarea
    label: str
    required: bool = False
    options: list[str] | None = None
    validation: dict[str, Any] | None = None
    default: Any = None
    placeholder: str | None = None
    help_text: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            'name': self.name,
            'type': self.type,
            'label': self.label,
            'required': self.required,
            'options': self.options,
            'validation': self.validation,
            'default': self.default,
            'placeholder': self.placeholder,
            'help_text': self.help_text,
        }


@dataclass
class FieldBlock:
    """Bloc de champs réutilisables."""
    id: str
    label: str
    description: str
    fields: list[FieldDefinition]
    enabled_by_default: bool = False

    def to_dict(self) -> dict[str, Any]:
        return {
            'id': self.id,
            'label': self.label,
            'description': self.description,
            'fields': [f.to_dict() for f in self.fields],
            'enabled_by_default': self.enabled_by_default,
        }


# ── Définition des blocs disponibles ───────────────────────────────────────

BLOCKS: dict[str, FieldBlock] = {
    'localisation': FieldBlock(
        id='localisation',
        label='Localisation',
        description='Adresses et coordonnées GPS',
        fields=[
            FieldDefinition('pickup_address', 'text', 'Adresse de retrait', True, placeholder='Adresse complète'),
            FieldDefinition('pickup_latitude', 'gps', 'Latitude retrait', False),
            FieldDefinition('pickup_longitude', 'gps', 'Longitude retrait', False),
            FieldDefinition('delivery_address', 'text', 'Adresse de livraison', True, placeholder='Adresse complète'),
            FieldDefinition('delivery_latitude', 'gps', 'Latitude livraison', False),
            FieldDefinition('delivery_longitude', 'gps', 'Longitude livraison', False),
            FieldDefinition('location', 'text', 'Lieu d\'intervention', False, placeholder='Adresse ou description du lieu'),
            FieldDefinition('location_latitude', 'gps', 'Latitude lieu', False),
            FieldDefinition('location_longitude', 'gps', 'Longitude lieu', False),
            FieldDefinition('intervention_radius', 'number', 'Rayon d\'intervention (km)', False, validation={'min': 0}),
        ],
        enabled_by_default=True,
    ),

    'planification': FieldBlock(
        id='planification',
        label='Planification',
        description='Dates, horaires et récurrence',
        fields=[
            FieldDefinition('deadline', 'datetime', 'Date limite', True),
            FieldDefinition('start_time', 'datetime', 'Heure de début', False),
            FieldDefinition('end_time', 'datetime', 'Heure de fin', False),
            FieldDefinition('date', 'date', 'Date de l\'intervention', False),
            FieldDefinition('time_range', 'text', 'Plage horaire', False, placeholder='Ex: 09:00-12:00'),
            FieldDefinition('expected_duration', 'number', 'Durée estimée (minutes)', True, default=60, validation={'min': 1}),
            FieldDefinition('recurrence', 'select', 'Récurrence', False, options=['unique', 'daily', 'weekly', 'monthly']),
            FieldDefinition('preferred_date', 'date', 'Date préférée', False),
        ],
        enabled_by_default=True,
    ),

    'medias': FieldBlock(
        id='medias',
        label='Médias',
        description='Photos, vidéos et documents',
        fields=[
            FieldDefinition('photos', 'file', 'Photos', False, validation={'max_files': 10, 'mime_types': ['image/*']}),
            FieldDefinition('videos', 'file', 'Vidéos', False, validation={'max_files': 5, 'mime_types': ['video/*']}),
            FieldDefinition('documents', 'file', 'Documents', False, validation={'max_files': 10, 'mime_types': ['application/pdf', 'image/*']}),
            FieldDefinition('audio', 'file', 'Audio', False, validation={'max_files': 3, 'mime_types': ['audio/*']}),
            FieldDefinition('before_photo', 'file', 'Photo avant intervention', False, validation={'mime_types': ['image/*']}),
            FieldDefinition('after_photo', 'file', 'Photo après intervention', False, validation={'mime_types': ['image/*']}),
        ],
        enabled_by_default=False,
    ),

    'securite': FieldBlock(
        id='securite',
        label='Sécurité',
        description='Niveaux de sécurité et validation',
        fields=[
            FieldDefinition('kyc_level', 'select', 'Niveau KYC requis', False, options=['none', 'basic', 'enhanced', 'strict']),
            FieldDefinition('gps_tracking', 'boolean', 'Suivi GPS obligatoire', False, default=True),
            FieldDefinition('qr_validation', 'boolean', 'Validation QR Code', False, default=False),
            FieldDefinition('otp_validation', 'boolean', 'Validation OTP (SMS)', False, default=False),
            FieldDefinition('signature_required', 'boolean', 'Signature requise', False, default=False),
            FieldDefinition('identity_verification', 'boolean', 'Vérification identité', False, default=False),
        ],
        enabled_by_default=True,
    ),

    'financier': FieldBlock(
        id='financier',
        label='Financier',
        description='Budget, caution et paiement',
        fields=[
            FieldDefinition('budget', 'number', 'Budget (XOF)', True, validation={'min': 0}),
            FieldDefinition('currency', 'select', 'Devise', False, options=['XOF', 'EUR', 'USD'], default='XOF'),
            FieldDefinition('advance_payment', 'number', 'Acompte (XOF)', False, validation={'min': 0}),
            FieldDefinition('deposit_mode', 'select', 'Mode de caution', False, options=['none', 'percent_budget', 'merchandise_value', 'merchandise_or_budget', 'fixed']),
            FieldDefinition('deposit_percent', 'number', 'Pourcentage caution (%)', False, validation={'min': 0, 'max': 100}),
            FieldDefinition('deposit_fixed', 'number', 'Caution fixe (XOF)', False, validation={'min': 0}),
            FieldDefinition('commission', 'number', 'Commission (%)', False, validation={'min': 0, 'max': 30}),
            FieldDefinition('payment_method', 'select', 'Mode de paiement', False, options=['mobile_money', 'card', 'cash', 'bank_transfer']),
        ],
        enabled_by_default=True,
    ),

    'validation': FieldBlock(
        id='validation',
        label='Validation',
        description='Preuves et validation automatique',
        fields=[
            FieldDefinition('required_proofs', 'text', 'Preuves requises', False, placeholder='Liste des preuves attendues'),
            FieldDefinition('auto_validation_delay', 'number', 'Délai auto-validation (heures)', False, default=24, validation={'min': 1}),
            FieldDefinition('manual_validation', 'boolean', 'Validation manuelle uniquement', False, default=False),
            FieldDefinition('proof_photos', 'file', 'Photos de preuve', False, validation={'max_files': 5, 'mime_types': ['image/*']}),
            FieldDefinition('proof_signature', 'file', 'Signature électronique', False, validation={'mime_types': ['image/*']}),
        ],
        enabled_by_default=False,
    ),

    'exigences_prestataire': FieldBlock(
        id='exigences_prestataire',
        label='Exigences du prestataire',
        description='Critères de sélection du prestataire',
        fields=[
            FieldDefinition('min_rating', 'number', 'Note minimale', False, validation={'min': 0, 'max': 5}),
            FieldDefinition('required_badges', 'text', 'Badges obligatoires'),
            FieldDefinition('required_certifications', 'text', 'Certifications requises'),
            FieldDefinition('min_missions', 'number', 'Missions minimum', False, validation={'min': 0}),
            FieldDefinition('verified_only', 'boolean', 'Prestataires vérifiés uniquement', False, default=False),
            FieldDefinition('enterprise_only', 'boolean', 'Entreprises uniquement', False, default=False),
        ],
        enabled_by_default=False,
    ),
}


def get_block(block_id: str) -> FieldBlock | None:
    """Récupère un bloc par son ID."""
    return BLOCKS.get(block_id)


def get_blocks(block_ids: list[str]) -> list[FieldBlock]:
    """Récupère plusieurs blocs par leurs IDs."""
    return [BLOCKS.get(bid) for bid in block_ids if bid in BLOCKS]


def get_all_blocks() -> list[FieldBlock]:
    """Récupère tous les blocs disponibles."""
    return list(BLOCKS.values())
