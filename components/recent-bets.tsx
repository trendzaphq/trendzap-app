"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown } from "lucide-react"

interface Bet {
  address: string
  short: string
  avatar: string
  position: "over" | "under"
  amount: string
  time: string | null
  tx_hash: string
}

export function RecentBets({ marketId }: { marketId: string }) {
  const [bets, setBets] = useState<Bet[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!marketId) return
    fetch(`/api/markets/${marketId}/bets`)
      .then((r) => r.json())
      .then((d) => { if (d.ok) setBets(d.bets) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [marketId])

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Recent Bets</h3>
      {loading ? (
        <div className="text-sm text-muted-foreground text-center py-4">Loading…</div>
      ) : bets.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-6">
          No bets yet — be the first to Zap it!
        </div>
      ) : (
        <div className="space-y-3">
          {bets.map((bet, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <Avatar className="h-10 w-10 border-2 border-primary/20">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">{bet.avatar}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{bet.short}</span>
                  <Badge
                    variant="outline"
                    className={`gap-1 ${
                      bet.position === "over"
                        ? "border-primary/30 text-primary"
                        : "border-destructive/30 text-destructive"
                    }`}
                  >
                    {bet.position === "over" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {bet.position}
                  </Badge>
                </div>
                {bet.time && <div className="text-xs text-muted-foreground">{bet.time}</div>}
              </div>
              <div className="text-right">
                <div className="font-mono font-semibold">${bet.amount}</div>
                <div className="text-xs text-muted-foreground">USDC</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
