"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Wallet, AlertCircle, Zap } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useConnect } from 'wagmi';

interface WalletConnectProps {
  onConnect: (address: string) => void
}

export default function WalletConnect({ handleModal }: { handleModal: () => void }) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState("")
  const { connectors, connect } = useConnect();


  // const handleModal = () => {
  //   setModal((prev) => !prev)
  // }

  const handleConnect = async () => {

    // Prevent clicks inside the modal from closing it
    const stopPropagation = (e: React.MouseEvent) => {
      e.stopPropagation();
    };
    // setIsConnecting(true)
    setError("")

    // try {
    //   // Simulate wallet connection
    //   await new Promise((resolve) => setTimeout(resolve, 1500))

    //   // Mock wallet address
    //   const mockAddress = "0x" + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("")

    //   onConnect(mockAddress)
    // } catch (err) {
    //   setError("Failed to connect wallet. Please try again.")
    // } finally {
    //   setIsConnecting(false)
    // }
  }

  return (
    <div className="container flex items-center justify-center min-h-[100vh] hexagon-bg">
      <div className="absolute inset-0 grid-bg opacity-30"></div>
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
      <div
        className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-secondary/20 rounded-full blur-3xl animate-pulse"
        style={{ animationDelay: "1s" }}
      ></div>

      <Card className="w-full max-w-md crypto-card glow-card border-0">
        <CardHeader>
          <CardTitle className="text-2xl text-center gradient-text">Connect Your Wallet</CardTitle>
          <CardDescription className="text-center">Connect your blockchain wallet to access your gift cards and dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )} */}

          {connectors.map((connector) => (
            <div className="rounded-lg border border-primary/30 p-4 flex items-center gap-4 cursor-pointer hover:bg-primary/10 transition-colors" key={connector.id}
              onClick={() => {
                connect({ connector });
                handleModal();
                console.log(connector)
              }}>
              <div className="bg-primary/20 p-2 rounded-full">
                <img src={connector.icon} className="w-6 h-6" alt="" />
              </div>
              <div>
                {/* <h3 className="font-medium">MetaMask</h3> */}

                <p className="text-lg text-muted-foreground">{connector.name}</p>
              </div>
            </div>
          ))}
          {/* {connectors.map((connector) => (
            <button
              key={connector.id}
              onClick={() => {
                connect({ connector })}}
              className="flex items-center gap-3 px-4 py-3 bg-[#2A1F7A] hover:bg-[#3B2A9B] text-white font-semibold rounded-lg transition-colors duration-200"
            >
              <img src={connector.icon} className="w-6 h-6" alt="" />
              {connector.name}
            </button>
          ))} */}



          {/* <div className="rounded-lg border border-primary/30 p-4 flex items-center gap-4 cursor-pointer hover:bg-primary/10 transition-colors">
            <div className="bg-primary/20 p-2 rounded-full">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">WalletConnect</h3>
              <p className="text-sm text-muted-foreground">Scan with your mobile wallet</p>
            </div>
          </div>

          <div className="rounded-lg border border-primary/30 p-4 flex items-center gap-4 cursor-pointer hover:bg-primary/10 transition-colors">
            <div className="bg-primary/20 p-2 rounded-full">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">Coinbase Wallet</h3>
              <p className="text-sm text-muted-foreground">Connect using Coinbase Wallet</p>
            </div>
          </div> */}
        </CardContent>
        <CardFooter>
          <Button className="w-full glow-border bg-red-900 hover:bg-red-800" onClick={handleModal}>
            Cancel Connection
          </Button>
          {/* <Button className="w-full glow-border" onClick={handleConnect} disabled={isConnecting}>
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </Button> */}
        </CardFooter>
      </Card>
    </div>
  )
}
