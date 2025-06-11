"use client";

import React, { useState } from "react";
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
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { ethers } from "ethers";
import GiftChainABI from "../../abi/GiftChain.json";
import erc20ABI from "../../abi/erc20ABI.json";

const CONTRACT_ADDRESS = "0x4dbdd0111E8Dd73744F1d9A60e56129009eEE473";
const PROVIDER_URL = "https://eth-sepolia.g.alchemy.com/v2/uoHUh-NxGIzghN1job_SDZjGuQQ7snrT";

interface ValidationErrors {
  code?: string;
}

interface ValidationResult {
  isValid: boolean;
  message?: string;
  details?: {
    token: string;
    tokenAddress: string; // Add token address
    message: string;
    amount: string;
    expiry: string;
    timeCreated: string;
    claimed: boolean;
    sender: string;
    status: string;
  };
}

export default function ValidateGiftCard() {
  const [code, setCode] = useState<string>("");
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
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
      const normalizedCode = rawCode.toLowerCase();
      const codeHash = ethers.keccak256(ethers.toUtf8Bytes(normalizedCode));
      console.log("Computed codeHash:", codeHash);

      const gift = await contract.gifts(codeHash);
      console.log("Gift Data:", gift);

      if (gift.amount == 0) {
        return {
          isValid: false,
          message: "Gift not found. Please check your code.",
        };
      }

      if (gift.status != 1) {
        return {
          isValid: false,
          message: "This gift has an invalid status.",
        };
      }

      const block = await provider.getBlock("latest");
      const currentTimestamp = block.timestamp;
      if (currentTimestamp > gift.expiry) {
        return {
          isValid: false,
          message: "This gift has expired.",
        };
      }

      if (gift.claimed) {
        return {
          isValid: false,
          message: "This gift has already been claimed.",
        };
      }

      const erc20 = new ethers.Contract(gift.token, erc20ABI, provider);
      const tokenSymbol = await erc20.symbol();
      const tokenDecimals = await erc20.decimals();
      const formattedAmount = ethers.formatUnits(gift.amount, tokenDecimals);

      // Map status enum to string (assuming 0: NONE, 1: ACTIVE, 2: RECLAIMED)
      const statusMap = ["NONE", "ACTIVE", "RECLAIMED"];
      const status = statusMap[gift.status] || "UNKNOWN";

      const details = {
        token: tokenSymbol,
        tokenAddress: gift.token, // Add token address
        message: gift.message,
        amount: formattedAmount,
        expiry: gift.expiry.toString(),
        timeCreated: gift.timeCreated.toString(),
        claimed: gift.claimed,
        sender: gift.creator,
        status: status,
      };

      return {
        isValid: true,
        message: "Gift is valid!",
        details,
      };
    } catch (error: any) {
      console.error("Validation error:", error);
      let errorMessage = "An unknown error occurred.";

      if (error.reason || error.data?.message) {
        const reason = error.reason || error.data?.message;
        console.log("Error reason:", reason);
        if (reason.includes("GiftNotFound")) {
          errorMessage = "Gift not found. Please check your code.";
        } else if (reason.includes("GiftAlreadyRedeemed")) {
          errorMessage = "This gift has already been redeemed.";
        } else if (reason.includes("GiftAlreadyReclaimed")) {
          errorMessage = "This gift has been reclaimed by the sender.";
        } else if (reason.includes("InvalidGiftStatus")) {
          errorMessage = "This gift has expired or has an invalid status.";
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

  const formatDate = (timestamp: string): string => {
    return new Date(parseInt(timestamp) * 1000).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleCodeValidation = async () => {
    if (!code.trim() || code.length < 6) {
      setErrors({ code: "Gift code is required and must be at least 6 characters" });
      toast({
        title: "Error",
        description: "Gift code is required and must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const result = await validateGift(code);
      setLoading(false);
      setValidationResult(result);
      setIsModalOpen(true);

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
          description: "Gift validated successfully!",
        });
      }
    } catch (error: any) {
      setLoading(false);
      console.error("Unexpected error validating code:", error);
      const errorMessage = `Unexpected error: ${error.message || "Unknown error"}`;
      setErrors({ code: errorMessage });
      setValidationResult({
        isValid: false,
        message: errorMessage,
      });
      setIsModalOpen(true);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setValidationResult(null);
    setErrors({ code: undefined });
  };

  return (
    <div className="container  sm:py-8 max-w-md hexagon-bg mx-auto">
      {/* Back Button */}
      {/* <Button
        variant="ghost"
        className="mb-4 sm:mb-6 gap-2"
        onClick={() => router.push("/")}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </Button> */}

      {/* Header */}
      {/* <div className="mb-6 sm:mb-8 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 gradient-text">
          Validate Gift
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Enter the gift code to check its details.
        </p>
      </div> */}
      <Card className="bg-black/40 backdrop-blur-xl border border-primary/20 shadow-xl shadow-purple-900/5 overflow-hidden relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-blue-500/5 opacity-50"></div>
        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-primary/5 to-transparent gift-shimmer"></div>
        <CardContent className="p-6 relative">
          <div className="mb-6 px-4 sm:px-0">
            <div className="glass p-4 rounded-lg border border-primary/30">
              <label className="block text-xs sm:text-sm text-muted-foreground mb-2">
                Gift Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.trim());
                  setValidationResult(null);
                  setErrors({ code: undefined });
                }}
                className="w-full bg-primary/10 text-white rounded-lg py-2 px-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-purple-500 border border-primary/30"
                placeholder="Enter gift code (e.g., c2f1-eb68-edd1-89ba)"
              />
            </div>
            <Button
              size="lg"
              className="mt-4 w-full gap-2 glow-border text-sm sm:text-base"
              onClick={handleCodeValidation}
              disabled={loading || !code.trim() || code.length < 6}
            >
              {loading ? (
                <>Validating...</>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
                  Validate Gift
                </>
              )}
            </Button>

            {errors.code && !isModalOpen && (
              <p className="text-red-400 mt-2 text-xs sm:text-sm text-center">{errors.code}</p>
            )}
          </div>
        </CardContent>
        {/* Form */}
      </Card>



      {/* Loading State */}
      {loading && (
        <div className="text-center animate-pulse space-y-4 px-4 sm:px-0">
          <div className="h-48 sm:h-64 bg-primary/10 rounded"></div>
        </div>
      )}

      {/* Modal for Gift Details */}
      {validationResult && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="glass border border-primary/30 max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="gradient-text flex items-center gap-2 text-lg sm:text-xl">
                {validationResult.isValid ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
                    Gift Details
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-400" />
                    Validation Error
                  </>
                )}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs sm:text-sm">
                {validationResult.message}
              </DialogDescription>
            </DialogHeader>

            {validationResult.isValid && validationResult.details && (
              <div className="mt-4 space-y-4">
                {/* Visual Card Display */}
                <Card className="overflow-hidden border-0 crypto-card glow-card">
                  <CardContent className="p-0">
                    <div className="relative aspect-[5/3] w-full">
                      <div className="absolute inset-0 gift-card-bg gift-card-pattern"></div>
                      <img
                        src="/placeholder.svg?height=300&width=500"
                        alt="Gift img"
                        className="w-full h-full object-cover relative z-10 opacity-80"
                      />
                      <div className="absolute inset-0 flex flex-col justify-between text-white p-4 sm:p-6 z-20">
                        <div className="text-center">
                          <div className="text-2xl sm:text-4xl font-bold mb-1 sm:mb-2 glow-text">
                            {validationResult.details.amount} {validationResult.details.token}
                          </div>
                          {validationResult.details.message && (
                            <p className="italic text-xs sm:text-sm">"{validationResult.details.message}"</p>
                          )}
                        </div>
                        <div className="text-xs sm:text-sm space-y-1">
                          <p>
                            From: {validationResult.details.sender.substring(0, 6)}...
                            {validationResult.details.sender.substring(
                              validationResult.details.sender.length - 4
                            )}
                          </p>
                          <p>Expiry: {formatDate(validationResult.details.expiry)}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Detailed Information */}
                <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-medium">
                      {validationResult.details.amount} {validationResult.details.token}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Message:</span>
                    <span className="font-medium italic">
                      "{validationResult.details.message}"
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Token Address:</span>
                    <span className="font-mono address-tag">
                      {validationResult.details.tokenAddress.substring(0, 6)}...
                      {validationResult.details.tokenAddress.substring(
                        validationResult.details.tokenAddress.length - 4
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">From:</span>
                    <span className="font-mono address-tag">
                      {validationResult.details.sender.substring(0, 6)}...
                      {validationResult.details.sender.substring(
                        validationResult.details.sender.length - 4
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Status:</span>
                    <span
                      className={`font-medium flex items-center gap-1 ${validationResult.details.claimed ? "text-red-400" : "text-green-400"
                        }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${validationResult.details.claimed ? "bg-red-500" : "bg-green-500"
                          }`}
                      ></span>
                      {validationResult.details.claimed ? "Claimed" : "Available"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Contract Status:</span>
                    <span
                      className={`font-medium ${validationResult.details.status === "ACTIVE"
                        ? "text-blue-400"
                        : validationResult.details.status === "RECLAIMED"
                          ? "text-purple-400"
                          : "text-gray-400"
                        }`}
                    >
                      {validationResult.details.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Created:</span>
                    <span>{formatDate(validationResult.details.timeCreated)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Expiry:</span>
                    <span
                      className={`${parseInt(validationResult.details.expiry) * 1000 > Date.now()
                        ? "text-white"
                        : "text-red-400"
                        }`}
                    >
                      {formatDate(validationResult.details.expiry)}
                    </span>
                  </div>
                </div>

                <div className="text-center text-xs sm:text-sm text-muted-foreground">
                  <p>
                    This gift{" "}
                    {validationResult.details.claimed ? "has been claimed" : "is available to claim"}.
                    Expiry date is shown above.
                  </p>
                </div>
              </div>
            )}

            <Button
              variant="ghost"
              className="mt-4 w-full gap-2 text-xs sm:text-sm"
              onClick={handleCloseModal}
            >
              {validationResult.isValid ? "Validate Another Code" : "Try Another Code"}
            </Button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
