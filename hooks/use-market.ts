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
  totalVolume: string // formatted AVAX
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

// ─── useMarket: read a single market ─────────────────────

export function useMarket(marketId: number) {
  const [market, setMarket] = useState<MarketData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMarket = useCallback(async () => {
    try {
      setLoading(true)
      const client = getPublicClient()

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
        totalVolume: formatEther(raw.state.totalVolume),
        poolBalance: formatEther(raw.state.poolBalance),
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
    // Poll every 15 seconds for live price updates
    const interval = setInterval(fetchMarket, 15_000)
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
              totalVolume: formatEther(raw.state.totalVolume),
              poolBalance: formatEther(raw.state.poolBalance),
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
// Returns true if contract uses ERC20 settlement (and handles approval),
// false if native AVAX. Call before any write to the market contract.

async function ensureSettlementAllowance(provider: any, signer: any, amount: bigint): Promise<boolean> {
  const { Contract, MaxUint256 } = await import("ethers")
  const contract = new Contract(
    CONTRACTS.market,
    [
      "function isTokenSettlement() view returns (bool)",
      "function settlementToken() view returns (address)",
    ],
    provider
  )
  const isERC20: boolean = await contract.isTokenSettlement()
  if (!isERC20) return false
  const tokenAddr: string = await contract.settlementToken()
  const erc20 = new Contract(
    tokenAddr,
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
  return true
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

      try {
        await wallet.switchChain(43114)
        const ethereumProvider = await wallet.getEthereumProvider()
        const { BrowserProvider, Interface: EthersInterface } = await import("ethers")
        const provider = new BrowserProvider(ethereumProvider)
        const signer = await provider.getSigner()
        const value = parseEther(amountAvax)

        const isERC20 = await ensureSettlementAllowance(provider, signer, value)

        const iface = new EthersInterface([
          "function buyShares(uint256 marketId, bool isOver) payable returns (uint256)",
        ])
        const data = iface.encodeFunctionData("buyShares", [marketId, isOver])

        const tx = await signer.sendTransaction({
          to: CONTRACTS.market,
          data,
          value: isERC20 ? "0" : value.toString(),
        })

        setTxHash(tx.hash)
        await tx.wait()
        return tx.hash
      } catch (err) {
        const msg = (err as Error).message
        setError(msg)
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
        return tx.hash
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
      initialBet: string // in AVAX
      betOnOver: boolean
    }) => {
      const wallet = wallets[0]
      if (!wallet) throw new Error("Connect wallet first")

      setLoading(true)
      setError(null)
      setTxHash(null)

      try {
        await wallet.switchChain(43114)
        const ethereumProvider = await wallet.getEthereumProvider()
        const { BrowserProvider, Interface: EthersInterface } = await import("ethers")
        const provider = new BrowserProvider(ethereumProvider)
        const signer = await provider.getSigner()
        const value = parseEther(params.initialBet)

        const isERC20 = await ensureSettlementAllowance(provider, signer, value)

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

        const tx = await signer.sendTransaction({
          to: CONTRACTS.market,
          data,
          value: isERC20 ? "0" : value.toString(),
        })

        setTxHash(tx.hash)
        await tx.wait()
        return tx.hash
      } catch (err) {
        const msg = (err as Error).message
        setError(msg?.slice(0, 200))
        throw err
      } finally {
        setLoading(false)
      }
    },
    [wallets]
  )

  return { create, txHash, loading, error }
}
