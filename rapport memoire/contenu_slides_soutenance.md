# Contenu des slides — Soutenance BlockTask

## Slide 1 — Garde
**Titre :** BlockTask

**Sous-titre :**
Plateforme hybride de délégation sécurisée de tâches physiques — cas du Mali

Soutenance de mémoire de fin d'études — Master ILSI

**Visuel suggéré :** logo BlockTask

---

## Slide 2 — Contexte et motivation
**Titre :** Contexte et motivation

**Contenu :**
- Économie à la tâche au Mali : encore largement informelle
- Obstacles : manque de confiance, absence d'escrow accessible, paiements internationaux inadaptés
- Opportunité : Mobile Money (Orange Money, Moov Money) très répandu
- Leviers locaux : FCFA (XOF), NINA, blockchain optionnelle

---

## Slide 3 — Problématique
**Titre :** Problématique

**Contenu :**
Comment concevoir et mettre en œuvre une plateforme numérique de délégation de tâches,
adaptée au contexte malien (FCFA, Mobile Money, NINA),
intégrant de manière hybride la blockchain pour renforcer la confiance transactionnelle,
tout en restant utilisable par des acteurs peu technophiles ?

---

## Slide 4 — Objectifs spécifiques
**Titre :** Objectifs spécifiques

**Contenu :**
- OS1 — Analyser le domaine et l'état de l'art
- OS2/OS3 — Spécifier et concevoir une architecture modulaire (UML / C4)
- OS4 — Implémenter les espaces client, prestataire, entreprise, admin
- OS5 — Intégrer les paiements Mobile Money en FCFA
- OS6 — Intégrer une couche blockchain optionnelle (Solidity / Hardhat)
- OS7 — Sécurité, KYC NINA et conformité
- OS8 — Suivi GPS et preuves d'exécution
- OS9/OS10 — Tester et évaluer le système

---

## Slide 5 — État de l'art et positionnement
**Titre :** État de l'art et positionnement

**Contenu :**
- Plateformes centralisées : Upwork, Fiverr, TaskRabbit
- Limites : centralisation, commissions élevées, inadaptation au Mali
- Plateformes décentralisées : Ethlance, Braintrust — crypto obligatoire
- Positionnement BlockTask : hybride — Mobile Money + blockchain optionnelle

---

## Slide 6 — Architecture globale
**Titre :** Architecture globale

**Contenu :**
- Web : Angular 17 + Material
- Mobile : React Native + Expo SDK 52
- Backend : Django 4.2 + DRF + PostgreSQL
- Temps réel : Channels + Redis + Celery
- Blockchain : Solidity + Hardhat / Sepolia
- Déploiement : Render + Railway

**Visuel suggéré :** Figure 3.3 — Diagramme de conteneurs C4

---

## Slide 7 — Cycle de vie d'une mission
**Titre :** Cycle de vie d'une mission

**Contenu :**
- Création → Paiement escrow (FCFA)
- Candidature → Acceptation → Caution
- Exécution → Preuves
- Validation → Libération fonds (95 % / 5 %)
- Litige possible à chaque étape

**Visuel suggéré :** Figure 3.1 — Diagramme d'états mission

---

## Slide 8 — Fonctionnalités clés implémentées
**Titre :** Fonctionnalités clés implémentées

**Contenu :**
- Auth JWT avec rôles doubles
- KYC NINA + validation admin
- Paiement Mobile Money sandbox
- Caution dynamique selon réputation
- Chat mission + 2FA TOTP
- GPS temps réel + preuves photo
- Analyse automatique des preuves

**Visuel suggéré :** captures interfaces web / mobile

---

## Slide 9 — Sécurité et confiance
**Titre :** Sécurité et confiance

**Contenu :**
- JWT access 1h / refresh 7j
- Guards Angular multi-rôles
- KYC bloquant avant accès
- OpenZeppelin : ReentrancyGuard, Ownable, Pausable
- Escrow FCFA verrouillé
- WebSocket GPS authentifié

**Visuel suggéré :** schéma flux JWT + KYC

---

## Slide 10 — Déploiement et environnements
**Titre :** Déploiement et environnements

**Contenu :**
- Développement : Docker Compose
- Production : Render (backend + frontend)
- Redis : WebSockets + Celery
- Mobile : APK Android via Gradle
- Blockchain : Sepolia + apply-config

**Visuel suggéré :** Figure 3.10 — Diagramme de déploiement

---

## Slide 11 — Tests et validation
**Titre :** Tests et validation

**Contenu :**
- 11 tests backend (pytest)
- 15 tests smart contracts (Hardhat)
- 7 scénarios manuels
- CI GitHub Actions
- Matrice exigences ↔ tests
- Atteinte objectifs : 80–100 %

**Visuel suggéré :** Tableau 5.7 — Synthèse quantitative des tests

---

## Slide 12 — Résultats et discussion
**Titre :** Résultats et discussion

**Contenu :**
- Modèle hybride FCFA + blockchain validé techniquement
- Forces : contextualisation Mali, inclusion Mobile Money, traçabilité optionnelle
- Limites : sandbox Mobile Money, testnet blockchain, pas d'audit externe
- Pas d'étude utilisateur terrain à grande échelle
- H1 et H3 confirmées ; H2 partiellement confirmée

---

## Slide 13 — Perspectives d'évolution
**Titre :** Perspectives d'évolution

**Contenu :**
- Court terme : API Mobile Money production, APK mobile finalisé, tests E2E
- Moyen terme : extension UEMOA (Sénégal, Côte d'Ivoire, Burkina), oracles Chainlink, pont FCFA/stablecoin
- Long terme : passage mainnet après audit, DAO, IA pour détection de fraude, partenariats télécoms

---

## Slide 14 — Démonstration
**Titre :** Démonstration

**Contenu :**
- Connexion client / prestataire
- Création mission + paiement Orange Money sandbox
- Candidature, acceptation, caution
- GPS, preuves, validation, KYC / litiges

**Visuel suggéré :** capture d'écran ou vidéo de démonstration

---

## Slide 15 — Conclusion
**Titre :** Conclusion

**Contenu :**
- BlockTask prouve la faisabilité d'une plateforme hybride adaptée au Mali
- Inclusion financière via Mobile Money + confiance institutionnelle via KYC NINA
- Traçabilité renforcée via smart contracts lorsque l'utilisateur le souhaite
- Ouverture vers l'UEMOA et la production

---

## Slide 16 — Remerciements
**Titre :** Merci de votre attention

**Sous-titre :** Questions ?

**Visuel suggéré :** logo BlockTask
