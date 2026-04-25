import { NextRequest, NextResponse } from "next/server"

const RISK_URL = process.env.RISK_URL || process.env.NEXT_PUBLIC_RISK_URL

function buildAssessUrl(baseUrl: string) {
  const trimmed = baseUrl.trim().replace(/\/+$/, "")
  if (trimmed.endsWith("/api/v1")) return `${trimmed}/assess`
  return `${trimmed}/api/v1/assess`
}

/**
 * POST /api/risk
 * Server-side proxy to risk service POST /assess
 * Avoids CORS issues when calling from the browser.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (!RISK_URL) {
      // Risk service not configured — return safe default
      return NextResponse.json({ ok: true, risk_score: 0, risk_level: "low", recommendation: "approve" })
    }

    const res = await fetch(buildAssessUrl(RISK_URL), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8_000),
    })

    if (!res.ok) {
      console.error("[risk proxy]", res.status, await res.text().catch(() => ""))
      return NextResponse.json({ ok: true, risk_score: 0, risk_level: "low", recommendation: "approve" })
    }

    const data = await res.json()
    return NextResponse.json({ ok: true, ...data })
  } catch (err) {
    console.error("[risk proxy]", err)
    // Graceful degradation — don't block market creation
    return NextResponse.json({ ok: true, risk_score: 0, risk_level: "low", recommendation: "approve" })
  }
}
