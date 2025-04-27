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
import { getTokenSymbol } from "../utils/tokenMapping";
import axios from "axios";
import Button from "../ui/Button";

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

  // Fetch giftIDs from MongoDB using subgraph hashedCode
  useEffect(() => {
    const fetchGiftIDs = async () => {
      // Get unique hashedCodes from created and claimed gifts
      const uniqueHashedCodes = Array.from(
        new Set([
          ...giftsCreated.map((gift) => gift.id.toLowerCase()),
          ...claimedGifts.map((claimed) => claimed.gift.id.toLowerCase()),
        ])
      );

      // Only fetch new hashedCodes not already in giftIDs
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

      // Merge new giftIDs with existing ones
      setGiftIDs((prev) => ({ ...prev, ...newGiftIDMap }));      
    };

    if (giftsCreated.length > 0 || claimedGifts.length > 0) {
      fetchGiftIDs();
    }
  }, [giftsCreated, claimedGifts]);

  // Log claimed gifts and giftIDs for debugging
  console.log("Claimed Gifts:", claimedGifts);
  console.log("Gift IDs (rawcode):", giftIDs);

  // Compute stats for CardBox
  const { totalGift, claimedPercentage, feePaid } = useMemo(() => {
    let totalGift = 0;
    let claimedCount = 0;
    let feePaid = 0;

    giftsCreated.forEach((gift) => {
      const amount = parseFloat(ethers.formatEther(gift.amount));
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

  // Combine gifts for BulkGiftTable (created gifts)
  const bulkGiftData = useMemo(() => {
    return giftsCreated.map((gift) => ({
      code: giftIDs[gift.id.toLowerCase()] || "Loading...", // Use MongoDB giftID
      status: gift.status || "PENDING",
      amount: parseFloat(ethers.formatEther(gift.amount)),
      token: getTokenSymbol(gift.token),
      expiry: new Date(parseInt(gift.expiry) * 1000).toISOString().split("T")[0],
      claimed: !!claimedGifts.find((c) => c.gift.id === gift.id),
    }));
  }, [giftsCreated, claimedGifts, giftIDs]);

  // Combine claimed gifts for a new table
  const claimedGiftData = useMemo(() => {
    return claimedGifts.map((claimed) => ({
      code: giftIDs[claimed.gift.id.toLowerCase()] || "Loading...", // Use MongoDB giftID
      message: claimed.gift.message,
      amount: parseFloat(ethers.formatEther(claimed.amount)),
      token: getTokenSymbol(claimed.gift.token),
      claimedDate: new Date(parseInt(claimed.blockTimestamp) * 1000).toISOString().split("T")[0],
    }));
  }, [claimedGifts, giftIDs]);

  // Combine gifts for GiftCard
  const userCards = useMemo(() => {
    return giftsCreated.map((gift, idx) => ({
      cardName: `Card ${idx + 1}`,
      status: gift.status || "PENDING",
      amount: parseFloat(ethers.formatEther(gift.amount)),
      token: getTokenSymbol(gift.token),
      expiry: new Date(parseInt(gift.expiry) * 1000).toISOString().split("T")[0],
      giftCode: giftIDs[gift.id.toLowerCase()] || "Loading...", // Use MongoDB giftID
    }));
  }, [giftsCreated, giftIDs]);

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
      {/* Gradient Blurs */}
      <div className="absolute top-0 left-0 w-64 h-64 inset-9 bg-[#9812C2] blur-[120px] opacity-100 z-0" />
      <div className="absolute bottom-32 right-0 w-64 inset-9 h-64 bg-[#9812C2] blur-[120px] opacity-100 z-0" />
      <div className="absolute bottom-0 left-1/3 w-48 inset-9 h-48 bg-[#9812C2] blur-[120px] opacity-100 z-0" />

      <Container className="relative z-10">
        <div className="flex justify-between items-start">
          <ProfileHeader />
        </div>

        <div className="flex gap-4 mt-6">
          <CardBox title="Total Gift" value={`$${totalGift}`} />
          <CardBox title="Claimed Gift" value={`${claimedPercentage}%`} />
          <CardBox title="Fee Paid" value={`$${feePaid}`} />
        </div>

        <h2 className="text-white font-semibold mt-10 mb-4">Created Gifts</h2>
        <BulkGiftTable data={bulkGiftData} />

        {/* New section for claimed gifts */}
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
                {claimedGifts.map((gift, idx) => (
                  <tr key={idx} className="border-t border-gray-700">
                    <td className="p-2">{giftIDs[gift.gift.id.toLowerCase()] || gift.gift.id.slice(0, 8)}</td>
                    <td className="p-2">{gift.gift.message}</td>
                    <td className="p-2">{parseFloat(ethers.formatEther(gift.amount))}</td>
                    <td className="p-2">{getTokenSymbol(gift.gift.token)}</td>
                    <td className="p-2">
                      {new Date(parseInt(gift.blockTimestamp) * 1000).toISOString().split("T")[0]}
                    </td>
                    <td className="p-2">{gift.transactionHash.slice(0, 8)}...</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* GiftCard section */}
        <div className="mt-10">
          <h2 className="text-white font-semibold mb-4">Your Gift Cards</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {userCards.map((card, idx) => (
              <div key={idx} className="relative">
                {idx === userCards.length - 1 && (
                  <div className="absolute inset-0 bg-[#9812C2] blur-[120px] opacity-100 z-0 rounded-xl" />
                )}
                <GiftCard card={card} />
              </div>
            ))}
          </div>
        </div>
      </Container>
    </div>
  );
}