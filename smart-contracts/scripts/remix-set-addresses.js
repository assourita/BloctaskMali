/**
 * Enregistre les adresses copiées depuis Remix VM et propage vers backend/frontend.
 *
 * Usage (après chaque déploiement Remix) :
 *   npm run remix:addresses -- --escrow 0x... --reputation 0x... --litigation 0x...
 *   npm run remix:addresses          # mode interactif
 *
 * Puis redémarrer Django + ng serve.
 */
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { spawnSync } = require("child_process");

const deploymentPath = path.join(__dirname, "..", "deployments", "remix-vm.json");

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { apply: true };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--escrow") out.escrow = args[++i];
    else if (a === "--reputation") out.reputation = args[++i];
    else if (a === "--litigation") out.litigation = args[++i];
    else if (a === "--no-apply") out.apply = false;
    else if (a === "--help" || a === "-h") out.help = true;
  }
  return out;
}

function isAddress(v) {
  return /^0x[a-fA-F0-9]{40}$/.test(v || "");
}

function buildDeployment(escrow, reputation, litigation) {
  return {
    network: "Remix VM (Prague)",
    chainId: null,
    deployer: "",
    timestamp: new Date().toISOString(),
    note: "Adresses locales à la session Remix — recopier après chaque redémarrage Remix",
    contracts: {
      EscrowContract: { address: escrow, envKey: "ESCROW_CONTRACT_ADDRESS" },
      ReputationContract: { address: reputation, envKey: "REPUTATION_CONTRACT_ADDRESS" },
      LitigationContract: {
        address: litigation,
        envKey: "LITIGATION_CONTRACT_ADDRESS",
        constructorArgs: [escrow],
      },
    },
  };
}

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function promptAddresses() {
  console.log("\n📋 Collez les adresses depuis Remix → Deployed Contracts\n");
  console.log("Ordre de déploiement Remix : Reputation → Escrow → Litigation (escrow en arg)\n");

  let escrow, reputation, litigation;

  while (!isAddress(reputation)) {
    reputation = await prompt("ReputationContract : ");
    if (!isAddress(reputation)) console.log("   ❌ Adresse invalide (format 0x + 40 hex)\n");
  }
  while (!isAddress(escrow)) {
    escrow = await prompt("EscrowContract : ");
    if (!isAddress(escrow)) console.log("   ❌ Adresse invalide\n");
  }
  while (!isAddress(litigation)) {
    litigation = await prompt("LitigationContract : ");
    if (!isAddress(litigation)) console.log("   ❌ Adresse invalide\n");
  }

  return { escrow, reputation, litigation };
}

async function main() {
  const args = parseArgs();

  if (args.help) {
    console.log(`
Usage:
  npm run remix:addresses
  npm run remix:addresses -- --escrow 0x... --reputation 0x... --litigation 0x...

Options:
  --no-apply   Enregistre remix-vm.json sans mettre à jour backend/frontend
`);
    process.exit(0);
  }

  let { escrow, reputation, litigation } = args;

  if (!escrow || !reputation || !litigation) {
    const interactive = await promptAddresses();
    escrow = interactive.escrow;
    reputation = interactive.reputation;
    litigation = interactive.litigation;
  }

  for (const [label, addr] of [
    ["escrow", escrow],
    ["reputation", reputation],
    ["litigation", litigation],
  ]) {
    if (!isAddress(addr)) {
      console.error(`❌ Adresse ${label} invalide: ${addr}`);
      process.exit(1);
    }
  }

  const deployment = buildDeployment(escrow, reputation, litigation);
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2) + "\n");
  console.log(`\n✅ deployments/remix-vm.json enregistré`);

  if (args.apply) {
    const result = spawnSync("node", [path.join(__dirname, "apply-config.js"), "remix-vm"], {
      stdio: "inherit",
      cwd: path.join(__dirname, ".."),
    });
    if (result.status !== 0) process.exit(result.status || 1);
  } else {
    console.log("   Lancez: npm run apply:remix");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
