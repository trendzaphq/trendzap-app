import { NextResponse } from "next/server"
import { ensureSchema, getUserBets, sql } from "@/lib/db"

const formatUsdc = (raw: string) => (Number(BigInt(raw)) / 1e6).toFixed(4)

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const address = searchParams.get("address")
    if (!address) return NextResponse.json({ ok: false, error: "address required" }, { status: 400 })

    await ensureSchema()

    const bets = await getUserBets(address)

    // Fetch resolution state for all markets this user has bet on
    const marketIds = [...new Set(bets.map((b) => b.market_id))]
    const resolutions: Record<number, { outcome: number; resolvedValue: string }> = {}
    if (marketIds.length > 0) {
      const rows = await sql`
        SELECT market_id, outcome, resolved_value FROM resolution_events
        WHERE market_id = ANY(${marketIds}::int[])
      ` as { market_id: number; outcome: number; resolved_value: string }[]
      for (const r of rows) resolutions[r.market_id] = { outcome: r.outcome, resolved_value: r.resolved_value }
    }

    // Fetch claim events for this user
    const claimedRows = await sql`
      SELECT market_id, payout_wei FROM claim_events WHERE LOWER(user_address) = LOWER(${address})
    ` as { market_id: number; payout_wei: string }[]
    const claims: Record<number, string> = {}
    for (const c of claimedRows) claims[c.market_id] = c.payout_wei

    // Fetch market titles for display
    const metaRows = marketIds.length > 0
      ? await sql`SELECT market_id, title FROM market_metadata WHERE market_id = ANY(${marketIds}::int[])` as { market_id: number; title: string | null }[]
      : []
    const titles: Record<number, string> = {}
    for (const m of metaRows) titles[m.market_id] = m.title || `Market #${m.market_id}`

    const active = []
    const history = []

    for (const bet of bets) {
      const resolution = resolutions[bet.market_id]
      const costAvax = formatUsdc(bet.cost_wei)
      const title = titles[bet.market_id] || `Market #${bet.market_id}`

      if (!resolution) {
        active.push({
          id: String(bet.id),
          market_id: bet.market_id,
          title,
          position: bet.is_over ? "over" : "under",
          amount: costAvax,
          tx_hash: bet.tx_hash,
        })
      } else {
        // outcome: 1=OVER, 2=UNDER
        const betWon = (resolution.outcome === 1 && bet.is_over) || (resolution.outcome === 2 && !bet.is_over)
        const payout = claims[bet.market_id]
          ? formatUsdc(claims[bet.market_id])
          : "0.0000"
        history.push({
          id: String(bet.id),
          market_id: bet.market_id,
          title,
          position: bet.is_over ? "over" : "under",
          amount: costAvax,
          result: betWon ? "won" : "lost",
          payout,
          tx_hash: bet.tx_hash,
        })
      }
    }

    return NextResponse.json({ ok: true, active, history })
  } catch (err) {
    console.error("[bets]", err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
