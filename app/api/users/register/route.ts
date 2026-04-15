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

    // Generate a random seed for the avatar (used by DiceBear on first signup)
    const avatarSeed = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6)

    // Upsert: create with random avatar seed if new, update last_seen if exists
    await sql`
      INSERT INTO users (address, first_seen, last_seen, avatar_seed)
      VALUES (${normalized}, NOW(), NOW(), ${avatarSeed})
      ON CONFLICT (address) DO UPDATE
      SET last_seen = NOW()
    `

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[users/register]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
