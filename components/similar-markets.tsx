"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"
import Link from "next/link"
import { useMarketList } from "@/hooks/use-market"

const PLATFORM_NAMES = ["x", "youtube", "tiktok", "instagram"]

function getTimeLeft(endTime: number): string {
  const secs = endTime - Math.floor(Date.now() / 1000)
  if (secs <= 0) return "Ended"
  if (secs < 3600) return `${Math.floor(secs / 60)}m`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`
  return `${Math.floor(secs / 86400)}d ${Math.floor((secs % 86400) / 3600)}h`
}

export function SimilarMarkets({ platform, currentMarketId }: { platform: number; currentMarketId: number }) {
  const { markets } = useMarketList()
  const [titles, setTitles] = useState<Record<number, string>>({})

  // Fetch market titles from DB metadata
  useEffect(() => {
    fetch("/api/markets")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && Array.isArray(d.markets)) {
          const map: Record<number, string> = {}
          for (const m of d.markets) map[m.market_id] = m.title
          setTitles(map)
        }
      })
      .catch(() => {})
  }, [])

  const similar = markets
    .filter((m) => m.platform === platform && m.id !== currentMarketId && m.status === "active")
    .sort((a, b) => parseFloat(b.totalVolume) - parseFloat(a.totalVolume))
    .slice(0, 3)

  if (similar.length === 0) return null

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Similar Markets</h3>
      <div className="space-y-3">
        {similar.map((market) => {
          const platformName = PLATFORM_NAMES[market.platform]?.toUpperCase() ?? "X"
          const title = titles[market.id] || `Market #${market.id}`
          const timeLeft = getTimeLeft(market.endTime)
          const pool = parseFloat(market.totalVolume).toFixed(2)
          return (
            <Link key={market.id} href={`/market/${market.id}`}>
              <div className="p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Badge variant="outline" className="shrink-0">{platformName}</Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {timeLeft}
                  </div>
                </div>
                <h4 className="text-sm font-medium mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                  {title}
                </h4>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Pool</span>
                  <span className="font-mono font-semibold">${pool} USDC</span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </Card>
  )
}
