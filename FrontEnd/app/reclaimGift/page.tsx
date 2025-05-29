"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle2, XCircle } from "lucide-react"
import { ethers } from "ethers"
import GiftChainABI from "../../abi/GiftChain.json"
import erc20ABI from "../../abi/erc20ABI.json"
import { useAccount, useWalletClient } from "wagmi"
import { GET_GIFTS } from "../../hooks/subgraph/queries";
import { useQuery } from "@apollo/client"

// const CONTRACT_ADDRESS = process.env.NEXT_APP_GIFTCHAIN_ADDRESS
const CONTRACT_ADDRESS = "0x280593931820aBA367dB060162cA03CD59EC29c9"
const PROVIDER_URL = "https://eth-sepolia.g.alchemy.com/v2/uoHUh-NxGIzghN1job_SDZjGuQQ7snrT"

interface ValidationErrors {
  code?: string
}

interface ValidationResult {
  isValid: boolean
  message?: string
  details?: {
    token: string
    tokenAddress: string
    message: string
    amount: string
    expiry: string
    timeCreated: string
    claimed: boolean
    sender: string
    status: string
  }
}

export default function ReclaimGift() {
  const [code, setCode] = useState<string>("")
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [provider, setProvider] = useState<ethers.JsonRpcProvider | null>(null)
  const [contract, setContract] = useState<ethers.Contract | null>(null)
  const router = useRouter()
  const { toast } = useToast()
  const { isConnected, address } = useAccount()
  const { data: walletClient } = useWalletClient()

  // Add useQuery at component level
  const { data: giftsData, loading: giftsLoading } = useQuery(GET_GIFTS, {
    variables: { creator: address?.toLowerCase() },
    skip: !address, // Skip query if no address
    fetchPolicy: "network-only",
  })

  // Initialize provider and contract on component mount
  useEffect(() => {
    try {
      const newProvider = new ethers.JsonRpcProvider(PROVIDER_URL)
      const newContract = new ethers.Contract(CONTRACT_ADDRESS, GiftChainABI, newProvider)
      setProvider(newProvider)
      setContract(newContract)
    } catch (error) {
      console.error("Failed to initialize provider or contract:", error)
      toast({
        title: "Error",
        description: "Failed to connect to blockchain. Please try again later.",
        variant: "destructive",
      })
    }
  }, [toast])

  const validateGift = async (rawCode: string): Promise<ValidationResult> => {
    if (!contract || !provider) {
      return {
        isValid: false,
        message: "Contract initialization failed. Please refresh the page.",
      }
    }
    try {
      console.log("Validating gift code:", rawCode)
      const normalizedCode = rawCode.toLowerCase()
      const codeHash = ethers.keccak256(ethers.toUtf8Bytes(normalizedCode))
      console.log("Computed codeHash:", codeHash)

      const gift = await contract.gifts(codeHash)
      console.log("Gift Data:", gift)

      if (gift.amount == 0) {
        return {
          isValid: false,
          message: "Gift not found. Please check your code.",
        }
      }
      const block = await provider.getBlock("latest")
      if (!block) {
        return {
          isValid: false,
          message: "Failed to get current block",
        }
      }
      const currentTimestamp = block.timestamp
      if (currentTimestamp < gift.expiry) {
        return {
          isValid: false,
          message: "This gift has not expired. You cannot reclaim it yet.",
        }
      }

      if (gift.claimed) {
        return {
          isValid: false,
          message: "This gift has already been claimed.",
        }
      }

      const hashAddress = ethers.keccak256(ethers.getAddress(address!))
      // const strinfiedGift = JSON.parse(JSON.stringify(giftsData))
      // console.log(giftsData, hashAddress, strinfiedGift);

      if(gift.creator !== hashAddress) {
        
        return {
          isValid: false,
          message: "You don't have creator authorization to reclaim this gift.",
        }
      }

      const erc20 = new ethers.Contract(gift.token, erc20ABI, provider)
      const tokenSymbol = await erc20.symbol()
      const tokenDecimals = await erc20.decimals()
      const formattedAmount = ethers.formatUnits(gift.amount, tokenDecimals)

      const details = {
        token: tokenSymbol,
        tokenAddress: gift.token,
        message: gift.message,
        amount: formattedAmount,
        expiry: gift.expiry.toString(),
        timeCreated: gift.timeCreated.toString(),
        claimed: gift.claimed,
        sender: gift.creator,
        status: gift.status,
      }

      return {
        isValid: true,
        message: "Gift is ready to be reclaim!",
        details,
      }

    } catch (error: any) {
      console.error("Validation error:", error)
      let errorMessage = "An unknown error occurred."

      if (error.reason || error.data?.message) {
        const reason = error.reason || error.data?.message
        console.log("Error reason:", reason)
        if (reason.includes("GiftNotFound")) {
          errorMessage = "Gift not found. Please check your code."
        } else if (reason.includes("GiftAlreadyRedeemed")) {
          errorMessage = "This gift has already been redeemed."
        } else if (reason.includes("GiftAlreadyReclaimed")) {
          errorMessage = "This gift has been reclaimed by the sender."
        } else if (reason.includes("InvalidGiftStatus")) {
          errorMessage = "This gift is expired or has an invalid status."
        } else {
          errorMessage = `Contract error: ${reason}`
        }
      } else if (error.message) {
        console.log("Error message:", error.message)
        errorMessage = `Provider error: ${error.message}`
      }

      return {
        isValid: false,
        message: errorMessage,
      }
    }
  }

  const reclaimGift = async () => {
    if (!validationResult?.isValid || !validationResult.details) {
      return;
    }

    try {
      setLoading(true);
      const normalizedCode = code.toLowerCase();
      const codeHash = ethers.keccak256(ethers.toUtf8Bytes(normalizedCode));

      // Check if window.ethereum exists
      if (!isConnected) {
        throw new Error("MetaMask not detected. Please install MetaMask to claim your gift.");
      }

      // Request account access first
      // await window.ethereum.request({ method: "eth_requestAccounts" });

      // Then get provider and signer
      const provider = new ethers.BrowserProvider(walletClient!.transport);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, GiftChainABI, signer);

      const hash = await walletClient?.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: GiftChainABI,
        functionName: "reclaimGift",
        args: [codeHash],
      });

      // const tx = await contract.reclaimGift(codeHash);
      // console.log("Transaction:", tx);
      // const receipt = await tx.wait();
      // console.log("Transaction receipt:", receipt);

      // console.log(provider, signer, contract, hash);

      toast({
        title: "Success",
        description: "Gift Reclaimed Successfully!",
      });
      // Update UI
      setValidationResult({
        ...validationResult,
        details: {
          ...validationResult.details,
          claimed: true,
        },
      });

    } catch (error: any) {
      console.error("Claim error:", error);

      let errorMessage = "Failed to claim gift";

      if (error.code === 4001) {
        errorMessage = "Please connect your MetaMask wallet and approve the connection request";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: string): string => {
    return new Date(Number.parseInt(timestamp) * 1000).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleCodeValidation = async () => {
    if (!code.trim() || code.length < 6) {
      setErrors({ code: "Gift code is required and must be at least 6 characters" })
      toast({
        title: "Error",
        description: "Gift code is required and must be at least 6 characters.",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      const result = await validateGift(code)
      setValidationResult(result)
      setIsModalOpen(true)

      if (!result.isValid) {
        setErrors({ code: result.message })
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        })
      } else {
        setErrors({ code: undefined })
        toast({
          title: "Success",
          description: "Gift validated successfully!",
        })
      }
    } catch (error: any) {
      console.error("Unexpected error validating code:", error)
      const errorMessage = `Unexpected error: ${error.message || "Unknown error"}`
      setErrors({ code: errorMessage })
      setValidationResult({
        isValid: false,
        message: errorMessage,
      })
      setIsModalOpen(true)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setValidationResult(null)
    setErrors({ code: undefined })
  }

  return (
    <div className="container sm:py-8 max-w-md hexagon-bg mx-auto">
      <Card className="bg-black/40 backdrop-blur-xl border border-primary/20 shadow-xl shadow-purple-900/5 overflow-hidden relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-blue-500/5 opacity-50"></div>
        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-primary/5 to-transparent gift-shimmer"></div>
        <CardContent className="p-6 relative">
          <div className="mb-6 px-4 sm:px-0">
            <div className="glass p-4 rounded-lg border border-primary/30">
              <label className="block text-xs sm:text-sm text-muted-foreground mb-2">Gift Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.trim())
                  setValidationResult(null)
                  setErrors({ code: undefined })
                }}
                className="w-full bg-primary/10 text-white rounded-lg py-2 px-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#289a67] border border-primary/30"
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
                  Reclaim Gift
                </>
              )}
            </Button>

            {errors.code && !isModalOpen && (
              <p className="text-red-400 mt-2 text-xs sm:text-sm text-center">{errors.code}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="text-center animate-pulse space-y-4 px-4 sm:px-0">
          <div className="h-48 sm:h-64 bg-primary/10 rounded"></div>
        </div>
      )}

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
                <Card className="overflow-hidden border-0 crypto-card glow-card">
                  <CardContent className="p-0">
                    <div className="relative aspect-[5/3] w-full">
                      <div className="absolute inset-0 gift-card-bg gift-card-pattern"></div>
                      <img
                        src="/placeholder.svg?height=300&width=500"
                        alt="Gift card"
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
                            {validationResult.details.sender.substring(validationResult.details.sender.length - 4)}
                          </p>
                          <p>Expiry: {formatDate(validationResult.details.expiry)}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-medium">
                      {validationResult.details.amount} {validationResult.details.token}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Message:</span>
                    <span className="font-medium italic">"{validationResult.details.message}"</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Token Address:</span>
                    <span className="font-mono address-tag">
                      {validationResult.details.tokenAddress.substring(0, 6)}...
                      {validationResult.details.tokenAddress.substring(
                        validationResult.details.tokenAddress.length - 4,
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">From:</span>
                    <span className="font-mono address-tag">
                      {validationResult.details.sender.substring(0, 6)}...
                      {validationResult.details.sender.substring(validationResult.details.sender.length - 4)}
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
                  {/* <div className="flex justify-between items-center">
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
                  </div> */}
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Created:</span>
                    <span>{formatDate(validationResult.details.timeCreated)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Expiry:</span>
                    <span
                      className={`${Number.parseInt(validationResult.details.expiry) * 1000 > Date.now()
                        ? "text-white"
                        : "text-red-400"
                        }`}
                    >
                      {formatDate(validationResult.details.expiry)}
                    </span>
                  </div>
                </div>

                {!validationResult.details.claimed && (
                  <Button
                    size="lg"
                    className="w-full gap-2 glow-border text-sm sm:text-base"
                    onClick={reclaimGift}
                    disabled={loading}
                  >
                    {loading ? (
                      <>Reclaiming...</>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
                        Reclaim Gift
                      </>
                    )}
                  </Button>
                )}

                <div className="text-center text-xs sm:text-sm text-muted-foreground">
                  <p>
                    This gift {validationResult.details.claimed ? "has been claimed" : "is available to claim"}.
                    Expiry date is shown above.
                  </p>
                </div>
              </div>
            )}

            <Button variant="ghost" className="mt-4 w-full gap-2 text-xs sm:text-sm" onClick={handleCloseModal}>
              {validationResult.isValid ? "Validate Another Code" : "Try Another Code"}
            </Button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
