/**
 * Applique les adresses de déploiement dans backend/.env et frontend environments
 * Usage: node scripts/apply-config.js [sepolia|hardhat|remix-vm]
 */
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const NETWORK_PROFILES = {
  sepolia: {
    chainId: 11155111,
    chainIdHex: "0xaa36a7",
    chainName: "Sepolia Test Network",
    rpcUrl:
      process.env.ETHEREUM_RPC_URL ||
      "https://ethereum-sepolia-rpc.publicnode.com",
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
  backendEnv = setEnvVar(backendEnv, "ETHEREUM_CHAIN_ID", String(chainId));
}
if (profile.rpcUrl) {
  backendEnv = setEnvVar(backendEnv, "ETHEREUM_RPC_URL", profile.rpcUrl);
}

const deployerKey = process.env.DEPLOYER_PRIVATE_KEY || "";
if (deployerKey && /^0x[0-9a-fA-F]{64}$/.test(deployerKey)) {
  backendEnv = setEnvVar(backendEnv, "BLOCKCHAIN_RELAYER_PRIVATE_KEY", deployerKey);
  try {
    const { Wallet } = require("ethers");
    const addr = new Wallet(deployerKey).address;
    backendEnv = setEnvVar(backendEnv, "BLOCKCHAIN_RELAYER_ADDRESS", addr);
  } catch (_) {
    /* optional */
  }
}

fs.writeFileSync(backendEnvPath, backendEnv);
console.log(`✅ backend/.env mis à jour${chainId != null ? ` (CHAIN_ID=${chainId})` : " (adresses contrats uniquement)"}`);

function patchFrontendEnv(envTsPath, label) {
  if (!fs.existsSync(envTsPath)) {
    console.warn(`⚠️  ${label} introuvable, skip`);
    return;
  }
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
  console.log(`✅ ${label} mis à jour`);
}

patchFrontendEnv(
  path.join(root, "frontend", "src", "environments", "environment.ts"),
  "frontend environment.ts",
);
patchFrontendEnv(
  path.join(root, "frontend", "src", "environments", "environment.prod.ts"),
  "frontend environment.prod.ts",
);

const scEnvPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(scEnvPath)) {
  let scEnv = fs.readFileSync(scEnvPath, "utf8");
  scEnv = setEnvVar(scEnv, "ESCROW_CONTRACT_ADDRESS", escrow);
  scEnv = setEnvVar(scEnv, "REPUTATION_CONTRACT_ADDRESS", reputation);
  scEnv = setEnvVar(scEnv, "LITIGATION_CONTRACT_ADDRESS", litigation);
  if (chainId != null) scEnv = setEnvVar(scEnv, "CHAIN_ID", String(chainId));
  fs.writeFileSync(scEnvPath, scEnv);
  console.log("✅ smart-contracts/.env adresses mises à jour");
}

console.log("\n📋 Adresses déployées:");
console.log(`   ESCROW_CONTRACT_ADDRESS=${escrow}`);
console.log(`   REPUTATION_CONTRACT_ADDRESS=${reputation}`);
console.log(`   LITIGATION_CONTRACT_ADDRESS=${litigation}`);
console.log("\n⚠️  Sur Render, ajoutez aussi ETHEREUM_RPC_URL + BLOCKCHAIN_RELAYER_* + les 3 adresses.");
console.log("   Redémarrez Django et rebuild frontend après mise à jour.");
console.log("");
