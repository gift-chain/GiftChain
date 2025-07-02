require("dotenv").config();
const { ethers, keccak256, getAddress } = require("ethers");
const giftAbi = require("../abi/giftABI.json");
const ERC20_ABI = require("../abi/erc20ABI.json");
const { generateCode } = require("../utils/generateCode.js");
const sharp = require("sharp");
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");
const GiftCode = require("../models/Gift.js"); // Import Mongoose model


// Initialize provider and contracts
const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const relayer = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, provider);
const giftChain = new ethers.Contract(process.env.GIFTCHAIN_ADDRESS, giftAbi, relayer);

// Cache for token approvals
const approvedTokens = new Set();

const getGiftCodes = async (req, res) => {
  try {
    const { ids } = req.body;

    // Validate input
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of gift IDs'
      });
    }

    const normalizedIds = ids.map(id => id.toLowerCase());
    // giftID  hashedCode,

    // MongoDB's $in operator is used for efficient batch querying
    const gifts = await GiftCode.find(
      { 
        hashedCode: { $in: normalizedIds }
      },
      {
        giftID: 1,
        hashedCode: 1,
        _id: 0 // Exclude _id field from results
      }
    )
    // .collation({ locale: 'en', strength: 2 }) // Make query case-insensitive
    .lean(); // lean() is used for better performance when we don't need Mongoose documents

    // Create a map for O(1) lookup
    const giftMap = gifts.reduce((acc, gift) => {
      acc[gift.hashedCode] = gift.giftID;
      return acc;
    }, {});

    // Ensure all requested IDs are in the response, even if not found
    const response = normalizedIds.reduce((acc, hashedCode) => {
      acc[hashedCode] = giftMap[hashedCode] || null;
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Error fetching gift codes:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Function to approve token with max uint256
async function approveToken(tokenAddress, spender) {
  try {
    const erc20 = new ethers.Contract(tokenAddress, ERC20_ABI, relayer);
    const maxUint256 = ethers.MaxUint256;
    
    console.log(`Approving ${spender} to spend tokens at ${tokenAddress}...`);

    // const gasEstimate = await erc20.approve.estimateGas(spender, maxUint256);
    // const gasLimit = (gasEstimate * BigInt(2)).toString();

    const tx = await erc20.approve(
      spender, 
      maxUint256, 
      // {
      //   gasLimit: gasLimit,
      // }
    );

    console.log(`Approval transaction hash: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`Approved successfully in block ${receipt.blockNumber}`);

    approvedTokens.add(`${tokenAddress}:${spender}`);
    return true;
  } catch (err) {
    console.error(`Failed to approve ${spender}:`, err);
    throw err;
  }
}

// Function to check and handle token approvals
async function handleTokenApprovals(token, creator, amountBN) {
  try {
    const erc20 = new ethers.Contract(token, ERC20_ABI, relayer);
    const decimals = await erc20.decimals();

    const creatorAllowance = await erc20.allowance(creator, relayer.address);
    console.log("Creator allowance to relayer:", ethers.formatUnits(creatorAllowance, decimals));

    if (creatorAllowance < amountBN) {
      throw new Error("Creator needs to approve relayer first");
    }

    const relayerAllowance = await erc20.allowance(relayer.address, giftChain.target);
    console.log("Relayer allowance to GiftChain:", ethers.formatUnits(relayerAllowance, decimals));

    if (relayerAllowance < amountBN) {
      console.log("Approving GiftChain to spend relayer tokens...");
      await approveToken(token, giftChain.target);
    }

    return true;
  } catch (err) {
    console.error("Token approval handling failed:", err);
    throw err;
  }
}

// Function to generate PNG gift card with sharp
async function generateGiftCardImage(details) {
  return new Promise((resolve, reject) => {
    const { giftID, amount, token, expiry, message, creator, symbol } = details;
    const fileName = `giftcard_${giftID.replace(/-/g, "")}.png`;
    const downloadsDir = path.join(__dirname, "../downloads");
    const filePath = path.join(downloadsDir, fileName);

    // Ensure downloads directory exists
    try {
      if (!fs.existsSync(downloadsDir)) {
        fs.mkdirSync(downloadsDir, { recursive: true });
        console.log(`Created downloads directory: ${downloadsDir}`);
      }
    } catch (err) {
      console.error("Failed to create downloads directory:", err);
      return reject(err);
    }

    // Create SVG for gift card (3.5x2 inches at 300 DPI = 1050x600 pixels)
    const svg = `
      <svg width="1050" height="600" xmlns="http://www.w3.org/2000/svg">
        <!-- Gradient Background -->
        <defs>
          <linearGradient id="cardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#4B0082;stop-opacity:1"/>
            <stop offset="100%" style="stop-color:#00CED1;stop-opacity:1"/>
          </linearGradient>
        </defs>
        <!-- Card Background with Rounded Corners -->
        <rect x="10" y="10" width="1030" height="580" rx="20" ry="20" fill="url(#cardGradient)"/>
        <!-- Chip Icon -->
        <rect x="50" y="50" width="80" height="60" rx="5" ry="5" fill="#FFD700"/>
        <rect x="60" y="60" width="60" height="40" fill="#DAA520"/>
        <!-- Brand Logo -->
        <text x="950" y="80" font-family="Helvetica, Arial, sans-serif" font-size="40" font-weight="bold" fill="#FFFFFF" text-anchor="end">
          GiftChain
        </text>
        <!-- Gift ID (Styled like Card Number) -->
        <text x="50" y="180" font-family="Roboto, Arial, sans-serif" font-size="36" font-weight="bold" fill="#FFFFFF" letter-spacing="2">
          ${giftID.match(/.{1,4}/g).join(" ")}
        </text>
        <!-- Details -->
        <text x="50" y="250" font-family="Helvetica, Arial, sans-serif" font-size="28" fill="#FFFFFF">
          Amount: ${amount} ${symbol}
        </text>
        <text x="50" y="290" font-family="Helvetica, Arial, sans-serif" font-size="28" fill="#FFFFFF">
          Message: ${message}
        </text>
        <text x="50" y="330" font-family="Helvetica, Arial, sans-serif" font-size="28" fill="#FFFFFF">
          Expiry: ${new Date(expiry * 1000).toLocaleDateString()}
        </text>
        <text x="50" y="370" font-family="Helvetica, Arial, sans-serif" font-size="28" fill="#FFFFFF">
          Token: ${token.slice(0, 6)}...${token.slice(-4)}
        </text>
        <text x="50" y="410" font-family="Helvetica, Arial, sans-serif" font-size="28" fill="#FFFFFF">
          Creator: ${creator.slice(0, 6)}...${creator.slice(-4)}
        </text>
      </svg>
    `;

    // Generate QR code as PNG buffer with white background
    QRCode.toBuffer(giftID, {
      width: 200,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    }, async (err, qrBuffer) => {
      if (err) {
        console.error("QR code generation failed:", err);
        return reject(err);
      }

      console.log("QR code buffer size:", qrBuffer.length, "bytes");

      try {
        // Create base image from SVG
        let image = sharp(Buffer.from(svg)).png();

        // Add white background for QR code
        const qrBackground = Buffer.from(`
          <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" width="200" height="200" fill="#FFFFFF"/>
          </svg>
        `);
        image = image.composite([
          { input: qrBackground, left: 800, top: 300 },
          { input: qrBuffer, left: 800, top: 300 },
        ]);

        // Add "Scan to claim" text
        const textSvg = `
          <svg width="200" height="50" xmlns="http://www.w3.org/2000/svg">
            <text x="100" y="30" font-family="Helvetica, Arial, sans-serif" font-size="24" fill="#FFFFFF" text-anchor="middle">
              Scan to Claim
            </text>
          </svg>
        `;
        image = image.composite([{ input: Buffer.from(textSvg), left: 800, top: 500 }]);

        // Save to file
        await image.toFile(filePath);
        console.log(`Generated gift image: ${filePath}`);
        resolve(`/api/download/${fileName}`);
      } catch (err) {
        console.error("Image generation error:", err);
        reject(err);
      }
    });
  });
}

console.log("Initialized with:");
console.log("- Relayer address:", relayer.address);
console.log("- GiftChain address:", giftChain.target);

const createGift = async (req, res) => {
  try {
    const { token, amount, expiry, message, creator } = req.body;

    console.log("Received request:", {
      token,
      amount,
      expiry,
      message,
      creator,
    });

    // Input validation
    if (!token || !amount || !expiry || !message || !creator) {
      return res.status(400).json({ 
        success: false,
        error: "Missing required fields",
        details: {
          missingFields: {
            token: !token ? "Token address is required" : undefined,
            amount: !amount ? "Amount is required" : undefined,
            expiry: !expiry ? "Expiry timestamp is required" : undefined,
            message: !message ? "Message is required" : undefined,
            creator: !creator ? "Creator address is required" : undefined,
          },
        },
      });
    }

    if (!ethers.isAddress(token)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid token address",
        details: {
          token,
          message: "The provided token address is not a valid Ethereum address",
        },
      });
    }

    if (!ethers.isAddress(creator)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid creator address",
        details: {
          creator,
          message: "The provided creator address is not a valid Ethereum address",
        },
      });
    }

    if (message.length < 3 || message.length > 50) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid message length",
        details: {
          message,
          length: message.length,
          required: "Message must be between 3 and 50 characters long",
        },
      });
    }

    const now = Math.floor(Date.now() / 1000);
    if (now >= expiry) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid expiry date",
        details: {
          provided: expiry,
          currentTime: now,
          message: "Expiry date must be in the future",
        },
      });
    }

    const erc20 = new ethers.Contract(token, ERC20_ABI, relayer);
    console.log("Initialized ERC20 contract at:", token);

    try {
      const decimals = await erc20.decimals();
      console.log("Token decimals:", decimals);
      const symbol = await erc20.symbol();
      console.log("Token symbol:", symbol);
      const amountBN = ethers.parseUnits(amount.toString(), decimals);
      const feeBN = amountBN / BigInt(100); // 1% fee
      // const amountAfterFeeBN = amountBN - feeBN;

      console.log(`[AMOUNT] Breakdown:
        Original: ${ethers.formatUnits(amountBN, decimals)} ${symbol}`);
        // Fee (1%): ${ethers.formatUnits(feeBN, decimals)} ${symbol}
        // After fee: ${ethers.formatUnits(amountAfterFeeBN, decimals)} ${symbol}`);

      const balance = await erc20.balanceOf(creator);
      console.log("Creator balance:", ethers.formatUnits(balance, decimals));
      
      if (balance < amountBN) {
        return res.status(400).json({ 
          success: false,
          error: "Insufficient token balance",
          details: {
            balance: ethers.formatUnits(balance, decimals),
            required: amount,
            token,
            creator,
          },
        });
      }

      await handleTokenApprovals(token, creator, amountBN);

      // Transfer tokens from creator to relayer
      let tokensTransferred = false;
      try {
        console.log("Transferring tokens from creator to relayer...");
        const gasEstimate = await erc20.transferFrom.estimateGas(creator, relayer.address, amountBN);
        const gasLimit = (gasEstimate * BigInt(2)).toString();
        const pullTx = await erc20.transferFrom(
          creator, 
          relayer.address, 
          amountBN, 
          {
            gasLimit,
          }
        );
        console.log("Transfer transaction hash:", pullTx.hash);
        const receipt = await pullTx.wait();
        // console.log("Transfer receipt:", receipt);
        console.log("Transfer successful in block", receipt.blockNumber);
        tokensTransferred = true;
      } catch (err) {
        console.error("Transfer failed:", err);
        return res.status(400).json({ 
          success: false,
          error: "Failed to transfer tokens",
          details: {
            reason: err.reason || err.message,
            transaction: err.transaction,
            token,
            from: creator,
            to: relayer.address,
            amount: ethers.formatUnits(amountBN, decimals),
          },
        });
      }

      // Check relayer balance after transfer
      const relayerBalance = await erc20.balanceOf(relayer.address);
      console.log("Relayer balance after transfer:", ethers.formatUnits(relayerBalance, decimals));
      if (relayerBalance < amountBN) {
        if (tokensTransferred) {
          try {
            console.log("Returning tokens to creator due to insufficient relayer balance...");
            const returnTx = await erc20.transfer(creator, amountBN);
            await returnTx.wait();
            console.log("Tokens returned successfully");
          } catch (returnErr) {
            console.error("Failed to return tokens:", returnErr);
          }
        }
        return res.status(400).json({
          success: false,
          error: "Insufficient relayer balance after transfer",
          details: {
            balance: ethers.formatUnits(relayerBalance, decimals),
            required: ethers.formatUnits(amountBN, decimals),
            token,
            relayer: relayer.address,
          },
        });
      }

      let { rawCode, hashedCode } = generateCode();
      let attempts = 0;
      const maxAttempts = 5;
      while (attempts < maxAttempts) {
        const existingGift = await giftChain.gifts(hashedCode);
        if (existingGift.timeCreated == 0) break;
        console.log(`Gift ID ${rawCode} already exists, regenerating...`);
        ({ rawCode, hashedCode } = generateCode());
        attempts++;
      }
      if (attempts >= maxAttempts) {
        if (tokensTransferred) {
          try {
            console.log("Returning tokens to creator due to unique ID failure...");
            const returnTx = await erc20.transfer(creator, amountBN);
            await returnTx.wait();
            console.log("Tokens returned successfully");
          } catch (returnErr) {
            console.error("Failed to return tokens:", returnErr);
          }
        }
        return res.status(400).json({
          success: false,
          error: "Unable to generate unique gift ID",
          details: { attempts },
        });
      }

      const creatorHash = keccak256(getAddress(creator));
      console.log("Generated gift code:", rawCode);
      console.log("Hashed code:", hashedCode);
      console.log("Creator hash:", creatorHash);

      try {
        console.log("Creating gift on-chain...");
        const gasEstimate = await giftChain.createGift.estimateGas(
          token, // _token
          amountBN.toString(), // _amount
          expiry.toString(), // _expiry
          message, // _message
          hashedCode, // _giftID
          creatorHash // _creator
        );
        const gasLimit = (gasEstimate * BigInt(2)).toString();
        console.log("Gas estimate for gift creation:", gasEstimate.toString());

        const giftTx = await giftChain.createGift(
          token, // _token
          amountBN.toString(), // _amount
          expiry.toString(), // _expiry
          message, // _message
          hashedCode, // _giftID
          creatorHash, // _creator
          {
            gasLimit: gasLimit,
          }
        );
        console.log("Gift transaction hash:", giftTx.hash);
        const receipt = await giftTx.wait();
        console.log("Gift created successfully");

        // Save to MongoDB
        try {
          const newGift = new GiftCode({
            giftID: rawCode,
            hashedCode,
            token,
            senderAddress: creator,
            amount: ethers.formatUnits(amountBN, decimals),
            fee: ethers.formatUnits(feeBN, decimals),
            message,
            expiry,
            status: "created", // Optional, since it’s the default
          });

          await newGift.save();
          console.log("Gift saved to MongoDB successfully");
        } catch (dbError) {
          console.error("Failed to save gift to MongoDB:", dbError);
          return res.status(400).json({
            success: false,
            error: "Failed to save gift to database",
            details: {
              dbError: dbError.message,
              tokensReturned: true,
              returnTransaction: returnTx.hash,
            },
          });
        }

        // // Generate PNG
        // const downloadUrl = await generateGiftCardImage({
        //   giftID: rawCode,
        //   amount: ethers.formatUnits(amountBN, decimals),
        //   token,
        //   expiry,
        //   message,
        //   creator,
        //   symbol,
        // });

        res.status(201).json({ 
          success: true, 
          message: "Gift Created Successfully",
          details: {
            giftID: rawCode,
            transactionHash: receipt.hash,
            token,
            amount: ethers.formatUnits(amountBN, decimals),
            expiry,
            message,
            creator,
            // downloadUrl,
          },
        });
      } catch (err) {
        console.error("Gift creation failed:", err);
        if (tokensTransferred) {
        try {
            console.log("Attempting to return tokens to creator...");
            const relayerBalanceBeforeReturn = await erc20.balanceOf(relayer.address);
            console.log("Relayer balance before return:", ethers.formatUnits(relayerBalanceBeforeReturn, decimals));
            if (relayerBalanceBeforeReturn >= amountBN) {
          const returnTx = await erc20.transfer(creator, amountBN);
          await returnTx.wait();
              console.log("Tokens returned successfully");
          return res.status(400).json({ 
            success: false,
                error: "Failed to create gift on-chain",
            details: {
              reason: err.reason || err.message,
              tokensReturned: true,
              returnTransaction: returnTx.hash,
                  originalError: err,
                },
              });
            } else {
              console.warn("Cannot return tokens: insufficient relayer balance");
              return res.status(400).json({
                success: false,
                error: "Failed to create gift and insufficient balance to return tokens",
                details: {
                  reason: err.reason || err.message,
                  relayerBalance: ethers.formatUnits(relayerBalanceBeforeReturn, decimals),
                  required: ethers.formatUnits(amountBN, decimals),
                  originalError: err,
                },
              });
            }
          } catch (returnErr) {
            console.error("Failed to return tokens:", returnErr);
            return res.status(400).json({
              success: false,
              error: "Failed to create gift and return tokens",
              details: {
                giftError: err.reason || err.message,
                returnError: returnErr.reason || returnErr.message,
                originalError: err,
              },
            });
          }
        } else {
          return res.status(400).json({ 
            success: false,
            error: "Failed to create gift on-chain",
            details: {
              reason: err.reason || err.message,
              originalError: err,
            },
          });
        }
      }
    } catch (err) {
      console.error("Token interaction failed:", err);
      return res.status(400).json({ 
        success: false,
        error: "Token interaction failed",
        details: {
          reason: err.reason || err.message,
          token,
          creator,
          originalError: err,
        },
      });
    }
  } catch (err) {
    console.error("Relayer error:", err);
    res.status(500).json({ 
      success: false,
      error: "Internal server error",
      details: {
        reason: err.message,
        originalError: err,
      },
    });
  }
};

// Serve image files
const downloadGiftCard = (req, res) => {
  const fileName = req.params.fileName;
  const filePath = path.join(__dirname, "../downloads", fileName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      error: "Gift not found",
    });
  }

  res.download(filePath, (err) => {
    if (err) {
      console.error("Download error:", err);
      res.status(500).json({
        success: false,
        error: "Failed to download gift",
      });
    }
  });
};

module.exports = { createGift, downloadGiftCard, getGiftCodes };