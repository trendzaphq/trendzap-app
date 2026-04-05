import { NextRequest, NextResponse } from "next/server"

export const runtime = "edge"

function detectPlatform(url: string) {
  if (url.includes("twitter.com") || url.includes("x.com")) return "x"
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube"
  if (url.includes("tiktok.com")) return "tiktok"
  if (url.includes("instagram.com")) return "instagram"
  return "unknown"
}

function extractTweetId(url: string): string | null {
  const match = url.match(/\/status\/(\d+)/)
  return match ? match[1] : null
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return match ? match[1] : null
}

/** Extract plain tweet text from the blockquote in Twitter oEmbed HTML */
function extractTweetText(html: string): string | null {
  // Twitter oEmbed: <blockquote class="twitter-tweet"><p lang="en" dir="ltr">TEXT</p>&mdash; ...
  const pMatch = html.match(/<p[^>]*lang="[^"]*"[^>]*>([\s\S]*?)<\/p>/)
  if (!pMatch) return null
  // Strip HTML tags and decode common HTML entities
  return pMatch[1]
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, "—")
    .replace(/\s+/g, " ")
    .trim()
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url")
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 })

  const platform = detectPlatform(url)

  try {
    // ─── X / Twitter ─────────────────────────────────────────────────────────
    if (platform === "x") {
      const oEmbedUrl =
        `https://publish.twitter.com/oembed` +
        `?url=${encodeURIComponent(url)}&theme=dark&dnt=true&omit_script=false`

      const oEmbedRes = await fetch(oEmbedUrl, {
        headers: { "User-Agent": "TrendZap/1.0" },
        signal: AbortSignal.timeout(8000),
      })

      if (!oEmbedRes.ok) {
        return NextResponse.json(
          { error: "Tweet not found or account is private" },
          { status: 404 }
        )
      }

      const oEmbed = await oEmbedRes.json()
      const post_text = extractTweetText(oEmbed.html as string)

      // Fetch live stats via Twitter API v2 (requires TWITTER_BEARER_TOKEN)
      let stats: Record<string, number> | null = null
      let follower_count: number | null = null
      const tweetId = extractTweetId(url)
      const bearer = process.env.TWITTER_BEARER_TOKEN

      if (tweetId) {
        // Try official API v2 first (requires paid tier)
        if (bearer) {
          try {
            const statsRes = await fetch(
              `https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=public_metrics`,
              {
                headers: { Authorization: `Bearer ${bearer}` },
                signal: AbortSignal.timeout(5000),
              }
            )
            if (statsRes.ok) {
              const statsJson = await statsRes.json()
              const pm = statsJson.data?.public_metrics
              if (pm) stats = pm
            }
          } catch { /* fall through to syndication */ }
        }

        // Fallback: Twitter syndication API (no auth — used by react-tweet)
        if (!stats) {
          try {
            const token = ((Number(tweetId) / 1e15) * Math.PI)
              .toString(6)
              .replace(/(.).*\1/, "")
              .slice(-6)
            const syndRes = await fetch(
              `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&lang=en&token=${token}`,
              { signal: AbortSignal.timeout(5000) }
            )
            if (syndRes.ok) {
              const s = await syndRes.json()
              if (s?.favorite_count !== undefined || s?.retweet_count !== undefined) {
                stats = {
                  like_count: s.favorite_count ?? 0,
                  retweet_count: s.retweet_count ?? 0,
                  reply_count: s.conversation_count ?? 0,
                  quote_count: s.quote_count ?? 0,
                  bookmark_count: s.bookmark_count ?? 0,
                }
              }
              if (s?.user?.followers_count !== undefined) {
                follower_count = s.user.followers_count
              }
            }
          } catch { /* syndication unavailable */ }
        }
      }

      return NextResponse.json(
        { platform: "x", embed_html: oEmbed.html, author_name: oEmbed.author_name, post_text, stats, follower_count },
        { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
      )
    }

    // ─── YouTube ─────────────────────────────────────────────────────────────
    if (platform === "youtube") {
      const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
      const oEmbedRes = await fetch(oEmbedUrl, { signal: AbortSignal.timeout(8000) })

      if (!oEmbedRes.ok) {
        return NextResponse.json({ error: "YouTube video not found or private" }, { status: 404 })
      }

      const oEmbed = await oEmbedRes.json()

      let stats: Record<string, number> | null = null
      const videoId = extractYouTubeId(url)
      const ytKey = process.env.YOUTUBE_API_KEY

      if (videoId && ytKey) {
        try {
          const statsRes = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&key=${ytKey}`,
            { signal: AbortSignal.timeout(5000) }
          )
          if (statsRes.ok) {
            const s = (await statsRes.json()).items?.[0]?.statistics
            if (s) {
              stats = {
                view_count: parseInt(s.viewCount || "0"),
                like_count: parseInt(s.likeCount || "0"),
                comment_count: parseInt(s.commentCount || "0"),
              }
            }
          }
        } catch { /* no stats */ }
      }

      return NextResponse.json(
        {
          platform: "youtube",
          embed_html: oEmbed.html,
          author_name: oEmbed.author_name,
          title: oEmbed.title,
          thumbnail_url: oEmbed.thumbnail_url,
          post_text: oEmbed.title as string | null,
          stats,
        },
        { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } }
      )
    }

    // ─── TikTok ───────────────────────────────────────────────────────────────
    if (platform === "tiktok") {
      const oEmbedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`
      const oEmbedRes = await fetch(oEmbedUrl, {
        headers: { "User-Agent": "TrendZap/1.0" },
        signal: AbortSignal.timeout(8000),
      })

      if (!oEmbedRes.ok) {
        return NextResponse.json({ error: "TikTok video not found or private" }, { status: 404 })
      }

      const oEmbed = await oEmbedRes.json()

      return NextResponse.json(
        {
          platform: "tiktok",
          embed_html: oEmbed.html,
          author_name: oEmbed.author_name,
          title: oEmbed.title,
          thumbnail_url: oEmbed.thumbnail_url,
          post_text: oEmbed.title as string | null,
          stats: null,
        },
        { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } }
      )
    }

    return NextResponse.json({ error: "Unsupported platform" }, { status: 400 })
  } catch {
    return NextResponse.json({ error: "Failed to fetch embed" }, { status: 502 })
  }
}

