import { NextRequest, NextResponse } from "next/server"

const ORACLE_URL = process.env.ORACLE_URL || process.env.NEXT_PUBLIC_ORACLE_URL || "https://trendzap-oracle-production.up.railway.app"

const PLATFORM_MAP: Record<string, string> = {
  x: "twitter",
  youtube: "youtube",
  tiktok: "tiktok",
  instagram: "instagram",
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { marketId, postUrl, platform, metricType, threshold, resolutionTime } = body

    if (!postUrl || platform === undefined || !metricType || !threshold || !resolutionTime) {
      return NextResponse.json({ ok: false, error: "missing required fields" }, { status: 400 })
    }

    const oraclePlatform = PLATFORM_MAP[platform] ?? platform

    const res = await fetch(`${ORACLE_URL}/api/v1/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        marketId,
        postUrl,
        platform: oraclePlatform,
        metricType,
        threshold: String(threshold),
        resolutionTime,
      }),
    })

    const data = await res.json()
    if (!res.ok || !data.success) {
      console.error("[oracle/schedule] failed:", data)
      return NextResponse.json({ ok: false, error: data.error || "oracle schedule error" }, { status: 502 })
    }

    return NextResponse.json({ ok: true, ...data })
  } catch (err) {
    console.error("[oracle/schedule]", err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
