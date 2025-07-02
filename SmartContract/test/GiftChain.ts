// SPDX-License-Identifier: MIT

import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { Contract, Signer } from "ethers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { Contract, Signer } from "ethers";

describe("GiftChain - Comprehensive Tests", function () {
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

  beforeEach(async function () {
    [owner, relayer, user1, user2, user3] = await ethers.getSigners();

    const MockToken = await ethers.getContractFactory("MockERC20");
    mockToken = await MockToken.deploy("Mock Token", "MTK", ethers.parseEther("1000000"));
    await mockToken.waitForDeployment();

    testGiftID = ethers.keccak256(ethers.toUtf8Bytes("test-gift-" + Math.random().toString()));

    await mockToken.transfer(await relayer.getAddress(), ethers.parseEther("10000"));
    await mockToken.transfer(await user1.getAddress(), ethers.parseEther("1000"));
    await mockToken.transfer(await user2.getAddress(), ethers.parseEther("1000"));
    await mockToken.transfer(await user3.getAddress(), ethers.parseEther("1000"));

    const GiftChain = await ethers.getContractFactory("GiftChain");
    giftChain = await GiftChain.deploy(await relayer.getAddress());
    await giftChain.waitForDeployment();

    await mockToken.connect(relayer).approve(await giftChain.getAddress(), ethers.MaxUint256);
  });

  describe("Basic Functionality", function () {
    it("should deploy successfully", async function () {
      expect(await giftChain.getAddress()).to.not.equal(ethers.ZeroAddress);
    });

    it("should have correct relayer address", async function () {
      expect(await giftChain.relayer()).to.equal(await relayer.getAddress());
    });
  });

  describe("Gift Creation", function () {
    it("should allow relayer to create gifts", async function () {
      const amount = ethers.parseEther("100");
      const futureTime = (await time.latest()) + oneDay;
      const creator = ethers.keccak256(ethers.toUtf8Bytes(await user1.getAddress()));
      
      await expect(giftChain.connect(relayer).createGift(
        await mockToken.getAddress(),
        amount,
        futureTime,
        testMessage,
        testGiftID,
        creator
      )).to.emit(giftChain, "GiftCreated");
    });

    it("should reject invalid token address", async function () {
      await expect(
        giftChain.connect(relayer).createGift(
          ethers.ZeroAddress,
          ethers.parseEther("100"),
          (await time.latest()) + oneDay,
          testMessage,
          testGiftID,
          ethers.keccak256(ethers.toUtf8Bytes(await user1.getAddress()))
        )
      ).to.be.revertedWithCustomError(giftChain, "INVALID_ADDRESS");
    });

    it("should reject zero amount gifts", async function () {
      await expect(
        giftChain.connect(relayer).createGift(
          await mockToken.getAddress(),
          0,
          (await time.latest()) + oneDay,
          testMessage,
          testGiftID,
          ethers.keccak256(ethers.toUtf8Bytes(await user1.getAddress()))
        )
      ).to.be.revertedWithCustomError(giftChain, "INVALID_AMOUNT");
    });

    it("should reject past expiry", async function () {
      await expect(
        giftChain.connect(relayer).createGift(
          await mockToken.getAddress(),
          ethers.parseEther("100"),
          (await time.latest()) - 1,
          testMessage,
          testGiftID,
          ethers.keccak256(ethers.toUtf8Bytes(await user1.getAddress()))
        )
      ).to.be.revertedWithCustomError(giftChain, "EXPIRY_CAN_ONLY_BE_IN_FUTURE");
    });
  });

  describe("Gift Claiming", function () {
    beforeEach(async function () {
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

    it("should allow recipient to claim gift", async function () {
      await expect(giftChain.connect(user2).claimGift(testGiftID))
        .to.emit(giftChain, "GiftClaimed")
        .withArgs(testGiftID, await user2.getAddress(), ethers.parseEther("100"), "CLAIMED");
    });

    it("should prevent creator from claiming own gift", async function () {
      await expect(giftChain.connect(user1).claimGift(testGiftID))
        .to.be.revertedWithCustomError(giftChain, "CREATOR_CANNOT_CLAIM_GIFT");
    });

    it("should prevent double claiming", async function () {
      await giftChain.connect(user2).claimGift(testGiftID);
      await expect(giftChain.connect(user3).claimGift(testGiftID))
        .to.be.revertedWithCustomError(giftChain, "GIFT_CLAIMED");
    });
  });

  describe("Gift Reclaiming", function () {
    let expiredGiftID: string;

    beforeEach(async function () {
      expiredGiftID = ethers.keccak256(ethers.toUtf8Bytes("expired-gift"));
      const amount = ethers.parseEther("50");
      const creator = ethers.keccak256(ethers.toUtf8Bytes(await user1.getAddress()));
      const currentTime = await time.latest();
      
      await giftChain.connect(relayer).createGift(
        await mockToken.getAddress(),
        amount,
        currentTime + 5, // Expires in 5 seconds
        testMessage,
        expiredGiftID,
        creator
      );
      
      await time.increase(6); // Fast forward past expiry
    });

    it("should allow creator to reclaim expired gift", async function () {
      await expect(giftChain.connect(user1).reclaimGift(expiredGiftID))
        .to.emit(giftChain, "GiftReclaimed")
        .withArgs(expiredGiftID, await user1.getAddress(), ethers.parseEther("50"), "RECLAIMED");
    });

    it("should prevent non-creator from reclaiming", async function () {
      await expect(giftChain.connect(user2).reclaimGift(expiredGiftID))
        .to.be.revertedWithCustomError(giftChain, "NOT_AUTHORIZE_TO_RECLAIM_GIFT");
    });

    it("should prevent reclaiming before expiry", async function () {
      const unexpiredGiftID = ethers.keccak256(ethers.toUtf8Bytes("unexpired-gift"));
      const creator = ethers.keccak256(ethers.toUtf8Bytes(await user1.getAddress()));
      
      await giftChain.connect(relayer).createGift(
        await mockToken.getAddress(),
        ethers.parseEther("50"),
        (await time.latest()) + oneDay,
        testMessage,
        unexpiredGiftID,
        creator
      );
      
      await expect(giftChain.connect(user1).reclaimGift(unexpiredGiftID))
        .to.be.revertedWithCustomError(giftChain, "GIFT_NOT_EXPIRED_YET");
    });
  });

  describe("Gift Validation", function () {
    it("should validate active gift correctly", async function () {
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
      
      const [isValid, message] = await giftChain.validateGift(testGiftID);
      expect(isValid).to.be.true;
      expect(message).to.equal("Valid gift");
    });

    it("should invalidate claimed gift", async function () {
      // Setup and claim gift
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
      
      await giftChain.connect(user2).claimGift(testGiftID);
      
      const [isValid, message] = await giftChain.validateGift(testGiftID);
      expect(isValid).to.be.false;
      expect(message).to.equal("Gift already claimed");
    });

    it("should invalidate non-existent gift", async function () {
      const [isValid, message] = await giftChain.validateGift(ethers.keccak256(ethers.toUtf8Bytes("nonexistent")));
      expect(isValid).to.be.false;
      expect(message).to.equal("Gift not found");
    });
  });

  describe("Comprehensive Lifecycle", function () {
    it("should complete full gift lifecycle", async function () {
      // 1. Create gift
      const lifecycleGiftID = ethers.keccak256(ethers.toUtf8Bytes("lifecycle-gift"));
      const creator = ethers.keccak256(ethers.toUtf8Bytes(await user1.getAddress()));
      
      await giftChain.connect(relayer).createGift(
        await mockToken.getAddress(),
        ethers.parseEther("75"),
        (await time.latest()) + oneDay,
        "Lifecycle test gift",
        lifecycleGiftID,
        creator
      );
      
      // 2. Validate before claiming
      let [isValid, message] = await giftChain.validateGift(lifecycleGiftID);
      expect(isValid).to.be.true;
      expect(message).to.equal("Valid gift");
      
      // 3. Claim gift
      const user2BalanceBefore = await mockToken.balanceOf(await user2.getAddress());
      await giftChain.connect(user2).claimGift(lifecycleGiftID);
      const user2BalanceAfter = await mockToken.balanceOf(await user2.getAddress());
      expect(user2BalanceAfter - user2BalanceBefore).to.equal(ethers.parseEther("75"));
      
      // 4. Validate after claiming
      [isValid, message] = await giftChain.validateGift(lifecycleGiftID);
      expect(isValid).to.be.false;
      expect(message).to.equal("Gift already claimed");
    });

    it("should complete expiry and reclaim lifecycle", async function () {
      // 1. Create gift with short expiry
      const expiringGiftID = ethers.keccak256(ethers.toUtf8Bytes("expiring-gift"));
      const creator = ethers.keccak256(ethers.toUtf8Bytes(await user1.getAddress()));
      const currentTime = await time.latest();
      
      await giftChain.connect(relayer).createGift(
        await mockToken.getAddress(),
        ethers.parseEther("60"),
        currentTime + 5, // Expires in 5 seconds
        "Expiring test gift",
        expiringGiftID,
        creator
      );
      
      // 2. Validate before expiry
      let [isValid, message] = await giftChain.validateGift(expiringGiftID);
      expect(isValid).to.be.true;
      expect(message).to.equal("Valid gift");
      
      // 3. Fast forward past expiry
      await time.increase(6);
      
      // 4. Reclaim gift
      const user1BalanceBefore = await mockToken.balanceOf(await user1.getAddress());
      await giftChain.connect(user1).reclaimGift(expiringGiftID);
      const user1BalanceAfter = await mockToken.balanceOf(await user1.getAddress());
      expect(user1BalanceAfter - user1BalanceBefore).to.equal(ethers.parseEther("60"));
      
      // 5. Validate after reclaiming
      [isValid, message] = await giftChain.validateGift(expiringGiftID);
      expect(isValid).to.be.false;
      expect(message).to.equal("Gift reclaimed");
    });
  });




  describe("Crowdfunding Functionality", function () {
    beforeEach(async function () {
      const targetAmount = ethers.parseEther("500");
      const futureTime = (await time.latest()) + oneDay;
      const creator = ethers.keccak256(ethers.toUtf8Bytes(await user1.getAddress()));
      
      await giftChain.connect(relayer).createCrowdfund(
        await mockToken.getAddress(),
        targetAmount,
        futureTime,
        "Test Crowdfund",
        testCrowdfundID,
        creator
      );
    });

    describe("Crowdfund Creation", function () {
      it("should allow relayer to create crowdfund", async function () {
        const crowdfund = await giftChain.crowdfunds(testCrowdfundID);
        expect(crowdfund.token).to.equal(await mockToken.getAddress());
        expect(crowdfund.targetAmount).to.equal(ethers.parseEther("500"));
      });

      it("should reject invalid token address", async function () {
        await expect(
          giftChain.connect(relayer).createCrowdfund(
            ethers.ZeroAddress,
            ethers.parseEther("100"),
            (await time.latest()) + oneDay,
            "Invalid Crowdfund",
            ethers.keccak256(ethers.toUtf8Bytes("invalid-crowdfund")),
            ethers.keccak256(ethers.toUtf8Bytes(await user1.getAddress()))
          )
        ).to.be.revertedWith("Invalid token address");
      });

      it("should reject zero target amount", async function () {
        await expect(
          giftChain.connect(relayer).createCrowdfund(
            await mockToken.getAddress(),
            0,
            (await time.latest()) + oneDay,
            "Invalid Crowdfund",
            ethers.keccak256(ethers.toUtf8Bytes("invalid-crowdfund")),
            ethers.keccak256(ethers.toUtf8Bytes(await user1.getAddress()))
          )
        ).to.be.revertedWith("Target must be > 0");
      });

      it("should reject past expiry", async function () {
        await expect(
          giftChain.connect(relayer).createCrowdfund(
            await mockToken.getAddress(),
            ethers.parseEther("100"),
            (await time.latest()) - 1,
            "Invalid Crowdfund",
            ethers.keccak256(ethers.toUtf8Bytes("invalid-crowdfund")),
            ethers.keccak256(ethers.toUtf8Bytes(await user1.getAddress()))
          )
        ).to.be.revertedWith("Expiry must be future");
      });
    });

    describe("Contributions", function () {
      it("should allow multiple contributions", async function () {
        const amount1 = ethers.parseEther("100");
        const amount2 = ethers.parseEther("200");
        
        await giftChain.connect(user2).contributeToCrowdfund(testCrowdfundID, amount1);
        await giftChain.connect(user3).contributeToCrowdfund(testCrowdfundID, amount2);
        
        const crowdfund = await giftChain.crowdfunds(testCrowdfundID);
        expect(crowdfund.totalContributed).to.equal(ethers.parseEther("300"));
      });

      it("should track individual contributions", async function () {
        const amount = ethers.parseEther("150");
        await giftChain.connect(user2).contributeToCrowdfund(testCrowdfundID, amount);
        
        // Note: For nested mappings, we would need a view function to check contributions
        // This assumes you've added a getContribution function to the contract
        const contribution = await giftChain.getContribution(testCrowdfundID, await user2.getAddress());
        expect(contribution).to.equal(amount);
      });

      it("should reject contributions after expiry", async function () {
        await time.increase(oneDay + 1);
        await expect(
          giftChain.connect(user2).contributeToCrowdfund(testCrowdfundID, ethers.parseEther("100"))
        ).to.be.revertedWith("Campaign expired");
      });

      it("should reject zero amount contributions", async function () {
        await expect(
          giftChain.connect(user2).contributeToCrowdfund(testCrowdfundID, 0)
        ).to.be.revertedWith("Invalid amount");
      });
    });

    describe("Crowdfund Claiming", function () {
      it("should allow creator to claim when goal is met", async function () {
        // Contribute enough to meet target
        await giftChain.connect(user2).contributeToCrowdfund(testCrowdfundID, ethers.parseEther("500"));
        
        // Fast forward past expiry
        await time.increase(oneDay + 1);
        
        // Claim funds
        const creatorBalanceBefore = await mockToken.balanceOf(await user1.getAddress());
        await giftChain.connect(user1).claimCrowdfund(testCrowdfundID);
        const creatorBalanceAfter = await mockToken.balanceOf(await user1.getAddress());
        
        expect(creatorBalanceAfter - creatorBalanceBefore).to.equal(ethers.parseEther("500"));
      });

      it("should prevent claiming before expiry", async function () {
        await giftChain.connect(user2).contributeToCrowdfund(testCrowdfundID, ethers.parseEther("500"));
        
        await expect(
          giftChain.connect(user1).claimCrowdfund(testCrowdfundID)
        ).to.be.revertedWith("Campaign not ended");
      });

      it("should prevent claiming before goal is met", async function () {
        await giftChain.connect(user2).contributeToCrowdfund(testCrowdfundID, ethers.parseEther("300"));
        await time.increase(oneDay + 1);
        
        await expect(
          giftChain.connect(user1).claimCrowdfund(testCrowdfundID)
        ).to.be.revertedWith("Goal not met");
      });

      it("should prevent non-creator from claiming", async function () {
        await giftChain.connect(user2).contributeToCrowdfund(testCrowdfundID, ethers.parseEther("500"));
        await time.increase(oneDay + 1);
        
        await expect(
          giftChain.connect(user2).claimCrowdfund(testCrowdfundID)
        ).to.be.revertedWith("Not creator");
      });

      it("should prevent double claiming", async function () {
        await giftChain.connect(user2).contributeToCrowdfund(testCrowdfundID, ethers.parseEther("500"));
        await time.increase(oneDay + 1);
        
        await giftChain.connect(user1).claimCrowdfund(testCrowdfundID);
        await expect(
          giftChain.connect(user1).claimCrowdfund(testCrowdfundID)
        ).to.be.revertedWith("Already claimed");
      });
    });

    describe("Refunds", function () {
      it("should allow contributors to refund if goal not met", async function () {
        const contributionAmount = ethers.parseEther("200");
        await giftChain.connect(user2).contributeToCrowdfund(testCrowdfundID, contributionAmount);
        
        // Fast forward past expiry
        await time.increase(oneDay + 1);
        
        // Refund
        const userBalanceBefore = await mockToken.balanceOf(await user2.getAddress());
        await giftChain.connect(user2).refundCrowdfund(testCrowdfundID);
        const userBalanceAfter = await mockToken.balanceOf(await user2.getAddress());
        
        expect(userBalanceAfter - userBalanceBefore).to.equal(contributionAmount);
      });

      it("should prevent refunds if goal is met", async function () {
        await giftChain.connect(user2).contributeToCrowdfund(testCrowdfundID, ethers.parseEther("500"));
        await time.increase(oneDay + 1);
        
        await expect(
          giftChain.connect(user2).refundCrowdfund(testCrowdfundID)
        ).to.be.revertedWith("Target met no refunds");
      });

      it("should prevent refunds before expiry", async function () {
        await giftChain.connect(user2).contributeToCrowdfund(testCrowdfundID, ethers.parseEther("200"));
        
        await expect(
          giftChain.connect(user2).refundCrowdfund(testCrowdfundID)
        ).to.be.revertedWith("Campaign not ended");
      });

      it("should prevent double refunds", async function () {
        await giftChain.connect(user2).contributeToCrowdfund(testCrowdfundID, ethers.parseEther("200"));
        await time.increase(oneDay + 1);
        
        await giftChain.connect(user2).refundCrowdfund(testCrowdfundID);
        await expect(
          giftChain.connect(user2).refundCrowdfund(testCrowdfundID)
        ).to.be.revertedWith("No contribution to refund");
      });
    });

    describe("Comprehensive Crowdfund Lifecycle", function () {
      it("should complete successful crowdfund lifecycle", async function () {
        // 1. Create crowdfund
        const lifecycleCrowdfundID = ethers.keccak256(ethers.toUtf8Bytes("lifecycle-crowdfund"));
        const creator = ethers.keccak256(ethers.toUtf8Bytes(await user1.getAddress()));
        
        await giftChain.connect(relayer).createCrowdfund(
          await mockToken.getAddress(),
          ethers.parseEther("600"),
          (await time.latest()) + oneDay,
          "Lifecycle Crowdfund",
          lifecycleCrowdfundID,
          creator
        );
        
        // 2. Make contributions
        await giftChain.connect(user2).contributeToCrowdfund(lifecycleCrowdfundID, ethers.parseEther("300"));
        await giftChain.connect(user3).contributeToCrowdfund(lifecycleCrowdfundID, ethers.parseEther("300"));
        
        // 3. Fast forward past expiry
        await time.increase(oneDay + 1);
        
        // 4. Claim funds
        const creatorBalanceBefore = await mockToken.balanceOf(await user1.getAddress());
        await giftChain.connect(user1).claimCrowdfund(lifecycleCrowdfundID);
        const creatorBalanceAfter = await mockToken.balanceOf(await user1.getAddress());
        
        expect(creatorBalanceAfter - creatorBalanceBefore).to.equal(ethers.parseEther("600"));
      });

      it("should complete failed crowdfund lifecycle", async function () {
        // 1. Create crowdfund
        const failedCrowdfundID = ethers.keccak256(ethers.toUtf8Bytes("failed-crowdfund"));
        const creator = ethers.keccak256(ethers.toUtf8Bytes(await user1.getAddress()));
        
        await giftChain.connect(relayer).createCrowdfund(
          await mockToken.getAddress(),
          ethers.parseEther("1000"),
          (await time.latest()) + oneDay,
          "Failed Crowdfund",
          failedCrowdfundID,
          creator
        );
        
        // 2. Make insufficient contributions
        await giftChain.connect(user2).contributeToCrowdfund(failedCrowdfundID, ethers.parseEther("400"));
        await giftChain.connect(user3).contributeToCrowdfund(failedCrowdfundID, ethers.parseEther("300"));
        
        // 3. Fast forward past expiry
        await time.increase(oneDay + 1);
        
        // 4. Refund contributions
        const user2BalanceBefore = await mockToken.balanceOf(await user2.getAddress());
        const user3BalanceBefore = await mockToken.balanceOf(await user3.getAddress());
        
        await giftChain.connect(user2).refundCrowdfund(failedCrowdfundID);
        await giftChain.connect(user3).refundCrowdfund(failedCrowdfundID);
        
        const user2BalanceAfter = await mockToken.balanceOf(await user2.getAddress());
        const user3BalanceAfter = await mockToken.balanceOf(await user3.getAddress());
        
        expect(user2BalanceAfter - user2BalanceBefore).to.equal(ethers.parseEther("400"));
        expect(user3BalanceAfter - user3BalanceBefore).to.equal(ethers.parseEther("300"));
      });
    });

});