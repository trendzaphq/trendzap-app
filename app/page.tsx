"use client"

import { Suspense, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Navigation } from "@/components/navigation"
import { MarketFeed } from "@/components/market-feed"
import { MarketFiltersSidebar } from "@/components/market-filters-sidebar"
import { TrendingSidebar } from "@/components/trending-sidebar"
import { Flame, Clock, TrendingUp, Zap, LayoutGrid, Tv2, Youtube, Twitter, Instagram } from "lucide-react"
import { getEnabledPlatforms } from "@/lib/platforms"

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  x: Twitter, tiktok: Tv2, youtube: Youtube, instagram: Instagram,
}

const SORTS = [
  { value: "newest", label: "New", icon: Zap },
  { value: "ending", label: "Ending", icon: Clock },
  { value: "volume", label: "Volume", icon: TrendingUp },
  { value: "hot", label: "Hot", icon: Flame },
]

function MobileFilterStrip({
  activePlatform,
  sortBy,
  onSortChange,
}: {
  activePlatform: string
  sortBy: string
  onSortChange: (s: string) => void
}) {
  const router = useRouter()
  const setPlatform = (p: string) => router.push(p ? `/?platform=${p}` : "/")
  const enabledPlatforms = getEnabledPlatforms()

  return (
    <div className="lg:hidden border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-16 z-30">
      <div className="flex items-center gap-1.5 px-4 py-2 overflow-x-auto no-scrollbar">
        {/* "All" pill */}
        <button
          onClick={() => setPlatform("")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
            activePlatform === ""
              ? "bg-primary text-primary-foreground"
              : "bg-muted/60 text-muted-foreground hover:text-foreground"
          }`}
        >
          <LayoutGrid className="h-3 w-3" />
          All
        </button>

        {enabledPlatforms.map((p) => {
          const Icon = PLATFORM_ICONS[p.id] || Twitter
          return (
            <button
              key={p.id}
              onClick={() => setPlatform(p.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                activePlatform === p.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3 w-3" />
              {p.label === "X (Twitter)" ? "X" : p.label}
            </button>
          )
        })}

        <div className="h-4 w-px bg-border shrink-0 mx-1" />

        {SORTS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => onSortChange(value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
              sortBy === value
                ? "bg-primary/20 text-primary border border-primary/30"
                : "bg-muted/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3 w-3" />
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

function FeedSection() {
  const searchParams = useSearchParams()
  const platform = searchParams.get("platform") || ""
  const [sortBy, setSortBy] = useState("newest")

  return (
    <>
      <MobileFilterStrip activePlatform={platform} sortBy={sortBy} onSortChange={setSortBy} />

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-8">
          <MarketFiltersSidebar activePlatform={platform} sortBy={sortBy} onSortChange={setSortBy} />

          <main className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold tracking-tight">
                  {platform ? `${platform.toUpperCase()} Markets` : "Live Markets"}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Real-money predictions on viral content
                </p>
              </div>
              <span className="text-xs text-muted-foreground hidden sm:block">
                Sorted by <span className="text-foreground font-medium capitalize">{sortBy}</span>
              </span>
            </div>
            <MarketFeed platform={platform} sortBy={sortBy} />
          </main>

          <TrendingSidebar />
        </div>
      </div>
    </>
  )
}

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <Suspense fallback={null}>
        <FeedSection />
      </Suspense>
    </div>
  )
}
