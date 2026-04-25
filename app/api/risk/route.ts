import { NextRequest, NextResponse } from "next/server"

const RISK_URL = process.env.RISK_URL || process.env.NEXT_PUBLIC_RISK_URL

function buildAssessUrl(baseUrl: string) {
  const trimmed = baseUrl.trim().replace(/\/+$/, "")
  if (trimmed.endsWith("/api/v1")) return `${trimmed}/assess`
  return `${trimmed}/api/v1/assess`
}

function conservativeThresholdCheck(body: any) {
  const threshold = Number(body?.threshold)
  const currentValue = Number(body?.current_value)
  const metric = String(body?.metric || "metric")

  if (!Number.isFinite(threshold) || threshold <= 0) return null
  if (!Number.isFinite(currentValue) || currentValue < 0) return null
  if (currentValue < threshold) return null

  return {
    ok: true,
    risk_score: 95,
    risk_level: "high",
    flags: [
      `Current ${metric} (${currentValue.toLocaleString()}) already meets/exceeds threshold (${threshold.toLocaleString()}).`,
      "This market would resolve immediately in favor of OVER.",
    ],
    recommendation: "reject",
  }
}

/**
 * POST /api/risk
 * Server-side proxy to risk service POST /assess
 * Avoids CORS issues when calling from the browser.
 */
export async function POST(req: NextRequest) {
  let conservativeReject: ReturnType<typeof conservativeThresholdCheck> = null
  try {
    const body = await req.json()
    conservativeReject = conservativeThresholdCheck(body)

    if (!RISK_URL) {
      // Risk service not configured — enforce conservative threshold guard, otherwise allow.
      if (conservativeReject) return NextResponse.json(conservativeReject)
      return NextResponse.json({ ok: true, risk_score: 0, risk_level: "low", recommendation: "approve", flags: [] })
    }

    const res = await fetch(buildAssessUrl(RISK_URL), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8_000),
    })

    if (!res.ok) {
      console.error("[risk proxy]", res.status, await res.text().catch(() => ""))
      if (conservativeReject) return NextResponse.json(conservativeReject)
      return NextResponse.json({ ok: true, risk_score: 0, risk_level: "low", recommendation: "approve", flags: [] })
    }

    const data = await res.json()
    if (conservativeReject) {
      const upstreamFlags = Array.isArray(data?.flags) ? data.flags : []
      return NextResponse.json({
        ok: true,
        ...data,
        risk_score: Math.max(Number(data?.risk_score || 0), conservativeReject.risk_score),
        risk_level: "high",
        recommendation: "reject",
        flags: [...conservativeReject.flags, ...upstreamFlags],
      })
    }
    return NextResponse.json({ ok: true, ...data })
  } catch (err) {
    console.error("[risk proxy]", err)
    // Graceful degradation — enforce conservative threshold guard when possible.
    if (conservativeReject) return NextResponse.json(conservativeReject)
    return NextResponse.json({ ok: true, risk_score: 0, risk_level: "low", recommendation: "approve", flags: [] })
  }
}
