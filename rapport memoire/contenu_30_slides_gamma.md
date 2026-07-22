# Contenu de 30 slides pour Gamma — Soutenance BlockTask

Génère une présentation académique de 30 slides, avec un design moderne, aéré et peu de texte par slide. Utilise le contenu ci-dessous slide par slide. Chaque slide doit contenir un titre, une liste courte ou un tableau, et une indication visuelle.

---

## Slide 1 — Garde

**Titre :** BlockTask
**Sous-titre :** Plateforme hybride de délégation sécurisée de tâches physiques — cas du Mali
**Infos :** Soutenance de mémoire de fin d'études — Master ILSI | Encadrant : Dr Oumar MAIGA
**Visuel :** logo BlockTask

---

## Slide 2 — Plan

**Titre :** Plan de la présentation

1. Introduction
2. Contexte et problématique
3. Objectifs et hypothèses
4. État de l'art
5. Conception (C4 + UML)
6. Implémentation
7. Tests et validation
8. Résultats et perspectives

**Visuel :** numéros en timeline ou cartes de sections

---

## Slide 3 — Introduction

**Titre :** L'économie à la tâche au Mali

**Contenu :**
- Tâches physiques informelles : courses, livraisons, petits services
- Manque de confiance entre client et prestataire
- Pas d'escrow accessible aux habitudes locales
- Mobile Money (Orange Money, Moov Money) très répandu

**Visuel :** infographie des 3 piliers : confiance, paiement, traçabilité

---

## Slide 4 — Contexte technologique

**Titre :** Pourquoi une approche hybride ?

**Contenu :**
- Le FCFA et le Mobile Money sont les rails réels des paiements au Mali
- Le NINA permet une identification locale
- La blockchain peut ancrer les engagements critiques
- Ni centralisé importé, ni crypto exclusif

**Visuel :** schéma des 4 piliers : FCFA, NINA, Mobile Money, blockchain optionnelle

---

## Slide 5 — Problématique

**Titre :** Problématique

**Question :**
Comment concevoir une plateforme de délégation de tâches adaptée au contexte malien (FCFA, Mobile Money, NINA), utilisant la blockchain pour renforcer la confiance, sans imposer la cryptomonnaie aux utilisateurs ?

**Visuel :** question centrale encadrée avec les 4 piliers

---

## Slide 6 — Sous-questions

**Titre :** Sous-questions de recherche

- Q1 : quels concepts et travaux existants sont pertinents ?
- Q2 : quelle architecture couple backend, Mobile Money et blockchain ?
- Q3 : quels mécanismes de sécurité, KYC et preuve d'exécution ?
- Q4 : dans quelle mesure le prototype atteint-il les objectifs ?

---

## Slide 7 — Objectifs

**Titre :** Objectifs spécifiques

**Contenu :**
- Analyser et spécifier le domaine
- Concevoir une architecture modulaire (C4 / UML)
- Implémenter les espaces client, prestataire, entreprise, admin
- Intégrer Mobile Money et blockchain
- Sécuriser par JWT et KYC NINA
- Tester et valider le système

**Visuel :** chemin de 6 étapes

---

## Slide 8 — Hypothèses

**Titre :** Hypothèses de travail

| Hypothèse | Contenu |
|---|---|
| H1 | Modèle hybride Mobile Money + blockchain plus adapté au Mali qu'une solution purement crypto ou centralisée |
| H2 | Smart contracts améliorent la traçabilité et la confiance |
| H3 | Architecture monolithique modulaire viable dans le délai d'un mémoire |

---

## Slide 9 — État de l'art — Plateformes centralisées

**Titre :** Plateformes centralisées de référence

**Contenu :**
- Upwork : freelancing numérique, escrow interne
- Fiverr : gigs pré-packagés, réputation simplifiée
- TaskRabbit : services physiques locaux, géolocalisation

**Limite commune :** inadaptation au Mali (carte bancaire, juridique, FCFA)

**Visuel :** logos des 3 plateformes

---

## Slide 10 — Limites des centralisées

**Titre :** Limites des plateformes centralisées

**Tableau :**

| Limite | Impact |
|---|---|
| Opacité algorithmique | Confiance aveugle en la plateforme |
| Pas d'immuabilité | Historique modifiable |
| Commissions élevées | Réduction du revenu prestataire |
| Paiement international | Exclusion des utilisateurs non bancarisés |

---

## Slide 11 — Plateformes décentralisées

**Titre :** Plateformes décentralisées

**Contenu :**
- Ethlance : paiement en crypto obligatoire
- Braintrust : gouvernance tokenisée
- Forces : transparence, immuabilité, réduction d'intermédiaire
- Faiblesses : complexité, crypto obligatoire, inadaptation au Mali

**Visuel :** comparaison centralisé vs décentralisé

---

## Slide 12 — Positionnement BlockTask

**Titre :** Positionnement de BlockTask

**Tableau :**

| Critère | Centralisées | Décentralisées | BlockTask |
|---|---|---|---|
| FCFA / Mobile Money | Non | Non | Oui |
| Tâches physiques locales | Partiel | Non | Oui |
| Sans crypto obligatoire | Oui | Non | Oui |
| Immuabilité | Non | Oui | Optionnelle |
| KYC local (NINA) | Non | Non | Oui |

---

## Slide 13 — Modèle hybride

**Titre :** Modèle hybride retenu

**Contenu :**
- Off-chain : métier, paiements Mobile Money, preuves, GPS
- On-chain : ancrage optionnel des engagements critiques
- Utilisateur final : aucune obligation de portefeuille crypto

**Visuel :** pyramide ou schéma off-chain / on-chain

---

## Slide 14 — Architecture globale

**Titre :** Architecture technique

**Contenu :**
- Web : Angular 17 + Material
- Mobile : React Native + Expo SDK 52
- Backend : Django 4.2 + DRF
- Données : PostgreSQL
- Temps réel : Redis + Channels + Celery
- Blockchain : Solidity + Hardhat / Sepolia
- Déploiement : Render + Railway

**Visuel :** Figure 3.3 — Diagramme de conteneurs C4

---

## Slide 15 — C4 — Diagramme de contexte

**Titre :** C4 — Niveau 1 : Contexte

**Contenu :**
- Acteurs : Client, Prestataire, Entreprise, Admin
- Système : BlockTask
- Systèmes externes : Orange Money, Moov Money, MetaMask, NINA

**Visuel :** Figure 3.2 — Diagramme de contexte C4

---

## Slide 16 — C4 — Diagramme de conteneurs

**Titre :** C4 — Niveau 2 : Conteneurs

**Contenu :**
- SPA Angular
- API Django REST
- PostgreSQL
- Redis
- Worker Celery
- Smart contracts Ethereum

**Visuel :** Figure 3.3 — Diagramme de conteneurs C4

---

## Slide 17 — C4 — Diagramme de composants

**Titre :** C4 — Niveau 3 : Composants backend

**Contenu :**
- users, missions, payments, escrow
- proofs, tracking, disputes, reputation
- enterprises, notifications, analytics, common

**Visuel :** Figure 3.4 — Diagramme de composants backend

---

## Slide 18 — UML — Cas d'utilisation

**Titre :** UML — Cas d'utilisation

**Contenu :**
- Client : créer mission, payer, valider, ouvrir litige
- Prestataire : postuler, exécuter, soumettre preuves
- Entreprise : gérer employés, missions B2B
- Admin : valider KYC, arbitrer litiges, superviser

**Visuel :** Figure 3.5 — Diagramme de cas d'utilisation

---

## Slide 19 — UML — Diagramme de classes

**Titre :** UML — Diagramme de classes

**Contenu :**
- Entités principales : User, Mission, Payment, Proof, Dispute, Reputation
- Relations : OneToOne, ForeignKey, ManyToMany

**Visuel :** Figure 3.6 — Diagramme de classes

---

## Slide 20 — UML — Diagramme de séquence

**Titre :** UML — Séquence : création et paiement

**Contenu :**
- Client → API : création mission
- Client → Mobile Money : paiement
- API → Escrow : blocage fonds
- Mission : pending → funded

**Visuel :** Figure 3.7 — Diagramme de séquence création/paiement

---

## Slide 21 — UML — Diagramme d'états

**Titre :** UML — Cycle de vie d'une mission

**Contenu :**
- pending → funded → accepted → deposit_paid
- in_progress → submitted → completed
- cancelled / disputed à chaque étape

**Visuel :** Figure 3.1 — Diagramme d'états

---

## Slide 22 — UML — Diagramme d'activité

**Titre :** UML — Activité : processus global

**Contenu :**
- Création → Paiement → Candidature → Acceptation → Caution
- Exécution → Preuves → Validation → Paiement
- Branche litige

**Visuel :** Figure 3.9 — Diagramme d'activité

---

## Slide 23 — UML — Diagramme de déploiement

**Titre :** UML — Déploiement

**Contenu :**
- Docker Compose en local
- Render en production
- Redis, PostgreSQL, backend, frontend, Celery
- Mobile : APK Android

**Visuel :** Figure 3.10 — Diagramme de déploiement

---

## Slide 24 — Fonctionnalités clés

**Titre :** Fonctionnalités clés implémentées

**Contenu :**
- Auth JWT avec rôles doubles
- KYC NINA + validation admin
- Paiement Mobile Money sandbox
- Caution dynamique selon réputation
- Chat mission + 2FA TOTP
- GPS temps réel + preuves photo

**Visuel :** captures d'écrans web/mobile

---

## Slide 25 — Workflow mission

**Titre :** Workflow mission

**Tableau :**

| Étape | Action | Statut |
|---|---|---|
| 1 | Création | pending |
| 2 | Paiement FCFA | funded |
| 3 | Candidature | — |
| 4 | Acceptation + caution | accepted |
| 5 | Exécution | in_progress |
| 6 | Preuves | submitted |
| 7 | Validation | completed |

---

## Slide 26 — Sécurité

**Titre :** Sécurité multi-couche

**Contenu :**
- JWT access 1h / refresh 7j
- Guards Angular multi-rôles
- KYC bloquant avant accès
- OpenZeppelin : ReentrancyGuard, Ownable, Pausable
- Escrow FCFA verrouillé
- WebSocket GPS authentifié

**Visuel :** schéma JWT + KYC + guards

---

## Slide 27 — Déploiement

**Titre :** Déploiement et environnements

**Contenu :**
- Développement : Docker Compose
- Production : Render (backend + frontend)
- Redis : WebSockets + Celery
- Mobile : APK Android via Gradle
- Blockchain : Sepolia + apply-config

**Visuel :** Figure 3.10 — Diagramme de déploiement

---

## Slide 28 — Tests

**Titre :** Tests et validation

**Tableau :**

| Couche | Nombre | Outil |
|---|---|---|
| Backend | 11 | pytest |
| Smart contracts | 15 | Hardhat |
| Manuel | 7 | — |
| CI | — | GitHub Actions |

**Résultat :** 26 tests automatisés, atteinte 80–100 %

---

## Slide 29 — Résultats

**Titre :** Résultats et discussion

**Contenu :**
- Flux mission complet en FCFA sans crypto obligatoire
- H1 et H3 confirmées
- H2 partiellement confirmée
- Limites : sandbox, testnet, pas d'audit, pas d'étude terrain

**Visuel :** jauge d'atteinte des objectifs

---

## Slide 30 — Conclusion

**Titre :** Conclusion et perspectives

**Contenu :**
- BlockTask prouve la faisabilité d'une plateforme hybride adaptée au Mali
- Mobile Money + KYC NINA + blockchain optionnelle
- Perspectives : production Mobile Money, APK finalisé, extension UEMOA

**Sous-titre :** Merci de votre attention — Questions ?

**Visuel :** logo BlockTask + QR code GitHub
