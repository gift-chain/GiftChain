// src/components/Dashboard.tsx
import { useMemo, useState, useEffect } from "react";
import { useAccount, useConnect } from "wagmi";
import { injected } from "@wagmi/connectors";
import { BulkGiftTable } from "../ui/BulkGiftTable";
import { CardBox } from "../ui/CardBox";
import Container from "../ui/Container";
import ProfileHeader from "../ui/ProfileHeader";
import { GiftCard } from "../ui/GiftCard";
import {
  useUserGifts,
  useUserClaimedGifts,
  useUserReclaimedGifts,
} from "../subgraph/useGiftQueries";
import { ethers } from "ethers";
import axios from "axios";

// Token map (Sepolia testnet addresses)
const tokenMap: Record<string, string> = {
  USDT: "0xf99F557Ed59F884F49D923643b1A48F834a90653",
  USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  DAI: "0x68194a729C2450ad26072b3D33ADaCbcef39D574",
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

  const { giftsCreated, loading: giftsLoading, error: giftsError } = useUserGifts(hashedAddress || "");
  const { claimedGifts, loading: claimedLoading, error: claimedError } = useUserClaimedGifts(address || "");
  const { reclaimedGifts, loading: reclaimedLoading, error: reclaimedError } = useUserReclaimedGifts(address || "");

  console.log("Gift Created => ", giftsCreated);
  console.log("Claimed Gifts:", claimedGifts);
  console.log("Gift IDs (rawcode):", giftIDs);

  // Fetch giftIDs from MongoDB using subgraph hashedCode
  useEffect(() => {
    const fetchGiftIDs = async () => {
      const uniqueHashedCodes = Array.from(
        new Set([
          ...giftsCreated.map((gift) => gift.id.toLowerCase()),
          ...claimedGifts.map((claimed) => claimed.gift.id.toLowerCase()),
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
          return { hashedCode, giftID: "N/A" };
        }
      });

      const giftIDResults = await Promise.all(giftIDPromises);
      const newGiftIDMap = giftIDResults.reduce((acc, { hashedCode, giftID }) => {
        acc[hashedCode] = giftID;
        return acc;
      }, {} as { [key: string]: string });

      setGiftIDs((prev) => ({ ...prev, ...newGiftIDMap }));
    };

    if (giftsCreated.length > 0 || claimedGifts.length > 0) {
      fetchGiftIDs();
    }
  }, [giftsCreated, claimedGifts]);

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
    const claimedPercentage = giftsCreated.length
      ? ((claimedCount / giftsCreated.length) * 100).toFixed(2)
      : "0.00";

    return {
      totalGift: totalGift.toFixed(2),
      claimedPercentage,
      feePaid: feePaid.toFixed(2),
    };
  }, [giftsCreated, claimedGifts]);

  // Combine gifts for BulkGiftTable
  const bulkGiftData = useMemo(() => {
    return giftsCreated.map((gift) => {
      const tokenSymbol = getTokenSymbol(gift.token);
      const decimals = tokenDecimals[tokenSymbol] || 6;
      const expiryDate = new Date(parseInt(gift.expiry) * 1000);
      const isExpired = expiryDate < new Date();
      return {
        code: giftIDs[gift.id.toLowerCase()] || "Loading...",
        status: isExpired ? "EXPIRED" : gift.status || "PENDING",
        amount: parseFloat(ethers.formatUnits(gift.amount, decimals)),
        token: tokenSymbol,
        expiry: expiryDate.toISOString().split("T")[0],
        claimed: !!claimedGifts.find((c) => c.gift.id === gift.id),
      };
    });
  }, [giftsCreated, claimedGifts, giftIDs]);

  // Combine claimed gifts
  const claimedGiftData = useMemo(() => {
    return claimedGifts.map((claimed) => {
      const tokenSymbol = getTokenSymbol(claimed.gift.token);
      const decimals = tokenDecimals[tokenSymbol] || 6;
      return {
        code: giftIDs[claimed.gift.id.toLowerCase()] || "Loading...",
        message: claimed.gift.message,
        amount: parseFloat(ethers.formatUnits(claimed.amount, decimals)),
        token: tokenSymbol,
        claimedDate: new Date(parseInt(claimed.blockTimestamp) * 1000).toISOString().split("T")[0],
      };
    });
  }, [claimedGifts, giftIDs]);

  // Combine gifts for GiftCard
  const userCards = useMemo(() => {
    return giftsCreated.map((gift, idx) => {
      const tokenSymbol = getTokenSymbol(gift.token);
      const decimals = tokenDecimals[tokenSymbol] || 6;
      const expiryDate = new Date(parseInt(gift.expiry) * 1000);
      const isExpired = expiryDate < new Date();
      return {
        cardName: `Card ${idx + 1}`,
        status: isExpired ? "EXPIRED" : gift.status || "PENDING",
        amount: parseFloat(ethers.formatUnits(gift.amount, decimals)),
        token: tokenSymbol,
        expiry: expiryDate.toISOString(),
        giftCode: giftIDs[gift.id.toLowerCase()] || "Loading...",
      };
    });
  }, [giftsCreated, giftIDs]);

  // Debug logs
  console.log("Bulk Gift Data:", bulkGiftData);
  console.log("Claimed Gift Data:", claimedGiftData);
  console.log("User Cards:", userCards);
  console.log("Stats:", stats);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-figmablue text-white flex items-center justify-center">
        <button
          onClick={() => connect({ connector: injected() })}
          className="bg-[#9812C2] p-4 rounded-xl hover:bg-[#7a0f9e]"
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
    <div className="min-h-screen relative bg-figmablue overflow-hidden">
      <div className="absolute top-0 left-0 w-64 h-64 inset-9 bg-[#9812C2] blur-[120px] opacity-100 z-0" />
      <div className="absolute bottom-32 right-0 w-64 inset-9 h-64 bg-[#9812C2] blur-[120px] opacity-100 z-0" />
      <div className="absolute bottom-0 left-1/3 w-48 inset-9 h-48 bg-[#9812C2] blur-[120px] opacity-100 z-0" />

      <Container className="relative z-10">
        <div className="flex justify-between items-start">
          <ProfileHeader />
        </div>

        <div className="flex gap-4 mt-6">
          <CardBox title="Total Gift" value={`$${stats.totalGift}`} />
          <CardBox title="Claimed Gift" value={`${stats.claimedPercentage}%`} />
          <CardBox title="Fee Paid" value={`$${stats.feePaid}`} />
        </div>

        <h2 className="text-white font-semibold mt-10 mb-4">Created Gifts</h2>
        <BulkGiftTable data={bulkGiftData} />

        <h2 className="text-white font-semibold mt-10 mb-4">Claimed Gifts</h2>
        <div className="bg-[#1E1E1E] rounded-xl p-4">
          {claimedGiftData.length === 0 ? (
            <p className="text-gray-400">No gifts claimed yet.</p>
          ) : (
            <table className="w-full text-white">
              <thead>
                <tr>
                  <th className="text-left p-2">Gift Code</th>
                  <th className="text-left p-2">Message</th>
                  <th className="text-left p-2">Amount</th>
                  <th className="text-left p-2">Token</th>
                  <th className="text-left p-2">Claimed Date</th>
                  <th className="text-left p-2">Transaction Hash</th>
                </tr>
              </thead>
              <tbody>
                {claimedGiftData.map((gift, idx) => (
                  <tr key={idx} className="border-t border-gray-700">
                    <td className="p-2">{gift.code}</td>
                    <td className="p-2">{gift.message}</td>
                    <td className="p-2">{gift.amount}</td>
                    <td className="p-2">{gift.token}</td>
                    <td className="p-2">{gift.claimedDate}</td>
                    {/* <td className="p-2">{gift.transactionHash?.slice(0, 8)}...</td> */}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-10">
          <h2 className="text-white font-semibold mb-4">Your Gift Cards</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {userCards.map((card, idx) => (
              <div key={idx} className="relative">
                {idx === userCards.length - 1 && (
                  <div className="absolute inset-0 bg-[#9812C2] blur-[120px] opacity-100 z-0 rounded-xl" />
                )}
                <GiftCard card={card} userAddress={address} />
              </div>
            ))}
          </div>
        </div>
      </Container>
    </div>
  );
}