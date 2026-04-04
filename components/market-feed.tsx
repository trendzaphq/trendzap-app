"use client"

import { useState, useEffect } from "react"
import { MarketCard } from "@/components/market-card"
import { Button } from "@/components/ui/button"
import { Loader2, TrendingUp } from "lucide-react"
import { useMarketList } from "@/hooks/use-market"

interface MarketMeta {
  market_id: number
  title: string | null
  thumbnail_url: string | null
}

interface MarketFeedProps {
  title?: string
  description?: string
  platform?: string
}

export function MarketFeed({
  title = "Live Markets",
  description = "Trending predictions ending soon",
  platform = "",
}: MarketFeedProps) {
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
      title: meta?.title || `${m.postUrl.slice(0, 60)}... — Will it hit ${Number(m.threshold).toLocaleString()} ${m.metricType}?`,
      metric: m.metricType.charAt(0).toUpperCase() + m.metricType.slice(1),
      threshold: Number(m.threshold),
      currentValue: 0,
      overPool: m.priceOver,
      underPool: m.priceUnder,
      totalBets: 0,
      endsIn: formatTimeRemaining(m.endTime),
      creator: m.creator.slice(0, 8) + "...",
      volume: m.totalVolume,
    }
  })

  const displayMarkets = platform
    ? liveMarkets.filter((m) => m.platform === platform)
    : liveMarkets

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Button variant="outline" size="sm">
          {"View All"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contractsLoading ? (
          <div className="col-span-full flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : displayMarkets.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 gap-4 text-muted-foreground">
            <TrendingUp className="h-12 w-12 opacity-30" />
            <p className="text-lg font-medium">{platform ? `No ${platform.toUpperCase()} markets yet` : "No markets yet"}</p>
            <p className="text-sm">Be the first to create a prediction market.</p>
          </div>
        ) : (
          displayMarkets.map((market, index) => (
            <MarketCard key={`${market.id}-${index}`} {...market} />
          ))
        )}
      </div>
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
