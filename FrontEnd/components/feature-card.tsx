import { Card, CardContent } from "@/components/ui/card"
import type { ReactNode } from "react"

interface FeatureCardProps {
  icon: ReactNode
  title: string
  description: string
}

export default function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <Card className="border-0 crypto-card crypto-card-hover glow-card">
      <CardContent className="pt-6">
        <div className="mb-4 bg-primary/10 p-3 rounded-full w-fit">{icon}</div>
        <h3 className="text-xl font-bold mb-2 gradient-text">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}
