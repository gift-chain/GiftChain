"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Copy, ExternalLink, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface GiftCard {
  id: string
  amount: string
  image: string
  status?: string
  recipient?: string
  created?: string
  sender?: string
  claimed?: string
}

interface GiftCardGridProps {
  cards: GiftCard[]
  type: "created" | "claimed"
  onReclaim?: (id: string) => void
}

export default function GiftCardGrid({ cards, type, onReclaim }: GiftCardGridProps) {
  const { toast } = useToast()

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied to clipboard",
      description: "The gift link has been copied to your clipboard.",
    })
  }

  if (cards.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-medium mb-2 gradient-text">No gift found</h3>
        <p className="text-muted-foreground mb-6">
          {type === "created" ? "You haven't created any gift yet." : "You haven't claimed any gift yet."}
        </p>
        <Button variant="outline" className="border-primary/50 hover:border-primary">
          {type === "created" ? "Create Your First Gift" : "Claim a Gift"}
        </Button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {cards.map((card) => (
        <Card key={card.id} className="overflow-hidden border-0 crypto-card crypto-card-hover">
          <div className="relative">
            <div className="absolute inset-0 gift-card-bg gift-card-pattern"></div>
            <img
              src={card.image || "/placeholder.svg"}
              alt={`Gift card ${card.id}`}
              className="w-full h-auto relative z-10 opacity-80"
            />
            <div className="absolute top-3 right-3 z-20">
              {type === "created" && card.status && (
                <Badge
                  variant={card.status === "claimed" ? "default" : "outline"}
                  className={card.status === "claimed" ? "bg-secondary border-0" : "border-secondary/50 text-secondary"}
                >
                  {card.status === "claimed" ? "Claimed" : "Pending"}
                </Badge>
              )}
            </div>
          </div>

          <CardContent className="p-4 relative">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold gradient-text">{card.amount}</h3>
                <p className="text-sm text-muted-foreground">
                  {type === "created" ? `Created: ${card.created}` : `Claimed: ${card.claimed}`}
                </p>
              </div>
            </div>

            <div className="text-sm">
              {type === "created" && card.recipient && (
                <div className="flex items-center justify-between mb-1">
                  <span className="text-muted-foreground">Recipient:</span>
                  <span className="font-mono address-tag">{card.recipient}</span>
                </div>
              )}

              {type === "claimed" && card.sender && (
                <div className="flex items-center justify-between mb-1">
                  <span className="text-muted-foreground">From:</span>
                  <span className="font-mono address-tag">{card.sender}</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Gift ID:</span>
                <span className="font-mono">#{card.id}</span>
              </div>
            </div>
          </CardContent>

          <CardFooter className="p-4 pt-0 flex gap-2">
            {type === "created" && card.status === "pending" && onReclaim && (
              <Button
                variant="outline"
                className="flex-1 gap-1 border-primary/50 hover:border-primary"
                onClick={() => onReclaim(card.id)}
              >
                <RefreshCw className="h-4 w-4" />
                Reclaim
              </Button>
            )}

            <Button
              variant="outline"
              className="flex-1 gap-1 border-primary/50 hover:border-primary"
              onClick={() => copyToClipboard(`https://giftcard.example/card/${card.id}`)}
            >
              <Copy className="h-4 w-4" />
              Copy Link
            </Button>

            <Button variant="outline" size="icon" className="h-10 w-10 border-primary/50 hover:border-primary">
              <ExternalLink className="h-4 w-4" />
              <span className="sr-only">View details</span>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
