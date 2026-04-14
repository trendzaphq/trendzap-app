"use client"

import { useEffect, useState } from "react"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"
import { Loader2 } from "lucide-react"

interface OddsChartProps {
  marketId: number
  threshold?: number
  /** Current on-chain prices (0-100) — used as seed when DB has < 2 points */
  seedPriceOver?: number
  seedPriceUnder?: number
}

interface PricePoint {
  id: number
  block_number: string
  price_over: number
  price_under: number
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card/95 border border-border/60 rounded-lg p-3 shadow-xl backdrop-blur-sm text-xs">
      <div className="flex gap-3">
        <span className="text-primary font-semibold">{payload[0]?.value?.toFixed(1)}% Over</span>
        <span className="text-destructive font-semibold">{payload[1]?.value?.toFixed(1)}% Under</span>
      </div>
    </div>
  )
}

export function OddsChart({ marketId, threshold, seedPriceOver, seedPriceUnder }: OddsChartProps) {
  const [data, setData] = useState<PricePoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchHistory = () =>
      fetch(`/api/markets/${marketId}/price-history`)
        .then((r) => r.json())
        .then((d) => { if (d.ok) setData(d.points) })
        .catch(() => {})

    // Show cached data immediately
    fetchHistory().finally(() => setLoading(false))

    // Trigger recent-only indexer sync in background, then refresh chart data
    fetch("/api/indexer/sync?recent=true")
      .then(() => fetchHistory())
      .catch(() => {})
  }, [marketId])

  if (loading) {
    return (
      <div className="h-48 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // If DB has < 2 points but we have current on-chain prices, synthesize seed points
  // so the chart renders immediately rather than showing the "after first trade" message.
  const chartData: PricePoint[] =
    data.length >= 2
      ? data
      : seedPriceOver != null && seedPriceUnder != null
      ? [
          { id: 0, block_number: "seed-0", price_over: seedPriceOver, price_under: seedPriceUnder },
          { id: 1, block_number: "seed-1", price_over: seedPriceOver, price_under: seedPriceUnder },
        ]
      : []

  if (chartData.length < 2) {
    return (
      <div className="h-48 flex items-center justify-center text-muted-foreground">
        <p className="text-sm">Odds chart available after first trade</p>
      </div>
    )
  }

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="overGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="underGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <XAxis dataKey="block_number" hide />
          <YAxis domain={[0, 100]} hide />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={50} stroke="hsl(var(--border))" strokeDasharray="4 4" />
          <Area
            type="monotone"
            dataKey="price_over"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#overGradient)"
            name="Over"
          />
          <Area
            type="monotone"
            dataKey="price_under"
            stroke="hsl(var(--destructive))"
            strokeWidth={2}
            fill="url(#underGradient)"
            name="Under"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
