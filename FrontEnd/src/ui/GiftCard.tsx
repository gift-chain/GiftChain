// src/ui/GiftCard.tsx
import React, { useState } from "react";
import { Copy } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

type GiftCard = {
  cardName: string;
  status: "NONE" | "PENDING" | "CLAIMED" | "RECLAIMED" | "EXPIRED";
  amount: number;
  token: string;
  expiry: string; // ISO date string (e.g., "2025-04-30T12:00:00Z")
  giftCode: string; // Raw code from MongoDB
};

interface GiftCardProps {
  card: GiftCard;
  userAddress?: string; // Connected wallet address
}

export const GiftCard = ({ card, userAddress }: GiftCardProps) => {
  const { cardName, status, amount, token, expiry, giftCode } = card;
  const [copied, setCopied] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const navigate = useNavigate();

  // Check if card is expired
  const isExpired = new Date(expiry) < new Date();
  // Prioritize RECLAIMED status, then check expiry, then use status
  const displayStatus = status === "RECLAIMED" ? "RECLAIMED" : isExpired ? "EXPIRED" : status;
  // Assume connected user is the creator (since giftsCreated is queried for them)
  const isCreator = !!userAddress;

  const statusColor =
    displayStatus === "CLAIMED"
      ? "bg-blue-300/20 text-blue-300"
      : displayStatus === "PENDING"
      ? "bg-yellow-300/20 text-yellow-300"
      : displayStatus === "RECLAIMED"
      ? "bg-purple-300/20 text-purple-300"
      : displayStatus === "EXPIRED"
      ? "bg-red-400/20 text-red-300"
      : "bg-gray-300/20 text-gray-300"; // For NONE

  const iconSrc = `/icons/${token.toLowerCase()}.svg`;

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = `http://localhost:3000/api/download/giftcard_${giftCode}.png`;
    link.download = `${giftCode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsFlipped(false);
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(giftCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleReclaim = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Navigate to ReclaimGift page with giftCode as query parameter
    navigate(`/reclaimGift?code=${encodeURIComponent(giftCode)}`);
  };

  // Format expiry date and time (e.g., "Apr 27, 2025 8:35 PM")
  const expiryDateTime = format(new Date(expiry), "MMM d, yyyy h:mm a");

  return (
    <div
      className="w-full max-w-sm cursor-pointer perspective"
      onClick={handleFlip}
    >
      <div
        className={`relative w-full h-[300px] transition-transform duration-500 transform-style-preserve-3d ${
          isFlipped ? "rotate-y-180" : ""
        }`}
      >
        {/* Front Face */}
        <div className="absolute w-full h-full backface-hidden bg-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-2xl text-white border border-white/10">
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-[#9812C2] rounded-full opacity-20 blur-2xl z-0" />
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#B315E6] rounded-full opacity-20 blur-2xl z-0" />

          <div className="relative z-10 flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold">{cardName}</h3>
              <span
                className={`mt-1 inline-block text-xs px-3 py-1 rounded-full ${statusColor}`}
              >
                {displayStatus}
              </span>
            </div>
            <img
              src="/chip-icon.svg"
              alt="Card Chip"
              className="w-10 h-10 opacity-60"
            />
          </div>

          <p className="text-xs uppercase text-white/70 mb-1">Gift Balance</p>
          <div className="flex items-center gap-2 mb-6">
            <img
              src={iconSrc}
              alt={token}
              className="w-6 h-6"
              onError={(e) =>
                (e.currentTarget.src = "/icons/default-token.svg")
              }
            />
            <p className="text-3xl font-bold tracking-wider">
              {amount} {token}
            </p>
          </div>

          <div className="flex justify-between items-center text-xl text-white/60 mb-1">
            <span>Gift Code:</span>
            <div className="flex items-center gap-2">
              <span>{giftCode}</span>
              <button
                onClick={handleCopy}
                className="focus:outline-none"
                aria-label="Copy gift code"
              >
                {copied ? (
                  <span className="text-green-400 text-sm animate-pulse">
                    Copied!
                  </span>
                ) : (
                  <Copy size={18} className="text-white/70" />
                )}
              </button>
            </div>
          </div>

          <div className="flex justify-between text-[15px] text-white/60 mb-4">
            <span>{isExpired ? "Expired" : "Available"}:</span>
            <span>{expiryDateTime}</span>
          </div>

          {isExpired && isCreator && status !== "RECLAIMED" && (
            <button
              onClick={handleReclaim}
              className="mt-2 w-full py-2 rounded-lg bg-gradient-to-r from-[#9812C2] to-[#B315E6] text-sm font-semibold text-white shadow-md hover:shadow-lg transition hover:scale-105"
            >
              Reclaim Now
            </button>
          )}
        </div>

        {/* Back Face */}
        <div className="absolute w-full h-full backface-hidden bg-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-2xl text-white border border-white/10 rotate-y-180">
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-[#9812C2] rounded-full opacity-20 blur-2xl z-0" />
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#B315E6] rounded-full opacity-20 blur-2xl z-0" />

          <div className="relative z-10 flex flex-col items-center justify-center h-full">
            <h3 className="text-lg font-semibold mb-4">Gift Card</h3>
            <p className="text-sm text-white/70 mb-6">
              Download your gift card image
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDownload();
              }}
              className="w-full max-w-xs py-2 rounded-lg bg-gradient-to-r from-[#9812C2] to-[#B315E6] text-sm font-semibold text-white shadow-md hover:shadow-lg transition hover:scale-105"
            >
              Download Gift Card
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};