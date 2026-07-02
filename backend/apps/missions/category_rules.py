"""
Règles métier par catégorie de mission — source unique de vérité.

Dépôt de caution :
- none : pas de caution
- percent_budget : % du budget mission
- merchandise_value : valeur marchandise déclarée (colis, achats…)
- merchandise_or_budget : max(valeur marchandise, % budget)
- fixed : montant fixe
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from decimal import Decimal
from typing import Any


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

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


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
    'livraison-colis': _rule('livraison-colis', 'Livraison de colis', _DELIVERY_MERCH),
    'livraison-urgente': _rule(
        'livraison-urgente', 'Livraison urgente', _DELIVERY_MERCH,
        deposit_cap=500000, min_reputation_score=60,
        date_label='Livraison express',
    ),
    'livraison-ecommerce': _rule('livraison-ecommerce', 'Livraison e-commerce', _DELIVERY_MERCH),
    'livraison-alimentaire': _rule(
        slug='livraison-alimentaire', label='Livraison alimentaire',
        deposit_mode='merchandise_or_budget', deposit_percent=50, deposit_floor=3000,
        requires_merchandise_value=True, requires_vehicle=True, requires_photo=True,
        requires_gps_tracking=True, show_contacts=True, mission_type='delivery',
        date_label='Heure de livraison',
        deposit_reason='Caution sur la valeur des denrées (fraîcheur, casse).',
        requirement_labels=['Véhicule', 'Photo', 'GPS', 'Valeur denrées'],
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
    ),
    'courses-achats': _rule(
        slug='courses-achats', label='Courses & Achats',
        deposit_mode='merchandise_value', deposit_floor=5000,
        requires_merchandise_value=True, requires_vehicle=True, requires_photo=True,
        requires_gps_tracking=True, show_contacts=True, mission_type='delivery',
        deposit_reason='Caution = montant des achats confiés au prestataire.',
        requirement_labels=['Véhicule', 'Photo ticket', 'GPS', 'Montant achats'],
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
    ),
    'transport-personne': _rule(
        slug='transport-personne', label='Transport personne', date_label='Départ prévu',
        show_time_range=True, show_contacts=True, base=_TRANSPORT,
    ),
    'covoiturage': _rule(
        slug='covoiturage', label='Covoiturage',
        deposit_percent=10, deposit_floor=2000, requires_id_verification=True,
        requires_vehicle=True, requires_gps_tracking=True, mission_type='transport',
        date_label='Trajet', show_time_range=True,
        deposit_reason='Caution modérée pour trajets partagés.',
        requirement_labels=['Véhicule', 'Identité', 'GPS'],
    ),
    'demenagement': _rule(
        slug='demenagement', label='Déménagement',
        deposit_percent=25, deposit_floor=15000, deposit_cap=500000,
        requires_vehicle=True, requires_photo=True, requires_signature=True,
        requires_gps_tracking=True, show_contacts=True, mission_type='delivery',
        date_label='Date du déménagement', show_time_range=True,
        deposit_reason='Caution élevée — biens de valeur transportés.',
        requirement_labels=['Véhicule', 'Photo', 'Signature', 'GPS'],
    ),
    'transport-lourd': _rule(
        slug='transport-lourd', label='Transport lourd',
        deposit_percent=30, deposit_floor=25000, enterprise_only=True,
        requires_vehicle=True, requires_photo=True, requires_signature=True,
        requires_gps_tracking=True, mission_type='delivery',
        date_label='Date transport', show_time_range=True,
        deposit_reason='Caution élevée pour transport professionnel lourd.',
        requirement_labels=['Entreprise', 'Véhicule', 'Photo', 'Signature'],
    ),
    # ── Services à domicile ───────────────────────────────────────────────────
    'nettoyage-menage': _rule(
        slug='nettoyage-menage', label='Nettoyage & Ménage',
        deposit_percent=10, deposit_floor=2000, requires_photo=True,
        date_label='Date de travail', deposit_reason='Caution standard domicile.',
        requirement_labels=['Photo avant/après'], base=_HOME,
    ),
    'aide-domicile': _rule(
        slug='aide-domicile', label='Aide à domicile',
        deposit_percent=15, requires_id_verification=True, requires_photo=True,
        min_reputation_score=50, date_label="Date d'assistance",
        deposit_reason='Accès au domicile — identité vérifiée obligatoire.',
        requirement_labels=['Identité', 'Photo'], base=_HOME,
    ),
    'garde-enfants': _rule(
        slug='garde-enfants', label="Garde d'enfants",
        deposit_percent=25, deposit_floor=5000, requires_id_verification=True,
        requires_photo=True, min_reputation_score=70,
        date_label='Horaire de garde',
        deposit_reason='Caution renforcée — responsabilité enfants.',
        requirement_labels=['Identité vérifiée', 'Réputation 70+', 'Photo'],
        base=_HOME,
    ),
    'gardiennage': _rule(
        slug='gardiennage', label='Gardiennage',
        deposit_percent=20, requires_id_verification=True, requires_photo=True,
        requires_signature=True, date_label='Période de garde',
        deposit_reason='Surveillance — caution et identité obligatoires.',
        requirement_labels=['Identité', 'Photo', 'Signature'], base=_HOME,
    ),
    'jardinage': _rule(
        slug='jardinage', label='Jardinage',
        deposit_percent=10, deposit_floor=2000, requires_photo=True,
        date_label='Date intervention', requirement_labels=['Photo'], base=_HOME,
    ),
    'bricolage': _rule(
        slug='bricolage', label='Bricolage',
        deposit_percent=15, requires_photo=True, date_label='Date intervention',
        requirement_labels=['Photo'], base=_HOME,
    ),
    'maintenance-reparation': _rule(
        slug='maintenance-reparation', label='Maintenance & Réparation',
        deposit_percent=15, requires_photo=True, date_label='Intervention',
        requirement_labels=['Photo'], base=_HOME,
    ),
    'plomberie': _rule(
        slug='plomberie', label='Plomberie', deposit_percent=15, requires_photo=True,
        date_label='Intervention', requirement_labels=['Photo'], base=_HOME,
    ),
    'electricite': _rule(
        slug='electricite', label='Électricité', deposit_percent=20, requires_photo=True,
        date_label='Intervention', requirement_labels=['Photo'], base=_HOME,
    ),
    'climatisation': _rule(
        slug='climatisation', label='Climatisation', deposit_percent=20, requires_photo=True,
        date_label='Intervention', requirement_labels=['Photo'], base=_HOME,
    ),
    'menuiserie': _rule(
        slug='menuiserie', label='Menuiserie', deposit_percent=15, requires_photo=True,
        date_label='Date travaux', requirement_labels=['Photo'], base=_HOME,
    ),
    'metallerie': _rule(
        slug='metallerie', label='Métallerie', deposit_percent=20, requires_photo=True,
        date_label='Date travaux', requirement_labels=['Photo'], base=_HOME,
    ),
    'peinture': _rule(
        slug='peinture', label='Peinture', deposit_percent=15, requires_photo=True,
        date_label='Date travaux', requirement_labels=['Photo'], base=_HOME,
    ),
    'maconnerie': _rule(
        slug='maconnerie', label='Maçonnerie', deposit_percent=20, requires_photo=True,
        date_label='Date travaux', requirement_labels=['Photo'], base=_HOME,
    ),
    'carrelage': _rule(
        slug='carrelage', label='Carrelage', deposit_percent=15, requires_photo=True,
        date_label='Date travaux', requirement_labels=['Photo'], base=_HOME,
    ),
    'cuisine': _rule(
        slug='cuisine', label='Cuisine', deposit_percent=15, requires_photo=True,
        date_label='Date service', requirement_labels=['Photo'], base=_HOME,
    ),
    'coiffure': _rule(
        slug='coiffure', label='Coiffure',
        requires_deposit=False, deposit_mode='none',
        date_label='RDV', requirement_labels=[], base=_HOME,
    ),
    'esthetique': _rule(
        slug='esthetique', label='Esthétique',
        requires_deposit=False, deposit_mode='none',
        date_label='RDV', requirement_labels=[], base=_HOME,
    ),
    'massage': _rule(
        slug='massage', label='Massage',
        requires_deposit=False, deposit_mode='none',
        date_label='RDV', requirement_labels=[], base=_HOME,
    ),
    # ── Professionnel / conseil ───────────────────────────────────────────────
    'cours-particuliers': _rule(
        slug='cours-particuliers', label='Cours particuliers',
        deposit_percent=5, deposit_floor=1000, requires_id_verification=True,
        date_label='Horaire cours',
        deposit_reason='Caution légère — accès domicile / élève.',
        requirement_labels=['Identité'], base=_PRO,
    ),
    'technologie': _rule(
        slug='technologie', label='Technologie', deposit_percent=10, requires_photo=True,
        date_label='Intervention', requirement_labels=['Photo'], base=_PRO,
    ),
    'couture': _rule(
        slug='couture', label='Couture', deposit_percent=10,
        date_label='RDV', requirement_labels=[], base=_PRO,
    ),
    'photographie': _rule(
        slug='photographie', label='Photographie', deposit_percent=15, requires_photo=True,
        date_label='Événement', requirement_labels=['Portfolio / Photo'], base=_PRO,
    ),
    'services-administratifs': _rule(
        slug='services-administratifs', label='Services administratifs',
        deposit_percent=10, requires_id_verification=True, requires_photo=True,
        date_label='Échéance dossier',
        deposit_reason='Documents confiés — identité requise.',
        requirement_labels=['Identité', 'Photo récépissé'], base=_PRO,
    ),
    'traduction': _rule(
        slug='traduction', label='Traduction', deposit_percent=5,
        date_label='Deadline', requirement_labels=[], base=_PRO,
    ),
    'redaction': _rule(
        slug='redaction', label='Rédaction', deposit_percent=5,
        date_label='Deadline', requirement_labels=[], base=_PRO,
    ),
    'comptabilite': _rule(
        slug='comptabilite', label='Comptabilité',
        deposit_percent=10, requires_id_verification=True,
        date_label='Deadline', requirement_labels=['Identité'], base=_PRO,
    ),
    'conseil-juridique': _rule(
        slug='conseil-juridique', label='Conseil juridique',
        deposit_percent=15, requires_id_verification=True,
        date_label='RDV', requirement_labels=['Identité'], base=_PRO,
    ),
    'divertissement': _rule(
        slug='divertissement', label='Divertissement',
        deposit_percent=15, requires_photo=True, date_label='Événement',
        requirement_labels=['Photo'], base=_PRO,
    ),
    'decor-evenementiel': _rule(
        slug='decor-evenementiel', label='Décor événementiel',
        deposit_percent=20, requires_photo=True, date_label='Événement',
        requirement_labels=['Photo'], base=_PRO,
    ),
    'immobilier': _rule(
        slug='immobilier', label='Immobilier',
        deposit_percent=10, requires_id_verification=True, requires_photo=True,
        date_label='Visite', requirement_labels=['Identité', 'Photo'],
        base=_PRO,
    ),
    'securite': _rule(
        slug='securite', label='Sécurité',
        deposit_percent=30, deposit_floor=20000, enterprise_only=True,
        requires_id_verification=True, requires_photo=True, requires_signature=True,
        mission_type='security', date_label='Mission sécurité', show_time_range=True,
        deposit_reason='Mission sécurité — entreprise agréée et caution élevée.',
        requirement_labels=['Entreprise', 'Identité', 'Signature'],
        requires_pickup=False, requires_delivery=False,
        location_label='Lieu de mission',
    ),
    'autre': _rule(
        slug='autre', label='Autre',
        deposit_percent=10, deposit_floor=2000,
        deposit_reason='Caution standard (10 % du budget).',
        requirement_labels=['GPS'],
        mission_type='other',
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
    for key in ('estimated_duration', 'start_time', 'end_time'):
        if data.get(key):
            req[key] = data[key]
    return req


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
