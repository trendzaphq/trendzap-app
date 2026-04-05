"use client"

import { useState, useEffect, useRef } from "react"
import { useWallets } from "@privy-io/react-auth"
import { Bell, TrendingUp, TrendingDown, CheckCircle2, Circle, ExternalLink } from "lucide-react"
import Link from "next/link"

interface Notification {
  id: string
  market_id: number
  title: string
  won: boolean
  outcome: "OVER" | "UNDER"
  position: "OVER" | "UNDER"
  bet_avax: number
  payout_avax: number
  claimed: boolean
  resolved_at: number
  message: string
}

export function NotificationsBell() {
  const { wallets } = useWallets()
  const address = wallets[0]?.address
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const unread = notifications.filter((n) => n.won).length

  useEffect(() => {
    if (!address) return
    setLoading(true)
    fetch(`/api/notifications?address=${address}`)
      .then((r) => r.json())
      .then((d) => { if (d.ok) setNotifications(d.notifications) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [address])

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  if (!address) return null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex items-center justify-center h-9 w-9 rounded-md text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-accent text-[10px] font-bold flex items-center justify-center text-accent-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border/60 bg-card shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
            <span className="text-sm font-semibold">Notifications</span>
            {notifications.length > 0 && (
              <span className="text-xs text-muted-foreground">{notifications.length} markets resolved</span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No resolved markets yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Bet on markets to see results here</p>
              </div>
            ) : (
              notifications.map((n) => (
                <NotificationItem key={n.id} n={n} onClose={() => setOpen(false)} />
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="border-t border-border/40 px-4 py-2.5">
              <Link
                href="/profile?tab=bets"
                className="text-xs text-primary hover:text-primary/80 transition-colors"
                onClick={() => setOpen(false)}
              >
                View all bets →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function NotificationItem({ n, onClose }: { n: Notification; onClose: () => void }) {
  const timeAgo = formatTimeAgo(n.resolved_at)

  return (
    <Link
      href={`/market/${n.market_id}`}
      onClick={onClose}
      className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors border-b border-border/20 last:border-0 group"
    >
      {/* Icon */}
      <div className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 mt-0.5 ${
        n.won ? "bg-green-500/10" : "bg-muted/50"
      }`}>
        {n.position === "OVER" ? (
          <TrendingUp className={`h-4 w-4 ${n.won ? "text-green-500" : "text-muted-foreground"}`} />
        ) : (
          <TrendingDown className={`h-4 w-4 ${n.won ? "text-green-500" : "text-muted-foreground"}`} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium line-clamp-2 text-foreground">{n.title}</p>
          <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
        </div>

        <div className="flex items-center gap-2 mt-1">
          {n.won ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-green-500/15 text-green-500 px-1.5 py-0.5 rounded">
              <CheckCircle2 className="h-2.5 w-2.5" />
              Won
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-muted/50 text-muted-foreground px-1.5 py-0.5 rounded">
              <Circle className="h-2.5 w-2.5" />
              Lost
            </span>
          )}
          <span className="text-[10px] text-muted-foreground">
            {n.position} • bet {n.bet_avax.toFixed(3)} AVAX
          </span>
        </div>

        {n.won && n.payout_avax > 0 && (
          <p className="text-[10px] text-green-500 font-semibold mt-0.5">
            +{n.payout_avax.toFixed(4)} AVAX{n.claimed ? " (claimed)" : " — claim now →"}
          </p>
        )}

        <p className="text-[10px] text-muted-foreground/60 mt-0.5">{timeAgo}</p>
      </div>
    </Link>
  )
}

function formatTimeAgo(unix: number): string {
  const diff = Math.floor(Date.now() / 1000) - unix
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}
