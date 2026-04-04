"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Flame, Clock, TrendingUp, DollarSign, Filter, X } from "lucide-react"

interface MarketFiltersProps {
  onFilterChange?: (filters: FilterState) => void
  activePlatform?: string
}

interface FilterState {
  platform: string
  sortBy: string
  timeframe: string
  minPool: number
}

const PLATFORMS = ["tiktok", "youtube", "x", "instagram"]

export function MarketFilters({ onFilterChange, activePlatform = "" }: MarketFiltersProps) {
  const router = useRouter()
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)

  const toggleFilter = (filter: string) => {
    setActiveFilters((prev) => (prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]))
  }

  const clearFilters = () => {
    setActiveFilters([])
  }

  const setPlatform = (p: string) => {
    router.push(activePlatform === p ? "/" : `/?platform=${p}`)
  }

  return (
    <div className="space-y-4">
      {/* Quick Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Button
          size="sm"
          variant={activeFilters.includes("hot") ? "default" : "outline"}
          className="gap-1 shrink-0"
          onClick={() => toggleFilter("hot")}
        >
          <Flame className="h-4 w-4" />
          {"Hot"}
        </Button>
        <Button
          size="sm"
          variant={activeFilters.includes("ending-soon") ? "default" : "outline"}
          className="gap-1 shrink-0"
          onClick={() => toggleFilter("ending-soon")}
        >
          <Clock className="h-4 w-4" />
          {"Ending Soon"}
        </Button>
        <Button
          size="sm"
          variant={activeFilters.includes("high-volume") ? "default" : "outline"}
          className="gap-1 shrink-0"
          onClick={() => toggleFilter("high-volume")}
        >
          <DollarSign className="h-4 w-4" />
          {"High Volume"}
        </Button>
        <Button
          size="sm"
          variant={activeFilters.includes("trending") ? "default" : "outline"}
          className="gap-1 shrink-0"
          onClick={() => toggleFilter("trending")}
        >
          <TrendingUp className="h-4 w-4" />
          {"Trending"}
        </Button>

        <div className="h-6 w-px bg-border mx-2" />

        {PLATFORMS.map((p) => (
          <Button
            key={p}
            size="sm"
            variant={activePlatform === p ? "default" : "outline"}
            className="shrink-0"
            onClick={() => setPlatform(p)}
          >
            {p.toUpperCase()}
          </Button>
        ))}

        <Button
          size="sm"
          variant="ghost"
          className="gap-1 ml-auto shrink-0"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <Filter className="h-4 w-4" />
          {"Advanced"}
        </Button>

        {activeFilters.length > 0 && (
          <Button size="sm" variant="ghost" className="gap-1 shrink-0" onClick={clearFilters}>
            <X className="h-4 w-4" />
            {"Clear"}
          </Button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-card border border-border rounded-lg animate-slide-up">
          <div className="space-y-2">
            <label className="text-sm font-medium">{"Sort By"}</label>
            <Select defaultValue="hot">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hot">{"Hottest"}</SelectItem>
                <SelectItem value="new">{"Newest"}</SelectItem>
                <SelectItem value="ending">{"Ending Soon"}</SelectItem>
                <SelectItem value="volume">{"Highest Volume"}</SelectItem>
                <SelectItem value="profit">{"Most Profitable"}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{"Timeframe"}</label>
            <Select defaultValue="all">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{"All Time"}</SelectItem>
                <SelectItem value="1h">{"Ending in 1h"}</SelectItem>
                <SelectItem value="6h">{"Ending in 6h"}</SelectItem>
                <SelectItem value="24h">{"Ending in 24h"}</SelectItem>
                <SelectItem value="7d">{"Ending in 7d"}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{"Min Pool Size"}</label>
            <Select defaultValue="all">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{"All Sizes"}</SelectItem>
                <SelectItem value="1000">{"$1,000+"}</SelectItem>
                <SelectItem value="5000">{"$5,000+"}</SelectItem>
                <SelectItem value="10000">{"$10,000+"}</SelectItem>
                <SelectItem value="50000">{"$50,000+"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">{"Active filters:"}</span>
          {activeFilters.map((filter) => (
            <Badge
              key={filter}
              variant="secondary"
              className="gap-1 cursor-pointer hover:bg-secondary/80"
              onClick={() => toggleFilter(filter)}
            >
              {filter}
              <X className="h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
