// import React { useState } from 'react';
import { useState } from 'react';
import { ethers } from 'ethers';
import { useAccount } from 'wagmi';
import { toast } from 'react-hot-toast';
import { keccak256, toUtf8Bytes } from 'ethers';

export default function ClaimGift() {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { address, isConnected } = useAccount();

  const handleClaimGift = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!code) {
      toast.error('Please enter a gift code');
      return;
    }

    try {
      setIsLoading(true);
      
      // Hash the code
      const hashedCode = keccak256(toUtf8Bytes(code));
      
      // Call the backend API to claim the gift
      const response = await fetch('http://localhost:3000/claim-gift', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: hashedCode,
          claimer: address,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to claim gift');
      }

      toast.success('Gift claimed successfully!');
      setCode('');
    } catch (error: unknown) {
      console.error('Error claiming gift:', error);
      if (error instanceof Error) {
        toast.error(error.message || 'Failed to claim gift');
      } else {
        toast.error('Failed to claim gift');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center w-full h-screen bg-[#1F1668]">
      <div className="w-full max-w-md p-8 rounded-lg" style={{ backgroundColor: 'rgba(43, 27, 108, 0.5)' }}>
        <h1 className="text-2xl font-bold text-center text-white mb-2">Claim Gift Card</h1>
        <p className="text-center text-white text-sm mb-6">
          Enter your code to receive your crypto gift card
        </p>

        <div className="mb-4">
          <label className="block text-white text-sm mb-2">
            Gift Code
          </label>
          <input
            className="w-full px-4 py-3 rounded-lg bg-transparent text-white border border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
            type="text"
            placeholder="Enter gift code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>        
        <button 
          onClick={handleClaimGift}
          disabled={isLoading || !isConnected}
          className={`w-full py-3 rounded-lg ${
            isLoading || !isConnected 
              ? 'bg-gray-600 cursor-not-allowed' 
              : 'bg-transparent border border-purple-600 hover:bg-purple-900'
          } text-white font-medium transition-colors`}
        >
          {isLoading ? 'Claiming...' : 'Claim Gift'}
        </button>
      </div>
    </div>
  );
}