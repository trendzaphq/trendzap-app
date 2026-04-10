import { Navigation } from "@/components/navigation"
import { MarketDetailView } from "@/components/market-detail-view"
import { RecentBets } from "@/components/recent-bets"
import { SimilarMarkets } from "@/components/similar-markets"
import { getMetadataBySlug } from "@/lib/db"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function MarketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // If it looks like a UUID slug, resolve it to the on-chain numeric market ID
  let numericId: number | null = null
  if (UUID_RE.test(id)) {
    const meta = await getMetadataBySlug(id)
    if (meta) numericId = meta.market_id
  } else {
    const parsed = parseInt(id, 10)
    if (!isNaN(parsed)) numericId = parsed
  }

  const marketId = numericId !== null ? String(numericId) : id

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <MarketDetailView marketId={marketId} />
            <RecentBets marketId={marketId} />
          </div>

          <div className="space-y-6">
            <SimilarMarkets marketId={numericId ?? 0} />
          </div>
        </div>
      </main>
    </div>
  )
}
