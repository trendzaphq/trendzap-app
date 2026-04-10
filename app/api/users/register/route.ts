import { NextRequest, NextResponse } from "next/server"
import { sql } from "@neondatabase/serverless"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
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
