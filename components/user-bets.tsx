"use client"

import { useEffect, useState } from "react"
import { useWallets } from "@privy-io/react-auth"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, TrendingDown, CheckCircle2, XCircle, Loader2 } from "lucide-react"

interface ActiveBet {
  id: string
  market_id: number
  title: string
  position: "over" | "under"
  amount: string
  tx_hash: string
}

interface HistoryBet {
  id: string
  market_id: number
  title: string
  position: "over" | "under"
  amount: string
  result: "won" | "lost"
  payout: string
  tx_hash: string
}

export function UserBets() {
  const { wallets } = useWallets()
  const address = wallets[0]?.address

  const [active, setActive] = useState<ActiveBet[]>([])
  const [history, setHistory] = useState<HistoryBet[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!address) return
    setLoading(true)
    fetch(`/api/bets?address=${address}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setActive(data.active)
          setHistory(data.history)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [address])

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">My Bets</h3>

      {!address ? (
        <p className="text-sm text-muted-foreground text-center py-8">Connect wallet to view your bets</p>
      ) : (
        <Tabs defaultValue="active">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : active.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No active bets</p>
            ) : active.map((bet) => (
              <div
                key={bet.id}
                className="p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm">{bet.title}</h4>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
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
                    <span className="font-mono font-semibold">{bet.amount} AVAX</span>
                  </div>
                  <a
                    href={`https://snowtrace.io/tx/${bet.tx_hash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-muted-foreground hover:text-primary underline"
                  >
                    View tx
                  </a>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="history" className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No resolved bets yet</p>
            ) : history.map((bet) => (
              <div
                key={bet.id}
                className={`p-4 rounded-lg border ${
                  bet.result === "won" ? "border-primary/20 bg-primary/5" : "border-destructive/20 bg-destructive/5"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {bet.result === "won" ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                    <h4 className="font-semibold text-sm">{bet.title}</h4>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
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
                    <span className="font-mono">{bet.amount} AVAX</span>
                  </div>
                  <div className={`font-mono font-semibold ${bet.result === "won" ? "text-primary" : "text-destructive"}`}>
                    {bet.result === "won" ? `+${bet.payout}` : `-${bet.amount}`} AVAX
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      )}
    </Card>
  )
}
