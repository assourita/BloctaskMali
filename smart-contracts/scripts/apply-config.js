/**
 * Applique les adresses de déploiement dans backend/.env et frontend environment.ts
 * Usage: node scripts/apply-config.js [sepolia|hardhat|remix-vm]
 */
const fs = require("fs");
const path = require("path");

const NETWORK_PROFILES = {
  sepolia: {
    chainId: 11155111,
    chainIdHex: "0xaa36a7",
    chainName: "Sepolia Test Network",
    rpcUrl: "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
    explorerUrl: "https://sepolia.etherscan.io",
  },
  hardhat: {
    chainId: 31337,
    chainIdHex: "0x7a69",
    chainName: "Hardhat Local",
    rpcUrl: "http://127.0.0.1:8545",
    explorerUrl: "",
  },
  "remix-vm": {
    chainId: null,
    chainIdHex: null,
    chainName: null,
    rpcUrl: null,
    explorerUrl: null,
  },
};

const network = process.argv[2] || "sepolia";
const root = path.join(__dirname, "..", "..");
const deploymentPath = path.join(__dirname, "..", "deployments", `${network}.json`);

if (!fs.existsSync(deploymentPath)) {
  console.error(`❌ Fichier introuvable: deployments/${network}.json`);
  if (network === "remix-vm") {
    console.error("   Utilisez: npm run remix:addresses");
  } else {
    console.error(`   Déployez d'abord ou lancez apply-config avec le bon réseau`);
  }
  process.exit(1);
}

const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
const escrow = deployment.contracts.EscrowContract.address;
const reputation = deployment.contracts.ReputationContract.address;
const litigation = deployment.contracts.LitigationContract.address;
const profile = NETWORK_PROFILES[network] || NETWORK_PROFILES.sepolia;
const chainId =
  deployment.chainId != null
    ? deployment.chainId
    : network === "remix-vm"
      ? null
      : profile.chainId ?? 11155111;

// ── Backend .env ──────────────────────────────────────────────
const backendEnvPath = path.join(root, "backend", ".env");
const backendExample = path.join(root, "backend", ".env.example");
let backendEnv = "";

if (fs.existsSync(backendEnvPath)) {
  backendEnv = fs.readFileSync(backendEnvPath, "utf8");
} else if (fs.existsSync(backendExample)) {
  backendEnv = fs.readFileSync(backendExample, "utf8");
  console.log("ℹ️  backend/.env créé depuis .env.example");
} else {
  backendEnv = "";
}

function setEnvVar(content, key, value) {
  const re = new RegExp(`^${key}=.*$`, "m");
  const line = `${key}=${value}`;
  if (re.test(content)) return content.replace(re, line);
  return content.trimEnd() + (content.endsWith("\n") ? "" : "\n") + line + "\n";
}

backendEnv = setEnvVar(backendEnv, "ESCROW_CONTRACT_ADDRESS", escrow);
backendEnv = setEnvVar(backendEnv, "REPUTATION_CONTRACT_ADDRESS", reputation);
backendEnv = setEnvVar(backendEnv, "LITIGATION_CONTRACT_ADDRESS", litigation);
if (chainId != null) {
  backendEnv = setEnvVar(backendEnv, "CHAIN_ID", String(chainId));
}

fs.writeFileSync(backendEnvPath, backendEnv);
console.log(`✅ backend/.env mis à jour${chainId != null ? ` (CHAIN_ID=${chainId})` : " (adresses contrats uniquement)"}`);

// ── Frontend environment.ts ───────────────────────────────────
const envTsPath = path.join(root, "frontend", "src", "environments", "environment.ts");
let envTs = fs.readFileSync(envTsPath, "utf8");

envTs = envTs.replace(/escrow:\s*'[^']*'/, `escrow: '${escrow}'`);
envTs = envTs.replace(/reputation:\s*'[^']*'/, `reputation: '${reputation}'`);
envTs = envTs.replace(/litigation:\s*'[^']*'/, `litigation: '${litigation}'`);

if (profile.chainIdHex) {
  envTs = envTs.replace(/chainId:\s*'[^']*'/, `chainId: '${profile.chainIdHex}'`);
  envTs = envTs.replace(/chainName:\s*'[^']*'/, `chainName: '${profile.chainName}'`);
  envTs = envTs.replace(/rpcUrl:\s*'[^']*'/, `rpcUrl: '${profile.rpcUrl}'`);
  envTs = envTs.replace(/explorerUrl:\s*'[^']*'/, `explorerUrl: '${profile.explorerUrl}'`);
}

fs.writeFileSync(envTsPath, envTs);
console.log("✅ frontend/src/environments/environment.ts mis à jour");

console.log("\n📋 Adresses déployées:");
console.log(`   ESCROW_CONTRACT_ADDRESS=${escrow}`);
console.log(`   REPUTATION_CONTRACT_ADDRESS=${reputation}`);
console.log(`   LITIGATION_CONTRACT_ADDRESS=${litigation}`);
console.log("\n⚠️  Vérifiez aussi ETHEREUM_RPC_URL et DEPLOYER_PRIVATE_KEY dans backend/.env et smart-contracts/.env");
if (network === "remix-vm") {
  console.log("   Remix VM : pas de RPC externe — tests dans Remix uniquement (voir README_MALI.md Option C).");
  console.log("   Pour BlockTask + MetaMask avec adresses éphémères : npm run node + npm run apply:config hardhat");
} else {
  console.log("   Redémarrez Django et ng serve après mise à jour.");
}
console.log("");
