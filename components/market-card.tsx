"use client"

import { useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Clock, Users, Zap } from "lucide-react"

interface MarketCardProps {
  id: string
  platform: "tiktok" | "youtube" | "x" | "instagram"
  thumbnail: string
  title: string
  metric: string
  threshold: number
  currentValue: number
  overPool: number
  underPool: number
  totalBets: number
  endsIn: string
  creator?: string
  volume?: string
}

export function MarketCard({
  id,
  platform,
  thumbnail,
  title,
  metric,
  threshold,
  currentValue,
  overPool,
  underPool,
  totalBets,
  endsIn,
  creator,
  volume,
}: MarketCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const totalPool = overPool + underPool
  // Guard against division by zero on fresh markets
  const overPercentage = totalPool > 0 ? (overPool / totalPool) * 100 : 50
  const underPercentage = totalPool > 0 ? (underPool / totalPool) * 100 : 50

  const platformColors = {
    tiktok: "from-[#FF0050] to-[#00F2EA]",
    youtube: "from-[#FF0000] to-[#FF8800]",
    x: "from-[#1DA1F2] to-[#14171A]",
    instagram: "from-[#E1306C] to-[#FCAF45]",
  }

  return (
    <Link href={`/market/${id}`}>
      <Card
        className="relative overflow-hidden group cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary/20 animate-slide-up"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Background gradient effect */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${platformColors[platform]} opacity-5 group-hover:opacity-10 transition-opacity`}
        />

        {/* Content thumbnail */}
        <div className="relative h-48 overflow-hidden">
          <img
            src={thumbnail || "/placeholder.svg"}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />

          {/* Platform badge */}
          <Badge
            className={`absolute top-3 left-3 bg-gradient-to-r ${platformColors[platform]} text-white border-0 font-semibold`}
          >
            {platform.toUpperCase()}
          </Badge>

          {/* Time remaining */}
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md">
            <Clock className="h-3 w-3 text-accent" />
            <span className="text-xs font-mono text-foreground">{endsIn}</span>
          </div>

          {/* Current value overlay */}
          <div className="absolute bottom-3 left-3 right-3">
            <div className="text-xs text-muted-foreground mb-1">{`Current ${metric}`}</div>
            <div className="text-2xl font-bold text-foreground font-mono">{currentValue.toLocaleString()}</div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Title */}
          <h3 className="text-sm font-semibold line-clamp-2 leading-snug text-foreground">{title}</h3>

          {/* Market question */}
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">{`Will ${metric} exceed`}</div>
            <div className="text-lg font-bold font-mono text-primary">{threshold.toLocaleString()}</div>
          </div>

          {/* Pool visualization */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" />
                {totalBets > 0 ? `${totalBets} bets` : "New"}
              </span>
              <span className="text-muted-foreground flex items-center gap-1">
                <Zap className="h-3 w-3" />
                {volume ? `${parseFloat(volume).toFixed(3)} AVAX` : "—"}
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-muted rounded-full overflow-hidden flex">
              <div
                className="bg-gradient-to-r from-primary to-primary/80 transition-all duration-500"
                style={{ width: `${overPercentage}%` }}
              />
              <div
                className="bg-gradient-to-r from-destructive/80 to-destructive transition-all duration-500"
                style={{ width: `${underPercentage}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-primary font-semibold">{`${overPercentage.toFixed(0)}% Over`}</span>
              <span className="text-destructive font-semibold">{`${underPercentage.toFixed(0)}% Under`}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-1"
              size="sm"
            >
              <TrendingUp className="h-4 w-4" />
              {"Over"}
            </Button>
            <Button
              className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold gap-1"
              size="sm"
            >
              <TrendingDown className="h-4 w-4" />
              {"Under"}
            </Button>
          </div>

          {/* Creator attribution */}
          {creator && (
            <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border/40">
              {`Market by @${creator}`}
            </div>
          )}
        </div>

        {/* Hover glow effect */}
        {isHovered && (
          <div className="absolute inset-0 border-2 border-primary/30 rounded-lg pointer-events-none animate-glow-pulse" />
        )}
      </Card>
    </Link>
  )
}
