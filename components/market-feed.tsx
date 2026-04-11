"use client"

import { useState, useEffect, useRef } from "react"
import { MarketCard } from "@/components/market-card"
import { Loader2, TrendingUp } from "lucide-react"
import { useMarketList } from "@/hooks/use-market"

interface MarketMeta {
  market_id: number
  slug: string | null
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
  const seededRef = useRef<Set<number>>(new Set())

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

  // Auto-seed metadata (+ UUID slug) for any on-chain markets with no DB entry
  useEffect(() => {
    if (contractsLoading || onChainMarkets.length === 0) return
    const missing = onChainMarkets.filter(
      (m) => (!metaMap[m.id] || !metaMap[m.id].slug) && !seededRef.current.has(m.id)
    )
    if (missing.length === 0) return
    missing.forEach((m) => seededRef.current.add(m.id))
    Promise.all(
      missing.map((m) =>
        fetch("/api/markets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ market_id: m.id, title: null }),
        })
          .then((r) => r.json())
          .then((data: { ok: boolean; slug?: string }) => ({ id: m.id, slug: data.slug ?? null }))
          .catch(() => null)
      )
    ).then((results) => {
      setMetaMap((prev) => {
        const updated = { ...prev }
        results.forEach((r) => {
          if (r?.slug) updated[r.id] = { market_id: r.id, slug: r.slug, title: null, thumbnail_url: null }
        })
        return updated
      })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractsLoading, onChainMarkets.length, Object.keys(metaMap).length])

  const now = Math.floor(Date.now() / 1000)

  const liveMarkets = onChainMarkets
    .filter((m) => m.status === "ACTIVE" && m.endTime > now)
    .map((m) => {
      const meta = metaMap[m.id]
      return {
        id: meta?.slug ?? String(m.id),
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
