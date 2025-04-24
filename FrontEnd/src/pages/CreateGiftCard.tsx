import { useState } from "react";
import { useAccount } from "wagmi";
import { GiftCard } from "../ui/GiftCard";
import Container from "../ui/Container";
import axios from "axios";
import { format } from "date-fns";

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
}

export default function CreateGiftCard() {
  const { address } = useAccount();
  const [form, setForm] = useState<GiftForm>({
    token: "USDT",
    amount: "",
    expiry: "",
    message: "",
  });
  const [gift, setGift] = useState<GiftResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Map token symbols to addresses (replace with actual addresses for your network)
  const tokenMap: Record<string, string> = {
    USDT: "0x9092f9D0Ba4d2a027Cf7B6dD761C51cF893f2915", // Example: USDT on Ethereum mainnet
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // Example: USDC on Ethereum mainnet
    DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",  // Example: DAI on Ethereum mainnet
  };

  const tokens = Object.keys(tokenMap);
  const minDate = format(new Date(), "yyyy-MM-dd");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) {
      setError("Please connect your wallet to create a gift.");
      return;
    }
    if (!form.amount || parseFloat(form.amount) <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    if (!form.expiry) {
      setError("Please select an expiry date.");
      return;
    }
    if (form.message.length < 3 || form.message.length > 50) {
      setError("Message must be between 3 and 50 characters.");
      return;
    }
    if (!tokenMap[form.token]) {
      setError("Selected token is not supported.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const expiryTimestamp = Math.floor(new Date(form.expiry).getTime() / 1000);
      const response = await axios.post("http://localhost:3000/api/createGift", {
        token: tokenMap[form.token], // Send token address
        amount: form.amount,
        expiry: expiryTimestamp,
        message: form.message,
        creator: address,
      });

      if (response.data.success) {
        setGift({ ...response.data.details, token: form.token }); // Store symbol for display
        setForm({ token: "USDT", amount: "", expiry: "", message: "" });
      } else {
        setError(response.data.error || "Failed to create gift.");
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || "An error occurred.";
      if (errorMessage.includes("Invalid token address")) {
        setError("The selected token is not supported on this network.");
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#1F1668] overflow-x-hidden">
      <Container className="py-10 lg:py-20 px-4 lg:px-4">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            Create a Gift Card
          </h2>
          <form
            onSubmit={handleSubmit}
            className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border border-white/10"
          >
            <div className="mb-6">
              <label className="block text-white/70 text-sm mb-2">Token</label>
              <select
                name="token"
                value={form.token}
                onChange={handleChange}
                className="w-full bg-[#2A1F7A] text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#9812C2] transition"
              >
                {tokens.map((token) => (
                  <option key={token} value={token}>
                    {token}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-6">
              <label className="block text-white/70 text-sm mb-2">Amount</label>
              <input
                type="number"
                name="amount"
                value={form.amount}
                onChange={handleChange}
                placeholder="Enter amount (e.g., 100)"
                className="w-full bg-[#2A1F7A] text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#9812C2] transition"
                step="0.01"
                min="0"
              />
            </div>
            <div className="mb-6">
              <label className="block text-white/70 text-sm mb-2">Expiry Date</label>
              <input
                type="date"
                name="expiry"
                value={form.expiry}
                onChange={handleChange}
                min={minDate}
                className="w-full bg-[#2A1F7A] text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#9812C2] transition"
              />
            </div>
            <div className="mb-6">
              <label className="block text-white/70 text-sm mb-2">Message</label>
              <textarea
                name="message"
                value={form.message}
                onChange={handleChange}
                placeholder="Enter a personal message (3-50 characters)"
                className="w-full bg-[#2A1F7A] text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#9812C2] transition resize-none"
                rows={4}
              />
            </div>
            {error && (
              <p className="text-red-400 text-sm mb-4">{error}</p>
            )}
            <button
              type="submit"
              disabled={isLoading || !address}
              className="w-full bg-[#9812C2] hover:bg-[#B315E6] text-white font-semibold py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Creating Gift..." : "Create Gift Card"}
            </button>
          </form>

          {gift && (
            <div className="mt-10">
              <h3 className="text-2xl font-semibold text-white mb-6 text-center">
                Your Gift Card
              </h3>
              <div className="flex justify-center">
                <GiftCard
                  card={{
                    cardName: `Gift Card #${gift.giftID.slice(0, 4)}`,
                    status: "Pending",
                    amount: parseFloat(gift.amount),
                    token: gift.token, // Use symbol for display
                    expiry: format(new Date(gift.expiry * 1000), "yyyy-MM-dd"),
                    giftCode: gift.giftID,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}