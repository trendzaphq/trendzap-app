import { NextResponse } from "next/server"
import { sql, ensureSchema } from "@/lib/db"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get("q")?.trim()
    if (!q || q.length < 2) return NextResponse.json({ ok: true, results: [] })

    await ensureSchema()
    const pattern = `%${q}%`
    const rows = await sql`
      SELECT market_id, title, thumbnail_url, creator_address
      FROM market_metadata
      WHERE title ILIKE ${pattern} OR market_id::text ILIKE ${pattern}
      ORDER BY created_at DESC
      LIMIT 20
    ` as { market_id: number; title: string | null; thumbnail_url: string | null; creator_address: string | null }[]

    return NextResponse.json({ ok: true, results: rows })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
