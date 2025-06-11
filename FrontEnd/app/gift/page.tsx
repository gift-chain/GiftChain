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
import { maxUint64 } from "viem"
import CreateGiftCard from "../create/page"
import ValidateGiftCard from "../validateGift/page"
import ClaimGiftCard from "../claim/page"
import ReclaimGift from "../reclaimGift/page"
import CreateBulkCard from "../bulkCreate/page"

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

export default function GiftCard() {
    const [btn, setBtn] = useState("0")

    const [selectedDesign, setSelectedDesign] = useState(0)
    // const [isCreating, setIsCreating] = useState(false)

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
    const [checkingAllowance, setCheckingAllowance] = useState(false);
    const [] = useState()

    const cardDesigns = [
        "/placeholder.svg?height=200&width=320",
        "/placeholder.svg?height=200&width=320",
        "/placeholder.svg?height=200&width=320",
        "/placeholder.svg?height=200&width=320",
    ]

    // Relayer address (from creategift.js)
    const RELAYER_ADDRESS = '0xA07139110776DF9621546441fc0a5417B8E945DF';

    // Token map (Sepolia testnet addresses)
    const tokenMap: Record<string, string> = {
        USDT: '0xb1B83B96402978F212af2415b1BffAad0D2aF1bb', // Sepolia USDT
        USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia USDC (replace with actual)
        DAI: '0x68194a729C2450ad26072b3D33ADaCbcef39D574', // Sepolia DAI (replace with actual)
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

            console.log("Got here.")
            // Get decimals
            // const decimals = tokenDecimals[form.token] || 6;
            // const decimals = await tokenContract.decimals();
            const decimals = await publicClient.readContract({
                address: tokenAddress as `0x${string}`,
                abi: ERC20_ABI,
                functionName: "decimals",
            })
            console.log(decimals)
            const amountBN = parseUnits(amount, BigInt(decimals!.toString()));

            // Check allowance
            // const allowance = await tokenContract.allowance(address, RELAYER_ADDRESS);
            const allowance = await publicClient.readContract({
                address: tokenAddress as `0x${string}`,
                abi: ERC20_ABI,
                functionName: "allowance",
                args: [signer.address, RELAYER_ADDRESS]
            });
            console.log("Allowance => ", allowance)
            console.log("Got here..")
            if (BigInt(allowance!.toString()) < BigInt(amountBN.toString())) {
                setIsApproving(true);
                // Approve the exact amount
                const hash = await walletClient.writeContract({
                    address: tokenAddress as `0x${string}`,
                    abi: ERC20_ABI,
                    functionName: 'approve',
                    args: [RELAYER_ADDRESS as `0x${string}`, maxUint64],
                });
                console.log(hash)
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
            setCheckingAllowance(true)
            const isApproved = await checkAndApprove(tokenAddress, form.amount);
            console.log("Got here...")
            setCheckingAllowance(false)
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
            <Button variant="ghost" className="mb-6 gap-2" onClick={() => router.push("/dashboard")}>
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
            </Button>

            {/* switching button  */}
            <div className="grid place-content-center -translate-x-1 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-3">

                <Button className={`${btn == "0" ? "bg-[#289a67]" : "bg-transparent border-2 border-[#289a67]"} hover:bg-[#289a67] shadow-lg gap-2`} size="default" onClick={() => setBtn("0")}>
                    <Zap className="h-5 w-5" />
                    Create
                </Button>

                {/* <Button className={`${btn == "1" ? "bg-[#289a67]" : "bg-transparent border-2 border-[#289a67]"} hover:bg-[#289a67] shadow-lg gap-2`} size="default" onClick={() => setBtn("1")}>
                    <Zap className="h-5 w-5" />
                    Validate
                </Button> */}

                <Button className={`${btn == "2" ? "bg-[#289a67]" : "bg-transparent border-2 border-[#289a67]"} hover:bg-[#289a67] shadow-lg gap-2`} size="default" onClick={() => setBtn("2")}>
                    <Zap className="h-5 w-5" />
                    Claim
                </Button>
                <Button className={`${btn == "3" ? "bg-[#289a67]" : "bg-transparent border-2 border-[#289a67]"} hover:bg-[#289a67] shadow-lg gap-2`} size="default" onClick={() => setBtn("3")}>
                    <Zap className="h-5 w-5" />
                    Reclaim
                </Button>

                <Button className={`${btn == "4" ? "bg-[#289a67]" : "bg-transparent border-2 border-[#289a67]"} hover:bg-[#289a67] shadow-lg gap-2`} size="default" onClick={() => setBtn("4")}>
                    <Zap className="h-5 w-5" />
                    Bulk Create
                </Button>
            </div>

            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight mb-2 gradient-text">
                    {btn == "0" && "Create Gift"}
                    {btn == "1" && "Validate Gift"}
                    {btn == "2" && "Claim Gift"}
                    {btn == "3" && "Reclaim Expired Gift"}
                    {btn == "4" && "Bulk Create Gift"}
                </h1>
                <p className="text-muted-foreground">
                    {btn == "0" && "Fill in the details below to create a new blockchain gift."}
                    {btn == "1" && "Fill in your details to validate your gift."}
                    {btn == "2" && "Fill in your details to claim your gift"}
                    {btn == "3" && "Fill in your expired details to reclaim your gift"}
                    {btn == "4" && "Fill in the details below to create bulk gift"}


                </p>
            </div>


            {/* main content  */}
            <div className="">

                {btn == "0" && <CreateGiftCard />}
                {btn == "1" && <ValidateGiftCard />}
                {btn == "2" && <ClaimGiftCard />}
                {btn == "3" && <ReclaimGift />}
                {btn == "4" && <CreateBulkCard/>}

            </div>
        </div>
    )
}
