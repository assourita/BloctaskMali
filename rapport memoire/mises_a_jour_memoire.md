# Mises à jour du mémoire — Textes à copier-coller

Ce document liste les modifications exactes à apporter dans le mémoire Word pour l'aligner avec l'état actuel du projet (README, déploiement Render, application mobile, nouvelles fonctionnalités).

---

## 1. Résumé (page 3)

### Texte actuel
> La solution combine une architecture off-chain (Angular 17, Django REST, PostgreSQL, paiements Mobile Money) et une couche on-chain optionnelle (smart contracts Solidity sur Ethereum) pour l'ancrage des engagements critiques.

### Remplacer par
> La solution combine une architecture off-chain (Angular 17 pour le web, React Native / Expo pour le mobile, Django REST, PostgreSQL, paiements Mobile Money) et une couche on-chain optionnelle (smart contracts Solidity sur Ethereum) pour l'ancrage des engagements critiques. Le prototype est déployé en ligne sur Render (backend et frontend web), et une application mobile Android est en cours de finalisation sous forme d'APK installable.

---

## 2. Abstract (page 4)

### Texte actuel
> The solution combines an off-chain layer (Angular 17, Django REST, PostgreSQL, Mobile Money payments) with an optional on-chain layer (Solidity smart contracts on Ethereum) to anchor critical commitments.

### Remplacer par
> The solution combines an off-chain layer (Angular 17 web app, React Native / Expo mobile app, Django REST, PostgreSQL, Mobile Money payments) with an optional on-chain layer (Solidity smart contracts on Ethereum) to anchor critical commitments. The prototype is deployed online on Render (backend and web frontend), and an installable Android APK is being finalized.

---

## 3. Chapitre 1.4.3 — Outils et environnement (page 18)

### Texte actuel
> Les principaux outils retenus sont Python/Django (backend), TypeScript/Angular (frontend), Solidity/Hardhat (smart contracts), PostgreSQL (données), Redis et Django Channels (temps réel), Docker (conteneurisation), pytest et Hardhat (tests), ainsi que Git pour le versionnement. Ils sont détaillés au chapitre 4.

### Remplacer par
> Les principaux outils retenus sont Python/Django (backend), TypeScript/Angular (frontend web), React Native / Expo (application mobile), Solidity/Hardhat (smart contracts), PostgreSQL (données), Redis et Django Channels (temps réel), Celery (tâches asynchrones), Docker (conteneurisation local), pytest et Hardhat (tests), GitHub Actions (intégration continue), ainsi que Git pour le versionnement. Le déploiement des couches web et backend est réalisé sur Render. Les détails sont présentés au chapitre 4.

---

## 4. Chapitre 1.4.3 — paragraphe Développement (page 18)

### Texte actuel
> Architecture 3-tiers : couche présentation (Angular ; react), couche métier (API REST Django), couche données (PostgreSQL).

### Remplacer par
> Architecture 3-tiers : couche présentation web (Angular 17), application mobile cross-platform (React Native avec Expo), couche métier (API REST Django), couche données (PostgreSQL).

---

## 5. Chapitre 4.1 — Introduction du chapitre (page 48)

### Texte actuel
> Ce chapitre détaille les outils et environnements utilisés, l’architecture technique déployée, les langages et frameworks retenus, l’organisation du code source, ainsi que les mesures de sécurité appliquées à chaque couche du système.

### Remplacer par
> Ce chapitre détaille les outils et environnements utilisés, l’architecture technique déployée, les langages et frameworks retenus, l’organisation du code source, la mise en production sur Render, ainsi que les mesures de sécurité appliquées à chaque couche du système.

---

## 6. Chapitre 4.2.2 — Tableau des outils (page 48)

### Ajouter deux lignes après "Frontend" : si le tableau est en cours, ou mettre à jour la ligne Frontend comme suit

| Catégorie | Outil | Rôle |
|-----------|-------|------|
| IDE | Cursor / VS Code | Édition, débogage, intégration Git |
| Backend | Django 4.2, DRF 3.14 | API REST, ORM, admin |
| **Frontend web** | Angular CLI 17 | SPA, build, lazy-loading |
| **Mobile** | Expo SDK 52 / React Native | Application mobile cross-platform (APK) |
| Blockchain | Hardhat 2.19 | Compilation, déploiement, tests contrats |
| Base de données | pgAdmin / psql | Administration PostgreSQL |
| API | Swagger (drf-spectacular) | Documentation OpenAPI (/api/docs/) |
| Tests | pytest, pytest-django | Tests automatisés backend |
| Temps réel | Django Channels, Redis | WebSocket GPS |
| Asynchrone | Celery + Redis | Sync blockchain, notifications |
| Conteneurisation | Docker, Docker Compose | Environnement reproductible local |
| CI/CD | GitHub Actions | pytest + build Angular |
| Diagrammes | Mermaid | Modélisation (chapitre 3) |
| Wallet | MetaMask | Tests transactions Web3 |
| Contrats | Remix IDE (optionnel) | Déploiement VM de test |
| Versionnement | Git | Suivi des versions |

---

## 7. Chapitre 4.3.1 — Architecture 3-tiers (page 49)

### Ajouter dans le tableau

| Couche | Technologie | Responsabilité |
|--------|-------------|----------------|
| Présentation web | Angular 17 + Material | Interfaces par rôle, routing, MetaMask |
| **Présentation mobile** | React Native + Expo | Application iOS/Android, Expo Router |
| Métier | Django REST Framework | Règles métier, auth JWT, orchestration |
| Données | PostgreSQL + Redis + fichiers | Persistance, cache, médias |
| Temps réel | Django Channels + WebSocket | Suivi GPS live |
| Asynchrone | Celery + Redis | Notifications, sync blockchain |
| Blockchain | Solidity 0.8.20 + Web3.py | Escrow, réputation, litigation on-chain |

---

## 8. Chapitre 4.4.2 — Frameworks et bibliothèques (page 49)

### Ajouter un tableau "Mobile" :

**Mobile (extrait package.json)**

| Bibliothèque | Usage |
|--------------|-------|
| Expo 52 | Framework mobile cross-platform |
| React Native | Composants natifs iOS/Android |
| Expo Router | Navigation file-based |
| TypeScript | Typage statique |
| Axios | Client HTTP API |

---

## 9. Chapitre 4.5.2 — Organisation frontend (page 51)

### Ajouter après le paragraphe frontend

> Une application mobile distincte, située dans `mobile/`, complète le frontend web. Elle est développée avec **React Native** et **Expo SDK 52**, et utilise **Expo Router** pour la navigation. Elle reprend les espaces client, prestataire et entreprise sous forme d'interfaces adaptées aux téléphones, avec accès au flux mission complet : consultation, candidature, soumission de preuves et suivi GPS.

---

## 10. Chapitre 4.6 — Nouvelles fonctionnalités à ajouter (page 52-54)

### Ajouter une sous-section 4.6.9 : Chat mission

> **Chat mission (client ↔ prestataire)**
> Un canal de messagerie intégré à chaque mission permet au client et au prestataire de communiquer sans quitter la plateforme, aussi bien sur le web que sur mobile. Les messages sont persistés côté backend et restitués dans l'interface de détail de la mission.

### Ajouter une sous-section 4.6.10 : Double authentification (2FA TOTP)

> **Double authentification (TOTP)**
> L'authentification par mot de passe peut être renforcée par un second facteur basé sur le standard TOTP (Time-based One-Time Password), compatible avec les applications d'authentification courantes. Cette fonctionnalité est intégrée au module d'authentification JWT.

### Ajouter dans 4.6.5 (Preuves)

> Une **analyse automatique** des preuves photographiques est en cours d'intégration pour faciliter la validation côté client et détecter d'éventuelles incohérences (ex. absence de visage, flou excessif, doublon).

---

## 11. Chapitre 4.8 — Déploiement (page 56)

### Ajouter une sous-section 4.8.3 après Docker Compose

### 4.8.3 Déploiement sur Render (production)

> Le prototype est déployé en ligne sur la plateforme **Render** à l'aide du blueprint `render.yaml` présent à la racine du dépôt :
> - **Backend Django** : service Web Render connecté à une base PostgreSQL managée, avec les variables d'environnement `DATABASE_URL`, `CORS_ALLOWED_ORIGINS`, `FRONTEND_URL` et `SECRET_KEY`.
> - **Frontend Angular** : site statique Render, construit avec `ng build --configuration production` et servi depuis le dossier `dist/blocktask/browser`.
> - **Redis** : service managé pour les WebSockets et Celery.
> - **Communication** : le frontend production pointe vers le backend Render via `https://bloctaskmali.onrender.com/api`.
>
> Ce déploiement permet une démonstration accessible depuis un navigateur sans installation locale. L'application mobile, quant à elle, est préparée sous forme d'APK Android via Android Studio / Gradle à partir du projet Expo (`npx expo prebuild -p android`).

---

## 12. Chapitre 4.9 — Tests (page 57)

### Remplacer le paragraphe actuel par

> Des tests automatisés valident le flux MVP (`backend/tests/test_mvp_flow.py`) ainsi que des scénarios complémentaires : rôles doubles (`test_dual_roles.py`), profil et KYC (`test_profile_completion.py`), flux entreprise (`test_enterprise_flow.py`) et expiration automatique des missions (`test_mission_expiry.py`). L'intégration continue est assurée par **GitHub Actions**, qui exécute `pytest` et le build Angular à chaque push.
>
> Exécution : `pytest backend/tests/` depuis la racine du backend.

---

## 13. Chapitre 4.12 — Conclusion du chapitre 4 (page 62)

### Texte actuel
> Le prototype est fonctionnel en environnement de développement et couvre l'intégralité du cycle mission décrit au chapitre 3.

### Remplacer par
> Le prototype est fonctionnel en environnement de développement, déployé en ligne sur Render (frontend et backend), et une application mobile cross-platform (React Native / Expo) est en cours de finalisation sous forme d'APK installable. Le cycle mission décrit au chapitre 3 est couvert, avec des fonctionnalités complémentaires telles que le chat mission, la 2FA TOTP et l'analyse automatique des preuves.

---

## 14. Chapitre 5.4.5 — Synthèse tests backend (page 67)

### Texte actuel
> Tableau 5.4 — Synthèse tests backend
> Module | Nombre de tests | Domaine
> test_mvp_flow.py | 3 | Missions, escrow, litiges, réputation
> test_profile_completion.py | 5 | KYC, profil, accès
> test_dual_roles.py | 3 | Rôles utilisateur
> Total | 11 |

### Remplacer par
> Tableau 5.4 — Synthèse tests backend
> Module | Nombre de tests | Domaine
> test_mvp_flow.py | 3 | Missions, escrow, litiges, réputation
> test_profile_completion.py | 5 | KYC, profil, accès
> test_dual_roles.py | 3 | Rôles utilisateur
> test_enterprise_flow.py | 2 | Employés, missions B2B
> test_mission_expiry.py | 2 | Expiration et remboursement
> Total | 15 |

> **Note** : les nombres ci-dessus sont indicatifs et doivent être ajustés après exécution réelle de `pytest`.

---

## 15. Chapitre 5.8.1 — Synthèse quantitative (page 69)

### Texte actuel
> Couche | Tests automatisés | Domaines couverts
> Backend Django | 11 | Missions, KYC, rôles, litiges, réputation
> Smart contracts | 15 | Escrow, réputation, litigation
> Manuel (scénarios) | 7 parcours | UI, Mobile Money, admin, blockchain
> Total automatisé | 26 |

### Remplacer par
> Couche | Tests automatisés | Domaines couverts
> Backend Django | 15 | Missions, KYC, rôles, litiges, réputation, entreprise, expiration
> Smart contracts | 15 | Escrow, réputation, litigation
> Manuel (scénarios) | 7 parcours | UI, Mobile Money, admin, blockchain
> CI/GitHub Actions | — | pytest + build Angular automatiques
> Total automatisé | 30 |

---

## 16. Chapitre 7.1 — Hors périmètre (page 77)

### Texte actuel
> Hors périmètre :
> - déploiement production à l’échelle nationale ;
> - intégration API Mobile Money réelles ;
> - mainnet Ethereum et audit de sécurité formel ;
> - application mobile native ;
> - extension aux autres pays UEMOA (prévue, non implémentée).

### Remplacer par
> Hors périmètre :
> - déploiement production à l’échelle nationale ;
> - intégration API Mobile Money réelles ;
> - mainnet Ethereum et audit de sécurité formel ;
> - extension aux autres pays UEMOA (prévue, non implémentée).
>
> L'application mobile native, initialement positionnée comme perspective, fait désormais partie des livrables en cours de finalisation (APK Android via Expo).

---

## 17. Chapitre 7.2 — Synthèse des réalisation (page 77)

### Ajouter deux lignes au tableau

| Réalisation | Livrable |
|-------------|----------|
| Déploiement web sur Render | Backend + frontend accessibles en ligne |
| Application mobile Expo | APK Android en cours de génération (React Native) |
| Intégration continue | GitHub Actions (pytest + build Angular) |

---

## 18. Chapitre 7.5.1 — Perspectives court terme (page 78)

### Texte actuel
> - Application PWA ou mobile (Flutter/React Native) pour le GPS terrain.

### Remplacer par
> - Finalisation et distribution de l'application mobile Expo sous forme d'APK Android.
> - Tests E2E frontend (Cypress).
> - Déploiement Sepolia stable + démonstration soutenance avec MetaMask.

---

## 19. Bibliographie (page 80)

### Ajouter

- Expo. (2024). Expo Documentation. https://docs.expo.dev/
- React Native. (2024). React Native Documentation. https://reactnative.dev/
- GitHub. (2024). GitHub Actions Documentation. https://docs.github.com/actions
- Render. (2024). Render Documentation. https://render.com/docs

---

## 20. Figures et captures d'écran à vérifier

Le mémoire référence certaines figures sans image visible. Vérifie et insère les captures suivantes :

- Figure "Page de connexion" (après Figure 4.5)
- Figure "Page de liste de mission assignes à l'utilisateur (prestataire)" (après Figure 4.8)
- Vérifie que la Figure 4.9 "Détail d'une mission assignée" n'est pas dupliquée avec la même légende qu'une autre figure.

---

## Résumé des modifications majeures

| Section | Action |
|---------|--------|
| Résumé / Abstract | Ajouter mobile + Render |
| 1.4.3 | Corriger Angular ; react ; ajouter Expo, Celery, CI |
| 4.1 | Mentionner Render |
| 4.2.2 | Ajouter mobile et CI dans le tableau outils |
| 4.3.1 | Ajouter couche mobile dans le tableau 3-tiers |
| 4.4.2 | Ajouter tableau mobile |
| 4.5.2 | Ajouter paragraphe sur `mobile/` |
| 4.6 | Ajouter chat, 2FA, analyse automatique |
| 4.8.3 | Ajouter section Render |
| 4.9 | Mentionner enterprise, expiry, CI |
| 4.12 | Conclusion avec mobile + Render |
| 5.4.5 | 11 tests → 15 tests |
| 5.8.1 | 26 tests → 30 tests + CI |
| 7.1 | Retirer mobile du hors périmètre |
| 7.2 | Ajouter mobile et CI dans les réalisations |
| 7.5.1 | Finalisation APK mobile |
| Bibliographie | Ajouter Expo, React Native, GitHub Actions, Render |
| Figures | Vérifier captures manquantes |

---

**Note importante** : les nombres de tests (11 → 15, 26 → 30) sont indicatifs. Vérifie avec `pytest --collect-only` ou `pytest -v` le nombre exact de tests avant de finaliser le mémoire.
