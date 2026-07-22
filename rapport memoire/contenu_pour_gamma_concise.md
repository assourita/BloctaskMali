# Prompt pour Gamma — Présentation de soutenance BlockTask (version concise)

Génère une présentation de soutenance académique, environ 16 slides, avec un design moderne, aéré et peu de texte par slide. Utilise le contenu ci-dessous. Privilégie les titres, les listes courtes et les espaces pour les visuels.

---

## Slide 1 — Titre

**Titre :** BlockTask

**Sous-titre :** Plateforme hybride de délégation sécurisée de tâches physiques — cas du Mali

**Contexte :** Soutenance de mémoire de fin d'études — Master ILSI

**Visuel :** logo BlockTask

---

## Slide 2 — Contexte

**Titre :** Pourquoi BlockTask ?

**Contenu :**
- Au Mali, l'économie à la tâche reste informelle : courses, livraisons, petits services.
- Manque de confiance entre client et prestataire.
- Pas d'escrow accessible aux habitudes locales.
- Mobile Money (Orange Money, Moov Money) très répandu.

**Idée :** une plateforme de mise en relation sécurisée avec paiement Mobile Money + blockchain optionnelle.

---

## Slide 3 — Problématique

**Titre :** Problématique

**Contenu :**
Comment concevoir une plateforme de délégation de tâches adaptée au Mali (FCFA, Mobile Money, NINA), utilisant la blockchain pour renforcer la confiance, sans imposer la cryptomonnaie aux utilisateurs ?

**Visuel suggéré :** schéma des 4 piliers : Mobile Money, NINA, blockchain optionnelle, utilisabilité.

---

## Slide 4 — Objectifs

**Titre :** Objectifs spécifiques

**Contenu :**
- Analyser l'état de l'art et le domaine.
- Spécifier et concevoir l'architecture (UML / C4).
- Implémenter les espaces client, prestataire, entreprise, admin.
- Intégrer Mobile Money en FCFA et blockchain optionnelle.
- Sécuriser l'accès par JWT et KYC NINA.
- Tester et valider le système.

**Visuel :** une checklist ou un chemin de 6 étapes.

---

## Slide 5 — État de l'art

**Titre :** Positionnement

**Contenu :**
- Plateformes centralisées : Upwork, Fiverr, TaskRabbit → inadaptées au Mali.
- Plateformes décentralisées : Ethlance, Braintrust → crypto obligatoire.
- BlockTask : hybride, Mobile Money + blockchain optionnelle.

| Critère | Centralisées | Décentralisées | BlockTask |
|---|---|---|---|
| FCFA / Mobile Money | Non | Non | Oui |
| Tâches physiques locales | Partiel | Non | Oui |
| Sans crypto obligatoire | Oui | Non | Oui |
| Immuabilité | Non | Oui | Optionnelle |

**Visuel :** logos + positionnement sur un axe.

---

## Slide 6 — Architecture

**Titre :** Architecture hybride

**Contenu :**
- Web : Angular 17 + Material
- Mobile : React Native + Expo SDK 52
- Backend : Django 4.2 + DRF + PostgreSQL
- Temps réel : Redis + Channels + Celery
- Blockchain : Solidity + Hardhat / Sepolia
- Déploiement : Render + Railway

**Visuel :** Figure 3.3 — Diagramme de conteneurs C4.

---

## Slide 7 — Cycle de vie

**Titre :** Cycle de vie d'une mission

**Contenu :**
1. Création → Paiement escrow (FCFA)
2. Candidature → Acceptation → Caution
3. Exécution → Preuves
4. Validation → Libération des fonds (95 % / 5 %)
5. Litige possible à chaque étape

**Visuel :** Figure 3.1 — Diagramme d'états mission.

---

## Slide 8 — Fonctionnalités

**Titre :** Fonctionnalités clés

**Contenu :**
- Authentification JWT avec rôles doubles
- KYC NINA + validation admin
- Paiement Mobile Money sandbox
- Caution dynamique selon réputation
- Chat mission + 2FA TOTP
- GPS temps réel + preuves photo

**Visuel :** captures d'écran web et mobile.

---

## Slide 9 — Sécurité

**Titre :** Sécurité multi-couche

**Contenu :**
- JWT : access 1h, refresh 7j
- Guards Angular : Auth, Role, ProfileComplete
- KYC bloquant avant accès aux features
- Smart contracts OpenZeppelin : ReentrancyGuard, Ownable, Pausable
- Escrow FCFA verrouillé jusqu'à validation

**Visuel :** schéma JWT + KYC.

---

## Slide 10 — Déploiement

**Titre :** Déploiement

**Contenu :**
- Développement : Docker Compose
- Production : Render (backend + frontend)
- Redis : WebSockets + Celery
- Mobile : APK Android via Gradle
- Blockchain : Sepolia + apply-config

**Visuel :** Figure 3.10 — Diagramme de déploiement.

---

## Slide 11 — Tests

**Titre :** Tests et validation

**Contenu :**

| Couche | Nombre | Outil |
|---|---|---|
| Backend | 11 | pytest |
| Smart contracts | 15 | Hardhat |
| Scénarios manuels | 7 | — |
| Intégration continue | — | GitHub Actions |

**Résultat :** 26 tests automatisés, 7 parcours manuels, atteinte des objectifs 80–100 %.

---

## Slide 12 — Résultats

**Titre :** Résultats

**Contenu :**
- Flux mission complet fonctionnel en FCFA sans crypto obligatoire.
- Hypothèses H1 et H3 confirmées.
- H2 partiellement confirmée : traçabilité oui, perception confiance dépend surtout du KYC et Mobile Money.

**Limites :** sandbox, testnet, pas d'audit externe, pas d'étude terrain.

**Visuel :** jauge ou score d'atteinte des objectifs.

---

## Slide 13 — Perspectives

**Titre :** Perspectives

**Contenu :**

| Horizon | Actions |
|---|---|
| Court terme | API Mobile Money production, APK finalisé, tests E2E |
| Moyen terme | UEMOA, oracles Chainlink, pont FCFA/stablecoin, étude terrain |
| Long terme | Mainnet, DAO, IA fraude, partenariats télécoms |

---

## Slide 14 — Démonstration

**Titre :** Démonstration

**Contenu :**
- Connexion client / prestataire
- Création mission + paiement Orange Money sandbox
- Candidature, acceptation, caution
- GPS, preuves, validation, KYC / litiges

**Visuel :** capture d'écran ou vidéo plein écran.

---

## Slide 15 — Conclusion

**Titre :** Conclusion

**Contenu :**
- BlockTask prouve la faisabilité d'une plateforme hybride adaptée au Mali.
- Mobile Money + KYC NINA + blockchain optionnelle.
- Base solide pour une évolution vers l'UEMOA et la production.

---

## Slide 16 — Remerciements

**Titre :** Merci de votre attention

**Sous-titre :** Questions ?

**Visuel :** logo + QR code vers le dépôt GitHub.
