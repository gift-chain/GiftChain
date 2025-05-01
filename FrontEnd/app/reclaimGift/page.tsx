"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Wallet,
  Copy,
  ExternalLink,
  Clock,
  Info,
  Gift
} from "lucide-react";
import { ethers } from "ethers";
import GiftChainABI from "../../app/abi/GiftChain.json";
import erc20ABI from "../../app/abi/erc20ABI.json";

const CONTRACT_ADDRESS = "0x4dbdd0111E8Dd73744F1d9A60e56129009eEE473";
const PROVIDER_URL = "https://eth-sepolia.g.alchemy.com/v2/7Ehr_350KwRXw2n30OoeevZUOFu12XYX";

enum GiftStatus {
  NONE = 0,
  PENDING = 1,
  SUCCESSFUL = 2,
  RECLAIMED = 3,
}

interface ValidationErrors {
  code?: string;
}

interface GiftDetails {
  isValid: boolean;
  status: GiftStatus;
  token: string;
  tokenAddress: string;
  amount: string;
  message: string;
  expiry: number;
  timeCreated: number;
  creator: string;
  errorMessage?: string;
}

export default function ReclaimGift() {
  const [code, setCode] = useState<string>("");
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [giftDetails, setGiftDetails] = useState<GiftDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [txSuccess, setTxSuccess] = useState<boolean>(false);
  const [txHash, setTxHash] = useState<string>("");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [showInfoTooltip, setShowInfoTooltip] = useState<boolean>(false);
  const router = useRouter();
  const { toast } = useToast();

  // Initialize read-only provider and contract
  const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, GiftChainABI, provider);

  // Check for existing wallet connection on page load
  useEffect(() => {
    const checkWalletConnection = async () => {
      if (typeof window.ethereum !== "undefined") {
        try {
          // Use eth_accounts to check if MetaMask is already connected
          const accounts = await window.ethereum.request({ method: "eth_accounts" });
          if (accounts.length > 0) {
            setWalletAddress(accounts[0]);
          }
        } catch (error: any) {
          console.error("Error checking wallet connection:", error);
          toast({
            title: "Error",
            description: `Failed to check wallet connection: ${error.message || "Unknown error"}`,
            variant: "destructive",
          });
        }
      }
    };

    checkWalletConnection();
  }, [toast]);

  // Connect wallet if not already connected
  const connectWallet = async () => {
    if (typeof window.ethereum === "undefined") {
      toast({
        title: "Error",
        description: "Please install MetaMask to connect your wallet.",
        variant: "destructive",
      });
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      setWalletAddress(accounts[0]);
      toast({
        title: "Success",
        description: "Wallet connected successfully!",
      });
    } catch (error: any) {
      console.error("Error connecting wallet:", error);
      toast({
        title: "Error",
        description: `Failed to connect wallet: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
    }
  };

  const validateGift = async (rawCode: string): Promise<GiftDetails> => {
    try {
      console.log("Validating gift code:", rawCode);
      const normalizedCode = rawCode.toLowerCase();
      const codeHash = ethers.keccak256(ethers.toUtf8Bytes(normalizedCode));
      console.log("Computed codeHash:", codeHash);

      const gift = await contract.gifts(codeHash);
      console.log("Gift Data:", gift);

      if (gift.amount == 0) {
        return {
          isValid: false,
          status: GiftStatus.NONE,
          token: "",
          tokenAddress: "",
          amount: "",
          message: "",
          expiry: 0,
          timeCreated: 0,
          creator: "",
          errorMessage: "Gift card not found. Please check your code.",
        };
      }

      const status = Number(gift.status);
      const erc20 = new ethers.Contract(gift.token, erc20ABI, provider);
      const tokenSymbol = await erc20.symbol();
      const tokenDecimals = await erc20.decimals();
      const formattedAmount = ethers.formatUnits(gift.amount, tokenDecimals);

      const details: GiftDetails = {
        isValid: true,
        status,
        token: tokenSymbol,
        tokenAddress: gift.token,
        amount: formattedAmount,
        message: gift.message,
        expiry: Number(gift.expiry),
        timeCreated: Number(gift.timeCreated),
        creator: gift.creator,
      };
      console.log("Gift details:", details);
      return details;
    } catch (error: any) {
      console.error("Validation error:", error);
      let errorMessage = "An unknown error occurred.";
      if (error.reason || error.data?.message) {
        const reason = error.reason || error.data?.message;
        console.log("Error reason:", reason);
        if (reason.includes("GiftNotFound")) {
          errorMessage = "Gift card not found. Please check your code.";
        } else if (reason.includes("GiftAlreadyRedeemed") || reason.includes("SUCCESSFUL")) {
          errorMessage = "This gift card has already been redeemed and cannot be reclaimed.";
        } else if (reason.includes("GiftAlreadyReclaimed") || reason.includes("RECLAIMED")) {
          errorMessage = "This gift card has already been reclaimed.";
        } else if (reason.includes("InvalidGiftStatus")) {
          errorMessage = "This gift card is not pending or has an invalid status.";
        } else if (reason.includes("is not a function")) {
          errorMessage = "Contract error: validateGift function not found. Please check contract deployment.";
        } else {
          errorMessage = `Contract error: ${reason}`;
        }
      } else if (error.message) {
        console.log("Error message:", error.message);
        errorMessage = `Provider error: ${error.message}`;
      }

      return {
        isValid: false,
        status: GiftStatus.NONE,
        token: "",
        tokenAddress: "",
        amount: "",
        message: "",
        expiry: 0,
        timeCreated: 0,
        creator: "",
        errorMessage,
      };
    }
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusText = (status: GiftStatus): string => {
    switch (status) {
      case GiftStatus.PENDING:
        return "Pending";
      case GiftStatus.SUCCESSFUL:
        return "Redeemed";
      case GiftStatus.RECLAIMED:
        return "Reclaimed";
      default:
        return "Unknown";
    }
  };

  const getStatusColor = (status: GiftStatus): string => {
    switch (status) {
      case GiftStatus.PENDING:
        return "bg-blue-500";
      case GiftStatus.SUCCESSFUL:
        return "bg-green-500";
      case GiftStatus.RECLAIMED:
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const isReclaimable = (details: GiftDetails): boolean => {
    if (!details.isValid) {
      console.log("Not reclaimable: Invalid gift");
      return false;
    }
    if (details.status !== GiftStatus.PENDING) {
      console.log("Not reclaimable: Status not PENDING", { status: details.status });
      return false;
    }
    if (details.expiry * 1000 > Date.now()) {
      console.log("Not reclaimable: Not expired", { expiry: details.expiry, now: Math.floor(Date.now() / 1000) });
      return false;
    }
    if (!walletAddress) {
      console.log("Not reclaimable: No wallet address");
      return false;
    }
    const hashedAddress = ethers.keccak256(ethers.getAddress(walletAddress));
    if (details.creator.toLowerCase() !== hashedAddress.toLowerCase()) {
      console.log("Not reclaimable: Creator mismatch", { creator: details.creator, hashedAddress });
      return false;
    }
    console.log("Gift is reclaimable");
    return true;
  };

  const handleCodeValidation = async () => {
    if (!code.trim() || code.length < 6) {
      setErrors({ code: "Gift card code is required and must be at least 6 characters" });
      toast({
        title: "Error",
        description: "Gift card code is required and must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const result = await validateGift(code);
      setLoading(false);
      setGiftDetails(result);
      setIsModalOpen(true);

      if (!result.isValid) {
        setErrors({ code: result.errorMessage });
        toast({
          title: "Error",
          description: result.errorMessage,
          variant: "destructive",
        });
      } else {
        setErrors({ code: undefined });
        toast({
          title: "Success",
          description: "Gift card validated successfully!",
        });
      }
    } catch (error: any) {
      setLoading(false);
      console.error("Unexpected error validating code:", error);
      const errorMessage = `Unexpected error: ${error.message || "Unknown error"}`;
      setErrors({ code: errorMessage });
      setGiftDetails({
        isValid: false,
        status: GiftStatus.NONE,
        token: "",
        tokenAddress: "",
        amount: "",
        message: "",
        expiry: 0,
        timeCreated: 0,
        creator: "",
        errorMessage,
      });
      setIsModalOpen(true);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleReclaimGift = async () => {
    if (!giftDetails || !isReclaimable(giftDetails)) {
      toast({
        title: "Error",
        description: "Please validate a reclaimable gift first.",
        variant: "destructive",
      });
      return;
    }

    if (!walletAddress || typeof window.ethereum === "undefined") {
      toast({
        title: "Error",
        description: "Please connect your wallet to reclaim the gift.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const normalizedCode = code.toLowerCase();
      const codeHash = ethers.keccak256(ethers.toUtf8Bytes(normalizedCode));
      console.log("Reclaiming gift with codeHash:", codeHash);

      // Re-validate gift state before reclaiming
      const preValidation = await validateGift(normalizedCode);
      if (!isReclaimable(preValidation)) {
        throw new Error("Gift is no longer reclaimable. Please re-validate.");
      }

      // Create a signer using MetaMask
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contractWithSigner = new ethers.Contract(CONTRACT_ADDRESS, GiftChainABI, signer);

      // Estimate gas
      const gasEstimate = await contractWithSigner.reclaimGift.estimateGas(codeHash);
      console.log("Gas estimate:", gasEstimate.toString());

      // Send the transaction
      const tx = await contractWithSigner.reclaimGift(codeHash, { gasLimit: gasEstimate });
      console.log("Transaction sent:", tx.hash);
      setTxHash(tx.hash);

      // Wait for the transaction to be mined
      const receipt = await tx.wait();
      console.log("Transaction receipt:", receipt);

      if (receipt.status === 0) {
        throw new Error("Transaction reverted for an unknown reason.");
      }

      setGiftDetails({
        ...giftDetails,
        status: GiftStatus.RECLAIMED,
        isValid: false,
      });
      setTxSuccess(true);
      toast({
        title: "Success",
        description: "Gift reclaimed successfully!",
      });
    } catch (error: any) {
      console.error("Error reclaiming gift:", error);
      let errorMessage = "Transaction failed. Please try again.";
      if (error.message?.includes("GiftNotFound")) {
        errorMessage = "Gift card not found.";
      } else if (error.message?.includes("GiftAlreadyRedeemed") || error.message?.includes("SUCCESSFUL")) {
        errorMessage = "This gift card has already been redeemed.";
      } else if (error.message?.includes("GiftAlreadyReclaimed") || error.message?.includes("RECLAIMED")) {
        errorMessage = "This gift card has already been reclaimed.";
      } else if (error.message?.includes("GiftNotExpired")) {
        errorMessage = "This gift card is not expired yet and cannot be reclaimed.";
      } else if (error.message?.includes("InvalidGiftStatus")) {
        errorMessage = "The gift is not in a PENDING state or has an invalid status.";
      } else if (error.message?.includes("NotCreator")) {
        errorMessage = "You are not the creator of this gift.";
      } else if (error.message?.includes("execution reverted")) {
        errorMessage = `Contract execution reverted: ${error.message || "Unknown reason"}`;
      } else {
        errorMessage = `Contract error: ${error.message || "Unknown error"}`;
      }
      setErrors({ code: errorMessage });
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Text copied to clipboard",
    });
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setGiftDetails(null);
    setTxSuccess(false);
    setTxHash("");
    setErrors({ code: undefined });
  };

  return (
    <div className="container px-4 py-8 max-w-md mx-auto hexagon-bg min-h-screen flex flex-col">
      {/* Top navigation */}
      {/* <nav className="mb-6 flex items-center justify-between">
        <Button
          variant="ghost"
          className="gap-2 hover:bg-primary/10 transition-all"
          onClick={() => router.push("/")}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back to Home</span>
        </Button>
        
        <div className="text-xs text-muted-foreground bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
          Sepolia Testnet
        </div>
      </nav> */}

      {/* Header with animated gradient */}
      {/* <div className="mb-8 text-center relative">
        <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 w-64 h-64 bg-gradient-to-br from-purple-600/30 to-blue-500/20 blur-3xl rounded-full opacity-50"></div>
        <div className="relative z-10">
          <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center border border-primary/30 shadow-lg shadow-primary/5">
            <Gift className="h-8 w-8 text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-3 gradient-text">
            Reclaim Expired Gift
          </h1>
          <p className="text-muted-foreground max-w-xs mx-auto">
            Enter your gift code to reclaim expired, unclaimed tokens that you previously created.
          </p>
        </div>
      </div> */}

      {/* Main card with glowing border effect */}
      <Card className="bg-black/40 backdrop-blur-xl border border-primary/20 shadow-xl shadow-purple-900/5 overflow-hidden relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-blue-500/5 opacity-50"></div>
        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-primary/5 to-transparent gift-shimmer"></div>

        <CardContent className="p-6 relative">
          {/* Info button with tooltip */}
          <div className="absolute top-4 right-4">
            <button
              className="text-muted-foreground hover:text-white transition-colors"
              onClick={() => setShowInfoTooltip(!showInfoTooltip)}
            >
              <Info className="h-5 w-5" />
            </button>

            {showInfoTooltip && (
              <div className="absolute right-0 top-6 w-64 p-3 bg-black/80 backdrop-blur-md rounded-md border border-primary/30 text-xs z-50 shadow-xl">
                <p className="mb-2">You can reclaim tokens from expired gift cards that:</p>
                <ul className="space-y-1 list-disc pl-4">
                  <li>You created originally</li>
                  <li>Have passed their expiration date</li>
                  <li>Haven't been redeemed by recipients</li>
                </ul>
                <button
                  className="mt-2 text-purple-400 hover:text-purple-300 text-xs"
                  onClick={() => setShowInfoTooltip(false)}
                >
                  Close
                </button>
              </div>
            )}
          </div>

          {/* Wallet Connection Status */}
          {/* <div className="mb-6">
            {walletAddress ? (
              <div className="flex items-center justify-center gap-2 bg-primary/10 p-2 rounded-lg border border-primary/20">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <p className="text-sm text-muted-foreground">
                  <span className="text-green-400">Connected:</span> {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
                </p>
                <button
                  className="ml-1 text-muted-foreground hover:text-white transition-colors"
                  onClick={() => copyToClipboard(walletAddress)}
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <Button
                size="lg"
                className="w-full gap-2 glow-border bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transition-all duration-300"
                onClick={connectWallet}
              >
                <Wallet className="h-5 w-5" />
                Connect Wallet
              </Button>
            )}
          </div> */}

          {/* Form to Input Gift Code */}
          <div className="space-y-4">
            <div className="glass p-4 rounded-lg border border-primary/30">
              <label className="block text-sm text-muted-foreground mb-2 font-medium">
                Gift Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.trim());
                  setGiftDetails(null);
                  setTxSuccess(false);
                  setTxHash("");
                  setErrors({ code: undefined });
                }}
                className="w-full bg-primary/10 text-white rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500 border border-primary/30 transition-all placeholder:text-gray-500"
                placeholder="Enter gift code (e.g., c2f1-eb68-edd1-89ba)"
              />
            </div>
            {errors.code && !isModalOpen && (
              <div className="text-red-400 p-2 bg-red-400/10 border border-red-400/20 rounded-md text-sm flex items-center gap-2">
                <XCircle className="h-4 w-4 flex-shrink-0" />
                <p>{errors.code}</p>
              </div>
            )}

            <Button
              size="lg"
              className="mt-2 w-full gap-2 glow-border text-small sm:text-base"
              onClick={handleCodeValidation}
              disabled={loading || !code.trim() || code.length < 6}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <span>Validating...</span>
                </div>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  Reclaim Gift Card
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <div className="text-center animate-pulse space-y-4">
          <div className="h-64 bg-primary/10 rounded"></div>
        </div>
      )}

      {/* Help text section */}
      <div className="mt-auto pt-6">
        <div className="text-center text-sm text-muted-foreground bg-primary/5 p-4 rounded-lg border border-primary/10">
          <p className="mb-2">Need help with your gift code?</p>
          <div className="flex justify-center gap-4">
            <button className="text-purple-400 hover:text-purple-300 transition-colors">FAQs</button>
            <span className="text-primary/30">|</span>
            <button className="text-purple-400 hover:text-purple-300 transition-colors">Support</button>
          </div>
        </div>
      </div>

      {/* Modal for Gift Details and Reclamation */}
      {giftDetails && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="glass border border-primary/30 max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="gradient-text flex items-center gap-2">
                {giftDetails.isValid ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                    Gift Card Details
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-400" />
                    Validation Error
                  </>
                )}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {giftDetails.errorMessage || "Check the details of the gift card below."}
              </DialogDescription>
            </DialogHeader>

            {/* Gift Card Details */}
            {giftDetails.isValid && (
              <div className="mt-4 space-y-6">
                {/* Visual Card Display */}
                <Card className="overflow-hidden border-0 crypto-card relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-blue-500/20 to-purple-600/20 opacity-50 gift-shimmer"></div>
                  <div className="absolute inset-0 border-2 border-primary/30 rounded-lg"></div>

                  <CardContent className="p-6 relative">
                    <div className="absolute top-4 right-4 text-xs px-2 py-1 rounded-full bg-black/50 border border-primary/30 flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(giftDetails.status)}`}></div>
                      <span>{getStatusText(giftDetails.status)}</span>
                    </div>

                    <div className="flex flex-col items-center justify-center h-full text-center space-y-2">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Gift Card</div>
                      <div className="text-4xl font-bold mb-2 gradient-text">
                        {giftDetails.amount} <span className="text-2xl">{giftDetails.token}</span>
                      </div>

                      {giftDetails.message && (
                        <div className="bg-black/30 backdrop-blur-sm p-3 rounded-lg border border-primary/20 max-w-xs">
                          <p className="italic text-sm">"{giftDetails.message}"</p>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3">
                        <Clock className="h-3 w-3" />
                        <span>
                          {giftDetails.expiry * 1000 > Date.now() ? "Expires" : "Expired"}: {formatDate(giftDetails.expiry)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Detailed Information */}
                <div className="space-y-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="text-sm text-muted-foreground mb-2 uppercase tracking-wider">Details</div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Amount:</span>
                      <span className="text-sm font-medium">
                        {giftDetails.amount} {giftDetails.token}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Token Address:</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xs bg-primary/10 px-2 py-1 rounded-md border border-primary/20">
                          {giftDetails.tokenAddress.substring(0, 6)}...
                          {giftDetails.tokenAddress.substring(giftDetails.tokenAddress.length - 4)}
                        </span>
                        <button
                          className="text-muted-foreground hover:text-white transition-colors"
                          onClick={() => copyToClipboard(giftDetails.tokenAddress)}
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">From:</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xs bg-primary/10 px-2 py-1 rounded-md border border-primary/20">
                          {giftDetails.creator.substring(0, 6)}...
                          {giftDetails.creator.substring(giftDetails.creator.length - 4)}
                        </span>
                        <button
                          className="text-muted-foreground hover:text-white transition-colors"
                          onClick={() => copyToClipboard(giftDetails.creator)}
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Created:</span>
                      <span className="text-sm">{formatDate(giftDetails.timeCreated)}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        {giftDetails.expiry * 1000 > Date.now() ? "Expires" : "Expired"}:
                      </span>
                      <span
                        className={`text-sm ${giftDetails.expiry * 1000 > Date.now() ? "text-white" : "text-red-400"
                          }`}
                      >
                        {formatDate(giftDetails.expiry)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Transaction Hash (if available) */}
                {txHash && (
                  <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
                    <span className="text-sm text-muted-foreground">Transaction:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">
                        {txHash.slice(0, 6)}...{txHash.slice(-4)}
                      </span>
                      <a
                        href={`https://sepolia.etherscan.io/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300 transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <button
                        className="text-muted-foreground hover:text-white transition-colors"
                        onClick={() => copyToClipboard(txHash)}
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Reclaim Button or Success/Error Message */}
                {txSuccess ? (
                  <div className="text-center p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                    <span className="text-green-400 font-medium">Successfully reclaimed!</span>
                  </div>
                ) : giftDetails.isValid && isReclaimable(giftDetails) ? (
                  <Button
                    onClick={handleReclaimGift}
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transition-all duration-300 py-6 text-lg font-medium glow-border"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        <span>Reclaiming...</span>
                      </div>
                    ) : (
                      "Reclaim Tokens"
                    )}
                  </Button>
                ) : (
                  <div className="text-center p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                    <span className="text-red-400 text-sm">
                      {giftDetails.errorMessage ||
                        "This gift cannot be reclaimed (not expired, not your gift, or already processed)."}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-primary/20 flex flex-col gap-3">
              <Button
                variant="outline"
                className="w-full gap-2 border-primary/30 bg-primary/5 hover:bg-primary/10"
                onClick={handleCloseModal}
              >
                {giftDetails.isValid && !txSuccess ? "Validate Another Code" : "Try Another Code"}
              </Button>

              {giftDetails.isValid && giftDetails.status === GiftStatus.PENDING && giftDetails.expiry * 1000 > Date.now() && (
                <div className="text-center text-xs text-muted-foreground p-2">
                  This gift is still valid and can be redeemed until {formatDate(giftDetails.expiry)}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}