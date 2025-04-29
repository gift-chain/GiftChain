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
import WalletConnect from "@/components/wallet-connect"
// skjnlgk
// import { useNavigate } from 'react-router-dom';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import axios from 'axios';
import { format } from 'date-fns';
import { Contract, BrowserProvider, parseUnits, MaxUint256 } from 'ethers';
// import giftcard from '../assets/giftcard.png';
// import { GiftCard } from '../ui/GiftCard';
// import Container from '../ui/Container';

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
  // const [isConnected, setIsConnected] = useState(false)
  // const [walletAddress, setWalletAddress] = useState("")
  // const [amount, setAmount] = useState("")
  // const [currency, setCurrency] = useState("ETH")
  // const [recipient, setRecipient] = useState("")
  // const [message, setMessage] = useState("")
  const [selectedDesign, setSelectedDesign] = useState(0)
  // const [isCreating, setIsCreating] = useState(false)

  const router = useRouter()
  const { toast } = useToast()

  const cardDesigns = [
    "/placeholder.svg?height=200&width=320",
    "/placeholder.svg?height=200&width=320",
    "/placeholder.svg?height=200&width=320",
    "/placeholder.svg?height=200&width=320",
  ]

  // const handleConnect = (address: string) => {
  //   setIsConnected(true)
  //   setWalletAddress(address)
  // }

  // const handleCreateGiftCard = async () => {
  //   if (!amount) {
  //     toast({
  //       title: "Missing amount",
  //       description: "Please enter an amount for the gift card",
  //       variant: "destructive",
  //     })
  //     return
  //   }

  //   setIsCreating(true)

  //   try {
  //     // Simulate API call
  //     await new Promise((resolve) => setTimeout(resolve, 1500))

  //     toast({
  //       title: "Gift Card Created",
  //       description: "Your gift card has been created successfully!",
  //     })

  //     router.push("/dashboard")
  //   } catch (error) {
  //     toast({
  //       title: "Error",
  //       description: "Failed to create gift card. Please try again.",
  //       variant: "destructive",
  //     })
  //   } finally {
  //     setIsCreating(false)
  //   }
  // }

  // if (!isConnected) {
  //   return <WalletConnect onConnect={handleConnect} />
  // }

  // const navigate = useNavigate();
  const { address } = useAccount();
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

  // Relayer address (from creategift.js)
  const RELAYER_ADDRESS = '0xA07139110776DF9621546441fc0a5417B8E945DF';

  // Token map (Sepolia testnet addresses)
  const tokenMap: Record<string, string> = {
    USDT: '0xb1B83B96402978F212af2415b1BffAad0D2aF1bb', // Sepolia USDT
    USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia USDC (replace with actual)
    DAI: '0x68194a729C2450ad26072b3D33ADaCbcef39D574', // Sepolia DAI (replace with actual)
  };

  // Token decimals map (assumes 6 for USDT/USDC/DAI)
  const tokenDecimals: Record<string, number> = {
    USDT: 18,
    USDC: 6,
    DAI: 18,
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
    if (form.message.length < 3 || form.message.length > 50) {
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
      console.log("loading...", isLoading)
      console.log("form => ", form)
      const expiryTimestamp = Math.floor(new Date(form.expiry).getTime() / 1000);
      const response = await axios.post('http://localhost:3000/api/create-gift', {
        token: tokenAddress,
        amount: form.amount,
        expiry: expiryTimestamp,
        message: form.message,
        creator: address,
      });
      console.log(response)
      toast({
        title: "Gift Card Created",
        description: "Your gift card has been created successfully!",
      })
      if (response.data.success) {
        setGift({ ...response.data.details, token: form.token });
        setForm({ token: 'USDT', amount: '', expiry: '', message: '' });
        // Auto-trigger download
        const link = document.createElement('a');
        link.href = `http://localhost:3000${response.data.details.downloadUrl}`;
        link.download = `${response.data.details.giftID}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
      <Button variant="ghost" className="mb-6 gap-2" onClick={() => router.push("/dashboard")}>
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2 gradient-text">Create Gift Card</h1>
        <p className="text-muted-foreground">Fill in the details below to create a new blockchain gift card.</p>
      </div>

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
                  value={form.amount}
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
                    className={`border-2 rounded-md p-1 cursor-pointer transition-all ${
                      selectedDesign === index ? "border-primary glow-border" : "border-muted hover:border-primary/50"
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
              {isApproving ? 'Approving Token...' : isLoading ? 'Creating Gift...' : 'Create Gift Card'}
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
                    {/* {format(new Date(Number(form.expiry) * 1000), "yyyy-MM-dd'T'HH:mm")} */}
                    {form.expiry.replace("T", " ")}
                  </span>
                </div>
                {/* {recipient && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">To:</span>
                    <span className="font-mono text-sm address-tag">
                      {recipient.substring(0, 6)}...{recipient.substring(recipient.length - 4)}
                    </span>
                  </div>
                )} */}
              </div>
            </CardContent>
          </Card>

          {/* <div className="mt-6 space-y-4 glass p-4 rounded-lg border border-primary/30">
            <h3 className="text-lg font-medium gradient-text">How it works</h3>
            <div className="space-y-2">
              <p className="text-sm flex items-center gap-2">
                <span className="bg-primary/20 p-1 rounded-full flex items-center justify-center w-6 h-6 text-xs">
                  1
                </span>
                <span>
                  <span className="font-medium">Create:</span> Fill in the details and create your gift card.
                </span>
              </p>
              <p className="text-sm flex items-center gap-2">
                <span className="bg-primary/20 p-1 rounded-full flex items-center justify-center w-6 h-6 text-xs">
                  2
                </span>
                <span>
                  <span className="font-medium">Share:</span> Send the gift card link to the recipient.
                </span>
              </p>
              <p className="text-sm flex items-center gap-2">
                <span className="bg-primary/20 p-1 rounded-full flex items-center justify-center w-6 h-6 text-xs">
                  3
                </span>
                <span>
                  <span className="font-medium">Claim:</span> The recipient connects their wallet and claims the gift
                  card.
                </span>
              </p>
              <p className="text-sm flex items-center gap-2">
                <span className="bg-primary/20 p-1 rounded-full flex items-center justify-center w-6 h-6 text-xs">
                  4
                </span>
                <span>
                  <span className="font-medium">Reclaim:</span> If unclaimed, you can reclaim the gift card back to your
                  wallet.
                </span>
              </p>
            </div>
          </div> */}
        </div>
      </div>
    </div>
  )
}
