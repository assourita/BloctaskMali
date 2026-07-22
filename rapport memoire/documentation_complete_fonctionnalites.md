# Documentation Complète des Fonctionnalités BlockTask

## 1. Vue d'ensemble de l'architecture

BlockTask est une plateforme hybride de délégation de tâches physiques avec :
- **Backend** : Django REST Framework (12 apps modulaires)
- **Frontend Web** : Angular 17 avec Material Design
- **Mobile** : React Native / Expo SDK 52
- **Blockchain** : Smart contracts Solidity (Ethereum Sepolia/Hardhat)
- **Base de données** : PostgreSQL + Redis
- **Temps réel** : Django Channels (WebSocket)

---

## 2. Utilisateurs et Rôles

### 2.1 Types d'utilisateurs primaires
1. **Client** : Publie des missions, paie en FCFA, valide l'exécution
2. **Prestataire** : Postule, exécute les tâches, dépose une caution
3. **Entreprise** : Gère des employés-agents, missions B2B
4. **Administrateur** : KYC, litiges, supervision blockchain

### 2.2 Rôles secondaires et espaces
- **Rôle secondaire automatique** : Un prestataire a automatiquement le rôle client
- **Espace actif** : L'utilisateur peut basculer entre ses espaces (client/prestataire)
- **Permissions** : Guards Django et Angular pour contrôler l'accès

### 2.3 Profils spécialisés
- **ProviderProfile** : Compétences, niveau, réputation, caution, véhicule
- **EnterpriseProfile** : Infos légales, employés, caution collective
- **Employee** : Rattaché à une entreprise (admin, manager, agent)

---

## 3. Cycle de Vie d'une Mission

### 3.1 États d'une mission
```
draft → pending → funded → accepted → in_progress → submitted → completed
                              ↓
                         cancelled / disputed
```

### 3.2 Workflow détaillé

#### Étape 1 : Création (Client)
- Remplir formulaire (titre, description, budget, adresses)
- Choix catégorie et priorité
- Options : vérification prestataire, réputation minimale, GPS obligatoire

#### Étape 2 : Financement (Client)
- Paiement Mobile Money (Orange/Moov) en mode escrow
- 100% du budget bloqué
- Commission plateforme 5%

#### Étape 3 : Candidature (Prestataire)
- Postulation avec message et prix proposé
- Sollicitation directe possible
- Vérification automatique des prérequis

#### Étape 4 : Acceptation (Client)
- Sélection du prestataire
- Déclenchement délai caution (4h par défaut)

#### Étape 5 : Caution (Prestataire)
- Dépôt de garantie (2000-5000 XOF)
- Blocage du montant sur solde prestataire
- Ancrage optionnel on-chain

#### Étape 6 : Exécution (Prestataire)
- Démarrage mission
- Suivi GPS temps réel (WebSocket)
- Communication via chat intégré

#### Étape 7 : Preuves (Prestataire)
- Upload photos/vidéos
- Signature numérique
- QR code validation
- Checklist automatique

#### Étape 8 : Validation (Client)
- Vérification des preuves
- Validation ou ouverture litige
- Auto-validation possible (24h par défaut)

#### Étape 9 : Paiement (Système)
- Libération 95% prestataire
- 5% commission plateforme
- Mise à jour réputation

---

## 4. Fonctionnalités par Module

### 4.1 Users (Utilisateurs)
- **Authentification** : JWT + 2FA TOTP optionnel
- **Inscription** : 3 étapes avec choix profil
- **KYC** : NINA + pièces d'identité + validation admin
- **Profils** : Photo, bio, localisation, wallet blockchain
- **Rôles** : Gestion multi-rôles avec espace actif
- **Sécurité** : Historique connexions, suspension, verrouillage

### 4.2 Missions
- **CRUD complet** : Créer, lire, mettre à jour, supprimer
- **Recherche** : Filtres par catégorie, localisation, prix
- **Statuts** : 10 états avec transitions contrôlées
- **Options avancées** : Expiration, validation auto, GPS requis
- **Historique** : Traçabilité complète des changements
- **Signets** : Sauvegarder des missions intéressantes

### 4.3 Payments (Paiements)
- **Mobile Money** : Orange Money, Moov Money, Wave
- **Escrow** : Blocage fonds jusqu'à validation
- **Remboursements** : Gestion des retours automatiques
- **Méthodes** : Sauvegarde moyens de paiement
- **Frais** : Commission 5% automatique
- **Tracking** : Références externes et statuts

### 4.4 Chat (Communication)
- **Conversation** : Fil par mission (client ↔ prestataire)
- **Messages** : Texte, images, localisation
- **Notifications** : Temps réel via WebSocket
- **Typing** : Indicateur d'écriture
- **Lu/non lu** : Suivi de lecture

### 4.5 Proofs (Preuves)
- **Types** : Photo avant/pendant/après, vidéo, signature, QR
- **Upload** : Fichiers avec métadonnées EXIF
- **Analyse IA** : Détection flou, fraude, localisation
- **GPS** : Géolocalisation automatique
- **Checklist** : Validation items requis
- **Blockchain** : Hashage et ancrage optionnel

### 4.6 Tracking (Suivi)
- **GPS temps réel** : WebSocket Channels
- **Points de contrôle** : Pickup, delivery, checkpoints
- **Historique** : Trajectoire complète
- **Consentement** : Accord explicit prestataire
- **Précision** : Métadonnées de localisation

### 4.7 Escrow (Caution & Blockchain)
- **Caution prestataire** : Dépôt de garantie dynamique
- **Smart contracts** : Escrow, Réputation, Litigation
- **Ancrage on-chain** : Optionnel via MetaMask
- **Synchronisation** : Django ↔ Ethereum
- **Testnet** : Sepolia ou Hardhat local

### 4.8 Disputes (Litiges)
- **Ouverture** : Client ou prestataire
- **Preuves** : Upload documents supplémentaires
- **Arbitrage** : Résolution par administrateur
- **Décisions** : Remboursement, paiement, partage
- **Impact** : Mise à jour réputation

### 4.9 Reputation (Réputation)
- **Calcul** : 40% succès, 30% notes, 20% litiges, 10% volume
- **Niveaux** : Bronze, Silver, Gold, Platinum
- **Historique** : Évolution temporelle
- **Blockchain** : Synchronisation optionnelle
- **Seuils** : Accès missions selon niveau

### 4.10 Enterprises (B2B)
- **Profil entreprise** : RCCM, IFU, documents légaux
- **Employés** : Gestion hiérarchique (admin, manager, agent)
- **Missions** : Attribution aux agents
- **Caution** : Solde collectif géré par entreprise
- **Statistiques** : Suivi performances

### 4.11 Notifications
- **Types** : Email, SMS, Push (Firebase)
- **Événements** : Mission, paiement, message, litige
- **Préférences** : Choix canaux par utilisateur
- **Templates** : Personnalisables
- **Queue** : Celery pour asynchronisme

### 4.12 Analytics
- **Tableaux de bord** : Statistiques par rôle
- **Métriques** : Missions, revenus, satisfaction
- **Export** : CSV/PDF
- **Filtres** : Dates, catégories, utilisateurs
- **Graphiques** : Visualisations intégrées

---

## 5. Fonctionnalités Web (Angular)

### 5.1 Espace Client
- **Tableau de bord** : Missions actives, statistiques
- **Création mission** : Assistant 4 étapes
- **Suivi** : Carte GPS temps réel
- **Paiements** : Historique, méthodes
- **Évaluations** : Notes et commentaires

### 5.2 Espace Prestataire
- **Tableau de bord** : Revenus, niveau, missions
- **Recherche** : Missions disponibles
- **Candidatures** : Suivi postulations
- **Exécution** : Interface mission active
- **Réputation** : Score et historique

### 5.3 Espace Entreprise
- **Gestion employés** : Ajout, rôles, missions
- **Missions B2B** : Création et attribution
- **Statistiques** : Performance équipe
- **Caution** : Gestion solde collectif

### 5.4 Espace Administrateur
- **KYC** : Validation documents
- **Litiges** : Arbitrage et résolution
- **Utilisateurs** : Gestion comptes
- **Blockchain** : Supervision transactions
- **Configuration** : Paramètres plateforme

### 5.5 Fonctionnalités Transverses
- **Changement d'espace** : Switcher entre rôles
- **Notifications** : Centre de notifications
- **Profil** : Édition informations
- **Messagerie** : Chat intégré missions
- **Aide** : FAQ et support

---

## 6. Fonctionnalités Mobile (React Native/Expo)

### 6.1 Core Features
- **Authentification** : Login/inscription avec KYC
- **Dashboard** : Adapté selon rôle actif
- **Missions** : Liste, détails, création (client)
- **GPS** : Suivi en arrière-plan
- **Chat** : Messagerie temps réel
- **Preuves** : Appareil photo, upload

### 6.2 Features Spécifiques Mobile
- **Notifications Push** : Firebase
- **Géolocalisation** : Background tracking
- **Appareil photo** : Preuves avec EXIF
- **Offline mode** : Cache limité
- **Biometrie** : Login empreinte/Face ID
- **Partage** : Partager mission via contacts

### 6.3 Adaptation Mali
- **Langue** : Français prioritaire
- **Devise** : FCFA (XOF) par défaut
- **Pays** : +223 préconfiguré
- **Opérateurs** : Orange/Moov intégrés

---

## 7. Règles Métier et Validations

### 7.1 Règles Missions
- **Budget minimum** : 1000 XOF
- **Caution dynamique** : 10-20% du budget (2000-5000 XOF)
- **Délai caution** : 4h après acceptation
- **Expiration** : Auto-annulation si deadline dépassée
- **GPS obligatoire** : Sauf si désactivé explicitement

### 7.2 Règles Paiements
- **Commission** : 5% fixe plateforme
- **Escrow** : 100% bloqué jusqu'à validation
- **Remboursement** : Automatique si annulation
- **Mobile Money** : OTP validation (1234 en sandbox)

### 7.3 Règles KYC
- **Obligatoire** : Pour toute mission > 5000 XOF
- **Documents** : CNI avant/arrière + selfie
- **Validation** : Manuelle par admin
- **Vérification** : NINA unique par utilisateur

### 7.4 Règles Réputation
- **Calcul** : Pondération multi-critères
- **Seuils** : Missions premium selon niveau
- **Pénalités** : Litiges impactent score
- **Bonus** : Missions réussies augmentent

### 7.5 Règles Sécurité
- **2FA** : Optionnel TOTP
- **Sessions** : JWT avec expiration
- **Rate limiting** : API endpoints
- **Verification** : Email et téléphone
- **Suspension** : Comportement anormal

---

## 8. Intégrations Externes

### 8.1 Mobile Money
- **Orange Money** : API sandbox Mali
- **Moov Money** : API sandbox Mali
- **Wave** : Support futur Sénégal
- **Validation** : OTP test (1234)

### 8.2 Blockchain
- **Ethereum** : Testnet Sepolia
- **Smart Contracts** : Escrow, Réputation, Litigation
- **MetaMask** : Wallet browser extension
- **IPFS** : Stockage preuves (optionnel)

### 8.3 Notifications
- **Firebase** : Push notifications mobile
- **Email** : SendGrid (configurable)
- **SMS** : Intégration opérateurs (futur)
- **WebSocket** : Temps réel web

---

## 9. Sécurité

### 9.1 Authentification
- **JWT** : Tokens avec expiration
- **2FA** : TOTP via Google Authenticator
- **OAuth** : Google (optionnel)
- ** Guards** : Django et Angular

### 9.2 Données
- **HTTPS** : SSL/TLS obligatoire
- **CORS** : Origines autorisées
- **XSS** : Protection Angular
- **CSRF** : Django middleware

### 9.3 Paiements
- **Escrow** : Fonds bloqués
- **KYC** : Vérification identité
- **Audit** : Traçabilité complète
- **Encryption** : Données sensibles

### 9.4 Smart Contracts
- **OpenZeppelin** : Standards sécurité
- **ReentrancyGuard** : Protection attaques
- **Pausable** : Pause d'urgence
- **Ownable** : Contrôle administrateur

---

## 10. Déploiement et Infrastructure

### 10.1 Environnements
- **Développement** : Docker Compose local
- **Staging** : Render preview
- **Production** : Render (backend + frontend)
- **Mobile** : APK Expo (distribution)

### 10.2 Bases de données
- **PostgreSQL** : Données principales
- **Redis** : Cache + WebSocket + Celery
- **SQLite** : Tests (in-memory)

### 10.3 Services
- **Backend** : Django + Gunicorn
- **Frontend** : Angular + Nginx
- **WebSocket** : Django Channels
- **Worker** : Celery + Redis
- **Blockchain** : Sepolia/Hardhat

---

## 11. Tests et Qualité

### 11.1 Tests Backend
- **pytest** : 11 tests automatisés
- **Coverage** : Models, services, API
- **Fixtures** : Données test Mali
- **CI** : GitHub Actions

### 11.2 Tests Smart Contracts
- **Hardhat** : 15 tests automatisés
- **Chai** : Assertions contrats
- **Coverage** : Tous scénarios escrow

### 11.3 Tests Manuels
- **Scénarios** : 7 parcours utilisateur
- **Checklist** : Sécurité, fonctionnalités
- **UAT** : Validation métier

---

## 12. Monitoring et Maintenance

### 12.1 Logs
- **Django** : Logging structuré
- **Celery** : Tâches asynchrones
- **Channels** : WebSocket
- **Nginx** : Accès web

### 12.2 Métriques
- **Performance** : Temps réponse API
- **Utilisation** : Active users, missions
- **Erreurs** : Rate limits, exceptions
- **Business** : Conversion, rétention

### 12.3 Alertes
- **Sentry** : Erreurs applicatives
- **Uptime** : Disponibilité services
- **Health checks** : État composants

---

## 13. Évolutions Prévues

### 13.1 Court terme (3-6 mois)
- **Production Mobile Money** : API réelles opérateurs
- **Audit sécurité** : Smart contracts externes
- **Tests E2E** : Cypress/Playwright
- **APK mobile** : Distribution Google Play

### 13.2 Moyen terme (6-18 mois)
- **UEMOA** : Sénégal, Côte d'Ivoire, Burkina
- **Oracles** : Chainlink preuves on-chain
- **Stablecoins** : Pont FCFA ↔ USDC
- **Étude terrain** : Bamako, 50 utilisateurs

### 13.3 Long terme (18+ mois)
- **Mainnet** : Ethereum production
- **DAO** : Gouvernance décentralisée
- **IA** : Détection fraude, pricing auto
- **Partenariats** : Télécoms, microfinance

---

## Conclusion

BlockTask implémente une solution complète de délégation de tâches physiques adaptée au contexte malien et ouest-africain. L'architecture hybride allie l'inclusion financière (Mobile Money) à la confiance distribuée (blockchain) sans imposer la cryptomonnaie comme unique moyen de paiement.

Le système couvre l'intégralité du cycle de vie des missions avec des fonctionnalités avancées : KYC NINA, suivi GPS temps réel, chat intégré, analyse IA des preuves, gestion des litiges et système de réputation.

La plateforme est déployée et fonctionnelle, avec une application mobile en finalisation et des perspectives d'évolution vers l'ensemble de l'espace UEMOA.
