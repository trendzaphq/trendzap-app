import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export const runtime = "nodejs"

// Lazy init — only call neon() when handler is invoked, not at build time
let _db: ReturnType<typeof neon> | undefined
const getSql = () => {
  if (!_db) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured")
    _db = neon(process.env.DATABASE_URL)
  }
  return _db
}

export async function POST(req: NextRequest) {
  try {
    const sql = getSql()
    const { address } = await req.json()
    if (!address || typeof address !== "string") {
      return NextResponse.json({ error: "address is required and must be a string" }, { status: 400 })
    }

    const normalized = address.toLowerCase()

    // Upsert: create if new, update last_seen if exists
    await sql`
      INSERT INTO users (address, first_seen, last_seen)
      VALUES (${normalized}, NOW(), NOW())
      ON CONFLICT (address) DO UPDATE
      SET last_seen = NOW()
    `

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[users/register]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
