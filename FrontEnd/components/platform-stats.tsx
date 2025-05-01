"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Users, Gift, Wallet, TrendingUp } from "lucide-react"

interface StatProps {
  icon: React.ReactNode
  value: number
  label: string
  prefix?: string
  suffix?: string
  duration?: number
}

const StatCard = ({ icon, value, label, prefix = "", suffix = "", duration = 2000 }: StatProps) => {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let start = 0
    const end = value
    const incrementTime = Math.floor(duration / end)
    let timer: NodeJS.Timeout

    // Don't run the animation if the component is not visible
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          timer = setInterval(() => {
            start += 1
            setCount(start)
            if (start >= end) clearInterval(timer)
          }, incrementTime)
        }
      },
      { threshold: 0.1 },
    )

    const element = document.getElementById(`stat-${label.replace(/\s+/g, "-").toLowerCase()}`)
    if (element) observer.observe(element)

    return () => {
      clearInterval(timer)
      if (element) observer.unobserve(element)
    }
  }, [value, label, duration])

  return (
    <div className="stat-card" id={`stat-${label.replace(/\s+/g, "-").toLowerCase()}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-value">
        {prefix}
        <span className="counter">{count.toLocaleString()}</span>
        {suffix}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

export default function PlatformStats() {
  return (
    <section className="py-16 mesh-bg">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-4 gradient-text">Platform Statistics</h2>
          <p className="text-muted-foreground md:w-2/3 mx-auto">
            Join thousands of users already creating and sharing blockchain gift on our platform.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard icon={<Gift className="h-6 w-6 text-white" />} value={12458} label="Gift Cards Created" />
          <StatCard icon={<Users className="h-6 w-6 text-white" />} value={5723} label="Active Users" />
          <StatCard icon={<Wallet className="h-6 w-6 text-white" />} value={9845} label="Cards Claimed" />
          <StatCard
            icon={<TrendingUp className="h-6 w-6 text-white" />}
            value={2456}
            label="ETH Transferred"
            prefix=""
            suffix="+"
          />
        </div>
      </div>
    </section>
  )
}
