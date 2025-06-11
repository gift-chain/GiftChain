import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { Contract, Signer } from "ethers";

describe("GiftChain - Campaign Functionality", function () {
  let giftChain: Contract;
  let mockToken: Contract;
  let owner: Signer;
  let relayer: Signer;
  let donor1: Signer;
  let donor2: Signer;
  let creator: Signer;

  const oneDay = 24 * 60 * 60;
  const campaignTitle = "Test Campaign";
  const campaignDescription = "A test campaign description";
  const campaignGoal = ethers.parseEther("100");
  let campaignDeadline: number;

  before(async function () {
    [owner, relayer, donor1, donor2, creator] = await ethers.getSigners();
  });

  beforeEach(async function () {
    // Deploy fresh contracts for each test
    const MockToken = await ethers.getContractFactory("MockERC20");
    mockToken = await MockToken.deploy("Mock Token", "MTK", ethers.parseEther("1000000"));
    await mockToken.waitForDeployment();

    const GiftChain = await ethers.getContractFactory("GiftChain");
    giftChain = await GiftChain.deploy(await relayer.getAddress());
    await giftChain.waitForDeployment();

    // Set deadline for tests
    campaignDeadline = (await time.latest()) + oneDay;

    // Distribute and approve tokens
    const distributeTokens = async (signer: Signer, amount: bigint) => {
      await mockToken.transfer(await signer.getAddress(), amount);
      await mockToken.connect(signer).approve(giftChain.target, ethers.MaxUint256);
    };

    await distributeTokens(creator, ethers.parseEther("10000"));
    await distributeTokens(donor1, ethers.parseEther("1000"));
    await distributeTokens(donor2, ethers.parseEther("1000"));
  });

  describe("Campaign Creation", function () {
    it("should create a campaign successfully", async function () {
      const campaignID = ethers.id("campaign1");
      const tx = await giftChain.connect(creator).createCampaign(
        campaignTitle,
        campaignDescription,
        await mockToken.getAddress(),
        campaignGoal,
        campaignDeadline,
        campaignID
      );

      // Verify events
      await expect(tx)
        .to.emit(giftChain, "CampaignCreated")
        .withArgs(
          campaignID,
          await creator.getAddress(),
          campaignTitle,
          campaignDescription,
          campaignGoal,
          campaignDeadline
        );

      // Verify state
      const campaign = await giftChain.campaigns(campaignID);
      expect(campaign.creator).to.equal(await creator.getAddress());
      expect(campaign.token).to.equal(await mockToken.getAddress());
      expect(campaign.title).to.equal(campaignTitle);
      expect(campaign.description).to.equal(campaignDescription);
      expect(campaign.goal).to.equal(campaignGoal);
      expect(campaign.deadline).to.equal(campaignDeadline);
      expect(campaign.raisedAmount).to.equal(0);
      expect(campaign.withdrawn).to.be.false;
    });

    it("should revert with invalid parameters", async function () {
      const campaignID = ethers.id("invalid-campaign");
      
      // Empty title
      await expect(
        giftChain.connect(creator).createCampaign(
          "",
          campaignDescription,
          await mockToken.getAddress(),
          campaignGoal,
          campaignDeadline,
          campaignID
        )
      ).to.be.revertedWithCustomError(giftChain, "INVALID_TITLE");

      // Invalid description length
      await expect(
        giftChain.connect(creator).createCampaign(
          campaignTitle,
          "A".repeat(51),
          await mockToken.getAddress(),
          campaignGoal,
          campaignDeadline,
          campaignID
        )
      ).to.be.revertedWithCustomError(giftChain, "INVALID_DESCRIPTION");

      // Zero goal
      await expect(
        giftChain.connect(creator).createCampaign(
          campaignTitle,
          campaignDescription,
          await mockToken.getAddress(),
          0,
          campaignDeadline,
          campaignID
        )
      ).to.be.revertedWithCustomError(giftChain, "INVALID_AMOUNT");

      // Past deadline
      await expect(
        giftChain.connect(creator).createCampaign(
          campaignTitle,
          campaignDescription,
          await mockToken.getAddress(),
          campaignGoal,
          (await time.latest()) - 1,
          campaignID
        )
      ).to.be.revertedWithCustomError(giftChain, "EXPIRY_CAN_ONLY_BE_IN_FUTURE");

      // Zero address token
      await expect(
        giftChain.connect(creator).createCampaign(
          campaignTitle,
          campaignDescription,
          ethers.ZeroAddress,
          campaignGoal,
          campaignDeadline,
          campaignID
        )
      ).to.be.revertedWithCustomError(giftChain, "INVALID_ADDRESS");

      // Create valid campaign first
      await giftChain.connect(creator).createCampaign(
        campaignTitle,
        campaignDescription,
        await mockToken.getAddress(),
        campaignGoal,
        campaignDeadline,
        campaignID
      );

      // Duplicate campaign ID
      await expect(
        giftChain.connect(creator).createCampaign(
          campaignTitle,
          campaignDescription,
          await mockToken.getAddress(),
          campaignGoal,
          campaignDeadline,
          campaignID
        )
      ).to.be.revertedWithCustomError(giftChain, "CAMPAIGN_ALREADY_EXIST");
    });
  });

  describe("Campaign Donations", function () {
    let campaignID: string;
    const donationAmount = ethers.parseEther("50");

    beforeEach(async function () {
      campaignID = ethers.id("donation-campaign");
      await giftChain.connect(creator).createCampaign(
        campaignTitle,
        campaignDescription,
        await mockToken.getAddress(),
        campaignGoal,
        campaignDeadline,
        campaignID
      );
    });

    it("should allow donations and update state correctly", async function () {
      const tx = await giftChain.connect(donor1).donateToCampaign(campaignID, donationAmount);

      // Verify events
      await expect(tx)
        .to.emit(giftChain, "DonationReceived")
        .withArgs(campaignID, await donor1.getAddress(), donationAmount);

      // Verify state
      const campaign = await giftChain.campaigns(campaignID);
      expect(campaign.raisedAmount).to.equal(donationAmount);

      // Verify multiple donations
      await giftChain.connect(donor2).donateToCampaign(campaignID, donationAmount);
      expect((await giftChain.campaigns(campaignID)).raisedAmount).to.equal(donationAmount * 2n);
    });

    it("should revert with invalid donations", async function () {
      // Zero amount
      await expect(
        giftChain.connect(donor1).donateToCampaign(campaignID, 0)
      ).to.be.revertedWithCustomError(giftChain, "INVALID_AMOUNT");

      // Nonexistent campaign
      await expect(
        giftChain.connect(donor1).donateToCampaign(ethers.id("nonexistent"), donationAmount)
      ).to.be.revertedWithCustomError(giftChain, "CAMPAIGN_NOT_FOUND");

      // Exceeds goal
      await expect(
        giftChain.connect(donor1).donateToCampaign(campaignID, campaignGoal + 1n)
      ).to.be.revertedWithCustomError(giftChain, "EXCEEDS_CAMPAIGN_GOAL");

      // After deadline
      await time.increase(oneDay + 1);
      await expect(
        giftChain.connect(donor1).donateToCampaign(campaignID, donationAmount)
      ).to.be.revertedWithCustomError(giftChain, "CAMPAIGN_EXPIRED");
    });
  });

  describe("Campaign Withdrawal", function () {
    let campaignID: string;
    const donationAmount = ethers.parseEther("100");

    beforeEach(async function () {
      campaignID = ethers.id("withdrawal-campaign");
      await giftChain.connect(creator).createCampaign(
        campaignTitle,
        campaignDescription,
        await mockToken.getAddress(),
        donationAmount,
        campaignDeadline,
        campaignID
      );
      await giftChain.connect(donor1).donateToCampaign(campaignID, donationAmount);
    });

    it("should allow creator to withdraw after deadline", async function () {
  await time.increase(oneDay + 1);

  const initialBalance = await mockToken.balanceOf(await creator.getAddress());
  const tx = await giftChain.connect(creator).withdrawCampaignFunds(campaignID);

  // Correct way to verify the event - use the actual creator address hash
  const creatorHash = ethers.keccak256(ethers.toUtf8Bytes(await creator.getAddress()));
  
  await expect(tx)
    .to.emit(giftChain, "ContributionWithdrawn")
    .withArgs(
      creatorHash, // Use the computed hash
      await creator.getAddress(),
      donationAmount
    );

      // Verify state
      const campaign = await giftChain.campaigns(campaignID);
      expect(campaign.withdrawn).to.be.true;

      // Verify balance
      expect(await mockToken.balanceOf(await creator.getAddress())).to.equal(
        initialBalance + donationAmount
      );
    });

    it("should revert with invalid withdrawals", async function () {
      // Before deadline
      await expect(
        giftChain.connect(creator).withdrawCampaignFunds(campaignID)
      ).to.be.revertedWithCustomError(giftChain, "CAMPAIGN_NOT_ENDED");

      // Non-creator
      await expect(
        giftChain.connect(donor1).withdrawCampaignFunds(campaignID)
      ).to.be.revertedWithCustomError(giftChain, "NOT_AUTHORIZE_TO_WITHDRAW");

      // Nonexistent campaign
      await expect(
        giftChain.connect(creator).withdrawCampaignFunds(ethers.id("nonexistent"))
      ).to.be.revertedWithCustomError(giftChain, "CAMPAIGN_NOT_FOUND");

      // Already withdrawn
      await time.increase(oneDay + 1);
      await giftChain.connect(creator).withdrawCampaignFunds(campaignID);
      await expect(
        giftChain.connect(creator).withdrawCampaignFunds(campaignID)
      ).to.be.revertedWithCustomError(giftChain, "FUNDS_ALREADY_WITHDRAWN");
    });
  });

  describe("View Functions", function () {
    let campaignID: string;

    beforeEach(async function () {
      campaignID = ethers.id("view-campaign");
      await giftChain.connect(creator).createCampaign(
        campaignTitle,
        campaignDescription,
        await mockToken.getAddress(),
        campaignGoal,
        campaignDeadline,
        campaignID
      );
    });

    it("should return correct campaign details", async function () {
      const details = await giftChain.getCampaignDetails(campaignID);
      
      expect(details.creator).to.equal(await creator.getAddress());
      expect(details.token).to.equal(await mockToken.getAddress());
      expect(details.title).to.equal(campaignTitle);
      expect(details.description).to.equal(campaignDescription);
      expect(details.goal).to.equal(campaignGoal);
      expect(details.deadline).to.equal(campaignDeadline);
      expect(details.raisedAmount).to.equal(0);
      expect(details.withdrawn).to.be.false;
    });

    it("should revert for nonexistent campaign", async function () {
      await expect(
        giftChain.getCampaignDetails(ethers.id("nonexistent"))
      ).to.be.reverted; // Or with custom error if implemented
    });
  });
});