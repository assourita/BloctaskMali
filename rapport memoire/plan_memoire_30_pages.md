# Plan de rédaction du mémoire — Version 30 pages

## Objectif

Réduire le mémoire à environ **30 pages de corps de texte** (hors annexes, bibliographie, liste des figures/tableaux et pages de garde). Chaque chapitre est dimensionné pour couvrir l'essentiel sans redondance.

---

## Répartition des pages

| Section | Pages | Contenu principal |
|---|---|---|
| Pages liminaires | 3–4 | Garde, dédicace, remerciements, résumé, abstract, liste des abréviations, liste des figures/tableaux |
| Introduction générale | 3 | Contexte, problématique, objectifs, hypothèses, méthodologie, plan |
| Chapitre 2 — État de l'art | 5 | Concepts, plateformes comparées, blockchain, positionnement BlockTask |
| Chapitre 3 — Conception | 6 | Analyse, C4, UML, cycle de vie, exigences, scénarios |
| Chapitre 4 — Implémentation | 6 | Stack, architecture, fonctionnalités, sécurité, déploiement, interfaces |
| Chapitre 5 — Tests et validation | 4 | Stratégie, tests automatisés, scénarios manuels, résultats |
| Chapitre 6 — Discussion | 3 | Résultats, atteinte objectifs, forces, limites, comparaison |
| Chapitre 7 — Conclusion et perspectives | 2 | Synthèse, difficultés, perspectives, mot de fin |
| Bibliographie + annexes | 2–3 | Références principales, glossaire, captures complémentaires |
| **Total** | **30–31** | — |

---

## 1. Pages liminaires (3–4 pages)

### Page de garde
- Titre, nom, encadrant, établissement, année universitaire

### Dédicace
- Texte court (paragraphe)

### Remerciements
- 1 page maximum

### Résumé
- 15–20 lignes

### Abstract
- 15–20 lignes

### Liste des abréviations
- Tableau compact

### Liste des figures et tableaux
- Liste condensée (ne garder que les éléments utilisés dans les 30 pages)

---

## 2. Introduction générale (3 pages)

### 1.1 Contexte (1 page)
- Contexte global : économie à la tâche
- Contexte africain/ouest-africain : Mobile Money, FCFA
- Contexte malien : NINA, Bamako, besoins de services
- Tableau 1.1 : Modèle hybride BlockTask — 3 lignes

### 1.2 Problématique (1 page)
- Constats et lacunes
- Question de recherche
- Intérêt scientifique et pratique

### 1.3 Objectifs et hypothèses (0,5 page)
- Tableau 1.2 : 5 objectifs regroupés (pas 10 détaillés)
- 3 hypothèses

### 1.4 Méthodologie et organisation (0,5 page)
- Approche itérative
- Outils principaux
- Organisation du mémoire

---

## 3. Chapitre 2 — État de l'art (5 pages)

### 2.1 Concepts fondamentaux (1 page)
- Économie à la tâche, escrow, asymétrie d'information, réputation
- Blockchain, smart contracts, architecture hybride
- Mobile Money, KYC, NINA

### 2.2 Plateformes centralisées (1,5 page)
- Upwork, Fiverr, TaskRabbit
- Tableau 2.1 : comparaison synthétique
- Limites pour le Mali

### 2.3 Plateformes décentralisées et blockchain (1,5 page)
- Ethlance, Braintrust
- Apports et limites de la blockchain
- Tableau 2.3 : apports de la blockchain
- Tableau 2.4 : limites

### 2.4 Positionnement de BlockTask (1 page)
- Tableau 2.5 : synthèse comparatives existantes vs BlockTask
- Modèle hybride
- Transition vers la conception

---

## 4. Chapitre 3 — Conception (6 pages)

### 3.1 Analyse du domaine (1 page)
- Acteurs du système
- Tableau 3.2 : acteurs
- Tableau 3.1 : périmètre fonctionnel
- Règles de gestion principales

### 3.2 Cycle de vie d'une mission (1 page)
- Description des étapes
- Tableau 3.3 : états du cycle de vie
- Figure 3.1 : diagramme d'états

### 3.3 Modélisation C4 (1,5 page)
- Figure 3.2 : contexte
- Figure 3.3 : conteneurs
- Figure 3.4 : composants backend

### 3.4 Modélisation UML (1,5 page)
- Figure 3.5 : cas d'utilisation
- Figure 3.6 : classes
- Figure 3.7 : séquence création/paiement
- Figure 3.9 : activité processus global

### 3.5 Exigences et scénarios (1 page)
- Tableau 3.5 : exigences fonctionnelles principales
- Tableau 3.6 : exigences non fonctionnelles
- 2 scénarios détaillés (création mission, validation)

---

## 5. Chapitre 4 — Implémentation (6 pages)

### 4.1 Environnement et outils (0,5 page)
- Tableau 4.2 : outils par couche
- Tableau 4.3 : architecture 3-tiers

### 4.2 Stack technique (0,5 page)
- Tableau 4.4 : bibliothèques backend
- Tableau 4.7 : bibliothèques frontend

### 4.3 Architecture du système (1 page)
- Figure 4.1 : architecture globale
- Modèle hybride Mali
- Modules backend Django

### 4.4 Fonctionnalités clés (2 pages)
- Authentification et rôles doubles
- Workflow mission
- Paiements Mobile Money
- Caution dynamique
- Preuves et GPS
- KYC NINA
- Espace admin
- Chat et 2FA
- Tableau 4.6 : actions API du workflow

### 4.5 Sécurité (1 page)
- Authentification, autorisation, protection des données
- Sécurité financière et smart contracts
- Tableau 4.7 : protection des communications

### 4.6 Déploiement et interfaces (1 page)
- Docker Compose
- Render
- Blockchain Sepolia
- 4–5 captures d'écran principales

---

## 6. Chapitre 5 — Tests et validation (4 pages)

### 5.1 Stratégie de test (0,5 page)
- Tableau 5.1 : stratégie multi-niveaux
- Environnement de test

### 5.2 Tests backend (1 page)
- Fixtures et modules principaux
- Tableau 5.9 : synthèse tests backend

### 5.3 Tests smart contracts (1 page)
- 3 contrats et 15 tests

### 5.4 Scénarios fonctionnels et sécurité (1 page)
- SC1 : inscription/KYC
- SC2 : création/paiement
- SC3 : candidature/caution
- Tableau 5.6 : checklist sécurité

### 5.5 Résultats (0,5 page)
- Tableau 5.7 : synthèse quantitative
- Tableau 5.8 : couverture par objectif
- Lacunes principales

---

## 7. Chapitre 6 — Discussion (3 pages)

### 6.1 Résultats techniques (1 page)
- Flux mission complet
- Modèle hybride FCFA + blockchain
- Tableau 6.1 : couches et résultats observés

### 6.2 Atteinte des objectifs (1 page)
- Tableau 6.2 : bilan d'atteinte
- Tableau 6.3 : validation des hypothèses

### 6.3 Forces, limites et comparaison (1 page)
- Forces du projet
- Limites techniques et méthodologiques
- Tableau 6.4 : BlockTask vs alternatives

---

## 8. Chapitre 7 — Conclusion et perspectives (2 pages)

### 7.1 Synthèse (0,5 page)
- Tableau 7.1 : réalisations principales

### 7.2 Résultats et difficultés (0,5 page)
- Tableau 7.2 : difficultés rencontrées et solutions

### 7.3 Perspectives (0,75 page)
- Court terme
- Moyen terme
- Long terme

### 7.4 Mot de fin (0,25 page)
- Message final

---

## 9. Bibliographie et annexes (2–3 pages)

### Bibliographie
- 15–20 références principales

### Annexes
- Glossaire (10–15 termes)
- 2–3 captures d'écran complémentaires
- Code significatif (1 listing court)

---

## Diagrammes à inclure obligatoirement

Pour satisfaire le critère « au moins un de chaque type », le mémoire de 30 pages doit contenir :

| Type | Figure obligatoire |
|---|---|
| C4 — Contexte | Figure 3.2 |
| C4 — Conteneurs | Figure 3.3 |
| C4 — Composants | Figure 3.4 |
| UML — Cas d'utilisation | Figure 3.5 |
| UML — Classes | Figure 3.6 |
| UML — Séquence | Figure 3.7 |
| UML — État | Figure 3.1 |
| UML — Activité | Figure 3.9 |
| UML — Déploiement | Figure 3.10 |
| Architecture globale | Figure 4.1 |

---

## Conseils de réduction

- Supprimer les répétitions entre chapitres.
- Remplacer les longs paragraphes descriptifs par des tableaux.
- Garder les captures d'écran les plus parlantes (4–5 maximum dans le corps).
- Déplacer les détails techniques dans les annexes.
- Concentrer l'état de l'art sur la comparaison et le positionnement.
- Réduire les scénarios à 2–3 parcours essentiels.
- Fusionner les sections 6.5/6.6/6.7 si nécessaire.
