"use client"

import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Zap, Download, Wallet } from "lucide-react"
import { format } from "date-fns"
import { ethers } from "ethers"
import { useAccount, useConnect, useConnectors } from "wagmi"
import CONTRACT_ABI from "@/abi/GiftChain.json"
import ERC20_ABI from "@/abi/ERC20_ABI.json";

// Contract ABI (truncated for key functions)
// const CONTRACT_ABI = [
//   {
//     "inputs": [
//       {"internalType": "address", "name": "_token", "type": "address"},
//       {"internalType": "uint256[]", "name": "_amounts", "type": "uint256[]"},
//       {"internalType": "uint256[]", "name": "_expiries", "type": "uint256[]"},
//       {"internalType": "string[]", "name": "_messages", "type": "string[]"},
//       {"internalType": "bytes32[]", "name": "_giftIDs", "type": "bytes32[]"},
//       {"internalType": "bytes32", "name": "_creator", "type": "bytes32"}
//     ],
//     "name": "createBulkGifts",
//     "outputs": [],
//     "stateMutability": "nonpayable",
//     "type": "function"
//   }
// ];

// // ERC20 ABI for token operations
// const ERC20_ABI = [
//   "function approve(address spender, uint256 amount) external returns (bool)",
//   "function allowance(address owner, address spender) external view returns (uint256)",
//   "function balanceOf(address account) external view returns (uint256)",
//   "function decimals() external view returns (uint8)"
// ];

const CONTRACT_ADDRESS = "0x280593931820aBA367dB060162cA03CD59EC29c9";

// Token addresses (updated with valid addresses)
const TOKEN_ADDRESSES = {
  'USDT': '0x7A8532Bd4067cD5C9834cD0eCcb8e71088c9fbf8',
  'USDC': '0x437011e4f16a4Be60Fe01aD6678dBFf81AEbaEd4',
  'DAI': '0xA0c61934a9bF661c0f41db06538e6674CDccFFf2'  
};

interface BulkGift {
  email: string;
  token: string;
  amount: string;
  expiry: string;
  message: string;
}

interface PreviewGift {
  giftID: string;
  transactionHash: string;
  token: string;
  amount: string;
  expiry: number;
  message: string;
  creator: string;
  downloadUrl: string;
  email: string;
}

interface TokenGroup {
  token: string;
  gifts: BulkGift[];
  totalAmount: string;
}

export default function CreateBulkCard() {
  const [bulkGifts, setBulkGifts] = useState<BulkGift[]>([
    { email: '', token: 'USDT', amount: '', expiry: '', message: '' }
  ]);
  const [previewData, setPreviewData] = useState<PreviewGift[]>([]);
  const [tokenGroups, setTokenGroups] = useState<TokenGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const connectors = useConnectors();
  const { toast } = useToast();
  
  const tokens = ['USDT', 'USDC', 'DAI'];
  const minDateTime = format(new Date(), "yyyy-MM-dd'T'HH:mm");

  // Input validation function
  const validateGiftData = (gifts: BulkGift[]): string[] => {
    const errors: string[] = [];
    
    gifts.forEach((gift, index) => {
      // Check email format
      if (!gift.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(gift.email)) {
        errors.push(`Gift ${index + 1}: Invalid email format`);
      }
      
      // Check amount is positive number
      const amount = parseFloat(gift.amount);
      if (isNaN(amount) || amount <= 0 || amount > 1000000) {
        errors.push(`Gift ${index + 1}: Amount must be between 0 and 1,000,000`);
      }
      
      // Check expiry is in future and not too far
      const expiryTime = new Date(gift.expiry).getTime();
      const now = Date.now();
      const maxExpiry = now + (365 * 24 * 60 * 60 * 1000); // 1 year from now
      
      if (expiryTime <= now) {
        errors.push(`Gift ${index + 1}: Expiry must be in the future`);
      }
      if (expiryTime > maxExpiry) {
        errors.push(`Gift ${index + 1}: Expiry cannot be more than 1 year from now`);
      }
      
      // Check message length and content
      if (!gift.message || gift.message.length < 3 || gift.message.length > 50) {
        errors.push(`Gift ${index + 1}: Message must be 3-50 characters`);
      }
      
      // Check for non-ASCII characters that might cause issues
      if (!/^[\x20-\x7E]*$/.test(gift.message)) {
        errors.push(`Gift ${index + 1}: Message contains invalid characters`);
      }
    });
    
    return errors;
  };

  // Handle wallet connection with specific connector
  const handleWalletConnect = (connectorId: string) => {
    const connector = connectors.find(c => c.id === connectorId);
    if (connector) {
      connect({ connector });
      setShowWalletOptions(false);
    }
  };

  // Handle change in individual gift row
  const handleBulkGiftChange = (index: number, field: keyof BulkGift, value: string) => {
    const updatedBulkGifts = [...bulkGifts];
    updatedBulkGifts[index][field] = value;
    setBulkGifts(updatedBulkGifts);
  };

  // Add new row for multi-field input
  const addBulkGiftRow = () => {
    setBulkGifts([...bulkGifts, {email: '', token: 'USDT', amount: '', expiry: '', message: '' }]);
  };

  // Remove row from multi-field input
  const removeBulkGiftRow = (index: number) => {
    const updatedBulkGifts = bulkGifts.filter((_, i) => i !== index);
    setBulkGifts(updatedBulkGifts);
  };

  // Group gifts by token for contract compatibility
  const groupGiftsByToken = (gifts: BulkGift[]): TokenGroup[] => {
    const groups: Record<string, BulkGift[]> = {};
    
    gifts.forEach(gift => {
      if (!groups[gift.token]) {
        groups[gift.token] = [];
      }
      groups[gift.token].push(gift);
    });

    return Object.entries(groups).map(([token, tokenGifts]) => ({
      token,
      gifts: tokenGifts,
      totalAmount: tokenGifts.reduce((sum, gift) => sum + parseFloat(gift.amount || '0'), 0).toString()
    }));
  };

  // Preview gifts with enhanced validation
  const previewGifts = () => {
    if (bulkGifts.length < 5) {
      toast({
        title: "Minimum requirement not met",
        description: "Bulk creation requires at least 5 gifts.",
        variant: "destructive",
      });
      return;
    }

    // Run comprehensive validation
    const validationErrors = validateGiftData(bulkGifts);
    if (validationErrors.length > 0) {
      toast({
        title: "Validation errors found",
        description: validationErrors.slice(0, 3).join('. ') + (validationErrors.length > 3 ? '...' : ''),
        variant: "destructive",
      });
      return;
    }

    // Check for duplicate emails
    const emails = bulkGifts.map(gift => gift.email);
    const uniqueEmails = new Set(emails);
    if (uniqueEmails.size !== emails.length) {
      toast({
        title: "Duplicate emails found",
        description: "Each gift must have a unique email address.",
        variant: "destructive",
      });
      return;
    }

    // Group by token for display
    const groups = groupGiftsByToken(bulkGifts);
    setTokenGroups(groups);

    const previewList: PreviewGift[] = bulkGifts.map((gift, index) => ({
      giftID: `temp-id-${index}`,
      transactionHash: 'pending',
      token: gift.token,
      amount: gift.amount,
      expiry: Math.floor(new Date(gift.expiry).getTime() / 1000),
      message: gift.message,
      creator: address || "Connect Wallet",
      downloadUrl: '',
      email: gift.email
    }));

    setPreviewData(previewList);
    setIsPreviewMode(true);
  };

  // Create bulk gifts for a specific token group with improved error handling
  const createTokenGroup = async (tokenGroup: TokenGroup) => {
    if (!isConnected || !address) {
      throw new Error("Wallet not connected");
    }

    // Step 1: Generate gift codes from backend
    const backendResponse = await fetch('https://gift-chain-w3lp.vercel.app/api/bulk-create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        entries: tokenGroup.gifts,
        senderAddress: address
      }),
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json();
      throw new Error(errorData.error || 'Failed to generate gift codes');
    }

    const { generatedGifts } = await backendResponse.json();
    
    // Step 2: Setup contracts and prepare data
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    
    const tokenAddress = TOKEN_ADDRESSES[tokenGroup.token as keyof typeof TOKEN_ADDRESSES];
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    console.log(`Using token contract at ${tokenAddress} for ${tokenGroup.token}`);
    
    // Get token decimals
    const decimals = await tokenContract.decimals();
    console.log('DAI decimals:', await tokenContract.decimals());
    console.log('DAI balance:', ethers.formatUnits(await tokenContract.balanceOf(address), decimals));
    
    const amounts = tokenGroup.gifts.map(gift => 
      ethers.parseUnits(gift.amount, decimals)
    );
    const expiries = tokenGroup.gifts.map(gift => 
      Math.floor(new Date(gift.expiry).getTime() / 1000)
    );
    const messages = tokenGroup.gifts.map(gift => gift.message);
    const giftIDs = generatedGifts.map((gift: any) => 
      ethers.keccak256(ethers.toUtf8Bytes(gift.rawCode))
    );
    const creator = ethers.keccak256(ethers.getAddress(address));
    
    // Step 3: Check balance and approve tokens
    const totalAmount = amounts.reduce((sum, amount) => sum + amount, BigInt(0));
    
    // Check balance
    const balance = await tokenContract.balanceOf(address);
    if (balance < totalAmount) {
      throw new Error(`Insufficient ${tokenGroup.token} balance. Need: ${ethers.formatUnits(totalAmount, decimals)}, Have: ${ethers.formatUnits(balance, decimals)}`);
    }
    
    // Check current allowance
    const currentAllowance = await tokenContract.allowance(address, CONTRACT_ADDRESS);
    
    // If allowance is insufficient, approve the contract
    if (currentAllowance < totalAmount) {
      console.log(`Approving ${tokenGroup.token} spending...`);
      const approveTx = await tokenContract.approve(CONTRACT_ADDRESS, totalAmount);
      await approveTx.wait();
      console.log(`${tokenGroup.token} approval confirmed`);
    }
    
    // Step 4: Execute blockchain transaction with better error handling
    try {
      // First estimate gas to catch errors early
      const gasEstimate = await contract.createBulkGifts.estimateGas(
        tokenAddress,
        amounts,
        expiries,
        messages,
        giftIDs,
        creator
      );
      
      console.log(`Gas estimate: ${gasEstimate.toString()}`);
      
      // Execute with higher gas limit (using BigInt multiplication)
      const gasLimit = (gasEstimate * BigInt(120)) / BigInt(100); // Add 20% buffer
      
      const tx = await contract.createBulkGifts(
        tokenAddress,
        amounts,
        expiries,
        messages,
        giftIDs,
        creator,
        {
          gasLimit: gasLimit
        }
      );
      
      return { tx, generatedGifts };
    } catch (error: any) {
      console.error('Contract call failed:', error);
      // Decode the custom error if possible
      if (error.data) {
        try {
          // Try decoding common error formats
          const errorInterface = new ethers.Interface([
            'error InvalidParameters(string)',
            'error InsufficientAllowance()',
            'error InvalidToken()',
            'error Expired()'
          ]);
          const decodedError = errorInterface.parseError(error.data);
          throw new Error(`Contract error: ${decodedError?.name} - ${decodedError?.args.join(', ')}`);
        } catch (decodeError) {
          console.error('Failed to decode error:', decodeError);
          throw new Error('Contract validation failed - unknown error (0xc2eec460). Check parameters, allowance, or contract state.');
        }
      }
      throw error;
    }}

  // Create bulk gifts on blockchain and backend with debug info
  const handleBulkCreate = async () => {
    if (!isConnected || !address) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const results = [];
      
      // Process each token group separately
      for (const tokenGroup of tokenGroups) {
        console.log(`Processing ${tokenGroup.token} group:`, {
          giftsCount: tokenGroup.gifts.length,
          totalAmount: tokenGroup.totalAmount,
          tokenAddress: TOKEN_ADDRESSES[tokenGroup.token as keyof typeof TOKEN_ADDRESSES]
        });

        toast({
          title: "Processing",
          description: `Creating ${tokenGroup.gifts.length} ${tokenGroup.token} gifts...`,
        });

        const { tx, generatedGifts } = await createTokenGroup(tokenGroup);

        toast({
          title: "Transaction submitted",
          description: `${tokenGroup.token} batch - Transaction hash: ${tx.hash}`,
        });
        
        const receipt = await tx.wait();
        results.push({ receipt, generatedGifts, tokenGroup });
      }
      
      // Update preview data with actual transaction info
      let updatedPreviewData = [...previewData];
      let giftIndex = 0;
      
      results.forEach(({ receipt, generatedGifts }) => {
        generatedGifts.forEach((gift: any) => {
          if (updatedPreviewData[giftIndex]) {
            updatedPreviewData[giftIndex] = {
              ...updatedPreviewData[giftIndex],
              giftID: gift.rawCode,
              transactionHash: receipt.hash,
            };
            giftIndex++;
          }
        });
      });
      
      setPreviewData(updatedPreviewData);
      
      toast({
        title: "All bulk gifts created successfully!",
        description: `${bulkGifts.length} gifts created across ${tokenGroups.length} token types.`,
      });
      
    } catch (error) {
      console.error('Error creating bulk gifts:', error);
      toast({
        title: "Error creating gifts",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle CSV upload
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text !== 'string') return;

      const lines = text.split('\n').filter(line => line.trim());
      const giftsFromCsv = lines.map((line) => {
        const [email, token, amount, expiry, message] = line.split(',');
        return {
          email: email?.trim() || '',
          token: token?.trim() || 'USDT',
          amount: amount?.trim() || '',
          expiry: expiry?.trim() || '',
          message: message?.trim() || ''
        };
      });

      setBulkGifts(giftsFromCsv);
      
      // Show token grouping info
      const groups = groupGiftsByToken(giftsFromCsv);
      toast({
        title: "CSV Loaded",
        description: `${giftsFromCsv.length} gifts loaded. Will create ${groups.length} separate transactions (one per token type).`,
      });
    };

    reader.readAsText(file);
  };

  // Download results as CSV
  const downloadResults = () => {
    const csvContent = [
      'Email,Token,Amount,GiftID,TransactionHash,Expiry',
      ...previewData.map(gift => 
        `${gift.email},${gift.token},${gift.amount},${gift.giftID},${gift.transactionHash},${new Date(gift.expiry * 1000).toISOString()}`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bulk-gifts-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="container py-8 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Bulk Gift Section */}
        <div className="space-y-8">
          {!isConnected && (
            <div className="space-y-2">
              {!showWalletOptions ? (
                <Button
                  className="w-full gap-2 glow-border"
                  size="lg"
                  onClick={() => setShowWalletOptions(true)}
                >
                  <Wallet className="h-5 w-5" />
                  Connect Wallet
                </Button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Choose your wallet:</p>
                  {connectors.map((connector) => (
                    <Button
                      key={connector.id}
                      className="w-full gap-2"
                      variant="outline"
                      onClick={() => handleWalletConnect(connector.id)}
                    >
                      {connector.name}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}
          
          <div className="space-y-4">
            <Label htmlFor="csv-upload">Upload CSV (email,token,amount,expiry,message)</Label>
            <Input
              type="file"
              id="csv-upload"
              accept=".csv"
              onChange={handleCsvUpload}
              className="bg-background/40 border-primary/30"
            />
            <p className="text-xs text-muted-foreground">
              Note: Gifts will be grouped by token type. Each token requires a separate blockchain transaction.
            </p>
          </div>

          <div className="space-y-6">
            {bulkGifts.map((gift, index) => (
              <div key={index} className="p-4 border rounded-md space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    type="number"
                    value={gift.amount}
                    onChange={(e) => handleBulkGiftChange(index, 'amount', e.target.value)}
                    placeholder="Amount"
                    className="bg-background/40 border-primary/30"
                  />
                  
                  <select
                    className="bg-background/40 border-primary/30 rounded-md px-3 py-2 w-full"
                    value={gift.token}
                    onChange={(e) => handleBulkGiftChange(index, 'token', e.target.value)}
                  >
                    {tokens.map((token) => (
                      <option key={token} value={token}>{token}</option>
                    ))}
                  </select>
                </div>

                <Input
                  type="datetime-local"
                  value={gift.expiry}
                  onChange={(e) => handleBulkGiftChange(index, 'expiry', e.target.value)}
                  min={minDateTime}
                  className="bg-background/40 border-primary/30 tx-sm"
                />

                <Input
                    type="email"
                    value={gift.email}
                    onChange={(e) => handleBulkGiftChange(index, 'email', e.target.value)}
                    placeholder="recipient@email.com"
                    className="bg-background/40 border-primary/30"
                  />

                <Textarea
                  placeholder="Gift message (3-50 characters)"
                  value={gift.message}
                  onChange={(e) => handleBulkGiftChange(index, 'message', e.target.value)}
                  className="bg-background/40 border-primary/30"
                  maxLength={50}
                />

                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={() => removeBulkGiftRow(index)}
                    className="bg-red-500 text-white"
                    disabled={bulkGifts.length === 1}
                    size="sm"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
            
            <Button
              type="button"
              onClick={addBulkGiftRow}
              className="w-full gap-2 glow-border"
              size="lg"
            >
              Add More Gift
            </Button>
          </div>

          {/* Token Groups Display */}
          {isPreviewMode && tokenGroups.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Transaction Groups</h3>
              {tokenGroups.map((group, index) => (
                <div key={index} className="p-4 border rounded-md">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{group.token}</span>
                    <span className="text-sm text-muted-foreground">
                      {group.gifts.length} gifts • {group.totalAmount} {group.token}
                    </span>
                  </div>
                </div>
              ))}
              <p className="text-sm text-muted-foreground">
                Each token group will require a separate transaction and gas fee.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-4">
            {!isPreviewMode ? (
              <Button
                className="w-full gap-2 glow-border"
                size="lg"
                onClick={previewGifts}
                disabled={isLoading}
              >
                <Zap className="h-5 w-5" />
                Preview Gifts
              </Button>
            ) : (
              <div className="space-y-2">
                <Button
                  className="w-full gap-2 glow-border"
                  size="lg"
                  onClick={handleBulkCreate}
                  disabled={isLoading}
                >
                  <Zap className="h-5 w-5" />
                  {isLoading ? 'Creating Bulk Gifts...' : `Create ${tokenGroups.length} Transaction${tokenGroups.length > 1 ? 's' : ''}`}
                </Button>
                
                {previewData.length > 0 && previewData[0].transactionHash !== 'pending' && (
                  <Button
                    className="w-full gap-2"
                    size="lg"
                    onClick={downloadResults}
                    variant="outline"
                  >
                    <Download className="h-5 w-5" />
                    Download Results
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Preview Display */}
        <div>
          <h3 className="text-lg font-medium mb-4">Preview ({previewData.length} gifts)</h3>
          <Card className="overflow-hidden border-0 max-h-96 overflow-y-auto">
            <CardContent className="p-0">
              {previewData.map((gift, index) => (
                <div key={index} className="p-4 border-b last:border-b-0">
                  <div className="text-center space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">
                      {gift.email}
                    </div>
                    <div className="text-2xl font-bold">
                      {gift.amount} {gift.token}
                    </div>
                    <p className="text-sm italic">"{gift.message}"</p>
                    <div className="text-sm text-muted-foreground">
                      Expires: {new Date(gift.expiry * 1000).toLocaleString()}
                    </div>
                    {gift.giftID !== `temp-id-${index}` && (
                      <div className="text-xs text-green-600">
                        ID: {gift.giftID.slice(0, 8)}...
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {previewData.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  No gifts to preview yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}