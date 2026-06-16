# Guide de Génération des Wrappers Java avec Web3j

Ce guide explique comment générer les wrappers Java pour les smart contracts BlockTask en utilisant Web3j.

## 📋 Prérequis

- Java 17 ou supérieur
- Maven installé
- Les smart contracts déployés sur Sepolia (voir guide Remix)
- Les adresses des contrats déployées

## 🚀 Étape 1: Préparer les fichiers ABI

### 1.1 Exporter l'ABI depuis Remix

Pour chaque contrat déployé dans Remix:

1. Dans Remix, cliquez sur le contrat dans "Deployed Contracts"
2. Cliquez sur l'icône "Copy ABI" (icône de copie)
3. Créez un fichier `EscrowContract.abi` dans le dossier `smart-contracts/abi`
4. Collez le contenu de l'ABI
5. Répétez pour `ReputationContract.abi` et `LitigationContract.abi`

### 1.2 Alternative: Utiliser le plugin Web3j dans Remix

1. Dans Remix, activez le plugin "Web3j"
2. Sélectionnez le contrat compilé
3. Cliquez sur "Generate Java Wrapper"
4. Téléchargez le fichier ZIP généré

## 🔧 Étape 2: Utiliser le plugin Maven Web3j

Le blockchain-bridge-service est déjà configuré avec le plugin Web3j Maven. Voici comment l'utiliser:

### 2.1 Placer les fichiers ABI

Créez la structure de dossiers suivante dans le blockchain-bridge-service:

```
blockchain-bridge-service/
├── src/
│   ├── main/
│   │   ├── resources/
│   │   │   └── contracts/
│   │   │       ├── EscrowContract.abi
│   │   │       ├── EscrowContract.bin
│   │   │       ├── ReputationContract.abi
│   │   │       ├── ReputationContract.bin
│   │   │       ├── LitigationContract.abi
│   │   │       └── LitigationContract.bin
```

### 2.2 Exporter le bytecode (bin) depuis Remix

Pour chaque contrat:

1. Dans Remix, après compilation, cliquez sur le bouton "Compilation Details"
2. Copiez le "OBJECT BYTECODE"
3. Créez un fichier `.bin` correspondant et collez le bytecode

### 2.3 Générer les wrappers avec Maven

Naviguez vers le dossier `blockchain-bridge-service` et exécutez:

```bash
cd backend_microservices/blockchain-bridge-service
mvn web3j:generate
```

Cela générera les classes Java dans `src/main/java/com/blocktask/blockchain_bridge/contract/`.

## 🛠️ Étape 3: Alternative - Génération manuelle avec Web3j CLI

Si le plugin Maven ne fonctionne pas, vous pouvez utiliser la CLI Web3j:

### 3.1 Installer Web3j CLI

```bash
# Via npm
npm install -g web3j

# Ou via Homebrew (Mac)
brew install web3j

# Ou télécharger depuis https://github.com/web3j/web3j-cli/releases
```

### 3.2 Générer les wrappers

Pour chaque contrat:

```bash
# EscrowContract
web3j generate solidity \
  -a src/main/resources/contracts/EscrowContract.abi \
  -b src/main/resources/contracts/EscrowContract.bin \
  -p com.blocktask.blockchain_bridge.contract \
  -o src/main/java

# ReputationContract
web3j generate solidity \
  -a src/main/resources/contracts/ReputationContract.abi \
  -b src/main/resources/contracts/ReputationContract.bin \
  -p com.blocktask.blockchain_bridge.contract \
  -o src/main/java

# LitigationContract
web3j generate solidity \
  -a src/main/resources/contracts/LitigationContract.abi \
  -b src/main/resources/contracts/LitigationContract.bin \
  -p com.blocktask.blockchain_bridge.contract \
  -o src/main/java
```

## 📝 Étape 4: Intégrer les wrappers dans les services

Une fois les wrappers générés, mettez à jour les services de contrat:

### 4.1 Mettre à jour EscrowContractService

```java
// Importer le wrapper généré
import com.blocktask.blockchain_bridge.contract.EscrowContract;

// Dans la classe, ajouter une méthode pour charger le contrat
private EscrowContract loadContract() {
    return EscrowContract.load(
        contractAddress,
        web3j,
        credentials,
        gasProvider
    );
}

// Mettre à jour les méthodes pour utiliser le contrat
public String createMission(String missionHash, BigInteger amount, BigInteger deadline) {
    try {
        EscrowContract contract = loadContract();
        TransactionReceipt receipt = contract.createMission(missionHash, deadline)
            .send(new BigInteger(amount.toString()));
        return receipt.getTransactionHash();
    } catch (Exception e) {
        throw new BlockchainException("Erreur lors de la création de mission", e);
    }
}
```

### 4.2 Mettre à jour ReputationContractService

```java
import com.blocktask.blockchain_bridge.contract.ReputationContract;

private ReputationContract loadContract() {
    return ReputationContract.load(
        contractAddress,
        web3j,
        credentials,
        gasProvider
    );
}

public BigInteger getReputationScore(String userAddress) {
    try {
        ReputationContract contract = loadContract();
        return contract.getReputationScore(userAddress).send();
    } catch (Exception e) {
        throw new BlockchainException("Erreur lors de la récupération du score", e);
    }
}
```

### 4.3 Mettre à jour LitigationContractService

```java
import com.blocktask.blockchain_bridge.contract.LitigationContract;

private LitigationContract loadContract() {
    return LitigationContract.load(
        contractAddress,
        web3j,
        credentials,
        gasProvider
    );
}

public String openLitigation(BigInteger missionId, String reason) {
    try {
        LitigationContract contract = loadContract();
        TransactionReceipt receipt = contract.openLitigation(missionId, reason).send();
        return receipt.getTransactionHash();
    } catch (Exception e) {
        throw new BlockchainException("Erreur lors de l'ouverture du litige", e);
    }
}
```

## 🔐 Étape 5: Configuration de la sécurité

### 5.1 Ne jamais committer les clés privées

Ajoutez `.env` à `.gitignore`:

```
# Environment variables
.env
*.key
```

### 5.2 Utiliser des variables d'environnement

Créez un fichier `.env` dans le blockchain-bridge-service:

```properties
BLOCKCHAIN_NETWORK=sepolia
BLOCKCHAIN_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
BLOCKCHAIN_PRIVATE_KEY=YOUR_PRIVATE_KEY
BLOCKCHAIN_CHAIN_ID=11155111
BLOCKCHAIN_TEST_MODE=false

ESCROW_CONTRACT_ADDRESS=0x...
REPUTATION_CONTRACT_ADDRESS=0x...
LITIGATION_CONTRACT_ADDRESS=0x...
```

### 5.3 Mettre à jour application.properties

```properties
# Utiliser les variables d'environnement
blockchain.network=${BLOCKCHAIN_NETWORK:sepolia}
blockchain.rpc-url=${BLOCKCHAIN_RPC_URL}
blockchain.private-key=${BLOCKCHAIN_PRIVATE_KEY}
blockchain.chain-id=${BLOCKCHAIN_CHAIN_ID:11155111}
blockchain.test-mode=${BLOCKCHAIN_TEST_MODE:false}

blockchain.escrow-contract-address=${ESCROW_CONTRACT_ADDRESS}
blockchain.reputation-contract-address=${REPUTATION_CONTRACT_ADDRESS}
blockchain.litigation-contract-address=${LITIGATION_CONTRACT_ADDRESS}
```

## 🧪 Étape 6: Tester l'intégration

### 6.1 Créer un test unitaire

Créez `BlockchainServiceTest.java`:

```java
@SpringBootTest
class BlockchainServiceTest {
    
    @Autowired
    private BlockchainService blockchainService;
    
    @Test
    void testBlockchainConnection() {
        assertTrue(blockchainService.isBlockchainConnected());
    }
    
    @Test
    void testGetReputationScore() {
        String testAddress = "0x..."; // Adresse de test
        BigInteger score = blockchainService.getReputationScore(testAddress);
        assertNotNull(score);
    }
}
```

### 6.2 Exécuter les tests

```bash
mvn test
```

## 🚀 Étape 7: Démarrer le service

```bash
cd backend_microservices/blockchain-bridge-service
mvn spring-boot:run
```

Le service démarrera sur le port 8088.

## 📊 Étape 8: Vérifier l'intégration

### 8.1 Tester l'endpoint de santé

```bash
curl http://localhost:8088/api/blockchain/health
```

### 8.2 Tester les informations réseau

```bash
curl http://localhost:8088/api/blockchain/network/info
```

### 8.3 Tester la création de mission

```bash
curl -X POST http://localhost:8088/api/blockchain/mission/create \
  -d "missionHash=test-001" \
  -d "amount=1000000000000000000" \
  -d "deadline=1700000000"
```

## 💡 Conseils

- Testez toujours sur Sepolia avant Mainnet
- Utilisez des gas providers dynamiques pour optimiser les coûts
- Implémentez un système de retry pour les transactions échouées
- Surveillez les événements des contrats pour la synchronisation
- Gardez une trace de toutes les transactions

## 🔧 Dépannage

### Erreur: "Contract binary not found"
- Vérifiez que les fichiers .bin sont présents dans resources/contracts
- Vérifiez que le bytecode est correct

### Erreur: "Invalid address"
- Vérifiez que les adresses des contrats sont correctes dans application.properties
- Assurez-vous que les contrats sont déployés sur le bon réseau

### Erreur: "Insufficient funds"
- Vérifiez que le compte a suffisamment d'ETH
- Vérifiez que le gas price n'est pas trop élevé

## 📚 Ressources utiles

- [Web3j Documentation](https://docs.web3j.io/)
- [Web3j Maven Plugin](https://docs.web3j.io/plugins/maven_plugin/)
- [Solidity Documentation](https://docs.soliditylang.org/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
