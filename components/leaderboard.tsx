"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Trophy, TrendingUp, Target, Zap, Loader2 } from "lucide-react"

interface LeaderboardProps {
  timeframe: "all-time" | "weekly" | "daily"
}

interface LeaderEntry {
  rank: number
  address: string
  username: string
  avatar: string
  profit: number
  winRate: number
  totalBets: number
  wins: number
  badges: string[]
}

const getBadgeInfo = (badge: string) => {
  const badges: Record<string, { label: string; color: string; icon: any }> = {
    whale: { label: "Whale", color: "bg-primary/10 text-primary border-primary/20", icon: Trophy },
    streak: { label: "Hot Streak", color: "bg-destructive/10 text-destructive border-destructive/20", icon: Zap },
    creator: { label: "Market Maker", color: "bg-secondary/10 text-secondary border-secondary/20", icon: TrendingUp },
    accurate: { label: "Sniper", color: "bg-accent/10 text-accent border-accent/20", icon: Target },
    volume: { label: "High Volume", color: "bg-primary/10 text-primary border-primary/20", icon: TrendingUp },
    tiktok: { label: "TikTok Expert", color: "bg-[#FF0050]/10 text-[#FF0050] border-[#FF0050]/20", icon: TrendingUp },
  }
  return badges[badge] || badges.whale
}

export function Leaderboard({ timeframe }: LeaderboardProps) {
  const [leaders, setLeaders] = useState<LeaderEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    // Trigger a background sync then load leaderboard
    fetch("/api/indexer/sync", { method: "GET" }).catch(() => {})
    fetch(`/api/leaderboard?timeframe=${timeframe}`)
      .then((r) => r.json())
      .then((data) => { if (data.ok) setLeaders(data.entries) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [timeframe])

  const getRankStyle = (rank: number) => {
    if (rank === 1) return "from-[#FFD700] to-[#FFA500]"
    if (rank === 2) return "from-[#C0C0C0] to-[#A8A8A8]"
    if (rank === 3) return "from-[#CD7F32] to-[#8B4513]"
    return ""
  }

  const getRankColor = (rank: number) => {
    if (rank === 1) return "text-[#FFD700]"
    if (rank === 2) return "text-[#C0C0C0]"
    if (rank === 3) return "text-[#CD7F32]"
    return "text-muted-foreground"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (leaders.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <Trophy className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p className="text-lg font-medium">No data yet</p>
        <p className="text-sm mt-1">Be the first to make a prediction!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Top 3 Podium */}
      {leaders.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {leaders.slice(0, 3).map((leader) => (
            <Card
              key={leader.rank}
              className={`p-6 text-center relative overflow-hidden`}
            >
              {<div className={`absolute inset-0 bg-gradient-to-br ${getRankStyle(leader.rank)} opacity-5`} />}

              <div className="relative">
                <div className="relative inline-block mb-4">
                  <Avatar className="h-20 w-20 border-4 border-primary/20">
                    <AvatarFallback
                      className={`text-2xl font-bold ${
                        leader.rank === 1
                          ? "bg-gradient-to-br from-[#FFD700] to-[#FFA500] text-black"
                          : leader.rank === 2
                            ? "bg-gradient-to-br from-[#C0C0C0] to-[#A8A8A8] text-black"
                            : "bg-gradient-to-br from-[#CD7F32] to-[#8B4513] text-black"
                      }`}
                    >
                      {leader.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br ${getRankStyle(leader.rank)} flex items-center justify-center font-bold text-black text-sm shadow-lg`}
                  >
                    {leader.rank}
                  </div>
                </div>

                <div className="font-bold text-lg mb-1">{leader.username}</div>
                <div className={`text-2xl font-mono font-bold mb-2 ${leader.profit >= 0 ? "text-primary" : "text-destructive"}`}>
                  {leader.profit >= 0 ? "+" : ""}{leader.profit.toFixed(3)} AVAX
                </div>
                <div className="text-sm text-muted-foreground">{leader.winRate}% win rate</div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Rest of leaderboard */}
      <Card className="divide-y divide-border">
        {leaders.slice(leaders.length >= 3 ? 3 : 0).map((leader) => (
          <div key={leader.rank} className="p-4 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-4">
              <div className={`text-2xl font-bold font-mono w-12 text-center ${getRankColor(leader.rank)}`}>
                {leader.rank}
              </div>

              <Avatar className="h-12 w-12 border-2 border-primary/20">
                <AvatarFallback className="bg-primary/10 text-primary font-bold">{leader.avatar}</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold font-mono text-sm">{leader.username}</span>
                  {leader.badges.map((badge) => {
                    const badgeInfo = getBadgeInfo(badge)
                    return (
                      <Badge key={badge} variant="outline" className={`text-xs gap-1 ${badgeInfo.color}`}>
                        <badgeInfo.icon className="h-3 w-3" />
                        {badgeInfo.label}
                      </Badge>
                    )
                  })}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{leader.totalBets} bets</span>
                  <span>•</span>
                  <span>{leader.winRate}% win rate</span>
                </div>
              </div>

              <div className="text-right">
                <div className={`text-xl font-mono font-bold ${leader.profit >= 0 ? "text-primary" : "text-destructive"}`}>
                  {leader.profit >= 0 ? "+" : ""}{leader.profit.toFixed(3)} AVAX
                </div>
                <div className="text-xs text-muted-foreground">Profit</div>
              </div>
            </div>
          </div>
        ))}
      </Card>
    </div>
  )
}
