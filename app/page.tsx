"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Navigation } from "@/components/navigation"
import { MarketFeed } from "@/components/market-feed"
import { MarketFilters } from "@/components/market-filters"

function FeedSection() {
  const searchParams = useSearchParams()
  const platform = searchParams.get("platform") || ""

  return (
    <>
      <section className="border-b border-border/40 bg-[oklch(0.1_0.02_264)]/50 backdrop-blur-sm sticky top-16 z-40">
        <div className="container mx-auto px-4 py-4">
          <MarketFilters activePlatform={platform} />
        </div>
      </section>

      <section className="container mx-auto px-4 py-6">
        <MarketFeed platform={platform} />
      </section>
    </>
  )
}

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />

      <main className="flex-1">
        <Suspense fallback={null}>
          <FeedSection />
        </Suspense>
      </main>
    </div>
  )
}
