import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { Contract, Signer } from "ethers";

describe("GiftChain Contract", function () {
  let giftChain: Contract;
  let mockToken: Contract;
  let owner: Signer;
  let relayer: Signer;
  let user1: Signer;
  let user2: Signer;
  let giftErrorsLib: Contract;

  const oneDay = 24 * 60 * 60;
  const testMessage = "Happy Birthday!";
  const testRawCode = "gift123";
  let testGiftID: string;

  beforeEach(async function () {
    // Get multiple signers to represent different wallet accounts
    [owner, relayer, user1, user2] = await ethers.getSigners();

    // Deploy MockERC20 token for testing
    const MockToken = await ethers.getContractFactory("MockERC20");
    mockToken = await MockToken.deploy("Mock Token", "MTK", ethers.parseEther("1000000"));
    await mockToken.waitForDeployment();

    // Compute the gift ID
    testGiftID = ethers.keccak256(ethers.toUtf8Bytes(testRawCode));

    // Distribute tokens to relayer and users for testing
    await mockToken.transfer(await relayer.getAddress(), ethers.parseEther("10000"));
    await mockToken.transfer(await user1.getAddress(), ethers.parseEther("1000"));
    await mockToken.transfer(await user2.getAddress(), ethers.parseEther("1000"));

    // Deploy GiftErrors library
    const GiftErrors = await ethers.getContractFactory("GiftErrors");
    giftErrorsLib = await GiftErrors.deploy();
    await giftErrorsLib.waitForDeployment();

    // Deploy GiftChain contract with relayer address
    const GiftChain = await ethers.getContractFactory("GiftChain");
    giftChain = await GiftChain.deploy(await relayer.getAddress());
    await giftChain.waitForDeployment();

    // Approve GiftChain to spend tokens for relayer and users
    await mockToken.connect(relayer).approve(await giftChain.getAddress(), ethers.MaxUint256);
    await mockToken.connect(user1).approve(await giftChain.getAddress(), ethers.MaxUint256);
    await mockToken.connect(user2).approve(await giftChain.getAddress(), ethers.MaxUint256);
  });

  describe("Constructor", function () {
    it("should set the relayer address correctly", async function () {
      // Deploy a new contract to test constructor
      const GiftChain = await ethers.getContractFactory("GiftChain");
      const newContract = await GiftChain.deploy(await relayer.getAddress());
      await newContract.waitForDeployment();

      // Ensure relayer has tokens and approval
      await mockToken.transfer(await relayer.getAddress(), ethers.parseEther("1000"));
      await mockToken.connect(relayer).approve(await newContract.getAddress(), ethers.MaxUint256);

      // Relayer should succeed in creating a gift
      const amount = ethers.parseEther("100");
      const futureTime = (await time.latest()) + oneDay;
      const creator = ethers.keccak256(ethers.toUtf8Bytes(await user1.getAddress()));

      // Relayer should succeed
      await expect(
        newContract.connect(relayer).createGift(
          await mockToken.getAddress(),
          amount,
          futureTime,
          testMessage,
          testGiftID,
          creator
        )
      ).to.not.be.reverted;

      // Non-relayer (user1) should fail
      await expect(
        newContract.connect(user1).createGift(
          await mockToken.getAddress(),
          amount,
          futureTime,
          testMessage,
          testGiftID,
          creator
        )
      ).to.be.revertedWithCustomError(giftErrorsLib, "ONLY_RELAYER_HAS_ACCESS");
    });
  });

  describe("createGift", function () {
    it("should create a gift successfully", async function () {
      const amount = ethers.parseEther("100");
      const futureTime = (await time.latest()) + oneDay;
      const creator = ethers.keccak256(ethers.toUtf8Bytes(await user1.getAddress()));

      // Relayer signs the transaction
      await expect(
        giftChain.connect(relayer).createGift(
          await mockToken.getAddress(),
          amount,
          futureTime,
          testMessage,
          testGiftID,
          creator
        )
      )
        .to.emit(giftChain, "GiftCreated")
        .withArgs(testGiftID, await mockToken.getAddress(), testMessage, amount, futureTime);

      // Verify gift details
      const gift = await giftChain.gifts(testGiftID);
      expect(gift.token).to.equal(await mockToken.getAddress());
      expect(gift.claimed).to.equal(false);
      expect(gift.expiry).to.equal(futureTime);
      expect(gift.amount).to.equal(amount);
      expect(gift.message).to.equal(testMessage);
      expect(gift.status).to.equal(1); // Status.PENDING
      expect(gift.creator).to.equal(creator);

      // Verify token transfer
      const contractBalance = await mockToken.balanceOf(await giftChain.getAddress());
      expect(contractBalance).to.equal(amount);
    });

    it("should revert if called by non-relayer", async function () {
      const amount = ethers.parseEther("100");
      const futureTime = (await time.latest()) + oneDay;
      const creator = ethers.keccak256(ethers.toUtf8Bytes(await user1.getAddress()));

      // User1 (non-relayer) signs transaction
      await expect(
        giftChain.connect(user1).createGift(
          await mockToken.getAddress(),
          amount,
          futureTime,
          testMessage,
          testGiftID,
          creator
        )
      ).to.be.revertedWithCustomError(giftErrorsLib, "ONLY_RELAYER_HAS_ACCESS");
    });

    it("should revert with invalid token address", async function () {
      const amount = ethers.parseEther("100");
      const futureTime = (await time.latest()) + oneDay;
      const creator = ethers.keccak256(ethers.toUtf8Bytes(await user1.getAddress()));

      await expect(
        giftChain.connect(relayer).createGift(
          ethers.ZeroAddress,
          amount,
          futureTime,
          testMessage,
          testGiftID,
          creator
        )
      ).to.be.revertedWithCustomError(giftErrorsLib, "INVALID_ADDRESS");
    });

    it("should revert with invalid amount", async function () {
      const futureTime = (await time.latest()) + oneDay;
      const creator = ethers.keccak256(ethers.toUtf8Bytes(await user1.getAddress()));

      await expect(
        giftChain.connect(relayer).createGift(
          await mockToken.getAddress(),
          0,
          futureTime,
          testMessage,
          testGiftID,
          creator
        )
      ).to.be.revertedWithCustomError(giftErrorsLib, "INVALID_AMOUNT");
    });

    it("should revert with expiry in the past", async function () {
      const amount = ethers.parseEther("100");
      const pastTime = (await time.latest()) - oneDay;
      const creator = ethers.keccak256(ethers.toUtf8Bytes(await user1.getAddress()));

      await expect(
        giftChain.connect(relayer).createGift(
          await mockToken.getAddress(),
          amount,
          pastTime,
          testMessage,
          testGiftID,
          creator
        )
      ).to.be.revertedWithCustomError(giftErrorsLib, "EXPIRY_CAN_ONLY_BE_IN_FUTURE");
    });

    it("should revert with message too short", async function () {
      const amount = ethers.parseEther("100");
      const futureTime = (await time.latest()) + oneDay;
      const creator = ethers.keccak256(ethers.toUtf8Bytes(await user1.getAddress()));

      await expect(
        giftChain.connect(relayer).createGift(
          await mockToken.getAddress(),
          amount,
          futureTime,
          "Hi",
          testGiftID,
          creator
        )
      ).to.be.revertedWithCustomError(giftErrorsLib, "EXPECT_3_TO_50_MESSAGE_CHARACTER");
    });

    it("should revert with message too long", async function () {
      const amount = ethers.parseEther("100");
      const futureTime = (await time.latest()) + oneDay;
      const creator = ethers.keccak256(ethers.toUtf8Bytes(await user1.getAddress()));
      const longMessage = "A".repeat(51);

      await expect(
        giftChain.connect(relayer).createGift(
          await mockToken.getAddress(),
          amount,
          futureTime,
          longMessage,
          testGiftID,
          creator
        )
      ).to.be.revertedWithCustomError(giftErrorsLib, "EXPECT_3_TO_50_MESSAGE_CHARACTER");
    });

    it("should revert if gift ID already exists", async function () {
      const amount = ethers.parseEther("100");
      const futureTime = (await time.latest()) + oneDay;
      const creator = ethers.keccak256(ethers.toUtf8Bytes(await user1.getAddress()));

      // Create gift first time
      await giftChain.connect(relayer).createGift(
        await mockToken.getAddress(),
        amount,
        futureTime,
        testMessage,
        testGiftID,
        creator
      );

      // Try to create with same ID
      await expect(
        giftChain.connect(relayer).createGift(
          await mockToken.getAddress(),
          amount,
          futureTime,
          testMessage,
          testGiftID,
          creator
        )
      ).to.be.revertedWithCustomError(giftErrorsLib, "CARD_ALREADY_EXIST");
    });

    it("should revert if token transfer fails", async function () {
      // Revoke approval to force transfer failure
      await mockToken.connect(relayer).approve(await giftChain.getAddress(), 0);

      const amount = ethers.parseEther("100"); // Valid amount but no approval
      const futureTime = (await time.latest()) + oneDay;
      const creator = ethers.keccak256(ethers.toUtf8Bytes(await user1.getAddress()));

      await expect(
        giftChain.connect(relayer).createGift(
          await mockToken.getAddress(),
          amount,
          futureTime,
          testMessage,
          testGiftID,
          creator
        )
      ).to.be.revertedWithCustomError(giftErrorsLib, "TRANSFER_FAILED");
    });
  });

  describe("claimGift", function () {
    beforeEach(async function () {
      // Setup: Create a gift
      const amount = ethers.parseEther("100");
      const futureTime = (await time.latest()) + oneDay;
      const creator = ethers.keccak256(ethers.toUtf8Bytes(await user1.getAddress()));

      await giftChain.connect(relayer).createGift(
        await mockToken.getAddress(),
        amount,
        futureTime,
        testMessage,
        testGiftID,
        creator
      );
    });

    it("should claim a gift successfully", async function () {
      // User2 signs transaction to claim gift
      const balanceBefore = await mockToken.balanceOf(await user2.getAddress());

      await expect(giftChain.connect(user2).claimGift(testGiftID))
        .to.emit(giftChain, "GiftClaimed")
        .withArgs(testGiftID, await user2.getAddress(), ethers.parseEther("100"));

      const balanceAfter = await mockToken.balanceOf(await user2.getAddress());
      expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("100"));

      const gift = await giftChain.gifts(testGiftID);
      expect(gift.status).to.equal(2); // Status.SUCCESSFUL
    });

    it("should revert if gift code is invalid", async function () {
      const invalidGiftID = ethers.keccak256(ethers.toUtf8Bytes("invalid"));

      await expect(giftChain.connect(user2).claimGift(invalidGiftID)).to.be.revertedWithCustomError(
        giftErrorsLib,
        "GiftNotFound"
      );
    });

    it("should revert if gift is expired", async function () {
      // Fast forward time past expiry
      await time.increase(oneDay + 1);

      await expect(giftChain.connect(user2).claimGift(testGiftID)).to.be.revertedWithCustomError(
        giftErrorsLib,
        "GiftExpired"
      );
    });

    it("should revert if gift is already claimed", async function () {
      // First claim
      await giftChain.connect(user2).claimGift(testGiftID);

      // Second attempt
      await expect(giftChain.connect(user1).claimGift(testGiftID)).to.be.revertedWithCustomError(
        giftErrorsLib,
        "InvalidGiftStatus"
      );
    });
  });

  describe("validateGift", function () {
    beforeEach(async function () {
      // Setup: Create a gift
      const amount = ethers.parseEther("100");
      const futureTime = (await time.latest()) + oneDay;
      const creator = ethers.keccak256(ethers.toUtf8Bytes(await user1.getAddress()));

      await giftChain.connect(relayer).createGift(
        await mockToken.getAddress(),
        amount,
        futureTime,
        testMessage,
        testGiftID,
        creator
      );
    });

    it("should validate a valid gift", async function () {
      // User2 signs transaction to validate gift
      const result = await giftChain.connect(user2).validateGift(testRawCode);
      expect(result).to.equal(true);
    });

    it("should revert if gift not found", async function () {
      await expect(
        giftChain.connect(user2).validateGift("invalidGift")
      ).to.be.revertedWithCustomError(giftErrorsLib, "GiftNotFound");
    });

    it("should revert if gift already redeemed", async function () {
      // Claim the gift
      await giftChain.connect(user2).claimGift(testGiftID);

      // Try to validate
      await expect(
        giftChain.connect(user1).validateGift(testRawCode)
      ).to.be.revertedWithCustomError(giftErrorsLib, "GiftAlreadyRedeemed");
    });

    it("should revert if gift already reclaimed", async function () {
      // Fast forward time past expiry
      await time.increase(oneDay + 1);

      // Reclaim the gift
      await giftChain.connect(user1).reclaimGift(testRawCode);

      // Try to validate
      await expect(
        giftChain.connect(user2).validateGift(testRawCode)
      ).to.be.revertedWithCustomError(giftErrorsLib, "GiftAlreadyReclaimed");
    });
  });

  describe("reclaimGift", function () {
    beforeEach(async function () {
      // Setup: Create a gift
      const amount = ethers.parseEther("100");
      const futureTime = (await time.latest()) + oneDay;
      const creator = ethers.keccak256(ethers.toUtf8Bytes(await user1.getAddress()));

      await giftChain.connect(relayer).createGift(
        await mockToken.getAddress(),
        amount,
        futureTime,
        testMessage,
        testGiftID,
        creator
      );
    });

    it("should reclaim an expired gift successfully", async function () {
      // Fast forward time past expiry
      await time.increase(oneDay + 1);

      // User1 (creator) signs transaction to reclaim
      const balanceBefore = await mockToken.balanceOf(await user1.getAddress());

      await expect(giftChain.connect(user1).reclaimGift(testRawCode))
        .to.emit(giftChain, "GiftReclaimed")
        .withArgs(testGiftID, await user1.getAddress(), ethers.parseEther("100"));

      const balanceAfter = await mockToken.balanceOf(await user1.getAddress());
      expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("100"));

      const gift = await giftChain.gifts(testGiftID);
      expect(gift.status).to.equal(3); // Status.RECLAIMED
      expect(gift.claimed).to.equal(true);
    });

    it("should revert if gift not found", async function () {
      await expect(
        giftChain.connect(user1).reclaimGift("invalidGift")
      ).to.be.revertedWithCustomError(giftErrorsLib, "GiftNotFound");
    });

    it("should revert if caller is not the creator", async function () {
      // Fast forward time past expiry
      await time.increase(oneDay + 1);

      // User2 (non-creator) signs transaction
      await expect(
        giftChain.connect(user2).reclaimGift(testRawCode)
      ).to.be.revertedWithCustomError(giftErrorsLib, "InvalidGiftStatus");
    });

    it("should revert if gift not expired yet", async function () {
      await expect(
        giftChain.connect(user1).reclaimGift(testRawCode)
      ).to.be.revertedWithCustomError(giftErrorsLib, "GiftExpired");
    });

    it("should revert if gift already redeemed", async function () {
      // Claim the gift
      await giftChain.connect(user2).claimGift(testGiftID);

      // Fast forward time past expiry
      await time.increase(oneDay + 1);

      // Try to reclaim
      await expect(
        giftChain.connect(user1).reclaimGift(testRawCode)
      ).to.be.revertedWithCustomError(giftErrorsLib, "GiftAlreadyRedeemed");
    });

    it("should revert if gift already reclaimed", async function () {
      // Fast forward time past expiry
      await time.increase(oneDay + 1);

      // Reclaim the gift
      await giftChain.connect(user1).reclaimGift(testRawCode);

      // Try to reclaim again
      await expect(
        giftChain.connect(user1).reclaimGift(testRawCode)
      ).to.be.revertedWithCustomError(giftErrorsLib, "GiftAlreadyReclaimed");
    });
  });
});