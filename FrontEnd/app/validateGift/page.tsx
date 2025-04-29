"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { ethers } from "ethers";
import GiftChainABI from "../../app/abi/GiftChain.json";
import erc20ABI from "../../app/abi/erc20ABI.json";

const CONTRACT_ADDRESS = "0x4dbdd0111E8Dd73744F1d9A60e56129009eEE473";
const PROVIDER_URL = "https://eth-sepolia.g.alchemy.com/v2/7Ehr_350KwRXw2n30OoeevZUOFu12XYX";

interface ValidationErrors {
  code?: string;
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

export default function ValidateGiftCard() {
  const [code, setCode] = useState<string>("");
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();
  const { toast } = useToast();

  // Initialize read-only provider
  const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, GiftChainABI, provider);

  const validateGift = async (rawCode: string): Promise<ValidationResult> => {
    if (!contract) {
      return {
        isValid: false,
        message: "Contract initialization failed",
      };
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

      return {
        isValid,
        message: isValid ? "Gift card is valid!" : "Gift card is invalid.",
        details,
      };
    } catch (error: any) {
      console.error("Validation error:", error);
      let errorMessage = "An unknown error occurred.";

      // Handle specific revert reasons
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

      return {
        isValid: false,
        message: errorMessage,
      };
    }
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
      setValidationResult(result);

      if (!result.isValid) {
        setErrors({ code: result.message });
        toast({
          title: "Error",
          description: result.message,
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
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
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
          Validate Gift Card
        </h1>
        <p className="text-muted-foreground">
          Enter the gift code to check its details.
        </p>
      </div>

      {/* Form to Input Gift Code */}
      {!validationResult || loading ? (
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
                setValidationResult(null);
                setErrors({ code: undefined }); // Reset errors on input change
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
          {errors.code && <p className="text-red-400 mt-2 text-sm text-center">{errors.code}</p>}
        </div>
      ) : null}

      {/* Loading State */}
      {loading && (
        <div className="text-center animate-pulse space-y-4">
          <div className="h-64 bg-primary/10 rounded"></div>
        </div>
      )}

      {/* Gift Card Not Found */}
      {validationResult && !loading && !validationResult.isValid && (
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight mb-2 gradient-text">
            Gift Card Not Found
          </h1>
          <p className="text-muted-foreground mb-6">
            This gift card may have been claimed, reclaimed, or doesn't exist.
          </p>
          <Button
            onClick={() => setValidationResult(null)}
            className="glow-border"
          >
            Try Another Code
          </Button>
        </div>
      )}

      {/* Gift Card Details */}
      {validationResult && !loading && validationResult.isValid && validationResult.details && (
        <>
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
                      {validationResult.details.amount} {validationResult.details.token}
                    </div>
                    {validationResult.details.message && (
                      <p className="italic">"{validationResult.details.message}"</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">From:</span>
                  <span className="font-mono text-sm address-tag">
                    {validationResult.details.sender.substring(0, 6)}...
                    {validationResult.details.sender.substring(
                      validationResult.details.sender.length - 4
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <span
                    className={`text-sm font-medium ${
                      validationResult.details.claimed ? "text-red-400" : "text-green-400"
                    }`}
                  >
                    {validationResult.details.claimed ? "Claimed" : "Available"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Expiry:</span>
                  <span className="text-sm">
                    {new Date(
                      parseInt(validationResult.details.expiry) * 1000
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-center text-sm text-muted-foreground glass p-3 rounded-lg border border-primary/30">
            <p>
              This gift card{" "}
              {validationResult.details.claimed ? "has been claimed" : "is available to claim"}.
              Expiry date is shown above.
            </p>
          </div>

          <Button
            variant="ghost"
            className="mt-4 w-full gap-2"
            onClick={() => setValidationResult(null)}
          >
            Validate Another Code
          </Button>
        </>
      )}
    </div>
  );
}