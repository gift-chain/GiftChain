import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { Contract, Signer } from "ethers";

describe("GiftChain - Contribution Tests", function () {
  let giftChain: Contract;
  let mockToken: Contract;
  let owner: Signer;
  let relayer: Signer;
  let user1: Signer;
  let user2: Signer;
  let user3: Signer;

  const oneDay = 24 * 60 * 60;
  const testMessage = "Happy Birthday!";
  let testGiftID: string;
  let creatorHash: string;

  beforeEach(async function () {
    [owner, relayer, user1, user2, user3] = await ethers.getSigners();

    const MockToken = await ethers.getContractFactory("MockERC20");
    mockToken = await MockToken.deploy("Mock Token", "MTK", ethers.parseEther("1000000"));
    await mockToken.waitForDeployment();

    testGiftID = ethers.keccak256(ethers.toUtf8Bytes("test-gift-" + Math.random().toString()));
    creatorHash = ethers.keccak256(ethers.toUtf8Bytes(await user1.getAddress()));

    // Distribute tokens
    await mockToken.transfer(await relayer.getAddress(), ethers.parseEther("10000"));
    await mockToken.transfer(await user1.getAddress(), ethers.parseEther("1000"));
    await mockToken.transfer(await user2.getAddress(), ethers.parseEther("1000"));
    await mockToken.transfer(await user3.getAddress(), ethers.parseEther("1000"));

    const GiftChain = await ethers.getContractFactory("GiftChain");
    giftChain = await GiftChain.deploy(await relayer.getAddress());
    await giftChain.waitForDeployment();

    // Approvals
    await mockToken.connect(relayer).approve(giftChain.getAddress(), ethers.MaxUint256);
    await mockToken.connect(user1).approve(giftChain.getAddress(), ethers.MaxUint256);
    await mockToken.connect(user2).approve(giftChain.getAddress(), ethers.MaxUint256);
    await mockToken.connect(user3).approve(giftChain.getAddress(), ethers.MaxUint256);

    // Create a test gift for some tests
    await giftChain.connect(relayer).createGift(
      await mockToken.getAddress(),
      ethers.parseEther("100"),
      (await time.latest()) + oneDay,
      testMessage,
      testGiftID,
      creatorHash
    );
  });

  describe("Contribution Functionality", function () {
    it("should allow contributions to a creator's pool", async function () {
      const contributionAmount = ethers.parseEther("50");
      
      await expect(giftChain.connect(user2).contribute(
        await mockToken.getAddress(),
        contributionAmount,
        creatorHash
      ))
        .to.emit(giftChain, "ContributionAdded")
        .withArgs(creatorHash, await user2.getAddress(), await mockToken.getAddress(), contributionAmount);

      // Verify balances updated
      expect(await giftChain.creatorContributions(creatorHash)).to.equal(contributionAmount);
      expect(await giftChain.contributorBalances(creatorHash, await user2.getAddress())).to.equal(contributionAmount);
    });

    it("should reject zero amount contributions", async function () {
      await expect(
        giftChain.connect(user2).contribute(
          await mockToken.getAddress(),
          0,
          creatorHash
        )
      ).to.be.revertedWithCustomError(giftChain, "INVALID_AMOUNT");
    });

    it("should reject invalid token contributions", async function () {
      await expect(
        giftChain.connect(user2).contribute(
          ethers.ZeroAddress,
          ethers.parseEther("50"),
          creatorHash
        )
      ).to.be.revertedWithCustomError(giftChain, "INVALID_ADDRESS");
    });

    it("should allow multiple contributors", async function () {
      const amount1 = ethers.parseEther("30");
      const amount2 = ethers.parseEther("70");

      await giftChain.connect(user2).contribute(await mockToken.getAddress(), amount1, creatorHash);
      await giftChain.connect(user3).contribute(await mockToken.getAddress(), amount2, creatorHash);

      expect(await giftChain.creatorContributions(creatorHash)).to.equal(amount1 + amount2);
      expect(await giftChain.contributorBalances(creatorHash, await user2.getAddress())).to.equal(amount1);
      expect(await giftChain.contributorBalances(creatorHash, await user3.getAddress())).to.equal(amount2);
    });

    it("should allow partial withdrawals", async function () {
      const contributeAmount = ethers.parseEther("100");
      const withdrawAmount = ethers.parseEther("40");

      await giftChain.connect(user2).contribute(await mockToken.getAddress(), contributeAmount, creatorHash);

      const user2BalanceBefore = await mockToken.balanceOf(await user2.getAddress());
      await giftChain.connect(user2).withdrawContribution(creatorHash, withdrawAmount);
      const user2BalanceAfter = await mockToken.balanceOf(await user2.getAddress());

      expect(user2BalanceAfter - user2BalanceBefore).to.equal(withdrawAmount);
      expect(await giftChain.contributorBalances(creatorHash, await user2.getAddress())).to.equal(contributeAmount - withdrawAmount);
    });

    it("should reject over-withdrawal attempts", async function () {
      await giftChain.connect(user2).contribute(await mockToken.getAddress(), ethers.parseEther("50"), creatorHash);
      
      await expect(
        giftChain.connect(user2).withdrawContribution(creatorHash, ethers.parseEther("51"))
      ).to.be.revertedWithCustomError(giftChain, "INSUFFICIENT_BALANCE");
    });

    it("should reject withdrawals for non-contributors", async function () {
      await expect(
        giftChain.connect(user3).withdrawContribution(creatorHash, ethers.parseEther("10"))
      ).to.be.revertedWithCustomError(giftChain, "INSUFFICIENT_BALANCE");
    });

    it("should use contributed funds for gift creation", async function () {
      // Contribute funds first
      const contributionAmount = ethers.parseEther("200");
      await giftChain.connect(user2).contribute(await mockToken.getAddress(), contributionAmount, creatorHash);

      // Create gift without transferring tokens (using contributions)
      const newGiftID = ethers.keccak256(ethers.toUtf8Bytes("contribution-gift"));
      const giftAmount = ethers.parseEther("150");

      await giftChain.connect(relayer).createGift(
        await mockToken.getAddress(),
        giftAmount,
        (await time.latest()) + oneDay,
        "Funded by contributions",
        newGiftID,
        creatorHash
      );

      // Verify balances
      expect(await giftChain.creatorContributions(creatorHash)).to.equal(contributionAmount - giftAmount);
    });
  });

  describe("Integration with Existing Features", function () {
    it("should allow gift claiming after contribution-funded creation", async function () {
      // Setup
      const contributionAmount = ethers.parseEther("100");
      const newGiftID = ethers.keccak256(ethers.toUtf8Bytes("contribution-claim-gift"));

      // 1. Contribute
      await giftChain.connect(user2).contribute(await mockToken.getAddress(), contributionAmount, creatorHash);

      // 2. Create gift using contributions
      await giftChain.connect(relayer).createGift(
        await mockToken.getAddress(),
        contributionAmount,
        (await time.latest()) + oneDay,
        "Funded by user2",
        newGiftID,
        creatorHash
      );

      // 3. Claim gift
      await expect(giftChain.connect(user3).claimGift(newGiftID))
        .to.emit(giftChain, "GiftClaimed")
        .withArgs(newGiftID, await user3.getAddress(), contributionAmount, "CLAIMED");
    });

    it("should handle partial contributions and direct funding", async function () {
      // Scenario: Creator has 50 ETH in contributions but wants to make 100 ETH gift
      const contributionAmount = ethers.parseEther("50");
      const giftAmount = ethers.parseEther("100");
      const newGiftID = ethers.keccak256(ethers.toUtf8Bytes("mixed-funding-gift"));

      // 1. Get contributions
      await giftChain.connect(user2).contribute(await mockToken.getAddress(), contributionAmount, creatorHash);

      // 2. Create gift (should use 50 from contributions + pull 50 from relayer)
      const relayerBalanceBefore = await mockToken.balanceOf(await relayer.getAddress());
      
      await giftChain.connect(relayer).createGift(
        await mockToken.getAddress(),
        giftAmount,
        (await time.latest()) + oneDay,
        "Mixed funding gift",
        newGiftID,
        creatorHash
      );

      const relayerBalanceAfter = await mockToken.balanceOf(await relayer.getAddress());
      
      // Verify only 50 was pulled from relayer (50 came from contributions)
      expect(relayerBalanceBefore - relayerBalanceAfter).to.equal(ethers.parseEther("50"));
      expect(await giftChain.creatorContributions(creatorHash)).to.equal(0);
    });
  });
});