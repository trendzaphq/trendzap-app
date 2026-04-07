"use client"

import { Button } from "@/components/ui/button"
import { Share2 } from "lucide-react"

interface ShareToXProps {
  marketId: number | string
  title: string
  platform?: string
  metric?: string
  threshold?: number
  betAmount?: string
  position?: "over" | "under"
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
}

export function ShareToX({
  marketId,
  title,
  platform,
  metric,
  threshold,
  betAmount,
  position,
  variant = "outline",
  size = "sm",
}: ShareToXProps) {
  const buildTweet = () => {
    const url = `https://app.trendzap.xyz/market/${marketId}`
    if (betAmount && position) {
      const icon = platform === "tiktok" ? "🎵" : platform === "youtube" ? "📺" : platform === "instagram" ? "📸" : "🐦"
      return `I just bet ${betAmount} USDC ${position.toUpperCase()} on this hitting ${threshold?.toLocaleString()} ${metric} ${icon}\n\nPredicting viral content on @TrendZap_xyz 🔮⚡\n\n${url} #TrendZap #Web3`
    }
    const shortTitle = title.length > 80 ? title.slice(0, 77) + "..." : title
    return `Just spotted on @TrendZap_xyz:\n\n"${shortTitle}"\n\nBet on whether this goes viral 🎯⚡\n\n${url} #TrendZap #PredictionMarket`
  }

  const handleShare = () => {
    const tweet = buildTweet()
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`, "_blank", "width=600,height=400")
  }

  return (
    <Button variant={variant} size={size} onClick={handleShare} className="gap-2">
      <Share2 className="h-4 w-4" />
      Share
    </Button>
  )
}
