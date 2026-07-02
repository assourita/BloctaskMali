# Blockchain BlockTask — Marché Mali

Guide d'intégration blockchain pour le **Mali** (phase 1). Les autres pays seront ajoutés ultérieurement.

## Modèle hybride Mali

| Couche | Technologie | Rôle |
|--------|-------------|------|
| Paiement réel | **Orange Money / Moov Money** (FCFA) | Paiement utilisateur au quotidien |
| Confiance escrow | **Ethereum Sepolia** (testnet) | Ancrage mission, caution, libération |
| Identité | **NINA** + KYC admin | Conformité marché malien |

Le client paie en **FCFA** via Mobile Money. Si MetaMask est connecté (réseau Sepolia), la mission est **ancrée on-chain** avec un montant symbolique en ETH test.

## Prérequis

1. **MetaMask** avec réseau Sepolia
2. **ETH Sepolia** (faucet : https://sepoliafaucet.com/)
3. **Clé Infura/Alchemy** pour le RPC
4. **Python web3** : `pip install -r backend/requirements.txt`

## Étape 1 — Déployer les contrats

### Option A — Test local (sans MetaMask / sans Sepolia)

```bash
cd smart-contracts
npm install
npx hardhat run scripts/deploy.js
# ou : npm run compile puis déploiement local ci-dessus
```

Les adresses sont dans `deployments/hardhat.json` (réseau éphémère, pour tests compile uniquement).

Pour **BlockTask + MetaMask** avec adresses qui changent à chaque redémarrage (sans Sepolia) :

```bash
# Terminal 1
npm run node

# Terminal 2
npm run deploy:local
npm run apply:hardhat
```

Ajoutez le réseau **Hardhat Local** dans MetaMask : RPC `http://127.0.0.1:8545`, chainId `31337`.

### Option C — Remix VM (tests rapides dans Remix)

Adapté si vous déployez dans Remix avec l'environnement **« Remix VM (Prague) »** et acceptez de recopier les adresses à chaque session.

**Limite importante :** la Remix VM est un bac à sable **dans le navigateur**. Elle n'expose pas de RPC vers BlockTask — MetaMask et le backend Django **ne peuvent pas** appeler ces contrats. Utilisez Remix pour tester compile / deploy / appels de fonctions dans l'IDE.

**Ordre de déploiement dans Remix :**

1. `ReputationContract` → Deploy
2. `EscrowContract` → Deploy
3. `LitigationContract` → Deploy (constructeur : adresse Escrow)

**Après chaque redémarrage Remix**, copiez les 3 adresses puis :

```bash
cd smart-contracts
npm run remix:addresses
# ou en une ligne :
npm run remix:addresses -- --reputation 0x... --escrow 0x... --litigation 0x...
```

Cela met à jour `deployments/remix-vm.json`, `backend/.env` et `environment.ts` (adresses contrats uniquement).

Guide détaillé : `README_REMIX_GUIDE.md`

### Option B — Sepolia (recommandé pour BlockTask Mali en conditions réelles)

**Déploiement en une commande** (après configuration de `.env`) :

```bash
cd smart-contracts
npm install
npm run setup:env          # crée .env depuis .env.example si absent
# Éditez .env : ETHEREUM_RPC_URL + DEPLOYER_PRIVATE_KEY (+ ETH Sepolia faucet)
npm run deploy:sepolia:full
```

`deploy:sepolia:full` enchaîne : `compile` → `deploy:sepolia` → `export-abi` → `apply-config` (remplit `backend/.env` et `frontend/.../environment.ts`).

**Étapes manuelles** (équivalent) :

1. Créer la config :
   ```bash
   cd smart-contracts
   npm run setup:env
   ```

2. Renseigner dans `.env` :
   - `ETHEREUM_RPC_URL` — clé Infura/Alchemy
   - `DEPLOYER_PRIVATE_KEY` — clé privée d'un wallet **test** avec ETH Sepolia ([faucet](https://sepoliafaucet.com))

3. Déployer (**attention : `--network sepolia` est obligatoire**) :
   ```bash
   npm run compile
   npm run deploy:sepolia
   ```
   Équivalent :
   ```bash
   npx hardhat run scripts/deploy.js --network sepolia
   ```

   ❌ Incorrect : `npx hardhat run scripts/deploy.js --network` (valeur manquante → erreur HH306)

4. Exporter les ABI et propager les adresses :
   ```bash
   npm run export-abi
   npm run apply:config
   ```

## Étape 2 — Configurer le backend

Si vous avez utilisé `npm run apply:config`, `backend/.env` contient déjà les adresses. Sinon, renseignez manuellement :

`backend/.env` :

```env
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/VOTRE_CLE
CHAIN_ID=11155111
ESCROW_CONTRACT_ADDRESS=0x...
REPUTATION_CONTRACT_ADDRESS=0x...
LITIGATION_CONTRACT_ADDRESS=0x...
```

Redémarrer Django. Vérifier : `GET /api/escrow/blockchain/status/`

## Étape 3 — Configurer le frontend

Si vous avez utilisé `npm run apply:config`, `environment.ts` est déjà à jour. Sinon :

`frontend/src/environments/environment.ts` :

```typescript
contracts: {
  escrow: '0x...',
  reputation: '0x...',
  litigation: '0x...',
}
```

## Étape 4 — Tester le flux Mali

1. Créer un compte client (Mali, +223)
2. Compléter le KYC (NINA)
3. Connecter MetaMask (Sepolia)
4. Créer une mission → payer via Orange/Moov (OTP test : `1234`)
5. Confirmer la transaction MetaMask pour l'ancrage escrow
6. Prestataire : déposer caution FCFA → ancrage `acceptMission` optionnel
7. Prestataire : finaliser les preuves → ancrage `submitProof` optionnel (MetaMask)
8. Vérifier dans Admin → Blockchain et sur Sepolia Etherscan

## Opérateurs Mobile Money Mali

| Opérateur | Code | Statut |
|-----------|------|--------|
| Orange Money Mali | `orange` | Sandbox intégré |
| Moov Money Mali | `moov` | Sandbox intégré |

Mode test : OTP `1234` pour tous les paiements simulés.

## Prochaines étapes

- [x] Caution prestataire on-chain (`acceptMission`) — optionnel après dépôt FCFA
- [x] Soumission preuves on-chain (`submitProof`) — optionnel après finalisation
- [x] Validation mission + libération fonds (`validateMission`) — via relayer backend
- [x] Sync événements blockchain → base de données (API admin + bouton)
- [ ] Pont FCFA ↔ stablecoin (phase production Mali)

## Sécurité

- Ne jamais committer de clés privées
- Sepolia uniquement pour les tests
- Audit obligatoire avant production mainnet
