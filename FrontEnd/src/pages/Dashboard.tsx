// src/components/Dashboard.tsx
import { useMemo, useState, useEffect } from 'react';
import { useAccount, useConnect } from 'wagmi';
import { injected } from '@wagmi/connectors';
import { BulkGiftTable } from '../ui/BulkGiftTable';
import { CardBox } from '../ui/CardBox';
import Container from '../ui/Container';
import ProfileHeader from '../ui/ProfileHeader';
import { GiftCard } from '../ui/GiftCard';
import {
  useUserGifts,
  useUserClaimedGifts,
  useUserReclaimedGifts,
} from '../subgraph/useGiftQueries';
import { ethers } from 'ethers';
import axios from 'axios';

// Token map (Sepolia testnet addresses)
const tokenMap: Record<string, string> = {
  USDT: '0xf99F557Ed59F884F49D923643b1A48F834a90653',
  USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  DAI: '0x68194a729C2450ad26072b3D33ADaCbcef39D574',
};

// Reverse token map (address to symbol)
const reverseTokenMap: Record<string, string> = Object.fromEntries(
  Object.entries(tokenMap).map(([symbol, address]) => [address.toLowerCase(), symbol])
);

// Token decimals map
const tokenDecimals: Record<string, number> = {
  USDT: 6,
  USDC: 6,
  DAI: 6,
};

// Get token symbol (fallback to address if unknown)
const getTokenSymbol = (tokenAddress: string): string => {
  return reverseTokenMap[tokenAddress.toLowerCase()] || tokenAddress.slice(0, 8);
};

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();

  // State to store MongoDB giftIDs (rawcode)
  const [giftIDs, setGiftIDs] = useState<{ [key: string]: string }>({});

  const hashedAddress = address ? ethers.keccak256(ethers.getAddress(address)) : null;

  const { giftsCreated, loading: giftsLoading, error: giftsError } = useUserGifts(hashedAddress || '');
  const { claimedGifts, loading: claimedLoading, error: claimedError } = useUserClaimedGifts(address || '');
  const { reclaimedGifts, loading: reclaimedLoading, error: reclaimedError } = useUserReclaimedGifts(address || '');

  console.log('Gift Created => ', giftsCreated);
  console.log('Claimed Gifts:', claimedGifts);
  console.log('Reclaimed Gifts:', reclaimedGifts);
  console.log('Gift IDs (rawcode):', giftIDs);

  // Fetch giftIDs from MongoDB using subgraph hashedCode
  useEffect(() => {
    const fetchGiftIDs = async () => {
      const uniqueHashedCodes = Array.from(
        new Set([
          ...giftsCreated.map((gift) => gift.id.toLowerCase()),
          ...claimedGifts.map((claimed) => claimed.gift.id.toLowerCase()),
          ...reclaimedGifts.map((reclaimed) => reclaimed.gift.id.toLowerCase()),
        ])
      );

      const newHashedCodes = uniqueHashedCodes.filter((hashedCode) => !(hashedCode in giftIDs));

      if (newHashedCodes.length === 0) return;

      const giftIDPromises = newHashedCodes.map(async (hashedCode) => {
        try {
          const response = await axios.get(`http://localhost:3000/api/gift/${hashedCode}`);
          return { hashedCode, giftID: response.data.giftID };
        } catch (error) {
          console.error(`Error fetching giftID for ${hashedCode}:`, error);
          return { hashedCode, giftID: 'N/A' };
        }
      });

      const giftIDPromisesResults = await Promise.all(giftIDPromises);
      const newGiftIDMap = giftIDPromisesResults.reduce(
        (acc, { hashedCode, giftID }) => {
          acc[hashedCode] = giftID;
          return acc;
        },
        {} as { [key: string]: string }
      );

      setGiftIDs((prev) => ({ ...prev, ...newGiftIDMap }));
    };

    if (giftsCreated.length > 0 || claimedGifts.length > 0 || reclaimedGifts.length > 0) {
      fetchGiftIDs();
    }
  }, [giftsCreated, claimedGifts, reclaimedGifts]);

  // Compute stats for CardBox
  const stats = useMemo(() => {
    let totalGift = 0;
    let claimedCount = 0;
    let feePaid = 0;

    giftsCreated.forEach((gift) => {
      const tokenSymbol = getTokenSymbol(gift.token);
      const decimals = tokenDecimals[tokenSymbol] || 6;
      const amount = parseFloat(ethers.formatUnits(gift.amount, decimals));
      totalGift += amount;
      feePaid += amount * 0.01;
    });

    claimedCount = claimedGifts.length;

    return {
      totalGift: totalGift.toFixed(2),
      claimedCount,
      feePaid: feePaid.toFixed(2),
    };
  }, [giftsCreated, claimedGifts]);

  // Combine gifts for BulkGiftTable
  const bulkGiftData = useMemo(() => {
    const reclaimedGiftIds = new Set(reclaimedGifts.map(r => r.gift.id.toLowerCase()));
    const claimedGiftIds = new Set(claimedGifts.map(c => c.gift.id.toLowerCase()));
    
    return giftsCreated.map((gift) => {
      const tokenSymbol = getTokenSymbol(gift.token);
      const decimals = tokenDecimals[tokenSymbol] || 6;
      const expiryDate = new Date(parseInt(gift.expiry) * 1000);
      const isExpired = expiryDate < new Date();
      const isReclaimed = reclaimedGiftIds.has(gift.id.toLowerCase());
      const isClaimed = claimedGiftIds.has(gift.id.toLowerCase());
  
      return {
        code: giftIDs[gift.id.toLowerCase()] || 'Loading...',
        status: isReclaimed ? 'RECLAIMED' : isClaimed ? 'CLAIMED' : isExpired ? 'EXPIRED' : 'PENDING',
        amount: parseFloat(ethers.formatUnits(gift.amount, decimals)),
        token: tokenSymbol,
        expiry: expiryDate.toISOString().split('T')[0],
        claimed: isReclaimed || isClaimed, // Mark as claimed if either reclaimed or claimed
      };
    });
  }, [giftsCreated, claimedGifts, reclaimedGifts, giftIDs]);
  // Combine claimed gifts
  const claimedGiftData = useMemo(() => {
    return claimedGifts.map((claimed) => {
      const tokenSymbol = getTokenSymbol(claimed.gift.token);
      const decimals = tokenDecimals[tokenSymbol] || 6;
      return {
        code: giftIDs[claimed.gift.id.toLowerCase()] || 'Loading...',
        message: claimed.gift.message,
        amount: parseFloat(ethers.formatUnits(claimed.amount, decimals)),
        token: tokenSymbol,
        claimedDate: new Date(parseInt(claimed.blockTimestamp) * 1000).toISOString().split('T')[0],
      };
    });
  }, [claimedGifts, giftIDs]);

  // Combine gifts for GiftCard
  const userCards = useMemo(() => {
    const reclaimedGiftIds = new Set(reclaimedGifts.map(r => r.gift.id.toLowerCase()));
    const claimedGiftIds = new Set(claimedGifts.map(c => c.gift.id.toLowerCase()));
    
    return giftsCreated.map((gift, idx) => {
      const tokenSymbol = getTokenSymbol(gift.token);
      const decimals = tokenDecimals[tokenSymbol] || 6;
      const expiryDate = new Date(parseInt(gift.expiry) * 1000);
      const isExpired = expiryDate < new Date();
      const isReclaimed = reclaimedGiftIds.has(gift.id.toLowerCase());
      const isClaimed = claimedGiftIds.has(gift.id.toLowerCase());
  
      return {
        cardName: `Card ${idx + 1}`,
        status: isReclaimed ? 'RECLAIMED' : isClaimed ? 'CLAIMED' : isExpired ? 'EXPIRED' : 'PENDING',
        amount: parseFloat(ethers.formatUnits(gift.amount, decimals)),
        token: tokenSymbol,
        expiry: expiryDate.toISOString(),
        giftCode: giftIDs[gift.id.toLowerCase()] || 'Loading...',
        isClaimed: isReclaimed || isClaimed, // Add this field if needed
      };
    });
  }, [giftsCreated, claimedGifts, reclaimedGifts, giftIDs]);

  // Debug logs
  console.log('Bulk Gift Data:', bulkGiftData);
  console.log('Claimed Gift Data:', claimedGiftData);
  console.log('User Cards:', userCards);
  console.log('Stats:', stats);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-figmablue text-white flex items-center justify-center">
        <button
          onClick={() => {
            console.log('Connect Wallet clicked (Dashboard)');
            connect({ connector: injected() });
          }}
          className="bg-indigo-600 p-4 rounded-xl hover:bg-indigo-700 z-50 pointer-events-auto"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  if (giftsLoading || claimedLoading || reclaimedLoading) {
    return <div className="min-h-screen bg-figmablue text-white flex items-center justify-center">Loading...</div>;
  }

  if (giftsError || claimedError || reclaimedError) {
    return (
      <div className="min-h-screen bg-figmablue text-red-500 flex items-center justify-center">
        Error: {giftsError?.message || claimedError?.message || reclaimedError?.message}
      </div>
    );
  }

  return (
    <div className="bg-figmablue text-white min-h-screen">
      <Container className="relative pt-20 pb-10">
        <div className="flex justify-between items-start">
          <ProfileHeader />
        </div>

        <div className="flex gap-6 mt-8">
          <CardBox title="Total Gift" value={`$${stats.totalGift}`} />
          <CardBox title="Claimed Gift" value={`${stats.claimedCount}`} />
          <CardBox title="Fee Paid" value={`$${stats.feePaid}`} />
        </div>

        <div className="mt-12">
          <h2 className="text-white font-semibold mb-4 text-2xl">Your Gift Cards</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {userCards.map((card, idx) => (
              <GiftCard key={idx} card={card} userAddress={address} />
            ))}
          </div>
        </div>

        <h2 className="text-white font-semibold mt-12 mb-4 text-2xl">Created Gifts</h2>
        <BulkGiftTable data={bulkGiftData} />

        <h2 className="text-white font-semibold mt-12 mb-4 text-2xl">Claimed Gifts</h2>
        <div className="bg-white/10 rounded-xl p-6 shadow-lg backdrop-blur-sm">
          {claimedGiftData.length === 0 ? (
            <p className="text-gray-400 text-center">No gifts claimed yet.</p>
          ) : (
            <table className="w-full text-white">
              <thead>
                <tr className="bg-white/5">
                  <th className="text-left p-4 font-semibold">Gift Code</th>
                  <th className="text-left p-4 font-semibold">Message</th>
                  <th className="text-left p-4 font-semibold">Amount</th>
                  <th className="text-left p-4 font-semibold">Token</th>
                  <th className="text-left p-4 font-semibold">Claimed Date</th>
                  <th className="text-left p-4 font-semibold">Transaction Hash</th>
                </tr>
              </thead>
              <tbody>
                {claimedGiftData.map((gift, idx) => (
                  <tr key={idx} className="border-t border-gray-700 hover:bg-white/5 transition-colors">
                    <td className="p-4">{gift.code}</td>
                    <td className="p-4">{gift.message}</td>
                    <td className="p-4">${gift.amount.toFixed(2)}</td>
                    <td className="p-4">{gift.token}</td>
                    <td className="p-4">{gift.claimedDate}</td>
                    <td className="p-4">N/A</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Container>
    </div>
  );
}