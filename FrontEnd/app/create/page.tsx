"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Zap } from "lucide-react"

import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import axios from 'axios';
import { format } from 'date-fns';
import { Contract, BrowserProvider, parseUnits } from 'ethers';
// ERC-20 ABI for allowance, approve, decimals
import ERC20_ABI from "@/abi/ERC20_ABI.json";

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

declare global {
  interface Window {
    ethereum?: any
  }
}

export default function CreateGiftCard() {
  const [selectedDesign, setSelectedDesign] = useState(0)
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined)

  const router = useRouter()
  const { toast } = useToast()
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [form, setForm] = useState<GiftForm>({
    token: 'USDT',
    amount: '',
    expiry: '',
    message: '',
  });
  const [gift, setGift] = useState<GiftResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);


  const cardDesigns = [
    "/placeholder.svg?height=200&width=320",
    "/placeholder.svg?height=200&width=320",
    "/placeholder.svg?height=200&width=320",
    "/placeholder.svg?height=200&width=320",
  ]

  const RELAYER_ADDRESS = '0xA07139110776DF9621546441fc0a5417B8E945DF';

  // Token map (Sepolia testnet addresses)
  const tokenMap: Record<string, string> = {
    USDT: '0xb1B83B96402978F212af2415b1BffAad0D2aF1bb', // Sepolia USDT
    USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia USDC (replace with actual)
    DAI: '0xA0c61934a9bF661c0f41db06538e6674CDccFFf2', // Sepolia DAI (replace with actual)
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
      const tokenContractDetails = {
        address: tokenAddress,
        abi: ERC20_ABI,
      }

      const decimals = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "decimals",
      })
      console.log(decimals)
      const amountBN = parseUnits(amount, BigInt(decimals!.toString()));

      const tx = await tokenContract.approve(RELAYER_ADDRESS, amountBN);
      console.log("Transaction => ", tx)
      
      // Wait for confirmation
      const receipt = await tx.wait();
      console.log("Transaction receipt => ", receipt)

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
    if (form.message.length < 3 || form.message.length > 50) {
      setError('Message must be between 3 and 50 characters.');
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
      console.log(tokenAddress)
      setIsApproving(true)
      const isApproved = await checkAndApprove(tokenAddress, form.amount);

      setIsApproving(false)
      if (!isApproved) return;

      // Call backend
      setIsLoading(true);
      console.log("loading...", isLoading)
      console.log("form => ", form)
      const expiryTimestamp = Math.floor(new Date(form.expiry).getTime() / 1000);
      const response = await axios.post('https://gift-chain-w3lp.vercel.app/api/create-gift', {
        token: tokenAddress,
        amount: form.amount,
        expiry: expiryTimestamp,
        message: form.message,
        creator: address,
      });
      console.log(response)
      toast({
        title: "Gift Created",
        description: "Your gift has been created successfully",
      })
      if (response.data.success) {
        setGift({ ...response.data.details, token: form.token });
        setForm({ token: 'USDT', amount: '', expiry: '', message: '' });
        // navigate('/dashboard');
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
    <div className="container py-8 max-w-3xl hexagon-bg">
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="flex gap-2">
                <Input
                  id="amount"
                  type="number"
                  name="amount"
                  value={form.amount.trim()}
                  onChange={handleChange}
                  placeholder="Enter amount"
                  step="0.01"
                  min="0"
                  className="bg-background/40 border-primary/30"
                />
                <select
                  className="bg-background/40 border border-primary/30 rounded-md px-3 py-2 w-24"
                  name="token"
                  value={form.token}
                  onChange={handleChange}
                >
                  {tokens.map((token) => (
                    <option key={token} value={token} className="bg-[#101339] text-white">
                      {token}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Expiration Input */}
            <div className="space-y-2">
              <Label htmlFor="expiry">Set Expiration</Label>
              <Input
                type="datetime-local"
                name="expiry"
                value={form.expiry}
                onChange={handleChange}
                min={minDateTime}
                className="bg-background/40 border-primary/30 font-mono justify-between"
              />
            </div>

            {/* Write a message */}
            <div className="space-y-2">
              <Label htmlFor="message">Message (3-50 Characters)</Label>
              <Textarea
                id="message"
                name="message"
                placeholder="Drop a short message"
                value={form.message}
                onChange={handleChange}
                className="min-h-[100px] bg-background/40 border-primary/30"
              />
            </div>

            <div className="space-y-2">
              <Label>Card Design</Label>
              <div className="grid grid-cols-2 gap-3">
                {cardDesigns.map((design, index) => (
                  <div
                    key={index}
                    className={`border-2 rounded-md p-1 cursor-pointer transition-all ${selectedDesign === index ? "border-primary glow-border" : "border-muted hover:border-primary/50"
                      }`}
                    onClick={() => setSelectedDesign(index)}
                  >
                    <div className="relative overflow-hidden rounded">
                      <div className="absolute inset-0 gift-card-bg gift-card-pattern"></div>
                      <img
                        src={design || "/placeholder.svg"}
                        alt={`Card design ${index + 1}`}
                        className="w-full h-auto relative z-10 opacity-80"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8">
            <Button className="w-full gap-2 glow-border" size="lg" onClick={handleSubmit} disabled={isLoading || isApproving || !address}>
              <Zap className="h-5 w-5" />
              {isApproving ? 'Approving Token...' : isLoading ? 'Creating Gift... Wait a moment' : 'Create Gift Card'}
            </Button>
          </div>

          {/* Error Message */}
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        </div>

        <div>
          <h3 className="text-lg font-medium mb-4 gradient-text">Preview</h3>
          <Card className="overflow-hidden border-0 crypto-card glow-card">
            <CardContent className="p-0">
              <div className="relative">
                <div className="absolute inset-0 gift-card-bg gift-card-pattern"></div>
                <img
                  src={cardDesigns[selectedDesign] || "/placeholder.svg"}
                  alt="Gift card preview"
                  className="w-full h-auto relative z-10 opacity-80"
                />
                <div className="absolute inset-0 flex flex-col justify-center items-center text-white p-6 z-20">
                  <div className="text-center">
                    <div className="text-3xl font-bold mb-2 glow-text">
                      {form.amount || "0.0"} {form.token}
                    </div>
                    {form.message && <p className="text-sm italic">"{form.message}"</p>}
                  </div>
                </div>
              </div>

              <div className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Expiry:</span>
                  <span className="font-mono text-sm address-tag">
                    {form.expiry.replace("T", ", ")}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
