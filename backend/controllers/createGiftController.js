require("dotenv").config();
const {ethers, keccak256, toUtf8Bytes} = require("ethers");
const giftAbi = require("../abi/giftABI.json")
const {generateCode} = require("../utils/generateCode.js");

// ERC20 ABI for token operations
const ERC20_ABI = [
  'function transferFrom(address from, address to, uint256 value) external returns (bool)',
  'function transfer(address to, uint256 value) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)'
];

// Initialize provider and contracts
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const relayer = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, provider);
const giftChain = new ethers.Contract(process.env.GIFTCHAIN_ADDRESS, giftAbi, relayer);

// Cache for token approvals
const approvedTokens = new Set();

// Function to approve token with max uint256
async function approveToken(tokenAddress) {
  if (approvedTokens.has(tokenAddress)) return;
  
  try {
    const erc20 = new ethers.Contract(tokenAddress, ERC20_ABI, relayer);
    const maxUint256 = ethers.MaxUint256;
    
    console.log(`Approving ${tokenAddress} for max amount...`);
    const tx = await erc20.approve(giftChain.target, maxUint256);
    await tx.wait();
    console.log(`Approved ${tokenAddress} successfully`);
    
    approvedTokens.add(tokenAddress);
  } catch (err) {
    console.error(`Failed to approve ${tokenAddress}:`, err);
  }
}

console.log('Initialized with:');
console.log('- Relayer address:', relayer.address);
console.log('- GiftChain address:', giftChain.target);

const createGift = async (req, res) => {
  try {
    const {
      token, 
      amount, 
      expiry, 
      message,
      creator
    } = req.body;

    console.log('Received request:', {
      token,
      amount,
      expiry,
      message,
      creator
    });

    // Input validation
    if (!token || !amount || !expiry || !message || !creator) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields',
        details: {
          missingFields: {
            token: !token ? 'Token address is required' : undefined,
            amount: !amount ? 'Amount is required' : undefined,
            expiry: !expiry ? 'Expiry timestamp is required' : undefined,
            message: !message ? 'Message is required' : undefined,
            creator: !creator ? 'Creator address is required' : undefined
          }
        }
      });
    }

    // Validate addresses
    if (!ethers.isAddress(token)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid token address',
        details: {
          token,
          message: 'The provided token address is not a valid Ethereum address'
        }
      });
    }

    if (!ethers.isAddress(creator)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid creator address',
        details: {
          creator,
          message: 'The provided creator address is not a valid Ethereum address'
        }
      });
    }

    // Validate message length
    if (message.length < 3 || message.length > 50) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid message length',
        details: {
          message,
          length: message.length,
          required: 'Message must be between 3 and 50 characters long'
        }
      });
    }

    // Validate expiry
    const now = Math.floor(Date.now() / 1000);
    if (now >= expiry) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid expiry date',
        details: {
          provided: expiry,
          currentTime: now,
          message: 'Expiry date must be in the future'
        }
      });
    }

    // Initialize ERC20 contract
    const erc20 = new ethers.Contract(token, ERC20_ABI, relayer);
    console.log('Initialized ERC20 contract at:', token);

    try {
      // Get token decimals
      const decimals = await erc20.decimals();
      console.log('Token decimals:', decimals);
      const symbol = await erc20.symbol();
      console.log('Token symbol:', symbol);
      const amountBN = ethers.parseUnits(amount.toString(), decimals);
      const feeBN = amountBN / BigInt(100); // 1% fee
      const amountAfterFeeBN = amountBN - feeBN;

      console.log(`[AMOUNT] Breakdown:
        Original: ${ethers.formatUnits(amountBN, decimals)} ${symbol}
        Fee (1%): ${ethers.formatUnits(feeBN, decimals)} ${symbol}
        After fee: ${ethers.formatUnits(amountAfterFeeBN, decimals)} ${symbol}`);

      // Check creator's balance
      const balance = await erc20.balanceOf(creator);
      console.log('Creator balance:', ethers.formatUnits(balance, decimals));
      
      if (balance < amountBN) {
        return res.status(400).json({ 
          success: false,
          error: 'Insufficient token balance',
          details: {
            balance: ethers.formatUnits(balance, decimals),
            required: amount,
            token,
            creator
          }
        });
      }

      // Check allowance and approve if needed
      const allowance = await erc20.allowance(creator, relayer.address);
      console.log('Token allowance:', ethers.formatUnits(allowance, decimals));
      
      if (allowance < amountBN) {
        // Auto-approve the token
        await approveToken(token);
      }

      // Generate gift ID and hash creator
      const {rawCode, hashedCode} = generateCode();
      const creatorHash = keccak256(toUtf8Bytes(creator));
      console.log('Generated gift code:', rawCode);
      console.log('Hashed code:', hashedCode);
      console.log('Creator hash:', creatorHash);

      // Transfer tokens from creator to relayer
      try {
        console.log('Transferring tokens from creator to relayer...');
        const pullTx = await erc20.transferFrom(creator, relayer.address, amountBN);
        console.log('Transfer transaction hash:', pullTx.hash);
        await pullTx.wait();
        console.log('Transfer successful');
      } catch (err) {
        console.error('Transfer failed:', err);
        return res.status(400).json({ 
          success: false,
          error: 'Failed to transfer tokens',
          details: {
            reason: err.reason || err.message,
            transaction: err.transaction,
            token,
            from: creator,
            to: relayer.address,
            amount: ethers.formatUnits(amountBN, decimals)
          }
        });
      }

      // Create the gift on-chain
      try {
        console.log('Creating gift on-chain...');
        const giftTx = await giftChain.createGift(
          token,                            // _token
          amountAfterFeeBN.toString(),      // _amount
          expiry.toString(),                // _expiry
          message,                          // _message
          hashedCode,                       // _giftID
          creatorHash                       // _creator
        );
        console.log('Gift transaction hash:', giftTx.hash);
        const receipt = await giftTx.wait();
        console.log('Gift created successfully');

        res.status(200).json({ 
          success: true, 
          message: "Gift Created Successfully",
          details: {
            giftID: rawCode,
            transactionHash: receipt.hash,
            token,
            amount: ethers.formatUnits(amountBN, decimals),
            expiry,
            message,
            creator
          }
        });
      } catch (err) {
        console.error('Gift creation failed:', err);
        // If gift creation fails, try to return tokens to creator
        try {
          console.log('Attempting to return tokens to creator...');
          const returnTx = await erc20.transfer(creator, amountBN);
          await returnTx.wait();
          console.log('Tokens returned successfully');
          
          return res.status(400).json({ 
            success: false,
            error: 'Failed to create gift on-chain',
            details: {
              reason: err.reason || err.message,
              tokensReturned: true,
              returnTransaction: returnTx.hash,
              originalError: err
            }
          });
        } catch (returnErr) {
          console.error('Failed to return tokens:', returnErr);
          return res.status(400).json({ 
            success: false,
            error: 'Failed to create gift and return tokens',
            details: {
              giftError: err.reason || err.message,
              returnError: returnErr.reason || returnErr.message,
              originalError: err
            }
          });
        }
      }
    } catch (err) {
      console.error('Token interaction failed:', err);
      return res.status(400).json({ 
        success: false,
        error: 'Token interaction failed',
        details: {
          reason: err.reason || err.message,
          token,
          creator,
          originalError: err
        }
      });
    }
  } catch (err) {
    console.error('Relayer error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: {
        reason: err.message,
        originalError: err
      }
    });
  }
}

module.exports = {createGift}