import { NextRequest, NextResponse } from "next/server"
import { ensureSchema, getMetadata } from "@/lib/db"

// GET /api/markets/[id] — fetch single market metadata
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureSchema()
    const { id } = await params
    const row = await getMetadata(Number(id))
    if (!row) return NextResponse.json({ error: "not found" }, { status: 404 })
    return NextResponse.json(row)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
