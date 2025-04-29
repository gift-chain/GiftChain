"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { ethers } from "ethers";
import GiftChainABI from "../../app/abi/GiftChain.json";
import erc20ABI from "../../app/abi/erc20ABI.json";

const CONTRACT_ADDRESS = "0x4dbdd0111E8Dd73744F1d9A60e56129009eEE473";
const PROVIDER_URL = "https://eth-sepolia.g.alchemy.com/v2/7Ehr_350KwRXw2n30OoeevZUOFu12XYX";

interface ValidatePageProps {
  params: {
    id: string;
  };
}

interface ValidationResult {
  isValid: boolean;
  message?: string;
  details?: {
    token: string;
    message: string;
    amount: string;
    expiry: string;
    timeCreated: string;
    claimed: boolean;
    sender: string;
  };
}

export default function ValidateGiftCard({ params }: ValidatePageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  // Initialize read-only provider
  const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, GiftChainABI, provider);

  useEffect(() => {
    const validateGift = async (rawCode: string) => {
      if (!contract) {
        setValidationResult({
          isValid: false,
          message: "Contract initialization failed",
        });
        return;
      }

      try {
        console.log("Validating gift code:", rawCode);
        const codeHash = ethers.keccak256(ethers.toUtf8Bytes(rawCode));
        console.log("Computed codeHash:", codeHash);

        // Call validateGift with the code hash
        const isValid = await contract.validateGift(codeHash);
        console.log("Validation result:", isValid);

        let details;
        if (isValid) {
          const gift = await contract.gifts(codeHash);
          const erc20 = new ethers.Contract(gift.token, erc20ABI, provider);
          const tokenSymbol = await erc20.symbol();
          const tokenDecimals = await erc20.decimals();
          const formattedAmount = ethers.formatUnits(gift.amount, tokenDecimals);
          details = {
            token: tokenSymbol,
            message: gift.message,
            amount: formattedAmount,
            expiry: gift.expiry.toString(),
            timeCreated: gift.timeCreated.toString(),
            claimed: gift.claimed,
            sender: gift.creator, // Assuming creator is the sender
          };
        }

        setValidationResult({
          isValid,
          message: isValid ? "Gift card is valid!" : "Gift card is invalid.",
          details,
        });
      } catch (error: any) {
        console.error("Validation error:", error);
        let errorMessage = "An unknown error occurred.";

        if (error.reason || error.data?.message) {
          const reason = error.reason || error.data?.message;
          console.log("Error reason:", reason);
          if (reason.includes("GiftNotFound")) {
            errorMessage = "Gift card not found. Please check your code.";
          } else if (reason.includes("GiftAlreadyRedeemed")) {
            errorMessage = "This gift card has already been redeemed.";
          } else if (reason.includes("GiftAlreadyReclaimed")) {
            errorMessage = "This gift card has been reclaimed by the sender.";
          } else if (reason.includes("InvalidGiftStatus")) {
            errorMessage = "This gift card is expired or has an invalid status.";
          } else {
            errorMessage = `Contract error: ${reason}`;
          }
        } else if (error.message) {
          console.log("Error message:", error.message);
          errorMessage = `Provider error: ${error.message}`;
        }

        setValidationResult({
          isValid: false,
          message: errorMessage,
        });

        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    validateGift(params.id);
  }, [params.id, toast]);

  if (isLoading) {
    return (
      <div className="container py-8 max-w-md text-center hexagon-bg">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 bg-primary/20 rounded mx-auto"></div>
          <div className="h-4 w-2/3 bg-primary/10 rounded mx-auto"></div>
          <div className="h-64 bg-primary/10 rounded"></div>
        </div>
      </div>
    );
  }

  if (!validationResult || !validationResult.isValid || !validationResult.details) {
    return (
      <div className="container py-8 max-w-md text-center hexagon-bg">
        <Button
          variant="ghost"
          className="mb-6 gap-2"
          onClick={() => router.push("/")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Button>
        <h1 className="text-3xl font-bold tracking-tight mb-2 gradient-text">
          Gift Card Not Found
        </h1>
        <p className="text-muted-foreground mb-6">
          This gift card may have been claimed, reclaimed, or doesn't exist.
        </p>
        <Button onClick={() => router.push("/")} className="glow-border">
          Return to Home
        </Button>
      </div>
    );
  }

  const { details } = validationResult;

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
          Validate Gift Card
        </h1>
        <p className="text-muted-foreground">
          Check the details of your blockchain gift card.
        </p>
      </div>

      <Card className="overflow-hidden border-0 crypto-card glow-card mb-6">
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
                  {details.amount} {details.token}
                </div>
                {details.message && <p className="italic">"{details.message}"</p>}
              </div>
            </div>
          </div>
          <div className="p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">From:</span>
              <span className="font-mono text-sm address-tag">
                {details.sender.substring(0, 6)}...
                {details.sender.substring(details.sender.length - 4)}
              </span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <span
                className={`text-sm font-medium ${
                  details.claimed ? "text-red-400" : "text-green-400"
                }`}
              >
                {details.claimed ? "Claimed" : "Available"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Expiry:</span>
              <span className="text-sm">
                {new Date(parseInt(details.expiry) * 1000).toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-muted-foreground glass p-3 rounded-lg border border-primary/30">
        <p>
          This gift card {details.claimed ? "has been claimed" : "is available to claim"}. Expiry date is shown above.
        </p>
      </div>
    </div>
  );
}