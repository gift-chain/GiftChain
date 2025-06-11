import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { Contract, Signer } from "ethers";

describe("GiftChain - Campaign Functionality Tests", function () {
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
    campaignDeadline = (await time.latest()) + oneDay;
  });

  beforeEach(async function () {
    // Deploy fresh contracts for each test
    const MockToken = await ethers.getContractFactory("MockERC20");
    mockToken = await MockToken.deploy("Mock Token", "MTK", ethers.parseEther("1000000"));
    await mockToken.waitForDeployment();

    const GiftChain = await ethers.getContractFactory("GiftChain");
    giftChain = await GiftChain.deploy(await relayer.getAddress());
    await giftChain.waitForDeployment();

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

      // Verify transaction
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

    describe("should revert with invalid parameters", function () {
      let validCampaignID: string;

      beforeEach(async function () {
        validCampaignID = ethers.id("valid-campaign");
        // Create one valid campaign first
        await giftChain.connect(creator).createCampaign(
          campaignTitle,
          campaignDescription,
          await mockToken.getAddress(),
          campaignGoal,
          campaignDeadline,
          validCampaignID
        );
      });

      it("empty title", async function () {
        await expect(
          giftChain.connect(creator).createCampaign(
            "",
            campaignDescription,
            await mockToken.getAddress(),
            campaignGoal,
            campaignDeadline,
            ethers.id("empty-title")
          )
        ).to.be.revertedWithCustomError(giftChain, "INVALID_TITLE");
      });

      it("invalid description length", async function () {
        await expect(
          giftChain.connect(creator).createCampaign(
            campaignTitle,
            "A".repeat(51), // 51 chars (limit is 50)
            await mockToken.getAddress(),
            campaignGoal,
            campaignDeadline,
            ethers.id("long-desc")
          )
        ).to.be.revertedWithCustomError(giftChain, "INVALID_DESCRIPTION");
      });

      it("zero amount", async function () {
        await expect(
          giftChain.connect(creator).createCampaign(
            campaignTitle,
            campaignDescription,
            await mockToken.getAddress(),
            0,
            campaignDeadline,
            ethers.id("zero-amount")
          )
        ).to.be.revertedWithCustomError(giftChain, "INVALID_AMOUNT");
      });

      it("past deadline", async function () {
        await expect(
          giftChain.connect(creator).createCampaign(
            campaignTitle,
            campaignDescription,
            await mockToken.getAddress(),
            campaignGoal,
            (await time.latest()) - 1, // Past timestamp
            ethers.id("past-deadline")
          )
        ).to.be.revertedWithCustomError(giftChain, "EXPIRY_CAN_ONLY_BE_IN_FUTURE");
      });

      it("duplicate campaign ID", async function () {
        await expect(
          giftChain.connect(creator).createCampaign(
            campaignTitle,
            campaignDescription,
            await mockToken.getAddress(),
            campaignGoal,
            campaignDeadline,
            validCampaignID // Reusing existing ID
          )
        ).to.be.revertedWithCustomError(giftChain, "CAMPAIGN_ALREADY_EXIST");
      });

      it("zero address for token", async function () {
        await expect(
          giftChain.connect(creator).createCampaign(
            campaignTitle,
            campaignDescription,
            ethers.ZeroAddress,
            campaignGoal,
            campaignDeadline,
            ethers.id("zero-address")
          )
        ).to.be.revertedWithCustomError(giftChain, "INVALID_ADDRESS");
      });
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

    it("should allow donation to a campaign", async function () {
      const tx = await giftChain.connect(donor1).donateToCampaign(campaignID, donationAmount);

      // Verify events
      await expect(tx)
        .to.emit(giftChain, "DonationReceived")
        .withArgs(campaignID, await donor1.getAddress(), donationAmount);

      await expect(tx)
        .to.emit(giftChain, "ContributionAdded")
        .withArgs(
          ethers.id(await creator.getAddress()),
          await donor1.getAddress(),
          await mockToken.getAddress(),
          donationAmount
        );

      // Verify state changes
      const campaign = await giftChain.campaigns(campaignID);
      expect(campaign.raisedAmount).to.equal(donationAmount);
    });

    it("should update balances correctly", async function () {
      const initialContractBalance = await mockToken.balanceOf(giftChain.target);
      const initialDonorBalance = await mockToken.balanceOf(await donor1.getAddress());

      await giftChain.connect(donor1).donateToCampaign(campaignID, donationAmount);

      expect(await mockToken.balanceOf(giftChain.target)).to.equal(
        initialContractBalance + donationAmount
      );
      expect(await mockToken.balanceOf(await donor1.getAddress())).to.equal(
        initialDonorBalance - donationAmount
      );
    });

    describe("should revert with invalid donation parameters", function () {
      it("zero amount", async function () {
        await expect(
          giftChain.connect(donor1).donateToCampaign(campaignID, 0)
        ).to.be.revertedWithCustomError(giftChain, "INVALID_AMOUNT");
      });

      it("nonexistent campaign", async function () {
        await expect(
          giftChain.connect(donor1).donateToCampaign(ethers.id("nonexistent"), donationAmount)
        ).to.be.revertedWithCustomError(giftChain, "CAMPAIGN_NOT_FOUND");
      });

      it("exceeds campaign goal", async function () {
        const excessAmount = campaignGoal + ethers.parseEther("1");
        await expect(
          giftChain.connect(donor1).donateToCampaign(campaignID, excessAmount)
        ).to.be.revertedWithCustomError(giftChain, "EXCEEDS_CAMPAIGN_GOAL");
      });

      it("after deadline", async function () {
        await time.increase(oneDay + 1);
        await expect(
          giftChain.connect(donor1).donateToCampaign(campaignID, donationAmount)
        ).to.be.revertedWithCustomError(giftChain, "CAMPAIGN_EXPIRED");
      });
    });

    it("should allow multiple donations", async function () {
      const donation2 = ethers.parseEther("30");
      const totalExpected = donationAmount + donation2;

      await giftChain.connect(donor1).donateToCampaign(campaignID, donationAmount);
      await giftChain.connect(donor2).donateToCampaign(campaignID, donation2);

      const campaign = await giftChain.campaigns(campaignID);
      expect(campaign.raisedAmount).to.equal(totalExpected);
    });

    it("should reach goal with multiple donations", async function () {
      // First donation
      await giftChain.connect(donor1).donateToCampaign(campaignID, donationAmount);
      
      // Second donation to reach goal
      const remaining = campaignGoal - donationAmount;
      await giftChain.connect(donor2).donateToCampaign(campaignID, remaining);

      const campaign = await giftChain.campaigns(campaignID);
      expect(campaign.raisedAmount).to.equal(campaignGoal);
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
        donationAmount, // Goal = donation amount
        campaignDeadline,
        campaignID
      );
      await giftChain.connect(donor1).donateToCampaign(campaignID, donationAmount);
    });

    it("should allow creator to withdraw funds after deadline", async function () {
      await time.increase(oneDay + 1);

      const initialCreatorBalance = await mockToken.balanceOf(await creator.getAddress());
      const initialContractBalance = await mockToken.balanceOf(giftChain.target);

      const tx = await giftChain.connect(creator).withdrawCampaignFunds(campaignID);

      // Verify events
      await expect(tx)
        .to.emit(giftChain, "ContributionWithdrawn")
        .withArgs(
          ethers.id(await creator.getAddress()),
          await creator.getAddress(),
          donationAmount
        );

      // Verify state
      const campaign = await giftChain.campaigns(campaignID);
      expect(campaign.withdrawn).to.be.true;

      // Verify balances
      expect(await mockToken.balanceOf(await creator.getAddress())).to.equal(
        initialCreatorBalance + donationAmount
      );
      expect(await mockToken.balanceOf(giftChain.target)).to.equal(
        initialContractBalance - donationAmount
      );
    });

    describe("should revert with invalid withdrawal attempts", function () {
      it("non-creator attempting to withdraw", async function () {
        await expect(
          giftChain.connect(donor1).withdrawCampaignFunds(campaignID)
        ).to.be.revertedWithCustomError(giftChain, "NOT_AUTHORIZE_TO_WITHDRAW");
      });

      it("before deadline", async function () {
        await expect(
          giftChain.connect(creator).withdrawCampaignFunds(campaignID)
        ).to.be.revertedWithCustomError(giftChain, "CAMPAIGN_NOT_ENDED");
      });

      it("already withdrawn", async function () {
        await time.increase(oneDay + 1);
        await giftChain.connect(creator).withdrawCampaignFunds(campaignID);
        await expect(
          giftChain.connect(creator).withdrawCampaignFunds(campaignID)
        ).to.be.revertedWithCustomError(giftChain, "FUNDS_ALREADY_WITHDRAWN");
      });

      it("nonexistent campaign", async function () {
        await expect(
          giftChain.connect(creator).withdrawCampaignFunds(ethers.id("nonexistent"))
        ).to.be.revertedWithCustomError(giftChain, "CAMPAIGN_NOT_FOUND");
      });
    });
  });
});