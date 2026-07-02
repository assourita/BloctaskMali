# PARTIES LIMINAIRES — MÉMOIRE DE FIN D'ÉTUDES

*(À personnaliser : nom complet, université, filière, année, encadreur)*

---

## PAGE DE GARDE *(modèle)*

**[UNIVERSITÉ / ÉCOLE]**  
**[FACULTÉ / DÉPARTEMENT]**  
**Master [ILSI / Informatique et Logiciels pour les Systèmes d'Information]**  
**Promotion [2024–2025]**

---

**PLATEFORME DÉCENTRALISÉE DE DÉLÉGATION DE TÂCHES AVEC SMART CONTRACTS, ESCROW ET SYSTÈME DE RÉPUTATION**

*Conception et implémentation d'une solution hybride BlockTask pour le marché malien*

---

**Mémoire de fin d'études**  
présenté en vue de l'obtention du diplôme de **Master**

---

**Présenté par :** [Prénom NOM]  
**Encadré par :** [Prénom NOM du maître de mémoire]  
**[Co-encadrant éventuel]**

---

**Année académique :** 2024–2025

---

## DÉDICACE

À mes parents,  
pour leur amour, leurs sacrifices et leur confiance tout au long de ce parcours.  
Votre soutien a été la force qui m'a permis d'aller jusqu'au bout de ce projet.

À ma famille et à mes proches,  
qui ont cru en moi aux moments de doute.

À tous ceux qui œuvrent pour le développement numérique du Mali et de l'Afrique,  
que ce travail contribue, à sa modeste échelle, à bâtir des solutions adaptées à notre réalité.

---

## REMERCIEMENTS

La réalisation de ce mémoire n'aurait pas été possible sans l'appui de nombreuses personnes. Je tiens à leur exprimer ma profonde gratitude.

Je remercie tout d'abord **[Nom du maître de mémoire]**, mon encadrant, pour sa disponibilité, ses conseils avisés et sa rigueur scientifique. Ses orientations m'ont permis de structurer ce travail et de donner une direction claire au projet BlockTask.

Mes remerciements s'adressent également à **[Nom du directeur de filière / responsable Master]**, ainsi qu'à l'ensemble du corps professoral du département **[Nom]**, pour la qualité de la formation reçue tout au long du cycle Master.

Je remercie **[Nom des camarades / binôme éventuel]** pour les échanges fructueux, les relectures et l'entraide durant cette année académique.

Je suis reconnaissant envers **[organisme / entreprise d'accueil éventuel]** pour l'environnement de travail et les ressources mises à disposition.

Enfin, je remercie ma famille et mes amis pour leur patience, leurs encouragements et leur soutien moral durant les longues heures de conception, de développement et de rédaction.

À tous, merci.

---

## RÉSUMÉ *(Français)*

**Titre :** Plateforme décentralisée de délégation de tâches avec smart contracts, escrow et système de réputation — Cas du marché malien

**Mots-clés :** délégation de tâches, plateforme numérique, blockchain, smart contract, escrow, Mobile Money, Mali, architecture hybride, réputation, KYC, NINA

La délégation de tâches physiques entre particuliers et entreprises constitue un enjeu croissant de l'économie numérique. Au Mali, ce phénomène reste largement informel, freiné par le manque de confiance, l'absence de mécanismes de séquestre accessibles et l'inadéquation des plateformes internationales aux moyens de paiement locaux (FCFA, Orange Money, Moov Money).

Ce mémoire présente la conception, l'implémentation et l'évaluation de **BlockTask**, une plateforme web hybride permettant la mise en relation sécurisée entre clients et prestataires. La solution combine une architecture **off-chain** (Angular 17, Django REST, PostgreSQL, paiements Mobile Money) et une couche **on-chain** optionnelle (smart contracts Solidity sur Ethereum) pour l'ancrage des engagements critiques.

Le travail s'appuie sur une analyse de l'état de l'art (plateformes centralisées et décentralisées), une modélisation UML et C4, et l'implémentation d'un prototype couvrant le cycle complet d'une mission : création, paiement escrow, candidature, caution, exécution, preuves, validation et gestion des litiges. L'identification des utilisateurs repose sur le **NINA** et un processus KYC administré.

Les tests — 11 tests automatisés backend (pytest), 15 tests de smart contracts (Hardhat) et 7 scénarios fonctionnels manuels — confirment la faisabilité technique du modèle hybride. Les résultats montrent que les objectifs fixés sont atteints à hauteur de 80 à 100 %, avec des perspectives d'évolution vers l'intégration Mobile Money en production et l'extension à l'espace UEMOA.

**Conclusion :** BlockTask démontre qu'il est possible de concilier inclusion financière locale et mécanismes de confiance distribuée, sans imposer la cryptomonnaie comme unique moyen de paiement au Mali.

---

## ABSTRACT *(English)*

**Title:** Decentralized Task Delegation Platform with Smart Contracts, Escrow and Reputation System — The Malian Market Case Study

**Keywords:** task delegation, digital platform, blockchain, smart contract, escrow, mobile money, Mali, hybrid architecture, reputation, KYC, NINA

Task delegation for physical services between individuals and businesses is a growing component of the digital economy. In Mali, this activity remains largely informal, hindered by lack of trust, limited escrow mechanisms, and the mismatch between international platforms and local payment rails (XOF, Orange Money, Moov Money).

This thesis presents the design, implementation, and evaluation of **BlockTask**, a hybrid web platform for secure matching between clients and service providers. The solution combines an **off-chain** layer (Angular 17, Django REST, PostgreSQL, Mobile Money payments) with an optional **on-chain** layer (Solidity smart contracts on Ethereum) to anchor critical commitments.

The work builds on a state-of-the-art review, UML and C4 modeling, and a functional prototype covering the full mission lifecycle: creation, escrow payment, application, deposit, execution, proofs, validation, and dispute handling. User identification relies on **NINA** (National Identification Number) and an admin-driven KYC process.

Testing — 11 automated backend tests (pytest), 15 smart contract tests (Hardhat), and 7 manual functional scenarios — confirms the technical feasibility of the hybrid model. Results show that 80% to 100% of the stated objectives were achieved, with future work toward production Mobile Money integration and UEMOA expansion.

**Conclusion:** BlockTask demonstrates that local financial inclusion and distributed trust mechanisms can be reconciled without requiring cryptocurrency as the sole payment method in Mali.

---

## LISTE DES ABRÉVIATIONS

| Abréviation | Signification |
|-------------|-------------|
| API | Application Programming Interface |
| B2B | Business to Business |
| BCEAO | Banque Centrale des États de l'Afrique de l'Ouest |
| C4 | Context, Containers, Components, Code (modèle d'architecture) |
| DRF | Django REST Framework |
| EVM | Ethereum Virtual Machine |
| FCFA / XOF | Franc de la Communauté Financière Africaine |
| GPS | Global Positioning System |
| JWT | JSON Web Token |
| KYC | Know Your Customer |
| MVP | Minimum Viable Product |
| NINA | Numéro d'Identification Nationale (Mali) |
| OTP | One-Time Password |
| REST | Representational State Transfer |
| RPC | Remote Procedure Call |
| SPA | Single Page Application |
| UEMOA | Union Économique et Monétaire Ouest-Africaine |
| UML | Unified Modeling Language |
| WS | WebSocket |

---

## TABLE DES MATIÈRES

*(Numérotation indicative — ajuster les numéros de page dans Word après mise en forme)*

### Parties liminaires
- Page de garde .......................................................... i
- Dédicace ............................................................... ii
- Remerciements .......................................................... iii
- Résumé ................................................................. iv
- Abstract ............................................................... v
- Liste des abréviations ................................................. vi
- Liste des figures ...................................................... vii
- Liste des tableaux ..................................................... ix
- Table des matières ..................................................... xi

### Introduction générale
**Chapitre 1 — Introduction générale** ................................... 1
- 1.1 Contexte ........................................................... 1
  - 1.1.1 Contexte général : économie numérique et plateformes de services
  - 1.1.2 Contexte africain et ouest-africain
  - 1.1.3 Contexte national : le Mali
  - 1.1.4 Contexte technologique du projet BlockTask
- 1.2 Problématique ...................................................... 5
  - 1.2.1 Constats et lacunes
  - 1.2.2 Question de recherche
  - 1.2.3 Intérêt scientifique et pratique
- 1.3 Objectifs .......................................................... 7
  - 1.3.1 Objectif général
  - 1.3.2 Objectifs spécifiques
  - 1.3.3 Hypothèses de travail
- 1.4 Méthodologie ....................................................... 9
  - 1.4.1 Approche globale
  - 1.4.2 Méthodes et techniques utilisées
  - 1.4.3 Outils et environnement
  - 1.4.4 Limites de la méthodologie
- 1.5 Organisation du mémoire ............................................. 11

### Corps du mémoire
**Chapitre 2 — État de l'art** .......................................... 13
- 2.1 Introduction
- 2.2 Concepts fondamentaux
- 2.3 Analyse des plateformes centralisées (Upwork, Fiverr, TaskRabbit)
- 2.4 Synthèse comparative des plateformes centralisées
- 2.5 Systèmes de réputation numériques
- 2.6 Blockchain, smart contracts et escrow décentralisé
- 2.7 Limites des approches purement blockchain
- 2.8 Plateformes décentralisées et travaux connexes
- 2.9 Tableau comparatif global et positionnement de BlockTask
- 2.10 Transition vers le modèle hybride
- 2.11 Conclusion du chapitre

**Chapitre 3 — Conception de la solution** .............................. 25
- 3.1 Introduction
- 3.2 Analyse du domaine
  - 3.2.1 Périmètre fonctionnel
  - 3.2.2 Acteurs du système
  - 3.2.3 Processus métier principal
  - 3.2.4 Règles de gestion
  - 3.2.5 Exigences fonctionnelles
  - 3.2.6 Exigences non fonctionnelles
- 3.3 Modélisation architecturale (C4)
- 3.4 Modélisation UML
- 3.5 Scénarios d'utilisation détaillés
- 3.6 Matrice de traçabilité conception → implémentation
- 3.7 Conclusion du chapitre

**Chapitre 4 — Implémentation** ......................................... 45
- 4.1 Introduction
- 4.2 Environnement de développement et outils
- 4.3 Architecture du système implémentée
- 4.4 Langages et technologies
- 4.5 Organisation du code source
- 4.6 Implémentation des fonctionnalités clés
- 4.7 Aspects sécuritaires
- 4.8 Déploiement et environnements
- 4.9 Tests implémentés
- 4.10 Difficultés d'implémentation
- 4.11 Conclusion du chapitre

**Chapitre 5 — Tests et validation du système** ......................... 65
- 5.1 Introduction
- 5.2 Stratégie et plan de test
- 5.3 Matrice de traçabilité exigences ↔ tests
- 5.4 Tests automatisés — Backend (pytest)
- 5.5 Tests automatisés — Smart contracts (Hardhat)
- 5.6 Tests fonctionnels manuels
- 5.7 Tests de sécurité
- 5.8 Résultats globaux et taux de couverture
- 5.9 Critères d'acceptation du prototype
- 5.10 Conclusion du chapitre

**Chapitre 6 — Discussion** ............................................. 80
- 6.1 Introduction
- 6.2 Rappel de la problématique et des objectifs
- 6.3 Discussion des résultats techniques
- 6.4 Atteinte des objectifs spécifiques
- 6.5 Forces du projet
- 6.6 Limites et menaces à la validité
- 6.7 Comparaison avec l'état de l'art
- 6.8 Apports du mémoire
- 6.9 Conclusion du chapitre

**Chapitre 7 — Conclusion générale et perspectives** .................... 92
- 7.1 Périmètre et rappel du projet
- 7.2 Synthèse des réalisations
- 7.3 Résultats obtenus
- 7.4 Difficultés rencontrées
- 7.5 Perspectives d'évolution
- 7.6 Mot de fin

### Parties finales
- Bibliographie ......................................................... 100
- Glossaire et mots-clés ................................................ 108
- Annexes ............................................................... 110
  - Annexe A : Diagrammes Mermaid (dossier `mermaid/`)
  - Annexe B : Extraits de code significatifs
  - Annexe C : Captures d'écran de l'application
  - Annexe D : Guide de déploiement (`README_MALI.md`)

---

## LISTE DES FIGURES

| N° | Intitulé | Source / Fichier | Page |
|----|----------|------------------|------|
| Figure 3.1 | Diagramme d'états — Cycle de vie d'une mission | `06-etats-mission.mmd` | |
| Figure 3.2 | Diagramme de contexte C4 — BlockTask | `01-contexte-c4.mmd` | |
| Figure 3.3 | Diagramme de conteneurs C4 — Architecture BlockTask | `02-conteneurs-c4.mmd` | |
| Figure 3.4 | Diagramme de composants — Backend Django | `03-composants-backend.mmd` | |
| Figure 3.5 | Diagramme de cas d'utilisation — BlockTask | `04-cas-utilisation.mmd` | |
| Figure 3.6 | Diagramme de classes — Cœur métier | `05-classes-metier.mmd` | |
| Figure 3.7 | Diagramme de séquence — Création mission et paiement FCFA | `07-sequence-creation-mission.mmd` | |
| Figure 3.8 | Diagramme de séquence — Caution, exécution et validation | `08-sequence-execution.mmd` | |
| Figure 3.9 | Diagramme d'activité — Processus global mission (vue compacte) | `09-activite-mission.mmd` | |
| Figure 3.10 | Diagramme de déploiement — Environnement prototype | `10-deploiement.mmd` | |
| Figure 3.11 | Architecture hybride — FCFA off-chain et blockchain on-chain | `11-architecture-hybride.mmd` | |
| Figure 3.12 | Flux financier escrow — Répartition 95 % / 5 % | `12-flux-paiement.mmd` | |
| Figure 4.1 | Capture — Page de connexion BlockTask | Annexe C | |
| Figure 4.2 | Capture — Création de mission (client, Mali) | Annexe C | |
| Figure 4.3 | Capture — Paiement Mobile Money (Orange / Moov) | Annexe C | |
| Figure 4.4 | Capture — Tableau de bord prestataire | Annexe C | |
| Figure 4.5 | Capture — Interface admin KYC | Annexe C | |
| Figure 4.6 | Capture — Page admin blockchain et sync événements | Annexe C | |
| Figure 5.1 | Capture — Résultats `pytest tests/ -v` | Annexe C | |
| Figure 5.2 | Capture — Résultats `npm test` (Hardhat) | Annexe C | |

*Légende : insérer les numéros de page après insertion des figures dans Word. Les figures 4.1 à 5.2 sont des captures à réaliser lors de la démonstration.*

---

## LISTE DES TABLEAUX

| N° | Intitulé | Chapitre | Page |
|----|----------|----------|------|
| Tableau 1.1 | Modèle hybride BlockTask — Couches et technologies | Ch. 1 | |
| Tableau 2.1 | Comparaison des plateformes centralisées (Upwork, Fiverr, TaskRabbit) | Ch. 2 | |
| Tableau 2.2 | Comparaison synthétique — Solutions existantes vs BlockTask | Ch. 2 | |
| Tableau 2.3 | Vulnérabilités des systèmes de réputation numériques | Ch. 2 | |
| Tableau 2.4 | Apports de la blockchain pour la délégation de tâches | Ch. 2 | |
| Tableau 2.5 | Limites des systèmes blockchain | Ch. 2 | |
| Tableau 2.6 | Modèle hybride BlockTask — Couches implémentées | Ch. 2 | |
| Tableau 3.1 | Périmètre fonctionnel BlockTask | Ch. 3 | |
| Tableau 3.2 | Acteurs du système | Ch. 3 | |
| Tableau 3.3 | États du cycle de vie d'une mission | Ch. 3 | |
| Tableau 3.4 | Règles de gestion (extrait) | Ch. 3 | |
| Tableau 3.5 | Exigences fonctionnelles principales | Ch. 3 | |
| Tableau 3.6 | Exigences non fonctionnelles | Ch. 3 | |
| Tableau 3.7 | Synthèse des cas d'utilisation | Ch. 3 | |
| Tableau 3.8 | Matrice de traçabilité conception → implémentation | Ch. 3 | |
| Tableau 4.1 | Outils utilisés par couche | Ch. 4 | |
| Tableau 4.2 | Langages de programmation | Ch. 4 | |
| Tableau 4.3 | Modules backend Django | Ch. 4 | |
| Tableau 4.4 | Actions API du workflow mission | Ch. 4 | |
| Tableau 4.5 | Fonctions EscrowContract Solidity | Ch. 4 | |
| Tableau 4.6 | API d'enregistrement blockchain | Ch. 4 | |
| Tableau 4.7 | Mesures de sécurité — Authentification | Ch. 4 | |
| Tableau 4.8 | Mesures de sécurité — Autorisation | Ch. 4 | |
| Tableau 4.9 | Protection des communications et données | Ch. 4 | |
| Tableau 4.10 | Mécanismes de sécurité des smart contracts | Ch. 4 | |
| Tableau 4.11 | Services Docker Compose | Ch. 4 | |
| Tableau 4.12 | Difficultés d'implémentation et solutions | Ch. 4 | |
| Tableau 5.1 | Couverture des exigences fonctionnelles | Ch. 5 | |
| Tableau 5.2 | Couverture des exigences non fonctionnelles | Ch. 5 | |
| Tableau 5.3 | Tests du flux MVP (pytest) | Ch. 5 | |
| Tableau 5.4 | Tests KYC et accès plateforme | Ch. 5 | |
| Tableau 5.5 | Tests rôles doubles | Ch. 5 | |
| Tableau 5.6 | Checklist sécurité | Ch. 5 | |
| Tableau 5.7 | Synthèse quantitative des tests | Ch. 5 | |
| Tableau 5.8 | Couverture par objectif spécifique (OS1–OS10) | Ch. 5 | |
| Tableau 5.9 | Lacunes identifiées dans la couverture de tests | Ch. 5 | |
| Tableau 6.1 | Bilan d'atteinte des objectifs spécifiques | Ch. 6 | |
| Tableau 6.2 | Validation des hypothèses de travail | Ch. 6 | |
| Tableau 6.3 | BlockTask vs alternatives — Synthèse post-implémentation | Ch. 6 | |
| Tableau 7.1 | Synthèse des réalisations du projet | Ch. 7 | |
| Tableau 7.2 | Difficultés rencontrées et solutions | Ch. 7 | |
| Tableau 7.3 | Perspectives d'évolution (court, moyen, long terme) | Ch. 7 | |
| Tableau G.1 | Glossaire — Définitions des termes principaux | Glossaire | |

*Insérer les numéros de page après pagination finale dans Word.*

---

## ANNEXES *(liste indicative)*

- **Annexe A** — Diagrammes Mermaid complets (`rapport memoire/mermaid/`)
- **Annexe B** — Extraits de code : `EscrowContract.sol`, `kyc_access.py`, `africa_config.py`
- **Annexe C** — Captures d'écran de l'application BlockTask
- **Annexe D** — Guide de déploiement blockchain Mali (`smart-contracts/README_MALI.md`)
- **Annexe E** — Résultats complets des tests (`pytest`, Hardhat`)

---

*Document généré pour le mémoire BlockTask — à intégrer dans le fichier Word principal.*
