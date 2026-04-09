import { neon } from "@neondatabase/serverless"

// Lazy init — avoids crashing at build time when DATABASE_URL is not set
let _db: ReturnType<typeof neon> | undefined
const sql = (...args: Parameters<ReturnType<typeof neon>>) => {
  if (!_db) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured")
    _db = neon(process.env.DATABASE_URL)
  }
  return _db(...args)
}

// Create table if needed — runs at cold start (idempotent)
export async function ensureSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS market_metadata (
      market_id    INTEGER PRIMARY KEY,
      title        TEXT,
      description  TEXT,
      thumbnail_url TEXT,
      creator_address TEXT,
      chain_id     INTEGER DEFAULT 43114,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS bet_events (
      id              SERIAL PRIMARY KEY,
      market_id       INTEGER NOT NULL,
      trader_address  TEXT NOT NULL,
      is_over         BOOLEAN NOT NULL,
      shares          TEXT NOT NULL,
      cost_wei        TEXT NOT NULL,
      block_number    BIGINT NOT NULL,
      tx_hash         TEXT NOT NULL,
      block_timestamp BIGINT,
      UNIQUE(tx_hash, market_id, trader_address)
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS resolution_events (
      market_id       INTEGER PRIMARY KEY,
      outcome         INTEGER NOT NULL,
      resolved_value  TEXT NOT NULL,
      resolved_at     BIGINT NOT NULL
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS claim_events (
      id            SERIAL PRIMARY KEY,
      market_id     INTEGER NOT NULL,
      user_address  TEXT NOT NULL,
      shares        TEXT NOT NULL,
      payout_wei    TEXT NOT NULL,
      tx_hash       TEXT UNIQUE NOT NULL,
      block_number  BIGINT NOT NULL
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS indexer_state (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS price_history (
      id          SERIAL PRIMARY KEY,
      market_id   INTEGER NOT NULL,
      block_number BIGINT NOT NULL,
      price_over  NUMERIC NOT NULL,
      price_under NUMERIC NOT NULL,
      tx_hash     TEXT UNIQUE NOT NULL
    )
  `
}

export interface MarketMeta {
  market_id: number
  title: string | null
  description: string | null
  thumbnail_url: string | null
  creator_address: string | null
  chain_id: number
  created_at: string
}

export async function getAllMetadata(): Promise<MarketMeta[]> {
  return (await sql`SELECT * FROM market_metadata ORDER BY created_at DESC`) as MarketMeta[]
}

export async function getMetadata(marketId: number): Promise<MarketMeta | null> {
  const rows = await sql`SELECT * FROM market_metadata WHERE market_id = ${marketId}` as MarketMeta[]
  return rows[0] ?? null
}

export async function upsertMetadata(data: Omit<MarketMeta, "created_at">) {
  await sql`
    INSERT INTO market_metadata (market_id, title, description, thumbnail_url, creator_address, chain_id)
    VALUES (${data.market_id}, ${data.title}, ${data.description}, ${data.thumbnail_url}, ${data.creator_address}, ${data.chain_id})
    ON CONFLICT (market_id) DO UPDATE SET
      title         = EXCLUDED.title,
      description   = EXCLUDED.description,
      thumbnail_url = EXCLUDED.thumbnail_url
  `
}

// ─── Indexer helpers ──────────────────────────────────────────────────────────

export async function getIndexerState(key: string): Promise<string | null> {
  const rows = await sql`SELECT value FROM indexer_state WHERE key = ${key}` as { value: string }[]
  return rows[0]?.value ?? null
}

export async function setIndexerState(key: string, value: string) {
  await sql`
    INSERT INTO indexer_state (key, value) VALUES (${key}, ${value})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `
}

export interface BetEvent {
  id: number
  market_id: number
  trader_address: string
  is_over: boolean
  shares: string
  cost_wei: string
  block_number: string
  tx_hash: string
  block_timestamp: number | null
}

export async function insertBetEvent(e: Omit<BetEvent, "id">) {
  await sql`
    INSERT INTO bet_events (market_id, trader_address, is_over, shares, cost_wei, block_number, tx_hash, block_timestamp)
    VALUES (${e.market_id}, ${e.trader_address}, ${e.is_over}, ${e.shares}, ${e.cost_wei}, ${e.block_number}, ${e.tx_hash}, ${e.block_timestamp})
    ON CONFLICT (tx_hash, market_id, trader_address) DO NOTHING
  `
}

export async function insertResolutionEvent(marketId: number, outcome: number, resolvedValue: string, resolvedAt: number) {
  await sql`
    INSERT INTO resolution_events (market_id, outcome, resolved_value, resolved_at)
    VALUES (${marketId}, ${outcome}, ${resolvedValue}, ${resolvedAt})
    ON CONFLICT (market_id) DO UPDATE SET outcome = EXCLUDED.outcome, resolved_value = EXCLUDED.resolved_value, resolved_at = EXCLUDED.resolved_at
  `
}

export async function insertClaimEvent(marketId: number, userAddress: string, shares: string, payoutWei: string, txHash: string, blockNumber: number) {
  await sql`
    INSERT INTO claim_events (market_id, user_address, shares, payout_wei, tx_hash, block_number)
    VALUES (${marketId}, ${userAddress}, ${shares}, ${payoutWei}, ${txHash}, ${blockNumber})
    ON CONFLICT (tx_hash) DO NOTHING
  `
}

export async function getUserBets(address: string): Promise<BetEvent[]> {
  return (await sql`
    SELECT * FROM bet_events WHERE LOWER(trader_address) = LOWER(${address}) ORDER BY block_number DESC
  `) as BetEvent[]
}

export interface LeaderboardEntry {
  trader_address: string
  total_bets: string
  total_cost_wei: string
  total_payout_wei: string
  wins: string
}

export async function getLeaderboard(since?: number): Promise<LeaderboardEntry[]> {
  if (since) {
    return (await sql`
      SELECT
        b.trader_address,
        COUNT(*)::TEXT as total_bets,
        COALESCE(SUM(CAST(b.cost_wei AS NUMERIC)), 0)::TEXT as total_cost_wei,
        COALESCE((SELECT SUM(CAST(c.payout_wei AS NUMERIC)) FROM claim_events c WHERE LOWER(c.user_address) = LOWER(b.trader_address)), 0)::TEXT as total_payout_wei,
        COALESCE((SELECT COUNT(*) FROM claim_events c WHERE LOWER(c.user_address) = LOWER(b.trader_address)), 0)::TEXT as wins
      FROM bet_events b
      WHERE b.block_timestamp > ${since}
      GROUP BY b.trader_address
      ORDER BY (COALESCE((SELECT SUM(CAST(c2.payout_wei AS NUMERIC)) FROM claim_events c2 WHERE LOWER(c2.user_address) = LOWER(b.trader_address)), 0) - COALESCE(SUM(CAST(b.cost_wei AS NUMERIC)), 0)) DESC
      LIMIT 100
    `) as LeaderboardEntry[]
  }
  return (await sql`
    SELECT
      b.trader_address,
      COUNT(*)::TEXT as total_bets,
      COALESCE(SUM(CAST(b.cost_wei AS NUMERIC)), 0)::TEXT as total_cost_wei,
      COALESCE((SELECT SUM(CAST(c.payout_wei AS NUMERIC)) FROM claim_events c WHERE LOWER(c.user_address) = LOWER(b.trader_address)), 0)::TEXT as total_payout_wei,
      COALESCE((SELECT COUNT(*) FROM claim_events c WHERE LOWER(c.user_address) = LOWER(b.trader_address)), 0)::TEXT as wins
    FROM bet_events b
    GROUP BY b.trader_address
    ORDER BY (COALESCE((SELECT SUM(CAST(c2.payout_wei AS NUMERIC)) FROM claim_events c2 WHERE LOWER(c2.user_address) = LOWER(b.trader_address)), 0) - COALESCE(SUM(CAST(b.cost_wei AS NUMERIC)), 0)) DESC
    LIMIT 100
  `) as LeaderboardEntry[]
}

export interface PricePoint {
  id: number
  market_id: number
  block_number: string
  price_over: number  // 0-100
  price_under: number
  tx_hash: string
}

export async function insertPricePoint(marketId: number, blockNumber: string, priceOver: number, priceUnder: number, txHash: string) {
  await sql`
    INSERT INTO price_history (market_id, block_number, price_over, price_under, tx_hash)
    VALUES (${marketId}, ${blockNumber}, ${priceOver}, ${priceUnder}, ${txHash})
    ON CONFLICT (tx_hash) DO NOTHING
  `
}

export async function getPriceHistory(marketId: number): Promise<PricePoint[]> {
  return (await sql`
    SELECT * FROM price_history WHERE market_id = ${marketId} ORDER BY block_number ASC LIMIT 200
  `) as PricePoint[]
}

export interface UserStats {
  total_users: number
  total_bets: number
  total_volume_usdc: string
}

export async function getUserStats(): Promise<UserStats> {
  const results = await sql`
    SELECT
      COUNT(DISTINCT trader_address)::int AS total_users,
      COUNT(*)::int AS total_bets,
      COALESCE(SUM(CAST(cost_wei AS NUMERIC)), 0)::TEXT AS total_volume_usdc
    FROM bet_events
  `
  const row = (results as UserStats[])[0]
  return {
    total_users: row?.total_users ?? 0,
    total_bets: row?.total_bets ?? 0,
    total_volume_usdc: row?.total_volume_usdc ?? "0",
  }
}

export { sql }
