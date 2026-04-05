// Automatically detects which platforms are enabled based on env vars.
// Add API keys in .env.local to enable a platform.
// The frontend reads NEXT_PUBLIC_ENABLED_PLATFORMS (comma-separated list).
// Default: only "x" is enabled until other platform APIs are configured.

export interface PlatformConfig {
  id: string
  label: string
  color: string
  gradient: string
  urlPatterns: string[]
}

export const ALL_PLATFORMS: PlatformConfig[] = [
  {
    id: "x",
    label: "X / Twitter",
    color: "#1DA1F2",
    gradient: "from-[#1DA1F2] to-[#14171A]",
    urlPatterns: ["twitter.com", "x.com"],
  },
  {
    id: "tiktok",
    label: "TikTok",
    color: "#FF0050",
    gradient: "from-[#FF0050] to-[#00F2EA]",
    urlPatterns: ["tiktok.com"],
  },
  {
    id: "youtube",
    label: "YouTube",
    color: "#FF0000",
    gradient: "from-[#FF0000] to-[#FF8800]",
    urlPatterns: ["youtube.com", "youtu.be"],
  },
  {
    id: "instagram",
    label: "Instagram",
    color: "#E1306C",
    gradient: "from-[#E1306C] to-[#FCAF45]",
    urlPatterns: ["instagram.com"],
  },
]

// Default: "x,youtube" — both are fully integrated with API keys configured.
// Add more to NEXT_PUBLIC_ENABLED_PLATFORMS when TikTok/Instagram are ready.
export function getEnabledPlatforms(): PlatformConfig[] {
  const envList = process.env.NEXT_PUBLIC_ENABLED_PLATFORMS || "x,youtube"
  const enabled = new Set(envList.split(",").map((s) => s.trim().toLowerCase()))
  return ALL_PLATFORMS.filter((p) => enabled.has(p.id))
}

export function getPlatformFromUrl(url: string): PlatformConfig | null {
  return ALL_PLATFORMS.find((p) => p.urlPatterns.some((pattern) => url.includes(pattern))) ?? null
}

export function getPlatformConfig(id: string): PlatformConfig {
  return ALL_PLATFORMS.find((p) => p.id === id) ?? ALL_PLATFORMS[0]
}
