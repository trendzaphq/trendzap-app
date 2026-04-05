import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { PrivyClientProvider } from "@/components/providers/privy-provider"
import { CreateMarketFab } from "@/components/create-market-fab"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

// Force server-rendering on all routes — prevents build-time crash when NEXT_PUBLIC_* vars are absent
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "TrendZap - Bet on Viral Content",
  description: "The 8-second real-money prediction market for social content. Zap it before it pops.",
  icons: {
    icon: [
      {
        url: "/trendzap_logo.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/trendzap_logo.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/trendzap_logo.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`font-sans antialiased pb-16 md:pb-0`}>
        <PrivyClientProvider>
          {children}
          <CreateMarketFab />
          <MobileBottomNav />
        </PrivyClientProvider>
      </body>
    </html>
  )
}
