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
} from "@/lib/db"

// Default start block — set to a block before TrendZap was deployed on mainnet.
// Update this if you know the exact deploy block.
const DEFAULT_START_BLOCK = BigInt(process.env.INDEXER_START_BLOCK || "45000000")
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

export async function POST() {
  try {
    await ensureSchema()

    const client = createPublicClient({ chain: avalanche, transport: http() })
    const latestBlock = await client.getBlockNumber()

    const lastSynced = await getIndexerState("last_block")
    let fromBlock = lastSynced ? BigInt(lastSynced) + BigInt(1) : DEFAULT_START_BLOCK

    let blocksProcessed = 0
    let betsIndexed = 0
    let resolutionsIndexed = 0
    let claimsIndexed = 0

    // Process in batches to avoid RPC limits
    while (fromBlock <= latestBlock) {
      const toBlock = fromBlock + BATCH_SIZE - BigInt(1) > latestBlock
        ? latestBlock
        : fromBlock + BATCH_SIZE - BigInt(1)

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
        // Store price point (newPriceOver/newPriceUnder are 0-1e18 range, convert to 0-100)
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

      blocksProcessed += Number(toBlock - fromBlock + BigInt(1))
      fromBlock = toBlock + BigInt(1)

      // Stop after 20 batches per request to stay within serverless timeout
      if (blocksProcessed >= 40000) break
    }

    await setIndexerState("last_block", String(fromBlock - BigInt(1)))

    return NextResponse.json({
      ok: true,
      blocksProcessed,
      latestBlock: String(latestBlock),
      newLastBlock: String(fromBlock - BigInt(1)),
      betsIndexed,
      resolutionsIndexed,
      claimsIndexed,
    })
  } catch (err) {
    console.error("[indexer/sync]", err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

// Allow GET for easy manual triggering from browser
export const GET = POST
