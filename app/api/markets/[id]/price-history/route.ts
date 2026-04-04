import { NextResponse } from "next/server"
import { ensureSchema, getPriceHistory } from "@/lib/db"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureSchema()
    const { id } = await params
    const points = await getPriceHistory(parseInt(id, 10))
    return NextResponse.json({ ok: true, points })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
