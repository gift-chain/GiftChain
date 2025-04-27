// SPDX-License-Identifier: MIT
import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { Contract, Signer } from "ethers";

describe("GiftChain - validateGift and Wallet Connection", function () {
  let giftChain: Contract;
  let mockToken: Contract;
  let owner: Signer;
  let relayer: Signer;
  let user1: Signer;
  let user2: Signer;

  const oneDay = 24 * 60 * 60;
  const testMessage = "Happy Birthday!";
  let testGiftID: string;

  beforeEach(async function () {
    // Get multiple signers to represent different wallet accounts
    [owner, relayer, user1, user2] = await ethers.getSigners();

    // Deploy MockERC20 token for testing
    const MockToken = await ethers.getContractFactory("MockERC20");
    mockToken = await MockToken.deploy("Mock Token", "MTK", ethers.parseEther("1000000"));
    await mockToken.waitForDeployment();

    // Create a random gift ID for testing
    testGiftID = ethers.keccak256(ethers.toUtf8Bytes("test-gift-" + Math.random().toString()));

    // Distribute tokens to relayer and users for testing
    await mockToken.transfer(await relayer.getAddress(), ethers.parseEther("10000"));
    await mockToken.transfer(await user1.getAddress(), ethers.parseEther("1000"));
    await mockToken.transfer(await user2.getAddress(), ethers.parseEther("1000"));

    // Deploy GiftChain contract with relayer address
    const GiftChain = await ethers.getContractFactory("GiftChain");
    giftChain = await GiftChain.deploy(await relayer.getAddress());
    await giftChain.waitForDeployment();

    // Approve GiftChain to spend tokens for relayer
    await mockToken.connect(relayer).approve(await giftChain.getAddress(), ethers.MaxUint256);
  });

  describe("Wallet Connection Tests", function () {
    it("should allow different wallets to connect and check balances", async function () {
      // Check owner balance
      const ownerBalance = await mockToken.balanceOf(await owner.getAddress());
      expect(ownerBalance).to.be.gt(0);
      
      // Check relayer balance after transfer
      const relayerBalance = await mockToken.balanceOf(await relayer.getAddress());
      expect(relayerBalance).to.equal(ethers.parseEther("10000"));
      
      // Check user1 balance after transfer
      const user1Balance = await mockToken.balanceOf(await user1.getAddress());
      expect(user1Balance).to.equal(ethers.parseEther("1000"));
      
      // Verify contract is deployed
      const contractCode = await ethers.provider.getCode(await giftChain.getAddress());
      expect(contractCode).to.not.equal("0x");
    });
    
    it("should allow relayer to create gifts", async function () {
      const amount = ethers.parseEther("100");
      const futureTime = (await time.latest()) + oneDay;
      const creator = ethers.keccak256(ethers.toUtf8Bytes(await user1.getAddress()));
      
      // Relayer creates a gift
      await giftChain.connect(relayer).createGift(
        await mockToken.getAddress(),
        amount,
        futureTime,
        testMessage,
        testGiftID,
        creator
      );
      
      // Verify gift was created
      const gift = await giftChain.gifts(testGiftID);
      expect(gift.token).to.equal(await mockToken.getAddress());
      expect(gift.amount).to.equal(amount);
    });
    
    it("should prevent non-relayer from creating gifts", async function () {
      const amount = ethers.parseEther("100");
      const futureTime = (await time.latest()) + oneDay;
      const creator = ethers.keccak256(ethers.toUtf8Bytes(await user1.getAddress()));
      
      // User1 tries to create a gift (should fail)
      await expect(
        giftChain.connect(user1).createGift(
          await mockToken.getAddress(),
          amount,
          futureTime,
          testMessage,
          testGiftID,
          creator
        )
      ).to.be.revertedWithCustomError(giftChain, "ONLY_RELAYER_HAS_ACCESS");
    });
  });
  
  describe("validateGift Function", function () {
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
    
    it("should validate an existing gift correctly", async function () {
      const [isValid, message] = await giftChain.validateGift(testGiftID);
      expect(isValid).to.be.true;
      expect(message).to.equal("Valid gift");
    });
    
    it("should return false for non-existent gift", async function () {
      const nonExistentGiftID = ethers.keccak256(ethers.toUtf8Bytes("non-existent"));
      const [isValid, message] = await giftChain.validateGift(nonExistentGiftID);
      expect(isValid).to.be.false;
      expect(message).to.equal("Gift not found");
    });
    
    it("should return false for claimed gift", async function () {
      // Claim the gift first
      await giftChain.connect(user2).claimGift(testGiftID);
      
      // Then validate it
      const [isValid, message] = await giftChain.validateGift(testGiftID);
      expect(isValid).to.be.false;
      expect(message).to.equal("Gift already claimed");
    });
    
    it("should return false for expired and reclaimed gift", async function () {
      // Get current block timestamp
      const currentTime = await time.latest();
      
      // Create gift with expiry just 1 second in future
      const amount = ethers.parseEther("50");
      const creator = ethers.keccak256(ethers.toUtf8Bytes(await user1.getAddress()));
      const expiredGiftID = ethers.keccak256(ethers.toUtf8Bytes("expired-gift"));
      
      // Create gift that expires in 1 second
      await giftChain.connect(relayer).createGift(
        await mockToken.getAddress(),
        amount,
        currentTime + 1, // Expires in 1 second
        testMessage,
        expiredGiftID,
        creator
      );
      
      // Fast forward 2 seconds to ensure expiry
      await time.increase(2);
      
      // Verify gift is now expired
      const giftBefore = await giftChain.gifts(expiredGiftID);
      expect(giftBefore.expiry).to.be.lt(await time.latest());
      
      // Reclaim the gift
      await giftChain.connect(user1).reclaimGift(expiredGiftID);
      
      // Validate it after reclaiming
      const [isValid, message] = await giftChain.validateGift(expiredGiftID);
      expect(isValid).to.be.false;
      expect(message).to.equal("Gift reclaimed");
    });
  });
  
  describe("End-to-End Gift Lifecycle", function () {
    it("should handle complete gift lifecycle with multiple wallets", async function () {
      // 1. Create a gift using relayer wallet
      const amount = ethers.parseEther("75");
      const futureTime = (await time.latest()) + oneDay;
      const creator = ethers.keccak256(ethers.toUtf8Bytes(await user1.getAddress()));
      const lifecycleGiftID = ethers.keccak256(ethers.toUtf8Bytes("lifecycle-gift"));
      
      await giftChain.connect(relayer).createGift(
        await mockToken.getAddress(),
        amount,
        futureTime,
        "Complete lifecycle test gift",
        lifecycleGiftID,
        creator
      );
      
      // 2. Validate the gift - should be valid
      let [isValid, message] = await giftChain.validateGift(lifecycleGiftID);
      expect(isValid).to.be.true;
      expect(message).to.equal("Valid gift");
      
      // 3. Get user2's balance before claiming
      const user2BalanceBefore = await mockToken.balanceOf(await user2.getAddress());
      
      // 4. User2 claims the gift
      await giftChain.connect(user2).claimGift(lifecycleGiftID);
      
      // 5. Verify user2 received the tokens
      const user2BalanceAfter = await mockToken.balanceOf(await user2.getAddress());
      expect(user2BalanceAfter - user2BalanceBefore).to.equal(amount);
      
      // 6. Validate the gift again - should be invalid now
      [isValid, message] = await giftChain.validateGift(lifecycleGiftID);
      expect(isValid).to.be.false;
      expect(message).to.equal("Gift already claimed");
    });
  });
});