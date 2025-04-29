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
import { ArrowLeft, CheckCircle2, XCircle, Wallet } from "lucide-react";
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

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setGiftDetails(null);
    setTxSuccess(false);
    setTxHash("");
    setErrors({ code: undefined });
  };

  return (
    <div className="container py-8 max-w-md hexagon-bg">
      <Button
        variant="ghost"
        className="mb-6 gap-2"
        onClick={() => router.push("/")}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </Button>

      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight mb-2 gradient-text">
          Reclaim Expired Gift
        </h1>
        <p className="text-muted-foreground">
          Enter your gift code to reclaim expired, unclaimed tokens.
        </p>
      </div>

      {/* Wallet Connection Status */}
      <div className="mb-6">
        {walletAddress ? (
          <p className="text-center text-sm text-muted-foreground">
            Wallet connected: {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
          </p>
        ) : (
          <Button
            size="lg"
            className="w-full gap-2 glow-border"
            onClick={connectWallet}
          >
            <Wallet className="h-5 w-5" />
            Connect Wallet
          </Button>
        )}
      </div>

      {/* Form to Input Gift Code */}
      <div className="mb-6">
        <div className="glass p-4 rounded-lg border border-primary/30">
          <label className="block text-sm text-muted-foreground mb-2">
            Gift Code
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setGiftDetails(null);
              setTxSuccess(false);
              setTxHash("");
              setErrors({ code: undefined });
            }}
            className="w-full bg-primary/10 text-white rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500 border border-primary/30"
            placeholder="Enter gift code (e.g., c2f1-eb68-edd1-89ba)"
          />
          <Button
            size="lg"
            className="mt-4 w-full gap-2 glow-border"
            onClick={handleCodeValidation}
            disabled={loading || !code.trim() || code.length < 6}
          >
            {loading ? (
              <>Validating...</>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5" />
                Validate Gift Card
              </>
            )}
          </Button>
        </div>
        {errors.code && !isModalOpen && (
          <p className="text-red-400 mt-2 text-sm text-center">{errors.code}</p>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center animate-pulse space-y-4">
          <div className="h-64 bg-primary/10 rounded"></div>
        </div>
      )}

      {/* Modal for Gift Details and Reclamation */}
      {giftDetails && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="glass border border-primary/30">
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
              <div className="mt-4 space-y-4">
                {/* Visual Card Display */}
                <Card className="overflow-hidden border-0 crypto-card glow-card">
                  <CardContent className="p-0">
                    <div className="relative">
                      <div className="absolute inset-0 gift-card-bg gift-card-pattern"></div>
                      <img
                        src="/placeholder.svg?height=300&width=500"
                        alt="Gift card"
                        className="w-full h-auto relative z-10 opacity-80"
                      />
                      <div className="absolute inset-0 flex flex-col justify-center items-center text-white p-6 z-20">
                        <div className="text-center">
                          <div className="text-4xl font-bold mb-2 glow-text">
                            {giftDetails.amount} {giftDetails.token}
                          </div>
                          {giftDetails.message && (
                            <p className="italic">"{giftDetails.message}"</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Detailed Information */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Amount:</span>
                    <span className="text-sm font-medium">
                      {giftDetails.amount} {giftDetails.token}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Message:</span>
                    <span className="text-sm font-medium italic">
                      "{giftDetails.message}"
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Token Address:</span>
                    <span className="font-mono text-sm address-tag">
                      {giftDetails.tokenAddress.substring(0, 6)}...
                      {giftDetails.tokenAddress.substring(giftDetails.tokenAddress.length - 4)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">From:</span>
                    <span className="font-mono text-sm address-tag">
                      {giftDetails.creator.substring(0, 6)}...
                      {giftDetails.creator.substring(giftDetails.creator.length - 4)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <span
                      className={`text-sm font-medium flex items-center gap-1 ${
                        giftDetails.status === GiftStatus.SUCCESSFUL
                          ? "text-green-400"
                          : giftDetails.status === GiftStatus.RECLAIMED
                          ? "text-purple-400"
                          : giftDetails.status === GiftStatus.PENDING
                          ? "text-blue-400"
                          : "text-gray-400"
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          giftDetails.status === GiftStatus.SUCCESSFUL
                            ? "bg-green-500"
                            : giftDetails.status === GiftStatus.RECLAIMED
                            ? "bg-purple-500"
                            : giftDetails.status === GiftStatus.PENDING
                            ? "bg-blue-500"
                            : "bg-gray-500"
                        }`}
                      ></span>
                      {getStatusText(giftDetails.status)}
                    </span>
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
                      className={`text-sm ${
                        giftDetails.expiry * 1000 > Date.now() ? "text-white" : "text-red-400"
                      }`}
                    >
                      {formatDate(giftDetails.expiry)}
                    </span>
                  </div>
                </div>

                {/* Transaction Hash (if available) */}
                {txHash && (
                  <div className="text-center text-sm text-muted-foreground">
                    <p>
                      Transaction Hash:{" "}
                      <a
                        href={`https://sepolia.etherscan.io/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-purple-400 hover:text-purple-300"
                      >
                        {txHash.slice(0, 6)}...{txHash.slice(-4)}
                      </a>
                    </p>
                  </div>
                )}

                {/* Reclaim Button or Success/Error Message */}
                {txSuccess ? (
                  <div className="text-center text-green-400 text-sm flex items-center justify-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    Successfully reclaimed!
                  </div>
                ) : giftDetails.isValid && isReclaimable(giftDetails) ? (
                  <Button
                    onClick={handleReclaimGift}
                    disabled={isSubmitting}
                    className="w-full bg-purple-600 hover:bg-purple-700 glow-border"
                  >
                    {isSubmitting ? "Reclaiming..." : "Reclaim Tokens"}
                  </Button>
                ) : (
                  <div className="text-center text-sm text-red-400">
                    {giftDetails.errorMessage ||
                      "This gift cannot be reclaimed (not expired, not your gift, or already processed)."}
                  </div>
                )}
              </div>
            )}

            <Button
              variant="ghost"
              className="mt-4 w-full gap-2"
              onClick={handleCloseModal}
            >
              {giftDetails.isValid && !txSuccess ? "Validate Another Code" : "Try Another Code"}
            </Button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}