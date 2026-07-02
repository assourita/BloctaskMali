# BlockTask - Plateforme Décentralisée de Délégation de Tâches

BlockTask est une plateforme complète permettant la délégation sécurisée de tâches physiques entre particuliers et entreprises, utilisant la blockchain Ethereum pour garantir la confiance via des smart contracts escrow.

**Marché cible** : **Mali** (phase 1) — FCFA, NINA, Orange Money / Moov Money, Bamako. Extension UEMOA prévue ultérieurement.

## Architecture

```
blocktask_myself/
├── backend/                 # Django REST API
│   ├── apps/
│   │   ├── users/          # Authentification, profils, KYC
│   │   ├── missions/       # Gestion des missions
│   │   ├── escrow/         # Blockchain, paiements, cautions
│   │   ├── reputation/     # Système de score algorithmique
│   │   ├── disputes/       # Gestion des litiges
│   │   ├── tracking/       # GPS temps réel
│   │   ├── proofs/         # Preuves d'exécution
│   │   ├── enterprises/    # Gestion entreprises B2B
│   │   ├── notifications/  # Push, SMS, Email
│   │   ├── analytics/      # Statistiques et rapports
│   │   └── common/         # Utilitaires partagés
│   ├── config/             # Configuration Django
│   ├── manage.py
│   └── requirements.txt
│
├── frontend/               # Angular 17 (web)
│   └── ...
│
├── mobile/                 # React Native / Expo (clients & prestataires)
│   ├── app/                # Écrans Expo Router
│   └── src/                # API, contexte auth, composants
│
└── smart-contracts/        # Contrats Solidity
    ├── EscrowContract.sol
    ├── ReputationContract.sol
    ├── LitigationContract.sol
    └── README.md
```

##  Démarrage Rapide

### Prérequis
- Python 3.11+
- Node.js 18+
- PostgreSQL (optionnel, SQLite par défaut)
- Redis (pour WebSockets et Celery)
- MetaMask ou wallet Web3

### Backend Django

```bash
cd backend

# Créer l'environnement virtuel
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

# Installer les dépendances
pip install -r requirements.txt

# Créer la base de données
python manage.py migrate

# Créer un super utilisateur
python manage.py createsuperuser

# Lancer le serveur
python manage.py runserver
```

### Frontend Angular

```bash
cd frontend

# Installer les dépendances
npm install

# Lancer le serveur de développement
ng serve

# Build production
ng build --configuration production
```

##  Fonctionnalités Implémentées

### Backend (Django)

 **Users App**
- Modèle User personnalisé avec JWT
- Profils Prestataire, Entreprise, Employé
- KYC avec vérification d'identité (NINA / ID nationale — Mali, Niger, Guinée…)
- Wallet blockchain connexion
- Historique de connexion et sécurité

 **Missions App**
- Création et gestion de missions
- Système de candidatures
- Workflow complet (création → validation)
- Géolocalisation (PostGIS)
- Catégories et filtres

**Reputation App**
- Algorithme de score (0-100)
- Historique des changements
- Niveaux (Bronze → Platine)
- Pénalités et bonus

 **Disputes App**
- Ouverture de litiges
- Soumission de preuves
- Système d'arbitrage
- Appels de décisions

 **Proofs App**
- Photos, vidéos, signatures
- Validation QR Code
- Analyse automatique (OCR, fraude)
- Checklist des preuves

 **Enterprises App**
- Gestion des employés
- Affectation des missions
- Contrats et facturation
- Analytics B2B

### Frontend (Angular)

 **Structure**
- Angular 17 avec Material Design
- Guards d'authentification
- Interceptors HTTP
- Routing lazy-loaded

 **Services**
- AuthService (JWT, login, register)
- Web3Service (MetaMask, contrats)
- API Services (REST)

 **Composants**
- Header avec wallet connect
- Routing par rôle (client/provider/enterprise/admin)

##  Intégration Blockchain

### Smart Contracts
Les contrats Solidity existants dans `smart-contracts/` :
- **EscrowContract** : Gestion des fonds en escrow
- **ReputationContract** : Scores et réputation
- **LitigationContract** : Arbitrage des litiges

### Web3 Integration
```typescript
// Exemple d'utilisation
const web3Service = inject(Web3Service);

// Connecter wallet
await web3Service.connectWallet();

// Créer mission on-chain
const result = await web3Service.createMissionOnChain(
  missionHash,
  deadline,
  amount
);
```

##  Espaces Utilisateurs

###  Client
- Dashboard avec statistiques
- Création de missions (avec options avancées)
- Suivi GPS temps réel
- Gestion des paiements
- Système de litiges
- Évaluations

###  Prestataire
- Dashboard avec solde et missions
- Recherche de missions (carte style Uber)
- Gestion de la caution
- Soumission de preuves
- Suivi des revenus
- Réputation et niveaux

###  Entreprise (B2B)
- Dashboard opérationnel
- Gestion des employés
- Affectation manuelle/automatique
- Carte GPS de tous les agents
- Analytics et rapports
- Facturation centralisée

###  Admin
- Dashboard global
- Validation KYC
- Gestion des litiges
- Supervision blockchain
- Analytics avancés
- Configuration système

##  Sécurité

- **JWT** avec refresh tokens
- **2FA** supporté
- **ReentrancyGuard** sur les smart contracts
- **Pattern Checks-Effects-Interactions**
- **Audit** des actions admin
- **Hash bcrypt** pour les mots de passe

##  Technologies Utilisées

### Backend
- Django 4.2 + DRF
- SimpleJWT pour l'auth
- Web3.py pour blockchain
- Celery + Redis pour tâches async
- PostgreSQL + PostGIS
- Firebase pour notifications push

### Frontend
- Angular 17
- Angular Material
- Ethers.js / Web3.js
- RxJS pour la réactivité
- Leaflet pour les cartes
- Chart.js pour les graphiques

### Blockchain
- Solidity ^0.8.20
- OpenZeppelin Contracts
- Sepolia Testnet (dev)
- Ethereum Mainnet (prod)

##  Prochaines Étapes

### Backend
- [ ] Finaliser les views des missions
- [ ] Implémenter les tâches Celery
- [ ] Ajouter les tests unitaires
- [ ] Configurer les notifications push
- [ ] Intégration complète Web3

### Frontend
- [ ] Créer les composants de login/register
- [ ] Implémenter le dashboard client
- [ ] Créer le formulaire de mission
- [ ] Intégrer la carte GPS
- [ ] Ajouter les composants de preuves
- [ ] Tests E2E avec Cypress

### Smart Contracts
- [ ] Finaliser `executeDecision()` dans LitigationContract
- [ ] Ajouter la connexion entre contrats
- [ ] Déployer sur Sepolia
- [ ] Auditer les contrats



##  Licence

MIT License - Voir le fichier LICENSE pour plus de détails.

---

**Note importante** : Ce projet est fourni à des fins éducatives et de prototype. Pour une utilisation en production, un audit de sécurité complet est requis.
