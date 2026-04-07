import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { PrivyClientProvider } from "@/components/providers/privy-provider"
import { CreateMarketFab } from "@/components/create-market-fab"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Toaster } from "sonner"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

// Force server-rendering on all routes — prevents build-time crash when NEXT_PUBLIC_* vars are absent
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  metadataBase: new URL("https://app.trendzap.xyz"),
  title: {
    default: "TrendZap — Bet on What Goes Viral",
    template: "%s | TrendZap",
  },
  description:
    "The prediction market for social media virality. Bet AVAX on whether X posts and YouTube videos hit engagement thresholds. On-chain, auto-resolved, instant payouts.",
  keywords: [
    "prediction market", "crypto betting", "viral content", "social media betting",
    "AVAX", "Avalanche", "TrendZap", "X Twitter bet", "YouTube viral", "DeFi",
  ],
  openGraph: {
    type: "website",
    url: "https://app.trendzap.xyz",
    siteName: "TrendZap",
    title: "TrendZap — Bet on What Goes Viral",
    description:
      "Prediction markets for viral content. Bet AVAX on X and YouTube posts, collect if you're right. 100% on-chain on Avalanche.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "TrendZap" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@trendzaphq",
    creator: "@trendzaphq",
    title: "TrendZap — Bet on What Goes Viral",
    description: "Prediction markets for viral content. Bet AVAX on X and YouTube posts.",
    images: ["/og-image.png"],
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: "/trendzap_logo.png", media: "(prefers-color-scheme: light)" },
      { url: "/trendzap_logo.png", media: "(prefers-color-scheme: dark)" },
      { url: "/icon.svg", type: "image/svg+xml" },
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
          <Toaster
            theme="dark"
            position="top-right"
            richColors
            closeButton
            toastOptions={{
              classNames: {
                toast: "font-sans",
              },
            }}
          />
        </PrivyClientProvider>
      </body>
    </html>
  )
}
