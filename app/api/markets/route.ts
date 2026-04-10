import { NextRequest, NextResponse } from "next/server"
import { ensureSchema, getAllMetadata, upsertMetadata } from "@/lib/db"

// GET /api/markets — fetch all market metadata from DB
export async function GET() {
  try {
    await ensureSchema()
    const rows = await getAllMetadata()
    return NextResponse.json(rows)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

// POST /api/markets — save metadata after on-chain market creation
export async function POST(req: NextRequest) {
  try {
    await ensureSchema()
    const body = await req.json()
    const { market_id, title, description, thumbnail_url, creator_address } = body

    if (market_id === undefined) {
      return NextResponse.json({ error: "market_id is required" }, { status: 400 })
    }

    const slug = crypto.randomUUID()

    await upsertMetadata({
      market_id: Number(market_id),
      slug,
      title: title ?? null,
      description: description ?? null,
      thumbnail_url: thumbnail_url ?? null,
      creator_address: creator_address ?? null,
      chain_id: 43114,
    })

    return NextResponse.json({ ok: true, slug })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

