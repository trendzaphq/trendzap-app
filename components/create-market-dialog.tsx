"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Link2, Sparkles, TrendingUp, DollarSign, Loader2 } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { useWallets } from "@privy-io/react-auth"
import { parseEther } from "viem"
import { CONTRACTS, EXPLORER_URL } from "@/lib/contracts"

// Match ViralityMarketV2.sol enum order
const PLATFORM_MAP: Record<string, number> = { twitter: 0, x: 0, youtube: 1, tiktok: 2, instagram: 3 }
const METRIC_MAP: Record<string, number> = { likes: 0, views: 1, retweets: 2, comments: 3, shares: 4 }

export function CreateMarketDialog({ triggerClassName }: { triggerClassName?: string } = {}) {
  const { wallets } = useWallets()
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [previewData, setPreviewData] = useState<any>(null)
  const [step, setStep] = useState<"url" | "details" | "bet">("url")

  // Form state for market details
  const [metric, setMetric] = useState("views")
  const [threshold, setThreshold] = useState("")
  const [customTitle, setCustomTitle] = useState("")
  const [deadline, setDeadline] = useState("24h")
  const [betAmount, setBetAmount] = useState("0.1")
  const [selectedPosition, setSelectedPosition] = useState<"over" | "under">("over")
  const [creating, setCreating] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const analyzeUrl = async () => {
    setIsAnalyzing(true)
    let platform = "tiktok"
    if (url.includes("twitter.com") || url.includes("x.com")) platform = "twitter"
    else if (url.includes("youtube.com") || url.includes("youtu.be")) platform = "youtube"
    else if (url.includes("instagram.com")) platform = "instagram"

    try {
      const intelligenceUrl = process.env.NEXT_PUBLIC_INTELLIGENCE_URL
      const res = await fetch(`${intelligenceUrl}/analyze/trend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, platform }),
        signal: AbortSignal.timeout(8000),
      })
      const data = res.ok ? await res.json() : null
      setPreviewData({
        platform,
        thumbnail: data?.thumbnail_url || "",
        currentViews: data?.current_views ?? data?.views ?? 0,
        currentLikes: data?.current_likes ?? data?.likes ?? 0,
        suggestedTitle: data?.suggested_title || `Will this ${platform} content go viral?`,
      })
      if (data?.suggested_threshold) setThreshold(String(data.suggested_threshold))
    } catch {
      setPreviewData({ platform, thumbnail: "", currentViews: 0, currentLikes: 0, suggestedTitle: `Will this ${platform} content go viral?` })
    }
    setIsAnalyzing(false)
    setStep("details")
  }

  const getEndTimeUnix = (): bigint => {
    const now = Math.floor(Date.now() / 1000)
    const durations: Record<string, number> = { "1h": 3600, "6h": 21600, "24h": 86400, "3d": 259200, "7d": 604800 }
    return BigInt(now + (durations[deadline] || 86400))
  }

  const createMarket = async () => {
    const wallet = wallets[0]
    if (!wallet) { setError("Connect wallet first"); return }
    if (!threshold) { setError("Set a threshold"); return }

    setCreating(true)
    setError(null)
    setTxHash(null)

    try {
      const ethereumProvider = await wallet.getEthereumProvider()
      const { BrowserProvider, Interface: EthersInterface } = await import("ethers")
      const provider = new BrowserProvider(ethereumProvider)
      const signer = await provider.getSigner()

      const now = Math.floor(Date.now() / 1000)
      const durations: Record<string, number> = { "1h": 3600, "6h": 21600, "24h": 86400, "3d": 259200, "7d": 604800 }
      const duration = durations[deadline] || 86400
      const startTime = now + 60 // starts 1 minute from now
      const endTime = startTime + duration
      const resolutionTime = endTime + 300 // 5 min resolution buffer

      const iface = new EthersInterface([
        "function createMarket(tuple(string postUrl, uint8 platform, uint8 metricType, uint256 threshold, uint256 startTime, uint256 endTime, uint256 resolutionTime) params, uint256 initialBet, bool betOnOver) payable returns (uint256)",
      ])

      const params = {
        postUrl: url,
        platform: PLATFORM_MAP[previewData?.platform || "tiktok"] ?? 2,
        metricType: METRIC_MAP[metric] ?? 1,
        threshold: BigInt(threshold).toString(), // raw metric count, NOT wei
        startTime,
        endTime,
        resolutionTime,
      }

      const betWei = parseEther(betAmount || "0.01")

      const data = iface.encodeFunctionData("createMarket", [
        [params.postUrl, params.platform, params.metricType, params.threshold, params.startTime, params.endTime, params.resolutionTime],
        betWei.toString(),
        selectedPosition === "over",
      ])

      const tx = await signer.sendTransaction({
        to: CONTRACTS.market,
        data,
        value: betWei.toString(),
      })

      setTxHash(tx.hash)
      await tx.wait()

      // Get the market ID from nextMarketId (incremented on creation, so new market = nextMarketId - 1)
      try {
        const nextIdIface = new EthersInterface(["function nextMarketId() view returns (uint256)"])
        const nextIdResult = await provider.call({
          to: CONTRACTS.market,
          data: nextIdIface.encodeFunctionData("nextMarketId", []),
        })
        const nextId = nextIdIface.decodeFunctionResult("nextMarketId", nextIdResult)[0]
        const marketId = Number(nextId) - 1

        await fetch("/api/markets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            market_id: marketId,
            title: customTitle || previewData?.suggestedTitle || null,
            description: null,
            thumbnail_url: previewData?.thumbnail || null,
            creator_address: await signer.getAddress(),
          }),
        })
      } catch (e) {
        console.error("Failed to save market metadata:", e)
      }

      // Reset and close
      setTimeout(() => {
        setOpen(false)
        setStep("url")
        setUrl("")
        setPreviewData(null)
        setTxHash(null)
        setThreshold("")
        setCustomTitle("")
      }, 2000)
    } catch (err) {
      setError((err as Error).message?.slice(0, 150) || "Transaction failed")
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className={`gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold${triggerClassName ? ` ${triggerClassName}` : ""}`}>
          <Plus className="h-4 w-4" />
          {"Create Market"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{"Create a Market"}</DialogTitle>
          <DialogDescription>{"Turn any viral content into a prediction market in 8 seconds"}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2">
            <div className={`h-2 w-20 rounded-full ${step === "url" ? "bg-primary" : "bg-primary/30"}`} />
            <div className={`h-2 w-20 rounded-full ${step === "details" ? "bg-primary" : "bg-primary/30"}`} />
            <div className={`h-2 w-20 rounded-full ${step === "bet" ? "bg-primary" : "bg-primary/30"}`} />
          </div>

          {/* Step 1: URL Input */}
          {step === "url" && (
            <div className="space-y-4 animate-slide-up">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-2">
                  <Link2 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">{"Paste Content URL"}</h3>
                <p className="text-sm text-muted-foreground">{"Supports TikTok, YouTube, X, and Instagram"}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="url">{"Content URL"}</Label>
                <Input
                  id="url"
                  placeholder="https://tiktok.com/@user/video/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="text-base"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="gap-2 bg-transparent" disabled>
                  <img src="/placeholder.svg?height=16&width=16" alt="TikTok" className="h-4 w-4" />
                  {"TikTok"}
                </Button>
                <Button variant="outline" className="gap-2 bg-transparent" disabled>
                  <img src="/placeholder.svg?height=16&width=16" alt="YouTube" className="h-4 w-4" />
                  {"YouTube"}
                </Button>
                <Button variant="outline" className="gap-2 bg-transparent" disabled>
                  <img src="/placeholder.svg?height=16&width=16" alt="X" className="h-4 w-4" />
                  {"X / Twitter"}
                </Button>
                <Button variant="outline" className="gap-2 bg-transparent" disabled>
                  <img src="/placeholder.svg?height=16&width=16" alt="Instagram" className="h-4 w-4" />
                  {"Instagram"}
                </Button>
              </div>

              <Button className="w-full gap-2" size="lg" onClick={analyzeUrl} disabled={!url || isAnalyzing}>
                {isAnalyzing ? (
                  <>
                    <Sparkles className="h-5 w-5 animate-spin" />
                    {"Analyzing..."}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    {"Analyze & Continue"}
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Step 2: Market Details */}
          {step === "details" && previewData && (
            <div className="space-y-4 animate-slide-up">
              {/* Content Preview */}
              <div className="rounded-lg overflow-hidden border border-border">
                <div className="relative h-40">
                  <img
                    src={previewData.thumbnail || "/placeholder.svg"}
                    alt="Content preview"
                    className="w-full h-full object-cover"
                  />
                  <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground border-0">
                    {previewData.platform.toUpperCase()}
                  </Badge>
                </div>
                <div className="p-3 bg-card space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{"Current Views"}</span>
                    <span className="font-mono font-semibold">{previewData.currentViews.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{"Current Likes"}</span>
                    <span className="font-mono font-semibold">{previewData.currentLikes.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Market Details Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">{"Market Title (Optional)"}</Label>
                  <Textarea id="title" placeholder={previewData.suggestedTitle} rows={2} className="resize-none" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="metric">{"Metric"}</Label>
                    <Select value={metric} onValueChange={setMetric}>
                      <SelectTrigger id="metric">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="views">{"Views"}</SelectItem>
                        <SelectItem value="likes">{"Likes"}</SelectItem>
                        <SelectItem value="retweets">{"Retweets / Shares"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="threshold">{"Threshold"}</Label>
                    <Input
                      id="threshold"
                      type="number"
                      placeholder="1000000"
                      className="font-mono"
                      value={threshold}
                      onChange={(e) => setThreshold(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deadline">{"Resolution Time"}</Label>
                  <Select value={deadline} onValueChange={setDeadline}>
                    <SelectTrigger id="deadline">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1h">{"1 hour"}</SelectItem>
                      <SelectItem value="6h">{"6 hours"}</SelectItem>
                      <SelectItem value="24h">{"24 hours"}</SelectItem>
                      <SelectItem value="3d">{"3 days"}</SelectItem>
                      <SelectItem value="7d">{"7 days"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("url")} className="flex-1">
                  {"Back"}
                </Button>
                <Button onClick={() => setStep("bet")} className="flex-1 gap-2">
                  {"Continue"}
                  <TrendingUp className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Place Initial Bet */}
          {step === "bet" && (
            <div className="space-y-4 animate-slide-up">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-2">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">{"Place Your Bet"}</h3>
                <p className="text-sm text-muted-foreground">{"Choose your position and amount"}</p>
              </div>

              {/* Bet Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">{"Initial Bet Amount (AVAX)"}</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.1"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    className="pl-9 text-lg font-mono"
                  />
                </div>
                <div className="flex gap-2">
                  {["0.01", "0.05", "0.1", "0.5"].map((amount) => (
                    <Button key={amount} variant="outline" size="sm" className="flex-1 bg-transparent" onClick={() => setBetAmount(amount)}>
                      {amount} AVAX
                    </Button>
                  ))}
                </div>
              </div>

              {/* Position Selection */}
              <div className="space-y-2">
                <Label>{"Your Position"}</Label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setSelectedPosition("over")}
                    className={`group relative p-4 rounded-lg border-2 transition-all ${
                      selectedPosition === "over"
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50 hover:bg-primary/5"
                    }`}
                  >
                    <div className="text-center space-y-2">
                      <TrendingUp className={`h-8 w-8 mx-auto ${selectedPosition === "over" ? "text-primary" : "text-muted-foreground"}`} />
                      <div className="font-bold text-lg">{"Over"}</div>
                      <div className="text-xs text-muted-foreground">{"Will exceed threshold"}</div>
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
                      <TrendingUp className={`h-8 w-8 mx-auto rotate-180 ${selectedPosition === "under" ? "text-destructive" : "text-muted-foreground"}`} />
                      <div className="font-bold text-lg">{"Under"}</div>
                      <div className="text-xs text-muted-foreground">{"Will not exceed threshold"}</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Summary */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-2 border border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{"Your bet"}</span>
                  <span className="font-mono font-semibold">{betAmount || "0"} AVAX</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{"Position"}</span>
                  <span className={`font-semibold ${selectedPosition === "over" ? "text-primary" : "text-destructive"}`}>
                    {selectedPosition === "over" ? "Over" : "Under"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{"Threshold"}</span>
                  <span className="font-mono font-semibold">{threshold ? Number(threshold).toLocaleString() : "—"} {metric}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-border">
                  <span className="text-muted-foreground">{"Platform fee (3%)"}</span>
                  <span className="font-mono text-xs">{(Number(betAmount || 0) * 0.03).toFixed(4)} AVAX</span>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <span className="text-destructive text-sm">{error}</span>
                </div>
              )}

              {txHash && (
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <span className="text-primary text-sm font-semibold">Market created!</span>
                  <a
                    href={`${EXPLORER_URL}/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground underline block mt-1"
                  >
                    View on Explorer
                  </a>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("details")} className="flex-1">
                  {"Back"}
                </Button>
                <Button
                  className="flex-1 gap-2 bg-primary hover:bg-primary/90"
                  size="lg"
                  disabled={creating || !threshold}
                  onClick={createMarket}
                >
                  {creating ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Sparkles className="h-5 w-5" />
                  )}
                  {creating ? "Creating..." : "Create & Zap"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
