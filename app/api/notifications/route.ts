import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export const runtime = "edge"

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address")
  if (!address) return NextResponse.json({ ok: false, notifications: [] })

  const sql = neon(process.env.DATABASE_URL!)
  const normalised = address.toLowerCase()

  try {
    // Find resolved markets where this user had a bet
    const rows = await sql`
      SELECT
        b.market_id,
        b.is_over,
        b.cost_wei,
        r.outcome,
        r.resolved_value,
        r.resolved_at,
        m.title,
        c.payout_wei,
        c.tx_hash AS claim_tx
      FROM bet_events b
      JOIN resolution_events r ON r.market_id = b.market_id
      LEFT JOIN market_metadata m ON m.market_id = b.market_id
      LEFT JOIN claim_events c ON c.market_id = b.market_id AND LOWER(c.user_address) = ${normalised}
      WHERE LOWER(b.trader_address) = ${normalised}
      ORDER BY r.resolved_at DESC
      LIMIT 20
    ` as Array<{
      market_id: number
      is_over: boolean
      cost_wei: string
      outcome: number
      resolved_value: string
      resolved_at: number
      title: string | null
      payout_wei: string | null
      claim_tx: string | null
    }>

    const notifications = rows.map((r) => {
      // outcome: 1 = OVER won, 0 = UNDER won
      const userWon = r.is_over ? r.outcome === 1 : r.outcome === 0
      const betAvax = Number(BigInt(r.cost_wei)) / 1e18
      const payoutAvax = r.payout_wei ? Number(BigInt(r.payout_wei)) / 1e18 : 0
      const marketTitle = r.title || `Market #${r.market_id}`

      return {
        id: `${r.market_id}-${r.resolved_at}`,
        market_id: r.market_id,
        title: marketTitle,
        won: userWon,
        outcome: r.outcome === 1 ? "OVER" : "UNDER",
        position: r.is_over ? "OVER" : "UNDER",
        bet_avax: betAvax,
        payout_avax: payoutAvax,
        claimed: !!r.claim_tx,
        resolved_at: r.resolved_at,
        message: userWon
          ? `You won on "${marketTitle.slice(0, 50)}${marketTitle.length > 50 ? "…" : ""}"`
          : `Market resolved: "${marketTitle.slice(0, 50)}${marketTitle.length > 50 ? "…" : ""}"`,
      }
    })

    return NextResponse.json({ ok: true, notifications, count: notifications.length })
  } catch (e) {
    console.error("Notifications error:", e)
    return NextResponse.json({ ok: false, notifications: [], error: String(e) })
  }
}
