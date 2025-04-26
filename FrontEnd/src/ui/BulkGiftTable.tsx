// src/ui/BulkGiftTable.tsx
import { Check, X, ChevronDown } from "lucide-react";
import { getTokenSymbol } from "../utils/tokenMapping";

type BulkGift = {
  code: string;
  status: string;
  amount: number;
  token: string;
  expiry: string;
  claimed: boolean;
};

interface BulkGiftTableProps {
  data: BulkGift[];
}

export const BulkGiftTable = ({ data }: BulkGiftTableProps) => {
  return (
    <div className="w-full mt-8 space-y-4">
      <h2 className="text-white font-semibold mb-4">Bulk Gift</h2>

      {data.length === 0 ? (
        <p className="text-white">No gifts found.</p>
      ) : (
        data.map((gift, i) => (
          <div
            key={i}
            className="bg-white/10 backdrop-blur-lg border border-white/10 shadow-xl p-4 rounded-2xl text-white grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-2 transition duration-300 hover:shadow-2xl"
          >
            <div>
              <p className="text-xs text-white/50 uppercase">Code</p>
              <p className="font-medium">{gift.code}</p>
            </div>
            <div>
              <p className="text-xs text-white/50 uppercase">Status</p>
              <p className="font-medium">{gift.status}</p>
            </div>
            <div>
              <p className="text-xs text-white/50 uppercase">Amount</p>
              <p className="font-medium">{gift.amount}</p>
            </div>
            <div>
              <p className="text-xs text-white/50 uppercase">Token</p>
              <p className="font-medium">{getTokenSymbol(gift.token)}</p>
            </div>
            <div>
              <p className="text-xs text-white/50 uppercase">Expiry</p>
              <p className="font-medium">{gift.expiry}</p>
            </div>
            <div>
              <p className="text-xs text-white/50 uppercase">Claimed</p>
              <p className="font-medium flex items-center">
                {gift.claimed ? (
                  <Check className="w-4 h-4 text-green-400 mr-1" />
                ) : (
                  <X className="w-4 h-4 text-red-400 mr-1" />
                )}
                {gift.claimed ? "Yes" : "No"}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/50 uppercase">Action</p>
              <ChevronDown className="w-4 h-4 text-white/70" />
            </div>
          </div>
        ))
      )}
    </div>
  );
};