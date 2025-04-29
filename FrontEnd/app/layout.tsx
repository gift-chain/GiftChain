// app/layout.tsx
"use client"

import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { Toaster } from "@/components/ui/toaster"
import { WagmiProvider } from 'wagmi'
import { config } from '../hooks/createConfig'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AppContent from "@/components/AppContent" // Added import

const inter = Inter({ subsets: ["latin"] })
const queryClient = new QueryClient()

// export const metadata: Metadata = {
//   title: "Blockchain Gift Cards",
//   description: "Create, send, and claim gift cards on the blockchain",
//   generator: 'v0.dev'
// }

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
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
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  )
}