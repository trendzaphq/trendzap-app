"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  Share2,
  ExternalLink,
  Activity,
  BarChart3,
  Zap,
  Loader2,
  Trophy,
} from "lucide-react"
import { useMarket, useBuyShares, useClaimWinnings, useUserPosition } from "@/hooks/use-market"
import { formatEther } from "viem"
import { EXPLORER_URL } from "@/lib/contracts"

function formatTimeRemaining(endTimeUnix: number): string {
  const now = Math.floor(Date.now() / 1000)
  const diff = endTimeUnix - now
  if (diff <= 0) return "Ended"
  const hours = Math.floor(diff / 3600)
  const minutes = Math.floor((diff % 3600) / 60)
  if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`
  return `${hours}h ${minutes}m`
}

interface MarketDetailViewProps {
  marketId: string
}

export function MarketDetailView({ marketId }: MarketDetailViewProps) {
  const numericId = parseInt(marketId, 10)
  const { market: onChainMarket, loading: marketLoading, refetch } = useMarket(numericId)
  const { buyShares, txHash, loading: buyLoading, error: buyError } = useBuyShares()
  const { claim, loading: claimLoading } = useClaimWinnings()
  const position = useUserPosition(numericId)

  const [betAmount, setBetAmount] = useState("")
  const [selectedPosition, setSelectedPosition] = useState<"over" | "under" | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [meta, setMeta] = useState<{ title: string | null; thumbnail_url: string | null } | null>(null)

  useEffect(() => {
    fetch(`/api/markets/${numericId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setMeta(data) })
      .catch(() => {})
  }, [numericId])

  // Fallback mock data for when contracts aren't deployed yet
  const mockMarket = {
    platform: "tiktok",
    thumbnail: "/viral-dance-tiktok.jpg",
    title: "Epic dance trend taking over FYP - Will it hit 10M views?",
    metric: "Views",
    threshold: 10000000,
    currentValue: 4235000,
    overPool: 12500,
    underPool: 8300,
    totalBets: 234,
    endsIn: "18h 32m",
    endsAt: new Date(Date.now() + 18 * 60 * 60 * 1000),
    creator: "trendmaster",
    sourceUrl: "https://tiktok.com/@user/video/123",
  }

  // Derive display values from on-chain data or fallback to mock
  const isLive = !!onChainMarket
  const market = isLive
    ? {
        platform: onChainMarket.platform,
        thumbnail: meta?.thumbnail_url || "",
        title: meta?.title || `Will ${onChainMarket.postUrl} hit ${Number(onChainMarket.threshold).toLocaleString()} ${onChainMarket.metricType}?`,
        metric: onChainMarket.metricType.charAt(0).toUpperCase() + onChainMarket.metricType.slice(1),
        threshold: Number(onChainMarket.threshold),
        currentValue: 0, // live metric from oracle — not on-chain
        overPool: onChainMarket.priceOver,
        underPool: onChainMarket.priceUnder,
        totalBets: 0,
        endsIn: formatTimeRemaining(onChainMarket.endTime),
        endsAt: new Date(onChainMarket.endTime * 1000),
        creator: onChainMarket.creator,
        sourceUrl: onChainMarket.postUrl,
        totalVolume: onChainMarket.totalVolume,
        poolBalance: onChainMarket.poolBalance,
        status: onChainMarket.status,
        outcome: onChainMarket.outcome,
      }
    : { ...mockMarket, totalVolume: "0", poolBalance: "0", status: "ACTIVE", outcome: "NONE" }

  // Pool percentages — for live markets use LMSR prices (priceOver % / priceUnder %)
  const totalPool = market.overPool + market.underPool || 1
  const overPercentage = isLive ? market.overPool : (market.overPool / totalPool) * 100
  const underPercentage = isLive ? market.underPool : (market.underPool / totalPool) * 100

  const calculatePayout = () => {
    if (!betAmount || !selectedPosition) return 0
    const amount = Number.parseFloat(betAmount)
    if (isLive) {
      // LMSR: approximate payout = amount / price * 0.97
      const price = selectedPosition === "over" ? market.overPool / 100 : market.underPool / 100
      return price > 0 ? (amount / price) * 0.97 : 0
    }
    if (selectedPosition === "over") {
      return amount * (totalPool / market.overPool) * 0.97
    } else {
      return amount * (totalPool / market.underPool) * 0.97
    }
  }

  const placeBet = async () => {
    if (!betAmount || !selectedPosition) return
    if (isLive) {
      try {
        await buyShares(numericId, selectedPosition === "over", betAmount)
        setShowSuccess(true)
        refetch()
        setTimeout(() => setShowSuccess(false), 5000)
      } catch {
        // error is already captured in buyError
      }
    } else {
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    }
  }

  const handleClaim = async () => {
    await claim(numericId)
    refetch()
  }

  const isResolved = market.status === "RESOLVED"
  const hasWinningPosition =
    position &&
    ((market.outcome === "OVER" && position.overShares > 0n) ||
      (market.outcome === "UNDER" && position.underShares > 0n))

  if (marketLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Content Preview */}
      <Card className="overflow-hidden">
        <div className="relative h-96">
          <img src={market.thumbnail || "/placeholder.svg"} alt={market.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />

          <Badge
            className={`absolute top-4 left-4 bg-gradient-to-r ${
              {
                tiktok: "from-[#FF0050] to-[#00F2EA]",
                youtube: "from-[#FF0000] to-[#FF8800]",
                x: "from-[#1DA1F2] to-[#14171A]",
                instagram: "from-[#E1306C] to-[#FCAF45]",
              }[market.platform as string] ?? "from-primary to-secondary"
            } text-white border-0 font-semibold`}
          >
            {market.platform.toUpperCase()}
          </Badge>

          <Button
            variant="outline"
            size="sm"
            className="absolute top-4 right-4 gap-2 bg-background/80 backdrop-blur-sm"
            asChild
          >
            <a href={market.sourceUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              {"View Original"}
            </a>
          </Button>

          <div className="absolute bottom-6 left-6 right-6">
            <h1 className="text-2xl font-bold mb-3 text-foreground drop-shadow-lg">{market.title}</h1>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-foreground">
                <Clock className="h-4 w-4 text-accent" />
                <span className="font-mono drop-shadow">{market.endsIn}</span>
              </div>
              <div className="flex items-center gap-1 text-foreground">
                <Users className="h-4 w-4 text-secondary" />
                <span className="drop-shadow">{market.totalBets} bets</span>
              </div>
              <div className="flex items-center gap-1 text-foreground">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="font-mono drop-shadow">
                  {isLive ? `${parseFloat(market.totalVolume).toFixed(3)} AVAX` : `$${totalPool.toLocaleString()}`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Market Stats & Betting */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Stats Card */}
        <Card className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">{"Market Question"}</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{"Metric"}</span>
                <span className="font-semibold">{market.metric}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{"Current Value"}</span>
                <span className="font-mono font-bold text-lg">{market.currentValue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{"Threshold"}</span>
                <span className="font-mono font-bold text-lg text-primary">{market.threshold.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-border">
                <span className="text-muted-foreground">{"Progress"}</span>
                <span className="font-semibold">{((market.currentValue / market.threshold) * 100).toFixed(1)}%</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-4 h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                style={{ width: `${Math.min((market.currentValue / market.threshold) * 100, 100)}%` }}
              />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">{"Pool Distribution"}</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-primary font-semibold flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    {"Over"}
                  </span>
                  <span className="font-mono">{isLive ? `${market.overPool}%` : `$${market.overPool.toLocaleString()}`}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${overPercentage}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground mt-1">{overPercentage.toFixed(1)}%</div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-destructive font-semibold flex items-center gap-1">
                    <TrendingDown className="h-4 w-4" />
                    {"Under"}
                  </span>
                  <span className="font-mono">{isLive ? `${market.underPool}%` : `$${market.underPool.toLocaleString()}`}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-destructive transition-all duration-500"
                    style={{ width: `${underPercentage}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground mt-1">{underPercentage.toFixed(1)}%</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Betting Card */}
        <Card className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">{"Place Your Bet"}</h3>

            {showSuccess && (
              <div className="mb-4 p-4 bg-primary/10 border border-primary/20 rounded-lg animate-slide-up">
                <div className="flex items-center gap-2 text-primary">
                  <Zap className="h-5 w-5 fill-primary" />
                  <span className="font-semibold">{"Bet placed successfully!"}</span>
                </div>
                {txHash && (
                  <a
                    href={`${EXPLORER_URL}/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground underline mt-1 block"
                  >
                    View on Explorer
                  </a>
                )}
              </div>
            )}

            {buyError && (
              <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <span className="text-destructive text-sm">{buyError.slice(0, 120)}</span>
              </div>
            )}

            {/* Claim Winnings for resolved markets */}
            {isResolved && hasWinningPosition && (
              <div className="mb-4 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-primary">You won! Claim your winnings.</span>
                </div>
                <Button onClick={handleClaim} disabled={claimLoading} className="w-full gap-2">
                  {claimLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
                  Claim Winnings
                </Button>
              </div>
            )}

            {/* User Position */}
            {position && (position.overShares > 0n || position.underShares > 0n) && (
              <div className="mb-4 p-3 bg-muted/50 rounded-lg border border-border">
                <div className="text-xs text-muted-foreground mb-1">Your Position</div>
                {position.overShares > 0n && (
                  <div className="flex justify-between text-sm">
                    <span className="text-primary font-semibold">Over Shares</span>
                    <span className="font-mono">{formatEther(position.overShares)}</span>
                  </div>
                )}
                {position.underShares > 0n && (
                  <div className="flex justify-between text-sm">
                    <span className="text-destructive font-semibold">Under Shares</span>
                    <span className="font-mono">{formatEther(position.underShares)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Position Selection */}
            <div className="space-y-3 mb-6">
              <Label>{"Select Position"}</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedPosition("over")}
                  className={`group relative p-4 rounded-lg border-2 transition-all ${
                    selectedPosition === "over"
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50 hover:bg-primary/5"
                  }`}
                >
                  <div className="text-center space-y-2">
                    <TrendingUp
                      className={`h-8 w-8 mx-auto transition-colors ${
                        selectedPosition === "over" ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                    <div className="font-bold">{"Over"}</div>
                    <div className="text-xs text-muted-foreground">{overPercentage.toFixed(0)}% pool</div>
                  </div>
                </button>

                <button
                  onClick={() => setSelectedPosition("under")}
                  className={`group relative p-4 rounded-lg border-2 transition-all ${
                    selectedPosition === "under"
                      ? "border-destructive bg-destructive/10"
                      : "border-border hover:border-destructive/50 hover:bg-destructive/5"
                  }`}
                >
                  <div className="text-center space-y-2">
                    <TrendingDown
                      className={`h-8 w-8 mx-auto transition-colors ${
                        selectedPosition === "under" ? "text-destructive" : "text-muted-foreground"
                      }`}
                    />
                    <div className="font-bold">{"Under"}</div>
                    <div className="text-xs text-muted-foreground">{underPercentage.toFixed(0)}% pool</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-3">
              <Label htmlFor="bet-amount">{isLive ? "Bet Amount (AVAX)" : "Bet Amount (USDC)"}</Label>
              <div className="relative">
                <Input
                  id="bet-amount"
                  type="number"
                  placeholder="0.1"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  className="text-lg font-mono h-12"
                />
              </div>
              <div className="flex gap-2">
                {[0.1, 0.5, 1, 2].map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-transparent"
                    onClick={() => setBetAmount(amount.toString())}
                  >
                    {amount} AVAX
                  </Button>
                ))}
              </div>
            </div>

            {/* Payout Calculation */}
            {betAmount && selectedPosition && (
              <div className="p-4 bg-muted/50 rounded-lg space-y-2 border border-border animate-slide-up">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{"Your bet"}</span>
                  <span className="font-mono font-semibold">{isLive ? `${betAmount} AVAX` : `$${betAmount} USDC`}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{"Position"}</span>
                  <span
                    className={`font-semibold ${selectedPosition === "over" ? "text-primary" : "text-destructive"}`}
                  >
                    {selectedPosition === "over" ? "Over" : "Under"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{"Potential payout"}</span>
                  <span className="font-mono font-semibold text-primary">
                    {isLive ? `${calculatePayout().toFixed(4)} AVAX` : `$${calculatePayout().toFixed(2)} USDC`}
                  </span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-border">
                  <span className="text-muted-foreground">{"Platform fee (3%)"}</span>
                  <span className="font-mono text-xs">{(Number.parseFloat(betAmount) * 0.03).toFixed(4)} AVAX</span>
                </div>
              </div>
            )}

            <Button
              className="w-full gap-2 h-12 text-base font-semibold"
              size="lg"
              disabled={!betAmount || !selectedPosition || buyLoading || isResolved}
              onClick={placeBet}
            >
              {buyLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Zap className="h-5 w-5 fill-current" />
              )}
              {buyLoading ? "Placing Bet..." : isResolved ? "Market Resolved" : "Zap It!"}
            </Button>

            <Button variant="ghost" className="w-full gap-2" size="sm">
              <Share2 className="h-4 w-4" />
              {"Share Market"}
            </Button>
          </div>
        </Card>
      </div>

      {/* Activity Tabs */}
      <Card className="p-6">
        <Tabs defaultValue="activity">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="activity" className="gap-2">
              <Activity className="h-4 w-4" />
              {"Activity"}
            </TabsTrigger>
            <TabsTrigger value="chart" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              {"Chart"}
            </TabsTrigger>
            <TabsTrigger value="info" className="gap-2">
              <Users className="h-4 w-4" />
              {"Info"}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="activity" className="mt-6">
            <div className="text-center text-muted-foreground py-8">{"Live activity feed coming soon"}</div>
          </TabsContent>
          <TabsContent value="chart" className="mt-6">
            <div className="text-center text-muted-foreground py-8">{"Real-time chart coming soon"}</div>
          </TabsContent>
          <TabsContent value="info" className="mt-6">
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{"Market Creator"}</span>
                <span className="font-semibold font-mono text-sm">
                  {isLive ? `${market.creator.slice(0, 6)}...${market.creator.slice(-4)}` : `@${market.creator}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{"Status"}</span>
                <Badge variant={market.status === "ACTIVE" ? "default" : "secondary"}>
                  {market.status}
                </Badge>
              </div>
              {isLive && market.outcome !== "NONE" && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{"Outcome"}</span>
                  <span className={`font-semibold ${market.outcome === "OVER" ? "text-primary" : "text-destructive"}`}>
                    {market.outcome}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">{"Resolution"}</span>
                <span>{market.endsAt.toLocaleString()}</span>
              </div>
              {isLive && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{"Pool Balance"}</span>
                  <span className="font-mono">{parseFloat(market.poolBalance).toFixed(4)} AVAX</span>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}
