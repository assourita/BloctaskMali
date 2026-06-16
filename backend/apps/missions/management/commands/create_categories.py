from django.core.management.base import BaseCommand
from apps.missions.models import Category

class Command(BaseCommand):
    help = 'Crée les catégories de missions par défaut'

    def handle(self, *args, **options):
        categories_data = [
            {"name": "Livraison de colis", "slug": "livraison-colis", "description": "Transport et livraison de colis, paquets, courriers", "icon": "local_shipping", "order": 1},
            {"name": "Courses & Achats", "slug": "courses-achats", "description": "Courses au marché, supermarché, achats divers", "icon": "shopping_cart", "order": 2},
            {"name": "Transport personne", "slug": "transport-personne", "description": "Déplacement avec chauffeur, taxi, moto-taxi", "icon": "person_pin_circle", "order": 3},
            {"name": "Livraison alimentaire", "slug": "livraison-alimentaire", "description": "Repas, plats préparés, courses alimentaires", "icon": "restaurant", "order": 4},
            {"name": "Déménagement", "slug": "demenagement", "description": "Transport de meubles, déménagement complet", "icon": "move_to_inbox", "order": 5},
            {"name": "Services administratifs", "slug": "services-administratifs", "description": "Démarches administratives, documents, timbres", "icon": "description", "order": 6},
            {"name": "Maintenance & Réparation", "slug": "maintenance-reparation", "description": "Petite réparation, bricolage, maintenance", "icon": "build", "order": 7},
            {"name": "Livraison urgente", "slug": "livraison-urgente", "description": "Livraison express, moins de 2h", "icon": "flash_on", "order": 8},
            {"name": "Nettoyage & Ménage", "slug": "nettoyage-menage", "description": "Ménage, nettoyage, lavage", "icon": "cleaning_services", "order": 9},
            {"name": "Aide à domicile", "slug": "aide-domicile", "description": "Assistance personnes âgées, accompagnement", "icon": "elderly", "order": 10},
            {"name": "Gardiennage", "slug": "gardiennage", "description": "Surveillance maison, garde d'animaux", "icon": "home", "order": 11},
            {"name": "Livraison médicale", "slug": "livraison-medicale", "description": "Médicaments, analyses, matériel médical", "icon": "local_hospital", "order": 12},
            {"name": "Covoiturage", "slug": "covoiturage", "description": "Partage de trajet, trajets réguliers", "icon": "emoji_people", "order": 13},
            {"name": "Bricolage", "slug": "bricolage", "description": "Petits travaux, montage meubles, réparations", "icon": "handyman", "order": 14},
            {"name": "Jardinage", "slug": "jardinage", "description": "Tonte, arrosage, entretien jardin", "icon": "yard", "order": 15},
            {"name": "Garde d'enfants", "slug": "garde-enfants", "description": "Babysitting, accompagnement école", "icon": "child_care", "order": 16},
            {"name": "Cours particuliers", "slug": "cours-particuliers", "description": "Soutien scolaire, langues, musique", "icon": "school", "order": 17},
            {"name": "Technologie", "slug": "technologie", "description": "Dépannage informatique, installation appareils", "icon": "computer", "order": 18},
            {"name": "Couture", "slug": "couture", "description": "Retouches, confection vêtements", "icon": "checkroom", "order": 19},
            {"name": "Coiffure", "slug": "coiffure", "description": "Coiffure à domicile, tresses, soins", "icon": "content_cut", "order": 20},
            {"name": "Esthétique", "slug": "esthetique", "description": "Manucure, pédicure, soins beauté", "icon": "spa", "order": 21},
            {"name": "Massage", "slug": "massage", "description": "Massage relaxant, thérapeutique", "icon": "self_improvement", "order": 22},
            {"name": "Photographie", "slug": "photographie", "description": "Photos événements, portraits, produits", "icon": "photo_camera", "order": 23},
            {"name": "Cuisine", "slug": "cuisine", "description": "Traiteur, préparation repas, événements", "icon": "outdoor_grill", "order": 24},
            {"name": "Sécurité", "slug": "securite", "description": "Agent de sécurité, protection rapprochée", "icon": "security", "order": 25},
            {"name": "Traduction", "slug": "traduction", "description": "Traduction documents, interprétation", "icon": "translate", "order": 26},
            {"name": "Rédaction", "slug": "redaction", "description": "Rédaction CV, lettres, contenu web", "icon": "edit", "order": 27},
            {"name": "Comptabilité", "slug": "comptabilite", "description": "Tenue de livres, déclarations fiscales", "icon": "account_balance", "order": 28},
            {"name": "Conseil juridique", "slug": "conseil-juridique", "description": "Consultation légale, rédaction contrats", "icon": "gavel", "order": 29},
            {"name": "Divertissement", "slug": "divertissement", "description": "Animation, DJ, musiciens, magiciens", "icon": "music_note", "order": 30},
            {"name": "Décor événementiel", "slug": "decor-evenementiel", "description": "Décoration mariage, anniversaire, soirées", "icon": "celebration", "order": 31},
            {"name": "Plomberie", "slug": "plomberie", "description": "Réparation fuite, installation sanitaire", "icon": "water_drop", "order": 32},
            {"name": "Électricité", "slug": "electricite", "description": "Installation électrique, dépannage", "icon": "electric_bolt", "order": 33},
            {"name": "Climatisation", "slug": "climatisation", "description": "Installation, entretien climatiseurs", "icon": "ac_unit", "order": 34},
            {"name": "Menuiserie", "slug": "menuiserie", "description": "Fabrication meubles, réparation bois", "icon": "carpenter", "order": 35},
            {"name": "Métallerie", "slug": "metallerie", "description": "Soudure, ferronnerie, métal", "icon": "precision_manufacturing", "order": 36},
            {"name": "Peinture", "slug": "peinture", "description": "Peinture intérieure, extérieure", "icon": "format_paint", "order": 37},
            {"name": "Maçonnerie", "slug": "maconnerie", "description": "Petits travaux maçonnerie, réparation", "icon": "foundation", "order": 38},
            {"name": "Carrelage", "slug": "carrelage", "description": "Pose carrelage, réparation sols", "icon": "grid_view", "order": 39},
            {"name": "Transport lourd", "slug": "transport-lourd", "description": "Camions, déménagement professionnel", "icon": "local_shipping", "order": 40},
            {"name": "Import/Export", "slug": "import-export", "description": "Douane, fret international, logistique", "icon": "flight", "order": 41},
            {"name": "Immobilier", "slug": "immobilier", "description": "Visites appartements, état des lieux", "icon": "apartment", "order": 42},
            {"name": "Livraison e-commerce", "slug": "livraison-ecommerce", "description": "Livraison colis e-commerce, dropshipping", "icon": "shopping_bag", "order": 43},
            {"name": "Autre", "slug": "autre", "description": "Autres services non listés", "icon": "more_horiz", "order": 100},
        ]

        count = 0
        for cat_data in categories_data:
            obj, created = Category.objects.get_or_create(
                slug=cat_data['slug'],
                defaults=cat_data
            )
            if created:
                count += 1
                self.stdout.write(self.style.SUCCESS(f'[OK] Cree: {cat_data["name"]}'))
            else:
                self.stdout.write(f'[EXIST] Deja existe: {cat_data["name"]}')

        total = Category.objects.count()
        self.stdout.write(self.style.SUCCESS(f'\n{count} catégories créées, {total} total'))
