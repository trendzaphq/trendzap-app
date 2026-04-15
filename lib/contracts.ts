/**
 * TrendZap Contract Configuration
 *
 * Contains addresses, ABIs (minimal for frontend), and chain config.
 * Deployed on Avalanche Mainnet (43114).
 */

// Contract addresses — set via env vars after deployment
export const CONTRACTS = {
  market: (process.env.NEXT_PUBLIC_MARKET_CONTRACT || "0x0000000000000000000000000000000000000000") as `0x${string}`,
  factory: (process.env.NEXT_PUBLIC_FACTORY_CONTRACT || "0x0000000000000000000000000000000000000000") as `0x${string}`,
  positions: (process.env.NEXT_PUBLIC_POSITIONS_CONTRACT || "0x0000000000000000000000000000000000000000") as `0x${string}`,
} as const

// Minimal ABIs for frontend reads + writes
export const MARKET_ABI = [
  // Read functions
  {
    name: "getMarket",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          {
            name: "params",
            type: "tuple",
            components: [
              { name: "postUrl", type: "string" },
              { name: "platform", type: "uint8" },
              { name: "metricType", type: "uint8" },
              { name: "threshold", type: "uint256" },
              { name: "startTime", type: "uint256" },
              { name: "endTime", type: "uint256" },
              { name: "resolutionTime", type: "uint256" },
            ],
          },
          {
            name: "state",
            type: "tuple",
            components: [
              { name: "qOver", type: "uint256" },
              { name: "qUnder", type: "uint256" },
              { name: "b", type: "uint256" },
              { name: "totalVolume", type: "uint256" },
              { name: "feesCollected", type: "uint256" },
              { name: "poolBalance", type: "uint256" },
            ],
          },
          { name: "status", type: "uint8" },
          { name: "outcome", type: "uint8" },
          { name: "resolvedValue", type: "uint256" },
          { name: "creator", type: "address" },
          { name: "createdAt", type: "uint256" },
          { name: "resolvedAt", type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "nextMarketId",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getPrices",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [
      { name: "priceOver", type: "uint256" },
      { name: "priceUnder", type: "uint256" },
    ],
  },
  {
    name: "getProbabilities",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [
      { name: "probOver", type: "uint256" },
      { name: "probUnder", type: "uint256" },
    ],
  },
  {
    name: "getPosition",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "user", type: "address" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "overShares", type: "uint256" },
          { name: "underShares", type: "uint256" },
          { name: "overCost", type: "uint256" },
          { name: "underCost", type: "uint256" },
          { name: "claimed", type: "bool" },
        ],
      },
    ],
  },
  {
    name: "isTokenSettlement",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "settlementToken",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  // Write functions
  {
    name: "createMarket",
    type: "function",
    stateMutability: "payable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "postUrl", type: "string" },
          { name: "platform", type: "uint8" },
          { name: "metricType", type: "uint8" },
          { name: "threshold", type: "uint256" },
          { name: "startTime", type: "uint256" },
          { name: "endTime", type: "uint256" },
          { name: "resolutionTime", type: "uint256" },
        ],
      },
      { name: "initialBet", type: "uint256" },
      { name: "betOnOver", type: "bool" },
    ],
    outputs: [{ name: "marketId", type: "uint256" }],
  },
  {
    name: "buyShares",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "isOver", type: "bool" },
    ],
    outputs: [{ name: "shares", type: "uint256" }],
  },
  {
    name: "sellShares",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "isOver", type: "bool" },
      { name: "shares", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "claimWinnings",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "resolveMarket",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "metricValue", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "cancelMarket",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "reason", type: "string" },
    ],
    outputs: [],
  },
  {
    name: "claimRefund",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [],
  },
  // Events (for parsing logs)
  {
    name: "SharesBought",
    type: "event",
    inputs: [
      { name: "marketId", type: "uint256", indexed: true },
      { name: "trader", type: "address", indexed: true },
      { name: "isOver", type: "bool", indexed: false },
      { name: "shares", type: "uint256", indexed: false },
      { name: "cost", type: "uint256", indexed: false },
      { name: "newPriceOver", type: "uint256", indexed: false },
      { name: "newPriceUnder", type: "uint256", indexed: false },
    ],
  },
  {
    name: "MarketCreated",
    type: "event",
    inputs: [
      { name: "marketId", type: "uint256", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "postUrl", type: "string", indexed: false },
      { name: "platform", type: "uint8", indexed: false },
      { name: "metricType", type: "uint8", indexed: false },
      { name: "threshold", type: "uint256", indexed: false },
      { name: "endTime", type: "uint256", indexed: false },
      { name: "liquidityParam", type: "uint256", indexed: false },
    ],
  },
  {
    name: "MarketResolved",
    type: "event",
    inputs: [
      { name: "marketId", type: "uint256", indexed: true },
      { name: "outcome", type: "uint8", indexed: false },
      { name: "resolvedValue", type: "uint256", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
  {
    name: "WinningsClaimed",
    type: "event",
    inputs: [
      { name: "marketId", type: "uint256", indexed: true },
      { name: "user", type: "address", indexed: true },
      { name: "shares", type: "uint256", indexed: false },
      { name: "payout", type: "uint256", indexed: false },
    ],
  },
] as const

export const FACTORY_ABI = [
  {
    name: "singletonMarket",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "treasury",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "oracle",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
] as const

// Enums mirroring the contract (ViralityMarket.sol order)
// Platform enum: TWITTER=0, YOUTUBE=1, TIKTOK=2, INSTAGRAM=3
export const PLATFORMS = ["x", "youtube", "tiktok", "instagram"] as const
// MetricType enum: LIKES=0, VIEWS=1, RETWEETS=2, COMMENTS=3, SHARES=4
export const METRIC_TYPES = ["likes", "views", "retweets", "comments", "shares"] as const
export const MARKET_STATUS = ["PENDING", "ACTIVE", "CLOSED", "RESOLVED", "CANCELLED", "DISPUTED"] as const
export const OUTCOMES = ["NONE", "OVER", "UNDER"] as const

// Chain config
export const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "43114", 10)
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://api.avax.network/ext/bc/C/rpc"
export const EXPLORER_URL = CHAIN_ID === 43114
  ? "https://snowtrace.io"
  : "https://testnet.snowtrace.io"

// LMSR precision constant (matches contract's 1e18)
export const PRECISION = BigInt("1000000000000000000")
