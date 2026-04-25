import { NextRequest, NextResponse } from "next/server"

export const runtime = "edge"

const STOPWORDS = new Set([
  "the", "and", "for", "that", "with", "this", "from", "have", "your", "will", "about", "just",
  "they", "them", "their", "there", "what", "when", "where", "which", "while", "into", "than",
  "then", "been", "being", "were", "was", "are", "our", "you", "his", "her", "its", "not", "but",
  "can", "all", "any", "how", "why", "out", "now", "new", "get", "got", "too", "via", "amp",
  "http", "https", "com", "www", "x", "twitter", "youtube", "video", "post",
])

function hashString(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function pickTopic(postText: string): string | null {
  const cleaned = postText
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[@#][a-z0-9_]+/gi, " ")
    .replace(/[^a-z0-9\s]/g, " ")

  const freq = new Map<string, number>()
  for (const token of cleaned.split(/\s+/)) {
    if (!token || token.length < 4 || STOPWORDS.has(token)) continue
    freq.set(token, (freq.get(token) ?? 0) + 1)
  }

  const top = [...freq.entries()].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)[0]?.[0]
  if (!top) return null

  return top.charAt(0).toUpperCase() + top.slice(1)
}

function buildStrategicTitle(platform: string, postText: string): string {
  const platformLabel = platform.toUpperCase()
  const topic = pickTopic(postText)
  const prefix = topic ? `this ${topic} post` : "this post"

  const templates = [
    `Will ${prefix} on ${platformLabel} beat its virality target this cycle?`,
    `Can ${prefix} break out and trend on ${platformLabel}?`,
    `Is ${prefix} positioned to outperform the average ${platformLabel} post?`,
    `Will market momentum push ${prefix} into breakout territory on ${platformLabel}?`,
    `Can ${prefix} convert engagement into a viral run on ${platformLabel}?`,
    `Will ${prefix} clear a high-confidence growth threshold on ${platformLabel}?`,
  ]

  const variant = hashString(`${platformLabel}:${postText}`) % templates.length
  const title = templates[variant]
  return title.length > 110 ? `${title.slice(0, 107)}...` : title
}

/**
 * POST /api/analyze
 * Proxy to intelligence service POST /api/v1/ai/analyze-post
 * Body: { platform, post_text, current_likes?, current_shares?, follower_count? }
 * Returns: { ok, suggested_title?, virality_assessment?, content_strengths? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { platform, post_text, current_likes = 0, current_shares = 0, follower_count = 0 } = body

    if (!platform) {
      return NextResponse.json({ ok: false, error: "platform is required" }, { status: 400 })
    }
    if (!post_text?.trim()) {
      // No post text — nothing to analyze; caller should handle gracefully
      return NextResponse.json({ ok: false, error: "post_text is required for AI analysis" }, { status: 400 })
    }

    const intelligenceUrl = process.env.INTELLIGENCE_URL || process.env.NEXT_PUBLIC_INTELLIGENCE_URL
    if (!intelligenceUrl) {
      return NextResponse.json({ ok: false, error: "Intelligence service not configured" }, { status: 503 })
    }

    const upstream = await fetch(`${intelligenceUrl}/api/v1/ai/analyze-post`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, post_text, follower_count, current_likes, current_shares }),
      signal: AbortSignal.timeout(15000),
    })

    if (!upstream.ok) {
      return NextResponse.json({ ok: false, error: `Intelligence service error ${upstream.status}` }, { status: 200 })
    }

    const data = await upstream.json()
    const analysis = data?.analysis ?? {}

    // Map to the shape the create page expects
    return NextResponse.json({
      ok: true,
      suggested_title: buildStrategicTitle(platform, post_text),
      virality_assessment: analysis.virality_assessment ?? null,
      content_strengths: analysis.content_strengths ?? [],
      cached: data?.cached ?? false,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ ok: false, error: msg }, { status: 200 })
  }
}
