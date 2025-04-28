import React, { useState } from 'react';
import { ethers } from 'ethers';
import GiftChainABI from '../abi/giftChainABI.json'; // ABI of the smart contract
import erc20ABI from '../abi/erc20ABI.json'; // ABI of the ERC20 token contract

const CONTRACT_ADDRESS = '0x4dbdd0111E8Dd73744F1d9A60e56129009eEE473';
const PROVIDER_URL = 'https://eth-sepolia.g.alchemy.com/v2/7Ehr_350KwRXw2n30OoeevZUOFu12XYX';

interface ValidationErrors {
  code?: string;
}

interface ValidationResult {
  isValid: boolean;
  message?: string;
  details?: {
    token: string;
    message: string;
    amount: string;
    expiry: string;
    timeCreated: string;
    claimed: boolean;
  };
}

const ValidateGift: React.FC = () => {
  const [code, setCode] = useState<string>('');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Initialize read-only provider
  const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, GiftChainABI, provider);

  const validateGift = async (rawCode: string): Promise<ValidationResult> => {
    if (!contract) {
      return {
        isValid: false,
        message: 'Contract initialization failed',
      };
    }
    try {
      console.log('Validating gift code:', rawCode);
      const codeHash = ethers.keccak256(ethers.toUtf8Bytes(rawCode));
      console.log('Computed codeHash:', codeHash);

      // Call validateGift with the code hash
      const isValid = await contract.validateGift(codeHash);
      console.log('Validation result:', isValid);
      let details
      if(isValid) {
        const gift = await contract.gifts(codeHash);
        const erc20 = new ethers.Contract(gift.token, erc20ABI, provider);
        const tokenSymbol = await erc20.symbol();
        const tokenDecimals = await erc20.decimals();
        const formattedAmount = ethers.formatUnits(gift.amount, tokenDecimals);
        details = {
          token: tokenSymbol,
          message: gift.message,
          amount: formattedAmount,
          expiry: gift.expiry.toString(),
          timeCreated: gift.timeCreated.toString(),
          claimed: gift.claimed,
        }
      }


      return {
        isValid,
        message: isValid ? 'Gift card is valid!' : 'Gift card is invalid.',
        details
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-900 to-purple-900 flex items-center justify-center p-4">
      <div className="bg-indigo-950 rounded-lg shadow-xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-white text-center mb-6">Validate Gift</h1>
        <p className="text-indigo-200 text-center mb-8">Enter your code to validate and claim your crypto gift</p>

        <div className="mb-6">
          <label className="block text-indigo-200 mb-2">Gift Code</label>
          <div className="flex flex-col items-center">
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setValidationResult(null);
              }}
              className="w-full bg-indigo-900/50 text-white rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter gift code (e.g., c2f1-eb68-edd1-89ba)"
            />
            <button
              type="button"
              onClick={handleCodeValidation}
              disabled={loading || !code.trim() || code.length < 6}
              className="bg-purple-700 hover:bg-indigo-600 text-white py-4 px-4 my-4 rounded-lg focus:outline-none disabled:opacity-50"
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

        {validationResult && validationResult.details && (
          <div className="mt-4 space-y-3">
            <h4 className="text-lg font-semibold text-white mb-3">Gift Details</h4>
            <div className="bg-indigo-900/20 p-3 rounded-lg">
                <p className="text-indigo-300 text-sm">Status</p>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${validationResult.details.claimed ? 'bg-red-500' : 'bg-green-500'}`}></span>
                  <p className="text-white font-medium">
                    {validationResult.details.claimed ? 'Claimed' : 'Available'}
                  </p>
                </div>
            </div>
            <div className="grid gap-2">
              <div className="bg-indigo-900/20 p-3 rounded-lg">
                <p className="text-indigo-300 text-sm">Amount</p>
                <p className="text-white font-medium">{validationResult.details.amount} {validationResult.details.token}</p>
              </div>
              
              <div className="bg-indigo-900/20 p-3 rounded-lg">
                <p className="text-indigo-300 text-sm">Message</p>
                <p className="text-white font-medium">{validationResult.details.message}</p>
              </div>
              
              <div className="bg-indigo-900/20 p-3 rounded-lg">
                <p className="text-indigo-300 text-sm">Expiry</p>
                <p className="text-white font-medium">
                  {new Date(parseInt(validationResult.details.expiry) * 1000).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ValidateGift;