import { NextRequest, NextResponse } from "next/server"

const ORACLE_URL = process.env.ORACLE_URL || process.env.NEXT_PUBLIC_ORACLE_URL || "https://trendzap-oracle-production.up.railway.app"

// Map frontend platform names to oracle-expected names
const PLATFORM_MAP: Record<string, string> = {
  x: "twitter",
  youtube: "youtube",
  tiktok: "tiktok",
  instagram: "instagram",
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

  try {
    const res = await fetch(
      `${ORACLE_URL}/api/v1/metrics?url=${encodeURIComponent(url)}&platform=${oraclePlatform}&metric=${metric}`,
      { next: { revalidate: 0 } }
    )
    const data = await res.json()
    if (!res.ok || !data.success) {
      return NextResponse.json({ ok: false, error: data.error || "oracle error" }, { status: 502 })
    }
    const value = data.data?.value
    const confidence = data.data?.confidence ?? null
    // If oracle couldn't fetch a real value, report it as unavailable
    if (value == null) {
      return NextResponse.json({ ok: false, error: "metric not available" }, { status: 502 })
    }
    return NextResponse.json({ ok: true, value, confidence })
  } catch (err) {
    console.error("[oracle/metrics]", err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 502 })
  }
}
