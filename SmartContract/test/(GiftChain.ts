// import { expect } from "chai";
// import { ethers } from "hardhat";
// import { GiftChain } from "../typechain-types";
// import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
// import { BigNumber } from "ethers";

// describe("GiftChain", function () {
//   let giftChain: GiftChain;
//   let owner: SignerWithAddress;
//   let relayer: SignerWithAddress;
//   let creator: SignerWithAddress;
//   let recipient: SignerWithAddress;
//   let otherAccount: SignerWithAddress;
//   let testToken: any;

//   const testAmount = ethers.utils.parseEther("1");
//   const testMessage = "Test gift message";
//   const testExpiry = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
//   let testGiftId: string;

//   before(async function () {
//     [owner, relayer, creator, recipient, otherAccount] = await ethers.getSigners();

//     // Deploy test ERC20 token
//     const TestToken = await ethers.getContractFactory("TestToken");
//     testToken = await TestToken.deploy();
//     await testToken.deployed();

//     // Deploy GiftChain
//     const GiftChain = await ethers.getContractFactory("GiftChain");
//     giftChain = await GiftChain.deploy(relayer.address);
//     await giftChain.deployed();

//     // Generate test gift ID
//     testGiftId = ethers.utils.id("TEST_GIFT_123");
//   });

//   describe("Wallet Connection", function () {
//     it("Should connect with different accounts", async function () {
//       // Test owner connection
//       const ownerConnected = giftChain.connect(owner);
//       expect(await ownerConnected.provider?.getCode(ownerConnected.address)).to.not.equal("0x");

//       // Test relayer connection
//       const relayerConnected = giftChain.connect(relayer);
//       expect(await relayerConnected.provider?.getCode(relayerConnected.address)).to.not.equal("0x");
//     });
//   });

//   describe("Gift Lifecycle", function () {
//     it("Should create a gift (relayer only)", async function () {
//       // Approve token transfer first
//       await testToken.connect(creator).approve(giftChain.address, testAmount);

//       // Create gift through relayer
//       await expect(
//         giftChain.connect(relayer).createGift(
//           testToken.address,
//           testAmount,
//           testExpiry,
//           testMessage,
//           testGiftId,
//           ethers.utils.id(creator.address)
//         )
//       ).to.emit(giftChain, "GiftCreated");

//       // Verify gift creation
//       const gift = await giftChain.gifts(testGiftId);
//       expect(gift.token).to.equal(testToken.address);
//       expect(gift.amount).to.equal(testAmount);
//     });

//     it("Should validate gift correctly", async function () {
//       // Valid gift should return true
//       expect(await giftChain.validateGift("TEST_GIFT_123")).to.be.true;

//       // Invalid gift should revert
//       await expect(giftChain.validateGift("INVALID_CODE"))
//         .to.be.revertedWithCustomError(giftChain, "GiftNotFound");
//     });

//     it("Should claim gift successfully", async function () {
//       const recipientBalanceBefore = await testToken.balanceOf(recipient.address);

//       await expect(giftChain.connect(recipient).claimGift(testGiftId))
//         .to.emit(giftChain, "GiftClaimed");

//       const recipientBalanceAfter = await testToken.balanceOf(recipient.address);
//       expect(recipientBalanceAfter.sub(recipientBalanceBefore)).to.equal(testAmount);

//       // Verify gift status
//       const gift = await giftChain.gifts(testGiftId);
//       expect(gift.status).to.equal(2); // Status.SUCCESSFUL
//     });

//     it("Should not allow reclaiming claimed gift", async function () {
//       await expect(giftChain.connect(creator).reclaimGift("TEST_GIFT_123"))
//         .to.be.revertedWithCustomError(giftChain, "GiftAlreadyRedeemed");
//     });
//   });

//   describe("reclaimGift Functionality", function () {
//     let expiredGiftId: string;

//     before(async function () {
//       // Create an expired gift
//       expiredGiftId = ethers.utils.id("EXPIRED_GIFT");
//       await testToken.connect(creator).approve(giftChain.address, testAmount);

//       await giftChain.connect(relayer).createGift(
//         testToken.address,
//         testAmount,
//         Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
//         testMessage,
//         expiredGiftId,
//         ethers.utils.id(creator.address)
//       );
//     });

//     it("Should reclaim expired gift successfully", async function () {
//       const creatorBalanceBefore = await testToken.balanceOf(creator.address);

//       await expect(giftChain.connect(creator).reclaimGift("EXPIRED_GIFT"))
//         .to.emit(giftChain, "GiftReclaimed");

//       const creatorBalanceAfter = await testToken.balanceOf(creator.address);
//       expect(creatorBalanceAfter.sub(creatorBalanceBefore)).to.equal(testAmount);

//       // Verify gift status
//       const gift = await giftChain.gifts(expiredGiftId);
//       expect(gift.status).to.equal(3); // Status.RECLAIMED
//     });

//     it("Should not allow reclaiming by non-creator", async function () {
//       const anotherExpiredGiftId = ethers.utils.id("ANOTHER_EXPIRED_GIFT");
//       await testToken.connect(creator).approve(giftChain.address, testAmount);

//       await giftChain.connect(relayer).createGift(
//         testToken.address,
//         testAmount,
//         Math.floor(Date.now() / 1000) - 3600,
//         testMessage,
//         anotherExpiredGiftId,
//         ethers.utils.id(creator.address)
//       );

//       await expect(giftChain.connect(otherAccount).reclaimGift("ANOTHER_EXPIRED_GIFT"))
//         .to.be.revertedWithCustomError(giftChain, "InvalidGiftStatus");
//     });

//     it("Should not allow reclaiming unexpired gift", async function () {
//       const unexpiredGiftId = ethers.utils.id("UNEXPIRED_GIFT");
//       await testToken.connect(creator).approve(giftChain.address, testAmount);

//       await giftChain.connect(relayer).createGift(
//         testToken.address,
//         testAmount,
//         Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
//         testMessage,
//         unexpiredGiftId,
//         ethers.utils.id(creator.address)
//       );

//       await expect(giftChain.connect(creator).reclaimGift("UNEXPIRED_GIFT"))
//         .to.be.revertedWithCustomError(giftChain, "InvalidGiftStatus");
//     });
//   });
// });