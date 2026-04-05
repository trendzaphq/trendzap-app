"use client"

import { useEffect, useRef, useState } from "react"
import { Eye, Heart, Repeat2, MessageCircle, Loader2, RefreshCw, ExternalLink } from "lucide-react"

interface EmbedStats {
  // Twitter/X
  impression_count?: number
  like_count?: number
  retweet_count?: number
  reply_count?: number
  quote_count?: number
  bookmark_count?: number
  // YouTube
  view_count?: number
  comment_count?: number
}

export interface EmbedData {
  platform: string
  embed_html: string
  author_name?: string
  title?: string
  thumbnail_url?: string
  stats?: EmbedStats | null
}

function fmt(n?: number): string {
  if (n === undefined || n === null) return "—"
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

interface PostEmbedProps {
  url: string
  platform?: string
  className?: string
  compact?: boolean
}

export function PostEmbed({ url, platform: platformHint, className = "", compact = false }: PostEmbedProps) {
  const [data, setData] = useState<EmbedData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const fetchEmbed = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/embed?url=${encodeURIComponent(url)}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setError((err as { error?: string }).error || "Could not load post")
        setLoading(false)
        return
      }
      const d: EmbedData = await res.json()
      setData(d)
      setLastUpdated(new Date())
    } catch {
      setError("Could not load post preview")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!url) return
    setData(null)
    fetchEmbed()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])

  // Load Twitter widgets.js and re-process after HTML injection
  useEffect(() => {
    if (!data?.embed_html || data.platform !== "x") return

    const run = () => {
      ;(window as any).twttr?.widgets?.load(containerRef.current)
    }

    if ((window as any).twttr?.widgets) {
      run()
    } else if (!document.querySelector('script[src*="platform.twitter.com/widgets.js"]')) {
      const s = document.createElement("script")
      s.src = "https://platform.twitter.com/widgets.js"
      s.async = true
      s.onload = run
      document.head.appendChild(s)
    } else {
      // script is loading — poll until ready
      const poll = setInterval(() => {
        if ((window as any).twttr?.widgets) {
          clearInterval(poll)
          run()
        }
      }, 200)
      return () => clearInterval(poll)
    }
  }, [data])

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-10 ${className}`}>
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Loading post…</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center py-6 ${className}`}>
        <div className="text-center space-y-2">
          <p className="text-xs text-muted-foreground">{error}</p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary underline"
          >
            <ExternalLink className="h-3 w-3" />
            Open original post
          </a>
        </div>
      </div>
    )
  }

  if (!data) return null

  const stats = data.stats
  const hasStats = stats && Object.keys(stats).length > 0

  const views = stats?.impression_count ?? stats?.view_count
  const likes = stats?.like_count
  const reposts = stats?.retweet_count
  const replies = stats?.reply_count ?? stats?.comment_count

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Live stat pills */}
      {hasStats && !compact && (
        <div className="grid grid-cols-4 gap-1.5">
          <StatPill icon={Eye} label="Views" value={views} live />
          <StatPill icon={Heart} label="Likes" value={likes} />
          <StatPill icon={Repeat2} label="Reposts" value={reposts} />
          <StatPill icon={MessageCircle} label="Replies" value={replies} />
        </div>
      )}

      {/* Compact stats (single row) */}
      {hasStats && compact && (
        <div className="flex items-center gap-3 px-1 text-xs text-muted-foreground">
          {views !== undefined && (
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              <span className="font-mono font-semibold text-foreground">{fmt(views)}</span>
            </span>
          )}
          {likes !== undefined && (
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              <span className="font-mono font-semibold text-foreground">{fmt(likes)}</span>
            </span>
          )}
          {reposts !== undefined && (
            <span className="flex items-center gap-1">
              <Repeat2 className="h-3 w-3" />
              <span className="font-mono font-semibold text-foreground">{fmt(reposts)}</span>
            </span>
          )}
          {replies !== undefined && (
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              <span className="font-mono font-semibold text-foreground">{fmt(replies)}</span>
            </span>
          )}
          <span className="ml-auto flex items-center gap-1 text-green-400 text-[10px]">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            live
          </span>
        </div>
      )}

      {/* The actual embed */}
      <div
        ref={containerRef}
        className={`
          rounded-xl overflow-hidden
          [&_.twitter-tweet]:mx-auto [&_.twitter-tweet]:!max-w-full
          [&_iframe]:w-full [&_iframe]:aspect-video [&_iframe]:h-auto [&_iframe]:rounded-xl [&_iframe]:border-0
          [&_blockquote]:!max-w-full [&_blockquote]:!width-full
        `}
        dangerouslySetInnerHTML={{ __html: data.embed_html }}
      />

      {/* Footer: refresh + timestamp */}
      {hasStats && !compact && lastUpdated && (
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          <button
            onClick={fetchEmbed}
            className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <RefreshCw className="h-2.5 w-2.5" />
            Refresh stats
          </button>
        </div>
      )}
    </div>
  )
}

function StatPill({
  icon: Icon,
  label,
  value,
  live,
}: {
  icon: React.ElementType
  label: string
  value?: number
  live?: boolean
}) {
  return (
    <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50 border border-border/40 gap-0.5">
      <div className="flex items-center gap-1">
        <Icon className="h-3 w-3 text-muted-foreground" />
        {live && <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />}
      </div>
      <span className="text-sm font-bold font-mono tabular-nums leading-none">{fmt(value)}</span>
      <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</span>
    </div>
  )
}
