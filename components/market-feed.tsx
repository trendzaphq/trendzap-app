"use client"

import { useState, useEffect } from "react"
import { MarketCard } from "@/components/market-card"
import { Loader2, TrendingUp } from "lucide-react"
import { useMarketList } from "@/hooks/use-market"

interface MarketMeta {
  market_id: number
  title: string | null
  thumbnail_url: string | null
}

interface MarketFeedProps {
  platform?: string
  sortBy?: string
}

export function MarketFeed({ platform = "", sortBy = "newest" }: MarketFeedProps) {
  const { markets: onChainMarkets, loading: contractsLoading } = useMarketList()
  const [metaMap, setMetaMap] = useState<Record<number, MarketMeta>>({})

  useEffect(() => {
    fetch("/api/markets")
      .then((r) => r.json())
      .then((rows: MarketMeta[]) => {
        const map: Record<number, MarketMeta> = {}
        rows.forEach((r) => { map[r.market_id] = r })
        setMetaMap(map)
      })
      .catch(() => {})
  }, [])

  const liveMarkets = onChainMarkets.map((m) => {
    const meta = metaMap[m.id]
    return {
      id: String(m.id),
      platform: m.platform as "tiktok" | "youtube" | "x" | "instagram",
      thumbnail: meta?.thumbnail_url || "",
      title:
        meta?.title ||
        `Will ${m.postUrl.slice(0, 50)}... hit ${Number(m.threshold).toLocaleString()} ${m.metricType}?`,
      metric: m.metricType.charAt(0).toUpperCase() + m.metricType.slice(1),
      threshold: Number(m.threshold),
      currentValue: 0,
      overPool: m.priceOver,
      underPool: m.priceUnder,
      totalBets: 0,
      endsIn: formatTimeRemaining(m.endTime),
      endTime: m.endTime,
      creator: m.creator.slice(0, 8) + "...",
      volume: m.totalVolume,
    }
  })

  let displayMarkets = platform ? liveMarkets.filter((m) => m.platform === platform) : liveMarkets

  // Basic sort
  if (sortBy === "ending") {
    displayMarkets = [...displayMarkets].sort((a, b) => (a.endTime || 0) - (b.endTime || 0))
  } else if (sortBy === "volume") {
    displayMarkets = [...displayMarkets].sort(
      (a, b) => parseFloat(b.volume || "0") - parseFloat(a.volume || "0")
    )
  }

  if (contractsLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (displayMarkets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-muted-foreground">
        <TrendingUp className="h-12 w-12 opacity-20" />
        <p className="text-base font-medium">
          {platform ? `No ${platform.toUpperCase()} markets yet` : "No markets yet"}
        </p>
        <p className="text-sm opacity-70">Be the first to create a prediction market.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {displayMarkets.map((market, index) => (
        <MarketCard key={`${market.id}-${index}`} {...market} />
      ))}
    </div>
  )
}

function formatTimeRemaining(endTimeUnix: number): string {
  const now = Math.floor(Date.now() / 1000)
  const diff = endTimeUnix - now
  if (diff <= 0) return "Ended"
  const days = Math.floor(diff / 86400)
  const hours = Math.floor((diff % 86400) / 3600)
  const mins = Math.floor((diff % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}
