"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useWallets, usePrivy } from "@privy-io/react-auth"
import { parseEther } from "viem"
import { CONTRACTS, EXPLORER_URL } from "@/lib/contracts"
import {
  Link2, Sparkles, TrendingUp, TrendingDown, Zap, Loader2,
  CheckCircle2, AlertTriangle, Info, Clock,
  ArrowLeft, ArrowRight, ShieldCheck, ExternalLink
} from "lucide-react"

const PLATFORM_MAP: Record<string, number> = { twitter: 0, x: 0, youtube: 1, tiktok: 2, instagram: 3 }
const METRIC_MAP: Record<string, number> = { likes: 0, views: 1, retweets: 2, comments: 3, shares: 4 }
const METRIC_LABELS: Record<string, string> = { likes: "Likes", views: "Views", retweets: "Retweets / Shares", comments: "Comments", shares: "Shares" }

const DEADLINES = [
  { value: "1h", label: "1 hour" },
  { value: "6h", label: "6 hours" },
  { value: "24h", label: "24 hours" },
  { value: "3d", label: "3 days" },
  { value: "7d", label: "7 days" },
]

const DURATIONS: Record<string, number> = { "1h": 3600, "6h": 21600, "24h": 86400, "3d": 259200, "7d": 604800 }

type Step = "url" | "details" | "risk" | "bet" | "done"

interface PreviewData {
  platform: string
  suggestedTitle: string
  viralityAssessment?: string
  postText?: string
}

interface RiskData {
  risk_score: number
  risk_level: "low" | "medium" | "high"
  flags: string[]
  recommendation: string
}

const STEPS: { id: Step; label: string }[] = [
  { id: "url", label: "Post URL" },
  { id: "details", label: "Market Details" },
  { id: "risk", label: "Risk Check" },
  { id: "bet", label: "Seed Bet" },
]

export default function CreateMarketPage() {
  const router = useRouter()
  const { wallets } = useWallets()
  const { authenticated } = usePrivy()

  const [step, setStep] = useState<Step>("url")
  const [url, setUrl] = useState("")
  const [postText, setPostText] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [riskData, setRiskData] = useState<RiskData | null>(null)
  const [isCheckingRisk, setIsCheckingRisk] = useState(false)

  // Form fields
  const [customTitle, setCustomTitle] = useState("")
  const [metric, setMetric] = useState("views")
  const [threshold, setThreshold] = useState("")
  const [deadline, setDeadline] = useState("24h")
  const [betAmount, setBetAmount] = useState("0.1")
  const [selectedPosition, setSelectedPosition] = useState<"over" | "under">("over")

  // Tx state
  const [creating, setCreating] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const detectPlatform = (u: string): string => {
    if (u.includes("twitter.com") || u.includes("x.com")) return "x"
    if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube"
    if (u.includes("tiktok.com")) return "tiktok"
    if (u.includes("instagram.com")) return "instagram"
    return "x"
  }

  const analyzeUrl = async () => {
    setIsAnalyzing(true)
    setError(null)
    const platform = detectPlatform(url)
    const cleanUrl = url.split("?")[0]

    // If user pasted post text, send it to the AI for a title suggestion
    if (postText.trim().length > 10) {
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform, post_text: postText.trim(), url: cleanUrl }),
        })
        const data = res.ok ? await res.json() : null
        setPreview({
          platform,
          suggestedTitle: data?.suggested_title || `Will this ${platform.toUpperCase()} post go viral?`,
          viralityAssessment: data?.virality_assessment || undefined,
          postText: postText.trim(),
        })
      } catch {
        setPreview({
          platform,
          suggestedTitle: `Will this ${platform.toUpperCase()} post go viral?`,
          postText: postText.trim(),
        })
      }
    } else {
      // No post text — just detect platform and proceed
      setPreview({
        platform,
        suggestedTitle: `Will this ${platform.toUpperCase()} post go viral?`,
      })
    }

    setIsAnalyzing(false)
    setStep("details")
  }

  const checkRisk = async () => {
    setIsCheckingRisk(true)
    setRiskData(null)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_RISK_URL}/assess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          platform: preview?.platform,
          metric,
          threshold: Number(threshold),
          current_value: metric === "likes" ? preview?.currentLikes : preview?.currentViews,
        }),
        signal: AbortSignal.timeout(8000),
      })
      if (res.ok) {
        const data = await res.json()
        setRiskData(data)
      } else {
        setRiskData({ risk_score: 0, risk_level: "low", flags: [], recommendation: "approve" })
      }
    } catch {
      // Risk service unavailable — allow creation but note it
      setRiskData({ risk_score: 0, risk_level: "low", flags: ["Risk service unavailable — proceeding manually"], recommendation: "approve" })
    }
    setIsCheckingRisk(false)
  }

  const createMarket = async () => {
    const wallet = wallets[0]
    if (!wallet) { setError("Connect your wallet first"); return }
    if (!threshold) { setError("Threshold is required"); return }
    if (!preview) { setError("Please analyze a URL first"); return }

    setCreating(true)
    setError(null)

    try {
      const ethereumProvider = await wallet.getEthereumProvider()
      const { BrowserProvider, Interface: EthersInterface } = await import("ethers")
      const provider = new BrowserProvider(ethereumProvider)
      const signer = await provider.getSigner()

      const now = Math.floor(Date.now() / 1000)
      const duration = DURATIONS[deadline] || 86400
      const startTime = now + 60
      const endTime = startTime + duration
      const resolutionTime = endTime + 300

      const iface = new EthersInterface([
        "function createMarket(tuple(string postUrl, uint8 platform, uint8 metricType, uint256 threshold, uint256 startTime, uint256 endTime, uint256 resolutionTime) params, uint256 initialBet, bool betOnOver) payable returns (uint256)",
      ])

      const params = {
        postUrl: url,
        platform: PLATFORM_MAP[preview.platform] ?? 0,
        metricType: METRIC_MAP[metric] ?? 1,
        threshold: BigInt(threshold).toString(),
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
            title: customTitle || preview.suggestedTitle,
            description: null,
            thumbnail_url: preview.thumbnail || null,
            creator_address: await signer.getAddress(),
          }),
        })
      } catch (e) {
        console.error("Failed to save market metadata:", e)
      }

      setStep("done")
    } catch (err) {
      setError((err as Error).message?.slice(0, 200) || "Transaction failed")
    } finally {
      setCreating(false)
    }
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step)

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-6 max-w-6xl">

          {/* Page header */}
          <div className="mb-6 flex items-center gap-3">
            <button onClick={() => router.push("/")} className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Create a Prediction Market</h1>
              <p className="text-sm text-muted-foreground">Turn viral content into a prediction market in under a minute</p>
            </div>
          </div>

          {/* Step progress */}
          {step !== "done" && (
            <div className="mb-8">
              <div className="flex items-center gap-0">
                {STEPS.map((s, i) => (
                  <div key={s.id} className="flex items-center">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      i === stepIndex
                        ? "bg-primary text-primary-foreground"
                        : i < stepIndex
                        ? "bg-primary/20 text-primary"
                        : "bg-muted/40 text-muted-foreground"
                    }`}>
                      {i < stepIndex ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <span className="h-3.5 w-3.5 flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                      )}
                      <span className="hidden sm:inline">{s.label}</span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`h-px w-6 mx-1 ${i < stepIndex ? "bg-primary/40" : "bg-border/40"}`} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* LEFT: Form */}
            <div className="lg:col-span-3 space-y-4">

              {/* ─── STEP 1: URL ─── */}
              {step === "url" && (
                <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Link2 className="h-5 w-5 text-primary" />
                      <h2 className="text-lg font-semibold">Paste a social post URL</h2>
                    </div>
                    <p className="text-sm text-muted-foreground">We'll analyze the post and suggest market settings.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="url">Post URL</Label>
                    <Input
                      id="url"
                      placeholder="https://x.com/user/status/..."
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && url && analyzeUrl()}
                      className="h-11 text-base"
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Info className="h-3 w-3 shrink-0" />
                      Supports X (Twitter), soon more platforms will be unlock automatically as we expand.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="post-text">
                      Post text{" "}
                      <span className="text-muted-foreground font-normal">(optional — paste the tweet for AI title suggestion)</span>
                    </Label>
                    <Textarea
                      id="post-text"
                      placeholder="Paste the post content here for an AI-generated market title…"
                      rows={3}
                      className="resize-none text-sm"
                      value={postText}
                      onChange={(e) => setPostText(e.target.value)}
                    />
                  </div>

                  <Button
                    className="w-full h-11 gap-2 font-semibold"
                    onClick={analyzeUrl}
                    disabled={!url.trim() || isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <><Loader2 className="h-4 w-4 animate-spin" />Analyzing post…</>
                    ) : postText.trim().length > 10 ? (
                      <><Sparkles className="h-4 w-4" />Analyze &amp; Continue</>
                    ) : (
                      <><ArrowRight className="h-4 w-4" />Continue</>
                    )}
                  </Button>

                  {!authenticated && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-accent/10 border border-accent/20 text-xs text-accent">
                      <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      You'll need to connect your wallet to create a market and place the seed bet.
                    </div>
                  )}
                </div>
              )}

              {/* ─── STEP 2: DETAILS ─── */}
              {step === "details" && preview && (
                <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-5">
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold">Market Details</h2>
                    <p className="text-sm text-muted-foreground">Define exactly what people are predicting.</p>
                  </div>

                  {/* Show soft warning if live stats couldn't be fetched */}
                  {preview.viralityAssessment && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-foreground">
                      <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
                      <span>{preview.viralityAssessment}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="title">Market Question <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <Textarea
                      id="title"
                      placeholder={preview.suggestedTitle}
                      rows={2}
                      className="resize-none"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Leave blank to use the AI-suggested title.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="metric">Metric to track</Label>
                      <Select value={metric} onValueChange={setMetric}>
                        <SelectTrigger id="metric">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="views">Views</SelectItem>
                          <SelectItem value="likes">Likes</SelectItem>
                          <SelectItem value="retweets">Retweets / Shares</SelectItem>
                          <SelectItem value="comments">Comments</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="threshold">
                        Threshold
                        <span className="ml-1 text-xs text-muted-foreground font-normal">(raw count)</span>
                      </Label>
                      <Input
                        id="threshold"
                        type="number"
                        min="1"
                        placeholder="e.g. 1000000"
                        className="font-mono"
                        value={threshold}
                        onChange={(e) => setThreshold(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Threshold explainer */}
                  {threshold && Number(threshold) > 0 && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/40 text-xs text-muted-foreground">
                      <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
                      <span>
                        Predictors bet on whether the {METRIC_LABELS[metric] || "metric"} reaches{" "}
                        <strong className="text-foreground">{Number(threshold).toLocaleString()}</strong> by the deadline.
                        Set this above the post's current count to make it interesting.
                      </span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="deadline">Resolution deadline</Label>
                    <Select value={deadline} onValueChange={setDeadline}>
                      <SelectTrigger id="deadline">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DEADLINES.map((d) => (
                          <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground flex items-start gap-1">
                      <Clock className="h-3 w-3 shrink-0 mt-0.5" />
                      At the deadline, our oracle checks the actual metric value. If actual ≥ threshold, OVER wins. Otherwise UNDER wins.
                      A 5-minute resolution buffer is added automatically.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" onClick={() => setStep("url")} className="gap-2 bg-transparent">
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </Button>
                    <Button
                      className="flex-1 gap-2 font-semibold"
                      onClick={() => { setStep("risk"); checkRisk() }}
                      disabled={!threshold || Number(threshold) <= 0}
                    >
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ─── STEP 3: RISK CHECK ─── */}
              {step === "risk" && (
                <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                      <h2 className="text-lg font-semibold">Risk Assessment</h2>
                    </div>
                    <p className="text-sm text-muted-foreground">Checking your market for potential issues…</p>
                  </div>

                  {isCheckingRisk ? (
                    <div className="flex flex-col items-center gap-4 py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Analyzing market parameters…</p>
                    </div>
                  ) : riskData ? (
                    <div className="space-y-4">
                      {/* Risk badge */}
                      <div className={`flex items-center gap-3 p-4 rounded-xl border ${
                        riskData.risk_level === "high"
                          ? "border-destructive/30 bg-destructive/10"
                          : riskData.risk_level === "medium"
                          ? "border-accent/30 bg-accent/10"
                          : "border-green-500/30 bg-green-500/10"
                      }`}>
                        {riskData.risk_level === "high" ? (
                          <AlertTriangle className="h-6 w-6 text-destructive shrink-0" />
                        ) : riskData.risk_level === "medium" ? (
                          <AlertTriangle className="h-6 w-6 text-accent shrink-0" />
                        ) : (
                          <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0" />
                        )}
                        <div>
                          <p className="font-semibold capitalize text-sm">{riskData.risk_level} Risk</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Score: {riskData.risk_score}/100</p>
                        </div>
                        <div className="ml-auto">
                          <div className="text-right text-xs text-muted-foreground mb-1">Risk score</div>
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                riskData.risk_level === "high" ? "bg-destructive" :
                                riskData.risk_level === "medium" ? "bg-accent" : "bg-green-500"
                              }`}
                              style={{ width: `${riskData.risk_score}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {riskData.flags.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Flags</p>
                          {riskData.flags.map((flag, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                              <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5 text-accent" />
                              {flag}
                            </div>
                          ))}
                        </div>
                      )}

                      {riskData.risk_level === "high" && (
                        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                          High-risk markets may be flagged for review. You can still create it, but abusive markets may be removed.
                        </div>
                      )}

                      <div className="flex gap-3">
                        <Button variant="outline" onClick={() => setStep("details")} className="gap-2 bg-transparent">
                          <ArrowLeft className="h-4 w-4" />
                          Back
                        </Button>
                        <Button className="flex-1 gap-2 font-semibold" onClick={() => setStep("bet")}>
                          Continue to Seed Bet
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* ─── STEP 4: BET ─── */}
              {step === "bet" && preview && (
                <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-5">
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold">Seed Your Market</h2>
                    <p className="text-sm text-muted-foreground">Place the first bet to activate the market. Minimum 0.01 AVAX.</p>
                  </div>

                  {/* Bet amount */}
                  <div className="space-y-2">
                    <Label htmlFor="bet-amount">Seed Bet (AVAX)</Label>
                    <Input
                      id="bet-amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="0.1"
                      value={betAmount}
                      onChange={(e) => setBetAmount(e.target.value)}
                      className="h-11 text-lg font-mono"
                    />
                    <div className="flex gap-1.5">
                      {["0.01", "0.05", "0.1", "0.5", "1"].map((a) => (
                        <button
                          key={a}
                          onClick={() => setBetAmount(a)}
                          className={`flex-1 py-1 rounded-md text-xs font-semibold transition-colors border ${
                            betAmount === a
                              ? "bg-primary/20 border-primary/40 text-primary"
                              : "bg-muted/40 border-border/40 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-start gap-1">
                      <Info className="h-3 w-3 shrink-0 mt-0.5" />
                      You're the first bettor — your seed creates the initial pool. Others can bet on either side after.
                    </p>
                  </div>

                  {/* Position */}
                  <div className="space-y-2">
                    <Label>Your initial position</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setSelectedPosition("over")}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          selectedPosition === "over"
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/40"
                        }`}
                      >
                        <TrendingUp className={`h-5 w-5 mb-2 ${selectedPosition === "over" ? "text-primary" : "text-muted-foreground"}`} />
                        <div className="font-bold text-sm">OVER</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Will exceed {threshold ? Number(threshold).toLocaleString() : "—"} {METRIC_LABELS[metric] || "units"}
                        </div>
                      </button>
                      <button
                        onClick={() => setSelectedPosition("under")}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          selectedPosition === "under"
                            ? "border-destructive bg-destructive/10"
                            : "border-border hover:border-destructive/40"
                        }`}
                      >
                        <TrendingDown className={`h-5 w-5 mb-2 ${selectedPosition === "under" ? "text-destructive" : "text-muted-foreground"}`} />
                        <div className="font-bold text-sm">UNDER</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Will stay below {threshold ? Number(threshold).toLocaleString() : "—"} {METRIC_LABELS[metric] || "units"}
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Market</span>
                      <span className="font-medium truncate max-w-[200px]">{customTitle || preview.suggestedTitle}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Metric</span>
                      <span className="font-mono">{threshold ? Number(threshold).toLocaleString() : "—"} {METRIC_LABELS[metric]}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Deadline</span>
                      <span>{DEADLINES.find((d) => d.value === deadline)?.label}</span>
                    </div>
                    <div className="border-t border-border/40 pt-2 flex justify-between">
                      <span className="text-muted-foreground">Seed bet</span>
                      <span className="font-mono font-semibold flex items-center gap-1">
                        <Zap className="h-3.5 w-3.5 text-primary" />
                        {betAmount || "0"} AVAX
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Protocol fee (3%)</span>
                      <span className="font-mono">{(Number(betAmount || 0) * 0.03).toFixed(4)} AVAX</span>
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                      {error}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep("risk")} className="gap-2 bg-transparent" disabled={creating}>
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </Button>
                    <Button
                      className="flex-1 h-12 gap-2 font-semibold text-base"
                      onClick={createMarket}
                      disabled={creating || !wallets[0] || !threshold}
                    >
                      {creating ? (
                        <><Loader2 className="h-5 w-5 animate-spin" />Creating Market…</>
                      ) : (
                        <><Sparkles className="h-5 w-5" />Create &amp; Zap</>
                      )}
                    </Button>
                  </div>

                  <p className="text-center text-xs text-muted-foreground">
                    By creating a market you agree to the{" "}
                    <a href="/terms" target="_blank" className="underline hover:text-foreground">Terms of Service</a>.
                  </p>
                </div>
              )}

              {/* ─── DONE ─── */}
              {step === "done" && txHash && (
                <div className="rounded-2xl border border-primary/30 bg-card p-8 space-y-6 text-center">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mx-auto">
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold mb-1">Market Created!</h2>
                    <p className="text-sm text-muted-foreground">Your prediction market is now live on Avalanche.</p>
                  </div>
                  <a
                    href={`${EXPLORER_URL}/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    View transaction on Snowtrace
                  </a>
                  <div className="flex gap-3 justify-center">
                    <Button variant="outline" className="gap-2 bg-transparent" onClick={() => router.push("/")}>
                      Browse Markets
                    </Button>
                    <Button className="gap-2" onClick={() => {
                      setStep("url"); setUrl(""); setPreview(null); setTxHash(null); setThreshold(""); setCustomTitle("")
                    }}>
                      <Sparkles className="h-4 w-4" />
                      Create Another
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT: Live Preview Panel */}
            <div className="lg:col-span-2">
              <div className="sticky top-24">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3 px-1">
                  {preview ? "Post Preview" : "How it works"}
                </p>

                {!preview ? (
                  /* How it works explainer */
                  <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-4">
                    <div className="space-y-3">
                      {[
                        { icon: Link2, title: "1. Paste a URL", desc: "Drop any public X post link." },
                        { icon: Sparkles, title: "2. AI analyzes it", desc: "Paste the post text for an AI-generated market title and virality assessment." },
                        { icon: ShieldCheck, title: "3. Risk check", desc: "Our risk engine flags unusual setups before you go live." },
                        { icon: Zap, title: "4. Seed with AVAX", desc: "Place at least 0.01 AVAX to activate the market on-chain." },
                      ].map(({ icon: Icon, title, desc }) => (
                        <div key={title} className="flex items-start gap-3">
                          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 shrink-0 mt-0.5">
                            <Icon className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-3 border-t border-border/40 space-y-1.5 text-xs text-muted-foreground">
                      <p className="font-semibold text-foreground text-xs">Resolution rules</p>
                      <p>At deadline, the oracle reads the real metric value. If actual ≥ threshold, <strong className="text-primary">OVER</strong> wins. Otherwise <strong className="text-destructive">UNDER</strong> wins.</p>
                      <p>Winners share the losing pool proportionally to their shares (after a 3% fee).</p>
                    </div>
                  </div>
                ) : (
                  /* Post preview after URL entered */
                  <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
                    {/* Platform header */}
                    <div className="h-20 bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center relative">
                      <Badge className={`font-bold text-sm ${
                        preview.platform === "x" ? "bg-[#14171A] text-white" :
                        preview.platform === "tiktok" ? "bg-[#FF0050] text-white" :
                        preview.platform === "youtube" ? "bg-[#FF0000] text-white" :
                        "bg-[#E1306C] text-white"
                      }`}>
                        {preview.platform === "x" ? "𝕏 (Twitter)" : preview.platform.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="p-4 space-y-3">
                      {/* Post text if pasted */}
                      {preview.postText && (
                        <p className="text-sm text-foreground line-clamp-4 leading-snug">{preview.postText}</p>
                      )}

                      {/* AI virality assessment */}
                      {preview.viralityAssessment && (
                        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-xs text-foreground">
                          <Sparkles className="h-3 w-3 shrink-0 mt-0.5 text-primary" />
                          <span>{preview.viralityAssessment}</span>
                        </div>
                      )}

                      {/* Hint if no post text */}
                      {!preview.postText && (
                        <p className="text-xs text-muted-foreground italic">
                          Tip: paste the post text in step 1 for an AI-generated title.
                        </p>
                      )}

                      {/* Market structure preview once threshold is set */}
                      {threshold && Number(threshold) > 0 ? (
                        <div className="mt-2 pt-3 border-t border-border/40 space-y-1.5">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Market preview</p>
                          <p className="text-xs font-medium line-clamp-2">{customTitle || preview.suggestedTitle}</p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden flex">
                              <div className="bg-primary w-1/2 h-full" />
                              <div className="bg-destructive w-1/2 h-full" />
                            </div>
                            <span className="text-[10px] text-muted-foreground">50 / 50</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            ≥ {Number(threshold).toLocaleString()} {METRIC_LABELS[metric]} in {DEADLINES.find(d => d.value === deadline)?.label}
                          </p>
                        </div>
                      ) : (
                        <div className="pt-2 border-t border-border/40 text-xs text-muted-foreground">
                          Enter a threshold in the next step to preview the market structure.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}
