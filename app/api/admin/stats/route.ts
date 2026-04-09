import { NextResponse } from "next/server"
import { ensureSchema, getUserStats } from "@/lib/db"

export async function GET() {
  try {
    await ensureSchema()
    const stats = await getUserStats()
    return NextResponse.json(stats)
  } catch (err) {
    console.error("[admin/stats]", err)
    return NextResponse.json({ total_users: 0, total_bets: 0, total_volume_usdc: "0" })
  }
}
