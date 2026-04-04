"use client"

import { useWallets } from "@privy-io/react-auth"
import { useMarketList } from "@/hooks/use-market"
import { Card } from "@/components/ui/card"
import { TrendingUp, Target, Zap, BarChart3 } from "lucide-react"

export function UserStats() {
  const { wallets } = useWallets()
  const { markets } = useMarketList()
  const address = wallets[0]?.address

  const marketsCreated = address
    ? markets.filter((m) => m.creator?.toLowerCase() === address.toLowerCase()).length
    : 0

  const totalVolume = address
    ? markets
        .filter((m) => m.creator?.toLowerCase() === address.toLowerCase())
        .reduce((sum, m) => sum + parseFloat(m.totalVolume || "0"), 0)
        .toFixed(3)
    : "0.000"

  const stats = [
    { label: "Markets Created", value: String(marketsCreated), icon: TrendingUp, color: "text-primary" },
    { label: "Volume (AVAX)", value: totalVolume, icon: BarChart3, color: "text-secondary" },
    { label: "Win Rate", value: "—", icon: Target, color: "text-accent" },
    { label: "Total Bets", value: "—", icon: Zap, color: "text-muted-foreground" },
  ]

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Stats</h3>
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center space-y-2">
            <stat.icon className={`h-5 w-5 mx-auto ${stat.color}`} />
            <div className="text-2xl font-bold font-mono">{stat.value}</div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground text-center mt-4">Win rate & bets require indexer</p>
    </Card>
  )
}
