import { NextRequest, NextResponse } from "next/server"

const ORACLE_URL = process.env.ORACLE_URL || process.env.NEXT_PUBLIC_ORACLE_URL || "https://trendzap-oracle-production.up.railway.app"

// Map frontend platform names to oracle-expected names
const PLATFORM_MAP: Record<string, string> = {
  x: "twitter",
  youtube: "youtube",
  tiktok: "tiktok",
  instagram: "instagram",
}

// Map metric names to Twitter public_metrics field names
const TWITTER_METRIC_MAP: Record<string, string> = {
  likes: "like_count",
  views: "view_count",
  retweets: "retweet_count",
  replies: "reply_count",
  comments: "reply_count",
}

function extractTweetId(url: string): string | null {
  const match = url.match(/(?:twitter\.com|x\.com)\/(\w+)\/status\/(\d+)/)
  return match ? match[2] : null
}

function extractTweetUsername(url: string): string | null {
  const match = url.match(/(?:twitter\.com|x\.com)\/(\w+)\/status\/\d+/)
  return match ? match[1] : null
}

/** Fallback: fetch Twitter metrics via FxTwitter (no auth needed) */
async function fetchTwitterMetricFallback(url: string, metric: string): Promise<number | null> {
  const tweetId = extractTweetId(url)
  const username = extractTweetUsername(url)
  if (!tweetId || !username) return null

  const metricKey = TWITTER_METRIC_MAP[metric]
  if (!metricKey) return null

  // Try FxTwitter API first (reliable, no auth, includes views)
  try {
    const res = await fetch(`https://api.fxtwitter.com/${username}/status/${tweetId}`, {
      signal: AbortSignal.timeout(8_000),
    })
    if (res.ok) {
      const data = await res.json()
      const t = data.tweet
      if (t) {
        const map: Record<string, number | undefined> = {
          like_count: t.likes,
          retweet_count: t.retweets,
          reply_count: t.replies,
          view_count: t.views,
        }
        const val = map[metricKey]
        if (val != null) return val
      }
    }
  } catch { /* fall through */ }

  // Try Twitter Syndication API (no auth, used by react-tweet)
  try {
    const token = ((Number(tweetId) / 1e15) * Math.PI).toString(6).replace(/(.).*\1/, "").slice(-6)
    const res = await fetch(
      `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&lang=en&token=${token}`,
      { signal: AbortSignal.timeout(5_000) }
    )
    if (res.ok) {
      const s = await res.json()
      const map: Record<string, number | undefined> = {
        like_count: s.favorite_count,
        retweet_count: s.retweet_count,
        reply_count: s.conversation_count,
        view_count: s.views?.count ? parseInt(s.views.count, 10) : undefined,
      }
      const val = map[metricKey]
      if (val != null) return val
    }
  } catch { /* fall through */ }

  return null
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const url = searchParams.get("url")
  const platform = searchParams.get("platform")
  const metric = searchParams.get("metric")

  if (!url || !platform || !metric) {
    return NextResponse.json({ ok: false, error: "url, platform, metric required" }, { status: 400 })
  }

  const oraclePlatform = PLATFORM_MAP[platform] ?? platform

  // Try the oracle service first
  try {
    const res = await fetch(
      `${ORACLE_URL}/api/v1/metrics?url=${encodeURIComponent(url)}&platform=${oraclePlatform}&metric=${metric}`,
      { signal: AbortSignal.timeout(12_000), next: { revalidate: 0 } }
    )
    const data = await res.json()
    if (res.ok && data.success && data.data?.value != null) {
      return NextResponse.json({ ok: true, value: data.data.value, confidence: data.data.confidence ?? null })
    }
  } catch { /* oracle failed, try fallback */ }

  // Fallback for Twitter: use FxTwitter + Syndication APIs (same as embed route)
  if (oraclePlatform === "twitter") {
    const fallbackValue = await fetchTwitterMetricFallback(url, metric)
    if (fallbackValue != null) {
      return NextResponse.json({ ok: true, value: fallbackValue, confidence: 0.7 })
    }
  }

  return NextResponse.json({ ok: false, error: "metric not available" }, { status: 502 })
}
