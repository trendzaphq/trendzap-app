import { NextRequest, NextResponse } from "next/server"

export const runtime = "edge"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { url, platform } = body

    if (!url) {
      return NextResponse.json({ ok: false, error: "url is required" }, { status: 400 })
    }

    const intelligenceUrl = process.env.INTELLIGENCE_URL || process.env.NEXT_PUBLIC_INTELLIGENCE_URL
    if (!intelligenceUrl) {
      return NextResponse.json({ ok: false, error: "Intelligence service not configured" }, { status: 503 })
    }

    const upstream = await fetch(`${intelligenceUrl}/analyze/trend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, platform }),
      signal: AbortSignal.timeout(12000),
    })

    if (!upstream.ok) {
      return NextResponse.json({ ok: false, error: `Intelligence service returned ${upstream.status}` }, { status: 502 })
    }

    const data = await upstream.json()
    return NextResponse.json({ ok: true, ...data })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    // Timeout or network error — return a soft failure so the UI can proceed without data
    return NextResponse.json({ ok: false, error: msg }, { status: 200 })
  }
}
