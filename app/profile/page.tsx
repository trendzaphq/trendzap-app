"use client"

import { Navigation } from "@/components/navigation"
import { UserBets } from "@/components/user-bets"
import { UserMarkets } from "@/components/user-markets"
import { GradientAvatar, getAddressGradient } from "@/components/user-profile"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePrivy, useWallets } from "@privy-io/react-auth"
import { useMarketList } from "@/hooks/use-market"
import { Copy, ExternalLink, CheckCircle2, Zap, TrendingUp, BarChart3, Wallet } from "lucide-react"
import { useState, useEffect } from "react"
import { createPublicClient, http, formatEther } from "viem"
import { avalanche } from "viem/chains"
import { RPC_URL } from "@/lib/contracts"

function ProfileHero() {
  const { user, authenticated } = usePrivy()
  const { wallets } = useWallets()
  const { markets } = useMarketList()
  const [copied, setCopied] = useState(false)

  const address = wallets[0]?.address ?? ""
  const email = user?.email?.address
  const displayName = email
    ? email.split("@")[0]
    : address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : "Anonymous"
  const initials = displayName.slice(0, 2).toUpperCase()
  const [bannerC1, bannerC2] = getAddressGradient(address)
  const [balance, setBalance] = useState<string | null>(null)
  const [winRate, setWinRate] = useState<string | null>(null)

  useEffect(() => {
    if (!address) return
    const client = createPublicClient({ chain: avalanche, transport: http(RPC_URL) })
    client.getBalance({ address: address as `0x${string}` }).then((b) => setBalance(formatEther(b))).catch(() => {})
  }, [address])

  useEffect(() => {
    if (!address) return
    fetch(`/api/bets?address=${address}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) return
        const history: { result: string }[] = data.history ?? []
        if (history.length === 0) { setWinRate("—"); return }
        const wins = history.filter((b) => b.result === "won").length
        setWinRate(`${Math.round((wins / history.length) * 100)}%`)
      })
      .catch(() => {})
  }, [address])

  const myMarkets = address
    ? markets.filter((m) => m.creator?.toLowerCase() === address.toLowerCase())
    : []
  const totalVolume = myMarkets
    .reduce((sum, m) => sum + parseFloat(m.totalVolume || "0"), 0)
    .toFixed(3)

  const copyAddress = () => {
    if (!address) return
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-border/40 bg-card shadow-sm">
      {/* Gradient banner */}
      <div
        className="h-28 sm:h-36 relative"
        style={{ background: `linear-gradient(135deg, ${bannerC1}60, ${bannerC2}40)` }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_40%,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent" />
      </div>

      <div className="px-5 pb-6">
        {/* Avatar overlapping banner */}
        <div className="-mt-11 mb-4">
          <div
            className="inline-block rounded-full"
            style={{ padding: "3px", background: "hsl(var(--card))", boxShadow: "0 0 0 3px hsl(var(--card))" }}
          >
            {authenticated && address ? (
              <GradientAvatar address={address} initials={initials} size={80} />
            ) : (
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center text-2xl font-bold text-muted-foreground">
                ?
              </div>
            )}
          </div>
        </div>

        {/* Name */}
        <h1 className="text-xl font-bold leading-tight mb-1">
          {authenticated ? (email || displayName) : "Not connected"}
        </h1>

        {/* Address */}
        {address ? (
          <div className="flex items-center gap-2 mb-5">
            <span className="text-xs text-muted-foreground font-mono tracking-tight">
              {address.slice(0, 10)}…{address.slice(-6)}
            </span>
            <button
              onClick={copyAddress}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Copy address"
            >
              {copied
                ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                : <Copy className="h-3.5 w-3.5" />}
            </button>
            <a
              href={`https://snowtrace.io/address/${address}`}
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="View on Snowtrace"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        ) : !authenticated ? (
          <p className="text-xs text-muted-foreground mb-5">Connect wallet to view your profile</p>
        ) : (
          <div className="mb-5" />
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-muted/30 border border-border/30">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-lg font-bold font-mono tabular-nums">{myMarkets.length}</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Created</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-muted/30 border border-border/30">
            <BarChart3 className="h-4 w-4 text-secondary" />
            <span className="text-lg font-bold font-mono tabular-nums">{totalVolume}</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Vol USDC</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-muted/30 border border-border/30">
            <Wallet className="h-4 w-4 text-emerald-400" />
            <span className="text-lg font-bold font-mono tabular-nums">
              {balance !== null ? parseFloat(balance).toFixed(3) : "—"}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Balance</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-muted/30 border border-border/30">
            <Zap className="h-4 w-4 text-accent" />
            <span className="text-lg font-bold font-mono">{winRate ?? "—"}</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Win Rate</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />

      <main className="flex-1 pb-24 md:pb-8">
        <div className="container mx-auto px-4 py-5 max-w-2xl space-y-5">
          <ProfileHero />

          <Tabs defaultValue="bets" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="bets">My Bets</TabsTrigger>
              <TabsTrigger value="markets">My Markets</TabsTrigger>
            </TabsList>

            <TabsContent value="bets" className="mt-4">
              <UserBets />
            </TabsContent>

            <TabsContent value="markets" className="mt-4">
              <UserMarkets />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
