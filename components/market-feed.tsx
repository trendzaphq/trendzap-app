"use client"

import { useState } from "react"
import { MarketCard } from "@/components/market-card"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useMarketList } from "@/hooks/use-market"

// Mock markets shown when contracts aren't deployed yet
const MOCK_MARKETS = [
  {
    id: "1",
    platform: "tiktok" as const,
    thumbnail: "/viral-dance-tiktok.jpg",
    title: "Epic dance trend taking over FYP - Will it hit 10M views?",
    metric: "Views",
    threshold: 10000000,
    currentValue: 4235000,
    overPool: 12500,
    underPool: 8300,
    totalBets: 234,
    endsIn: "18h 32m",
    creator: "trendmaster",
  },
  {
    id: "2",
    platform: "youtube" as const,
    thumbnail: "/tech-review-youtube.jpg",
    title: "iPhone 16 Review - Can it reach 5M views in 24h?",
    metric: "Views",
    threshold: 5000000,
    currentValue: 2847000,
    overPool: 23400,
    underPool: 15600,
    totalBets: 512,
    endsIn: "6h 15m",
    creator: "cryptowhale",
  },
  {
    id: "3",
    platform: "x" as const,
    thumbnail: "/viral-tweet-tech.jpg",
    title: "Breaking AI news thread - Will it get 50K likes?",
    metric: "Likes",
    threshold: 50000,
    currentValue: 28430,
    overPool: 8900,
    underPool: 12100,
    totalBets: 189,
    endsIn: "12h 48m",
    creator: "aispeculator",
  },
  {
    id: "4",
    platform: "instagram" as const,
    thumbnail: "/fashion-reel-instagram.jpg",
    title: "New fashion trend Reel - Will it reach 3M views?",
    metric: "Views",
    threshold: 3000000,
    currentValue: 1524000,
    overPool: 15200,
    underPool: 9800,
    totalBets: 376,
    endsIn: "23h 12m",
    creator: "fashionista",
  },
  {
    id: "5",
    platform: "tiktok" as const,
    thumbnail: "/cooking-recipe-viral.jpg",
    title: "Viral pasta recipe - Can it hit 20M views this week?",
    metric: "Views",
    threshold: 20000000,
    currentValue: 8920000,
    overPool: 18700,
    underPool: 14300,
    totalBets: 445,
    endsIn: "4d 8h",
    creator: "foodiepro",
  },
  {
    id: "6",
    platform: "youtube" as const,
    thumbnail: "/gaming-highlight-youtube.jpg",
    title: "Insane gaming clutch - Will it break 1M views?",
    metric: "Views",
    threshold: 1000000,
    currentValue: 687000,
    overPool: 6700,
    underPool: 5300,
    totalBets: 167,
    endsIn: "1d 4h",
    creator: "gamerdegen",
  },
]

interface MarketFeedProps {
  title?: string
  description?: string
}

export function MarketFeed({
  title = "Live Markets",
  description = "Trending predictions ending soon",
}: MarketFeedProps) {
  const { markets: onChainMarkets, loading: contractsLoading } = useMarketList()
  const [mockPage, setMockPage] = useState(1)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // If contracts are deployed and have markets, show real data
  const hasRealMarkets = onChainMarkets.length > 0

  // Convert on-chain markets to the card format
  const liveMarkets = hasRealMarkets
    ? onChainMarkets.map((m) => ({
        id: String(m.id),
        platform: m.platform as "tiktok" | "youtube" | "x" | "instagram",
        thumbnail: "",
        title: `${m.postUrl.slice(0, 50)}... — Will it hit ${Number(m.threshold).toLocaleString()} ${m.metricType}?`,
        metric: m.metricType.charAt(0).toUpperCase() + m.metricType.slice(1),
        threshold: Number(m.threshold),
        currentValue: 0,
        overPool: Math.round(parseFloat(m.totalVolume) * (m.priceOver / 100) * 1000),
        underPool: Math.round(parseFloat(m.totalVolume) * (m.priceUnder / 100) * 1000),
        totalBets: 0,
        endsIn: formatTimeRemaining(m.endTime),
        creator: m.creator.slice(0, 8) + "...",
      }))
    : MOCK_MARKETS.slice(0, mockPage * 6)

  const loadMore = () => {
    setIsLoadingMore(true)
    setTimeout(() => {
      setMockPage((p) => p + 1)
      setIsLoadingMore(false)
    }, 500)
  }

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
        ) : (
          liveMarkets.map((market, index) => (
            <MarketCard key={`${market.id}-${index}`} {...market} />
          ))
        )}
      </div>

      {!hasRealMarkets && (
        <div className="flex justify-center">
          <Button variant="outline" size="lg" className="gap-2 bg-transparent" onClick={loadMore} disabled={isLoadingMore}>
            {isLoadingMore ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {"Loading..."}
              </>
            ) : (
              <>{"Load More Markets"}</>
            )}
          </Button>
        </div>
      )}
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
