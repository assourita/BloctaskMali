/**
 * Exports ABIs to backend/apps/escrow/abis/ for use by BlockchainService
 */
const fs = require("fs");
const path = require("path");

const contracts = ["EscrowContract", "ReputationContract", "LitigationContract"];
const artifactsDir = path.join(__dirname, "..", "artifacts");
const outputDir = path.join(__dirname, "..", "..", "backend", "apps", "escrow", "abis");

fs.mkdirSync(outputDir, { recursive: true });

contracts.forEach((name) => {
  const artifactPath = path.join(artifactsDir, `${name}.sol`, `${name}.json`);
  if (!fs.existsSync(artifactPath)) {
    console.warn(`⚠️  Artifact not found for ${name} — run 'npm run compile' first`);
    return;
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const abiPath = path.join(outputDir, `${name}.json`);
  fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));
  console.log(`✅ ABI exported: backend/apps/escrow/abis/${name}.json`);
});

console.log("\nDone. Update BlockchainService to load ABIs from files.");
