"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import WalletConnect from "@/components/wallet-connect";
import { Gift, Wallet } from "lucide-react"
import { motion } from 'framer-motion';
import { useAccount } from "wagmi";

const MotionGift = motion(Gift);

export default function HeroSection() {
  const [isHovered, setIsHovered] = useState(false)
  const { isConnected } = useAccount()
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <section className="relative pt-24 pb-12 md:pt-32 md:pb-24 mesh-bg overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-30"></div>

      {/* Animated background elements */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
      <div
        className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-secondary/20 rounded-full blur-3xl animate-pulse"
        style={{ animationDelay: "1s" }}
      ></div>

      <div className="container flex flex-col items-center text-center relative z-10">
        <div className="relative mb-8">
          <div
            className="absolute inset-0 rounded-full bg-primary/30 blur-3xl opacity-70"
            style={{ transform: "scale(0.8)" }}
          />
          <div
            className="relative bg-background/20 rounded-full p-4 border-2 border-primary/40 glass glow-border"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* <Gift
              className={`h-12 w-12 text-primary transition-transform duration-300 ${isHovered ? "scale-110" : "scale-100"}`}
            /> */}
            <MotionGift
              className="h-12 w-12 text-primary"
              // animate={{ scale: isHovered ? 1.1 : 1 }}
              // transition={{ duration: 0.3, ease: 'easeInOut' }}
              animate={{ y: [0, -10, 0] }} // up 10px, then back to 0
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            // style={{ width: '150px', height: 'auto' }}
            />
          </div>
        </div>

        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl mb-6">
          Blockchain Gifts
          <span className="text-primary glow-text"> Reimagined</span>
        </h1>

        <p className="text-xl text-muted-foreground max-w-[42rem] mb-8">
          Create, send, and claim gifts on the blockchain. A secure and modern way to share value with anyone,
          anywhere.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          {isConnected ? (
            <>
              <Button size="lg" variant="outline" className="border-primary/50 hover:border-primary" asChild>
                <Link href="/gift">
                  <Gift className="h-5 w-5 mr-2" />
                  Create Gift
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-primary/50 hover:border-primary" asChild>
                <Link href="/dashboard">
                  <Gift className="h-5 w-5 mr-2" />
                  Dashboard
                </Link>
              </Button>
            </>
            ) : (
            <>
              <Button size="lg" onClick={() => setIsModalOpen(true)} className="gap-2 glow-border" asChild>
                <Link href="">
                  <Wallet className="h-5 w-5" />
                  Connect Wallet
                </Link>
              </Button>
              {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                  <WalletConnect handleModal={() => setIsModalOpen(false)} />
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </section>
  )

}
