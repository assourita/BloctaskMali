const { run, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const deploymentPath = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  if (!fs.existsSync(deploymentPath)) {
    console.error(`No deployment found for network: ${network.name}`);
    console.error(`Run 'npm run deploy:${network.name}' first.`);
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const { contracts } = deployment;

  console.log(`Verifying contracts on ${network.name}...`);

  // Verify EscrowContract
  try {
    await run("verify:verify", {
      address: contracts.EscrowContract.address,
      constructorArguments: [],
    });
    console.log("✅ EscrowContract verified");
  } catch (e) {
    console.log(`⚠️  EscrowContract: ${e.message}`);
  }

  // Verify ReputationContract
  try {
    await run("verify:verify", {
      address: contracts.ReputationContract.address,
      constructorArguments: [],
    });
    console.log("✅ ReputationContract verified");
  } catch (e) {
    console.log(`⚠️  ReputationContract: ${e.message}`);
  }

  // Verify LitigationContract (takes escrow address as constructor arg)
  try {
    await run("verify:verify", {
      address: contracts.LitigationContract.address,
      constructorArguments: [contracts.EscrowContract.address],
    });
    console.log("✅ LitigationContract verified");
  } catch (e) {
    console.log(`⚠️  LitigationContract: ${e.message}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
