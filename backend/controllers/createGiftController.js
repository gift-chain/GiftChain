require("dotenv").config();
const {ethers, keccak256, getAddress} = require("ethers");
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
async function approveToken(tokenAddress, spender) {
  try {
    const erc20 = new ethers.Contract(tokenAddress, ERC20_ABI, relayer);
    const maxUint256 = ethers.MaxUint256;
    
    console.log(`Approving ${spender} to spend tokens at ${tokenAddress}...`);
    
    // Estimate gas for approval
    const gasEstimate = await erc20.approve.estimateGas(spender, maxUint256);
    const gasLimit = gasEstimate * BigInt(2); // Add 100% buffer
    
    const tx = await erc20.approve(spender, maxUint256, {
      gasLimit: gasLimit
    });
    
    console.log(`Approval transaction hash: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`Approved successfully in block ${receipt.blockNumber}`);
    
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
    
    // Check creator's allowance to relayer
    const creatorAllowance = await erc20.allowance(creator, relayer.address);
    console.log('Creator allowance to relayer:', ethers.formatUnits(creatorAllowance, decimals));
    
    if (creatorAllowance < amountBN) {
      throw new Error('Creator needs to approve relayer first');
    }
    
    // Check relayer's allowance to GiftChain
    const relayerAllowance = await erc20.allowance(relayer.address, giftChain.target);
    console.log('Relayer allowance to GiftChain:', ethers.formatUnits(relayerAllowance, decimals));
    
    if (relayerAllowance < amountBN) {
      console.log('Approving GiftChain to spend relayer tokens...');
      await approveToken(token, giftChain.target);
    }
    
    return true;
  } catch (err) {
    console.error('Token approval handling failed:', err);
    throw err;
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
      // const feeBN = amountBN / BigInt(100); // 1% fee
      // const amountAfterFeeBN = amountBN - feeBN;

      console.log(`[AMOUNT] Breakdown:
        Original: ${ethers.formatUnits(amountBN, decimals)} ${symbol}
        // Fee (1%): ${ethers.formatUnits(feeBN, decimals)} ${symbol}
        // After fee: ${ethers.formatUnits(amountAfterFeeBN, decimals)} ${symbol}`);

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

      // Handle token approvals
      await handleTokenApprovals(token, creator, amountBN);

      // Generate gift ID and hash creator
      const {rawCode, hashedCode} = generateCode();
      const creatorHash = keccak256(getAddress(creator));
      console.log('Generated gift code:', rawCode);
      console.log('Hashed code:', hashedCode);
      console.log('Creator hash:', creatorHash);

      // Transfer tokens from creator to relayer
      try {
        console.log('Transferring tokens from creator to relayer...');
        
        // Estimate gas for transfer
        const gasEstimate = await erc20.transferFrom.estimateGas(creator, relayer.address, amountBN);
        const gasLimit = gasEstimate * BigInt(2); // Add 100% buffer
        
        const pullTx = await erc20.transferFrom(creator, relayer.address, amountBN, {
          gasLimit: gasLimit
        });
        
        console.log('Transfer transaction hash:', pullTx.hash);
        const receipt = await pullTx.wait();
        console.log('Transfer successful in block', receipt.blockNumber);
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
        
        // Estimate gas for gift creation
        const gasEstimate = await giftChain.createGift.estimateGas(
          token,                            // _token
          amountBN.toString(),              // _amount
          expiry.toString(),                // _expiry
          message,                          // _message
          hashedCode,                       // _giftID
          creatorHash                       // _creator
        );
        const gasLimit = gasEstimate * BigInt(2); // Add 100% buffer
        
        const giftTx = await giftChain.createGift(
          token,                            // _token
          amountBN.toString(),              // _amount
          expiry.toString(),                // _expiry
          message,                          // _message
          hashedCode,                       // _giftID
          creatorHash,                      // _creator
          {
            gasLimit: gasLimit
          }
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