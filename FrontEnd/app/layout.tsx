// app/layout.tsx
"use client"

import type React from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { Toaster } from "@/components/ui/toaster"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Web3AuthProvider } from "@web3auth/modal/react"
import { WagmiProvider } from "@web3auth/modal/react/wagmi"
import web3AuthContextConfig from "@/lib/web3authConfig"
import AppContent from "@/components/AppContent"

const inter = Inter({ subsets: ["latin"] })
const queryClient = new QueryClient()

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Web3AuthProvider config={web3AuthContextConfig}>
          <QueryClientProvider client={queryClient}>
            <WagmiProvider>
              <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
                <AppContent>
                  <div className="flex min-h-screen flex-col">
                    <Navbar />
                    <main className="flex-1">{children}</main>
                    <Footer />
                  </div>
                  <Toaster />
                </AppContent>
              </ThemeProvider>
            </WagmiProvider>
          </QueryClientProvider>
        </Web3AuthProvider>
      </body>
    </html>
  )
}