import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://app.trendzap.xyz"
  return [
    { url: base, lastModified: new Date(), changeFrequency: "hourly", priority: 1 },
    { url: `${base}/leaderboard`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.8 },
    { url: `${base}/create`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ]
}
