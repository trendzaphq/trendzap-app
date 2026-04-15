"use client"

import { useEffect, useState } from "react"
import { useWallets } from "@privy-io/react-auth"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import {
  TrendingUp,
  TrendingDown,
  Zap,
  BarChart3,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react"

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

interface ActiveBet {
  id: string
  market_id: number
  title: string
  position: "over" | "under"
  amount: string
  tx_hash: string
}

interface PnLPoint {
  idx: number
  label: string
  pnl: number       // per-bet P&L
  cumulative: number
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: {value: number; name: string}[] }) {
  if (!active || !payload?.length) return null
  const pnl = payload.find((p) => p.name === "cumulative")?.value ?? 0
  return (
    <div className="bg-card border border-border/60 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className={`font-mono font-semibold ${pnl >= 0 ? "text-emerald-400" : "text-destructive"}`}>
        {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)} USDC
      </p>
    </div>
  )
}

export function PortfolioView() {
  const { wallets } = useWallets()
  const address = wallets[0]?.address

  const [history, setHistory] = useState<HistoryBet[]>([])
  const [active, setActive] = useState<ActiveBet[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!address) return
    setLoading(true)
    fetch(`/api/bets?address=${address}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setHistory(data.history ?? [])
          setActive(data.active ?? [])
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [address])

  // Compute stats
  const wins = history.filter((b) => b.result === "won")
  const losses = history.filter((b) => b.result === "lost")
  const totalWon = wins.reduce((s, b) => s + parseFloat(b.payout || "0"), 0)
  const resolvedStaked = history.reduce((s, b) => s + parseFloat(b.amount || "0"), 0)
  const netPnl = totalWon - resolvedStaked
  const winRate = history.length > 0 ? Math.round((wins.length / history.length) * 100) : null
  const activeStaked = active.reduce((s, b) => s + parseFloat(b.amount || "0"), 0)
  const totalStaked = resolvedStaked + activeStaked
  const totalBets = history.length + active.length
  const avgBet = totalBets > 0 ? totalStaked / totalBets : 0
  const hasHistory = history.length > 0

  // Build cumulative PnL chart data
  const chartData: PnLPoint[] = history.reduce<PnLPoint[]>((acc, bet, i) => {
    const pnl =
      bet.result === "won"
        ? parseFloat(bet.payout || "0") - parseFloat(bet.amount || "0")
        : -parseFloat(bet.amount || "0")
    const prev = acc[acc.length - 1]?.cumulative ?? 0
    return [
      ...acc,
      {
        idx: i + 1,
        label: bet.title?.slice(0, 14) || `Bet ${i + 1}`,
        pnl,
        cumulative: parseFloat((prev + pnl).toFixed(4)),
      },
    ]
  }, [])

  // Prepend origin point
  const chartWithOrigin =
    chartData.length > 0
      ? [{ idx: 0, label: "Start", pnl: 0, cumulative: 0 }, ...chartData]
      : []

  const isPositive = netPnl >= 0

  if (!address) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-muted-foreground">Connect wallet to view your portfolio</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3">
        {/* Net PnL — full width highlight */}
        <div
          className={`col-span-2 flex items-center justify-between p-4 rounded-xl border ${
            !hasHistory
              ? "bg-muted/30 border-border/30"
              : isPositive
              ? "bg-emerald-500/10 border-emerald-500/20"
              : "bg-destructive/10 border-destructive/20"
          }`}
        >
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              {hasHistory ? "Net P&L" : "Realized P&L"}
            </p>
            <p
              className={`text-2xl font-bold font-mono tabular-nums ${
                !hasHistory
                  ? "text-muted-foreground"
                  : isPositive
                  ? "text-emerald-400"
                  : "text-destructive"
              }`}
            >
              {hasHistory ? (isPositive ? "+" : "") + netPnl.toFixed(2) + " USDC" : "No resolved bets yet"}
            </p>
          </div>
          {!hasHistory ? (
            <BarChart3 className="h-8 w-8 text-muted-foreground/40" />
          ) : isPositive ? (
            <TrendingUp className="h-8 w-8 text-emerald-400/60" />
          ) : (
            <TrendingDown className="h-8 w-8 text-destructive/60" />
          )}
        </div>

        <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-muted/30 border border-border/30">
          <Zap className="h-4 w-4 text-primary" />
          <span className="text-lg font-bold font-mono tabular-nums">
            {winRate !== null ? `${winRate}%` : "—"}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Win Rate</span>
          <span className="text-[10px] text-muted-foreground">
            {wins.length}W · {losses.length}L
          </span>
        </div>

        <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-muted/30 border border-border/30">
          <BarChart3 className="h-4 w-4 text-secondary" />
          <span className="text-lg font-bold font-mono tabular-nums">
            {totalStaked.toFixed(2)}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Staked</span>
          <span className="text-[10px] text-muted-foreground">
            {totalBets} bet{totalBets !== 1 ? "s" : ""} · avg {avgBet.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Active positions badge */}
      {active.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/20">
          <span className="text-xs font-medium">
            <span className="text-primary font-bold">{active.length}</span> active position{active.length !== 1 ? "s" : ""}
          </span>
          <span className="text-xs font-mono text-primary font-semibold">
            {activeStaked.toFixed(2)} USDC at risk
          </span>
        </div>
      )}

      {/* Cumulative PnL chart */}
      {loading ? (
        <Card className="p-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </Card>
      ) : chartWithOrigin.length >= 2 ? (
        <Card className="p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Cumulative P&L
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartWithOrigin} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="pnlGradientPos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="pnlGradientNeg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="idx" hide />
              <YAxis
                width={44}
                tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(v) => `${v > 0 ? "+" : ""}${v.toFixed(0)}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="4 2" strokeWidth={1} />
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke={isPositive ? "#10b981" : "#ef4444"}
                strokeWidth={2}
                fill={isPositive ? "url(#pnlGradientPos)" : "url(#pnlGradientNeg)"}
                dot={false}
                activeDot={{ r: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      ) : history.length === 0 && !loading ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted-foreground">No completed bets yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Your P&L chart will appear after your first resolved bet.</p>
        </Card>
      ) : null}

      {/* Recent bets breakdown */}
      {history.length > 0 && (
        <Card className="p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Recent Results
          </p>
          <div className="space-y-2">
            {history.slice(0, 8).map((bet) => {
              const pnl =
                bet.result === "won"
                  ? parseFloat(bet.payout || "0") - parseFloat(bet.amount || "0")
                  : -parseFloat(bet.amount || "0")
              return (
                <div key={bet.id} className="flex items-center gap-3 text-sm">
                  {bet.result === "won" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                  )}
                  <span className="flex-1 truncate text-xs text-muted-foreground">{bet.title}</span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] py-0 h-4 shrink-0 ${
                      bet.position === "over"
                        ? "border-primary/30 text-primary"
                        : "border-destructive/30 text-destructive"
                    }`}
                  >
                    {bet.position}
                  </Badge>
                  <span
                    className={`font-mono text-xs font-semibold shrink-0 w-16 text-right ${
                      pnl >= 0 ? "text-emerald-400" : "text-destructive"
                    }`}
                  >
                    {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
