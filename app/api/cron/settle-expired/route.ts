/**
 * Auto-settle expired markets.
 *
 * Called on a schedule (Railway Cron Service → GET/POST this URL every 5 min).
 * Requires ADMIN_PRIVATE_KEY env var (server-only, never NEXT_PUBLIC).
 * Optionally protected by CRON_SECRET env var.
 *
 * For each ACTIVE/CLOSED market past its endTime:
 *   1. Fetch current metric from the oracle
 *   2. Call resolveMarket(marketId, metricValue) on-chain with admin wallet
 */
import { NextRequest, NextResponse } from "next/server"
import { createPublicClient, createWalletClient, http } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { avalanche } from "viem/chains"
import { CONTRACTS, MARKET_ABI } from "@/lib/contracts"

const ORACLE_URL =
  process.env.ORACLE_URL ||
  process.env.NEXT_PUBLIC_ORACLE_URL ||
  "https://trendzap-oracle-production.up.railway.app"

const PLATFORM_MAP: Record<string, string> = {
  x: "twitter",
  youtube: "youtube",
  tiktok: "tiktok",
  instagram: "instagram",
}

const PLATFORMS_ENUM = ["x", "youtube", "tiktok", "instagram"] as const
const METRICS_ENUM = ["likes", "views", "retweets", "comments", "shares"] as const

// STATUS: 0=PENDING, 1=ACTIVE, 2=CLOSED, 3=RESOLVED, 4=CANCELLED, 5=DISPUTED
const SETTLEABLE_STATUSES = new Set([1, 2]) // ACTIVE and CLOSED

async function fetchOracleMetric(
  postUrl: string,
  platform: string,
  metric: string
): Promise<number | null> {
  try {
    const oraclePlatform = PLATFORM_MAP[platform] ?? platform
    const res = await fetch(
      `${ORACLE_URL}/api/v1/metrics?url=${encodeURIComponent(postUrl)}&platform=${oraclePlatform}&metric=${metric}`,
      { signal: AbortSignal.timeout(12_000) }
    )
    if (!res.ok) return null
    const data = await res.json()
    if (!data.success) return null
    const val = data.data?.value
    return typeof val === "number" ? val : null
  } catch {
    return null
  }
}

async function run() {
  const privateKey = process.env.ADMIN_PRIVATE_KEY
  if (!privateKey) {
    return { ok: false, error: "ADMIN_PRIVATE_KEY not configured" }
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`)
  const transport = http(process.env.NEXT_PUBLIC_RPC_URL)
  const publicClient = createPublicClient({ chain: avalanche, transport })
  const walletClient = createWalletClient({ account, chain: avalanche, transport })

  const now = BigInt(Math.floor(Date.now() / 1000))

  // Read total market count
  const nextId = await publicClient.readContract({
    address: CONTRACTS.market,
    abi: MARKET_ABI,
    functionName: "nextMarketId",
  })
  const total = Number(nextId)
  if (total === 0) return { ok: true, checked: 0, settled: [], skipped: [] }

  // Parallel read all markets
  const marketReads = await Promise.all(
    Array.from({ length: total }, (_, i) =>
      publicClient
        .readContract({
          address: CONTRACTS.market,
          abi: MARKET_ABI,
          functionName: "getMarket",
          args: [BigInt(i)],
        })
        .catch(() => null)
    )
  )

  const settled: number[] = []
  const skipped: { id: number; reason: string }[] = []

  for (let i = 0; i < total; i++) {
    const raw = marketReads[i]
    if (!raw) continue

    const status = Number(raw.status)
    const endTime = BigInt(raw.params.endTime)

    if (!SETTLEABLE_STATUSES.has(status)) continue
    if (endTime >= now) continue

    const platform = PLATFORMS_ENUM[Number(raw.params.platform)] ?? "x"
    const metric = METRICS_ENUM[Number(raw.params.metricType)] ?? "views"
    const postUrl = raw.params.postUrl

    const metricValue = await fetchOracleMetric(postUrl, platform, metric)
    if (metricValue === null) {
      skipped.push({ id: i, reason: "oracle unavailable or no data" })
      continue
    }

    try {
      const hash = await walletClient.writeContract({
        address: CONTRACTS.market,
        abi: MARKET_ABI,
        functionName: "resolveMarket",
        args: [BigInt(i), BigInt(Math.round(metricValue))],
      })
      settled.push(i)
      console.log(`[settle-expired] market #${i} resolved, value=${metricValue}, tx=${hash}`)
    } catch (e) {
      skipped.push({ id: i, reason: String(e) })
      console.error(`[settle-expired] market #${i} failed:`, e)
    }
  }

  return { ok: true, checked: total, settled, skipped }
}

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true // no secret set → open (fine for internal Railway network)
  return req.headers.get("authorization") === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  try {
    return NextResponse.json(await run())
  } catch (err) {
    console.error("[settle-expired]", err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

// Railway Cron can call POST too
export const POST = GET
