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

export default function CreateGiftCard() {
  const [isConnected, setIsConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState("")
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState("ETH")
  const [recipient, setRecipient] = useState("")
  const [message, setMessage] = useState("")
  const [selectedDesign, setSelectedDesign] = useState(0)
  const [isCreating, setIsCreating] = useState(false)

  const router = useRouter()
  const { toast } = useToast()

  const cardDesigns = [
    "/placeholder.svg?height=200&width=320",
    "/placeholder.svg?height=200&width=320",
    "/placeholder.svg?height=200&width=320",
    "/placeholder.svg?height=200&width=320",
  ]

  const handleConnect = (address: string) => {
    setIsConnected(true)
    setWalletAddress(address)
  }

  const handleCreateGiftCard = async () => {
    if (!amount) {
      toast({
        title: "Missing amount",
        description: "Please enter an amount for the gift card",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500))

      toast({
        title: "Gift Card Created",
        description: "Your gift card has been created successfully!",
      })

      router.push("/dashboard")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create gift card. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  if (!isConnected) {
    return <WalletConnect onConnect={handleConnect} />
  }

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
                  placeholder="0.0"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-background/40 border-primary/30"
                />
                <select
                  className="bg-background/40 border border-primary/30 rounded-md px-3 py-2 w-24"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option>ETH</option>
                  <option>USDC</option>
                  <option>USDT</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient Address (Optional)</Label>
              <Input
                id="recipient"
                placeholder="0x..."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="bg-background/40 border-primary/30 font-mono"
              />
              <p className="text-sm text-muted-foreground">
                Leave empty to create a gift card that anyone can claim with the link.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message (Optional)</Label>
              <Textarea
                id="message"
                placeholder="Happy Birthday!"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
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
            <Button className="w-full gap-2 glow-border" size="lg" onClick={handleCreateGiftCard} disabled={isCreating}>
              <Zap className="h-5 w-5" />
              {isCreating ? "Creating..." : "Create Gift Card"}
            </Button>
          </div>
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
                      {amount || "0.0"} {currency}
                    </div>
                    {message && <p className="text-sm italic">"{message}"</p>}
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">From:</span>
                  <span className="font-mono text-sm address-tag">
                    {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
                  </span>
                </div>
                {recipient && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">To:</span>
                    <span className="font-mono text-sm address-tag">
                      {recipient.substring(0, 6)}...{recipient.substring(recipient.length - 4)}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 space-y-4 glass p-4 rounded-lg border border-primary/30">
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
          </div>
        </div>
      </div>
    </div>
  )
}