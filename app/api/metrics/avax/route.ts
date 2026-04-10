import { NextResponse } from "next/server"
import { sql } from "@neondatabase/serverless"

export const runtime = "nodejs"

/**
 * AVAX leaderboard metrics endpoint
 * Exposes: active_accounts, transactions, total_volume (proxy for gas)
 * Used for AVAX team tracking of project activity
 */

let _db: ReturnType<typeof import("@neondatabase/serverless").neon> | undefined
const getSql = () => {
  if (!_db) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not configured")
    const { neon } = require("@neondatabase/serverless")
    _db = neon(process.env.DATABASE_URL)
  }
  return _db
}

export async function GET(req: Request) {
  try {
    const db = getSql()

    // Parse timeframe param (daily, weekly, all-time)
    const { searchParams } = new URL(req.url)
    const timeframe = searchParams.get("timeframe") || "all-time"

    let whereSince = ""
    if (timeframe === "daily") {
      whereSince = `AND block_timestamp > ${Math.floor(Date.now() / 1000) - 86400}`
    } else if (timeframe === "weekly") {
      whereSince = `AND block_timestamp > ${Math.floor(Date.now() / 1000) - 7 * 86400}`
    }

    // Active Accounts: COUNT(DISTINCT trader) across all bets + claims
    const activeAccountsResult = await db`
      SELECT COUNT(DISTINCT trader_address) as count
      FROM bet_events
      WHERE 1=1 ${whereSince ? db(whereSince) : db``}
    ` as { count: string }[]

    // Transactions: total bet + claim transactions
    const betTxResult = await db`
      SELECT COUNT(*) as count FROM bet_events ${whereSince ? db(`WHERE ${whereSince}`) : db``}
    ` as { count: string }[]

    const claimTxResult = await db`
      SELECT COUNT(*) as count FROM claim_events ${whereSince ? db(`WHERE ${whereSince}`) : db ``}
    ` as { count: string }[]

    // Volume: total USDC moved (sum of all bet costs + payouts)
    const volumeResult = await db`
      SELECT
        COALESCE(SUM(CAST(cost_wei AS NUMERIC)), 0) as total_bet_volume,
        0 as total_claim_volume
      FROM bet_events
      WHERE 1=1 ${whereSince ? db(whereSince) : db``}
    ` as { total_bet_volume: string; total_claim_volume: string }[]

    const activeAccounts = parseInt(activeAccountsResult[0]?.count || "0")
    const betTxCount = parseInt(betTxResult[0]?.count || "0")
    const claimTxCount = parseInt(claimTxResult[0]?.count || "0")
    const totalTransactions = betTxCount + claimTxCount
    const totalVolumeWei = volumeResult[0]?.total_bet_volume || "0"
    const totalVolumeUsdc = Number(totalVolumeWei) / 1e6

    return NextResponse.json({
      ok: true,
      timeframe,
      metrics: {
        active_accounts: activeAccounts,
        transactions: totalTransactions,
        volume_usdc: parseFloat(totalVolumeUsdc.toFixed(2)),
        volume_wei: totalVolumeWei,
        bet_transactions: betTxCount,
        claim_transactions: claimTxCount,
      },
      timestamp: Math.floor(Date.now() / 1000),
    })
  } catch (err) {
    console.error("[metrics/avax]", err)
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    )
  }
}
