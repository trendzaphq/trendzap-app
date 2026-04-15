import { NextResponse } from "next/server"
import { createPublicClient, http, parseAbiItem } from "viem"
import { avalanche } from "viem/chains"
import {
  ensureSchema,
  getIndexerState,
  setIndexerState,
  insertBetEvent,
  insertResolutionEvent,
  insertClaimEvent,
  insertPricePoint,
  purgeEventTables,
} from "@/lib/db"

const DEFAULT_START_BLOCK = BigInt(process.env.INDEXER_START_BLOCK || "81968790")
const BATCH_SIZE = BigInt(2000)
const CONTRACT = (process.env.NEXT_PUBLIC_MARKET_CONTRACT || "0x0000000000000000000000000000000000000000") as `0x${string}`

const EVENTS = {
  SharesBought: parseAbiItem(
    "event SharesBought(uint256 indexed marketId, address indexed trader, bool isOver, uint256 shares, uint256 cost, uint256 newPriceOver, uint256 newPriceUnder)"
  ),
  MarketResolved: parseAbiItem(
    "event MarketResolved(uint256 indexed marketId, uint8 outcome, uint256 resolvedValue, uint256 timestamp)"
  ),
  WinningsClaimed: parseAbiItem(
    "event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 shares, uint256 payout)"
  ),
}

async function runSync(recentOnly = false) {
  await ensureSchema()

  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || undefined
  const client = createPublicClient({ chain: avalanche, transport: http(rpcUrl) })
  const latestBlock = await client.getBlockNumber()

  const lastSynced = await getIndexerState("last_block")

  let fromBlock: bigint
  if (recentOnly) {
    // Scan the last 50000 blocks (~27 hours on Avalanche C-Chain at ~2s/block)
    // Does NOT advance last_block so the full historical sync continues independently.
    const recentStart = latestBlock > 50000n ? latestBlock - 50000n : 0n
    const historicalNext = lastSynced ? BigInt(lastSynced) + 1n : DEFAULT_START_BLOCK
    fromBlock = historicalNext > recentStart ? historicalNext : recentStart
  } else {
    fromBlock = lastSynced ? BigInt(lastSynced) + 1n : DEFAULT_START_BLOCK
  }
  // Self-heal: if last_block from a previous run is before the configured start,
  // jump forward to DEFAULT_START_BLOCK to avoid scanning millions of empty blocks.
  if (fromBlock < DEFAULT_START_BLOCK) {
    fromBlock = DEFAULT_START_BLOCK
    if (!recentOnly) await setIndexerState("last_block", String(DEFAULT_START_BLOCK - 1n))
  }

  const startBlock = fromBlock
  let blocksProcessed = 0
  let betsIndexed = 0
  let resolutionsIndexed = 0
  let claimsIndexed = 0

  while (fromBlock <= latestBlock) {
    const toBlock = fromBlock + BATCH_SIZE - 1n > latestBlock
      ? latestBlock
      : fromBlock + BATCH_SIZE - 1n

    const [betLogs, resolvedLogs, claimLogs] = await Promise.all([
      client.getLogs({ address: CONTRACT, event: EVENTS.SharesBought, fromBlock, toBlock }),
      client.getLogs({ address: CONTRACT, event: EVENTS.MarketResolved, fromBlock, toBlock }),
      client.getLogs({ address: CONTRACT, event: EVENTS.WinningsClaimed, fromBlock, toBlock }),
    ])

    for (const log of betLogs) {
      if (!log.args.marketId || !log.args.trader) continue
      await insertBetEvent({
        market_id: Number(log.args.marketId),
        trader_address: log.args.trader.toLowerCase(),
        is_over: log.args.isOver ?? false,
        shares: String(log.args.shares ?? 0),
        cost_wei: String(log.args.cost ?? 0),
        block_number: String(log.blockNumber),
        tx_hash: log.transactionHash ?? "",
        block_timestamp: null,
      })
      betsIndexed++
      const priceOver = Number((log.args.newPriceOver ?? 0n) * 100n / BigInt("1000000000000000000"))
      const priceUnder = Number((log.args.newPriceUnder ?? 0n) * 100n / BigInt("1000000000000000000"))
      await insertPricePoint(Number(log.args.marketId), String(log.blockNumber), priceOver, priceUnder, log.transactionHash ?? "")
    }

    for (const log of resolvedLogs) {
      if (!log.args.marketId) continue
      await insertResolutionEvent(
        Number(log.args.marketId),
        Number(log.args.outcome ?? 0),
        String(log.args.resolvedValue ?? 0),
        Number(log.args.timestamp ?? 0)
      )
      resolutionsIndexed++
    }

    for (const log of claimLogs) {
      if (!log.args.marketId || !log.args.user) continue
      await insertClaimEvent(
        Number(log.args.marketId),
        log.args.user.toLowerCase(),
        String(log.args.shares ?? 0),
        String(log.args.payout ?? 0),
        log.transactionHash ?? "",
        Number(log.blockNumber)
      )
      claimsIndexed++
    }

    blocksProcessed += Number(toBlock - fromBlock + 1n)
    fromBlock = toBlock + 1n

    if (blocksProcessed >= 100000) break
  }

  // Only advance last_block for the full historical sync, not for recent-only scans
  if (!recentOnly) {
    await setIndexerState("last_block", String(fromBlock - 1n))
  }

  return {
    ok: true,
    recentOnly,
    startBlock: String(startBlock),
    blocksProcessed,
    latestBlock: String(latestBlock),
    newLastBlock: recentOnly ? (lastSynced ?? String(DEFAULT_START_BLOCK)) : String(fromBlock - 1n),
    betsIndexed,
    resolutionsIndexed,
    claimsIndexed,
  }
}

// POST — called by Vercel cron every 5 minutes. Protected by CRON_SECRET.
export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = request.headers.get("authorization")
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }
  }
  try {
    return NextResponse.json(await runSync())
  } catch (err) {
    console.error("[indexer/sync]", err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

// GET — unprotected, allows manual browser triggers and health checks
// ?recent=true  → fast scan of last 50000 blocks only (for UI triggers after bet)
// ?reset=true   → clears stored last_block, forces fresh scan from INDEXER_START_BLOCK
// (no param)    → full historical sync from last_block
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams
    const recent = params.get("recent") === "true"
    if (params.get("reset") === "true") {
      await ensureSchema()
      if (params.get("purge") === "true") {
        // Hard purge: wipe all event tables + reset scan pointer
        await purgeEventTables()
        return NextResponse.json({ ok: true, purged: true, newLastBlock: String(DEFAULT_START_BLOCK - 1n) })
      }
      await setIndexerState("last_block", String(DEFAULT_START_BLOCK - 1n))
      return NextResponse.json({ ok: true, reset: true, newLastBlock: String(DEFAULT_START_BLOCK - 1n) })
    }
    const result = await runSync(recent)

    // Auto-continue: if still >5000 blocks behind, fire next batch in background
    // so the user doesn't have to keep clicking "Sync Indexer"
    if (!recent && result.ok && BigInt(result.newLastBlock) < BigInt(result.latestBlock) - 5000n) {
      const host = request.headers.get("host") || "localhost:3000"
      const proto = host.includes("localhost") ? "http" : "https"
      fetch(`${proto}://${host}/api/indexer/sync`).catch(() => {})
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error("[indexer/sync]", err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
