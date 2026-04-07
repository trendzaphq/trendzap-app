"use client"

import { useCallback, useEffect, useState } from "react"
import { usePrivy, useWallets } from "@privy-io/react-auth"
import {
  createPublicClient,
  http,
  formatEther,
  parseEther,
  type PublicClient,
} from "viem"
import { avalanche } from "viem/chains"
import {
  CONTRACTS,
  MARKET_ABI,
  RPC_URL,
  PRECISION,
  PLATFORMS,
  METRIC_TYPES,
  MARKET_STATUS,
  OUTCOMES,
} from "@/lib/contracts"
import { toast } from "sonner"
import { parseTxError } from "@/lib/tx-error"

// ─── Types ────────────────────────────────────────────────

export interface MarketData {
  id: number
  postUrl: string
  platform: string
  metricType: string
  threshold: bigint
  startTime: number
  endTime: number
  resolutionTime: number
  priceOver: number // 0–100 (percent)
  priceUnder: number
  totalVolume: string // formatted settlement token amount
  poolBalance: string
  status: string
  outcome: string
  resolvedValue: bigint
  creator: string
  createdAt: number
}

export interface UserPosition {
  overShares: bigint
  underShares: bigint
  overCost: bigint
  underCost: bigint
  claimed: boolean
}

// ─── Public Client (read-only, no wallet required) ────────

let _publicClient: PublicClient | null = null

function getPublicClient(): PublicClient {
  if (!_publicClient) {
    _publicClient = createPublicClient({
      chain: avalanche,
      transport: http(RPC_URL),
    })
  }
  return _publicClient
}

// ─── Cached settlement decimals for read-only formatting ──
let _readDecimals: number | null = null

async function getReadDecimals(): Promise<number> {
  if (_readDecimals !== null) return _readDecimals
  const client = getPublicClient()
  try {
    const isToken = await client.readContract({
      address: CONTRACTS.market,
      abi: MARKET_ABI,
      functionName: "isTokenSettlement",
    }) as boolean
    if (!isToken) { _readDecimals = 18; return 18 }
    const tokenAddr = await client.readContract({
      address: CONTRACTS.market,
      abi: MARKET_ABI,
      functionName: "settlementToken",
    }) as `0x${string}`
    const decimals = await client.readContract({
      address: tokenAddr,
      abi: [{ name: "decimals", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] }],
      functionName: "decimals",
    }) as number
    _readDecimals = Number(decimals)
  } catch {
    _readDecimals = 18
  }
  return _readDecimals
}

// ─── useMarket: read a single market ─────────────────────

export function useMarket(marketId: number) {
  const [market, setMarket] = useState<MarketData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMarket = useCallback(async () => {
    try {
      setLoading(true)
      const client = getPublicClient()
      const decimals = await getReadDecimals()

      const [raw, prices] = await Promise.all([
        client.readContract({
          address: CONTRACTS.market,
          abi: MARKET_ABI,
          functionName: "getMarket",
          args: [BigInt(marketId)],
        }) as Promise<any>,
        client.readContract({
          address: CONTRACTS.market,
          abi: MARKET_ABI,
          functionName: "getPrices",
          args: [BigInt(marketId)],
        }) as Promise<[bigint, bigint]>,
      ])

      const pOver = Number((prices[0] * 100n) / PRECISION)
      const pUnder = Number((prices[1] * 100n) / PRECISION)

      setMarket({
        id: marketId,
        postUrl: raw.params.postUrl,
        platform: PLATFORMS[Number(raw.params.platform)] ?? "twitter",
        metricType: METRIC_TYPES[Number(raw.params.metricType)] ?? "views",
        threshold: raw.params.threshold,
        startTime: Number(raw.params.startTime),
        endTime: Number(raw.params.endTime),
        resolutionTime: Number(raw.params.resolutionTime),
        priceOver: pOver,
        priceUnder: pUnder,
        totalVolume: formatSettlementAmount(raw.state.totalVolume, decimals),
        poolBalance: formatSettlementAmount(raw.state.poolBalance, decimals),
        status: MARKET_STATUS[Number(raw.status)] ?? "PENDING",
        outcome: OUTCOMES[Number(raw.outcome)] ?? "NONE",
        resolvedValue: raw.resolvedValue,
        creator: raw.creator,
        createdAt: Number(raw.createdAt),
      })
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [marketId])

  useEffect(() => {
    fetchMarket()
    // Poll every 60 seconds — skip when tab is in background
    const interval = setInterval(() => { if (!document.hidden) fetchMarket() }, 60_000)
    return () => clearInterval(interval)
  }, [fetchMarket])

  return { market, loading, error, refetch: fetchMarket }
}

// ─── useMarketList: read all active markets ───────────────

export function useMarketList() {
  const [markets, setMarkets] = useState<MarketData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const client = getPublicClient()
        const decimals = await getReadDecimals()
        const nextId = (await client.readContract({
          address: CONTRACTS.market,
          abi: MARKET_ABI,
          functionName: "nextMarketId",
        })) as bigint

        const count = Number(nextId)
        if (count === 0) {
          setMarkets([])
          setLoading(false)
          return
        }

        // Fetch all markets in parallel (batch)
        const ids = Array.from({ length: count }, (_, i) => i)
        const results = await Promise.allSettled(
          ids.map(async (id) => {
            const [raw, prices] = await Promise.all([
              client.readContract({
                address: CONTRACTS.market,
                abi: MARKET_ABI,
                functionName: "getMarket",
                args: [BigInt(id)],
              }) as Promise<any>,
              client.readContract({
                address: CONTRACTS.market,
                abi: MARKET_ABI,
                functionName: "getPrices",
                args: [BigInt(id)],
              }) as Promise<[bigint, bigint]>,
            ])

            const pOver = Number((prices[0] * 100n) / PRECISION)
            const pUnder = Number((prices[1] * 100n) / PRECISION)

            return {
              id,
              postUrl: raw.params.postUrl,
              platform: PLATFORMS[Number(raw.params.platform)] ?? "twitter",
              metricType: METRIC_TYPES[Number(raw.params.metricType)] ?? "views",
              threshold: raw.params.threshold,
              startTime: Number(raw.params.startTime),
              endTime: Number(raw.params.endTime),
              resolutionTime: Number(raw.params.resolutionTime),
              priceOver: pOver,
              priceUnder: pUnder,
              totalVolume: formatSettlementAmount(raw.state.totalVolume, decimals),
              poolBalance: formatSettlementAmount(raw.state.poolBalance, decimals),
              status: MARKET_STATUS[Number(raw.status)] ?? "PENDING",
              outcome: OUTCOMES[Number(raw.outcome)] ?? "NONE",
              resolvedValue: raw.resolvedValue,
              creator: raw.creator,
              createdAt: Number(raw.createdAt),
            } as MarketData
          })
        )

        const loaded = results
          .filter((r): r is PromiseFulfilledResult<MarketData> => r.status === "fulfilled")
          .map((r) => r.value)

        setMarkets(loaded)
      } catch {
        // Markets not deployed yet — show empty
        setMarkets([])
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  return { markets, loading }
}

// ─── ERC20 Settlement Helper ──────────────────────────────
// Returns settlement info: { isERC20, decimals, tokenSymbol }.
// If ERC20, also ensures the market contract has sufficient allowance.

export interface SettlementInfo {
  isERC20: boolean
  decimals: number
  tokenSymbol: string
  tokenAddress: string
}

// Cache so we don't re-query every tx
let _settlementCache: SettlementInfo | null = null

export async function getSettlementInfo(provider: any): Promise<SettlementInfo> {
  if (_settlementCache) return _settlementCache
  const { Contract } = await import("ethers")
  const contract = new Contract(
    CONTRACTS.market,
    [
      "function isTokenSettlement() view returns (bool)",
      "function settlementToken() view returns (address)",
    ],
    provider
  )
  const isERC20: boolean = await contract.isTokenSettlement()
  if (!isERC20) {
    _settlementCache = { isERC20: false, decimals: 18, tokenSymbol: "AVAX", tokenAddress: "" }
    return _settlementCache
  }
  const tokenAddr: string = await contract.settlementToken()
  const erc20 = new Contract(
    tokenAddr,
    [
      "function decimals() view returns (uint8)",
      "function symbol() view returns (string)",
    ],
    provider
  )
  const [decimals, symbol] = await Promise.all([erc20.decimals(), erc20.symbol()])
  _settlementCache = { isERC20: true, decimals: Number(decimals), tokenSymbol: symbol, tokenAddress: tokenAddr }
  return _settlementCache
}

/** Parse a human-readable amount (e.g. "0.5") into on-chain units using the settlement token's decimals. */
export function parseSettlementAmount(amount: string, decimals: number): bigint {
  if (decimals === 18) return parseEther(amount)
  // For tokens with non-18 decimals (e.g. USDC with 6)
  const parts = amount.split(".")
  const whole = parts[0] || "0"
  let frac = (parts[1] || "").slice(0, decimals).padEnd(decimals, "0")
  return BigInt(whole) * BigInt(10 ** decimals) + BigInt(frac)
}

/** Format on-chain units back to a human-readable string. */
export function formatSettlementAmount(raw: bigint, decimals: number): string {
  if (decimals === 18) return formatEther(raw)
  const divisor = BigInt(10 ** decimals)
  const whole = raw / divisor
  const frac = raw % divisor
  const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "")
  return fracStr ? `${whole}.${fracStr}` : whole.toString()
}

async function ensureSettlementAllowance(provider: any, signer: any, amount: bigint): Promise<SettlementInfo> {
  const info = await getSettlementInfo(provider)
  if (!info.isERC20) return info

  const { Contract, MaxUint256 } = await import("ethers")
  const erc20 = new Contract(
    info.tokenAddress,
    [
      "function allowance(address owner, address spender) view returns (uint256)",
      "function approve(address spender, uint256 amount) returns (bool)",
    ],
    signer
  )
  const userAddress: string = await signer.getAddress()
  const allowance: bigint = await erc20.allowance(userAddress, CONTRACTS.market)
  if (allowance < amount) {
    const approveTx = await erc20.approve(CONTRACTS.market, MaxUint256)
    await approveTx.wait()
  }
  return info
}

// ─── useBuyShares: write (requires wallet) ────────────────

export function useBuyShares() {
  const { wallets } = useWallets()
  const [txHash, setTxHash] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const buyShares = useCallback(
    async (marketId: number, isOver: boolean, amountAvax: string) => {
      const wallet = wallets[0]
      if (!wallet) throw new Error("Connect wallet first")

      setLoading(true)
      setError(null)
      setTxHash(null)

      const toastId = toast.loading("Waiting for wallet confirmation…")

      try {
        await wallet.switchChain(43114)
        const ethereumProvider = await wallet.getEthereumProvider()
        const { BrowserProvider, Interface: EthersInterface } = await import("ethers")
        const provider = new BrowserProvider(ethereumProvider)
        const signer = await provider.getSigner()

        const settlement = await ensureSettlementAllowance(provider, signer, parseSettlementAmount(amountAvax, (await getSettlementInfo(provider)).decimals))
        const value = parseSettlementAmount(amountAvax, settlement.decimals)

        const iface = new EthersInterface([
          "function buyShares(uint256 marketId, bool isOver, uint256 amount) payable returns (uint256)",
        ])
        const data = iface.encodeFunctionData("buyShares", [marketId, isOver, value])

        toast.loading("Transaction submitted — mining…", { id: toastId })

        const tx = await signer.sendTransaction({
          to: CONTRACTS.market,
          data,
          value: settlement.isERC20 ? "0" : value.toString(),
        })

        setTxHash(tx.hash)
        await tx.wait()

        toast.success("Bet placed successfully! ⚡", {
          id: toastId,
          description: `${amountAvax} ${settlement.tokenSymbol} on ${isOver ? "Over" : "Under"}`,
          action: {
            label: "View tx",
            onClick: () => window.open(`${process.env.NEXT_PUBLIC_EXPLORER_URL || "https://snowtrace.io"}/tx/${tx.hash}`, "_blank"),
          },
          duration: 8000,
        })

        return tx.hash
      } catch (err) {
        const friendly = parseTxError(err)
        setError(friendly)
        toast.error(friendly, { id: toastId, duration: 6000 })
        throw err
      } finally {
        setLoading(false)
      }
    },
    [wallets]
  )

  return { buyShares, txHash, loading, error }
}

// ─── useClaimWinnings ─────────────────────────────────────

export function useClaimWinnings() {
  const { wallets } = useWallets()
  const [loading, setLoading] = useState(false)

  const claim = useCallback(
    async (marketId: number) => {
      const wallet = wallets[0]
      if (!wallet) throw new Error("Connect wallet first")

      setLoading(true)
      const toastId = toast.loading("Claiming your winnings…")
      try {
        await wallet.switchChain(43114)
        const ethereumProvider = await wallet.getEthereumProvider()
        const { BrowserProvider, Interface: EthersInterface } = await import("ethers")
        const provider = new BrowserProvider(ethereumProvider)
        const signer = await provider.getSigner()

        const iface = new EthersInterface([
          "function claimWinnings(uint256 marketId)",
        ])
        const data = iface.encodeFunctionData("claimWinnings", [marketId])

        const tx = await signer.sendTransaction({
          to: CONTRACTS.market,
          data,
        })
        await tx.wait()

        toast.success("Winnings claimed! 🏆", {
          id: toastId,
          description: "USDC has been sent to your wallet.",
          action: {
            label: "View tx",
            onClick: () => window.open(`${process.env.NEXT_PUBLIC_EXPLORER_URL || "https://snowtrace.io"}/tx/${tx.hash}`, "_blank"),
          },
          duration: 8000,
        })

        return tx.hash
      } catch (err) {
        const friendly = parseTxError(err)
        toast.error(friendly, { id: toastId, duration: 6000 })
        throw err
      } finally {
        setLoading(false)
      }
    },
    [wallets]
  )

  return { claim, loading }
}

// ─── useUserPosition ──────────────────────────────────────

export function useUserPosition(marketId: number) {
  const { wallets } = useWallets()
  const [position, setPosition] = useState<UserPosition | null>(null)

  useEffect(() => {
    async function load() {
      const wallet = wallets[0]
      if (!wallet) return

      const client = getPublicClient()
      const address = wallet.address as `0x${string}`

      const pos = (await client.readContract({
        address: CONTRACTS.market,
        abi: MARKET_ABI,
        functionName: "getPosition",
        args: [BigInt(marketId), address],
      })) as any

      setPosition({
        overShares: pos.overShares,
        underShares: pos.underShares,
        overCost: pos.overCost,
        underCost: pos.underCost,
        claimed: pos.claimed,
      })
    }

    load()
  }, [marketId, wallets])

  return position
}

// ─── useCreateMarket: create a new market on-chain ────────

export function useCreateMarket() {
  const { wallets } = useWallets()
  const [txHash, setTxHash] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = useCallback(
    async (params: {
      postUrl: string
      platform: number
      metricType: number
      threshold: bigint
      startTime: number
      endTime: number
      resolutionTime: number
      initialBet: string // in USDC
      betOnOver: boolean
    }) => {
      const wallet = wallets[0]
      if (!wallet) throw new Error("Connect wallet first")

      setLoading(true)
      setError(null)
      setTxHash(null)

      const toastId = toast.loading("Waiting for wallet confirmation…")

      try {
        await wallet.switchChain(43114)
        const ethereumProvider = await wallet.getEthereumProvider()
        const { BrowserProvider, Interface: EthersInterface } = await import("ethers")
        const provider = new BrowserProvider(ethereumProvider)
        const signer = await provider.getSigner()

        const settlement = await ensureSettlementAllowance(provider, signer, parseSettlementAmount(params.initialBet, (await getSettlementInfo(provider)).decimals))
        const value = parseSettlementAmount(params.initialBet, settlement.decimals)

        const iface = new EthersInterface([
          "function createMarket(tuple(string postUrl, uint8 platform, uint8 metricType, uint256 threshold, uint256 startTime, uint256 endTime, uint256 resolutionTime) params, uint256 initialBet, bool betOnOver) payable returns (uint256)",
        ])

        const data = iface.encodeFunctionData("createMarket", [
          {
            postUrl: params.postUrl,
            platform: params.platform,
            metricType: params.metricType,
            threshold: params.threshold,
            startTime: params.startTime,
            endTime: params.endTime,
            resolutionTime: params.resolutionTime,
          },
          value,
          params.betOnOver,
        ])

        toast.loading("Transaction submitted — mining…", { id: toastId })

        const tx = await signer.sendTransaction({
          to: CONTRACTS.market,
          data,
          value: settlement.isERC20 ? "0" : value.toString(),
        })

        setTxHash(tx.hash)
        await tx.wait()

        toast.success("Market created! 🚀", {
          id: toastId,
          description: "Your prediction market is now live.",
          action: {
            label: "View tx",
            onClick: () => window.open(`${process.env.NEXT_PUBLIC_EXPLORER_URL || "https://snowtrace.io"}/tx/${tx.hash}`, "_blank"),
          },
          duration: 8000,
        })

        // Schedule oracle resolution job
        try {
          const client = getPublicClient()
          const nextId = await client.readContract({ address: CONTRACTS.market as `0x${string}`, abi: MARKET_ABI, functionName: "nextMarketId" }) as bigint
          const newMarketId = Number(nextId) - 1
          await fetch("/api/oracle/schedule", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              marketId: newMarketId,
              postUrl: params.postUrl,
              platform: PLATFORMS[params.platform] || "x",
              metricType: METRIC_TYPES[params.metricType] || "views",
              threshold: params.threshold.toString(),
              resolutionTime: params.resolutionTime,
            }),
          })
        } catch (scheduleErr) {
          console.warn("[schedule] non-blocking error:", scheduleErr)
        }

        return tx.hash
      } catch (err) {
        const friendly = parseTxError(err)
        setError(friendly)
        toast.error(friendly, { id: toastId, duration: 6000 })
        throw err
      } finally {
        setLoading(false)
      }
    },
    [wallets]
  )

  return { create, txHash, loading, error }
}
