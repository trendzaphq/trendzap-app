import { NextRequest, NextResponse } from "next/server"

export const runtime = "edge"

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
      suggested_title: post_text.length > 60
        ? `Will this ${platform.toUpperCase()} post go viral? (${post_text.slice(0, 50)}…)`
        : `Will this ${platform.toUpperCase()} post hit its target?`,
      virality_assessment: analysis.virality_assessment ?? null,
      content_strengths: analysis.content_strengths ?? [],
      cached: data?.cached ?? false,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ ok: false, error: msg }, { status: 200 })
  }
}
