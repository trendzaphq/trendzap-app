"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Clock, Zap, TrendingUp, TrendingDown, Users } from "lucide-react"
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
  // embed preview
  authorAvatar?: string
  authorName?: string
  postText?: string
  mediaThumb?: string
}

const PLATFORM_GRADIENTS: Record<string, string> = {
  tiktok: "from-[#FF0050] to-[#00F2EA]",
  youtube: "from-[#FF0000] to-[#FF8800]",
  x: "from-[#1DA1F2] to-[#14171A]",
  instagram: "from-[#E1306C] to-[#FCAF45]",
}

export function MarketCard({
  id,
  platform,
  thumbnail,
  title,
  overPool,
  underPool,
  totalBets,
  endsIn,
  endTime,
  creator,
  volume,
  authorAvatar,
  authorName,
  postText,
  mediaThumb,
}: MarketCardProps) {
  const countdown = useCountdown(endTime || 0)
  const timeDisplay = endTime ? countdown : endsIn

  // overPool / underPool are LMSR prices already in 0–100 range
  const overPct = Math.round(overPool) || 50
  const underPct = Math.round(underPool) || 50

  const gradient = PLATFORM_GRADIENTS[platform] || PLATFORM_GRADIENTS.x
  const volNum = volume ? parseFloat(volume) : 0
  const ended = timeDisplay === "Ended"

  return (
    <Link href={`/market/${id}`} className="block group">
      <div
        className={`relative overflow-hidden rounded-2xl border border-border/50 bg-card transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary/20 cursor-pointer`}
      >
        {/* Subtle gradient background glow */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none`}
        />

        {/* Thumbnail */}
        {thumbnail ? (
          <div className="relative h-44 overflow-hidden">
            <img
              src={thumbnail}
              alt=""
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />

            {/* Platform badge */}
            <Badge
              className={`absolute top-3 left-3 bg-gradient-to-r ${gradient} text-white border-0 font-bold text-xs`}
            >
              {platform.toUpperCase()}
            </Badge>

            {/* Time */}
            <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md">
              <Clock className={`h-3 w-3 ${ended ? "text-destructive" : "text-accent"}`} />
              <span className={`text-xs font-mono ${ended ? "text-destructive" : "text-foreground"}`}>
                {timeDisplay}
              </span>
            </div>
          </div>
        ) : (
          <>
            {/* Header row: platform badge + time */}
            <div className="pt-4 px-4 flex items-center justify-between">
              <Badge
                className={`bg-gradient-to-r ${gradient} text-white border-0 font-bold text-xs`}
              >
                {platform.toUpperCase()}
              </Badge>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className={`h-3 w-3 ${ended ? "text-destructive" : ""}`} />
                <span className={`text-xs font-mono ${ended ? "text-destructive" : ""}`}>{timeDisplay}</span>
              </div>
            </div>

            {/* Tweet preview — shown when embed data is available */}
            {(authorName || postText) && (
              <div className="mx-4 mt-3 p-3 rounded-xl bg-muted/30 border border-border/30">
                <div className="flex items-start gap-2.5">
                  {authorAvatar ? (
                    <img
                      src={authorAvatar}
                      alt={authorName || ""}
                      className="h-8 w-8 rounded-full object-cover shrink-0 border border-border/30"
                    />
                  ) : (
                    <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0`}>
                      <span className="text-white font-bold text-xs">
                        {(authorName?.[0] || platform[0]).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1 overflow-hidden">
                    {authorName && (
                      <p className="text-xs font-semibold text-foreground truncate">@{authorName}</p>
                    )}
                    {postText && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed mt-0.5">
                        {postText}
                      </p>
                    )}
                  </div>
                </div>
                {mediaThumb && (
                  <img
                    src={mediaThumb}
                    alt=""
                    className="mt-2 w-full h-28 object-cover rounded-lg"
                  />
                )}
              </div>
            )}
          </>
        )}

        <div className="p-4 space-y-3">
          {/* Title */}
          <h3 className="text-sm font-semibold line-clamp-2 leading-snug text-foreground min-h-[2.5rem]">
            {title}
          </h3>

          {/* Odds boxes */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col items-center py-2.5 rounded-xl bg-primary/10 border border-primary/20 group-hover:bg-primary/15 transition-colors">
              <div className="flex items-center gap-1 mb-0.5">
                <TrendingUp className="h-3 w-3 text-primary" />
                <span className="text-[10px] text-muted-foreground font-semibold tracking-wider">OVER</span>
              </div>
              <span className="text-xl font-bold text-primary leading-none">{overPct}%</span>
            </div>
            <div className="flex flex-col items-center py-2.5 rounded-xl bg-destructive/10 border border-destructive/20 group-hover:bg-destructive/15 transition-colors">
              <div className="flex items-center gap-1 mb-0.5">
                <TrendingDown className="h-3 w-3 text-destructive" />
                <span className="text-[10px] text-muted-foreground font-semibold tracking-wider">UNDER</span>
              </div>
              <span className="text-xl font-bold text-destructive leading-none">{underPct}%</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-muted rounded-full overflow-hidden flex">
            <div
              className="bg-gradient-to-r from-primary to-primary/80 transition-all duration-500"
              style={{ width: `${overPct}%` }}
            />
            <div
              className="bg-gradient-to-r from-destructive/80 to-destructive transition-all duration-500"
              style={{ width: `${underPct}%` }}
            />
          </div>

          {/* Footer stats */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-0.5">
            {totalBets > 0 ? (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {totalBets}
              </span>
            ) : (
              <span className="text-primary/60 font-medium">New</span>
            )}
            {volNum > 0 && (
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                {volNum.toFixed(2)} USDC
              </span>
            )}
            {creator && (
              <span className="truncate max-w-[90px]">by {creator}</span>
            )}
          </div>
        </div>

        {/* Hover glow border */}
        <div className={`absolute inset-0 border-2 border-primary/0 group-hover:border-primary/20 rounded-2xl pointer-events-none transition-colors duration-300`} />
      </div>
    </Link>
  )
}
