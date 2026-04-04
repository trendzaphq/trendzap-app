"use client"

import Link from "next/link"
import { Clock, Zap, TrendingUp, TrendingDown } from "lucide-react"
import { useCountdown } from "@/hooks/use-countdown"

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
  endTime?: number
  creator?: string
  volume?: string
}

const PLATFORM_CONFIG: Record<string, { label: string; dotColor: string }> = {
  tiktok: { label: "TikTok", dotColor: "bg-[#FF0050]" },
  youtube: { label: "YouTube", dotColor: "bg-[#FF0000]" },
  x: { label: "X", dotColor: "bg-[#1DA1F2]" },
  instagram: { label: "Instagram", dotColor: "bg-[#E1306C]" },
}

export function MarketCard({
  id,
  platform,
  thumbnail,
  title,
  overPool,
  underPool,
  endsIn,
  endTime,
  volume,
}: MarketCardProps) {
  const countdown = useCountdown(endTime || 0)
  const timeDisplay = endTime ? countdown : endsIn

  // overPool / underPool are LMSR prices already in 0-100 range
  const overPct = Math.round(overPool) || 50
  const underPct = Math.round(underPool) || 50

  const pConfig = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.x
  const volNum = volume ? parseFloat(volume) : 0
  const ended = timeDisplay === "Ended"

  return (
    <Link href={`/market/${id}`} className="block group">
      <div className="relative bg-card border border-border/50 rounded-2xl overflow-hidden transition-all duration-200 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-0.5">
        {/* Thumbnail */}
        {thumbnail ? (
          <div className="relative h-40 overflow-hidden">
            <img
              src={thumbnail}
              alt=""
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />

            {/* Platform label */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/55 backdrop-blur-sm rounded-full px-2.5 py-1">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${pConfig.dotColor}`} />
              <span className="text-[11px] font-semibold text-white">{pConfig.label}</span>
            </div>

            {/* Time */}
            <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/55 backdrop-blur-sm rounded-full px-2.5 py-1">
              <Clock className={`h-3 w-3 ${ended ? "text-destructive" : "text-accent"}`} />
              <span className={`text-[11px] font-mono font-medium ${ended ? "text-destructive" : "text-white"}`}>
                {timeDisplay}
              </span>
            </div>
          </div>
        ) : (
          <div className="px-4 pt-4 pb-1 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${pConfig.dotColor}`} />
              <span className="text-[11px] font-semibold text-muted-foreground">{pConfig.label}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className={`h-3 w-3 ${ended ? "text-destructive" : ""}`} />
              <span className={`text-[11px] font-mono ${ended ? "text-destructive" : ""}`}>{timeDisplay}</span>
            </div>
          </div>
        )}

        <div className="p-4 space-y-3">
          {/* Title */}
          <p className="text-sm font-semibold leading-snug line-clamp-2 text-foreground min-h-[2.5rem]">{title}</p>

          {/* Odds */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col items-center justify-center py-2.5 rounded-xl bg-primary/10 border border-primary/20 transition-colors group-hover:bg-primary/15">
              <div className="flex items-center gap-1 mb-0.5">
                <TrendingUp className="h-3 w-3 text-primary" />
                <span className="text-[10px] text-muted-foreground font-medium tracking-wide">OVER</span>
              </div>
              <span className="text-xl font-bold text-primary leading-none">{overPct}%</span>
            </div>
            <div className="flex flex-col items-center justify-center py-2.5 rounded-xl bg-destructive/10 border border-destructive/20 transition-colors group-hover:bg-destructive/15">
              <div className="flex items-center gap-1 mb-0.5">
                <TrendingDown className="h-3 w-3 text-destructive" />
                <span className="text-[10px] text-muted-foreground font-medium tracking-wide">UNDER</span>
              </div>
              <span className="text-xl font-bold text-destructive leading-none">{underPct}%</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${overPct}%` }}
            />
          </div>

          {/* Footer */}
          {volNum > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground pt-0.5">
              <Zap className="h-3 w-3" />
              <span>{volNum.toFixed(3)} AVAX</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
