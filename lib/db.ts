import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

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

export { sql }
