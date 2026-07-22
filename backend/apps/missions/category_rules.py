"""
Règles métier par catégorie de mission — source unique de vérité.

Dépôt de caution :
- none : pas de caution
- percent_budget : % du budget mission
- merchandise_value : valeur marchandise déclarée (colis, achats…)
- merchandise_or_budget : max(valeur marchandise, % budget)
- fixed : montant fixe

Blocs de champs :
- localisation : adresses et GPS
- planification : dates et horaires
- medias : photos, vidéos, documents
- securite : KYC, GPS, QR, OTP, signature
- financier : budget, caution, paiement
- validation : preuves et auto-validation
- exigences_prestataire : critères de sélection
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from decimal import Decimal
from typing import Any

from .field_blocks import FieldDefinition, FieldBlock


@dataclass(frozen=True)
class CategoryRule:
    slug: str
    label: str
    mission_type: str  # delivery | transport | home_service | professional | security | other
    requires_deposit: bool = True
    deposit_mode: str = 'percent_budget'
    deposit_percent: float = 10.0
    deposit_fixed: float = 0
    deposit_floor: float = 2000
    deposit_cap: float | None = None
    requires_merchandise_value: bool = False
    requires_vehicle: bool = False
    requires_photo: bool = False
    requires_signature: bool = False
    requires_id_verification: bool = False
    requires_gps_tracking: bool = True
    requires_qr_validation: bool = False
    enterprise_only: bool = False
    min_reputation_score: float = 0
    requires_pickup: bool = True
    requires_delivery: bool = True
    show_contacts: bool = False
    location_label: str = 'Adresses'
    date_label: str = 'Échéance'
    show_time_range: bool = False
    deposit_reason: str = ''
    requirement_labels: list[str] = field(default_factory=list)
    # Nouveaux champs pour l'architecture par blocs
    enabled_blocks: list[str] = field(default_factory=list)
    custom_fields: list[FieldDefinition] = field(default_factory=list)
    field_overrides: dict[str, FieldDefinition] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data['custom_fields'] = [f.to_dict() for f in self.custom_fields]
        data['field_overrides'] = {k: v.to_dict() for k, v in self.field_overrides.items()}
        return data


def _rule(slug: str, label: str, base: dict | None = None, **overrides) -> CategoryRule:
    data = {**(base or {}), **overrides}
    return CategoryRule(slug=slug, label=label, **data)


# ── Livraison & transport (caution liée à la marchandise ou au risque) ────────

_DELIVERY_MERCH = dict(
    mission_type='delivery',
    requires_deposit=True,
    deposit_mode='merchandise_or_budget',
    deposit_percent=100,
    deposit_floor=5000,
    requires_merchandise_value=True,
    requires_vehicle=True,
    requires_photo=True,
    requires_signature=True,
    requires_gps_tracking=True,
    show_contacts=True,
    deposit_reason='Caution équivalente à la valeur de la marchandise transportée (risque de perte).',
    requirement_labels=['Véhicule', 'Photo preuve', 'Signature', 'GPS', 'Valeur marchandise'],
)

_TRANSPORT = dict(
    mission_type='transport',
    deposit_mode='percent_budget',
    deposit_percent=15,
    deposit_floor=3000,
    requires_vehicle=True,
    requires_id_verification=True,
    requires_gps_tracking=True,
    deposit_reason='Caution proportionnelle au trajet et au risque transport passager.',
    requirement_labels=['Véhicule', 'Identité vérifiée', 'GPS'],
)

_HOME = dict(
    mission_type='home_service',
    requires_pickup=False,
    requires_delivery=False,
    location_label="Lieu d'intervention",
    show_time_range=True,
)

_PRO = dict(
    mission_type='professional',
    requires_pickup=False,
    requires_delivery=False,
    location_label='Lieu de prestation',
    show_time_range=True,
    deposit_mode='percent_budget',
    deposit_percent=10,
    deposit_floor=2000,
)

CATEGORY_RULES: dict[str, CategoryRule] = {
    'livraison-colis': _rule(
        'livraison-colis', 'Livraison de colis', _DELIVERY_MERCH,
        enabled_blocks=['localisation', 'planification', 'medias', 'securite', 'financier', 'validation'],
        custom_fields=[
            FieldDefinition('package_type', 'select', 'Type de colis', True, 
                          options=['Carton', 'Sac', 'Palette', 'Enveloppe']),
            FieldDefinition('dimensions', 'text', 'Dimensions (LxlxH)', False, placeholder='Ex: 30x20x10 cm'),
            FieldDefinition('weight', 'number', 'Poids (kg)', True, validation={'min': 0}),
            FieldDefinition('package_count', 'number', 'Nombre de colis', True, validation={'min': 1}),
            FieldDefinition('is_fragile', 'boolean', 'Fragile ?', False, default=False),
            FieldDefinition('is_sealed', 'boolean', 'Scellé ?', False, default=False),
        ],
    ),
    'livraison-urgente': _rule(
        'livraison-urgente', 'Livraison urgente', _DELIVERY_MERCH,
        deposit_cap=500000, min_reputation_score=60,
        date_label='Livraison express',
        enabled_blocks=['localisation', 'planification', 'medias', 'securite', 'financier', 'validation'],
        custom_fields=[
            FieldDefinition('package_type', 'select', 'Type de colis', True, options=['Carton', 'Sac', 'Palette']),
            FieldDefinition('weight', 'number', 'Poids (kg)', True, validation={'min': 0}),
            FieldDefinition('package_count', 'number', 'Nombre de colis', True, validation={'min': 1}),
            FieldDefinition('is_fragile', 'boolean', 'Fragile ?', False, default=False),
        ],
    ),
    'livraison-ecommerce': _rule(
        'livraison-ecommerce', 'Livraison e-commerce', _DELIVERY_MERCH,
        enabled_blocks=['localisation', 'planification', 'medias', 'securite', 'financier', 'validation'],
        custom_fields=[
            FieldDefinition('order_number', 'text', 'Numéro de commande', True),
            FieldDefinition('store_name', 'text', 'Nom du magasin', True),
            FieldDefinition('package_count', 'number', 'Nombre de colis', True, validation={'min': 1}),
        ],
    ),
    'livraison-alimentaire': _rule(
        slug='livraison-alimentaire', label='Livraison alimentaire',
        deposit_mode='merchandise_or_budget', deposit_percent=50, deposit_floor=3000,
        requires_merchandise_value=True, requires_vehicle=True, requires_photo=True,
        requires_gps_tracking=True, show_contacts=True, mission_type='delivery',
        date_label='Heure de livraison',
        deposit_reason='Caution sur la valeur des denrées (fraîcheur, casse).',
        requirement_labels=['Véhicule', 'Photo', 'GPS', 'Valeur denrées'],
        enabled_blocks=['localisation', 'planification', 'medias', 'securite', 'financier', 'validation'],
        custom_fields=[
            FieldDefinition('restaurant_name', 'text', 'Restaurant', True),
            FieldDefinition('order_name', 'text', 'Nom de la commande', True),
            FieldDefinition('order_number', 'text', 'Numéro de commande', False),
        ],
    ),
    'livraison-medicale': _rule(
        slug='livraison-medicale', label='Livraison médicale',
        deposit_mode='merchandise_value', deposit_floor=10000,
        requires_merchandise_value=True, requires_vehicle=True, requires_photo=True,
        requires_signature=True, requires_id_verification=True, requires_gps_tracking=True,
        requires_qr_validation=True, show_contacts=True, mission_type='delivery',
        min_reputation_score=70,
        deposit_reason='Caution = valeur du médicament / matériel médical confié.',
        requirement_labels=['Véhicule', 'Photo', 'Signature', 'Identité', 'QR', 'Valeur médicale'],
        enabled_blocks=['localisation', 'planification', 'medias', 'securite', 'financier', 'validation', 'exigences_prestataire'],
        custom_fields=[
            FieldDefinition('pharmacy_name', 'text', 'Pharmacie', True),
            FieldDefinition('patient_name', 'text', 'Patient', False),
            FieldDefinition('prescription_photo', 'file', 'Photo ordonnance', True, validation={'mime_types': ['image/*']}),
        ],
    ),
    'courses-achats': _rule(
        slug='courses-achats', label='Courses & Achats',
        deposit_mode='merchandise_value', deposit_floor=5000,
        requires_merchandise_value=True, requires_vehicle=True, requires_photo=True,
        requires_gps_tracking=True, show_contacts=True, mission_type='delivery',
        deposit_reason='Caution = montant des achats confiés au prestataire.',
        requirement_labels=['Véhicule', 'Photo ticket', 'GPS', 'Montant achats'],
        enabled_blocks=['localisation', 'planification', 'medias', 'securite', 'financier', 'validation'],
        custom_fields=[
            FieldDefinition('shopping_list', 'textarea', 'Liste des articles', True),
            FieldDefinition('store_name', 'text', 'Magasin', True),
            FieldDefinition('estimated_amount', 'number', 'Montant estimé (XOF)', True, validation={'min': 0}),
            FieldDefinition('receipt_required', 'boolean', 'Ticket obligatoire ?', True, default=True),
        ],
    ),
    'import-export': _rule(
        slug='import-export', label='Import/Export',
        mission_type='delivery',
        deposit_mode='merchandise_value', deposit_floor=50000, deposit_cap=2000000,
        requires_merchandise_value=True, enterprise_only=True,
        requires_vehicle=True, requires_photo=True, requires_signature=True,
        requires_id_verification=True, requires_gps_tracking=True,
        deposit_reason='Caution = valeur déclarée de la marchandise en transit douanier.',
        requirement_labels=['Entreprise', 'Valeur marchandise', 'Photo', 'Signature'],
        enabled_blocks=['localisation', 'planification', 'medias', 'securite', 'financier', 'validation', 'exigences_prestataire'],
        custom_fields=[
            FieldDefinition('commercial_invoice', 'file', 'Facture commerciale', True, validation={'mime_types': ['application/pdf', 'image/*']}),
            FieldDefinition('packing_list', 'file', 'Liste de colisage', True, validation={'mime_types': ['application/pdf', 'image/*']}),
            FieldDefinition('customs_documents', 'file', 'Documents douaniers', True, validation={'mime_types': ['application/pdf', 'image/*']}),
        ],
    ),
    'transport-personne': _rule(
        slug='transport-personne', label='Transport personne', date_label='Départ prévu',
        show_time_range=True, show_contacts=True, base=_TRANSPORT,
        enabled_blocks=['localisation', 'planification', 'medias', 'securite', 'financier', 'validation', 'exigences_prestataire'],
        custom_fields=[
            FieldDefinition('passenger_count', 'number', 'Nombre de passagers', True, validation={'min': 1}),
            FieldDefinition('luggage', 'boolean', 'Bagages ?', False, default=False),
            FieldDefinition('vehicle_type', 'select', 'Type de véhicule', False, options=['Voiture', 'SUV', 'Van', 'Moto']),
        ],
    ),
    'covoiturage': _rule(
        slug='covoiturage', label='Covoiturage',
        deposit_percent=10, deposit_floor=2000, requires_id_verification=True,
        requires_vehicle=True, requires_gps_tracking=True, mission_type='transport',
        date_label='Trajet', show_time_range=True,
        deposit_reason='Caution modérée pour trajets partagés.',
        requirement_labels=['Véhicule', 'Identité', 'GPS'],
        enabled_blocks=['localisation', 'planification', 'medias', 'securite', 'financier', 'validation', 'exigences_prestataire'],
        custom_fields=[
            FieldDefinition('passenger_count', 'number', 'Nombre de passagers', True, validation={'min': 1}),
            FieldDefinition('luggage', 'boolean', 'Bagages ?', False, default=False),
        ],
    ),
    'demenagement': _rule(
        slug='demenagement', label='Déménagement',
        deposit_percent=25, deposit_floor=15000, deposit_cap=500000,
        requires_vehicle=True, requires_photo=True, requires_signature=True,
        requires_gps_tracking=True, show_contacts=True, mission_type='delivery',
        date_label='Date du déménagement', show_time_range=True,
        deposit_reason='Caution élevée — biens de valeur transportés.',
        requirement_labels=['Véhicule', 'Photo', 'Signature', 'GPS'],
        enabled_blocks=['localisation', 'planification', 'medias', 'securite', 'financier', 'validation'],
        custom_fields=[
            FieldDefinition('pickup_floor', 'number', 'Étage départ', False, validation={'min': 0}),
            FieldDefinition('delivery_floor', 'number', 'Étage arrivée', False, validation={'min': 0}),
            FieldDefinition('pickup_elevator', 'boolean', 'Ascenseur départ ?', False, default=False),
            FieldDefinition('delivery_elevator', 'boolean', 'Ascenseur arrivée ?', False, default=False),
            FieldDefinition('box_count', 'number', 'Nombre de cartons', False, validation={'min': 0}),
            FieldDefinition('furniture_count', 'number', 'Nombre de meubles', False, validation={'min': 0}),
            FieldDefinition('appliances_count', 'number', 'Électroménager', False, validation={'min': 0}),
            FieldDefinition('fragile_items', 'boolean', 'Objets fragiles ?', False, default=False),
            FieldDefinition('labor_included', 'boolean', 'Main d\'œuvre incluse ?', False, default=True),
            FieldDefinition('truck_included', 'boolean', 'Camion inclus ?', False, default=True),
            FieldDefinition('packing_included', 'boolean', 'Emballage inclus ?', False, default=False),
        ],
    ),
    'transport-lourd': _rule(
        slug='transport-lourd', label='Transport lourd',
        deposit_percent=30, deposit_floor=25000, enterprise_only=True,
        requires_vehicle=True, requires_photo=True, requires_signature=True,
        requires_gps_tracking=True, mission_type='delivery',
        date_label='Date transport', show_time_range=True,
        deposit_reason='Caution élevée pour transport professionnel lourd.',
        requirement_labels=['Entreprise', 'Véhicule', 'Photo', 'Signature'],
        enabled_blocks=['localisation', 'planification', 'medias', 'securite', 'financier', 'validation', 'exigences_prestataire'],
    ),
    # ── Services à domicile ───────────────────────────────────────────────────
    'nettoyage-menage': _rule(
        slug='nettoyage-menage', label='Nettoyage & Ménage',
        deposit_percent=10, deposit_floor=2000, requires_photo=True,
        date_label='Date de travail', deposit_reason='Caution standard domicile.',
        requirement_labels=['Photo avant/après', 'Photos des pièces'], base=_HOME,
        enabled_blocks=['localisation', 'planification', 'medias', 'securite', 'financier', 'validation'],
        custom_fields=[
            FieldDefinition('property_type', 'select', 'Type de bien', True, options=['Maison', 'Appartement', 'Bureau', 'Autre']),
            FieldDefinition('surface_area', 'number', 'Surface (m²)', False, validation={'min': 0}),
            FieldDefinition('room_count', 'number', 'Nombre de pièces', False, validation={'min': 1}),
            FieldDefinition('products_provided', 'boolean', 'Produits fournis ?', False, default=False),
            FieldDefinition('deep_cleaning', 'boolean', 'Nettoyage profond ?', False, default=False),
            FieldDefinition('windows_included', 'boolean', 'Vitres incluses ?', False, default=False),
            FieldDefinition(
                'context_photos', 'file', 'Photos des pièces à nettoyer', True,
                validation={'max_files': 8, 'mime_types': ['image/*']},
                help_text='Ajoutez des photos claires des pièces ou zones à nettoyer pour que le prestataire estime le travail.',
            ),
        ],
    ),
    'aide-domicile': _rule(
        slug='aide-domicile', label='Aide à domicile',
        deposit_percent=15, requires_id_verification=True, requires_photo=True,
        min_reputation_score=50, date_label="Date d'assistance",
        deposit_reason='Accès au domicile — identité vérifiée obligatoire.',
        requirement_labels=['Identité', 'Photo'], base=_HOME,
        enabled_blocks=['localisation', 'planification', 'medias', 'securite', 'financier', 'validation', 'exigences_prestataire'],
        custom_fields=[
            FieldDefinition('assisted_person', 'text', 'Personne assistée', True),
            FieldDefinition('age', 'number', 'Âge', False, validation={'min': 0}),
            FieldDefinition('mobility', 'select', 'Mobilité', False, options=['Autonome', 'Réduite', 'Fauteuil roulant']),
            FieldDefinition('special_needs', 'textarea', 'Besoins particuliers', False),
            FieldDefinition('emergency_contact', 'text', 'Contact urgence', True),
        ],
    ),
    'garde-enfants': _rule(
        slug='garde-enfants', label="Garde d'enfants",
        deposit_percent=25, deposit_floor=5000, requires_id_verification=True,
        requires_photo=True, min_reputation_score=70,
        date_label='Horaire de garde',
        deposit_reason='Caution renforcée — responsabilité enfants.',
        requirement_labels=['Identité vérifiée', 'Réputation 70+', 'Photo'], base=_HOME,
        enabled_blocks=['localisation', 'planification', 'medias', 'securite', 'financier', 'validation', 'exigences_prestataire'],
        custom_fields=[
            FieldDefinition('child_age', 'number', 'Âge des enfants', True, validation={'min': 0}),
            FieldDefinition('child_count', 'number', "Nombre d'enfants", True, validation={'min': 1}),
            FieldDefinition('schedule', 'text', 'Horaires', True),
            FieldDefinition('allergies', 'textarea', 'Allergies', False),
            FieldDefinition('special_needs', 'textarea', 'Besoins spécifiques', False),
            FieldDefinition('parental_authorization', 'file', 'Autorisation parentale', True, validation={'mime_types': ['application/pdf', 'image/*']}),
        ],
    ),
    'gardiennage': _rule(
        slug='gardiennage', label='Gardiennage',
        deposit_percent=20, requires_id_verification=True, requires_photo=True,
        requires_signature=True, date_label='Période de garde',
        deposit_reason='Surveillance — caution et identité obligatoires.',
        requirement_labels=['Identité', 'Photo', 'Signature', 'Photos du site'], base=_HOME,
        enabled_blocks=['localisation', 'planification', 'medias', 'securite', 'financier', 'validation', 'exigences_prestataire'],
        custom_fields=[
            FieldDefinition('property_type', 'select', 'Type de bien', True, options=['Maison', 'Appartement', 'Bureau', 'Entrepôt']),
            FieldDefinition('guard_period', 'text', 'Période de garde', True),
            FieldDefinition(
                'context_photos', 'file', 'Photos du site à surveiller', True,
                validation={'max_files': 8, 'mime_types': ['image/*']},
                help_text='Photos de l’entrée, des accès et des zones à surveiller.',
            ),
        ],
    ),
    'jardinage': _rule(
        slug='jardinage', label='Jardinage',
        deposit_percent=10, deposit_floor=2000, requires_photo=True,
        date_label='Date intervention', requirement_labels=['Photo', 'Photos du jardin'], base=_HOME,
        enabled_blocks=['localisation', 'planification', 'medias', 'securite', 'financier', 'validation'],
        custom_fields=[
            FieldDefinition('surface_area', 'number', 'Surface (m²)', False, validation={'min': 0}),
            FieldDefinition('garden_type', 'select', 'Type de jardin', False, options=['Jardin', 'Terrasse', 'Balcon', 'Potager']),
            FieldDefinition('mowing', 'boolean', 'Tonte', False, default=True),
            FieldDefinition('pruning', 'boolean', 'Taille', False, default=False),
            FieldDefinition('weeding', 'boolean', 'Désherbage', False, default=False),
            FieldDefinition('planting', 'boolean', 'Plantation', False, default=False),
            FieldDefinition(
                'context_photos', 'file', 'Photos du jardin / espace', True,
                validation={'max_files': 8, 'mime_types': ['image/*']},
                help_text='Photos de l’état actuel du jardin ou de la zone à entretenir.',
            ),
        ],
    ),
    'bricolage': _rule(
        slug='bricolage', label='Bricolage',
        deposit_percent=15, requires_photo=True, date_label='Date intervention',
        requirement_labels=['Photo', 'Photos des travaux'], base=_HOME,
        enabled_blocks=['localisation', 'planification', 'medias', 'securite', 'financier', 'validation'],
        custom_fields=[
            FieldDefinition('work_type', 'text', 'Type de travaux', True),
            FieldDefinition('material_available', 'boolean', 'Matériel disponible ?', False, default=False),
            FieldDefinition(
                'context_photos', 'file', 'Photos de l’objet / zone à bricoler', True,
                validation={'max_files': 8, 'mime_types': ['image/*']},
                help_text='Photos de l’objet, du meuble ou de la zone concernée par les travaux.',
            ),
        ],
    ),
    'maintenance-reparation': _rule(
        slug='maintenance-reparation', label='Maintenance & Réparation',
        deposit_percent=15, requires_photo=True, date_label='Intervention',
        requirement_labels=['Photo', 'Photos de la panne'], base=_HOME,
        enabled_blocks=['localisation', 'planification', 'medias', 'securite', 'financier', 'validation'],
        custom_fields=[
            FieldDefinition('device_type', 'text', "Type d'appareil", True),
            FieldDefinition('brand', 'text', 'Marque', False),
            FieldDefinition('model', 'text', 'Modèle', False),
            FieldDefinition('age', 'number', 'Ancienneté (années)', False, validation={'min': 0}),
            FieldDefinition('symptom', 'textarea', 'Symptôme de la panne', True),
            FieldDefinition('problem_description', 'textarea', 'Description du problème', True),
            FieldDefinition('appearance_date', 'date', 'Date d\'apparition', False),
            FieldDefinition('parts_replacement', 'boolean', 'Pièces à remplacer ?', False, default=False),
            FieldDefinition('estimated_quote', 'number', 'Devis estimé (XOF)', False, validation={'min': 0}),
            FieldDefinition(
                'context_photos', 'file', 'Photos de l’appareil / panne', True,
                validation={'max_files': 8, 'mime_types': ['image/*']},
                help_text='Photos de l’appareil et de la panne ou de l’usure à réparer.',
            ),
        ],
    ),
    'plomberie': _rule(
        slug='plomberie', label='Plomberie', deposit_percent=15, requires_photo=True,
        date_label='Intervention', requirement_labels=['Photo', 'Photos de la panne'], base=_HOME,
        enabled_blocks=['localisation', 'planification', 'medias', 'securite', 'financier', 'validation'],
        custom_fields=[
            FieldDefinition('leak_type', 'select', 'Type de fuite', True, options=['Fuite robinet', 'Fuite tuyau', 'Fuite réservoir', 'Autre']),
            FieldDefinition('location', 'text', 'Localisation', True),
            FieldDefinition('urgency', 'select', 'Urgence', True, options=['Faible', 'Moyenne', 'Haute', 'Urgente']),
            FieldDefinition(
                'context_photos', 'file', 'Photos de la fuite / installation', True,
                validation={'max_files': 8, 'mime_types': ['image/*']},
                help_text='Photos de la fuite ou de l’installation à réparer.',
            ),
        ],
    ),
    'electricite': _rule(
        slug='electricite', label='Électricité', deposit_percent=20, requires_photo=True,
        date_label='Intervention', requirement_labels=['Photo', 'Photos de la panne'], base=_HOME,
        enabled_blocks=['localisation', 'planification', 'medias', 'securite', 'financier', 'validation'],
        custom_fields=[
            FieldDefinition('problem_type', 'text', 'Type de panne', True),
            FieldDefinition('general_cutoff', 'boolean', 'Coupure générale ?', False, default=False),
            FieldDefinition(
                'context_photos', 'file', 'Photos du tableau / panne', True,
                validation={'max_files': 8, 'mime_types': ['image/*']},
                help_text='Photos du tableau électrique ou de la zone en panne (sans toucher aux fils).',
            ),
        ],
    ),
    'climatisation': _rule(
        slug='climatisation', label='Climatisation', deposit_percent=20, requires_photo=True,
        date_label='Intervention', requirement_labels=['Photo', 'Photos de l’appareil'], base=_HOME,
        enabled_blocks=['localisation', 'planification', 'medias', 'securite', 'financier', 'validation'],
        custom_fields=[
            FieldDefinition('device_type', 'select', "Type d'appareil", False, options=['Clim split', 'Clim mobile', 'Clim central', 'Autre']),
            FieldDefinition('brand', 'text', 'Marque', False),
            FieldDefinition('model', 'text', 'Modèle', False),
            FieldDefinition(
                'context_photos', 'file', 'Photos de l’appareil', True,
                validation={'max_files': 8, 'mime_types': ['image/*']},
                help_text='Photos de la climatisation et du problème observé.',
            ),
        ],
    ),
    'menuiserie': _rule(
        slug='menuiserie', label='Menuiserie', deposit_percent=15, requires_photo=True,
        date_label='Date travaux', requirement_labels=['Photo'], base=_HOME,
        enabled_blocks=['localisation', 'planification', 'medias', 'securite', 'financier', 'validation'],
        custom_fields=[
            FieldDefinition('furniture_type', 'text', 'Type de meuble', True),
            FieldDefinition('dimensions', 'text', 'Dimensions', False),
        ],
    ),
    'metallerie': _rule(
        slug='metallerie', label='Métallerie', deposit_percent=20, requires_photo=True,
        date_label='Date travaux', requirement_labels=['Photo'], base=_HOME,
        enabled_blocks=['localisation', 'planification', 'medias', 'securite', 'financier', 'validation'],
        custom_fields=[
            FieldDefinition('work_type', 'text', 'Type de travail', True),
        ],
    ),
    'peinture': _rule(
        slug='peinture', label='Peinture', deposit_percent=15, requires_photo=True,
        date_label='Date travaux', requirement_labels=['Photo'], base=_HOME,
        enabled_blocks=['localisation', 'planification', 'medias', 'securite', 'financier', 'validation'],
        custom_fields=[
            FieldDefinition('surface_area', 'number', 'Surface (m²)', False, validation={'min': 0}),
            FieldDefinition('desired_color', 'text', 'Couleur souhaitée', False),
            FieldDefinition('paint_type', 'select', 'Type de peinture', False, options=['Acrylique', 'Glycéro', 'Satinee', 'Mate']),
        ],
    ),
    'maconnerie': _rule(
        slug='maconnerie', label='Maçonnerie', deposit_percent=20, requires_photo=True,
        date_label='Date travaux', requirement_labels=['Photo'], base=_HOME,
        enabled_blocks=['localisation', 'planification', 'medias', 'securite', 'financier', 'validation'],
        custom_fields=[
            FieldDefinition('work_type', 'text', 'Type de travaux', True),
        ],
    ),
    'carrelage': _rule(
        slug='carrelage', label='Carrelage', deposit_percent=15, requires_photo=True,
        date_label='Date travaux', requirement_labels=['Photo'], base=_HOME,
        enabled_blocks=['localisation', 'planification', 'medias', 'securite', 'financier', 'validation'],
        custom_fields=[
            FieldDefinition('surface_area', 'number', 'Surface (m²)', False, validation={'min': 0}),
        ],
    ),
    'cuisine': _rule(
        slug='cuisine', label='Cuisine', deposit_percent=15, requires_photo=True,
        date_label='Date service', requirement_labels=['Photo'], base=_HOME,
        enabled_blocks=['localisation', 'planification', 'medias', 'securite', 'financier', 'validation'],
        custom_fields=[
            FieldDefinition('person_count', 'number', 'Nombre de personnes', True, validation={'min': 1}),
            FieldDefinition('menu', 'textarea', 'Menu', True),
            FieldDefinition('allergies', 'textarea', 'Allergies', False),
        ],
    ),
    'coiffure': _rule(
        slug='coiffure', label='Coiffure',
        requires_deposit=False, deposit_mode='none',
        date_label='RDV', requirement_labels=[], base=_HOME,
        enabled_blocks=['localisation', 'planification', 'medias', 'financier'],
        custom_fields=[
            FieldDefinition('hairstyle_type', 'text', 'Type de coiffure', True),
            FieldDefinition('hair_length', 'select', 'Longueur cheveux', False, options=['Court', 'Moyen', 'Long']),
            FieldDefinition('at_home', 'boolean', 'À domicile ?', False, default=False),
            FieldDefinition('inspiration_photo', 'file', 'Photo inspiration', False, validation={'mime_types': ['image/*']}),
            FieldDefinition('current_photo', 'file', 'Photo actuelle', False, validation={'mime_types': ['image/*']}),
        ],
    ),
    'esthetique': _rule(
        slug='esthetique', label='Esthétique',
        requires_deposit=False, deposit_mode='none',
        date_label='RDV', requirement_labels=[], base=_HOME,
        enabled_blocks=['localisation', 'planification', 'medias', 'financier'],
        custom_fields=[
            FieldDefinition('treatment_type', 'text', 'Type de soin', True),
            FieldDefinition('inspiration_photo', 'file', 'Modèle souhaité', False, validation={'mime_types': ['image/*']}),
        ],
    ),
    'massage': _rule(
        slug='massage', label='Massage',
        requires_deposit=False, deposit_mode='none',
        date_label='RDV', requirement_labels=[], base=_HOME,
        enabled_blocks=['localisation', 'planification', 'financier'],
        custom_fields=[
            FieldDefinition('massage_type', 'select', 'Type de massage', True, options=['Relaxant', 'Sportif', 'Thérapeutique', 'Autre']),
        ],
    ),
    # ── Professionnel / conseil ───────────────────────────────────────────────
    'cours-particuliers': _rule(
        slug='cours-particuliers', label='Cours particuliers',
        deposit_percent=5, deposit_floor=1000, requires_id_verification=True,
        date_label='Horaire cours',
        deposit_reason='Caution légère — accès domicile / élève.',
        requirement_labels=['Identité'], base=_PRO,
        enabled_blocks=['localisation', 'planification', 'securite', 'financier', 'validation', 'exigences_prestataire'],
        custom_fields=[
            FieldDefinition('subject', 'text', 'Matière', True),
            FieldDefinition('student_level', 'select', 'Niveau', False, options=['Primaire', 'Collège', 'Lycée', 'Universitaire', 'Adulte']),
        ],
    ),
    'technologie': _rule(
        slug='technologie', label='Technologie', deposit_percent=10, requires_photo=True,
        date_label='Intervention', requirement_labels=['Photo'], base=_PRO,
        enabled_blocks=['localisation', 'planification', 'medias', 'securite', 'financier', 'validation'],
        custom_fields=[
            FieldDefinition('device_type', 'text', "Type d'appareil", True),
            FieldDefinition('os', 'text', 'Système d\'exploitation', False),
            FieldDefinition('brand', 'text', 'Marque', False),
            FieldDefinition('model', 'text', 'Modèle', False),
            FieldDefinition('problem_description', 'textarea', 'Description du problème', True),
            FieldDefinition('error_message', 'text', 'Message d\'erreur', False),
            FieldDefinition('appearance_date', 'date', 'Date d\'apparition', False),
            FieldDefinition('screenshots', 'file', 'Captures d\'écran', False, validation={'mime_types': ['image/*']}),
            FieldDefinition('logs', 'file', 'Fichiers journaux', False, validation={'mime_types': ['text/*', 'application/json']}),
        ],
    ),
    'couture': _rule(
        slug='couture', label='Couture', deposit_percent=10,
        date_label='RDV', requirement_labels=[], base=_PRO,
        enabled_blocks=['localisation', 'planification', 'medias', 'financier'],
        custom_fields=[
            FieldDefinition('garment_type', 'text', 'Type de vêtement', True),
            FieldDefinition('size', 'text', 'Taille', True),
            FieldDefinition('fabric_provided', 'boolean', 'Tissu fourni ?', False, default=False),
            FieldDefinition('pattern', 'file', 'Patron', False, validation={'mime_types': ['application/pdf', 'image/*']}),
            FieldDefinition('desired_model_photo', 'file', 'Modèle souhaité', False, validation={'mime_types': ['image/*']}),
        ],
    ),
    'photographie': _rule(
        slug='photographie', label='Photographie', deposit_percent=15, requires_photo=True,
        date_label='Événement', requirement_labels=['Portfolio / Photo'], base=_PRO,
        enabled_blocks=['localisation', 'planification', 'medias', 'financier', 'validation'],
        custom_fields=[
            FieldDefinition('event_type', 'text', 'Type d\'événement', True),
            FieldDefinition('person_count', 'number', 'Nombre de personnes', False, validation={'min': 1}),
            FieldDefinition('duration', 'number', 'Durée (heures)', False, validation={'min': 1}),
            FieldDefinition('expected_photos', 'number', 'Photos attendues', False, validation={'min': 1}),
            FieldDefinition('format', 'select', 'Format', False, options=['JPEG', 'RAW', 'Les deux']),
        ],
    ),
    'services-administratifs': _rule(
        slug='services-administratifs', label='Services administratifs',
        deposit_percent=10, requires_id_verification=True, requires_photo=True,
        date_label='Échéance dossier',
        deposit_reason='Documents confiés — identité requise.',
        requirement_labels=['Identité', 'Photo récépissé'], base=_PRO,
        enabled_blocks=['localisation', 'planification', 'medias', 'securite', 'financier', 'validation', 'exigences_prestataire'],
        custom_fields=[
            FieldDefinition('organization', 'text', 'Organisme concerné', True),
            FieldDefinition('procedure_type', 'text', 'Type de démarche', True),
            FieldDefinition('deadline', 'date', 'Date limite', True),
            FieldDefinition('id_document', 'file', 'Pièce d\'identité', True, validation={'mime_types': ['image/*', 'application/pdf']}),
            FieldDefinition('power_of_attorney', 'file', 'Procuration', False, validation={'mime_types': ['application/pdf', 'image/*']}),
            FieldDefinition('admin_documents', 'file', 'Documents administratifs', False, validation={'mime_types': ['application/pdf', 'image/*']}),
        ],
    ),
    'traduction': _rule(
        slug='traduction', label='Traduction', deposit_percent=5,
        date_label='Deadline', requirement_labels=[], base=_PRO,
        enabled_blocks=['planification', 'medias', 'financier', 'validation'],
        custom_fields=[
            FieldDefinition('source_language', 'text', 'Langue source', True),
            FieldDefinition('target_language', 'text', 'Langue cible', True),
            FieldDefinition('page_count', 'number', 'Nombre de pages', False, validation={'min': 1}),
            FieldDefinition('source_file', 'file', 'Fichier à traduire', True, validation={'mime_types': ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']}),
        ],
    ),
    'redaction': _rule(
        slug='redaction', label='Rédaction', deposit_percent=5,
        date_label='Deadline', requirement_labels=[], base=_PRO,
        enabled_blocks=['planification', 'medias', 'financier', 'validation'],
        custom_fields=[
            FieldDefinition('document_type', 'text', 'Type de document', True),
            FieldDefinition('word_count', 'number', 'Nombre de mots', False, validation={'min': 1}),
            FieldDefinition('language', 'text', 'Langue', True),
            FieldDefinition('source_file', 'file', 'Fichier source', False, validation={'mime_types': ['application/pdf', 'application/msword', 'text/plain']}),
            FieldDefinition('instructions', 'textarea', 'Consignes détaillées', False),
        ],
    ),
    'comptabilite': _rule(
        slug='comptabilite', label='Comptabilité',
        deposit_percent=10, requires_id_verification=True,
        date_label='Deadline', requirement_labels=['Identité'], base=_PRO,
        enabled_blocks=['planification', 'medias', 'securite', 'financier', 'validation', 'exigences_prestataire'],
        custom_fields=[
            FieldDefinition('invoices', 'file', 'Factures', False, validation={'mime_types': ['application/pdf', 'image/*']}),
            FieldDefinition('bank_statements', 'file', 'Relevés bancaires', False, validation={'mime_types': ['application/pdf', 'image/*']}),
            FieldDefinition('financial_statements', 'file', 'États financiers', False, validation={'mime_types': ['application/pdf', 'image/*']}),
        ],
    ),
    'conseil-juridique': _rule(
        slug='conseil-juridique', label='Conseil juridique',
        deposit_percent=15, requires_id_verification=True,
        date_label='RDV', requirement_labels=['Identité'], base=_PRO,
        enabled_blocks=['localisation', 'planification', 'medias', 'securite', 'financier', 'validation', 'exigences_prestataire'],
        custom_fields=[
            FieldDefinition('contracts', 'file', 'Contrats', False, validation={'mime_types': ['application/pdf', 'image/*']}),
            FieldDefinition('correspondence', 'file', 'Courriers', False, validation={'mime_types': ['application/pdf', 'image/*']}),
            FieldDefinition('supporting_documents', 'file', 'Pièces justificatives', False, validation={'mime_types': ['application/pdf', 'image/*']}),
        ],
    ),
    'divertissement': _rule(
        slug='divertissement', label='Divertissement',
        deposit_percent=15, requires_photo=True, date_label='Événement',
        requirement_labels=['Photo'], base=_PRO,
        enabled_blocks=['localisation', 'planification', 'medias', 'financier', 'validation'],
        custom_fields=[
            FieldDefinition('event_type', 'text', 'Type d\'événement', True),
        ],
    ),
    'decor-evenementiel': _rule(
        slug='decor-evenementiel', label='Décor événementiel',
        deposit_percent=20, requires_photo=True, date_label='Événement',
        requirement_labels=['Photo'], base=_PRO,
        enabled_blocks=['localisation', 'planification', 'medias', 'financier', 'validation'],
        custom_fields=[
            FieldDefinition('event_type', 'text', 'Type d\'événement', True),
        ],
    ),
    'immobilier': _rule(
        slug='immobilier', label='Immobilier',
        deposit_percent=10, requires_id_verification=True, requires_photo=True,
        date_label='Visite', requirement_labels=['Identité', 'Photo'],
        base=_PRO,
        enabled_blocks=['localisation', 'planification', 'medias', 'securite', 'financier', 'validation', 'exigences_prestataire'],
        custom_fields=[
            FieldDefinition('address', 'text', 'Adresse', True),
            FieldDefinition('property_type', 'select', 'Type de bien', True, options=['Appartement', 'Maison', 'Bureau', 'Terrain', 'Commerce']),
            FieldDefinition('mission_type', 'select', 'Type de mission', True, options=['Visite', 'État des lieux', 'Photos']),
            FieldDefinition('report_pdf', 'file', 'Rapport PDF', False, validation={'mime_types': ['application/pdf']}),
        ],
    ),
    'securite': _rule(
        slug='securite', label='Sécurité',
        deposit_percent=30, deposit_floor=20000, enterprise_only=True,
        requires_id_verification=True, requires_photo=True, requires_signature=True,
        mission_type='security', date_label='Mission sécurité', show_time_range=True,
        deposit_reason='Mission sécurité — entreprise agréée et caution élevée.',
        requirement_labels=['Entreprise', 'Identité', 'Signature', 'Photos du site'],
        requires_pickup=False, requires_delivery=False,
        location_label='Lieu de mission',
        enabled_blocks=['localisation', 'planification', 'medias', 'securite', 'financier', 'validation', 'exigences_prestataire'],
        custom_fields=[
            FieldDefinition('agent_count', 'number', 'Nombre d\'agents', False, validation={'min': 1}),
            FieldDefinition(
                'context_photos', 'file', 'Photos du site à sécuriser', True,
                validation={'max_files': 8, 'mime_types': ['image/*']},
                help_text='Photos des accès, périmètre et points sensibles du site.',
            ),
            FieldDefinition('site_plan', 'file', 'Plan du site', False, validation={'mime_types': ['application/pdf', 'image/*']}),
            FieldDefinition('security_instructions', 'file', 'Consignes de sécurité', False, validation={'mime_types': ['application/pdf', 'image/*']}),
        ],
    ),
    'autre': _rule(
        slug='autre', label='Autre',
        deposit_percent=10, deposit_floor=2000,
        deposit_reason='Caution standard (10 % du budget).',
        requirement_labels=['GPS'],
        mission_type='other',
        enabled_blocks=['localisation', 'planification', 'securite', 'financier'],
    ),
}

DEFAULT_RULE = CATEGORY_RULES['autre']


def _match_slug(category) -> str | None:
    if not category:
        return None
    slug = (getattr(category, 'slug', None) or '').lower().strip()
    if slug in CATEGORY_RULES:
        return slug
    name = (getattr(category, 'name', None) or '').lower()
    for key, rule in CATEGORY_RULES.items():
        if key.replace('-', ' ') in name or key.split('-')[0] in name:
            return key
    for key in CATEGORY_RULES:
        if key in slug or slug in key:
            return key
    return None


def get_category_rule(category) -> CategoryRule:
    key = _match_slug(category)
    if key:
        return CATEGORY_RULES[key]
    return DEFAULT_RULE


def apply_category_defaults_to_mission_data(data: dict, category) -> dict:
    """Applique flags et requirements imposés par la catégorie à la création."""
    rule = get_category_rule(category)
    data['requires_gps_tracking'] = rule.requires_gps_tracking
    data['requires_qr_validation'] = rule.requires_qr_validation
    data['enterprise_only'] = rule.enterprise_only
    if rule.min_reputation_score:
        data['min_reputation_score'] = max(
            float(data.get('min_reputation_score') or 0),
            rule.min_reputation_score,
        )
    return data


def build_requirements_payload(data: dict, rule: CategoryRule) -> dict:
    """Construit le JSON requirements avec règles catégorie + saisie client."""
    req: dict[str, Any] = {
        'category_slug': rule.slug,
        'category_type': rule.mission_type,
        'requires_vehicle': rule.requires_vehicle or bool(data.get('requires_vehicle')),
        'requires_photo': rule.requires_photo or bool(data.get('requires_photo')),
        'requires_signature': rule.requires_signature or bool(data.get('requires_signature')),
        'requires_id_verification': rule.requires_id_verification or bool(data.get('requires_id_verification')),
        'deposit_mode': rule.deposit_mode,
        'deposit_reason': rule.deposit_reason,
        'requirement_labels': rule.requirement_labels,
    }
    if data.get('merchandise_value') is not None:
        req['merchandise_value'] = float(data['merchandise_value'])
    if data.get('special_instructions'):
        req['special_instructions'] = data['special_instructions']
    for key in ('estimated_duration', 'start_time', 'end_time',
                'pickup_contact_name', 'pickup_contact_phone',
                'delivery_contact_name', 'delivery_contact_phone'):
        if data.get(key):
            req[key] = data[key]

    # Champs catégorie (hors fichiers — stockés via MissionMedia)
    file_field_names = {f.name for f in rule.custom_fields if f.type == 'file'}
    req['required_media_fields'] = [
        {'name': f.name, 'label': f.label}
        for f in rule.custom_fields
        if f.type == 'file' and f.required
    ]
    for field_def in rule.custom_fields:
        if field_def.name in file_field_names:
            continue
        value = data.get(field_def.name)
        if value is None or value == '':
            continue
        if field_def.type == 'number':
            try:
                req[field_def.name] = float(value)
            except (TypeError, ValueError):
                req[field_def.name] = value
        else:
            req[field_def.name] = value

    return req


def get_custom_field_details(mission) -> list[dict[str, Any]]:
    """Détails catégorie lisibles pour le prestataire (hors fichiers)."""
    from .requirements import parse_mission_requirements

    rule = get_category_rule(mission.category)
    req = parse_mission_requirements(mission)
    details: list[dict[str, Any]] = []

    extra_labels = {
        'special_instructions': 'Instructions spéciales',
        'merchandise_value': 'Valeur marchandise (XOF)',
        'start_time': 'Heure de début',
        'end_time': 'Heure de fin',
        'estimated_duration': 'Durée estimée',
    }
    for key, label in extra_labels.items():
        value = req.get(key)
        if value is None or value == '':
            continue
        details.append({'name': key, 'label': label, 'type': 'text', 'value': value})

    for field_def in rule.custom_fields:
        if field_def.type == 'file':
            continue
        value = req.get(field_def.name)
        if value is None or value == '':
            continue
        details.append({
            'name': field_def.name,
            'label': field_def.label,
            'type': field_def.type,
            'value': value,
        })
    return details


def calculate_category_deposit(mission, provider=None) -> Decimal:
    """Calcule la caution selon catégorie, budget et valeur marchandise."""
    from .requirements import parse_mission_requirements

    rule = get_category_rule(mission.category)
    if not rule.requires_deposit or rule.deposit_mode == 'none':
        return Decimal('0')

    req = parse_mission_requirements(mission)
    budget = Decimal(str(mission.final_price or mission.budget or 0))
    merchandise = Decimal(str(req.get('merchandise_value') or 0))
    floor = Decimal(str(rule.deposit_floor))
    cap = Decimal(str(rule.deposit_cap)) if rule.deposit_cap else None

    if rule.deposit_mode == 'merchandise_value':
        amount = merchandise if merchandise > 0 else budget
    elif rule.deposit_mode == 'merchandise_or_budget':
        pct = budget * Decimal(str(rule.deposit_percent)) / Decimal('100')
        amount = max(merchandise, pct)
    elif rule.deposit_mode == 'percent_budget':
        amount = budget * Decimal(str(rule.deposit_percent)) / Decimal('100')
    elif rule.deposit_mode == 'fixed':
        amount = Decimal(str(rule.deposit_fixed))
    else:
        amount = Decimal('0')

    # Réduction réputation (sauf si caution = marchandise)
    if provider and rule.deposit_mode not in ('merchandise_value', 'merchandise_or_budget'):
        try:
            score = float(provider.provider_profile.reputation_score)
            if score >= 90:
                amount *= Decimal('0.5')
            elif score >= 70:
                amount *= Decimal('0.75')
        except Exception:
            pass

    amount = max(amount, floor)
    if cap and amount > cap:
        amount = cap
    return amount.quantize(Decimal('1'))


def estimate_deposit_preview(budget: float, merchandise_value: float | None, category) -> dict:
    """Aperçu caution pour le formulaire de création."""
    from types import SimpleNamespace

    rule = get_category_rule(category)
    fake = SimpleNamespace(
        category=category,
        budget=Decimal(str(budget)),
        final_price=None,
        requirements='',
    )
    import json
    fake.requirements = json.dumps({
        'merchandise_value': merchandise_value or 0,
    })
    amount = calculate_category_deposit(fake)
    return {
        'requires_deposit': rule.requires_deposit and rule.deposit_mode != 'none',
        'estimated_deposit': float(amount),
        'deposit_mode': rule.deposit_mode,
        'deposit_reason': rule.deposit_reason,
        'requires_merchandise_value': rule.requires_merchandise_value,
    }

def display_category_name(category) -> str:
    """Nom affich� propre (corrige les accents corrompus type M??nage)."""
    if not category:
        return ''
    name = (getattr(category, 'name', None) or '').strip()
    if name and '??' not in name and '\ufffd' not in name:
        return name
    slug = getattr(category, 'slug', None) or ''
    rule = CATEGORY_RULES.get(slug)
    return rule.label if rule else (name or 'Mission')
