import { NextResponse } from "next/server"
import { ensureSchema, sql } from "@/lib/db"

const formatUsdc = (raw: string) => (Number(BigInt(raw)) / 1e6).toFixed(4)

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await ensureSchema()
    const marketId = parseInt(params.id, 10)
    if (isNaN(marketId)) return NextResponse.json({ ok: false, error: "invalid id" }, { status: 400 })

    const rows = await sql`
      SELECT trader_address, is_over, cost_wei, block_timestamp, tx_hash
      FROM bet_events
      WHERE market_id = ${marketId}
      ORDER BY block_number DESC
      LIMIT 10
    ` as Array<{ trader_address: string; is_over: boolean; cost_wei: string; block_timestamp: number | null; tx_hash: string }>

    const bets = rows.map((r) => {
      const addr = r.trader_address
      const short = `${addr.slice(0, 6)}…${addr.slice(-4)}`
      const tsMs = r.block_timestamp ? r.block_timestamp * 1000 : null
      const elapsed = tsMs ? getElapsed(tsMs) : null
      return {
        address: addr,
        short,
        avatar: short.slice(0, 2).toUpperCase(),
        position: r.is_over ? "over" : "under",
        amount: formatUsdc(r.cost_wei),
        time: elapsed,
        tx_hash: r.tx_hash,
      }
    })

    return NextResponse.json({ ok: true, bets })
  } catch (err) {
    console.error("[market bets]", err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

function getElapsed(tsMs: number): string {
  const secs = Math.floor((Date.now() - tsMs) / 1000)
  if (secs < 60) return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}
