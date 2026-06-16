# Guide de Déploiement des Smart Contracts BlockTask avec Remix

Ce guide vous accompagne pas à pas dans le déploiement des smart contracts BlockTask sur la blockchain Ethereum en utilisant Remix IDE.

## 📋 Prérequis

- Un navigateur web moderne (Chrome, Firefox, Edge)
- Un wallet MetaMask installé et configuré
- Des ETH de test sur le réseau Sepolia (obtenables via [faucets](https://sepoliafaucet.com/))

## 🚀 Étape 1: Accéder à Remix

1. Ouvrez votre navigateur et allez sur [https://remix.ethereum.org/](https://remix.ethereum.org/)
2. Remix se chargera automatiquement dans votre navigateur

## 📁 Étape 2: Créer les fichiers de contrats

### 2.1 Créer le dossier du projet

1. Dans le panneau de gauche (File Explorers), cliquez sur l'icône "Create New File"
2. Nommez le dossier `BlockTaskContracts`

### 2.2 Importer les contrats OpenZeppelin

Remix permet d'importer directement les contrats OpenZeppelin. Nous allons utiliser les imports dans nos fichiers.

### 2.3 Créer le fichier EscrowContract.sol

1. Cliquez sur "Create New File"
2. Nommez-le `EscrowContract.sol`
3. Copiez le contenu du fichier `EscrowContract.sol` du dossier `smart-contracts` de votre projet
4. Collez-le dans l'éditeur Remix

### 2.4 Créer le fichier ReputationContract.sol

1. Cliquez sur "Create New File"
2. Nommez-le `ReputationContract.sol`
3. Copiez le contenu du fichier `ReputationContract.sol` du dossier `smart-contracts` de votre projet
4. Collez-le dans l'éditeur Remix

### 2.5 Créer le fichier LitigationContract.sol

1. Cliquez sur "Create New File"
2. Nommez-le `LitigationContract.sol`
3. Copiez le contenu du fichier `LitigationContract.sol` du dossier `smart-contracts` de votre projet
4. Collez-le dans l'éditeur Remix

## 🔧 Étape 3: Compiler les contrats

### 3.1 Activer le plugin Solidity Compiler

1. Cliquez sur l'icône "Solidity Compiler" dans la barre de gauche (icône avec un S)
2. Le panneau du compilateur s'ouvrira

### 3.2 Compiler EscrowContract.sol

1. Sélectionnez `EscrowContract.sol` dans le File Explorer
2. Dans le panneau du compilateur:
   - Sélectionnez la version `0.8.20` (ou supérieure)
   - Cliquez sur le bouton "Compile EscrowContract.sol"
3. Attendez que la compilation réussisse (une coche verte apparaîtra)

### 3.3 Compiler les autres contrats

1. Sélectionnez `ReputationContract.sol`
2. Cliquez sur "Compile ReputationContract.sol"
3. Sélectionnez `LitigationContract.sol`
4. Cliquez sur "Compile LitigationContract.sol"

**Note:** Si vous avez des erreurs d'import OpenZeppelin, vous devez installer les packages OpenZeppelin:
- Cliquez sur l'icône "Plugin Manager" (icône de plug dans la barre inférieure)
- Activez le plugin "DGit"
- Dans le panneau DGit, cliquez sur "Clone"
- Entrez l'URL: `https://github.com/OpenZeppelin/openzeppelin-contracts.git`
- Une fois cloné, les imports fonctionneront

## 🔗 Étape 4: Configurer MetaMask

### 4.1 Connecter MetaMask à Remix

1. Assurez-vous que MetaMask est installé et déverrouillé
2. Dans Remix, cliquez sur l'icône "Deploy & Run Transactions" (icône Ethereum)
3. Dans la section "Environment", sélectionnez "Injected Provider - MetaMask"
4. MetaMask demandera l'autorisation de connexion - cliquez sur "Next" puis "Connect"

### 4.5 Configurer le réseau Sepolia

1. Dans MetaMask, assurez-vous d'être sur le réseau Sepolia
2. Si ce n'est pas le cas:
   - Cliquez sur le nom du réseau en haut
   - Cliquez sur "Add Network" > "Add a network manually"
   - Entrez les informations Sepolia:
     - Network Name: Sepolia Test Network
     - New RPC URL: https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
     - Chain ID: 11155111
     - Currency Symbol: ETH
   - Cliquez sur "Save"

### 4.6 Obtenir des ETH de test

1. Allez sur [https://sepoliafaucet.com/](https://sepoliafaucet.com/)
2. Entrez votre adresse MetaMask
3. Cliquez sur "Send Me ETH"
4. Attendez quelques minutes pour recevoir les fonds

## 🚢 Étape 5: Déployer les contrats

### 5.1 Déployer ReputationContract

1. Dans le panneau "Deploy & Run Transactions":
   - Sélectionnez `ReputationContract` dans le menu déroulant "Contract"
   - Laissez les paramètres par défaut
   - Cliquez sur le bouton "Deploy"
2. MetaMask s'ouvrira pour confirmer la transaction
3. Cliquez sur "Confirm" et attendez la confirmation
4. Une fois déployé, le contrat apparaîtra dans la section "Deployed Contracts"
5. **IMPORTANT:** Copiez l'adresse du contrat déployé (en bas à gauche du contrat déployé)

### 5.2 Déployer EscrowContract

1. Sélectionnez `EscrowContract` dans le menu déroulant "Contract"
2. Laissez les paramètres par défaut
3. Cliquez sur "Deploy"
4. Confirmez la transaction dans MetaMask
5. Copiez l'adresse du contrat déployé

### 5.3 Déployer LitigationContract

1. Sélectionnez `LitigationContract` dans le menu déroulant "Contract"
2. Dans le champ `_escrowContract`, entrez l'adresse du contrat Escrow déployé à l'étape précédente
3. Cliquez sur "Deploy"
4. Confirmez la transaction dans MetaMask
5. Copiez l'adresse du contrat déployé

## 📝 Étape 6: Enregistrer les adresses des contrats

Créez un fichier `contract-addresses.txt` dans votre projet avec les adresses déployées:

```
# Adresses des contrats déployés sur Sepolia
EscrowContract: 0x...
ReputationContract: 0x...
LitigationContract: 0x...
Date de déploiement: JJ/MM/AAAA
```

## ✅ Étape 7: Tester les contrats

### 7.1 Tester EscrowContract

1. Dans la section "Deployed Contracts", cliquez sur `EscrowContract`
2. Testez la fonction `createMission`:
   - Entrez un hash de mission (ex: "mission-001")
   - Entrez un deadline (timestamp futur, ex: 1700000000)
   - Entrez un montant en ETH (ex: 0.1)
   - Cliquez sur "createMission"
   - Confirmez dans MetaMask
3. Vérifiez que la mission a été créée avec `getMissionInfo`

### 7.2 Tester ReputationContract

1. Cliquez sur `ReputationContract` dans "Deployed Contracts"
2. Testez `getReputationScore` avec votre adresse
3. Testez `calculateRequiredDeposit` avec votre adresse et un montant

### 7.3 Tester LitigationContract

1. Cliquez sur `LitigationContract` dans "Deployed Contracts"
2. Testez `openLitigation` avec un ID de mission et une raison

## 🔐 Étape 8: Vérifier sur Etherscan

1. Allez sur [https://sepolia.etherscan.io/](https://sepolia.etherscan.io/)
2. Entrez l'adresse d'un contrat déployé
3. Vérifiez que le contrat est bien déployé et vérifié

## 📊 Étape 9: Mettre à jour la configuration backend

Une fois les contrats déployés, mettez à jour le fichier `application.properties` du blockchain-bridge-service:

```properties
# Remplacez les adresses par celles de vos contrats déployés
blockchain.escrow-contract-address=0xVOTRE_ADRESSE_ESCROW
blockchain.reputation-contract-address=0xVOTRE_ADRESSE_REPUTATION
blockchain.litigation-contract-address=0xVOTRE_ADRESSE_LITIGATION
```

## 🎯 Étape suivante: Génération des wrappers Java

Après le déploiement, vous devrez générer les wrappers Java avec Web3j pour intégrer les contrats dans votre backend. Cela sera détaillé dans le guide suivant.

## 💡 Conseils

- Gardez toujours une sauvegarde de vos adresses de contrat
- Testez d'abord sur Sepolia avant de déployer sur Mainnet
- Utilisez des montants faibles pour les tests
- Vérifiez toujours les transactions dans MetaMask avant de confirmer
- Gardez vos clés privées en sécurité

## 🔧 Dépannage

### Erreur: "Insufficient funds"
- Assurez-vous d'avoir des ETH de test sur Sepolia
- Utilisez un faucet pour obtenir plus de fonds

### Erreur: "Contract creation code overlap"
- Changez de compte MetaMask ou attendez quelques blocs

### Erreur: "Gas required exceeds allowance"
- Augmentez la limite de gaz dans MetaMask

### Erreur d'import OpenZeppelin
- Utilisez le plugin DGit pour cloner OpenZeppelin
- Ou utilisez les imports avec l'URL complète

## 📚 Ressources utiles

- [Remix Documentation](https://remix-ide.readthedocs.io/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [MetaMask Documentation](https://docs.metamask.io/)
- [Sepolia Faucet](https://sepoliafaucet.com/)
