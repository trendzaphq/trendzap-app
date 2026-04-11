/**
 * Server-side proxy for oracle metric fetches.
 * Avoids CORS issues when admin page fetches oracle directly from the browser.
 */
import { NextRequest, NextResponse } from "next/server"

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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get("url")
  const platform = searchParams.get("platform") || "x"
  const metric = searchParams.get("metric") || "views"

  if (!url) {
    return NextResponse.json({ ok: false, error: "url required" }, { status: 400 })
  }

  try {
    const oraclePlatform = PLATFORM_MAP[platform] ?? platform
    const res = await fetch(
      `${ORACLE_URL}/api/v1/metrics?url=${encodeURIComponent(url)}&platform=${oraclePlatform}&metric=${metric}`,
      { signal: AbortSignal.timeout(12_000) }
    )
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    console.error("[admin/oracle-metric]", err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
