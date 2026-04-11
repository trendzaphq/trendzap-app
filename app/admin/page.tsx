"use client"

import { useCallback, useEffect, useState } from "react"
import { usePrivy, useWallets } from "@privy-io/react-auth"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { useMarketList, type MarketData, getSettlementInfo, parseSettlementAmount } from "@/hooks/use-market"
import { CONTRACTS, EXPLORER_URL } from "@/lib/contracts"
import { toast } from "sonner"
import { parseTxError } from "@/lib/tx-error"

const PLATFORM_MAP: Record<string, number> = { x: 0, youtube: 1, tiktok: 2, instagram: 3 }
const METRIC_MAP: Record<string, number> = { likes: 0, views: 1, retweets: 2, comments: 3, shares: 4 }
const DURATIONS: Record<string, number> = { "1h": 3600, "6h": 21600, "24h": 86400, "3d": 259200, "7d": 604800 }

function detectPlatform(url: string): string {
  if (url.includes("twitter.com") || url.includes("x.com")) return "x"
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube"
  if (url.includes("tiktok.com")) return "tiktok"
  return "x"
}

// ── Service health types ─────────────────────────────────────
interface ServiceHealth {
  name: string
  url: string
  status: "ok" | "error" | "loading"
  detail?: string
}

const SERVICES: Omit<ServiceHealth, "status" | "detail">[] = [
  { name: "Oracle", url: process.env.NEXT_PUBLIC_ORACLE_URL || "" },
  { name: "Risk Engine", url: process.env.NEXT_PUBLIC_RISK_URL || "" },
  { name: "Intelligence", url: process.env.NEXT_PUBLIC_INTELLIGENCE_URL || "" },
]

// ── Admin resolve dialog ─────────────────────────────────────
function ResolveDialog({
  market,
  onClose,
  onResolved,
}: {
  market: MarketData | null
  onClose: () => void
  onResolved: () => void
}) {
  const { wallets } = useWallets()
  const [metricValue, setMetricValue] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resolve = useCallback(async () => {
    if (!market || !metricValue) return
    const wallet = wallets[0]
    if (!wallet) return

    setLoading(true)
    setError(null)
    const toastId = toast.loading(`Resolving market #${market.id}…`)
    try {
      const { BrowserProvider, Interface: EthersInterface } = await import("ethers")
      const provider = new BrowserProvider(await wallet.getEthereumProvider())
      const signer = await provider.getSigner()
      const iface = new EthersInterface([
        "function resolveMarket(uint256 marketId, uint256 metricValue)",
      ])
      const tx = await signer.sendTransaction({
        to: CONTRACTS.market,
        data: iface.encodeFunctionData("resolveMarket", [market.id, BigInt(metricValue)]),
      })
      await tx.wait()
      toast.success(`Market #${market.id} resolved ✓`, {
        id: toastId,
        description: `Final value: ${Number(metricValue).toLocaleString()} ${market.metricType}`,
        duration: 6000,
      })
      onResolved()
      onClose()
    } catch (e) {
      const friendly = parseTxError(e)
      toast.error(friendly, { id: toastId, duration: 6000 })
    } finally {
      setLoading(false)
    }
  }, [market, metricValue, wallets, onClose, onResolved])

  return (
    <Dialog open={!!market} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolve Market #{market?.id}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground truncate">{market?.postUrl}</p>
        <p className="text-sm">
          Threshold: <strong>{market?.threshold?.toString()}</strong> {market?.metricType}
        </p>
        <Input
          type="number"
          placeholder="Final metric value (e.g. 150000)"
          value={metricValue}
          onChange={(e) => setMetricValue(e.target.value)}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={resolve} disabled={loading || !metricValue}>
            {loading ? "Resolving..." : "Resolve On-chain"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Cancel dialog ────────────────────────────────────────────
function CancelDialog({
  market,
  onClose,
  onCancelled,
}: {
  market: MarketData | null
  onClose: () => void
  onCancelled: () => void
}) {
  const { wallets } = useWallets()
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cancel = useCallback(async () => {
    if (!market) return
    const wallet = wallets[0]
    if (!wallet) return

    setLoading(true)
    setError(null)
    const toastId = toast.loading(`Cancelling market #${market.id}…`)
    try {
      const { BrowserProvider, Interface: EthersInterface } = await import("ethers")
      const provider = new BrowserProvider(await wallet.getEthereumProvider())
      const signer = await provider.getSigner()
      const iface = new EthersInterface([
        "function cancelMarket(uint256 marketId, string reason)",
      ])
      const tx = await signer.sendTransaction({
        to: CONTRACTS.market,
        data: iface.encodeFunctionData("cancelMarket", [market.id, reason || "Admin action"]),
      })
      await tx.wait()
      toast.success(`Market #${market.id} cancelled`, {
        id: toastId,
        description: "All bettors will be refunded.",
        duration: 6000,
      })
      onCancelled()
      onClose()
    } catch (e) {
      const friendly = parseTxError(e)
      toast.error(friendly, { id: toastId, duration: 6000 })
    } finally {
      setLoading(false)
    }
  }, [market, reason, wallets, onClose, onCancelled])

  return (
    <Dialog open={!!market} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Market #{market?.id}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">This will refund all bettors.</p>
        <Input
          placeholder="Reason (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Back</Button>
          <Button variant="destructive" onClick={cancel} disabled={loading}>
            {loading ? "Cancelling..." : "Confirm Cancel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Admin create market dialog ────────────────────────────────
function AdminCreateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { wallets } = useWallets()
  const [url, setUrl] = useState("")
  const [metric, setMetric] = useState("views")
  const [threshold, setThreshold] = useState("")
  const [deadline, setDeadline] = useState("24h")
  const [seedAmount, setSeedAmount] = useState("0.001")
  const [position, setPosition] = useState<"over" | "under">("over")
  const [title, setTitle] = useState("")
  const [loading, setLoading] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)

  const reset = () => {
    setUrl(""); setMetric("views"); setThreshold(""); setDeadline("24h")
    setSeedAmount("0.001"); setPosition("over"); setTitle(""); setTxHash(null)
  }

  const create = async () => {
    if (!url.trim() || !threshold || Number(threshold) <= 0) {
      toast.error("URL and threshold are required"); return
    }
    const seed = Number(seedAmount)
    if (isNaN(seed) || seed <= 0) { toast.error("Invalid seed amount"); return }

    const wallet = wallets[0]
    if (!wallet) { toast.error("Connect admin wallet first"); return }

    setLoading(true)
    const toastId = toast.loading("Creating market…")
    try {
      await wallet.switchChain(43114)
      const { BrowserProvider, Contract, MaxUint256, Interface: EthersInterface } = await import("ethers")
      const provider = new BrowserProvider(await wallet.getEthereumProvider())
      const signer = await provider.getSigner()

      // Get settlement token info (USDC 6 decimals or native AVAX 18)
      const settlement = await getSettlementInfo(provider)
      const betAmount = parseSettlementAmount(seedAmount || "0.001", settlement.decimals)

      // If ERC20, ensure allowance
      if (settlement.isERC20) {
        const erc20 = new Contract(
          settlement.tokenAddress,
          [
            "function allowance(address,address) view returns (uint256)",
            "function approve(address,uint256) returns (bool)",
          ],
          signer
        )
        const userAddr = await signer.getAddress()
        const allowance: bigint = await erc20.allowance(userAddr, CONTRACTS.market)
        if (allowance < betAmount) {
          toast.loading("Approving USDC…", { id: toastId })
          const approveTx = await erc20.approve(CONTRACTS.market, MaxUint256)
          await approveTx.wait()
          toast.loading("Creating market…", { id: toastId })
        }
      }

      const now = Math.floor(Date.now() / 1000)
      const duration = DURATIONS[deadline] ?? 86400
      const startTime = now + 60
      const endTime = startTime + duration
      const resolutionTime = endTime + 300
      const platform = detectPlatform(url)

      const iface = new EthersInterface([
        "function createMarket(tuple(string postUrl, uint8 platform, uint8 metricType, uint256 threshold, uint256 startTime, uint256 endTime, uint256 resolutionTime) params, uint256 initialBet, bool betOnOver) payable returns (uint256)",
      ])

      const tx = await signer.sendTransaction({
        to: CONTRACTS.market,
        data: iface.encodeFunctionData("createMarket", [
          [url, PLATFORM_MAP[platform] ?? 0, METRIC_MAP[metric] ?? 1,
           BigInt(threshold).toString(), startTime, endTime, resolutionTime],
          betAmount.toString(),
          position === "over",
        ]),
        value: settlement.isERC20 ? "0" : betAmount.toString(),
      })
      await tx.wait()
      setTxHash(tx.hash)

      toast.success("Market created! 🚀", {
        id: toastId,
        description: "The prediction market is now live on-chain.",
        action: {
          label: "View tx",
          onClick: () => window.open(`${EXPLORER_URL}/tx/${tx.hash}`, "_blank"),
        },
        duration: 8000,
      })

      // Save metadata
      try {
        const nextIdIface = new EthersInterface(["function nextMarketId() view returns (uint256)"])
        const result = await provider.call({ to: CONTRACTS.market, data: nextIdIface.encodeFunctionData("nextMarketId", []) })
        const nextId = nextIdIface.decodeFunctionResult("nextMarketId", result)[0]
        const marketId = Number(nextId) - 1
        await fetch("/api/markets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            market_id: marketId,
            title: title.trim() || `Will this ${platform.toUpperCase()} post go viral?`,
            description: null, thumbnail_url: null,
            creator_address: await signer.getAddress(),
          }),
        })
      } catch { /* metadata optional */ }
    } catch (e) {
      const friendly = parseTxError(e)
      toast.error(friendly, { id: toastId, duration: 6000 })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Market (Admin)</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {txHash ? (
            <div className="space-y-3">
              <p className="text-sm text-green-500 font-semibold">Market created!</p>
              <a href={`${EXPLORER_URL}/tx/${txHash}`} target="_blank" rel="noreferrer"
                className="text-xs text-blue-400 underline break-all">
                {txHash}
              </a>
              <Button className="w-full" onClick={() => { reset(); onClose() }}>Done</Button>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <Label>Post URL</Label>
                <Input placeholder="https://x.com/user/status/..." value={url}
                  onChange={(e) => setUrl(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Market Title <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
                <Input placeholder="Will this post go viral?" value={title}
                  onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Metric</Label>
                  <Select value={metric} onValueChange={setMetric}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="views">Views</SelectItem>
                      <SelectItem value="likes">Likes</SelectItem>
                      <SelectItem value="retweets">Retweets</SelectItem>
                      <SelectItem value="comments">Comments</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Threshold</Label>
                  <Input type="number" min="1" placeholder="e.g. 1000000" className="font-mono"
                    value={threshold} onChange={(e) => setThreshold(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Deadline</Label>
                  <Select value={deadline} onValueChange={setDeadline}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(DURATIONS).map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Position</Label>
                  <Select value={position} onValueChange={(v) => setPosition(v as "over" | "under")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="over">Over</SelectItem>
                      <SelectItem value="under">Under</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Seed Amount <span className="text-xs text-muted-foreground">(USDC — min 0.001)</span></Label>
                <Input type="number" min="0.001" step="0.001" className="font-mono"
                  value={seedAmount} onChange={(e) => setSeedAmount(e.target.value)} />
              </div>
            </>
          )}
        </div>
        {!txHash && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onClose()}>Cancel</Button>
            <Button onClick={create} disabled={loading || !url.trim() || !threshold}>
              {loading ? "Creating…" : "Create Market"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Status badge ─────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const color: Record<string, string> = {
    ACTIVE: "bg-green-500/20 text-green-400 border-green-500/30",
    RESOLVED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    PENDING: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    CLOSED: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    CANCELLED: "bg-red-500/20 text-red-400 border-red-500/30",
    DISPUTED: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${color[status] ?? "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  )
}

// ── Main admin page ──────────────────────────────────────────
const ADMIN_ADDRESS = "0x05394029ea22767d2283bcd0be03b13353781212"

export default function AdminPage() {
  const { authenticated } = usePrivy()
  const { wallets } = useWallets()
  const { markets, loading: marketsLoading } = useMarketList()

  const [services, setServices] = useState<ServiceHealth[]>(
    SERVICES.map((s) => ({ ...s, status: "loading" as const }))
  )
  const [resolveTarget, setResolveTarget] = useState<MarketData | null>(null)
  const [cancelTarget, setCancelTarget] = useState<MarketData | null>(null)
  const [filter, setFilter] = useState<string>("ALL")
  const [createOpen, setCreateOpen] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [settleLoading, setSettleLoading] = useState(false)
  const [liveMetrics, setLiveMetrics] = useState<Record<number, string>>({})
  const [userStats, setUserStats] = useState<{ total_users: number; total_bets: number; total_revenue_usdc: string; total_payouts_usdc: string } | null>(null)

  // ── Health check polling ──────────────────────────
  const checkHealth = useCallback(async () => {
    const paths: Record<string, string> = {
      Oracle: "/api/v1/health",
      "Risk Engine": "/health",
      Intelligence: "/health",
    }
    const updated = await Promise.all(
      SERVICES.map(async (svc) => {
        if (!svc.url) return { ...svc, status: "error" as const, detail: "URL not configured" }
        try {
          const res = await fetch(`${svc.url}${paths[svc.name] ?? "/health"}`, {
            signal: AbortSignal.timeout(5000),
          })
          const data = await res.json().catch(() => ({}))
          return {
            ...svc,
            status: res.ok ? ("ok" as const) : ("error" as const),
            detail: data.status ?? (res.ok ? "OK" : `HTTP ${res.status}`),
          }
        } catch {
          return { ...svc, status: "error" as const, detail: "Unreachable" }
        }
      })
    )
    setServices(updated)
  }, [])

  useEffect(() => {
    checkHealth()
    const t = setInterval(checkHealth, 30_000)
    return () => clearInterval(t)
  }, [checkHealth])

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => setUserStats(d))
      .catch(() => {})
  }, [])

  const syncIndexer = async () => {
    setSyncLoading(true)
    setSyncResult(null)
    try {
      const res = await fetch("/api/indexer/sync")
      const data = await res.json()
      setSyncResult(`Synced +${data.blocksProcessed ?? 0} blocks, ${data.betsIndexed ?? 0} bets, ${data.resolutionsIndexed ?? 0} resolutions`)
    } catch {
      setSyncResult("Sync failed — check console")
    } finally {
      setSyncLoading(false)
    }
  }

  const triggerAutoSettle = async () => {
    setSettleLoading(true)
    try {
      const res = await fetch("/api/admin/trigger-settle")
      const data = await res.json()
      if (data.ok) {
        const settled = data.settled?.length ?? 0
        const skipped = data.skipped?.length ?? 0
        toast.success(`Auto-settle done: ${settled} settled, ${skipped} skipped`)
        if (settled > 0) window.location.reload()
      } else {
        toast.error(data.error ?? "Auto-settle failed — check ADMIN_PRIVATE_KEY env var")
      }
    } catch {
      toast.error("Auto-settle request failed")
    } finally {
      setSettleLoading(false)
    }
  }

  const fetchLiveMetric = async (market: MarketData) => {
    setLiveMetrics((prev) => ({ ...prev, [market.id]: "…" }))
    try {
      // Use server-side proxy to avoid CORS issues
      const res = await fetch(
        `/api/admin/oracle-metric?url=${encodeURIComponent(market.postUrl)}&platform=${market.platform}&metric=${market.metricType}`,
        { signal: AbortSignal.timeout(15_000) }
      )
      const data = await res.json()
      const val = data?.data?.value
      setLiveMetrics((prev) => ({
        ...prev,
        [market.id]: val != null ? Number(val).toLocaleString() : "N/A",
      }))
    } catch {
      setLiveMetrics((prev) => ({ ...prev, [market.id]: "Error" }))
    }
  }

  const connectedAddress = wallets[0]?.address
  const isAdmin = connectedAddress?.toLowerCase() === ADMIN_ADDRESS

  // ── Access guard ──────────────────────────────────
  if (!authenticated || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center space-y-4 max-w-sm">
          <p className="text-xl font-bold text-destructive">Access Denied</p>
          <p className="text-sm text-muted-foreground">
            {!authenticated
              ? "Connect the admin wallet to access this page."
              : "Connected wallet is not authorized."}
          </p>
          <a href="/" className="inline-block text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
            ← Go Home
          </a>
        </Card>
      </div>
    )
  }

  // ── Derived stats ─────────────────────────────────
  const byStatus = markets.reduce<Record<string, number>>((acc, m) => {
    acc[m.status] = (acc[m.status] ?? 0) + 1
    return acc
  }, {})

  const totalVolumeEth = markets
    .reduce((sum, m) => sum + parseFloat(m.totalVolume || "0"), 0)
    .toFixed(4)

  const now = Math.floor(Date.now() / 1000)
  const expiredUnresolved = markets.filter(
    (m) => (m.status === "ACTIVE" || m.status === "PENDING") && m.endTime < now
  )

  const filtered =
    filter === "ALL" ? markets : markets.filter((m) => m.status === filter)

  return (
    <div className="min-h-screen bg-background text-foreground p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {connectedAddress
              ? `Connected: ${connectedAddress.slice(0, 6)}…${connectedAddress.slice(-4)}`
              : "Connect wallet to take actions"}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            + Create Market
          </Button>
          <Button size="sm" variant="outline" onClick={triggerAutoSettle} disabled={settleLoading}>
            {settleLoading ? "Settling…" : "⚡ Auto-Settle"}
          </Button>
          <Button size="sm" variant="outline" onClick={syncIndexer} disabled={syncLoading}>
            {syncLoading ? "Syncing…" : "Sync Indexer"}
          </Button>
          <Button size="sm" variant="outline" onClick={checkHealth}>
            Refresh health
          </Button>
        </div>
      </div>
      {syncResult && (
        <div className="text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2">{syncResult}</div>
      )}

      {/* Service health ─────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {services.map((svc) => (
          <Card key={svc.name}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{svc.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  svc.status === "ok"
                    ? "bg-green-500"
                    : svc.status === "error"
                    ? "bg-red-500"
                    : "bg-yellow-500 animate-pulse"
                }`}
              />
              <span className="text-sm capitalize">{svc.detail ?? svc.status}</span>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Stats cards ─────────────────────────────────── */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Markets</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{markets.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Active</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-green-500">{byStatus["ACTIVE"] ?? 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Resolved</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-blue-500">{byStatus["RESOLVED"] ?? 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Volume</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{totalVolumeEth} <span className="text-sm font-normal">USDC</span></p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Protocol Revenue</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-400">
              {userStats?.total_revenue_usdc != null
                ? `${(Number(BigInt(userStats.total_revenue_usdc)) / 1e6).toFixed(4)}`
                : "—"}
              <span className="text-sm font-normal"> USDC</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">Bets − Payouts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Users</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-purple-400">{userStats?.total_users ?? "—"}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Bets</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-orange-400">{userStats?.total_bets ?? "—"}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Needs Resolution</CardTitle></CardHeader>
          <CardContent><p className={`text-3xl font-bold ${expiredUnresolved.length > 0 ? "text-yellow-400" : ""}`}>{expiredUnresolved.length}</p></CardContent>
        </Card>
      </section>

      {/* Expired market warning ─────────────────────── */}
      {expiredUnresolved.length > 0 && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-400">
          ⚠️ <strong>{expiredUnresolved.length} market{expiredUnresolved.length > 1 ? "s have" : " has"} passed their end time</strong> and need manual resolution.
          {" "}Filter by <strong>ACTIVE</strong> below, then click <strong>Resolve</strong> on each expired market.
        </div>
      )}

      {/* Status filter tabs ──────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {["ALL", "PENDING", "ACTIVE", "CLOSED", "RESOLVED", "CANCELLED", "DISPUTED"].map((s) => (
          <Button
            key={s}
            size="sm"
            variant={filter === s ? "default" : "outline"}
            onClick={() => setFilter(s)}
          >
            {s} {s !== "ALL" ? (byStatus[s] ?? 0) : markets.length}
          </Button>
        ))}
      </div>

      {/* Markets table ──────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Markets</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {marketsLoading ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Loading markets…</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">No markets found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Post / Platform</TableHead>
                  <TableHead>Metric</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead>Live Value</TableHead>
                  <TableHead>Volume</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m) => {
                  const canResolve = m.status === "ACTIVE" || m.status === "CLOSED"
                  const canCancel =
                    m.status === "PENDING" ||
                    m.status === "ACTIVE" ||
                    m.status === "CLOSED"
                  const endDate = new Date(m.endTime * 1000)
                  const isExpiredRow = (m.status === "ACTIVE" || m.status === "PENDING") && m.endTime < now

                  return (
                    <TableRow key={m.id} className={isExpiredRow ? "bg-yellow-500/5 border-l-2 border-yellow-500/40" : ""}>
                      <TableCell className="font-mono text-xs">{m.id}</TableCell>
                      <TableCell className="max-w-[180px]">
                        <a
                          href={m.postUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-400 underline truncate block"
                        >
                          {m.platform}: {m.postUrl.replace(/https?:\/\/[^/]+/, "")}
                        </a>
                      </TableCell>
                      <TableCell className="capitalize text-xs">{m.metricType}</TableCell>
                      <TableCell className="text-xs font-mono">{m.threshold.toString()}</TableCell>
                      <TableCell className="text-xs">
                        {liveMetrics[m.id] != null ? (
                          <span className={`font-mono font-semibold ${
                            liveMetrics[m.id] === "…" ? "text-muted-foreground" :
                            liveMetrics[m.id] === "Error" || liveMetrics[m.id] === "N/A" ? "text-destructive/70" :
                            Number(liveMetrics[m.id].replace(/,/g, "")) >= Number(m.threshold) ? "text-primary" : "text-muted-foreground"
                          }`}>
                            {liveMetrics[m.id]}
                            {liveMetrics[m.id] !== "…" && liveMetrics[m.id] !== "Error" && liveMetrics[m.id] !== "N/A" && (
                              <span className="ml-1 text-muted-foreground font-normal">
                                {Number(liveMetrics[m.id].replace(/,/g, "")) >= Number(m.threshold) ? "✓ OVER" : "✗ UNDER"}
                              </span>
                            )}
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs h-6 px-2 text-muted-foreground hover:text-foreground"
                            onClick={() => fetchLiveMetric(m)}
                          >
                            Fetch
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{m.totalVolume} USDC</TableCell>
                      <TableCell className="text-xs">
                        {endDate.toLocaleDateString()} {endDate.toLocaleTimeString()}
                        {isExpiredRow && <span className="ml-1 text-yellow-400 font-semibold">⚠ EXPIRED</span>}
                      </TableCell>
                      <TableCell><StatusBadge status={m.status} /></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {canResolve && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 px-2"
                              onClick={() => setResolveTarget(m)}
                            >
                              Resolve
                            </Button>
                          )}
                          {canCancel && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-7 px-2 text-destructive hover:text-destructive"
                              onClick={() => setCancelTarget(m)}
                            >
                              Cancel
                            </Button>
                          )}
                          <a
                            href={`/market/${m.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center text-xs text-muted-foreground hover:text-primary px-1"
                          >
                            View ↗
                          </a>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogs ─────────────────────────────────────── */}
      <AdminCreateDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <ResolveDialog
        market={resolveTarget}
        onClose={() => setResolveTarget(null)}
        onResolved={() => window.location.reload()}
      />
      <CancelDialog
        market={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onCancelled={() => window.location.reload()}
      />
    </div>
  )
}
