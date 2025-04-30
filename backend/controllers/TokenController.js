// controllers/TokenController.js
const { ethers } = require("ethers");

// Alchemy provider URL (store in environment variables)
const SEPOLIA_PROVIDER_URL = process.env.RPC_URL || "https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY";
const provider = new ethers.JsonRpcProvider(SEPOLIA_PROVIDER_URL);

// Minimal ERC-20 ABI
const erc20Abi = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
];

// In-memory cache
const tokenMetadataCache = {};

// Fetch token metadata
exports.getTokenMetadata = async (req, res) => {
  const tokenAddress = req.params.address.toLowerCase();

  // Check cache
  if (tokenMetadataCache[tokenAddress]) {
    return res.json(tokenMetadataCache[tokenAddress]);
  }

  try {
    const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, provider);
    const [symbol, decimals] = await Promise.all([
      tokenContract.symbol(),
      tokenContract.decimals(),
    ]);

    const metadata = { symbol, decimals: Number(decimals) };
    tokenMetadataCache[tokenAddress] = metadata; // Cache in memory

    // Optional: Save to MongoDB
    const mongoose = require("mongoose");
    const Token = mongoose.model(
      "Token",
      new mongoose.Schema({
        address: { type: String, unique: true },
        symbol: String,
        decimals: Number,
      })
    );
    await Token.findOneAndUpdate(
      { address: tokenAddress },
      { symbol, decimals: Number(decimals) },
      { upsert: true }
    );

    res.json(metadata);
  } catch (error) {
    console.error(`Error fetching metadata for ${tokenAddress}:`, error);
    res.status(500).json({ error: "Failed to fetch token metadata", address: tokenAddress });
  }
};