const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("=".repeat(60));
  console.log("BlockTask Smart Contract Deployment");
  console.log("=".repeat(60));
  console.log(`Network: ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);
  console.log("=".repeat(60));

  // ── 1. Deploy EscrowContract ──────────────────────────────
  console.log("\n[1/3] Deploying EscrowContract...");
  const EscrowContract = await ethers.getContractFactory("EscrowContract");
  const escrow = await EscrowContract.deploy();
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log(`✅ EscrowContract deployed at: ${escrowAddress}`);

  // ── 2. Deploy ReputationContract ─────────────────────────
  console.log("\n[2/3] Deploying ReputationContract...");
  const ReputationContract = await ethers.getContractFactory("ReputationContract");
  const reputation = await ReputationContract.deploy();
  await reputation.waitForDeployment();
  const reputationAddress = await reputation.getAddress();
  console.log(`✅ ReputationContract deployed at: ${reputationAddress}`);

  // ── 3. Deploy LitigationContract ─────────────────────────
  console.log("\n[3/3] Deploying LitigationContract...");
  const LitigationContract = await ethers.getContractFactory("LitigationContract");
  const litigation = await LitigationContract.deploy(escrowAddress);
  await litigation.waitForDeployment();
  const litigationAddress = await litigation.getAddress();
  console.log(`✅ LitigationContract deployed at: ${litigationAddress}`);

  // ── Post-deployment: authorize LitigationContract as arbitrator ──
  console.log("\n[Config] Authorizing LitigationContract as Escrow arbitrator...");
  // (EscrowContract n'a pas d'arbitrator mapping — skip)

  // ── Save deployment info ──────────────────────────────────
  const deploymentInfo = {
    network: network.name,
    chainId: network.config.chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      EscrowContract: {
        address: escrowAddress,
        envKey: "ESCROW_CONTRACT_ADDRESS",
      },
      ReputationContract: {
        address: reputationAddress,
        envKey: "REPUTATION_CONTRACT_ADDRESS",
      },
      LitigationContract: {
        address: litigationAddress,
        envKey: "LITIGATION_CONTRACT_ADDRESS",
      },
    },
  };

  const outPath = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n📄 Deployment info saved to: deployments/${network.name}.json`);

  // ── Print .env snippet ────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log("Add these to your backend .env file:");
  console.log("=".repeat(60));
  console.log(`ESCROW_CONTRACT_ADDRESS=${escrowAddress}`);
  console.log(`REPUTATION_CONTRACT_ADDRESS=${reputationAddress}`);
  console.log(`LITIGATION_CONTRACT_ADDRESS=${litigationAddress}`);
  console.log(`CHAIN_ID=${network.config.chainId}`);

  if (network.name === "sepolia") {
    console.log("\n🔗 Etherscan links:");
    console.log(`Escrow:     https://sepolia.etherscan.io/address/${escrowAddress}`);
    console.log(`Reputation: https://sepolia.etherscan.io/address/${reputationAddress}`);
    console.log(`Litigation: https://sepolia.etherscan.io/address/${litigationAddress}`);
  }

  console.log("\n✅ Deployment complete!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
