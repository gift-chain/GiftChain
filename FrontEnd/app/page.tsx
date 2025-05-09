import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Gift, Wallet, Zap } from "lucide-react"
import HeroSection from "@/components/hero-section"
import FeatureCard from "@/components/feature-card"
import PlatformStats from "@/components/platform-stats"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen hexagon-bg">
      <HeroSection />

      <PlatformStats />

      <section className="container py-12 md:py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-4 gradient-text">How It Works</h2>
          <p className="text-muted-foreground md:w-2/3 mx-auto">
            Send and receive gifts on the blockchain with ease. Connect your wallet, create gifts, and share them
            with friends and family.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Wallet className="h-12 w-12 text-primary" />}
            title="Connect Wallet"
            description="Connect your blockchain wallet to get started with our secure gift platform."
          />
          <FeatureCard
            icon={<Gift className="h-12 w-12 text-primary" />}
            title="Create Gift"
            description="Create custom gift with any amount and send them to anyone with a wallet address."
          />
          <FeatureCard
            icon={<Zap className="h-12 w-12 text-primary" />}
            title="Claim & Reclaim"
            description="Recipients can claim gifts instantly, or you can reclaim unclaimed gifts."
          />
        </div>
      </section>

      <section className="py-12 md:py-24 mesh-bg">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-4 gradient-text">
                Track All Your Gifts
              </h2>
              <p className="text-muted-foreground mb-6">
                Our dashboard gives you a complete overview of all gifts you've created and claimed. Monitor their
                status, claim new gifts, and reclaim unclaimed gifts all in one place.
              </p>
              <Button asChild size="lg" className="glow-border">
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            </div>
            <Card className="overflow-hidden border-0 crypto-card glow-card">
              <CardContent className="p-0">
                <img src="/card.jpg?height=400&width=600" alt="Dashboard preview" className="w-full h-auto" />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="container py-12 md:py-24 text-center">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-4 gradient-text">Ready to Get Started?</h2>
        <p className="text-muted-foreground md:w-2/3 mx-auto mb-8">
          Connect your wallet now and start creating blockchain gifts in seconds.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {/* <Button size="lg" variant="default" className="glow-border">
            Connect Wallet
          </Button> */}
          <Button size="lg" variant="outline" asChild>
            <Link href="/gift">Learn More</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
