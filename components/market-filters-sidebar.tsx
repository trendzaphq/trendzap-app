"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Flame,
  Clock,
  TrendingUp,
  Zap,
  LayoutGrid,
  Tv2,
  Youtube,
  Twitter,
  Instagram,
} from "lucide-react"

interface MarketFiltersSidebarProps {
  activePlatform: string
  sortBy: string
  onSortChange: (s: string) => void
}

const SORT_OPTIONS = [
  { value: "newest", label: "Newest", icon: Zap },
  { value: "ending", label: "Ending Soon", icon: Clock },
  { value: "volume", label: "Most Volume", icon: TrendingUp },
  { value: "hot", label: "Hot", icon: Flame },
]

const PLATFORMS = [
  { value: "", label: "All Platforms", icon: LayoutGrid },
  { value: "x", label: "X / Twitter", icon: Twitter },
  { value: "tiktok", label: "TikTok", icon: Tv2 },
  { value: "youtube", label: "YouTube", icon: Youtube },
  { value: "instagram", label: "Instagram", icon: Instagram },
]

export function MarketFiltersSidebar({ activePlatform, sortBy, onSortChange }: MarketFiltersSidebarProps) {
  const router = useRouter()

  const setPlatform = (p: string) => {
    router.push(p ? `/?platform=${p}` : "/")
  }

  return (
    <aside className="hidden lg:flex flex-col gap-6 w-52 shrink-0 sticky top-[6.5rem] self-start h-fit pb-10">
      {/* Sort */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-1">Sort</p>
        <div className="space-y-0.5">
          {SORT_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => onSortChange(value)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                sortBy === value
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-border/60" />

      {/* Platforms */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-1">
          Platform
        </p>
        <div className="space-y-0.5">
          {PLATFORMS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setPlatform(value)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activePlatform === value
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-border/60" />

      {/* Status */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-1">
          Status
        </p>
        <div className="space-y-0.5">
          {[
            { label: "Live", dot: "bg-green-500" },
            { label: "Ending Today", dot: "bg-accent" },
            { label: "Resolved", dot: "bg-muted-foreground" },
          ].map(({ label, dot }) => (
            <button
              key={label}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <span className={`w-2 h-2 rounded-full ${dot} shrink-0`} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}
