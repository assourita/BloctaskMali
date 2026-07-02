import os
import random
import re
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from decimal import Decimal
from datetime import timedelta

from django.core.files.base import ContentFile
from django.utils import timezone

from apps.users.models import User, ProviderProfile, EnterpriseProfile, Employee
from apps.missions.models import Mission, Category

KYC_PLACEHOLDER = ContentFile(b'\x89PNG\r\n\x1a\n', name='kyc.png')


def apply_seed_kyc(user: User) -> None:
    """Marque les comptes seed comme KYC complets pour les tests."""
    phone_digits = re.sub(r'\D', '', user.phone_number or '')
    last4 = phone_digits[-4:] if len(phone_digits) >= 4 else '1234'
    user.nina = f'ML{last4}SEED'
    user.phone_verified = True
    user.kyc_status = User.KYCStatus.VERIFIED
    # Validation admin simulée : sans kyc_verified_at, le compte serait
    # considéré comme "non validé" et son statut vérifié serait retiré.
    now = timezone.now()
    if not user.kyc_submitted_at:
        user.kyc_submitted_at = now
    user.kyc_verified_at = now
    if not user.id_card_front:
        user.id_card_front.save('id_front.png', KYC_PLACEHOLDER, save=False)
    if not user.id_card_back:
        user.id_card_back.save('id_back.png', KYC_PLACEHOLDER, save=False)
    if not user.selfie_verification:
        user.selfie_verification.save('selfie.png', KYC_PLACEHOLDER, save=False)
    if not user.address:
        user.address = 'Adresse seed'
    if not user.city:
        user.city = 'Bamako'
    user.save()

clients = [
    {'email': 'traore.amadou@gmail.com',       'username': 'traoreamadou',      'first_name': 'Amadou',     'last_name': 'Traoré',   'phone': '+22370102030', 'city': 'Bamako', 'country': 'Mali'},
    {'email': 'diarra.fatoumata@gmail.com',    'username': 'diarrafatoumata',   'first_name': 'Fatoumata',  'last_name': 'Diarra',   'phone': '+22370405060', 'city': 'Sikasso', 'country': 'Mali'},
    {'email': 'coulibaly.moussa@gmail.com',    'username': 'coulibalymoussa',   'first_name': 'Moussa',     'last_name': 'Coulibaly','phone': '+22370708090', 'city': 'Kayes', 'country': 'Mali'},
]

providers = [
    {'email': 'keita.mamadou@gmail.com',       'username': 'keitamamadou',      'first_name': 'Mamadou',   'last_name': 'Keita',     'phone': '+22371112131', 'city': 'Bamako', 'country': 'Mali', 'skills': ['livraison', 'coursier'],      'level': 'gold'},
    {'email': 'sissoko.aminata@gmail.com',      'username': 'sissokoaminata',    'first_name': 'Aminata',   'last_name': 'Sissoko',   'phone': '+22371415161', 'city': 'Ségou', 'country': 'Mali', 'skills': ['menage', 'nettoyage'],        'level': 'silver'},
    {'email': 'toure.ibrahim@gmail.com',        'username': 'toureibrahim',      'first_name': 'Ibrahim',   'last_name': 'Touré',     'phone': '+22371718191', 'city': 'Mopti', 'country': 'Mali', 'skills': ['plomberie', 'electricite'],   'level': 'bronze'},
    {'email': 'diallo.mariam@gmail.com',        'username': 'diallomariam',      'first_name': 'Mariam',    'last_name': 'Diallo',    'phone': '+22372021222', 'city': 'Bamako', 'country': 'Mali', 'skills': ['cuisine', 'traiteur'],        'level': 'silver'},
    {'email': 'sangare.lamine@gmail.com',       'username': 'sangarelamine',     'first_name': 'Lamine',    'last_name': 'Sangaré',   'phone': '+22372324252', 'city': 'Koutiala', 'country': 'Mali', 'skills': ['jardinage', 'entretien'],     'level': 'bronze'},
    {'email': 'konate.kadiatou@gmail.com',      'username': 'konatekadiatou',    'first_name': 'Kadiatou',  'last_name': 'Konaté',    'phone': '+22372627282', 'city': 'Bamako', 'country': 'Mali', 'skills': ['baby-sitting', 'garde'],      'level': 'gold'},
    {'email': 'cisse.modibo@gmail.com',         'username': 'cissemodibo',       'first_name': 'Modibo',    'last_name': 'Cissé',     'phone': '+22372930313', 'city': 'Gao', 'country': 'Mali', 'skills': ['mecanique', 'auto'],          'level': 'platinum'},
    {'email': 'maiga.naminata@gmail.com',       'username': 'maiganaminata',     'first_name': 'Naminata',  'last_name': 'Maïga',     'phone': '+22373233343', 'city': 'Bamako', 'country': 'Mali', 'skills': ['coiffure', 'beaute'],         'level': 'silver'},
]

enterprises_data = [
    {
        'user': {'email': 'bamako.logistics@enterprise.com', 'username': 'bamakologistics', 'first_name': 'Bamako', 'last_name': 'Logistics', 'phone': '+22320010101'},
        'profile': {'company_name': 'Bamako Logistics SARL', 'city': 'Bamako', 'address': 'Hippodrome, Rue 123', 'company_email': 'contact@bamakologistics.ml', 'company_phone': '+22320010101'},
    },
    {
        'user': {'email': 'techmali@enterprise.com', 'username': 'techmali', 'first_name': 'TechMali', 'last_name': 'SAS', 'phone': '+22320020202'},
        'profile': {'company_name': 'TechMali SAS', 'city': 'Bamako', 'address': 'ACI 2000, Immeuble A', 'company_email': 'info@techmali.ml', 'company_phone': '+22320020202'},
    },
    {
        'user': {'email': 'batiment.pro.ml@enterprise.com', 'username': 'batimentproml', 'first_name': 'Batiment', 'last_name': 'Pro', 'phone': '+22320030303'},
        'profile': {'company_name': 'Bâtiment Pro Mali', 'city': 'Sikasso', 'address': 'Centre-ville, BP 445', 'company_email': 'contact@batimentpro.ml', 'company_phone': '+22320030303'},
    },
    {
        'user': {'email': 'greenservices.ml@enterprise.com', 'username': 'greenservicesml', 'first_name': 'Green', 'last_name': 'Services', 'phone': '+22320040404'},
        'profile': {'company_name': 'Green Services Mali', 'city': 'Ségou', 'address': 'Quartier Commerce, Rue 12', 'company_email': 'hello@greenservices.ml', 'company_phone': '+22320040404'},
    },
]

EMPLOYEE_POOL = [
    ('Moussa', 'Diarra', '+22375000001', 'Livreur', 'agent'),
    ('Aminata', 'Keita', '+22375000002', 'Comptable', 'accountant'),
    ('Ibrahim', 'Touré', '+22375000003', 'Manager Ops', 'manager'),
    ('Mariam', 'Coulibaly', '+22375000004', 'Agent terrain', 'agent'),
    ('Lamine', 'Sangaré', '+22375000005', 'Technicien', 'agent'),
    ('Kadiatou', 'Konaté', '+22375000006', 'RH', 'hr'),
    ('Modibo', 'Cissé', '+22375000007', 'Chauffeur', 'agent'),
    ('Naminata', 'Maïga', '+22375000008', 'Admin', 'admin'),
    ('Oumar', 'Diallo', '+22375000009', 'Agent sécurité', 'agent'),
    ('Fatoumata', 'Traoré', '+22375000010', 'Technicien IT', 'agent'),
    ('Adwoa', 'Bonsu', '+22375000011', 'Superviseur', 'manager'),
    ('Sekou', 'Bah', '+22375000012', 'Logisticien', 'agent'),
]

MISSION_TEMPLATES = [
    ('Livraison documents administratifs', 'Récupérer et livrer des dossiers au centre-ville.', 'funded', 4500),
    ('Course express pharmacie', 'Achat et livraison de produits pharmaceutiques.', 'in_progress', 6000),
    ('Installation équipement bureau', 'Montage de postes de travail et câblage réseau.', 'completed', 12000),
    ('Nettoyage locaux commerciaux', 'Nettoyage complet après travaux.', 'pending', 8000),
    ('Transport colis fragile', 'Livraison sécurisée avec suivi GPS obligatoire.', 'accepted', 7500),
    ('Maintenance climatisation', 'Contrôle et entretien de climatiseurs.', 'submitted', 9500),
]

LOCATIONS = [
    ('Hippodrome, Bamako', 'Badalabougou, Bamako', 12.6392, -8.0029, 12.6500, -7.9900),
    ('ACI 2000, Bamako', 'Kalaban Coura, Bamako', 12.6350, -8.0300, 12.6280, -8.0150),
    ('Sikasso centre', 'Quartier Médine, Sikasso', 11.3170, -5.6680, 11.3250, -5.6550),
    ('Ségou marché', 'Pelengana, Ségou', 13.4310, -6.2150, 13.4400, -6.2000),
    ('Kayes gare', 'Liberté, Kayes', 14.4460, -11.4440, 14.4520, -11.4300),
]

EMPLOYEE_TARGETS = (5, 7, 10)
MIN_MISSIONS_PER_CLIENT = 3


def ensure_categories():
    specs = [
        ('Livraison', 'livraison'),
        ('Ménage', 'menage'),
        ('Réparation', 'reparation'),
        ('Transport', 'transport'),
    ]
    categories = []
    for name, slug in specs:
        cat, _ = Category.objects.get_or_create(name=name, defaults={'slug': slug, 'is_active': True})
        categories.append(cat)
    return categories


def enterprise_slug(ep: EnterpriseProfile) -> str:
    return ep.company_name[:6].lower().replace(' ', '').replace('â', 'a').replace('é', 'e')


def seed_employees_for_enterprise(ep: EnterpriseProfile) -> int:
    target = random.choice(EMPLOYEE_TARGETS)
    current = ep.employees.count()
    if current >= target:
        print(f"  [--] {ep.company_name}: {current} employe(s) (cible {target})")
        return current

    slug = enterprise_slug(ep)
    uid = str(ep.id).replace('-', '')[:8]
    to_create = target - current
    for i in range(to_create):
        emp = EMPLOYEE_POOL[(current + i) % len(EMPLOYEE_POOL)]
        idx = current + i + 1
        email = f"emp{idx}.{slug}.{uid}@blocktask.test"
        if Employee.objects.filter(email=email).exists():
            email = f"emp{idx}.{slug}.{uid}.{i}@blocktask.test"
        Employee.objects.create(
            enterprise=ep,
            first_name=emp[0],
            last_name=f"{emp[1]}-{slug[:4].upper()}",
            email=email,
            phone=f"+22375{uid[-6:]}{idx:02d}",
            position=emp[3],
            role=emp[4],
            is_active=True,
        )
    print(f"  [OK] {ep.company_name}: +{to_create} employe(s) -> total {target}")
    return target


def seed_missions_for_client(client: User, categories: list, providers: list) -> int:
    existing = Mission.objects.filter(client=client).count()
    needed = max(0, MIN_MISSIONS_PER_CLIENT - existing)
    if needed == 0:
        print(f"  [--] {client.email}: {existing} mission(s) deja")
        return 0

    provider_list = list(providers)
    for i in range(needed):
        title, description, status, budget = MISSION_TEMPLATES[(existing + i) % len(MISSION_TEMPLATES)]
        loc = LOCATIONS[(existing + i) % len(LOCATIONS)]
        category = categories[(existing + i) % len(categories)]

        provider = None
        started_at = None
        completed_at = None
        if status in ('accepted', 'in_progress', 'submitted', 'completed') and provider_list:
            provider = random.choice(provider_list)
        if status in ('in_progress', 'submitted', 'completed'):
            started_at = timezone.now() - timedelta(hours=random.randint(2, 48))
        if status == 'completed':
            completed_at = timezone.now() - timedelta(hours=random.randint(1, 24))

        Mission.objects.create(
            client=client,
            provider=provider,
            category=category,
            title=f"{title} #{existing + i + 1}",
            description=description,
            pickup_address=loc[0],
            delivery_address=loc[1],
            pickup_latitude=loc[2],
            pickup_longitude=loc[3],
            delivery_latitude=loc[4],
            delivery_longitude=loc[5],
            budget=Decimal(str(budget)),
            currency='XOF',
            deadline=timezone.now() + timedelta(days=random.randint(1, 7)),
            expected_duration=random.choice([60, 90, 120, 180]),
            status=status,
            priority=random.choice(['normal', 'high', 'urgent']),
            requires_gps_tracking=True,
            deposit_paid=status not in ('draft', 'pending'),
            started_at=started_at,
            completed_at=completed_at,
        )
    print(f"  [OK] {client.email}: +{needed} mission(s) -> total {existing + needed}")
    return needed


print("=== Création des clients ===")
for c in clients:
    if not User.objects.filter(email=c['email']).exists():
        u = User.objects.create_user(
            email=c['email'], username=c['username'],
            first_name=c['first_name'], last_name=c['last_name'],
            phone_number=c['phone'],
            city=c.get('city', 'Bamako'), country=c.get('country', 'Mali'),
            password='Test1234!', user_type='client',
            kyc_status='pending', email_verified=True
        )
        apply_seed_kyc(u)
        print(f"  [OK] Client cree: {u.first_name} {u.last_name} ({u.email})")
    else:
        print(f"  [--] Existe deja: {c['email']}")

print("\n=== Création des prestataires ===")
for p in providers:
    if not User.objects.filter(email=p['email']).exists():
        u = User.objects.create_user(
            email=p['email'], username=p['username'],
            first_name=p['first_name'], last_name=p['last_name'],
            phone_number=p['phone'],
            city=p.get('city', 'Bamako'), country=p.get('country', 'Mali'),
            password='Test1234!', user_type='provider',
            kyc_status='pending', email_verified=True
        )
        apply_seed_kyc(u)
        ProviderProfile.objects.get_or_create(
            user=u,
            defaults={
                'skills': p['skills'],
                'level': p['level'],
                'is_available': True,
                'working_days': [1, 2, 3, 4, 5],
                'reputation_score': 70.0,
                'total_missions_completed': 0
            }
        )
        print(f"  [OK] Prestataire cree: {u.first_name} {u.last_name} ({u.email}) - niveau {p['level']}")
    else:
        print(f"  [--] Existe deja: {p['email']}")

print("\n=== Création des entreprises ===")
for ent in enterprises_data:
    ud = ent['user']
    if not User.objects.filter(email=ud['email']).exists():
        u = User.objects.create_user(
            email=ud['email'], username=ud['username'],
            first_name=ud['first_name'], last_name=ud['last_name'],
            phone_number=ud['phone'],
            password='Test1234!', user_type='enterprise',
            kyc_status='pending', email_verified=True
        )
        apply_seed_kyc(u)
        pd = ent['profile']
        EnterpriseProfile.objects.get_or_create(
            user=u,
            defaults={
                'company_name': pd['company_name'],
                'city': pd['city'],
                'address': pd['address'],
                'company_email': pd['company_email'],
                'company_phone': pd['company_phone'],
                'is_verified': True,
            }
        )
        print(f"  [OK] Entreprise creee: {pd['company_name']}")
    else:
        print(f"  [--] Existe deja: {ud['email']}")

print("\n=== Employés par entreprise (5, 7 ou 10 aléatoires) ===")
for ep in EnterpriseProfile.objects.select_related('user').all():
    seed_employees_for_enterprise(ep)

categories = ensure_categories()
all_providers = list(User.objects.filter(user_type='provider'))

print("\n=== Missions clients particuliers (min. 3 chacun) ===")
for client in User.objects.filter(user_type='client'):
    seed_missions_for_client(client, categories, all_providers)

print("\n=== Missions entreprises (min. 3 chacune) ===")
for ent_user in User.objects.filter(user_type='enterprise'):
    seed_missions_for_client(ent_user, categories, all_providers)

print("\n=== Résumé final ===")
print(f"Clients      : {User.objects.filter(user_type='client').count()}")
print(f"Prestataires : {User.objects.filter(user_type='provider').count()}")
print(f"Entreprises  : {User.objects.filter(user_type='enterprise').count()}")
print(f"Employés     : {Employee.objects.count()}")
print(f"Missions     : {Mission.objects.count()}")
for ep in EnterpriseProfile.objects.all():
    nb_emp = ep.employees.count()
    nb_mis = Mission.objects.filter(client=ep.user).count()
    print(f"  - {ep.company_name}: {nb_emp} employe(s), {nb_mis} mission(s)")
print("Termine.")
