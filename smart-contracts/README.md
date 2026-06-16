# Smart Contracts BlockTask

Ce dossier contient les smart contracts Solidity pour la plateforme BlockTask, ainsi que les guides pour leur déploiement et intégration.

## 📁 Structure

```
smart-contracts/
├── EscrowContract.sol           # Contrat de gestion des fonds en escrow
├── ReputationContract.sol       # Contrat de gestion de la réputation
├── LitigationContract.sol       # Contrat de gestion des litiges
├── README_REMIX_GUIDE.md        # Guide de déploiement avec Remix
├── README_WEB3J_GUIDE.md        # Guide d'intégration Java avec Web3j
└── README.md                   # Ce fichier
```

## 🎯 Vue d'ensemble des contrats

### 1. EscrowContract

Gère le blocage sécurisé des fonds et les paiements conditionnels:

- **Fonctionnalités principales:**
  - Création de missions avec blocage de fonds
  - Acceptation de missions par les prestataires
  - Dépôt de caution par les prestataires
  - Soumission de preuves d'exécution
  - Validation de missions et libération automatique des fonds
  - Annulation de missions et remboursement
  - Gestion des frais de plateforme

- **Sécurité:**
  - Protection contre les reentrancy attacks
  - Pattern Checks-Effects-Interactions
  - Possibilité de pause en cas d'urgence
  - Gestion des droits d'accès (Ownable)

### 2. ReputationContract

Gère le système de réputation algorithmique:

- **Fonctionnalités principales:**
  - Calcul des scores de réputation (0-100)
  - Mise à jour des scores après chaque mission
  - Calcul dynamique des cautions basé sur la réputation
  - Suivi des statistiques de performance
  - Vérification d'éligibilité pour les missions

- **Algorithme de score:**
  - Taux de réussite (40% du score)
  - Évaluation moyenne (30% du score)
  - Taux de litiges (20% du score)
  - Volume de missions (10% du score)

### 3. LitigationContract

Gère les litiges et l'arbitrage:

- **Fonctionnalités principales:**
  - Ouverture de litiges
  - Soumission de preuves pour l'arbitrage
  - Enregistrement des décisions d'arbitrage
  - Exécution automatique des décisions
  - Historique immuable des litiges

- **Décisions possibles:**
  - Client gagne (remboursement complet)
  - Prestataire gagne (paiement complet)
  - Partage (50/50)

## 🚀 Guide de démarrage rapide

### Étape 1: Déployer les contrats avec Remix

Suivez le guide détaillé: [README_REMIX_GUIDE.md](README_REMIX_GUIDE.md)

**Résumé:**
1. Ouvrir [https://remix.ethereum.org/](https://remix.ethereum.org/)
2. Créer les fichiers de contrats
3. Compiler les contrats
4. Connecter MetaMask
5. Déployer sur Sepolia
6. Copier les adresses des contrats

### Étape 2: Intégrer avec le backend Java

Suivez le guide détaillé: [README_WEB3J_GUIDE.md](README_WEB3J_GUIDE.md)

**Résumé:**
1. Exporter les ABI et bytecode depuis Remix
2. Générer les wrappers Java avec Web3j
3. Mettre à jour les services de contrat
4. Configurer les variables d'environnement
5. Tester l'intégration

## 🔐 Sécurité

### Bonnes pratiques

- **Jamais** committer de clés privées
- Toujours tester sur Sepolia avant Mainnet
- Utiliser des audits de sécurité pour les contrats
- Implémenter des mécanismes de pause
- Surveiller les événements de sécurité

### Patterns de sécurité implémentés

- **ReentrancyGuard:** Protection contre les attaques de reentrancy
- **Ownable:** Gestion des droits d'administration
- **Pausable:** Possibilité d'arrêter le contrat en cas d'urgence
- **Checks-Effects-Interactions:** Pattern de sécurité standard

## 📊 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Backend Microservices                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Blockchain Bridge Service                  │  │
│  │  ┌────────────────────────────────────────────┐   │  │
│  │  │  EscrowContractService                     │   │  │
│  │  │  ReputationContractService                 │   │  │
│  │  │  LitigationContractService                 │   │  │
│  │  └────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          │ Web3j
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    Blockchain Ethereum                   │
│  ┌──────────────────────────────────────────────────┐  │
│  │  EscrowContract                                  │  │
│  │  ReputationContract                              │  │
│  │  LitigationContract                              │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## 🧪 Tests

### Tests unitaires (à implémenter)

```solidity
// Exemple de test pour EscrowContract
function testCreateMission() public {
    uint256 missionId = escrow.createMission("test-hash", block.timestamp + 86400);
    assertEq(missionId, 1);
}
```

### Tests d'intégration (à implémenter)

```java
@Test
void testCreateMissionIntegration() {
    BlockchainTransactionResponse response = blockchainService.createMission(
        "test-hash", 
        BigInteger.valueOf(1000000000000000000L), 
        BigInteger.valueOf(1700000000L)
    );
    assertNotNull(response.getTransactionHash());
}
```

## 📈 Coûts estimés (Sepolia)

- **Déploiement EscrowContract:** ~0.01 ETH
- **Déploiement ReputationContract:** ~0.005 ETH
- **Déploiement LitigationContract:** ~0.005 ETH
- **Transaction createMission:** ~0.0005 ETH
- **Transaction validateMission:** ~0.0003 ETH

## 🔗 Liens utiles

- [Remix IDE](https://remix.ethereum.org/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Web3j Documentation](https://docs.web3j.io/)
- [Solidity Documentation](https://docs.soliditylang.org/)
- [Sepolia Faucet](https://sepoliafaucet.com/)
- [Etherscan Sepolia](https://sepolia.etherscan.io/)

## 📝 Notes de développement

### Version actuelle: 1.0.0

- Solidity: ^0.8.20
- OpenZeppelin: 4.x
- Web3j: 4.9.8

### Améliorations futures

- [ ] Implémenter un système de gouvernance (DAO)
- [ ] Ajouter des mécanismes de slashing pour les comportements malveillants
- [ ] Optimiser les coûts de gaz avec des patterns de stockage plus efficaces
- [ ] Implémenter un système de staking pour les prestataires
- [ ] Ajouter des oracles pour les données off-chain

## 🤝 Contribution

Pour contribuer aux smart contracts:

1. Fork le projet
2. Créer une branche pour votre fonctionnalité
3. Écrire des tests complets
4. Soumettre une pull request

## 📄 Licence

MIT License - Voir le fichier LICENSE pour plus de détails.

## 👥 Équipe

BlockTask Team - Master MrMaiga

---

**Note importante:** Ces contrats sont fournis à des fins éducatives et de prototype. Pour une utilisation en production, un audit de sécurité complet est requis.
