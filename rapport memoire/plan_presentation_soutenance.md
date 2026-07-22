# Plan de présentation PowerPoint — Soutenance BlockTask

## Structure générale

- **Format** : 17 slides pour une soutenance de 15–20 minutes
- **Style** : académique, professionnel, aéré, avec un visuel par slide
- **Langue** : français (présentation orale)
- **Public** : jury de Master ILSI

---

## Slide 1 — Page de garde

**Titre :** BlockTask
**Sous-titre :** Plateforme hybride de délégation sécurisée de tâches physiques — cas du Mali
**Informations :**
- Soutenance de mémoire de fin d'études — Master ILSI
- Nom de l'étudiant
- Nom de l'encadrant : Dr Oumar MAIGA
- Date

**Visuel :** logo BlockTask

---

## Slide 2 — Plan de la présentation

**Titre :** Plan

1. Contexte et problématique
2. Objectifs et hypothèses
3. État de l'art et positionnement
4. Conception de la solution
5. Implémentation
6. Tests et validation
7. Discussion et résultats
8. Conclusion et perspectives

**Visuel :** numéros des sections sous forme de timeline ou de cartes

---

## Slide 3 — Contexte

**Titre :** Contexte

**Contenu :**
- L'économie à la tâche (gig economy) se développe rapidement.
- Au Mali, les échanges de services restent informels (courses, livraisons, petits services).
- Les plateformes internationales ne s'adaptent pas aux habitudes locales (carte bancaire, PayPal).
- Le Mobile Money (Orange Money, Moov Money) et le FCFA sont très répandus.
- Le NINA constitue un levier d'identification nationale.

**Visuel :** infographie avec les trois piliers : Mobile Money, FCFA, NINA, blockchain optionnelle

---

## Slide 4 — Problématique

**Titre :** Problématique

**Question centrale :**
Comment concevoir et mettre en œuvre une plateforme numérique de délégation de tâches, adaptée au contexte malien (FCFA, Mobile Money, NINA), intégrant de manière hybride la blockchain pour renforcer la confiance transactionnelle, tout en restant utilisable par des acteurs peu technophiles ?

**Sous-questions :**
- Q1 : quels concepts et travaux existants sont pertinents ?
- Q2 : quelle architecture couple backend, Mobile Money et blockchain ?
- Q3 : quels mécanismes de sécurité, KYC et preuve d'exécution sont nécessaires ?
- Q4 : dans quelle mesure le prototype atteint-il les objectifs ?

---

## Slide 5 — Objectifs et hypothèses

**Titre :** Objectifs et hypothèses

**Objectifs spécifiques (OS1–OS10) regroupés :**
- Analyser et spécifier le domaine (OS1–OS2)
- Concevoir une architecture modulaire (OS3)
- Implémenter les espaces utilisateurs (OS4)
- Intégrer Mobile Money et blockchain (OS5–OS6)
- Sécuriser et authentifier les accès (OS7)
- Gérer le suivi GPS et les preuves (OS8)
- Tester et évaluer le système (OS9–OS10)

**Hypothèses :**
- H1 : le modèle hybride Mobile Money + blockchain est plus adapté au Mali qu'une solution purement crypto ou centralisée.
- H2 : les smart contracts améliorent la traçabilité et la confiance.
- H3 : une architecture monolithique modulaire permet de livrer un prototype cohérent dans le délai d'un mémoire.

---

## Slide 6 — État de l'art et positionnement

**Titre :** État de l'art et positionnement

**Contenu :**
- Plateformes centralisées : Upwork, Fiverr, TaskRabbit → matures mais inadaptées au Mali.
- Plateformes décentralisées : Ethlance, Braintrust → blockchain + crypto obligatoire.
- BlockTask se situe entre les deux : centralisation fonctionnelle avec ancrage optionnel on-chain.

**Tableau comparatif :**

| Critère | Centralisées | Décentralisées | BlockTask |
|---|---|---|---|
| FCFA / Mobile Money | Non | Non | Oui |
| Tâches physiques locales | Partiel | Non | Oui |
| Sans crypto obligatoire | Oui | Non | Oui |
| Immuabilité | Non | Oui | Optionnelle |
| KYC local (NINA) | Non | Non | Oui |

**Visuel :** logos des plateformes + positionnement sur un axe

---

## Slide 7 — Modélisation C4

**Titre :** Modélisation architecturale C4

**Contenu :**
- **Diagramme de contexte (C4 Niveau 1)** : acteurs externes et système BlockTask
- **Diagramme de conteneurs (C4 Niveau 2)** : Angular, Django REST, PostgreSQL, Redis, blockchain
- **Diagramme de composants (C4 Niveau 3)** : modules backend Django (users, missions, payments, escrow, proofs, tracking, disputes, reputation)

**Visuels suggérés :**
- Figure 3.2 — Diagramme de contexte C4
- Figure 3.3 — Diagramme de conteneurs C4
- Figure 3.4 — Diagramme de composants backend

---

## Slide 8 — Modélisation UML

**Titre :** Modélisation UML

**Contenu :**
- **Diagramme de cas d'utilisation** : acteurs et grandes fonctionnalités
- **Diagramme de classes** : entités Mission, User, Payment, Proof, Reputation
- **Diagramme de séquence** : création de mission et paiement FCFA
- **Diagramme d'activité** : processus global d'une mission

**Visuels suggérés :**
- Figure 3.5 — Diagramme de cas d'utilisation
- Figure 3.6 — Diagramme de classes
- Figure 3.7 — Diagramme de séquence création/paiement
- Figure 3.9 — Diagramme d'activité processus global

---

## Slide 9 — Cycle de vie d'une mission

**Titre :** Cycle de vie d'une mission

**Contenu :**
1. Création d'une mission par le client
2. Paiement escrow en FCFA via Mobile Money
3. Candidature des prestataires
4. Acceptation et dépôt de la caution sous 4 heures
5. Exécution avec suivi GPS et preuves
6. Validation par le client
7. Libération des fonds : 95 % prestataire, 5 % plateforme
8. Gestion des litiges à chaque étape

**Visuel :** Figure 3.1 — Diagramme d'états du cycle de vie d'une mission

---

## Slide 10 — Implémentation

**Titre :** Implémentation

**Contenu :**
- Authentification JWT avec rôles doubles (client / prestataire)
- KYC NINA avec validation administrative
- Paiement Mobile Money sandbox (Orange Money, Moov Money, OTP 1234)
- Caution dynamique entre 2 000 et 5 000 XOF selon la réputation
- Chat mission intégré
- Double authentification TOTP
- Suivi GPS temps réel via WebSocket
- Soumission et analyse automatique des preuves photographiques

**Visuel :** captures d'écran des interfaces web et mobile

---

## Slide 11 — Sécurité

**Titre :** Sécurité et confiance

**Contenu :**
- Authentification : JWT access 1h, refresh 7j, rotation, blacklist
- Autorisation : guards Angular, permissions DRF, rôles multi-espaces
- KYC bloquant : accès aux fonctionnalités conditionné au statut vérifié
- Protection des données : CSRF, CORS, ORM, sanitization Angular
- Sécurité financière : escrow FCFA verrouillé, commission 5 % calculée côté serveur
- Smart contracts : OpenZeppelin (ReentrancyGuard, Ownable, Pausable)

**Visuel :** schéma du flux JWT + KYC + guards

---

## Slide 12 — Déploiement

**Titre :** Déploiement et environnements

**Contenu :**
- Développement : Docker Compose (PostgreSQL, Redis, backend, frontend, Celery)
- Production : Render (backend + frontend web)
- Mobile : APK Android via Expo / Gradle
- Blockchain : Sepolia + Hardhat local + scripts apply-config

**Visuel :** Figure 3.10 — Diagramme de déploiement

---

## Slide 13 — Tests et validation

**Titre :** Tests et validation

**Tableau :**

| Couche | Nombre | Outil |
|---|---|---|
| Backend | 11 | pytest |
| Smart contracts | 15 | Hardhat |
| Scénarios manuels | 7 | — |
| Intégration continue | — | GitHub Actions |

**Résultat :** 26 tests automatisés, 7 parcours manuels, couverture exigences fonctionnelles et non fonctionnelles.

**Visuel :** Tableau 5.7 — Synthèse quantitative des tests

---

## Slide 14 — Résultats et discussion

**Titre :** Résultats et discussion

**Contenu :**
- Flux mission complet fonctionnel en FCFA sans portefeuille crypto obligatoire.
- Objectifs atteints à 80–100 %.
- Hypothèses H1 et H3 confirmées.
- H2 partiellement confirmée : la blockchain améliore la traçabilité, mais la perception de confiance dépend davantage du KYC et du Mobile Money.

**Limites :** sandbox Mobile Money, testnet blockchain, pas d'audit externe, pas d'étude utilisateur terrain à grande échelle.

**Visuel :** jauge d'atteinte des objectifs ou tableau de validation des hypothèses

---

## Slide 15 — Perspectives

**Titre :** Perspectives d'évolution

**Tableau :**

| Horizon | Actions |
|---|---|
| Court terme (3–6 mois) | API Mobile Money production, APK finalisé, tests E2E, audit interne |
| Moyen terme (6–18 mois) | Extension UEMOA, oracles Chainlink, pont FCFA/stablecoin, étude terrain |
| Long terme (18 mois +) | Mainnet après audit, DAO, IA détection fraude, partenariats télécoms |

---

## Slide 16 — Démonstration

**Titre :** Démonstration

**Scénario :**
1. Connexion client / prestataire
2. Création d'une mission et paiement Orange Money sandbox
3. Candidature, acceptation et caution
4. Exécution avec GPS, preuves et validation
5. Espace administrateur : KYC et litiges

**Visuel :** capture d'écran ou vidéo plein écran

---

## Slide 17 — Conclusion et remerciements

**Titre :** Conclusion

**Contenu :**
- BlockTask prouve la faisabilité d'une plateforme hybride adaptée au Mali.
- Elle combine inclusion financière via Mobile Money, confiance institutionnelle via KYC NINA, et traçabilité optionnelle via blockchain.
- Le prototype constitue une base solide pour une future évolution vers l'UEMOA et la production.

**Sous-titre :** Merci de votre attention — Questions ?

**Visuel :** logo BlockTask + QR code vers le dépôt GitHub
