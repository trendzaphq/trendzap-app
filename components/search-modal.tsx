"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Search, X, TrendingUp, Loader2, Clock } from "lucide-react"

interface SearchResult {
  market_id: number
  title: string | null
  thumbnail_url: string | null
  creator_address: string | null
}

interface SearchModalProps {
  open: boolean
  onClose: () => void
}

const RECENT_KEY = "tz_recent_searches"

function getRecent(): string[] {
  if (typeof window === "undefined") return []
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]") } catch { return [] }
}

function saveRecent(query: string) {
  const prev = getRecent().filter((q) => q !== query)
  localStorage.setItem(RECENT_KEY, JSON.stringify([query, ...prev].slice(0, 5)))
}

export function SearchModal({ open, onClose }: SearchModalProps) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [recent, setRecent] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery("")
      setResults([])
      setRecent(getRecent())
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [open])

  useEffect(() => {
    if (query.length < 2) { setResults([]); return }
    setLoading(true)
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((d) => { if (d.ok) setResults(d.results ?? []) })
        .catch(() => {})
        .finally(() => setLoading(false))
    }, 280)
    return () => clearTimeout(t)
  }, [query])

  const go = (id: number, title: string | null) => {
    if (query.trim()) saveRecent(query.trim())
    onClose()
    router.push(`/market/${id}`)
  }

  const goQuery = (q: string) => {
    setQuery(q)
    inputRef.current?.focus()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-background/97 backdrop-blur-md"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Input row */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border/40">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search markets, trends, creators…"
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-muted/60 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:bg-muted/80 transition-all"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground animate-spin" />
          )}
        </div>
        <button
          onClick={onClose}
          className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Results / Recent */}
      <div className="flex-1 overflow-y-auto px-4 pt-2 pb-8">
        {query.length < 2 ? (
          /* Recent searches */
          recent.length > 0 ? (
            <div className="space-y-1 pt-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-1 mb-2">Recent</p>
              {recent.map((q) => (
                <button
                  key={q}
                  onClick={() => goQuery(q)}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors text-left"
                >
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground">{q}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center pt-16 gap-3 text-center">
              <Search className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Type to search markets and trends</p>
            </div>
          )
        ) : results.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center pt-16 gap-3 text-center">
            <TrendingUp className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No markets found for <strong className="text-foreground">"{query}"</strong></p>
            <p className="text-xs text-muted-foreground/60">Try a different keyword</p>
          </div>
        ) : (
          <div className="space-y-1 pt-2">
            {results.map((r) => (
              <button
                key={r.market_id}
                onClick={() => go(r.market_id, r.title)}
                className="flex items-center gap-3 w-full px-3 py-3 rounded-xl hover:bg-muted/50 active:bg-muted/70 transition-colors text-left group"
              >
                {r.thumbnail_url ? (
                  <img
                    src={r.thumbnail_url}
                    alt=""
                    className="h-10 w-14 rounded-lg object-cover shrink-0 bg-muted"
                  />
                ) : (
                  <div className="h-10 w-14 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                    {r.title || `Market #${r.market_id}`}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">#{r.market_id}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
