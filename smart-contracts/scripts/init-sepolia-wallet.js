/**
 * Génère un wallet deployer Sepolia et écrit smart-contracts/.env
 * Usage: node scripts/init-sepolia-wallet.js
 *
 * Ensuite : alimenter l'adresse affichée via un faucet Sepolia, puis
 *   npm run deploy:sepolia:full
 */
const fs = require("fs");
const path = require("path");
const { Wallet } = require("ethers");

const envPath = path.join(__dirname, "..", ".env");
const rpc =
  process.env.ETHEREUM_RPC_URL ||
  "https://ethereum-sepolia-rpc.publicnode.com";

let wallet;
const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
const keyMatch = existing.match(/^DEPLOYER_PRIVATE_KEY=(0x[0-9a-fA-F]{64})\s*$/m);
if (keyMatch) {
  wallet = new Wallet(keyMatch[1]);
  console.log("Réutilise le wallet déjà présent dans .env");
} else {
  wallet = Wallet.createRandom();
  console.log("Nouveau wallet deployer créé");
}

const lines = [
  "# BlockTask Sepolia — NE PAS COMMITTER",
  `ETHEREUM_RPC_URL=${rpc}`,
  `DEPLOYER_PRIVATE_KEY=${wallet.privateKey}`,
  "ETHERSCAN_API_KEY=",
  "ESCROW_CONTRACT_ADDRESS=",
  "REPUTATION_CONTRACT_ADDRESS=",
  "LITIGATION_CONTRACT_ADDRESS=",
  "CHAIN_ID=11155111",
  "",
];

fs.writeFileSync(envPath, lines.join("\n"));

console.log("");
console.log("Deployer address:", wallet.address);
console.log("RPC:", rpc);
console.log(".env écrit:", envPath);
console.log("");
console.log("1) Alimentez cette adresse en Sepolia ETH (faucet Alchemy / Google Cloud):");
console.log("   https://www.alchemy.com/faucets/ethereum-sepolia");
console.log("2) Puis: npm run deploy:sepolia:full");
console.log("");
