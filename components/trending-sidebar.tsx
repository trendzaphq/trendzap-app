"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Flame, TrendingUp, TrendingDown, Loader2 } from "lucide-react"
import { useMarketList } from "@/hooks/use-market"

interface TrendingMarket {
  id: string
  title: string
  overPool: number
  underPool: number
  volume: string
  platform: string
}

const PLATFORM_DOT: Record<string, string> = {
  tiktok: "bg-[#FF0050]",
  youtube: "bg-[#FF0000]",
  x: "bg-[#1DA1F2]",
  instagram: "bg-[#E1306C]",
}

export function TrendingSidebar() {
  const { markets, loading } = useMarketList()
  const [metaMap, setMetaMap] = useState<Record<number, { title: string | null }>>({})

  useEffect(() => {
    fetch("/api/markets")
      .then((r) => r.json())
      .then((rows: Array<{ market_id: number; title: string | null }>) => {
        const map: Record<number, { title: string | null }> = {}
        rows.forEach((r) => { map[r.market_id] = { title: r.title } })
        setMetaMap(map)
      })
      .catch(() => {})
  }, [])

  const trending: TrendingMarket[] = markets
    .map((m) => ({
      id: String(m.id),
      title: metaMap[m.id]?.title || `Market #${m.id}`,
      overPool: m.priceOver,
      underPool: m.priceUnder,
      volume: m.totalVolume,
      platform: m.platform,
    }))
    .sort((a, b) => parseFloat(b.volume) - parseFloat(a.volume))
    .slice(0, 6)

  return (
    <aside className="hidden xl:flex flex-col gap-4 w-56 shrink-0 sticky top-[6.5rem] self-start h-fit pb-10">
      <div className="flex items-center gap-2">
        <Flame className="h-4 w-4 text-accent" />
        <span className="text-sm font-semibold">Trending</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : trending.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">No markets yet</p>
      ) : (
        <div className="space-y-2">
          {trending.map((m, i) => {
            const overPct = Math.round(m.overPool) || 50
            const underPct = Math.round(m.underPool) || 50
            const dot = PLATFORM_DOT[m.platform] || "bg-primary"
            return (
              <Link
                key={m.id}
                href={`/market/${m.id}`}
                className="block p-3 rounded-xl border border-border/40 hover:border-primary/30 hover:bg-muted/20 transition-all group"
              >
                <div className="flex items-start gap-2">
                  <span className="text-[11px] font-bold text-muted-foreground mt-0.5 w-4 shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
                      <p className="text-xs font-medium line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                        {m.title}
                      </p>
                    </div>
                    {/* Mini odds */}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[11px] font-bold text-primary flex items-center gap-0.5">
                        <TrendingUp className="h-2.5 w-2.5" />
                        {overPct}%
                      </span>
                      <span className="text-[11px] font-bold text-destructive flex items-center gap-0.5">
                        <TrendingDown className="h-2.5 w-2.5" />
                        {underPct}%
                      </span>
                      {parseFloat(m.volume) > 0 && (
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {parseFloat(m.volume).toFixed(2)}Ξ
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* New market CTA */}
      <div className="mt-2 p-3 rounded-xl bg-primary/5 border border-primary/15 text-center">
        <p className="text-xs text-muted-foreground mb-2">See a trend blowing up?</p>
        <p className="text-xs font-semibold text-primary">Create a market →</p>
      </div>
    </aside>
  )
}
