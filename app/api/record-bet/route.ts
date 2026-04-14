/**
 * POST /api/record-bet
 * Called immediately after buyShares confirms on-chain so Activity tab,
 * Recent Bets, and Odds Chart update without waiting for the indexer batch.
 * Also accepts an optional price point (newPriceOver/newPriceUnder) from
 * the SharesBought event emitted in the same tx.
 */
import { NextResponse } from "next/server"
import { ensureSchema, insertBetEvent, insertPricePoint, upsertUser } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      market_id,
      is_over,
      cost_wei,
      tx_hash,
      trader_address,
      block_number,
      price_over,   // optional — 0-100 number
      price_under,  // optional — 0-100 number
    } = body

    if (!market_id || cost_wei == null || !tx_hash || !trader_address) {
      return NextResponse.json({ ok: false, error: "missing required fields" }, { status: 400 })
    }

    await ensureSchema()

    await insertBetEvent({
      market_id: Number(market_id),
      trader_address: String(trader_address).toLowerCase(),
      is_over: Boolean(is_over),
      shares: "0", // exact shares filled in by full indexer sync later
      cost_wei: String(cost_wei),
      block_number: String(block_number ?? 0),
      tx_hash: String(tx_hash),
      block_timestamp: Math.floor(Date.now() / 1000),
    })

    // Record the updated odds snapshot so the chart starts moving immediately
    if (price_over != null && price_under != null && block_number) {
      await insertPricePoint(
        Number(market_id),
        String(block_number),
        Number(price_over),
        Number(price_under),
        tx_hash
      )
    }

    // Track the user in the users table
    await upsertUser(String(trader_address))

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[record-bet]", err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
