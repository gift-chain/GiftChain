import React, { useState } from 'react';
import { ethers } from 'ethers';
import GiftChainABI from '../abi/giftChainABI.json'; // ABI of the smart contract

const CONTRACT_ADDRESS = '0x4dbdd0111E8Dd73744F1d9A60e56129009eEE473';
const PROVIDER_URL = 'https://eth-sepolia.g.alchemy.com/v2/7Ehr_350KwRXw2n30OoeevZUOFu12XYX';

interface ValidationErrors {
  code?: string;
}

interface ValidationResult {
  isValid: boolean;
  message?: string;
}

const ValidateGift: React.FC = () => {
  const [code, setCode] = useState<string>('');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Initialize read-only provider
  const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, GiftChainABI, provider);

  const validateGift = async (rawCode: string): Promise<ValidationResult> => {
    try {
      console.log('Validating gift code:', rawCode);
      // Compute the expected codeHash for debugging
      const codeHash = ethers.keccak256(ethers.toUtf8Bytes(rawCode));
      console.log('Computed codeHash:', codeHash);

      // Call validateGift with the raw code
      const isValid = await contract.validateGift(codeHash);
      console.log('Validation result:', isValid);

      return {
        isValid,
        message: isValid ? 'Gift card is valid!' : 'Gift card is invalid.',
      };
    } catch (error: any) {
      console.error('Validation error:', error);
      let errorMessage = 'An unknown error occurred.';
      
      // Handle specific revert reasons
      if (error.reason || error.data?.message) {
        const reason = error.reason || error.data?.message;
        console.log('Error reason:', reason);
        if (reason.includes('GiftNotFound')) {
          errorMessage = 'Gift card not found. Please check your code.';
        } else if (reason.includes('GiftAlreadyRedeemed')) {
          errorMessage = 'This gift card has already been redeemed.';
        } else if (reason.includes('GiftAlreadyReclaimed')) {
          errorMessage = 'This gift card has been reclaimed by the sender.';
        } else if (reason.includes('InvalidGiftStatus')) {
          errorMessage = 'This gift card is expired or has an invalid status.';
        } else {
          errorMessage = `Contract error: ${reason}`;
        }
      } else if (error.message) {
        console.log('Error message:', error.message);
        errorMessage = `Provider error: ${error.message}`;
      }

      return {
        isValid: false,
        message: errorMessage,
      };
    }
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
      setValidationResult(result);

      if (!result.isValid) {
        setErrors({ code: result.message });
      } else {
        setErrors({ code: undefined });
      }
    } catch (error: any) {
      setLoading(false);
      console.error('Unexpected error validating code:', error);
      setErrors({ code: `Unexpected error: ${error.message || 'Unknown error'}` });
    }
  };

  const handleClaimGift = async () => {
    if (!validationResult?.isValid) {
      alert('Please validate a valid gift code first');
      return;
    }

    try {
      if (!window.ethereum) {
        alert('Please install MetaMask or another wallet provider');
        return;
      }

      setIsSubmitting(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contractWithSigner = new ethers.Contract(CONTRACT_ADDRESS, GiftChainABI, signer);

      const codeHash = ethers.keccak256(ethers.toUtf8Bytes(code));
      console.log('Claiming gift with codeHash:', codeHash);
      const tx = await contractWithSigner.claimGift(codeHash);
      await tx.wait();

      setValidationResult({
        isValid: false,
        message: 'Gift claimed successfully!',
      });
      alert('Gift claimed successfully!');
    } catch (error: any) {
      console.error('Error claiming gift:', error);
      setErrors({
        code: error.reason || error.message || 'Transaction failed. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-900 to-purple-900 flex items-center justify-center p-4">
      <div className="bg-indigo-950 rounded-lg shadow-xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-white text-center mb-6">Gift Card Validator</h1>
        <p className="text-indigo-200 text-center mb-8">Enter your code to validate and claim your crypto gift</p>

        <div className="mb-6">
          <label className="block text-indigo-200 mb-2">Gift Card Code</label>
          <div className="flex">
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setValidationResult(null);
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
        </div>

        {validationResult && (
          <div className="mb-6 bg-indigo-900/30 rounded-xl overflow-hidden border border-indigo-800/50">
            <div
              className={`p-4 ${
                validationResult.isValid ? 'bg-green-500' : 'bg-red-500'
              } text-white flex justify-between items-center`}
            >
              <h3 className="font-bold">Gift Card Status</h3>
              <span className="px-2 py-1 text-xs rounded-full bg-white/20">
                {validationResult.isValid ? 'Valid' : 'Invalid'}
              </span>
            </div>
            <div className="p-4">
              <p
                className={`text-sm ${
                  validationResult.isValid ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {validationResult.message}
              </p>
              {validationResult.isValid && (
                <button
                  onClick={handleClaimGift}
                  disabled={isSubmitting}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                >
                  {isSubmitting ? 'Claiming...' : 'Claim Gift'}
                </button>
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
              <code className="bg-indigo-900/50 px-1 rounded">REDEEMED123</code> - Already redeemed
            </li>
            <li>
              <code className="bg-indigo-900/50 px-1 rounded">RECLAIMED123</code> - Already reclaimed
            </li>
            <li>
              <code className="bg-indigo-900/50 px-1 rounded">NOTFOUND123</code> - Gift not found
            </li>
            <li>
              <code className="bg-indigo-900/50 px-1 rounded">EXPIRED123</code> - Expired gift
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ValidateGift;