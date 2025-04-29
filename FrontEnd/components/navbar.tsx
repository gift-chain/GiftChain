"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Gift, Menu, Zap } from "lucide-react"
import { usePathname } from "next/navigation"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useAccount, useDisconnect } from "wagmi"
import WalletConnect from "./wallet-connect"

export default function Navbar() {
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false)
  const [modal, setModal] = useState<boolean>(false)

  const { disconnect } = useDisconnect()
  const { address, isConnected } = useAccount()

  const handleModal = () => {
    setModal((prev) => !prev)
  }

  const isActive = (path: string) => pathname === path

  const navItems = [
    { name: "Home", path: "/" },
    { name: "Dashboard", path: "/dashboard" },
    { name: "Create", path: "/create" },
    { name: "Reclaim", path: "/how-it-works" },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-primary/20 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-primary/20 p-1.5 rounded-full">
              <Gift className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold text-xl hidden sm:inline-block gradient-text">GiftChain</span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`text-sm font-medium transition-colors hover:text-primary ${isActive(item.path) ? "text-primary" : "text-muted-foreground"
                }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          {isConnected ? (
            <Button onClick={() => disconnect()}>{`Disconnect Wallet ${address?.slice(0, 6)}...${address?.slice(-4)}`}</Button>
          ) : (
            <Button asChild className="hidden md:flex glow-border cursor-pointer" onClick={() => setModal(true)} >
              <div>
                <Zap className="h-4 w-4 mr-2" />
                Connect Wallet
              </div>
            </Button>
          )}

          {/* <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px] glass border-primary/30">
              <nav className="flex flex-col gap-4 mt-8">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={`text-lg font-medium transition-colors hover:text-primary ${isActive(item.path) ? "text-primary" : "text-muted-foreground"
                      }`}
                  >
                    {item.name}
                  </Link>
                ))}
                <Button className="mt-4 glow-border" asChild>
                  <Link href="/dashboard" onClick={() => setIsMenuOpen(false)}>
                    <Zap className="h-4 w-4 mr-2" />
                    Connect Wallet
                  </Link>
                </Button>
              </nav>
            </SheetContent>
          </Sheet> */}
        </div>
      </div>
      {modal && <WalletConnect handleModal={handleModal} />}
    </header>
  )
}
