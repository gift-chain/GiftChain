const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GiftChain - Contribution Functions", function () {
  let GiftChain;
  let giftChain;
  let owner, relayer, contributor1, contributor2, creator;

  // Sample ERC20 token for testing
  let TestToken;
  let testToken;

  // Creator ID (bytes32 hash of a string like "creator1")
  const creatorId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("creator1"));

  before(async function () {
    [owner, relayer, contributor1, contributor2, creator] = await ethers.getSigners();

    // Deploy test ERC20 token
    TestToken = await ethers.getContractFactory("ERC20Mock");
    testToken = await TestToken.deploy("Test Token", "TEST", owner.address, ethers.utils.parseEther("1000"));
    await testToken.deployed();

    // Deploy GiftChain
    GiftChain = await ethers.getContractFactory("GiftChain");
    giftChain = await GiftChain.deploy(relayer.address);
    await giftChain.deployed();

    // Fund contributors with test tokens
    await testToken.transfer(contributor1.address, ethers.utils.parseEther("100"));
    await testToken.transfer(contributor2.address, ethers.utils.parseEther("100"));
  });

  describe("contribute()", function () {
    it("Should allow contributions to a creator's pool", async function () {
      const amount = ethers.utils.parseEther("10");

      // Approve and contribute
      await testToken.connect(contributor1).approve(giftChain.address, amount);
      await expect(giftChain.connect(contributor1).contribute(testToken.address, amount, creatorId))
        .to.emit(giftChain, "ContributionAdded")
        .withArgs(creatorId, contributor1.address, testToken.address, amount);

      // Check balances
      expect(await giftChain.creatorContributions(creatorId)).to.equal(amount);
      expect(await giftChain.contributorBalances(creatorId, contributor1.address)).to.equal(amount);
    });

    it("Should reject invalid contributions", async function () {
      const amount = ethers.utils.parseEther("1");

      // Invalid token
      await expect(
        giftChain.connect(contributor1).contribute(ethers.constants.AddressZero, amount, creatorId)
      ).to.be.revertedWith("INVALID_ADDRESS");

      // Zero amount
      await expect(
        giftChain.connect(contributor1).contribute(testToken.address, 0, creatorId)
      ).to.be.revertedWith("INVALID_AMOUNT");
    });
  });

  describe("withdrawContribution()", function () {
    it("Should allow withdrawing unused contributions", async function () {
      const amount = ethers.utils.parseEther("5");

      // First, create a gift to set the token for the creator
      const giftId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("gift1"));
      await testToken.connect(creator).approve(giftChain.address, amount);
      await giftChain.connect(relayer).createGift(
        testToken.address,
        amount,
        Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
        "Test gift",
        giftId,
        creatorId
      );

      // Withdraw
      await expect(giftChain.connect(contributor1).withdrawContribution(creatorId, amount))
        .to.emit(giftChain, "ContributionWithdrawn")
        .withArgs(creatorId, contributor1.address, amount);

      // Check balances
      expect(await giftChain.creatorContributions(creatorId)).to.equal(ethers.utils.parseEther("5")); // 10 - 5
      expect(await giftChain.contributorBalances(creatorId, contributor1.address)).to.equal(ethers.utils.parseEther("5"));
    });

    it("Should reject invalid withdrawals", async function () {
      // Insufficient balance
      await expect(
        giftChain.connect(contributor1).withdrawContribution(creatorId, ethers.utils.parseEther("100"))
      ).to.be.revertedWith("INSUFFICIENT_BALANCE");

      // No gifts exist for creator (token not set)
      const unknownCreator = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("unknown"));
      await expect(
        giftChain.connect(contributor1).withdrawContribution(unknownCreator, ethers.utils.parseEther("1"))
      ).to.be.revertedWith("GiftNotFound");
    });
  });

  describe("Integration: Contributions + Gifts", function () {
    it("Should let creators use contributed funds for gifts", async function () {
      const contributionAmount = ethers.utils.parseEther("20");
      const giftAmount = ethers.utils.parseEther("15");

      // Contributor2 adds funds
      await testToken.connect(contributor2).approve(giftChain.address, contributionAmount);
      await giftChain.connect(contributor2).contribute(testToken.address, contributionAmount, creatorId);

      // Creator makes a gift using the pool (no direct token transfer needed)
      const giftId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("gift2"));
      await giftChain.connect(relayer).createGift(
        testToken.address,
        giftAmount,
        Math.floor(Date.now() / 1000) + 3600,
        "Pool-funded gift",
        giftId,
        creatorId
      );

      // Check remaining contributions
      expect(await giftChain.creatorContributions(creatorId)).to.equal(
        ethers.utils.parseEther("5") // 20 - 15
      );
    });
  });
});