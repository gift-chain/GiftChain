import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import axios from 'axios';
import { format } from 'date-fns';
import { Contract, BrowserProvider, parseUnits, MaxUint256 } from 'ethers';
import giftcard from '../assets/giftcard.png';
import { GiftCard } from '../ui/GiftCard';
import Container from '../ui/Container';

// Minimal ERC-20 ABI for allowance, approve, decimals
const ERC20_ABI = [
  {
    constant: true,
    inputs: [
      { name: '_owner', type: 'address' },
      { name: '_spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: '_spender', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function',
  },
];

interface GiftForm {
  token: string;
  amount: string;
  expiry: string;
  message: string;
}

interface GiftResponse {
  giftID: string;
  transactionHash: string;
  token: string;
  amount: string;
  expiry: number;
  message: string;
  creator: string;
  downloadUrl: string;
}

export default function CreateGiftCard() {
  const navigate = useNavigate();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [form, setForm] = useState<GiftForm>({
    token: '',
    amount: '',
    expiry: '',
    message: '',
  });
  const [gift, setGift] = useState<GiftResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  // Relayer address (from creategift.js)
  const RELAYER_ADDRESS = '0xA07139110776DF9621546441fc0a5417B8E945DF';

  // Token map (Sepolia testnet addresses)
  const tokenMap: Record<string, string> = {
    USDT: '0xf99F557Ed59F884F49D923643b1A48F834a90653', // Sepolia USDT
    USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia USDC (replace with actual)
    DAI: '0x68194a729C2450ad26072b3D33ADaCbcef39D574', // Sepolia DAI (replace with actual)
  };

  // Token decimals map (assumes 6 for USDT/USDC/DAI)
  const tokenDecimals: Record<string, number> = {
    USDT: 6,
    USDC: 6,
    DAI: 6,
  };

  const tokens = Object.keys(tokenMap);
  const minDateTime = format(new Date(), "yyyy-MM-dd'T'HH:mm");

  // Check allowance and approve if needed
  const checkAndApprove = async (tokenAddress: string, amount: string) => {
    if (!publicClient || !walletClient || !address) return false;

    try {
      // Initialize Ethers.js provider and signer
      const provider = new BrowserProvider(walletClient.transport);
      const signer = await provider.getSigner();
      const tokenContract = new Contract(tokenAddress, ERC20_ABI, signer);

      // Get decimals
      const decimals = tokenDecimals[form.token] || 6;
      const amountBN = parseUnits(amount, decimals);

      // Check allowance
      const allowance = await tokenContract.allowance(address, RELAYER_ADDRESS);
      if (BigInt(allowance.toString()) < BigInt(amountBN.toString())) {
        setIsApproving(true);
        // Approve the exact amount
        const tx = await tokenContract.approve(RELAYER_ADDRESS, amountBN);
        // Optionally, approve MaxUint256 to avoid future approvals
        // const tx = await tokenContract.approve(RELAYER_ADDRESS, MaxUint256);
        await tx.wait();
        setIsApproving(false);
        return true;
      }
      return true;
    } catch (err: any) {
      setError(`Approval failed: ${err.message || 'Unknown error'}`);
      setIsApproving(false);
      return false;
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) {
      setError('Please connect your wallet to create a gift.');
      return;
    }
    if (!form.amount || parseFloat(form.amount) <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (!form.expiry) {
      setError('Please select an expiry date.');
      return;
    }
    if (form.message.length > 0 && (form.message.length < 3 || form.message.length > 50)) {
      setError('Message must be between 3 and 50 characters if provided.');
      return;
    }
    if (!tokenMap[form.token]) {
      setError('Selected token is not supported.');
      return;
    }

    setError(null);

    try {
      // Check and approve tokens
      const tokenAddress = tokenMap[form.token];
      const isApproved = await checkAndApprove(tokenAddress, form.amount);
      if (!isApproved) return;

      // Call backend
      setIsLoading(true);
      const expiryTimestamp = Math.floor(new Date(form.expiry).getTime() / 1000);
      const response = await axios.post('http://localhost:3000/api/create-gift', {
        token: tokenAddress,
        amount: form.amount,
        expiry: expiryTimestamp,
        message: form.message,
        creator: address,
      });

      if (response.data.success) {
        setGift({ ...response.data.details, token: form.token });
        setForm({ token: '', amount: '', expiry: '', message: '' });
        // Auto-trigger download
        const link = document.createElement('a');
        link.href = `http://localhost:3000${response.data.details.downloadUrl}`;
        link.download = `${response.data.details.giftID}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        navigate('/dashboard');
      } else {
        setError(response.data.error || 'Failed to create gift.');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'An error occurred.';
      if (errorMessage.includes('Creator needs to approve relayer first')) {
        setError('Please approve the relayer to spend your tokens.');
      } else if (errorMessage.includes('Invalid token address')) {
        setError('The selected token is not supported on this network.');
      } else if (errorMessage.includes('Insufficient token balance')) {
        setError('Insufficient token balance. Please check your wallet.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1F1668] flex items-center justify-center p-4">
      <Container className="w-full max-w-md bg-[#041259]/40 rounded-xl p-6 shadow-lg">
        <h2 className="text-white text-xl font-semibold mb-6">Create Gift Card</h2>
        <form onSubmit={handleSubmit}>
          {/* Select Token */}
          <div className="mb-4">
            <label className="block text-white text-sm mb-1">Select Token</label>
            <div className="relative">
              <select
                name="token"
                value={form.token}
                onChange={handleChange}
                className="w-full bg-transparent border border-white rounded-lg px-4 py-3 text-sm text-white appearance-none focus:outline-none"
              >
                <option value="" disabled className="text-[#d9d9d9] text-sm opacity-50">
                  Select token
                </option>
                {tokens.map((token) => (
                  <option key={token} value={token} className="bg-[#101339] text-white">
                    {token}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Enter Amount */}
          <div className="mb-4">
            <label className="block text-white text-sm mb-1">Enter Amount</label>
            <input
              type="number"
              name="amount"
              value={form.amount}
              onChange={handleChange}
              placeholder="Enter amount"
              className="w-full bg-transparent border border-white rounded-lg text-sm px-4 py-3 text-white placeholder-white focus:outline-none"
              step="0.01"
              min="0"
            />
          </div>

          {/* Expiration Input */}
          <div className="mb-4">
            <label className="block text-white text-sm mb-1">Set Expiration</label>
            <input
              type="datetime-local"
              name="expiry"
              value={form.expiry}
              onChange={handleChange}
              min={minDateTime}
              className="w-full bg-transparent border border-white text-sm rounded-lg px-4 py-3 text-white placeholder-white focus:outline-none"
            />
          </div>

          {/* Write a note */}
          <div className="mb-4">
            <label className="block text-white text-sm mb-1">Write a note (optional)</label>
            <textarea
              name="message"
              value={form.message}
              onChange={handleChange}
              placeholder="Write a note (optional, 3-50 characters)"
              className="w-full bg-transparent border border-white rounded-lg text-sm px-4 py-3 text-white placeholder-white focus:outline-none resize-none"
              rows={4}
            />
          </div>

          {/* Error Message */}
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

          {/* Preview Card */}
          <div className="w-full h-50 rounded-lg flex items-center justify-center overflow-hidden mt-6">
            <img src={giftcard} alt="Card Preview" className="object-cover w-full h-full rounded-lg" />
          </div>

          {/* Create Gift Card Button */}
          <button
            type="submit"
            disabled={isLoading || isApproving || !address}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium py-3 rounded-lg transition mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isApproving ? 'Approving Token...' : isLoading ? 'Creating Gift...' : 'Create Gift Card'}
          </button>
        </form>

        {/* Gift Card Preview */}
        {gift && (
          <div className="mt-10">
            <h3 className="text-xl font-semibold text-white mb-6 text-center">Your Gift Card</h3>
            <div className="flex justify-center">
              <GiftCard
                card={{
                  cardName: `Gift Card #${gift.giftID.slice(0, 4)}`,
                  status: 'Pending',
                  amount: Number(parseUnits(gift.amount, 6)),
                  token: gift.token,
                  expiry: format(new Date(gift.expiry * 1000), 'yyyy-MM-dd'),
                  giftCode: gift.giftID,
                }}
              />
            </div>
            <div className="text-center mt-4">
              <a
                href={`http://localhost:3000${gift.downloadUrl}`}
                download={`${gift.giftID}.png`}
                className="inline-block bg-purple-600 hover:bg-purple-500 text-white font-medium py-2 px-4 rounded-lg transition"
              >
                Download Gift Card Image
              </a>
            </div>
          </div>
        )}
      </Container>
    </div>
  );
}