import { NextRequest, NextResponse } from "next/server"
import { ensureSchema, upsertUser } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json()
    if (!address || typeof address !== "string") {
      return NextResponse.json({ error: "address required" }, { status: 400 })
    }
    await ensureSchema()
    await upsertUser(address)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
