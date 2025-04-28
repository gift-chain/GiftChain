// src/components/ReclaimGift.tsx
import React, { useState } from 'react';
import { ethers } from 'ethers';
import { useAccount, useWalletClient } from 'wagmi';
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import GiftChainABI from '../abi/giftChainABI.json';

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
  amount: string;
  message: string;
  expiry: number;
  timeCreated: number;
  creator: string;
  errorMessage?: string;
}

const ReclaimGift: React.FC = () => {
  const { address: walletAddress, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [code, setCode] = useState<string>('');
  const [errors, setErrors] = useState<{ code?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [giftDetails, setGiftDetails] = useState<GiftDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
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

      const isValid = await contract.validateGift(codeHash);
      console.log('Validation result:', isValid);

      const gift = await contract.gifts(codeHash);
      const status = Number(gift.status);
      const amount = ethers.formatUnits(gift.amount, 6);

      const details = {
        isValid,
        status,
        token: gift.token,
        amount,
        message: gift.message,
        expiry: Number(gift.expiry),
        timeCreated: Number(gift.timeCreated),
        creator: gift.creator,
      };
      console.log('Gift details:', details);
      return details;
    } catch (error: any) {
      console.error('Validation error:', error);
      let errorMessage = 'An unknown error occurred.';
      if (error.reason || error.data?.message) {
        const reason = error.reason || error.data?.message;
        console.log('Error reason:', reason);
        if (reason.includes('GiftNotFound')) {
          errorMessage = 'Gift card not found. Please check your code.';
        } else if (reason.includes('GiftAlreadyRedeemed') || reason.includes('SUCCESSFUL')) {
          errorMessage = 'This gift card has already been redeemed and cannot be reclaimed.';
        } else if (reason.includes('GiftAlreadyReclaimed') || reason.includes('RECLAIMED')) {
          errorMessage = 'This gift card has already been reclaimed.';
        } else if (reason.includes('InvalidGiftStatus')) {
          errorMessage = 'This gift card is not pending or has an invalid status.';
        } else if (reason.includes('is not a function')) {
          errorMessage = 'Contract error: validateGift function not found. Please check contract deployment.';
        } else {
          errorMessage = `Contract error: ${reason}`;
        }
      } else if (error.message) {
        console.log('Error message:', error.message);
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
        errorMessage,
      };
    }
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
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

  const getStatusText = (status: GiftStatus): string => {
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
    if (!details.isValid) {
      console.log('Not reclaimable: Invalid gift');
      return false;
    }
    if (details.status !== GiftStatus.PENDING) {
      console.log('Not reclaimable: Status not PENDING', { status: details.status });
      return false;
    }
    if (details.expiry * 1000 > Date.now()) {
      console.log('Not reclaimable: Not expired', { expiry: details.expiry, now: Math.floor(Date.now() / 1000) });
      return false;
    }
    if (!walletAddress) {
      console.log('Not reclaimable: No wallet address');
      return false;
    }
    const hashedAddress = ethers.keccak256(ethers.getAddress(walletAddress));
    if (details.creator.toLowerCase() !== hashedAddress.toLowerCase()) {
      console.log('Not reclaimable: Creator mismatch', { creator: details.creator, hashedAddress });
      return false;
    }
    console.log('Gift is reclaimable');
    return true;
  };

  const handleCodeValidation = async () => {
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

  const handleReclaimGift = async () => {
    console.log('handleReclaimGift called with giftDetails:', giftDetails);
    if (!giftDetails || !isReclaimable(giftDetails)) {
      console.log('Reclaim blocked: Gift not reclaimable');
      alert('Please validate a reclaimable gift first');
      return;
    }

    if (!walletClient || !isConnected) {
      console.log('Reclaim blocked: No wallet client or not connected');
      alert('Please connect your wallet to reclaim the gift');
      return;
    }

    try {
      setIsSubmitting(true);
      const codeHash = ethers.keccak256(ethers.toUtf8Bytes(code));
      console.log('Reclaiming gift with codeHash:', codeHash);

      // Re-validate gift state before reclaiming
      const preValidation = await validateGift(code);
      console.log('Pre-reclaim validation:', preValidation);
      if (!isReclaimable(preValidation)) {
        throw new Error('Gift is no longer reclaimable. Please re-validate.');
      }

      const txHash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi: GiftChainABI,
        functionName: 'reclaimGift',
        args: [codeHash], // Ensure codeHash is bytes32
        account: walletAddress as `0x${string}`,
        gas: 300000, // Specify gas limit
      });
      console.log('Transaction sent:', txHash);
      setTxHash(txHash);

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      console.log('Transaction receipt:', receipt);

      if (receipt.status === 'reverted') {
        // Try to decode revert reason
        let errorMessage = 'Transaction reverted for an unknown reason.';
        try {
          const errorData = receipt.logs.length > 0 ? receipt.logs[0].data : '';
          const decodedError = ethers.Interface.from(GiftChainABI).parseError(errorData || '0x');
          if (decodedError) {
            errorMessage = `Transaction reverted: ${decodedError.name} - ${decodedError.args.join(', ')}`;
          }
        } catch (parseError) {
          console.error('Failed to parse revert reason:', parseError);
        }
        throw new Error(errorMessage);
      }

      setGiftDetails({
        ...giftDetails,
        status: GiftStatus.RECLAIMED,
        isValid: false,
      });
      setTxSuccess(true);
      alert('Gift reclaimed successfully!');
    } catch (error: any) {
      console.error('Error reclaiming gift:', error);
      let errorMessage = 'Transaction failed. Please try again.';
      if (error.message?.includes('GiftNotFound') || error.cause?.data === '0x615b0ed0') {
        errorMessage = 'Gift card not found.';
      } else if (error.message?.includes('GiftAlreadyRedeemed') || error.message?.includes('SUCCESSFUL')) {
        errorMessage = 'This gift card has already been redeemed.';
      } else if (error.message?.includes('GiftAlreadyReclaimed') || error.message?.includes('RECLAIMED')) {
        errorMessage = 'This gift card has already been reclaimed.';
      } else if (error.message?.includes('GiftNotExpired')) {
        errorMessage = 'This gift card is not expired yet and cannot be reclaimed.';
      } else if (error.message?.includes('InvalidGiftStatus')) {
        errorMessage = 'The gift is not in a PENDING state or has an invalid status.';
      } else if (error.message?.includes('NotCreator')) {
        errorMessage = 'You are not the creator of this gift.';
      } else if (error.message?.includes('execution reverted')) {
        errorMessage = `Contract execution reverted: ${error.message || 'Unknown reason'}`;
      } else {
        errorMessage = `Contract error: ${error.message || 'Unknown error'}`;
      }
      setErrors({ code: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-900 to-purple-900 flex items-center justify-center p-4">
      <div className="bg-indigo-950 rounded-lg shadow-xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-white text-center mb-6">Reclaim Expired Gift</h1>
        <p className="text-indigo-200 text-center mb-8">Enter your gift code to reclaim expired, unclaimed tokens</p>

        <div className="mb-6">
          <label className="block text-indigo-200 mb-2">Gift Card Code</label>
          <div className="flex">
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setGiftDetails(null);
                setTxSuccess(false);
                setTxHash('');
              }}
              className="w-full bg-indigo-900/50 text-white rounded-l-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter gift code (e.g., c2f1-eb68-edd1-89ba)"
            />
            <button
              type="button"
              onClick={handleCodeValidation}
              disabled={loading || !code.trim() || code.length < 6}
              className="bg-indigo-700 hover:bg-indigo-600 text-white px-4 rounded-r-lg focus:outline-none disabled:opacity-50"
            >
              {loading ? (
                <svg
                  className="animate-spin h-5 w-5"
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
              ) : (
                'Validate'
              )}
            </button>
          </div>
          {errors.code && <p className="text-red-400 mt-1 text-sm">{errors.code}</p>}
          {txHash && (
            <p className="text-indigo-200 mt-1 text-sm">
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

        {giftDetails && (
          <div className="mb-6 bg-indigo-900/30 rounded-xl overflow-hidden border border-indigo-800/50">
            <div
              className={`p-4 ${getStatusColor(giftDetails.status)} text-white flex justify-between items-center`}
            >
              <h3 className="font-bold">Gift Card Status</h3>
              <span className="px-2 py-1 text-xs rounded-full bg-white/20">
                {getStatusText(giftDetails.status)}
              </span>
            </div>

            <div className="p-4">
              {giftDetails.message && (
                <div className="mb-4">
                  <h4 className="text-indigo-200 text-sm mb-1">Message</h4>
                  <p className="text-white font-medium">{giftDetails.message}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-4">
                {giftDetails.amount && (
                  <div>
                    <h4 className="text-indigo-200 text-sm mb-1">Amount</h4>
                    <p className="text-white font-medium">{giftDetails.amount} USDC</p>
                  </div>
                )}

                {giftDetails.token && (
                  <div>
                    <h4 className="text-indigo-200 text-sm mb-1">Token</h4>
                    <p className="text-white font-medium truncate" title={giftDetails.token}>
                      {giftDetails.token.slice(0, 6)}...{giftDetails.token.slice(-4)}
                    </p>
                  </div>
                )}
              </div>

              {giftDetails.timeCreated && (
                <div className="mb-4">
                  <h4 className="text-indigo-200 text-sm mb-1">Created</h4>
                  <p className="text-white text-sm">{formatDate(giftDetails.timeCreated)}</p>
                </div>
              )}

              {giftDetails.expiry && (
                <div className="mb-4">
                  <h4 className="text-indigo-200 text-sm mb-1">
                    {giftDetails.expiry * 1000 > Date.now() ? 'Expires' : 'Expired'}
                  </h4>
                  <p
                    className={`text-sm ${
                      giftDetails.expiry * 1000 > Date.now() ? 'text-white' : 'text-red-400'
                    }`}
                  >
                    {formatDate(giftDetails.expiry)}
                  </p>
                </div>
              )}

              {giftDetails.creator && walletAddress && (
                <div className="mb-4">
                  <h4 className="text-indigo-200 text-sm mb-1">Creator</h4>
                  <p className="text-white text-sm truncate">
                    {giftDetails.creator.toLowerCase() ===
                    ethers.keccak256(ethers.getAddress(walletAddress)).toLowerCase()
                      ? 'You (matched)'
                      : 'Not matched'}
                  </p>
                </div>
              )}

              {txSuccess ? (
                <div className="text-center py-2">
                  <p className="text-green-400 text-sm flex items-center justify-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Successfully reclaimed!
                  </p>
                </div>
              ) : giftDetails.isValid && isReclaimable(giftDetails) ? (
                <button
                  onClick={handleReclaimGift}
                  disabled={isSubmitting}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Reclaiming...' : 'Reclaim Tokens'}
                </button>
              ) : (
                <div className="text-center py-2">
                  <p className="text-red-400 text-sm">
                    {giftDetails.errorMessage
                      ? giftDetails.errorMessage
                      : 'This gift cannot be reclaimed (not expired, not your gift, or already processed)'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 text-xs text-indigo-300">
          <p className="mb-1">Test codes:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <code className="bg-indigo-900/50 px-1 rounded">c2f1-eb68-edd1-89ba</code> - Valid gift card
            </li>
            <li>
              <code className="bg-indigo-900/50 px-1 rounded">NOTFOUND123</code> - Gift not found
            </li>
            <li>
              <code className="bg-indigo-900/50 px-1 rounded">REDEEMED123</code> - Already redeemed
            </li>
            <li>
              <code className="bg-indigo-900/50 px-1 rounded">RECLAIMED123</code> - Already reclaimed
            </li>
            <li>
              <code className="bg-indigo-900/50 px-1 rounded">NOTEXPIRED123</code> - Not expired yet
            </li>
            <li>
              <code className="bg-indigo-900/50 px-1 rounded">NOTCREATOR123</code> - Not your gift
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ReclaimGift;