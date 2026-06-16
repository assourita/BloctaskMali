import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import User, ProviderProfile, EnterpriseProfile, Employee

clients = [
    {'email': 'konan.aya@gmail.com',          'username': 'konanaya',          'first_name': 'Aya',        'last_name': 'Konan',    'phone': '+22507010203'},
    {'email': 'bamba.seydou@gmail.com',        'username': 'bambaseydou',       'first_name': 'Seydou',     'last_name': 'Bamba',    'phone': '+22507040506'},
    {'email': 'diallo.fatoumata@gmail.com',    'username': 'diallofatoumata',   'first_name': 'Fatoumata',  'last_name': 'Diallo',   'phone': '+22507070809'},
]

providers = [
    {'email': 'kone.mamadou@gmail.com',        'username': 'konemamadou',       'first_name': 'Mamadou',   'last_name': 'Kone',      'phone': '+22507111213', 'skills': ['livraison', 'coursier'],      'level': 'gold'},
    {'email': 'toure.aminata@gmail.com',       'username': 'toureaminata',      'first_name': 'Aminata',   'last_name': 'Toure',     'phone': '+22507141516', 'skills': ['menage', 'nettoyage'],        'level': 'silver'},
    {'email': 'coulibaly.ibrahim@gmail.com',   'username': 'coulibalyibrahim',  'first_name': 'Ibrahim',   'last_name': 'Coulibaly', 'phone': '+22507171819', 'skills': ['plomberie', 'electricite'],   'level': 'bronze'},
    {'email': 'ouattara.mariam@gmail.com',     'username': 'ouattaramariam',    'first_name': 'Mariam',    'last_name': 'Ouattara',  'phone': '+22507202122', 'skills': ['cuisine', 'traiteur'],        'level': 'silver'},
    {'email': 'diomande.lamine@gmail.com',     'username': 'diomandelamine',    'first_name': 'Lamine',    'last_name': 'Diomande',  'phone': '+22507232425', 'skills': ['jardinage', 'entretien'],     'level': 'bronze'},
    {'email': 'traore.kadiatou@gmail.com',     'username': 'traorekadiatou',    'first_name': 'Kadiatou',  'last_name': 'Traore',    'phone': '+22507262728', 'skills': ['baby-sitting', 'garde'],      'level': 'gold'},
    {'email': 'yao.kouassi@gmail.com',         'username': 'yaokouassi',        'first_name': 'Kouassi',   'last_name': 'Yao',       'phone': '+22507293031', 'skills': ['mecanique', 'auto'],          'level': 'platinum'},
    {'email': 'soro.naminata@gmail.com',       'username': 'soronaminata',      'first_name': 'Naminata',  'last_name': 'Soro',      'phone': '+22507323334', 'skills': ['coiffure', 'beaute'],         'level': 'silver'},
]

print("=== Création des clients ===")
for c in clients:
    if not User.objects.filter(email=c['email']).exists():
        u = User.objects.create_user(
            email=c['email'], username=c['username'],
            first_name=c['first_name'], last_name=c['last_name'],
            phone_number=c['phone'],
            password='Test1234!', user_type='client',
            kyc_status='not_required', email_verified=True
        )
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
            password='Test1234!', user_type='provider',
            kyc_status='verified', email_verified=True
        )
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

enterprises_data = [
    {
        'user': {'email': 'abidjan.logistics@enterprise.com', 'username': 'abidjanlogistics', 'first_name': 'Abidjan', 'last_name': 'Logistics', 'phone': '+22520010101'},
        'profile': {'company_name': 'Abidjan Logistics SARL', 'city': 'Abidjan', 'address': 'Zone 4, Rue des Jardins', 'company_email': 'contact@abidjanlogistics.ci', 'company_phone': '+22520010101'},
        'nb_employees': 4,
    },
    {
        'user': {'email': 'techcote.ivoire@enterprise.com', 'username': 'techcoteivoire', 'first_name': 'TechCote', 'last_name': 'Ivoire', 'phone': '+22520020202'},
        'profile': {'company_name': 'TechCote Ivoire SAS', 'city': 'Abidjan', 'address': 'Plateau, Avenue Houphouet', 'company_email': 'info@techcote.ci', 'company_phone': '+22520020202'},
        'nb_employees': 7,
    },
    {
        'user': {'email': 'batiment.pro@enterprise.com', 'username': 'batimentpro', 'first_name': 'Batiment', 'last_name': 'Pro', 'phone': '+22520030303'},
        'profile': {'company_name': 'Batiment Pro CI', 'city': 'Yamoussoukro', 'address': 'Centre-ville, BP 445', 'company_email': 'contact@batimentpro.ci', 'company_phone': '+22520030303'},
        'nb_employees': 8,
    },
    {
        'user': {'email': 'greenservices.ci@enterprise.com', 'username': 'greenservicesci', 'first_name': 'Green', 'last_name': 'Services', 'phone': '+22520040404'},
        'profile': {'company_name': 'Green Services CI', 'city': 'Bouake', 'address': 'Quartier Commerce, Rue 12', 'company_email': 'hello@greenservices.ci', 'company_phone': '+22520040404'},
        'nb_employees': 11,
    },
]

EMPLOYEE_POOL = [
    ('Kofi', 'Asante', '+22507500001', 'Livreur', 'agent'),
    ('Ama', 'Mensah', '+22507500002', 'Comptable', 'accountant'),
    ('Kwame', 'Boateng', '+22507500003', 'Manager Ops', 'manager'),
    ('Akua', 'Owusu', '+22507500004', 'Agent terrain', 'agent'),
    ('Yaw', 'Darko', '+22507500005', 'Technicien', 'agent'),
    ('Abena', 'Frimpong', '+22507500006', 'RH', 'hr'),
    ('Kofi', 'Acheampong', '+22507500007', 'Chauffeur', 'agent'),
    ('Esi', 'Antwi', '+22507500008', 'Admin', 'admin'),
    ('Nana', 'Adjei', '+22507500009', 'Agent securite', 'agent'),
    ('Kojo', 'Asiedu', '+22507500010', 'Technicien IT', 'agent'),
    ('Adwoa', 'Bonsu', '+22507500011', 'Superviseur', 'manager'),
]

for ent in enterprises_data:
    ud = ent['user']
    if not User.objects.filter(email=ud['email']).exists():
        u = User.objects.create_user(
            email=ud['email'], username=ud['username'],
            first_name=ud['first_name'], last_name=ud['last_name'],
            phone_number=ud['phone'],
            password='Test1234!', user_type='enterprise',
            kyc_status='verified', email_verified=True
        )
        pd = ent['profile']
        ep, _ = EnterpriseProfile.objects.get_or_create(
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

        for i in range(ent['nb_employees']):
            emp = EMPLOYEE_POOL[i % len(EMPLOYEE_POOL)]
            suffix = str(i + 1).zfill(2)
            Employee.objects.create(
                enterprise=ep,
                first_name=emp[0],
                last_name=f"{emp[1]}-{ep.company_name[:4].replace(' ','')}",
                email=f"emp{suffix}.{ep.company_name[:4].lower().replace(' ','')}@blocktask.ci",
                phone=emp[2][:-2] + suffix,
                position=emp[3],
                role=emp[4],
                is_active=True,
            )
        print(f"     -> {ent['nb_employees']} employés créés")
    else:
        print(f"  [--] Existe deja: {ud['email']}")

print("\n=== Résumé final ===")
print(f"Clients      : {User.objects.filter(user_type='client').count()}")
print(f"Prestataires : {User.objects.filter(user_type='provider').count()}")
print(f"Entreprises  : {User.objects.filter(user_type='enterprise').count()}")
print(f"Employees    : {Employee.objects.count()}")
print("Termine.")
