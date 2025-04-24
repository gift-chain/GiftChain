type GiftCard = {
    cardName: string;
    status: "Claimed" | "Pending" | "Expired";
    amount: number;
    token: string;
    expiry: string;
    giftCode: string;
  };
  
  interface GiftCardProps {
    card: GiftCard;
  }
  
  export const GiftCard = ({ card }: GiftCardProps) => {
    const { cardName, status, amount, token, expiry, giftCode } = card;
  
    const statusColor =
      status === "Claimed"
        ? "bg-blue-300/20 text-blue-300"
        : status === "Pending"
        ? "bg-yellow-300/20 text-yellow-300"
        : "bg-red-400/20 text-red-300";
  
    const iconSrc = `/icons/${token.toLowerCase()}.svg`;
  
    return (
      <div className="w-full max-w-sm bg-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-2xl relative overflow-hidden text-white border border-white/10">
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-[#9812C2] rounded-full opacity-20 blur-2xl z-0" />
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#B315E6] rounded-full opacity-20 blur-2xl z-0" />
  
        <div className="relative z-10 flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">{cardName}</h3>
            <span
              className={`mt-1 inline-block text-xs px-3 py-1 rounded-full ${statusColor}`}
            >
              {status}
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
            onError={(e) => (e.currentTarget.src = "/icons/default-token.svg")}
          />
          <p className="text-3xl font-bold tracking-wider text-white">
            {amount} {token}
          </p>
        </div>
  
        <div className="flex justify-between text-xl text-white/60 mb-1">
          <span>Gift Code:</span>
          <span>{giftCode}</span>
        </div>
  
        <div className="flex justify-between text-[15px] text-white/60 mb-4">
          <span>Expires:</span>
          <span>{expiry}</span>
        </div>
  
        {status === "Pending" && (
          <button className="mt-2 w-full py-2 rounded-lg bg-gradient-to-r from-[#9812C2] to-[#B315E6] text-sm font-semibold text-white shadow-md hover:shadow-lg transition hover:scale-105">
            Claim Now
          </button>
        )}
        {status === "Expired" && (
          <button className="mt-2 w-full py-2 rounded-lg bg-gradient-to-r from-[#9812C2] to-[#B315E6] text-sm font-semibold text-white shadow-md hover:shadow-lg transition hover:scale-105">
            Reclaim Now
          </button>
        )}
      </div>
    );
  };