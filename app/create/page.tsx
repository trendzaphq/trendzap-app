"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useWallets, usePrivy } from "@privy-io/react-auth"
import { CONTRACTS, EXPLORER_URL } from "@/lib/contracts"
import { getSettlementInfo, parseSettlementAmount } from "@/hooks/use-market"
import {
  Link2, Sparkles, TrendingUp, TrendingDown, Zap, Loader2,
  CheckCircle2, AlertTriangle, Info, Clock, HelpCircle,
  ArrowLeft, ArrowRight, ShieldCheck, ExternalLink, Plus, X as XIcon, Users
} from "lucide-react"
import { PostEmbed, type EmbedData } from "@/components/post-embed"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "sonner"
import { parseTxError } from "@/lib/tx-error"

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

interface MetricCombo { id: string; metric: string; threshold: string }

function InfoTooltip({ content, side = "top" }: { content: string; side?: "top" | "right" | "bottom" | "left" }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center h-4 w-4 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors shrink-0"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          <span className="sr-only">More info</span>
        </button>
      </TooltipTrigger>
      <TooltipContent
        side={side}
        sideOffset={6}
        className="max-w-[260px] text-xs leading-relaxed bg-[oklch(0.14_0.02_264)] border border-border/50 text-foreground shadow-xl"
      >
        {content}
      </TooltipContent>
    </Tooltip>
  )
}

const DRAFT_KEY = "tz_create_draft"

export default function CreateMarketPage() {
  const router = useRouter()
  const { wallets } = useWallets()
  const { ready: privyReady, authenticated, login } = usePrivy()

  // Admin bypass — lower seed minimum for admin wallet
  const isAdmin = wallets[0]?.address?.toLowerCase() === "0x05394029ea22767d2283bcd0be03b13353781212"
  const MIN_SEED = isAdmin ? 0.001 : 0.7
  const walletAddress = wallets[0]?.address?.toLowerCase() || ""

  // Auth guard — open login modal immediately if unauthenticated
  useEffect(() => {
    if (privyReady && !authenticated) login()
  }, [privyReady, authenticated, login])

  // Track first render to prevent save effect from overwriting restore on mount
  const draftSaveBlocked = useRef(true)

  // Restore draft from localStorage — wallet-scoped (re-runs when wallet resolves)
  useEffect(() => {
    if (!walletAddress) return // wait for Privy to resolve wallet
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (!saved) return
      const d = JSON.parse(saved)
      // Only restore if draft belongs to current wallet; clear stale drafts of other wallets
      if (d.wallet && d.wallet !== walletAddress) {
        localStorage.removeItem(DRAFT_KEY)
        return
      }
      if (d.url) setUrl(d.url)
      if (d.customTitle) setCustomTitle(d.customTitle)
      if (d.metricCombos?.length) setMetricCombos(d.metricCombos)
      if (d.deadline) setDeadline(d.deadline)
      if (d.betAmount) setBetAmount(d.betAmount)
      if (d.selectedPosition) setSelectedPosition(d.selectedPosition)
      if (d.preview) setPreview(d.preview)
      if (d.autoSuggestedTitle) setAutoSuggestedTitle(d.autoSuggestedTitle)
      if (d.autoViralityNote) setAutoViralityNote(d.autoViralityNote)
      if (d.step && d.step !== "done") setStep(d.step)
      draftSaveBlocked.current = false
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress])

  const [step, setStep] = useState<Step>("url")
  const [url, setUrl] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [riskData, setRiskData] = useState<RiskData | null>(null)
  const [isCheckingRisk, setIsCheckingRisk] = useState(false)

  // Auto title generation from embed data
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false)
  const [autoSuggestedTitle, setAutoSuggestedTitle] = useState("")
  const [autoViralityNote, setAutoViralityNote] = useState("")

  // Form fields
  const [customTitle, setCustomTitle] = useState("")
  const [metricCombos, setMetricCombos] = useState<MetricCombo[]>([{ id: "1", metric: "views", threshold: "" }])
  const [deadline, setDeadline] = useState("24h")
  const [betAmount, setBetAmount] = useState("0.7")
  const [selectedPosition, setSelectedPosition] = useState<"over" | "under">("over")

  // Live stats from embed (used for risk check + threshold validation)
  const [currentStats, setCurrentStats] = useState<Record<string, number | undefined> | null>(null)

  // Follower guard
  const [followerCount, setFollowerCount] = useState<number | null>(null)
  const [followerBlocked, setFollowerBlocked] = useState(false)

  // Tx state
  const [creating, setCreating] = useState(false)
  const [creatingStep, setCreatingStep] = useState(0) // which combo is being created
  const [txHashes, setTxHashes] = useState<string[]>([])
  const [urlError, setUrlError] = useState<string | null>(null)

  // Live embed — set after URL debounce (800ms) when it looks like a valid post URL
  const [embedUrl, setEmbedUrl] = useState<string | null>(null)

  useEffect(() => {
    const isValidPostUrl = (u: string) => {
      return (
        /^https?:\/\/(www\.)?(twitter\.com|x\.com|mobile\.twitter\.com)\/\w+\/status\/\d+/.test(u) ||
        /^https?:\/\/(www\.)?(youtube\.com\/(watch|shorts)|youtu\.be)/.test(u)
      )
    }
    // Reset auto-title and stats when URL changes
    setAutoSuggestedTitle("")
    setAutoViralityNote("")
    setCurrentStats(null)
    if (!url.trim() || !isValidPostUrl(url.trim())) {
      setEmbedUrl(null)
      return
    }
    const timer = setTimeout(() => setEmbedUrl(url.trim()), 800)
    return () => clearTimeout(timer)
  }, [url])

  // Save draft to localStorage whenever form changes (skip first render to avoid stomping restore)
  useEffect(() => {
    if (draftSaveBlocked.current) { draftSaveBlocked.current = false; return }
    if (step === "done") { localStorage.removeItem(DRAFT_KEY); return }
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        wallet: walletAddress,
        step, url, customTitle, metricCombos, deadline, betAmount, selectedPosition,
        preview, autoSuggestedTitle, autoViralityNote,
      }))
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, url, customTitle, metricCombos, deadline, betAmount, selectedPosition, preview, autoSuggestedTitle, autoViralityNote])

  const getUrlError = (u: string): string | null => {
    if (!u.trim()) return null
    const isX = /^https?:\/\/(www\.)?(twitter\.com|x\.com|mobile\.twitter\.com)\/\w+\/status\/\d+/.test(u)
    const isYouTube = /^https?:\/\/(www\.)?(youtube\.com\/(watch|shorts)|youtu\.be)/.test(u)
    if (isX || isYouTube) return null
    if (u.includes("tiktok.com") || u.includes("instagram.com"))
      return "TikTok and Instagram are not yet supported. Please use an X (Twitter) or YouTube URL."
    return "Please paste a valid X (Twitter) post URL or YouTube video URL."
  }

  const detectPlatform = (u: string): string => {
    if (u.includes("twitter.com") || u.includes("x.com")) return "x"
    if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube"
    if (u.includes("tiktok.com")) return "tiktok"
    if (u.includes("instagram.com")) return "instagram"
    return "x"
  }

  // Auto-called when embed loads — extracts post_text and generates AI title
  const handleEmbedData = async (data: EmbedData) => {
    // Store live stats for risk assessment + threshold validation
    if (data.stats) {
      setCurrentStats({
        views: data.stats.view_count,
        likes: data.stats.like_count,
        retweets: data.stats.retweet_count,
        comments: data.stats.reply_count ?? data.stats.comment_count,
      })
    }

    // Follower count guard
    if (data.follower_count !== null && data.follower_count !== undefined) {
      setFollowerCount(data.follower_count)
      setFollowerBlocked(data.follower_count < 1000)
    }

    const text = data.post_text?.trim()
    if (!text || text.length < 10) return
    setIsGeneratingTitle(true)
    try {
      const platform = detectPlatform(url)
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, post_text: text, url: url.split("?")[0] }),
      })
      if (res.ok) {
        const d = await res.json()
        if (d.suggested_title) setAutoSuggestedTitle(d.suggested_title)
        if (d.virality_assessment) setAutoViralityNote(d.virality_assessment)
      }
    } catch {
      // fail silently — user can proceed with generic title
    } finally {
      setIsGeneratingTitle(false)
    }
  }

  // Combo management
  const addCombo = () => {
    if (metricCombos.length >= 4) return
    const usedMetrics = metricCombos.map(c => c.metric)
    const next = ["views", "likes", "retweets", "comments"].find(m => !usedMetrics.includes(m)) || "likes"
    setMetricCombos(c => [...c, { id: Date.now().toString(), metric: next, threshold: "" }])
  }
  const removeCombo = (id: string) => setMetricCombos(c => c.filter(x => x.id !== id))
  const updateCombo = (id: string, field: "metric" | "threshold", value: string) =>
    setMetricCombos(c => c.map(x => x.id === id ? { ...x, [field]: value } : x))

  // Auto-fill customTitle when AI title arrives (only if user hasn't typed anything)
  useEffect(() => {
    if (autoSuggestedTitle && !customTitle) {
      setCustomTitle(autoSuggestedTitle)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSuggestedTitle])

  const analyzeUrl = async () => {
    const validationError = getUrlError(url)
    if (validationError) { setUrlError(validationError); return }
    setIsAnalyzing(true)
    const platform = detectPlatform(url)
    setPreview({
      platform,
      suggestedTitle: autoSuggestedTitle || `Will this ${platform.toUpperCase()} post go viral?`,
      viralityAssessment: autoViralityNote || undefined,
    })
    setIsAnalyzing(false)
    setStep("details")
  }

  const checkRisk = async () => {
    setIsCheckingRisk(true)
    setRiskData(null)
    const firstMetric = metricCombos[0]?.metric ?? "views"
    const currentValue = currentStats?.[firstMetric] ?? 0
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_RISK_URL}/assess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          platform: preview?.platform,
          metric: firstMetric,
          threshold: Number(metricCombos[0]?.threshold),
          current_value: currentValue,
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
    if (!wallet) { toast.error("Connect your wallet first"); return }
    const validCombos = metricCombos.filter(c => c.threshold && Number(c.threshold) > 0)
    if (validCombos.length === 0) { toast.error("Set at least one threshold"); return }
    if (!preview) { toast.error("Please analyze a URL first"); return }
    if (Number(betAmount) < MIN_SEED) { toast.error(`Minimum seed bet is ${MIN_SEED} USDC`); return }

    setCreating(true)
    const hashes: string[] = []
    const toastId = toast.loading("Waiting for wallet confirmation…")

    try {
      await wallet.switchChain(43114)
      const ethereumProvider = await wallet.getEthereumProvider()
      const { BrowserProvider, Interface: EthersInterface, Contract, MaxUint256 } = await import("ethers")
      const provider = new BrowserProvider(ethereumProvider)
      const signer = await provider.getSigner()

      // Get settlement info (USDC 6 decimals or native AVAX 18)
      const settlement = await getSettlementInfo(provider)
      const betUnits = parseSettlementAmount(betAmount || "0.05", settlement.decimals)

      // If ERC20, ensure allowance for total across all combos
      if (settlement.isERC20) {
        const totalNeeded = betUnits * BigInt(validCombos.length)
        const erc20 = new Contract(
          settlement.tokenAddress,
          ["function allowance(address,address) view returns (uint256)", "function approve(address,uint256) returns (bool)"],
          signer
        )
        const userAddress = await signer.getAddress()
        const allowance: bigint = await erc20.allowance(userAddress, CONTRACTS.market)
        if (allowance < totalNeeded) {
          toast.loading(`Approving ${settlement.tokenSymbol}…`, { id: toastId })
          const approveTx = await erc20.approve(CONTRACTS.market, MaxUint256)
          await approveTx.wait()
          toast.loading("Creating market…", { id: toastId })
        }
      }

      const now = Math.floor(Date.now() / 1000)
      const duration = DURATIONS[deadline] || 86400
      const startTime = now + 60
      const endTime = startTime + duration
      const resolutionTime = endTime + 300

      const iface = new EthersInterface([
        "function createMarket(tuple(string postUrl, uint8 platform, uint8 metricType, uint256 threshold, uint256 startTime, uint256 endTime, uint256 resolutionTime) params, uint256 initialBet, bool betOnOver) payable returns (uint256)",
      ])
      const nextIdIface = new EthersInterface(["function nextMarketId() view returns (uint256)"])

      for (let i = 0; i < validCombos.length; i++) {
        setCreatingStep(i + 1)
        const combo = validCombos[i]

        const params = {
          postUrl: url,
          platform: PLATFORM_MAP[preview.platform] ?? 0,
          metricType: METRIC_MAP[combo.metric] ?? 1,
          threshold: BigInt(combo.threshold).toString(),
          startTime,
          endTime,
          resolutionTime,
        }

        const betWei = betUnits
        const txData = iface.encodeFunctionData("createMarket", [
          [params.postUrl, params.platform, params.metricType, params.threshold, params.startTime, params.endTime, params.resolutionTime],
          betWei.toString(),
          selectedPosition === "over",
        ])

        const tx = await signer.sendTransaction({ to: CONTRACTS.market, data: txData, value: settlement.isERC20 ? "0" : betWei.toString() })
        hashes.push(tx.hash)
        await tx.wait()

        try {
          const nextIdResult = await provider.call({ to: CONTRACTS.market, data: nextIdIface.encodeFunctionData("nextMarketId", []) })
          const nextId = nextIdIface.decodeFunctionResult("nextMarketId", nextIdResult)[0]
          const marketId = Number(nextId) - 1
          const metricLabel = METRIC_LABELS[combo.metric] || combo.metric
          const baseTitle = customTitle || preview.suggestedTitle
          await fetch("/api/markets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              market_id: marketId,
              title: validCombos.length === 1 ? baseTitle : `${baseTitle} — ${metricLabel}`,
              description: null,
              thumbnail_url: null,
              creator_address: await signer.getAddress(),
            }),
          })
          // Schedule auto-resolution via oracle (fire-and-forget — market is live regardless)
          fetch("/api/oracle/schedule", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              marketId,
              postUrl: url,
              platform: preview.platform,
              metricType: combo.metric,
              threshold: combo.threshold,
              resolutionTime,
            }),
          }).catch(() => {})
        } catch { /* metadata save failed — market still live on-chain */ }
      }

      setTxHashes(hashes)
      setStep("done")
      toast.success(hashes.length === 1 ? "Market created! \u26A1" : `${hashes.length} markets created! \u26A1`, {
        id: toastId,
        description: "Your prediction market is now live.",
        duration: 6000,
      })
    } catch (err) {
      const friendly = parseTxError(err)
      toast.error(friendly, { id: toastId, duration: 6000 })
      // If at least one market was created before the error, clear the draft so the user
      // doesn't accidentally re-submit the same market on the next visit
      if (hashes.length > 0) {
        localStorage.removeItem(DRAFT_KEY)
        setTxHashes(hashes)
        setStep("done")
      }
    } finally {
      setCreating(false)
      setCreatingStep(0)
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
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">Create a Prediction Market</h1>
                {isAdmin && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/25">
                    Admin
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {isAdmin
                  ? "Admin mode — reduced seed minimum (0.001 USDC)"
                  : "Turn viral content into a prediction market in under a minute"}
              </p>
            </div>
          </div>

          {/* Step progress */}
          {step !== "done" && (
            <div className="mb-8">
              <div className="flex items-center gap-0">
                {STEPS.map((s, i) => (
                  <div key={s.id} className="flex items-center">
                    <button
                      type="button"
                      onClick={() => { if (i < stepIndex) setStep(s.id) }}
                      disabled={i > stepIndex}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        i === stepIndex
                          ? "bg-primary text-primary-foreground"
                          : i < stepIndex
                          ? "bg-primary/20 text-primary hover:bg-primary/30 cursor-pointer"
                          : "bg-muted/40 text-muted-foreground cursor-default"
                      }`}
                    >
                      {i < stepIndex ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <span className="h-3.5 w-3.5 flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                      )}
                      <span className="hidden sm:inline">{s.label}</span>
                    </button>
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
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="url">Post URL</Label>
                      <InfoTooltip content="Paste any public X (Twitter) post or YouTube video URL. We'll fetch live stats and use AI to suggest market settings." />
                    </div>
                    <Input
                      id="url"
                      placeholder="https://x.com/user/status/... or https://youtube.com/watch?v=..."
                      value={url}
                      onChange={(e) => { setUrl(e.target.value); setUrlError(getUrlError(e.target.value)) }}
                      onKeyDown={(e) => e.key === "Enter" && url && analyzeUrl()}
                      className={`h-11 text-base ${urlError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                      autoFocus
                    />
                    {urlError ? (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        {urlError}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Supports X and YouTube — TikTok &amp; Instagram coming soon.</p>
                    )}
                  </div>

                  <Button
                    className="w-full h-11 gap-2 font-semibold"
                    onClick={analyzeUrl}
                    disabled={!url.trim() || !!urlError || isAnalyzing || isGeneratingTitle || followerBlocked}
                  >
                    {isAnalyzing ? (
                      <><Loader2 className="h-4 w-4 animate-spin" />Analyzing post…</>
                    ) : isGeneratingTitle ? (
                      <><Loader2 className="h-4 w-4 animate-spin" />Generating title…</>
                    ) : autoSuggestedTitle ? (
                      <><Sparkles className="h-4 w-4" />Continue with AI Title</>
                    ) : (
                      <><ArrowRight className="h-4 w-4" />Continue</>
                    )}
                  </Button>

                  {/* Follower count display + block */}
                  {followerCount !== null && (
                    followerBlocked ? (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                        <Users className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span>
                          This account has fewer than 1,000 followers ({followerCount.toLocaleString()}).
                          Markets on micro-accounts have very low liquidity and are disabled.
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>{followerCount.toLocaleString()} followers — eligible for markets</span>
                      </div>
                    )
                  )}

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
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="title">Market Question <span className="text-muted-foreground font-normal">(optional)</span></Label>
                      <InfoTooltip content="This is the question bettors see. Leave blank and we'll use the AI-generated title based on the post content." />
                    </div>
                    <Textarea
                      id="title"
                      placeholder={preview.suggestedTitle}
                      rows={2}
                      className="resize-none"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                    />
                  </div>

                  {/* Multi-metric combos */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Label>Metrics to track</Label>
                        <InfoTooltip content="Each metric+threshold pair creates a separate market on-chain. Bettors pick any they like. Max 4 per post." />
                      </div>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        {metricCombos.length}/4 markets
                      </span>
                    </div>

                    {metricCombos.map((combo, idx) => {
                      const cur = currentStats?.[combo.metric]
                      const thr = Number(combo.threshold)
                      const alreadyExceeded = combo.threshold && thr > 0 && cur !== undefined && thr <= cur
                      const tooClose = !alreadyExceeded && combo.threshold && thr > 0 && cur !== undefined && thr < cur * 1.05
                      return (
                        <div key={combo.id} className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-[10px] font-bold text-primary shrink-0">
                              {idx + 1}
                            </div>
                            <Select value={combo.metric} onValueChange={(v) => updateCombo(combo.id, "metric", v)}>
                              <SelectTrigger className="w-[140px] shrink-0">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="views">Views</SelectItem>
                                <SelectItem value="likes">Likes</SelectItem>
                                <SelectItem value="retweets">Retweets</SelectItem>
                                <SelectItem value="comments">Comments</SelectItem>
                              </SelectContent>
                            </Select>
                            <span className="text-xs text-muted-foreground shrink-0">≥</span>
                            <Input
                              type="number"
                              min="1"
                              placeholder="e.g. 1000000"
                              className={`font-mono flex-1 ${alreadyExceeded ? "border-destructive focus-visible:ring-destructive" : ""}`}
                              value={combo.threshold}
                              onChange={(e) => updateCombo(combo.id, "threshold", e.target.value)}
                            />
                            {metricCombos.length > 1 && (
                              <button
                                onClick={() => removeCombo(combo.id)}
                                className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                              >
                                <XIcon className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          {/* Threshold vs current metric validation */}
                          {alreadyExceeded ? (
                            <div className="flex items-start gap-1.5 ml-7 text-xs text-destructive">
                              <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                              <span>
                                Already at <strong>{cur!.toLocaleString()}</strong> {combo.metric} — threshold of {thr.toLocaleString()} is already surpassed. OVER would win instantly. Set a higher threshold.
                              </span>
                            </div>
                          ) : tooClose ? (
                            <div className="flex items-start gap-1.5 ml-7 text-xs text-yellow-500">
                              <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                              <span>
                                Very close — post currently has {cur!.toLocaleString()} {combo.metric}. Market may resolve quickly.
                              </span>
                            </div>
                          ) : cur !== undefined && combo.threshold && thr > 0 ? (
                            <p className="ml-7 text-xs text-muted-foreground">
                              Now: <span className="text-foreground font-mono">{cur.toLocaleString()}</span> — needs{" "}
                              <span className="text-primary font-mono">{(thr - cur).toLocaleString()}</span> more {combo.metric} to hit threshold
                            </p>
                          ) : null}
                        </div>
                      )
                    })}

                    {metricCombos.length < 4 && (
                      <button
                        onClick={addCombo}
                        className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors py-1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add another metric
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="deadline">Resolution deadline</Label>
                      <InfoTooltip content="How long until the oracle checks the final metric value. After the deadline + 5 min buffer, OVER wins if actual ≥ threshold, UNDER wins otherwise." />
                    </div>
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
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" onClick={() => setStep("url")} className="gap-2 bg-transparent">
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </Button>
                    <Button
                      className="flex-1 gap-2 font-semibold"
                      onClick={() => { setStep("risk"); checkRisk() }}
                      disabled={
                        !metricCombos.some(c => c.threshold && Number(c.threshold) > 0) ||
                        metricCombos.some(c => {
                          const cur = currentStats?.[c.metric]
                          const thr = Number(c.threshold)
                          return c.threshold && thr > 0 && cur !== undefined && thr <= cur
                        })
                      }
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
                    <p className="text-sm text-muted-foreground">Place the first bet to activate the market. Minimum {MIN_SEED} USDC.</p>
                  </div>

                  {/* Bet amount */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="bet-amount">Seed Bet (USDC)</Label>
                      <InfoTooltip content="You're the first bettor — your seed activates the market and sets the initial pool. Other users can bet on either side after you." />
                    </div>
                    <Input
                      id="bet-amount"
                      type="number"
                      min={MIN_SEED}
                      step={isAdmin ? "0.001" : "0.01"}
                      placeholder={isAdmin ? "0.001" : "0.7"}
                      value={betAmount}
                      onChange={(e) => setBetAmount(e.target.value)}
                      className={`h-11 text-lg font-mono ${Number(betAmount) > 0 && Number(betAmount) < MIN_SEED ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    />
                    {Number(betAmount) > 0 && Number(betAmount) < MIN_SEED && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        Minimum seed bet is {MIN_SEED} USDC{isAdmin ? "" : " to ensure enough initial liquidity"}.
                      </p>
                    )}
                    <div className="flex gap-1.5">
                      {(isAdmin ? ["0.001", "0.01", "0.05", "0.1"] : ["0.7", "1", "2", "5"]).map((a) => (
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
                  </div>

                  {/* Position */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Label>Your initial position</Label>
                      <InfoTooltip content="Pick OVER if you believe the metric will reach the threshold. Pick UNDER if you think it won't. You can bet on either side." />
                    </div>
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
                          Will exceed {metricCombos[0]?.threshold ? Number(metricCombos[0].threshold).toLocaleString() : "—"} {METRIC_LABELS[metricCombos[0]?.metric] || "units"}
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
                          Will stay below {metricCombos[0]?.threshold ? Number(metricCombos[0].threshold).toLocaleString() : "—"} {METRIC_LABELS[metricCombos[0]?.metric] || "units"}
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
                      <span className="text-muted-foreground">Deadline</span>
                      <span>{DEADLINES.find((d) => d.value === deadline)?.label}</span>
                    </div>
                    {/* Per-metric rows */}
                    {metricCombos.filter(c => c.threshold && Number(c.threshold) > 0).map((combo, i) => (
                      <div key={combo.id} className={`flex justify-between ${i === 0 ? "border-t border-border/40 pt-2" : ""}`}>
                        <span className="text-muted-foreground">{METRIC_LABELS[combo.metric] || combo.metric}</span>
                        <span className="font-mono">≥ {Number(combo.threshold).toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="border-t border-border/40 pt-2 flex justify-between">
                      <span className="text-muted-foreground">
                        Seed bet
                        {metricCombos.filter(c => c.threshold && Number(c.threshold) > 0).length > 1
                          ? ` × ${metricCombos.filter(c => c.threshold && Number(c.threshold) > 0).length} markets`
                          : ""}
                      </span>
                      <span className="font-mono font-semibold flex items-center gap-1">
                        <Zap className="h-3.5 w-3.5 text-primary" />
                        {(Number(betAmount || 0) * metricCombos.filter(c => c.threshold && Number(c.threshold) > 0).length).toFixed(3)} USDC
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Protocol fee (3%)</span>
                      <span className="font-mono">
                        {(Number(betAmount || 0) * metricCombos.filter(c => c.threshold && Number(c.threshold) > 0).length * 0.03).toFixed(4)} USDC
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep("risk")} className="gap-2 bg-transparent" disabled={creating}>
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </Button>
                    <Button
                      className="flex-1 h-12 gap-2 font-semibold text-base"
                      onClick={createMarket}
                      disabled={creating || !wallets[0] || !metricCombos.some(c => c.threshold && Number(c.threshold) > 0) || Number(betAmount) < MIN_SEED}
                    >
                      {creating ? (
                        <><Loader2 className="h-5 w-5 animate-spin" />
                          {metricCombos.filter(c => c.threshold && Number(c.threshold) > 0).length > 1
                            ? `Creating market ${creatingStep}/${metricCombos.filter(c => c.threshold && Number(c.threshold) > 0).length}…`
                            : "Creating Market…"}
                        </>
                      ) : (
                        <><Sparkles className="h-5 w-5" />
                          {metricCombos.filter(c => c.threshold && Number(c.threshold) > 0).length > 1
                            ? `Create ${metricCombos.filter(c => c.threshold && Number(c.threshold) > 0).length} Markets & Zap`
                            : "Create & Zap"}
                        </>
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
              {step === "done" && txHashes.length > 0 && (
                <div className="rounded-2xl border border-primary/30 bg-card p-8 space-y-6 text-center">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mx-auto">
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold mb-1">
                      {txHashes.length === 1 ? "Market Created!" : `${txHashes.length} Markets Created!`}
                    </h2>
                    <p className="text-sm text-muted-foreground">Your prediction {txHashes.length === 1 ? "market is" : "markets are"} now live on Avalanche.</p>
                  </div>
                  <div className="space-y-2">
                    {txHashes.map((hash, i) => (
                      <a
                        key={hash}
                        href={`${EXPLORER_URL}/tx/${hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 text-sm text-primary underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        {txHashes.length > 1 ? `Market ${i + 1} transaction` : "View transaction on Snowtrace"}
                      </a>
                    ))}
                  </div>
                  <div className="flex gap-3 justify-center">
                    <Button variant="outline" className="gap-2 bg-transparent" onClick={() => router.push("/")}>
                      Browse Markets
                    </Button>
                    <Button className="gap-2" onClick={() => {
                      localStorage.removeItem(DRAFT_KEY)
                      setStep("url"); setUrl(""); setPreview(null); setTxHashes([])
                      setMetricCombos([{ id: "1", metric: "views", threshold: "" }])
                      setCustomTitle(""); setFollowerCount(null); setFollowerBlocked(false); setUrlError(null)
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
                  {embedUrl ? "Live Post Preview" : "How it works"}
                </p>

                {!embedUrl ? (
                  /* How it works explainer */
                  <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-4">
                    <div className="space-y-3">
                      {[
                        { icon: Link2, title: "1. Paste a URL", desc: "Drop any public X (Twitter) or YouTube post link." },
                        { icon: Sparkles, title: "2. AI analyzes it", desc: "The AI reads your post and auto-generates a market title + virality assessment." },
                        { icon: ShieldCheck, title: "3. Risk check", desc: "Our risk engine flags unusual setups before you go live." },
                        { icon: Zap, title: "4. Seed with USDC", desc: `Place at least ${MIN_SEED} USDC to activate the market on-chain.` },
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
                  /* Live post embed + market preview */
                  <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
                    {/* Actual post embed with live stats */}
                    <div className="p-4 pb-3">
                      <PostEmbed url={embedUrl} onData={handleEmbedData} />
                    </div>

                    {/* AI title generation status */}
                    {isGeneratingTitle && (
                      <div className="mx-4 mb-3">
                        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-xs text-primary">
                          <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                          <span>Generating market title with AI…</span>
                        </div>
                      </div>
                    )}

                    {/* Auto-generated title preview */}
                    {!isGeneratingTitle && autoSuggestedTitle && (
                      <div className="mx-4 mb-3">
                        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-xs text-foreground">
                          <Sparkles className="h-3 w-3 shrink-0 mt-0.5 text-primary" />
                          <div>
                            <p className="text-[10px] text-primary font-semibold uppercase tracking-wider mb-0.5">AI-generated title</p>
                            <p>{autoSuggestedTitle}</p>
                            {autoViralityNote && <p className="mt-1 text-muted-foreground">{autoViralityNote}</p>}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Market structure preview once any threshold is set */}
                    {metricCombos.some(c => c.threshold && Number(c.threshold) > 0) && preview ? (
                      <div className="p-4 pt-0 border-t border-border/40 space-y-2 mt-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Market preview</p>
                        <p className="text-xs font-medium line-clamp-2">{customTitle || preview.suggestedTitle}</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden flex">
                            <div className="bg-primary w-1/2 h-full" />
                            <div className="bg-destructive w-1/2 h-full" />
                          </div>
                          <span className="text-[10px] text-muted-foreground">50 / 50</span>
                        </div>
                        {metricCombos.filter(c => c.threshold && Number(c.threshold) > 0).map(combo => (
                          <p key={combo.id} className="text-xs text-muted-foreground">
                            {METRIC_LABELS[combo.metric]} ≥ {Number(combo.threshold).toLocaleString()} in {DEADLINES.find(d => d.value === deadline)?.label}
                          </p>
                        ))}
                      </div>
                    ) : !preview ? (
                      <div className="px-4 pb-4 text-xs text-muted-foreground italic">
                        Click Continue to proceed and set your market parameters.
                      </div>
                    ) : (
                      <div className="px-4 pb-4 text-xs text-muted-foreground">
                        Enter a threshold in the next step to preview the market structure.
                      </div>
                    )}
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
