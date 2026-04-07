import { NextResponse } from "next/server"
import { ensureSchema, getLeaderboard } from "@/lib/db"

const formatUsdc = (raw: string | bigint) => Number(BigInt(raw)) / 1e6

export async function GET(req: Request) {
  try {
    await ensureSchema()

    const { searchParams } = new URL(req.url)
    const timeframe = searchParams.get("timeframe") || "all-time"

    let since: number | undefined
    const now = Math.floor(Date.now() / 1000)
    if (timeframe === "weekly") since = now - 7 * 86400
    else if (timeframe === "daily") since = now - 86400

    const rows = await getLeaderboard(since)

    const entries = rows.map((row, i) => {
      const costEth = formatUsdc(row.total_cost_wei)
      const payoutEth = formatUsdc(row.total_payout_wei)
      const profit = payoutEth - costEth
      const totalBets = parseInt(row.total_bets)
      const wins = parseInt(row.wins)
      const winRate = totalBets > 0 ? Math.round((wins / totalBets) * 100 * 10) / 10 : 0
      const address = row.trader_address
      const short = `${address.slice(0, 6)}…${address.slice(-4)}`

      return {
        rank: i + 1,
        address,
        username: short,
        avatar: short.slice(0, 2).toUpperCase(),
        profit: parseFloat(profit.toFixed(4)),
        winRate,
        totalBets,
        wins,
        badges: [] as string[],
      }
    })

    return NextResponse.json({ ok: true, entries })
  } catch (err) {
    console.error("[leaderboard]", err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
