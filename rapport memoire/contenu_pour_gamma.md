# Prompt pour Gamma — Présentation de soutenance BlockTask

Génère une présentation professionnelle de soutenance académique, environ 16 slides, avec un design moderne et sobre. Le public est un jury de Master en informatique. Privilégie les paragraphes courts, les tableaux clairs et les espaces pour insérer des diagrammes et captures d'écran. Utilise le contenu ci-dessous, slide par slide.

---

## Slide 1 — Titre

**Titre :** BlockTask

**Sous-titre :** Plateforme hybride de délégation sécurisée de tâches physiques — cas du Mali

**Contexte :** Soutenance de mémoire de fin d'études, Master ILSI

**Visuel :** logo du projet (BlockTask)

---

## Slide 2 — Introduction et contexte

**Titre :** Pourquoi BlockTask ?

La transformation numérique modifie profondément les modes d'organisation du travail. Au Mali, l'économie à la tâche reste largement informelle : courses, livraisons, petits services et assistance quotidienne sont organisés par bouche-à-oreille ou réseaux sociaux. Ce phénomène s'accompagne d'une méfiance récurrente entre client et prestataire, d'un manque de mécanismes de séquestre accessibles et d'une inadéquation des plateformes internationales aux moyens de paiement locaux. Le Mobile Money, en revanche, est massivement adopté : Orange Money et Moov Money structurent une grande partie des flux financiers quotidiens.

BlockTask naît de ce constat : il est possible de proposer une plateforme de mise en relation sécurisée, adaptée au Mali, en combinant paiements Mobile Money en FCFA et ancrage optionnel sur blockchain.

**Visuel suggéré :** une infographie montrant les trois piliers : confiance, paiement local, traçabilité.

---

## Slide 3 — Problématique

**Titre :** Problématique de recherche

La question centrale de ce mémoire est la suivante : comment concevoir et mettre en œuvre une plateforme numérique de délégation de tâches, adaptée au contexte malien, avec le FCFA, le Mobile Money et le NINA comme leviers d'identité, tout en intégrant de manière hybride la blockchain pour renforcer la confiance transactionnelle, sans imposer la cryptomonnaie à des utilisateurs peu technophiles ?

Cette problématique se décline en quatre sous-questions : quels concepts de l'état de l'art sont pertinents pour le Mali ? Quelle architecture permet de coupler backend centralisé, paiements Mobile Money et couche blockchain optionnelle ? Quels mécanismes de sécurité, d'identification et de preuve d'exécution sont nécessaires ? Enfin, dans quelle mesure le prototype répond-il aux objectifs fixés ?

**Visuel suggéré :** schéma de la question centrale avec les quatre piliers : Mobile Money, NINA, blockchain, utilisabilité.

---

## Slide 4 — Objectifs du mémoire

**Titre :** Objectifs spécifiques

Le travail s'articule autour de dix objectifs spécifiques, organisés selon une progression classique : analyse, conception, implémentation, test et évaluation.

| N° | Objectif spécifique | Résultat attendu |
|---|---|---|
| OS1 | Analyser le domaine et l'état de l'art | Cartographie des concepts et identification des lacunes |
| OS2 | Spécifier les besoins | Modèles UML et C4 du système |
| OS3 | Concevoir une architecture modulaire | Stack Angular / Django / PostgreSQL / Redis / Solidity |
| OS4 | Implémenter les espaces utilisateurs | Modules client, prestataire, entreprise et administrateur |
| OS5 | Intégrer les paiements Mobile Money | Flux Orange Money / Moov Money en sandbox (FCFA) |
| OS6 | Intégrer la couche blockchain | Smart contracts Escrow, Réputation et Litigation |
| OS7 | Sécurité et conformité | JWT, KYC NINA, gestion des rôles |
| OS8 | Suivi et preuves d'exécution | GPS temps réel et preuves photographiques |
| OS9 | Tester et valider le système | Scénarios de test et tests automatisés |
| OS10 | Évaluer l'atteinte des objectifs | Discussion critique et perspectives |

Les trois hypothèses de travail sont : (H1) un modèle hybride Mobile Money + blockchain est plus adapté au Mali qu'une solution exclusivement crypto ou centralisée ; (H2) les smart contracts améliorent la traçabilité et la perception de confiance ; (H3) une architecture monolithique modulaire permet de livrer un prototype cohérent dans le délai d'un mémoire de Master.

---

## Slide 5 — État de l'art et positionnement

**Titre :** Positionnement par rapport à l'état de l'art

Les plateformes de référence peuvent être classées en deux catégories. D'un côté, les plateformes centralisées comme Upwork, Fiverr et TaskRabbit proposent des mécanismes matures de mise en relation, d'escrow et de réputation, mais elles sont centrées sur les paiements internationaux et les marchés développés, avec une faible adaptabilité au Mali. De l'autre, les plateformes décentralisées comme Ethlance ou Braintrust utilisent la blockchain pour l'immuabilité et la transparence, mais elles imposent la cryptomonnaie comme unique moyen de paiement, ce qui exclut une majorité d'utilisateurs maliens.

BlockTask se positionne entre ces deux mondes : un modèle hybride qui conserve la facilité d'usage et le paiement Mobile Money en FCFA, tout en ajoutant un ancrage optionnel sur blockchain pour les engagements critiques.

| Critère | Upwork / Fiverr / TaskRabbit | Ethlance / Braintrust | BlockTask |
|---|---|---|---|
| Paiement Mali (FCFA / Mobile Money) | Non | Non | Oui |
| Tâches physiques localisées | Partiel | Non | Oui |
| Immuabilité des engagements | Non | Oui | Optionnelle |
| Facilité d'usage sans crypto | Oui | Non | Oui |
| KYC local (NINA) | Non | Non | Oui |

**Visuel suggéré :** logos des plateformes comparées + flèche de positionnement BlockTask.

---

## Slide 6 — Architecture globale

**Titre :** Architecture technique hybride

L'architecture de BlockTask repose sur une séparation claire entre les traitements off-chain et les ancrages optionnels on-chain. Le frontend web est développé avec Angular 17 et Angular Material. L'application mobile est développée avec React Native et Expo SDK 52. Le backend est une API REST Django 4.2 avec Django REST Framework, PostgreSQL pour les données, Redis et Django Channels pour les WebSockets, et Celery pour les tâches asynchrones. La couche blockchain utilise Solidity et Hardhat, avec un déploiement sur le testnet Sepolia. Le déploiement en production est réalisé sur Render pour le backend et le frontend web, avec une configuration Railway également préparée.

| Couche | Technologie | Rôle |
|---|---|---|
| Frontend web | Angular 17 + Material | Interface client, prestataire, admin |
| Mobile | React Native + Expo SDK 52 | Application Android/iOS |
| Backend | Django 4.2 + DRF | API REST, logique métier |
| Base de données | PostgreSQL | Données transactionnelles |
| Temps réel | Redis + Channels + Celery | WebSockets, files, tâches async |
| Blockchain | Solidity + Hardhat | Smart contracts, testnet Sepolia |
| Déploiement | Render + Railway | Production web et backend |

**Visuel suggéré :** Figure 3.3 — Diagramme de conteneurs C4 de BlockTask.

---

## Slide 7 — Cycle de vie d'une mission

**Titre :** Cycle de vie d'une mission

Le cœur métier de BlockTask est le cycle de vie d'une mission. Tout commence par la création d'une mission par un client. Le client finance ensuite la mission via Mobile Money en FCFA : les fonds sont bloqués en escrow. Les prestataires peuvent alors postuler. Le client sélectionne un prestataire, qui doit déposer une caution dans un délai de quatre heures. Une fois la caution reçue, la mission démarre. Le prestataire exécute la tâche et soumet des preuves (photos, géolocalisation). Le client valide, et les fonds sont libérés selon la répartition 95 % pour le prestataire et 5 % pour la plateforme. En cas de désaccord, un litige peut être ouvert à tout moment et traité par un administrateur.

| Étape | Action | Transition de statut |
|---|---|---|
| Création | Le client publie la mission | pending |
| Paiement | Mobile Money sandbox, fonds bloqués | funded |
| Candidature | Prestataires postulent | — |
| Acceptation | Le client choisit un prestataire | accepted |
| Caution | Dépôt dans les 4 heures | deposit_paid |
| Exécution | Démarrage et suivi GPS | in_progress |
| Preuves | Soumission de photos | submitted |
| Validation | Le client valide | completed |
| Litige | Arbitrage admin | disputed |

**Visuel suggéré :** Figure 3.1 — Diagramme d'états du cycle de vie d'une mission.

---

## Slide 8 — Fonctionnalités clés implémentées

**Titre :** Fonctionnalités clés du prototype

Le prototype implémente l'ensemble des espaces utilisateurs et des fonctionnalités nécessaires au cycle mission. L'authentification repose sur des tokens JWT avec access token d'une heure et refresh token de sept jours, avec rotation et blacklist. Un utilisateur peut avoir plusieurs rôles : par exemple, un prestataire reçoit automatiquement le rôle secondaire de client. Le KYC utilise le NINA malien et une validation administrative des documents. Les paiements Mobile Money en sandbox simulent Orange Money et Moov Money avec un OTP de test universel. La caution est calculée dynamiquement entre 2 000 et 5 000 XOF selon la réputation du prestataire.

Des fonctionnalités complémentaires ont été intégrées : un chat mission entre client et prestataire, une double authentification TOTP, un suivi GPS temps réel via WebSocket, la soumission de preuves photographiques et une analyse automatique des preuves en cours d'intégration.

**Visuel suggéré :** captures d'écran des interfaces web et mobile : dashboard client, dashboard prestataire, détail mission, validation KYC.

---

## Slide 9 — Sécurité et confiance

**Titre :** Sécurité multi-couche

La sécurité est traitée à quatre niveaux. L'authentification utilise le hachage PBKDF2 de Django pour les mots de passe, des tokens JWT à durée limitée et une historisation des connexions. L'autorisation repose sur des permissions Django REST Framework, des guards Angular et un contrôle KYC bloquant qui empêche l'accès aux fonctionnalités critiques tant que l'identité n'est pas vérifiée. Les communications sont protégées par le middleware CSRF, une liste CORS restreinte, l'ORM Django contre les injections SQL, et la sanitization Angular contre les attaques XSS. Enfin, la sécurité financière repose sur le blocage des fonds mission tant que le statut n'est pas completed, le verrouillage de la caution sur ProviderDeposit et le calcul côté serveur de la commission de 5 %.

Les smart contracts héritent des bonnes pratiques OpenZeppelin : ReentrancyGuard contre la réentrance, Ownable pour restreindre les actions sensibles, Pausable pour l'arrêt d'urgence, et un plafond de commission.

**Visuel suggéré :** schéma du flux JWT + KYC + guards Angular, ou liste des contrôles de sécurité sous forme d'icônes.

---

## Slide 10 — Déploiement et environnements

**Titre :** Déploiement et environnements

Le projet peut être exécuté en local via Docker Compose, qui orchestre PostgreSQL, Redis, le backend Django, le frontend Angular et le worker Celery. En production, le prototype est déployé sur Render : le backend Django est connecté à une base PostgreSQL managée, le frontend Angular est servi comme site statique après un build de production, et Redis est utilisé pour les WebSockets et les files de tâches. Une configuration Railway est également préparée. L'application mobile est générée sous forme d'APK Android via Android Studio et Gradle, à partir du projet Expo prébuildé.

| Environnement | Stack | Usage |
|---|---|---|
| Développement local | Docker Compose | Tests et itération |
| Production web | Render | Backend + frontend accessibles en ligne |
| Cache / files | Redis Render | WebSockets, Celery, sessions |
| Mobile | Expo + Gradle | APK Android installable |
| Blockchain | Sepolia / Hardhat | Démonstration et tests |

**Visuel suggéré :** Figure 3.10 — Diagramme de déploiement de l'environnement prototype.

---

## Slide 11 — Tests et validation

**Titre :** Stratégie de test et résultats

La validation repose sur une stratégie multi-niveaux. Le backend est testé avec onze tests pytest couvrant le flux MVP, les rôles doubles, le KYC, le flux entreprise et l'expiration automatique des missions. Les smart contracts sont testés avec quinze tests Hardhat sur les contrats Escrow, Réputation et Litigation. Sept scénarios fonctionnels manuels complètent ces tests en couvrant l'inscription, le KYC, la création et le paiement d'une mission, la candidature, la caution, l'exécution, la validation et les litiges. L'intégration continue est assurée par GitHub Actions, qui exécute pytest et le build Angular à chaque push.

| Couche | Nombre | Domaines couverts |
|---|---|---|
| Backend Django | 11 tests | Missions, KYC, rôles, litiges, réputation, entreprise, expiration |
| Smart contracts | 15 tests | Escrow, réputation, litigation |
| Scénarios manuels | 7 parcours | UI, Mobile Money, admin, blockchain |
| Intégration continue | GitHub Actions | pytest + build Angular automatiques |
| Total automatisé | 26 tests | — |

**Visuel suggéré :** Tableau 5.7 — Synthèse quantitative des tests, ou badge de couverture.

---

## Slide 12 — Résultats et discussion

**Titre :** Résultats et discussion

Les résultats obtenus confirment la faisabilité technique du modèle hybride. Le flux mission complet est fonctionnel en FCFA sans nécessiter de portefeuille crypto. Les tests automatisés et manuels valident les mécanismes d'escrow, de KYC, de réputation et de litiges. Les objectifs sont atteints à hauteur de 80 à 100 % selon les critères retenus.

Les forces du projet résident dans sa contextualisation au Mali : paiement Mobile Money, NINA, FCFA, interface en français, architecture documentée. Les limites sont celles d'un prototype de recherche : les paiements restent en sandbox, la blockchain est sur testnet, il n'y a pas encore d'audit externe des smart contracts, et l'évaluation ne repose pas sur une étude utilisateur à grande échelle sur le terrain.

| Hypothèse | Verdict | Justification |
|---|---|---|
| H1 — Hybride adapté au Mali | Confirmée | Flux FCFA autonome + ancrage optionnel |
| H2 — Smart contracts améliorent la confiance | Partiellement confirmée | Traçabilité oui, perception utilisateur dépend du KYC et Mobile Money |
| H3 — Monolithe modulaire viable | Confirmée | Prototype livré dans les délais, structure évolutive |

---

## Slide 13 — Perspectives d'évolution

**Titre :** Perspectives d'évolution

Le projet ouvre plusieurs perspectives, classées par horizon temporel.

| Horizon | Actions prévues |
|---|---|
| Court terme (3–6 mois) | Intégration API Mobile Money production, finalisation et distribution de l'APK Android, tests E2E frontend, audit interne complémentaire des smart contracts |
| Moyen terme (6–18 mois) | Extension UEMOA (Sénégal, Côte d'Ivoire, Burkina), oracles Chainlink pour attestation on-chain des preuves, pont FCFA/stablecoin, étude utilisateur terrain à Bamako |
| Long terme (18 mois +) | Passage mainnet après audit externe, gouvernance décentralisée (DAO), IA pour détection de fraude et estimation des prix, partenariats télécoms et microfinance |

Ces perspectives montrent que BlockTask peut évoluer d'un prototype de recherche vers une solution opérationnelle à l'échelle ouest-africaine.

---

## Slide 14 — Démonstration

**Titre :** Démonstration du prototype

La démonstration illustre le parcours complet d'une mission. Elle commence par la connexion d'un client et d'un prestataire. Le client crée une mission et effectue le paiement via Orange Money sandbox. Le prestataire consulte les missions disponibles, postule, est accepté par le client, puis dépose sa caution. Il démarre la mission, partage sa position GPS en temps réel et soumet des preuves photographiques. Le client valide la mission, ce qui déclenche la libération des fonds. Enfin, l'espace administrateur permet de valider les dossiers KYC et de gérer les litiges.

**Visuel :** capture d'écran ou vidéo de démonstration en plein écran.

---

## Slide 15 — Conclusion

**Titre :** Conclusion

Ce mémoire a présenté la conception, l'implémentation et l'évaluation de BlockTask, une plateforme hybride de délégation sécurisée de tâches physiques adaptée au Mali. La solution démontre qu'il est possible de concilier inclusion financière locale via Mobile Money et mécanismes de confiance distribuée via blockchain, sans imposer la cryptomonnaie comme unique moyen de paiement. Les objectifs principaux sont atteints, les hypothèses H1 et H3 sont confirmées, et le prototype constitue une base solide pour une future évolution vers l'UEMOA et la production.

**Message clé :** BlockTask propose une voie intermédiaire entre inclusion financière locale, confiance institutionnelle par KYC NINA et traçabilité renforcée par smart contracts.

---

## Slide 16 — Remerciements

**Titre :** Merci de votre attention

**Sous-titre :** Questions ?

**Visuel :** logo BlockTask + coordonnées ou QR code vers le dépôt GitHub.
