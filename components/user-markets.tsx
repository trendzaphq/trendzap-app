"use client"

import { useEffect, useState } from "react"
import { useWallets } from "@privy-io/react-auth"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Zap, Loader2, ExternalLink } from "lucide-react"
import Link from "next/link"
import { useMarketList } from "@/hooks/use-market"
import type { MarketData } from "@/hooks/use-market"
import { EXPLORER_URL } from "@/lib/contracts"

export function UserMarkets() {
  const { wallets } = useWallets()
  const address = wallets[0]?.address
  const { markets, loading } = useMarketList()

  const myMarkets = address
    ? markets.filter((m) => m.creator?.toLowerCase() === address.toLowerCase())
    : []

  const statusColor = (status: string) => {
    if (status === "ACTIVE") return "bg-primary/10 text-primary border-primary/20"
    if (status === "RESOLVED") return "bg-muted/50 text-muted-foreground border-border"
    if (status === "CLOSED") return "bg-secondary/10 text-secondary border-secondary/20"
    return "bg-muted/50 text-muted-foreground border-border"
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Markets I Created</h3>

      {!address ? (
        <p className="text-sm text-muted-foreground text-center py-8">Connect wallet to view your markets</p>
      ) : loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : myMarkets.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Zap className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">You haven't created any markets yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {myMarkets.map((market) => (
            <Link
              key={market.id}
              href={`/market/${market.id}`}
              className="block p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">{market.platform.toUpperCase()}</Badge>
                    <Badge variant="outline" className={statusColor(market.status)}>{market.status}</Badge>
                  </div>
                  <p className="font-semibold text-sm line-clamp-1">
                    {market.postUrl.split("/").pop() || `Market #${market.id}`}
                  </p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{market.metricType}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="h-4 w-4" />
                  <span className="font-mono">{parseFloat(market.totalVolume).toFixed(2)} USDC</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  )
}
