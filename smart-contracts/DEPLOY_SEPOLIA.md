# Déploiement blockchain Sepolia — guide rapide

## 1. Prérequis

1. Node.js + deps : `cd smart-contracts && npm install`
2. Sepolia ETH sur le wallet deployer (faucet gratuit)
3. RPC Sepolia (public OK pour démarrer, Alchemy/Infura recommandé en prod)

## 2. Wallet deployer (une fois)

```bash
cd smart-contracts
npm run init:sepolia-wallet
```

Cela crée/écrit `smart-contracts/.env` (gitignored) avec :
- `ETHEREUM_RPC_URL` (publicnode Sepolia par défaut)
- `DEPLOYER_PRIVATE_KEY`

**Alimentez l’adresse affichée** :
- https://www.alchemy.com/faucets/ethereum-sepolia
- ou https://cloud.google.com/application/web3/faucet/ethereum/sepolia

Vérifier le solde (optionnel) :
```bash
npx hardhat run --network sepolia -e "const [d]=await ethers.getSigners(); console.log(d.address, ethers.formatEther(await ethers.provider.getBalance(d.address)))"
```

## 3. Déploiement en une commande

```bash
npm run deploy:sepolia:full
```

Cela :
- compile `EscrowContract`, `ReputationContract`, `LitigationContract`
- déploie sur Sepolia → `deployments/sepolia.json`
- exporte les ABIs vers `backend/apps/escrow/abis/`
- met à jour `backend/.env`, `environment.ts` **et** `environment.prod.ts`
- configure le relayer backend (= deployer) si la clé est valide

## 4. Vérifier côté backend

```bash
cd ../backend
python manage.py check_blockchain
```

Attendu : `Blockchain opérationnelle.`

API : `GET /api/escrow/blockchain/status/` (utilisateur connecté)

## 5. Render (production)

Dans le dashboard Render → service **blocktask-backend** → Environment :

| Variable | Valeur |
|----------|--------|
| `ETHEREUM_RPC_URL` | RPC Sepolia (Alchemy/Infura/publicnode) |
| `CHAIN_ID` | `11155111` |
| `ESCROW_CONTRACT_ADDRESS` | depuis `deployments/sepolia.json` |
| `REPUTATION_CONTRACT_ADDRESS` | idem |
| `LITIGATION_CONTRACT_ADDRESS` | idem |
| `BLOCKCHAIN_RELAYER_PRIVATE_KEY` | même clé que deployer (testnet only) |
| `BLOCKCHAIN_RELAYER_ADDRESS` | adresse correspondante |

Puis rebuild frontend (adresses aussi dans `environment.prod.ts` après apply-config).

## 6. MetaMask (frontend web)

- Réseau **Sepolia** (chainId `11155111` / `0xaa36a7`)
- Connecter le wallet pour ancrer les missions on-chain (optionnel ; Mobile Money reste le paiement réel)

## Dépannage

| Problème | Solution |
|----------|----------|
| `insufficient funds` | Faucet Sepolia pour le deployer |
| `connected: false` | Vérifier `ETHEREUM_RPC_URL` |
| Contrats vides | Relancer `npm run apply:config` |
| Clé invalide | `npm run init:sepolia-wallet` (remplace le placeholder) |
