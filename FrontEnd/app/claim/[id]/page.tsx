

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Zap } from "lucide-react"
import WalletConnect from "@/components/wallet-connect"

interface ClaimPageProps {
  params: {
    id: string
  }
}

export default function ClaimGiftCard({ params }: ClaimPageProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isClaiming, setIsClaiming] = useState(false)
  const [giftCard, setGiftCard] = useState<{
    id: string
    amount: string
    sender: string
    message?: string
    image: string
  } | null>(null)

  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    // Simulate fetching gift card data
    const fetchGiftCard = async () => {
      setIsLoading(true)
      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Mock data
        setGiftCard({
          id: params.id,
          amount: "0.5 ETH",
          sender: "0x1234...5678",
          message: "Happy Birthday! Enjoy your gift!",
          image: "/placeholder.svg?height=300&width=500",
        })
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load gift card details.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchGiftCard()
  }, [params.id, toast])

  const handleConnect = (address: string) => {
    setIsConnected(true)
    setWalletAddress(address)
  }

  const handleClaimGiftCard = async () => {
    setIsClaiming(true)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500))

      toast({
        title: "Gift Card Claimed",
        description: "The gift card has been successfully claimed to your wallet!",
      })

      router.push("/dashboard")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to claim gift card. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsClaiming(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="container py-8 max-w-md hexagon-bg">
        <Button variant="ghost" className="mb-6 gap-2" onClick={() => router.push("/")}>
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Button>

        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight mb-2 gradient-text">Claim Gift Card</h1>
          <p className="text-muted-foreground">Connect your wallet to claim this gift card.</p>
        </div>

        <WalletConnect onConnect={handleConnect} />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="container py-8 max-w-md text-center hexagon-bg">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 bg-primary/20 rounded mx-auto"></div>
          <div className="h-4 w-2/3 bg-primary/10 rounded mx-auto"></div>
          <div className="h-64 bg-primary/10 rounded"></div>
          <div className="h-10 bg-primary/20 rounded"></div>
        </div>
      </div>
    )
  }

  if (!giftCard) {
    return (
      <div className="container py-8 max-w-md text-center hexagon-bg">
        <h1 className="text-3xl font-bold tracking-tight mb-2 gradient-text">Gift Card Not Found</h1>
        <p className="text-muted-foreground mb-6">This gift card may have been claimed or doesn't exist.</p>
        <Button onClick={() => router.push("/")} className="glow-border">
          Return to Home
        </Button>
      </div>
    )
  }

  return (
    <div className="container py-8 max-w-md hexagon-bg">
      <Button variant="ghost" className="mb-6 gap-2" onClick={() => router.push("/")}>
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </Button>

      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight mb-2 gradient-text">Claim Your Gift Card</h1>
        <p className="text-muted-foreground">You've received a blockchain gift card!</p>
      </div>

      <Card className="overflow-hidden border-0 crypto-card glow-card mb-6">
        <CardContent className="p-0">
          <div className="relative">
            <div className="absolute inset-0 gift-card-bg gift-card-pattern"></div>
            <img
              src={giftCard.image || "/placeholder.svg"}
              alt="Gift card"
              className="w-full h-auto relative z-10 opacity-80"
            />
            <div className="absolute inset-0 flex flex-col justify-center items-center text-white p-6 z-20">
              <div className="text-center">
                <div className="text-4xl font-bold mb-2 glow-text">{giftCard.amount}</div>
                {giftCard.message && <p className="italic">"{giftCard.message}"</p>}
              </div>
            </div>
          </div>
          <div className="p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">From:</span>
              <span className="font-mono text-sm address-tag">{giftCard.sender}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">To:</span>
              <span className="font-mono text-sm address-tag">
                {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <Button size="lg" className="gap-2 glow-border" onClick={handleClaimGiftCard} disabled={isClaiming}>
          {isClaiming ? (
            <>Claiming...</>
          ) : (
            <>
              <Zap className="h-5 w-5" />
              Claim Gift Card
            </>
          )}
        </Button>

        <div className="text-center text-sm text-muted-foreground glass p-3 rounded-lg border border-primary/30">
          <p>By claiming this gift card, the funds will be transferred to your connected wallet.</p>
        </div>
      </div>
    </div>
  )
}