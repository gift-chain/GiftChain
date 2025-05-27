import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  GiftChain,
  GiftChain__factory,
  ERC20Mock,
  ERC20Mock__factory
} from "../typechain-types";

describe("GiftChain - Contribution Functions", function () {
  let GiftChain: GiftChain__factory;
  let giftChain: GiftChain;
  let owner: SignerWithAddress;
  let relayer: SignerWithAddress;
  let contributor1: SignerWithAddress;
  let contributor2: SignerWithAddress;
  let creator: SignerWithAddress;

  let TestToken: ERC20Mock__factory;
  let testToken: ERC20Mock;

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
    await testToken.connect(owner).transfer(contributor1.address, ethers.utils.parseEther("100"));
    await testToken.connect(owner).transfer(contributor2.address, ethers.utils.parseEther("100"));
  });

  describe("contribute()", function () {
    it("Should allow contributions to a creator's pool", async function () {
      const amount = ethers.utils.parseEther("10");

      await testToken.connect(contributor1).approve(giftChain.address, amount);
      await expect(giftChain.connect(contributor1).contribute(testToken.address, amount, creatorId))
        .to.emit(giftChain, "ContributionAdded")
        .withArgs(creatorId, contributor1.address, testToken.address, amount);

      expect(await giftChain.creatorContributions(creatorId)).to.equal(amount);
      expect(await giftChain.contributorBalances(creatorId, contributor1.address)).to.equal(amount);
    });

    it("Should reject invalid contributions", async function () {
      const amount = ethers.utils.parseEther("1");

      await expect(
        giftChain.connect(contributor1).contribute(ethers.constants.AddressZero, amount, creatorId)
      ).to.be.revertedWith("INVALID_ADDRESS");

      await expect(
        giftChain.connect(contributor1).contribute(testToken.address, 0, creatorId)
      ).to.be.revertedWith("INVALID_AMOUNT");
    });
  });

  describe("withdrawContribution()", function () {
    before(async function () {
      // Create a gift first to set the token
      const giftId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("gift1"));
      const amount = ethers.utils.parseEther("5");
      await testToken.connect(creator).approve(giftChain.address, amount);
      await giftChain.connect(relayer).createGift(
        testToken.address,
        amount,
        Math.floor(Date.now() / 1000) + 3600,
        "Test gift",
        giftId,
        creatorId
      );
    });

    it("Should allow withdrawing unused contributions", async function () {
      const amount = ethers.utils.parseEther("5");

      await expect(giftChain.connect(contributor1).withdrawContribution(creatorId, amount))
        .to.emit(giftChain, "ContributionWithdrawn")
        .withArgs(creatorId, contributor1.address, amount);

      expect(await giftChain.creatorContributions(creatorId)).to.equal(ethers.utils.parseEther("5"));
      expect(await giftChain.contributorBalances(creatorId, contributor1.address)).to.equal(ethers.utils.parseEther("5"));
    });

    it("Should reject invalid withdrawals", async function () {
      await expect(
        giftChain.connect(contributor1).withdrawContribution(creatorId, ethers.utils.parseEther("100"))
      ).to.be.revertedWith("INSUFFICIENT_BALANCE");

      const unknownCreator = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("unknown"));
      await expect(
        giftChain.connect(contributor1).withdrawContribution(unknownCreator, ethers.utils.parseEther("1"))
      ).to.be.revertedWith("GiftNotFound");
    });
  });

  describe("Integration", function () {
    it("Should let creators use contributed funds for gifts", async function () {
      const contributionAmount = ethers.utils.parseEther("20");
      const giftAmount = ethers.utils.parseEther("15");

      await testToken.connect(contributor2).approve(giftChain.address, contributionAmount);
      await giftChain.connect(contributor2).contribute(testToken.address, contributionAmount, creatorId);

      const giftId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("gift2"));
      await giftChain.connect(relayer).createGift(
        testToken.address,
        giftAmount,
        Math.floor(Date.now() / 1000) + 3600,
        "Pool-funded gift",
        giftId,
        creatorId
      );

      expect(await giftChain.creatorContributions(creatorId)).to.equal(ethers.utils.parseEther("5"));
    });
  });
});