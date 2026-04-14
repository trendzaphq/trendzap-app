"use client"

import { useEffect, useRef, useState } from "react"
import { Eye, Heart, Repeat2, MessageCircle, Loader2, RefreshCw, ExternalLink } from "lucide-react"

interface EmbedStats {
  // Twitter/X (from public_metrics — impression_count NOT available via Bearer token)
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
  author_avatar?: string | null
  media?: string[]
  title?: string
  thumbnail_url?: string
  post_text?: string | null
  stats?: EmbedStats | null
  follower_count?: number | null
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
  hideAuthor?: boolean
  onData?: (data: EmbedData) => void
}

export function PostEmbed({ url, platform: _platformHint, className = "", compact = false, hideAuthor = false, onData }: PostEmbedProps) {
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
      onData?.(d)
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
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Loading post preview…</span>
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
  const platform = data.platform

  // Build stat list — only include what's actually available per platform
  // Twitter Bearer token provides: like, retweet, reply, quote, bookmark (NOT impressions/views)
  // YouTube provides: view, like, comment
  const statItems: { icon: React.ElementType; label: string; value: number | undefined; live?: boolean }[] = []

  if (platform === "x") {
    if (stats?.like_count !== undefined) statItems.push({ icon: Heart, label: "Likes", value: stats.like_count })
    if (stats?.view_count !== undefined) statItems.push({ icon: Eye, label: "Views", value: stats.view_count, live: true })
    if (stats?.retweet_count !== undefined) statItems.push({ icon: Repeat2, label: "Retweets", value: stats.retweet_count })
    if (stats?.reply_count !== undefined) statItems.push({ icon: MessageCircle, label: "Comments", value: stats.reply_count })
  } else if (platform === "youtube") {
    if (stats?.like_count !== undefined) statItems.push({ icon: Heart, label: "Likes", value: stats.like_count })
    if (stats?.comment_count !== undefined) statItems.push({ icon: MessageCircle, label: "Comments", value: stats.comment_count })
    if (stats?.view_count !== undefined) statItems.push({ icon: Eye, label: "Views", value: stats.view_count, live: true })
  }

  const hasStats = statItems.length > 0

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Author row — X/Twitter only */}
      {platform === "x" && data.author_avatar && !compact && !hideAuthor && (
        <div className="flex items-center gap-2.5 px-1">
          <img
            src={data.author_avatar}
            alt={data.author_name || "Author"}
            className="h-9 w-9 rounded-full object-cover border border-border/40 shrink-0"
          />
          <div>
            <p className="text-sm font-semibold leading-snug">{data.author_name}</p>
            <p className="text-[10px] text-muted-foreground">X / Twitter</p>
          </div>
        </div>
      )}

      {/* Stat pills — horizontal scrollable row (mobile-friendly) */}
      {hasStats && !compact && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
          {statItems.map((item) => (
            <StatPill key={item.label} icon={item.icon} label={item.label} value={item.value} live={item.live} />
          ))}
          {/* Live indicator chip */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/40 border border-border/40 shrink-0 ml-auto">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[10px] text-cyan-400 font-medium uppercase tracking-wider">live</span>
          </div>
        </div>
      )}

      {/* Compact stats — inline row */}
      {hasStats && compact && (
        <div className="flex items-center gap-3 px-1 text-xs text-muted-foreground flex-wrap">
          {statItems.map((item) => (
            <span key={item.label} className="flex items-center gap-1">
              <item.icon className="h-3 w-3" />
              <span className="font-mono font-semibold text-foreground">{fmt(item.value)}</span>
            </span>
          ))}
          <span className="ml-auto flex items-center gap-1 text-cyan-400 text-[10px]">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
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

      {/* Media image grid — X/Twitter photos */}
      {platform === "x" && data.media && data.media.length > 0 && !compact && (
        <div className={`grid gap-1 rounded-xl overflow-hidden ${data.media.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {data.media.slice(0, 4).map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`Tweet image ${i + 1}`}
              className="w-full aspect-video object-cover"
            />
          ))}
        </div>
      )}

      {/* Footer: timestamp + refresh */}
      {hasStats && !compact && lastUpdated && (
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] text-muted-foreground">
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
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border/40 shrink-0">
      <div className="flex items-center gap-1">
        <Icon className="h-3 w-3 text-muted-foreground" />
        {live && <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-bold font-mono tabular-nums leading-none">{fmt(value)}</span>
        <span className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">{label}</span>
      </div>
    </div>
  )
}
