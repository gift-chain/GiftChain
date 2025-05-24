import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { Contract } from "ethers";

describe("Bulk Gift Creation", function () {
  let giftChain: Contract;
  let token: Contract;
  let tokenAddress: string;
  let giftChainAddress: string;
  let owner: HardhatEthersSigner;
  let creator: HardhatEthersSigner;
  let recipient: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, creator, recipient] = await ethers.getSigners();

    // Deploy mock ERC20 token
    const MockToken = await ethers.getContractFactory("MockERC20");
    const tokenContract = await MockToken.deploy("Mock Token", "MTK", ethers.parseEther("1000000"));
    await tokenContract.waitForDeployment();
    token = tokenContract as unknown as Contract;
    tokenAddress = await token.getAddress();

    // Deploy GiftChain contract
    const GiftChain = await ethers.getContractFactory("GiftChain");
    const giftChainContract = await GiftChain.deploy(owner.address); // Owner is the relayer
    await giftChainContract.waitForDeployment();
    giftChain = giftChainContract as unknown as Contract;
    giftChainAddress = await giftChain.getAddress();

    // Mint tokens to owner
    const mintAmount = ethers.parseEther("1000");
    await token.transfer(owner.address, mintAmount);
    await token.transfer(creator.address, mintAmount);
    await token.approve(giftChainAddress, mintAmount);
    await token.connect(creator).approve(giftChainAddress, mintAmount);
  });

  it("Should create multiple gifts successfully", async function () {
    const amount = ethers.parseEther("1");
    const expiry = (await time.latest()) + 3600; // 1 hour from now
    const message = "Test gift";
    const creatorHash = ethers.keccak256(ethers.getAddress(creator.address));
    
    const amounts = [amount, amount , amount, amount, amount];
    const expiries = [expiry, expiry, expiry, expiry, expiry];
    const messages = [message, message, message, message, message];
    const giftIDs = [
      ethers.keccak256(ethers.toUtf8Bytes("gift1" + Date.now())),
      ethers.keccak256(ethers.toUtf8Bytes("gift2" + Date.now())),
      ethers.keccak256(ethers.toUtf8Bytes("gift3" + Date.now())),
      ethers.keccak256(ethers.toUtf8Bytes("gift4" + Date.now())),
      ethers.keccak256(ethers.toUtf8Bytes("gift5" + Date.now()))
    ];

    const tx = await giftChain.connect(creator).createBulkGifts(
      tokenAddress,
      amounts,
      expiries,
      messages,
      giftIDs,
      creatorHash
    );
    const receipt = await tx.wait();
    const events = receipt.logs
      .map((log: any) => {
        try { return giftChain.interface.parseLog(log); } catch { return null; }
      })
      .filter((e: any) => e && e.name === "GiftCreated");

    expect(events.length).to.equal(5);
    expect(events[0].args.giftID).to.equal(giftIDs[0]);
    expect(events[1].args.giftID).to.equal(giftIDs[1]);
    expect(events[2].args.giftID).to.equal(giftIDs[2]);
    expect(events[3].args.giftID).to.equal(giftIDs[3]);
    expect(events[4].args.giftID).to.equal(giftIDs[4]);
    expect(events[0].args.creator).to.equal(creatorHash);
    expect(events[1].args.creator).to.equal(creatorHash);
    expect(events[2].args.creator).to.equal(creatorHash);
    expect(events[3].args.creator).to.equal(creatorHash);
    expect(events[4].args.creator).to.equal(creatorHash);
    expect(events[0].args.token).to.equal(tokenAddress);
    expect(events[1].args.token).to.equal(tokenAddress);
    expect(events[2].args.token).to.equal(tokenAddress);
    expect(events[3].args.token).to.equal(tokenAddress);
    expect(events[4].args.token).to.equal(tokenAddress);
    expect(events[0].args.message).to.equal(message);
    expect(events[1].args.message).to.equal(message);
    expect(events[2].args.message).to.equal(message);
    expect(events[3].args.message).to.equal(message);
    expect(events[4].args.message).to.equal(message);
    expect(events[0].args.amount).to.equal(amount);
    expect(events[1].args.amount).to.equal(amount);
    expect(events[2].args.amount).to.equal(amount);
    expect(events[3].args.amount).to.equal(amount);
    expect(events[4].args.amount).to.equal(amount);
    expect(events[0].args.status).to.equal("PENDING");
    expect(events[1].args.status).to.equal("PENDING");
    expect(events[2].args.status).to.equal("PENDING");
    expect(events[3].args.status).to.equal("PENDING");
    expect(events[4].args.status).to.equal("PENDING");

    // Verify gifts were created correctly
    const gift1 = await giftChain.gifts(giftIDs[0]);
    const gift2 = await giftChain.gifts(giftIDs[1]);

    expect(gift1.token).to.equal(tokenAddress);
    expect(gift1.amount).to.equal(amount);
    expect(gift1.message).to.equal(message);
    expect(gift1.status).to.equal(1); // PENDING
    expect(gift1.creator).to.equal(creatorHash);

    expect(gift2.token).to.equal(tokenAddress);
    expect(gift2.amount).to.equal(amount);
    expect(gift2.message).to.equal(message);
    expect(gift2.status).to.equal(1); // PENDING
    expect(gift2.creator).to.equal(creatorHash);
  });

  it("Should handle different amounts and messages for each gift", async function () {
    const amounts = [
      ethers.parseEther("1"),
      ethers.parseEther("2"),
      ethers.parseEther("0.5"),
      ethers.parseEther("3"),
      ethers.parseEther("0.5")
    ];
    const expiry = (await time.latest()) + 3600;
    const expiries = [expiry, expiry, expiry, expiry, expiry];
    const messages = ["Happy Birthday!", "Congratulations!", "Thank you!", "Congrat!", "Compensation!"];
    const giftIDs = [
      ethers.keccak256(ethers.toUtf8Bytes("gift1" + Date.now())),
      ethers.keccak256(ethers.toUtf8Bytes("gift2" + Date.now())),
      ethers.keccak256(ethers.toUtf8Bytes("gift3" + Date.now())),
      ethers.keccak256(ethers.toUtf8Bytes("gift4" + Date.now())),
      ethers.keccak256(ethers.toUtf8Bytes("gift5" + Date.now()))
    ];
    const creatorHash = ethers.keccak256(ethers.getAddress(creator.address));

    await giftChain.connect(creator).createBulkGifts(
      tokenAddress,
      amounts,
      expiries,
      messages,
      giftIDs,
      creatorHash
    );

    // Verify each gift has correct amount
    for (let i = 0; i < amounts.length; i++) {
      const gift = await giftChain.gifts(giftIDs[i]);
      expect(gift.amount).to.equal(amounts[i]);
      expect(gift.message).to.equal(messages[i]);
      expect(gift.message).to.equal(messages[i]);
      expect(gift.message).to.equal(messages[i]);
      expect(gift.message).to.equal(messages[i]);
    }
  });

  it("Should refund tokens if gift creation fails", async function () {
    const amount = ethers.parseEther("1");
    const expiry = (await time.latest()) + 3600;
    const message = "Test gift";
    const creatorHash = ethers.keccak256(ethers.getAddress(creator.address));
    
    // Create an invalid gift ID that will cause the second gift to fail
    const giftID = ethers.keccak256(ethers.toUtf8Bytes("gift1"));
    
    // Create first gift
    await giftChain.createGift(
      tokenAddress,
      amount,
      expiry,
      message,
      giftID,
      creatorHash
    );

    // Try to create bulk gifts with same gift ID (will fail)
    const amounts = [amount, amount, amount, amount, amount];
    const expiries = [expiry, expiry, expiry, expiry, expiry];
    const messages = ["Happy Birthday!", "Congratulations!", "Thank you!", "Congrat!", "Compensation!"];
    const giftIDs = [giftID, ethers.keccak256(ethers.toUtf8Bytes("gift2")), ethers.keccak256(ethers.toUtf8Bytes("gift3")), ethers.keccak256(ethers.toUtf8Bytes("gift4")), ethers.keccak256(ethers.toUtf8Bytes("gift5"))];

    // Get balance before
    const balanceBefore = await token.balanceOf(owner.address);

    // Attempt to create bulk gifts (should fail)
    await expect(
      giftChain.connect(creator).createBulkGifts(
        tokenAddress,
        amounts,
        expiries,
        messages,
        giftIDs,
        creatorHash
      )
    ).to.be.revertedWithCustomError(giftChain, "BULK_CREATION_FAILED");

    // Get balance after
    const balanceAfter = await token.balanceOf(owner.address);

    // Check that the balance is the same (refunded)
    expect(balanceAfter).to.equal(balanceBefore);
  });

  it("Should handle partial success and refund all tokens", async function () {
    const amount = ethers.parseEther("1");
    const expiry = (await time.latest()) + 3600;
    const message = "Test gift";
    const creatorHash = ethers.keccak256(ethers.getAddress(creator.address));
    
    // Create three gifts, but make the second one invalid
    const amounts = [amount, amount, amount, amount, amount];
    const expiries = [expiry, expiry, expiry, 0, expiry]; // fourth expiry is invalid
    const messages = [message, message, message, message, message];
    const giftIDs = [
      ethers.keccak256(ethers.toUtf8Bytes("gift1" + Date.now())),
      ethers.keccak256(ethers.toUtf8Bytes("gift2" + Date.now())),
      ethers.keccak256(ethers.toUtf8Bytes("gift3" + Date.now())),
      ethers.keccak256(ethers.toUtf8Bytes("gift4" + Date.now())),
      ethers.keccak256(ethers.toUtf8Bytes("gift5" + Date.now()))
    ];

    // Get balance before
    const balanceBefore = await token.balanceOf(owner.address);
    // Attempt to create bulk gifts (should fail after first gift)
    await expect(
      giftChain.connect(creator).createBulkGifts(
        tokenAddress,
        amounts,
        expiries,
        messages,
        giftIDs,
        creatorHash
      )
    ).to.be.revertedWithCustomError(giftChain, "BULK_CREATION_FAILED");

    // Get balance after
    const balanceAfter = await token.balanceOf(owner.address);

    // Check that the balance is correct (all tokens refunded)
    expect(balanceAfter).to.equal(balanceBefore); // All tokens refunded, no gifts created

    // Verify no gifts were created
    const gift1 = await giftChain.gifts(giftIDs[0]);
    expect(gift1.status).to.equal(0); // NONE

    const gift2 = await giftChain.gifts(giftIDs[1]);
    expect(gift2.status).to.equal(0); // NONE

    const gift3 = await giftChain.gifts(giftIDs[2]);
    expect(gift3.status).to.equal(0); // NONE
  });

  it("Should fail if gift creation is not up to 5 gifts", async function () {
    const amount = ethers.parseEther("1");
    const expiry = (await time.latest()) + 3600;
    const message = "Test gift";
    const creatorHash = ethers.keccak256(ethers.getAddress(creator.address));
    
    const giftID1 = ethers.keccak256(ethers.toUtf8Bytes("gift1"));
    const giftID2 = ethers.keccak256(ethers.toUtf8Bytes("gift2"));
    const giftID3 = ethers.keccak256(ethers.toUtf8Bytes("gift3"));
    

    const amounts = [amount, amount, amount];
    const expiries = [expiry, expiry, expiry];
    const messages = ["Happy Birthday!", "Congratulations!", "Thank you!"];
    const giftIDs = [giftID1, giftID2, giftID3];

    // Get balance before
    const balanceBefore = await token.balanceOf(owner.address);

    // Attempt to create bulk gifts (should fail)
    await expect(
      giftChain.connect(creator).createBulkGifts(
        tokenAddress,
        amounts,
        expiries,
        messages,
        giftIDs,
        creatorHash
      )
    ).to.be.revertedWithCustomError(giftChain, "BULK_CREATION_MUST_BE_AT_LEAST_5");
  });

  it("Should fail if the creator is different from msg.sender", async function () {
    const amount = ethers.parseEther("1");
    const expiry = (await time.latest()) + 3600;
    const message = "Test gift";
    const creatorHash = ethers.keccak256(ethers.getAddress(creator.address));
    
    // Create three gifts, but make the second one invalid
    const amounts = [amount, amount, amount, amount, amount];
    const expiries = [expiry, expiry, expiry, 0, expiry]; // fourth expiry is invalid
    const messages = [message, message, message, message, message];
    const giftIDs = [
      ethers.keccak256(ethers.toUtf8Bytes("gift1" + Date.now())),
      ethers.keccak256(ethers.toUtf8Bytes("gift2" + Date.now())),
      ethers.keccak256(ethers.toUtf8Bytes("gift3" + Date.now())),
      ethers.keccak256(ethers.toUtf8Bytes("gift4" + Date.now())),
      ethers.keccak256(ethers.toUtf8Bytes("gift5" + Date.now()))
    ];

    // Get balance before
    const balanceBefore = await token.balanceOf(owner.address);
    // Attempt to create bulk gifts (should fail after first gift)
    await expect(
      giftChain.createBulkGifts(
        tokenAddress,
        amounts,
        expiries,
        messages,
        giftIDs,
        creatorHash
      )
    ).to.be.revertedWithCustomError(giftChain, "CREATOR_MISMATCH");
  });
}); 