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

const TWITTER_METRIC_MAP: Record<string, string> = {
  likes: "like_count",
  views: "view_count",
  retweets: "retweet_count",
  replies: "reply_count",
  comments: "reply_count",
}

const PLATFORMS_ENUM = ["x", "youtube", "tiktok", "instagram"] as const
const METRICS_ENUM = ["likes", "views", "retweets", "comments", "shares"] as const

// STATUS: 0=PENDING, 1=ACTIVE, 2=CLOSED, 3=RESOLVED, 4=CANCELLED, 5=DISPUTED
const SETTLEABLE_STATUSES = new Set([1, 2]) // ACTIVE and CLOSED

function extractTweetId(url: string): string | null {
  const match = url.match(/(?:twitter\.com|x\.com)\/(\w+)\/status\/(\d+)/)
  return match ? match[2] : null
}
function extractTweetUsername(url: string): string | null {
  const match = url.match(/(?:twitter\.com|x\.com)\/(\w+)\/status\/\d+/)
  return match ? match[1] : null
}

async function fetchTwitterFallback(postUrl: string, metric: string): Promise<number | null> {
  const tweetId = extractTweetId(postUrl)
  const username = extractTweetUsername(postUrl)
  if (!tweetId || !username) return null
  const metricKey = TWITTER_METRIC_MAP[metric]
  if (!metricKey) return null

  try {
    const res = await fetch(`https://api.fxtwitter.com/${username}/status/${tweetId}`, {
      signal: AbortSignal.timeout(8_000),
    })
    if (res.ok) {
      const data = await res.json()
      const t = data.tweet
      if (t) {
        const map: Record<string, number | undefined> = {
          like_count: t.likes, retweet_count: t.retweets,
          reply_count: t.replies, view_count: t.views,
        }
        const val = map[metricKey]
        if (val != null) return val
      }
    }
  } catch { /* fall through */ }

  try {
    const token = ((Number(tweetId) / 1e15) * Math.PI).toString(6).replace(/(.).*\1/, "").slice(-6)
    const res = await fetch(
      `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&lang=en&token=${token}`,
      { signal: AbortSignal.timeout(5_000) }
    )
    if (res.ok) {
      const s = await res.json()
      const map: Record<string, number | undefined> = {
        like_count: s.favorite_count, retweet_count: s.retweet_count,
        reply_count: s.conversation_count,
        view_count: s.views?.count ? parseInt(s.views.count, 10) : undefined,
      }
      const val = map[metricKey]
      if (val != null) return val
    }
  } catch { /* fall through */ }

  return null
}

async function fetchOracleMetric(
  postUrl: string,
  platform: string,
  metric: string
): Promise<number | null> {
  const oraclePlatform = PLATFORM_MAP[platform] ?? platform

  // Try oracle first
  try {
    const res = await fetch(
      `${ORACLE_URL}/api/v1/metrics?url=${encodeURIComponent(postUrl)}&platform=${oraclePlatform}&metric=${metric}`,
      { signal: AbortSignal.timeout(12_000) }
    )
    if (res.ok) {
      const data = await res.json()
      if (data.success && typeof data.data?.value === "number") return data.data.value
    }
  } catch { /* fall through */ }

  // Fallback for Twitter
  if (oraclePlatform === "twitter") {
    return fetchTwitterFallback(postUrl, metric)
  }

  return null
}

export async function run() {
  const rawKey = process.env.ADMIN_PRIVATE_KEY
  if (!rawKey) {
    return { ok: false, error: "ADMIN_PRIVATE_KEY not configured" }
  }
  // Ensure 0x prefix — viem requires it
  const privateKey = (rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`) as `0x${string}`

  const account = privateKeyToAccount(privateKey)
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
