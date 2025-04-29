// app/manage/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useAccount, useWalletClient } from 'wagmi';
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { toast } from 'react-hot-toast';
import GiftChainABI from '../abi/giftChainABI.json';
import erc20ABI from '../abi/erc20ABI.json'; // ABI of the ERC20 token contract

const CONTRACT_ADDRESS = '0x4dbdd0111E8Dd73744F1d9A60e56129009eEE473';
const PROVIDER_URL = 'https://eth-sepolia.g.alchemy.com/v2/7Ehr_350KwRXw2n30OoeevZUOFu12XYX';

enum GiftStatus {
  NONE = 0,
  PENDING = 1,
  SUCCESSFUL = 2,
  RECLAIMED = 3,
}

interface GiftDetails {
  isValid: boolean;
  status: GiftStatus;
  token: string;
  tokenSymbol?: string;
  amount: string;
  message: string;
  expiry: number;
  timeCreated: number;
  creator: string;
  claimed: boolean;
  errorMessage?: string;
}

const ManagePage: React.FC = () => {
  const { address: walletAddress, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [activeTab, setActiveTab] = useState<'Claim' | 'Validate' | 'Reclaim'>('Claim');
  const [code, setCode] = useState<string>('');
  const [errors, setErrors] = useState<{ code?: string }>({});
  const [giftDetails, setGiftDetails] = useState<GiftDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [txSuccess, setTxSuccess] = useState<boolean>(false);
  const [txHash, setTxHash] = useState<string>('');

  const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, GiftChainABI, provider);

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(PROVIDER_URL),
  });

  const validateGift = async (rawCode: string): Promise<GiftDetails> => {
    try {
      console.log('Validating gift code:', rawCode);
      const codeHash = ethers.keccak256(ethers.toUtf8Bytes(rawCode));
      console.log('Computed codeHash:', codeHash);

      const isValid = await contract.validateGift(rawCode);
      console.log('Validation result:', isValid);

      const gift = await contract.gifts(codeHash);
      const erc20 = new ethers.Contract(gift.token, erc20ABI, provider);
      const tokenSymbol = await erc20.symbol();
      const tokenDecimals = await erc20.decimals();
      const formattedAmount = ethers.formatUnits(gift.amount, tokenDecimals);

      const details = {
        isValid,
        status: Number(gift.status),
        token: gift.token,
        tokenSymbol,
        amount: formattedAmount,
        message: gift.message,
        expiry: Number(gift.expiry),
        timeCreated: Number(gift.timeCreated),
        creator: gift.creator,
        claimed: gift.claimed,
      };
      console.log('Gift details:', details);
      return details;
    } catch (error: any) {
      console.error('Validation error:', error);
      let errorMessage = 'An unknown error occurred.';
      if (error.reason || error.data?.message) {
        const reason = error.reason || error.data?.message;
        if (reason.includes('GiftNotFound')) {
          errorMessage = 'Gift card not found. Please check your code.';
        } else if (reason.includes('GiftAlreadyRedeemed') || reason.includes('SUCCESSFUL')) {
          errorMessage = 'This gift card has already been redeemed.';
        } else if (reason.includes('GiftAlreadyReclaimed') || reason.includes('RECLAIMED')) {
          errorMessage = 'This gift card has been reclaimed by the sender.';
        } else if (reason.includes('InvalidGiftStatus')) {
          errorMessage = 'This gift card is expired or has an invalid status.';
        } else if (reason.includes('is not a function')) {
          errorMessage = 'Contract error: Function not found. Please check contract deployment.';
        } else {
          errorMessage = `Contract error: ${reason}`;
        }
      } else if (error.message) {
        errorMessage = `Provider error: ${error.message}`;
      }

      return {
        isValid: false,
        status: GiftStatus.NONE,
        token: '',
        amount: '',
        message: '',
        expiry: 0,
        timeCreated: 0,
        creator: '',
        claimed: false,
        errorMessage,
      };
    }
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: GiftStatus): string => {
    switch (status) {
      case GiftStatus.PENDING:
        return 'bg-blue-500';
      case GiftStatus.SUCCESSFUL:
        return 'bg-green-500';
      case GiftStatus.RECLAIMED:
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: GiftStatus, claimed: boolean): string => {
    if (claimed) return 'Claimed';
    switch (status) {
      case GiftStatus.PENDING:
        return 'Pending';
      case GiftStatus.SUCCESSFUL:
        return 'Redeemed';
      case GiftStatus.RECLAIMED:
        return 'Reclaimed';
      default:
        return 'Unknown';
    }
  };

  const isReclaimable = (details: GiftDetails): boolean => {
    if (!details.isValid || details.status !== GiftStatus.PENDING) return false;
    if (details.expiry * 1000 > Date.now()) return false;
    if (!walletAddress) return false;
    const hashedAddress = ethers.keccak256(ethers.toUtf8Bytes(walletAddress));
    return details.creator.toLowerCase() === hashedAddress.toLowerCase();
  };

  const handleValidate = async () => {
    if (!code.trim() || code.length < 6) {
      setErrors({ code: 'Gift card code is required and must be at least 6 characters' });
      return;
    }

    try {
      setLoading(true);
      const result = await validateGift(code);
      setLoading(false);
      setGiftDetails(result);

      if (!result.isValid) {
        setErrors({ code: result.errorMessage });
      } else {
        setErrors({ code: undefined });
      }
    } catch (error: any) {
      setLoading(false);
      console.error('Unexpected error validating code:', error);
      setErrors({ code: `Unexpected error: ${error.message || 'Unknown error'}` });
    }
  };

  const handleClaim = async () => {
    if (!isConnected || !walletAddress) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!giftDetails || !giftDetails.isValid || giftDetails.status !== GiftStatus.PENDING) {
      toast.error('Please validate a claimable gift first');
      return;
    }

    if (giftDetails.expiry * 1000 < Date.now()) {
      toast.error('This gift card has expired');
      return;
    }

    if (!walletClient) {
      toast.error('Wallet client not available');
      return;
    }

    try {
      setIsSubmitting(true);
      const codeHash = ethers.keccak256(ethers.toUtf8Bytes(code));
      const txHash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi: GiftChainABI,
        functionName: 'claimGift',
        args: [codeHash],
        account: walletAddress as `0x${string}`,
        gas: 300000,
      });

      setTxHash(txHash);
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

      if (receipt.status === 'reverted') {
        throw new Error('Transaction reverted');
      }

      setGiftDetails({ ...giftDetails, status: GiftStatus.SUCCESSFUL, claimed: true });
      setTxSuccess(true);
      toast.success('Gift claimed successfully!');
    } catch (error: any) {
      console.error('Error claiming gift:', error);
      let errorMessage = 'Failed to claim gift.';
      if (error.message?.includes('GiftNotFound')) {
        errorMessage = 'Gift card not found.';
      } else if (error.message?.includes('GiftAlreadyRedeemed') || error.message?.includes('SUCCESSFUL')) {
        errorMessage = 'This gift card has already been redeemed.';
      } else if (error.message?.includes('GiftExpired')) {
        errorMessage = 'This gift card has expired.';
      } else if (error.message?.includes('CreatorCannotClaim')) {
        errorMessage = 'The creator cannot claim their own gift.';
      } else if (error.message?.includes('execution reverted')) {
        errorMessage = `Contract execution reverted: ${error.message || 'Unknown reason'}`;
      }
      toast.error(errorMessage);
      setErrors({ code: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReclaim = async () => {
    if (!isConnected || !walletAddress) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!giftDetails || !isReclaimable(giftDetails)) {
      toast.error('Please validate a reclaimable gift first');
      return;
    }

    if (!walletClient) {
      toast.error('Wallet client not available');
      return;
    }

    try {
      setIsSubmitting(true);
      const codeHash = ethers.keccak256(ethers.toUtf8Bytes(code));
      const txHash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi: GiftChainABI,
        functionName: 'reclaimGift',
        args: [code],
        account: walletAddress as `0x${string}`,
        gas: 300000,
      });

      setTxHash(txHash);
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

      if (receipt.status === 'reverted') {
        throw new Error('Transaction reverted');
      }

      setGiftDetails({ ...giftDetails, status: GiftStatus.RECLAIMED, isValid: false });
      setTxSuccess(true);
      toast.success('Gift reclaimed successfully!');
    } catch (error: any) {
      console.error('Error reclaiming gift:', error);
      let errorMessage = 'Failed to reclaim gift.';
      if (error.message?.includes('GiftNotFound')) {
        errorMessage = 'Gift card not found.';
      } else if (error.message?.includes('GiftAlreadyRedeemed') || error.message?.includes('SUCCESSFUL')) {
        errorMessage = 'This gift card has already been redeemed.';
      } else if (error.message?.includes('GiftAlreadyReclaimed') || error.message?.includes('RECLAIMED')) {
        errorMessage = 'This gift card has already been reclaimed.';
      } else if (error.message?.includes('GiftNotExpired')) {
        errorMessage = 'This gift card is not expired yet.';
      } else if (error.message?.includes('InvalidGiftStatus')) {
        errorMessage = 'You are not the creator or the gift has an invalid status.';
      } else if (error.message?.includes('execution reverted')) {
        errorMessage = `Contract execution reverted: ${error.message || 'Unknown reason'}`;
      }
      toast.error(errorMessage);
      setErrors({ code: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAction = () => {
    if (activeTab === 'Validate') {
      handleValidate();
    } else if (activeTab === 'Claim') {
      handleClaim();
    } else if (activeTab === 'Reclaim') {
      handleReclaim();
    }
  };

  const resetState = () => {
    setCode('');
    setErrors({});
    setGiftDetails(null);
    setTxSuccess(false);
    setTxHash('');
  };

  useEffect(() => {
    resetState();
  }, [activeTab]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-indigo-950 rounded-lg shadow-xl p-8 w-full max-w-md border border-indigo-800">
        <h1 className="text-2xl font-bold text-white text-center mb-2">Manage Gift Cards</h1>
        <p className="text-indigo-200 text-center text-sm mb-6">
          Claim, validate, or reclaim your blockchain-powered gift cards
        </p>

        {/* Tabs */}
        <div className="flex justify-center mb-6">
          {['Claim', 'Validate', 'Reclaim'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as 'Claim' | 'Validate' | 'Reclaim')}
              className={`px-4 py-2 mx-1 rounded-lg font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-purple-600 text-white'
                  : 'bg-indigo-900/50 text-indigo-200 hover:bg-indigo-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Input Section */}
        <div className="mb-6">
          <label className="block text-indigo-200 text-sm mb-2">Gift Code</label>
          <div className="flex flex-col items-center">
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setGiftDetails(null);
                setTxSuccess(false);
                setTxHash('');
              }}
              className="w-full bg-indigo-900/50 text-white rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500 border border-indigo-800"
              placeholder="Enter gift code (e.g., GC-ABC123)"
            />
            <button
              onClick={handleAction}
              disabled={loading || isSubmitting || !code.trim() || code.length < 6}
              className={`w-full mt-4 py-3 rounded-lg font-medium transition-colors ${
                loading || isSubmitting || !code.trim() || code.length < 6
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              {loading ? (
                <svg
                  className="animate-spin h-5 w-5 mx-auto"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : isSubmitting ? (
                `${activeTab}ing...`
              ) : (
                `${activeTab} Gift`
              )}
            </button>
          </div>
          {errors.code && <p className="text-red-400 mt-2 text-sm">{errors.code}</p>}
          {txHash && (
            <p className="text-indigo-200 mt-2 text-sm">
              Transaction Hash:{' '}
              <a
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                {txHash.slice(0, 6)}...{txHash.slice(-4)}
              </a>
            </p>
          )}
        </div>

        {/* Gift Details Display */}
        {giftDetails && (
          <div className="mt-4 bg-indigo-900/30 rounded-xl border border-indigo-800 p-4">
            <div className={`p-3 ${getStatusColor(giftDetails.status)} rounded-t-lg text-white flex justify-between items-center`}>
              <h3 className="font-bold">Gift Card Status</h3>
              <span className="px-2 py-1 text-xs rounded-full bg-white/20">
                {getStatusText(giftDetails.status, giftDetails.claimed)}
              </span>
            </div>
            <div className="p-4 space-y-3">
              {giftDetails.message && (
                <div>
                  <p className="text-indigo-300 text-sm">Message</p>
                  <p className="text-white font-medium">{giftDetails.message}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {giftDetails.amount && (
                  <div>
                    <p className="text-indigo-300 text-sm">Amount</p>
                    <p className="text-white font-medium">
                      {giftDetails.amount} {giftDetails.tokenSymbol || 'Token'}
                    </p>
                  </div>
                )}
                {giftDetails.token && (
                  <div>
                    <p className="text-indigo-300 text-sm">Token</p>
                    <p className="text-white font-medium truncate" title={giftDetails.token}>
                      {giftDetails.token.slice(0, 6)}...{giftDetails.token.slice(-4)}
                    </p>
                  </div>
                )}
              </div>
              {giftDetails.timeCreated && (
                <div>
                  <p className="text-indigo-300 text-sm">Created</p>
                  <p className="text-white text-sm">{formatDate(giftDetails.timeCreated)}</p>
                </div>
              )}
              {giftDetails.expiry && (
                <div>
                  <p className="text-indigo-300 text-sm">
                    {giftDetails.expiry * 1000 > Date.now() ? 'Expires' : 'Expired'}
                  </p>
                  <p
                    className={`text-sm ${
                      giftDetails.expiry * 1000 > Date.now() ? 'text-white' : 'text-red-400'
                    }`}
                  >
                    {formatDate(giftDetails.expiry)}
                  </p>
                </div>
              )}
              {(activeTab === 'Reclaim' || giftDetails.status === GiftStatus.RECLAIMED) &&
                giftDetails.creator &&
                walletAddress && (
                  <div>
                    <p className="text-indigo-300 text-sm">Creator</p>
                    <p className="text-white text-sm truncate">
                      {giftDetails.creator.toLowerCase() ===
                      ethers.keccak256(ethers.toUtf8Bytes(walletAddress)).toLowerCase()
                        ? 'You (matched)'
                        : 'Not matched'}
                    </p>
                  </div>
                )}
              {txSuccess && (
                <div className="text-center py-2">
                  <p className="text-green-400 text-sm flex items-center justify-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Successfully {activeTab.toLowerCase()}ed!
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManagePage;