const { ethers } = require("hardhat");
const { keccak256 } = require("ethers");

async function main() {
  // Get signers
  const [deployer, creator] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  console.log("Creator address:", creator.address);

  // Deploy Mock Token
  console.log("\nDeploying Mock Token...");
  const MockToken = await ethers.getContractFactory("MockERC20");
  const token = await MockToken.deploy("Mock Token", "MTK", ethers.parseEther("100000"));
  const tokenAddress = await token.getAddress();
  console.log("Mock Token deployed to:", tokenAddress);

  // Deploy GiftChain
  console.log("\nDeploying GiftChain...");
  const GiftChain = await ethers.getContractFactory("GiftChain");
  const giftChain = await GiftChain.deploy(deployer.address);
  const giftChainAddress = await giftChain.getAddress();
  console.log("GiftChain deployed to:", giftChainAddress);

  // Mint tokens to creator
  console.log("\nMinting tokens to creator...");
  const mintAmount = ethers.parseEther("1000");
  await token.transfer(creator.address, mintAmount);
  console.log("Minted", ethers.formatEther(mintAmount), "tokens to creator");

  // Approve tokens
  console.log("\nApproving tokens...");
  await token.connect(creator).approve(giftChainAddress, mintAmount);
  console.log("Approved", ethers.formatEther(mintAmount), "tokens to GiftChain");

  // Prepare bulk gift creation parameters
  console.log("\nPreparing bulk gift creation parameters...");
  
  // Create 5 gifts with different amounts
  const amounts = [
    ethers.parseEther("1"),    // 1 token
    ethers.parseEther("2"),    // 2 tokens
    ethers.parseEther("0.5"),   // 0.5 tokens
    ethers.parseEther("3"),   // 0.5 tokens
    ethers.parseEther("0.5")  // 0.5 tokens
  ];

  // Set expiry times (1 hour, 2 hours, 3 hours, 4 hours and 5 hours from now)
  const currentTime = Math.floor(Date.now() / 1000);
  const expiries = [
    currentTime + 3600,    // 1 hour
    currentTime + 7200,    // 2 hours
    currentTime + 10800,   // 3 hours
    currentTime + 14400,   // 4 hours
    currentTime + 18000    // 5 hours
  ];

  // Create unique messages
  const messages = [
    "Happy Birthday!",
    "Congratulations!",
    "Thank you!",
    "Congrat!",
    "Compensation!"
  ];

  // Generate unique gift IDs
  const giftIDs = [
    keccak256(ethers.toUtf8Bytes("gift1" + Date.now())),
    keccak256(ethers.toUtf8Bytes("gift2" + Date.now())),
    keccak256(ethers.toUtf8Bytes("gift3" + Date.now())),
    keccak256(ethers.toUtf8Bytes("gift4" + Date.now())),
    keccak256(ethers.toUtf8Bytes("gift5" + Date.now()))
  ];

  // Create creator hash
  const creatorHash = keccak256(ethers.getAddress(creator.address));

  // Log gift details
  console.log("\nGift Details:");
  for (let i = 0; i < amounts.length; i++) {
    console.log(`\nGift ${i + 1}:`);
    console.log("Amount:", ethers.formatEther(amounts[i]), "tokens");
    console.log("Expiry:", new Date(expiries[i] * 1000).toLocaleString());
    console.log("Message:", messages[i]);
    console.log("Gift ID:", giftIDs[i]);
  }

  // Create bulk gifts
  console.log("\nCreating bulk gifts...");
  const tx = await giftChain.connect(creator).createBulkGifts(
    tokenAddress,
    amounts,
    expiries,
    messages,
    giftIDs,
    creatorHash
  );

  // Wait for transaction to be mined
  const receipt = await tx.wait();
  console.log("Transaction hash:", receipt.hash);

  // Verify gifts were created
  console.log("\nVerifying created gifts...");
  for (let i = 0; i < giftIDs.length; i++) {
    const gift = await giftChain.gifts(giftIDs[i]);
    console.log(`\nGift ${i + 1} Status:`);
    console.log("Token:", gift.token);
    console.log("Amount:", ethers.formatEther(gift.amount));
    console.log("Message:", gift.message);
    console.log("Status:", ["NONE", "PENDING", "CLAIMED", "RECLAIMED"][gift.status]);
    console.log("Creator:", gift.creator);
    console.log("Expiry:", gift.expiry);
    // console.log("Expiry:", new Date(Number(gift.expiry) * 1000).toLocaleString());
  }

  // Check creator's token balance
  const creatorBalance = await token.balanceOf(creator.address);
  console.log("\nCreator's remaining token balance:", ethers.formatEther(creatorBalance));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
  });