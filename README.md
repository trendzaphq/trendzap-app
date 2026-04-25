# TrendZap App

> The prediction market interface for social media virality — built on Avalanche.

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://typescriptlang.org)
[![Avalanche](https://img.shields.io/badge/Avalanche-C--Chain-red)](https://avax.network)

---

## What It Does

TrendZap lets anyone create and bet on prediction markets around social media content. Paste a TikTok, YouTube, X/Twitter, or Instagram URL, set a metric target (e.g. "will this hit 10M views?"), and bet AVAX on whether it happens.

Markets use **LMSR (Logarithmic Market Scoring Rule)** for automatic, continuous liquidity with no order book.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Wallet | Privy (embedded wallets) |
| Blockchain | Avalanche C-Chain via viem + ethers.js |
| Database | Neon PostgreSQL (market metadata) |
| Media | Cloudinary (thumbnails) |
| AI | Groq via Intelligence service |

---

## Live Contracts (Avalanche Mainnet)

| Contract | Address |
|----------|---------|
| `ViralityMarket` | `0xbB898682B2BbD8cF19c33179b783ed172168BB6d` |
| `MarketFactory` | `0x1a30Ffc42DF5a505E68f671dCD92dF26AA00Ac94` |
| `Positions` | `0xC1BA091eDD50AD9106f1F4B47C9Fb373602aF0BD` |

---

## Backend Services

| Service | URL |
|---------|-----|
| Oracle | `https://trendzap-oracle-production.up.railway.app` |
| Intelligence | `https://trendzap-intelligence-production.up.railway.app` |
| Risk | `https://trendzap-risk-production.up.railway.app` |

---

## Getting Started

```bash
# Install dependencies
pnpm install

# Set up environment
cp .env.example .env.local
# Fill in .env.local with your keys (see below)

# Run dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

```env
# Wallet auth
NEXT_PUBLIC_PRIVY_APP_ID=

# Chain
NEXT_PUBLIC_CHAIN_ID=43114
NEXT_PUBLIC_RPC_URL=

# Contracts
NEXT_PUBLIC_MARKET_CONTRACT=0xbB898682B2BbD8cF19c33179b783ed172168BB6d
NEXT_PUBLIC_FACTORY_CONTRACT=0x1a30Ffc42DF5a505E68f671dCD92dF26AA00Ac94
NEXT_PUBLIC_POSITIONS_CONTRACT=0xC1BA091eDD50AD9106f1F4B47C9Fb373602aF0BD

# Services
NEXT_PUBLIC_ORACLE_URL=
NEXT_PUBLIC_RISK_URL=
NEXT_PUBLIC_INTELLIGENCE_URL=

# Admin route protection (required for /admin and /api/admin/*)
ADMIN_BASIC_AUTH_USER=
ADMIN_BASIC_AUTH_PASS=

# Database
DATABASE_URL=         # Neon PostgreSQL connection string

# Cloudinary
CLOUDINARY_URL=       # cloudinary://key:secret@cloud
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
```

---

## Key Pages

| Route | Description |
|-------|-------------|
| `/` | Live markets feed |
| `/market/[id]` | Market detail + bet interface |
| `/portfolio` | User positions and winnings |
| `/leaderboard` | Top bettors |
| `/admin` | Admin dashboard (resolve/cancel markets) |

---

## How Markets Work

1. **Create** — paste a social media URL, set metric + threshold, place initial bet
2. **Bet** — buy OVER or UNDER shares; LMSR pricing adjusts continuously
3. **Resolve** — oracle monitors the metric and calls `resolveMarket()` at deadline
4. **Claim** — winning side claims proportional payout minus 2.5% platform fee

---

## Database Schema

Market metadata is stored off-chain in Neon (thumbnails, titles):

```sql
CREATE TABLE market_metadata (
  market_id      INTEGER PRIMARY KEY,  -- mirrors on-chain ID
  title          TEXT,
  description    TEXT,
  thumbnail_url  TEXT,                 -- Cloudinary URL
  creator_address TEXT,
  chain_id       INTEGER DEFAULT 43114,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
```

---

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/markets` | All market metadata from DB |
| `GET` | `/api/markets/[id]` | Single market metadata |
| `POST` | `/api/markets` | Save metadata after on-chain creation |
| `POST` | `/api/upload` | Upload thumbnail to Cloudinary |

---

## License

MIT © TrendZap
