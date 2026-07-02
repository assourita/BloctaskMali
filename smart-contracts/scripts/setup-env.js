/**
 * Crée smart-contracts/.env depuis .env.example si absent
 */
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", ".env");
const examplePath = path.join(__dirname, "..", ".env.example");

if (fs.existsSync(envPath)) {
  console.log("✅ smart-contracts/.env existe déjà");
  process.exit(0);
}

if (!fs.existsSync(examplePath)) {
  console.error("❌ .env.example introuvable");
  process.exit(1);
}

fs.copyFileSync(examplePath, envPath);
console.log("✅ smart-contracts/.env créé depuis .env.example");
console.log("\n📝 Éditez smart-contracts/.env et renseignez:");
console.log("   - ETHEREUM_RPC_URL (Infura/Alchemy Sepolia)");
console.log("   - DEPLOYER_PRIVATE_KEY (wallet test avec ETH Sepolia)");
console.log("\n   Faucet: https://sepoliafaucet.com/\n");
