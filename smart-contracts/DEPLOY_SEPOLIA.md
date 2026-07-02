# Déploiement blockchain Sepolia — guide rapide

## 1. Prérequis gratuits

1. Compte [Alchemy](https://www.alchemy.com) → créer une app **Sepolia** → copier l'URL RPC
2. Wallet MetaMask sur réseau **Sepolia** + ETH test ([faucet Alchemy](https://www.alchemy.com/faucets/ethereum-sepolia))
3. Clé privée du wallet deployer (jamais commitée)

## 2. Configuration

```bash
cd smart-contracts
cp .env.example .env
```

Dans `smart-contracts/.env` :

```env
ETHEREUM_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/VOTRE_CLE
DEPLOYER_PRIVATE_KEY=0x...
ETHERSCAN_API_KEY=   # optionnel (vérification contrats)
```

## 3. Déploiement en une commande

```bash
npm install
npm run deploy:sepolia:full
```

Cela :
- compile les contrats (`EscrowContract`, `ReputationContract`, `LitigationContract`)
- déploie sur Sepolia
- exporte les ABIs vers `backend/apps/escrow/abis/`
- met à jour `backend/.env` et `frontend/src/environments/environment.ts`

## 4. Vérifier côté backend

```bash
cd ../backend
python manage.py check_blockchain
```

Réponse attendue : `Blockchain opérationnelle.`

API : `GET /api/escrow/blockchain/status/` (admin connecté)

## 5. MetaMask (frontend web)

- Réseau Sepolia (chainId 11155111)
- Connecter le wallet lors de la création de mission pour l'ancrage on-chain

## Dépannage

| Problème | Solution |
|----------|----------|
| `insufficient funds` | Faucet Sepolia pour le wallet deployer |
| `connected: false` | Vérifier `ETHEREUM_RPC_URL` dans `backend/.env` |
| Contrats vides | Relancer `npm run apply:config` depuis `smart-contracts` |
