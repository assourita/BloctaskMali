const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BlockTask Contracts", function () {
  let escrow, reputation, litigation;
  let owner, client, provider, arbitrator;

  beforeEach(async function () {
    [owner, client, provider, arbitrator] = await ethers.getSigners();

    const Escrow = await ethers.getContractFactory("EscrowContract");
    escrow = await Escrow.deploy();

    const Reputation = await ethers.getContractFactory("ReputationContract");
    reputation = await Reputation.deploy();

    const Litigation = await ethers.getContractFactory("LitigationContract");
    litigation = await Litigation.deploy(await escrow.getAddress());

    // Add arbitrator
    await reputation.addArbitrator(arbitrator.address);
    await litigation.addArbitrator(arbitrator.address);
  });

  // ─────────────────────────────────────────────────────────────
  describe("EscrowContract", function () {
    const missionHash = "QmTest123";
    const amount = ethers.parseEther("0.1");
    const deposit = ethers.parseEther("0.01");

    it("should create a mission with funds", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 86400;
      const tx = await escrow.connect(client).createMission(missionHash, deadline, { value: amount });
      await tx.wait();

      const mission = await escrow.getMissionInfo(1);
      expect(mission.client).to.equal(client.address);
      expect(mission.amount).to.equal(amount);
      expect(mission.status).to.equal(1); // Funded
    });

    it("should accept a mission with deposit", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 86400;
      await escrow.connect(client).createMission(missionHash, deadline, { value: amount });
      await escrow.connect(provider).acceptMission(1, { value: deposit });

      const mission = await escrow.getMissionInfo(1);
      expect(mission.provider).to.equal(provider.address);
      expect(mission.deposit).to.equal(deposit);
      expect(mission.status).to.equal(2); // Accepted
    });

    it("should submit proof and validate mission", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 86400;
      await escrow.connect(client).createMission(missionHash, deadline, { value: amount });
      await escrow.connect(provider).acceptMission(1, { value: deposit });
      await escrow.connect(provider).submitProof(1, "QmProof456");

      const providerBalanceBefore = await ethers.provider.getBalance(provider.address);
      await escrow.connect(client).validateMission(1);
      const providerBalanceAfter = await ethers.provider.getBalance(provider.address);

      expect(providerBalanceAfter).to.be.gt(providerBalanceBefore);
      const mission = await escrow.getMissionInfo(1);
      expect(mission.status).to.equal(5); // Completed
    });

    it("should cancel a mission and refund client", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 86400;
      await escrow.connect(client).createMission(missionHash, deadline, { value: amount });

      const clientBalanceBefore = await ethers.provider.getBalance(client.address);
      await escrow.connect(client).cancelMission(1);
      const clientBalanceAfter = await ethers.provider.getBalance(client.address);

      expect(clientBalanceAfter).to.be.gt(clientBalanceBefore);
    });

    it("should reject duplicate mission hash", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 86400;
      await escrow.connect(client).createMission(missionHash, deadline, { value: amount });
      await expect(
        escrow.connect(client).createMission(missionHash, deadline, { value: amount })
      ).to.be.revertedWith("Mission hash already exists");
    });
  });

  // ─────────────────────────────────────────────────────────────
  describe("ReputationContract", function () {
    it("should return 50 as default score", async function () {
      const score = await reputation.getReputationScore(provider.address);
      expect(score).to.equal(50);
    });

    it("should update reputation after successful mission", async function () {
      await reputation.connect(arbitrator).updateReputation(provider.address, 1, true, 5);
      const stats = await reputation.getUserStats(provider.address);
      expect(stats.totalMissions).to.equal(1);
      expect(stats.successfulMissions).to.equal(1);
      expect(stats.score).to.be.gt(0);
    });

    it("should penalize score on dispute", async function () {
      // First build some reputation
      await reputation.connect(arbitrator).updateReputation(provider.address, 1, true, 5);
      const scoreBefore = await reputation.getReputationScore(provider.address);

      await reputation.connect(arbitrator).recordDispute(provider.address, 2);
      const scoreAfter = await reputation.getReputationScore(provider.address);

      expect(scoreAfter).to.be.lte(scoreBefore);
    });

    it("should calculate required deposit based on score", async function () {
      const missionAmount = ethers.parseEther("1.0");

      // New user (score=50): 15%
      const depositNewUser = await reputation.calculateRequiredDeposit(provider.address, missionAmount);
      expect(depositNewUser).to.equal(ethers.parseEther("0.15"));

      // Build high reputation
      for (let i = 1; i <= 10; i++) {
        await reputation.connect(arbitrator).updateReputation(provider.address, i, true, 5);
      }
      const depositHighRep = await reputation.calculateRequiredDeposit(provider.address, missionAmount);
      expect(depositHighRep).to.be.lt(depositNewUser);
    });

    it("should prevent duplicate mission evaluation", async function () {
      await reputation.connect(arbitrator).updateReputation(provider.address, 1, true, 5);
      await expect(
        reputation.connect(arbitrator).updateReputation(provider.address, 1, true, 5)
      ).to.be.revertedWith("Mission already evaluated");
    });
  });

  // ─────────────────────────────────────────────────────────────
  describe("LitigationContract", function () {
    it("should open a litigation", async function () {
      const tx = await litigation.connect(client).openLitigation(1, "Service not rendered");
      await tx.wait();

      const info = await litigation.getLitigationInfo(1);
      expect(info.plaintiff).to.equal(client.address);
      expect(info.reason).to.equal("Service not rendered");
      expect(info.status).to.equal(0); // Open
    });

    it("should not allow two litigations for same mission", async function () {
      await litigation.connect(client).openLitigation(1, "First reason");
      await expect(
        litigation.connect(provider).openLitigation(1, "Second reason")
      ).to.be.revertedWith("Mission already has litigation");
    });

    it("should submit evidence", async function () {
      await litigation.connect(client).openLitigation(1, "Service not rendered");
      await litigation.connect(client).submitEvidence(1, "QmEvidence123");

      const info = await litigation.getLitigationInfo(1);
      expect(info.proofHash).to.equal("QmEvidence123");
      expect(info.status).to.equal(1); // InProgress
    });

    it("should allow arbitrator to submit decision", async function () {
      await litigation.connect(client).openLitigation(1, "Service not rendered");
      await litigation.connect(client).submitEvidence(1, "QmEvidence123");
      await litigation.connect(arbitrator).submitArbitrationDecision(1, 0); // ClientWins

      const info = await litigation.getLitigationInfo(1);
      expect(info.status).to.equal(2); // Resolved
      expect(info.decision).to.equal(0); // ClientWins
      expect(info.arbitrator).to.equal(arbitrator.address);
    });

    it("should detect active litigation", async function () {
      expect(await litigation.hasActiveLitigation(1)).to.be.false;
      await litigation.connect(client).openLitigation(1, "Test");
      expect(await litigation.hasActiveLitigation(1)).to.be.true;
    });
  });
});
