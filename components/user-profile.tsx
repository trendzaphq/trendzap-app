"use client"

import { usePrivy, useWallets } from "@privy-io/react-auth"
import { Card } from "@/components/ui/card"
import { Copy, ExternalLink, CheckCircle2 } from "lucide-react"
import { useState } from "react"

const GRADIENTS: [string, string][] = [
  ["#7C3AED", "#2563EB"],
  ["#DB2777", "#7C3AED"],
  ["#059669", "#2563EB"],
  ["#D97706", "#DB2777"],
  ["#DC2626", "#D97706"],
  ["#0891B2", "#059669"],
  ["#7C3AED", "#EC4899"],
  ["#2563EB", "#0891B2"],
  ["#F59E0B", "#EF4444"],
  ["#10B981", "#6366F1"],
]

function getAddressGradient(address: string): [string, string] {
  if (!address) return GRADIENTS[0]
  const hex = address.toLowerCase().replace("0x", "")
  const hash = hex.split("").reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) % 1_000_000, 0)
  return GRADIENTS[hash % GRADIENTS.length]
}

function GradientAvatar({ address, initials, size = 72 }: { address: string; initials: string; size?: number }) {
  const [c1, c2] = getAddressGradient(address)
  const uid = `ga-${address.slice(2, 10) || "anon"}`
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ borderRadius: "50%" }}>
      <defs>
        <linearGradient id={uid} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${uid})`} />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        fill="white"
        fontSize={size * 0.34}
        fontWeight="700"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        {initials}
      </text>
    </svg>
  )
}

export function UserProfile() {
  const { user, authenticated } = usePrivy()
  const { wallets } = useWallets()
  const [copied, setCopied] = useState(false)

  const wallet = wallets[0]
  const address = wallet?.address ?? ""
  const email = user?.email?.address
  const displayName = email
    ? email.split("@")[0]
    : address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : "Anonymous"
  const initials = displayName.slice(0, 2).toUpperCase()
  const [bannerC1, bannerC2] = getAddressGradient(address)

  const copyAddress = () => {
    if (!address) return
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="overflow-hidden">
      {/* Dynamic gradient banner — matches avatar palette */}
      <div
        className="h-24 relative"
        style={{ background: `linear-gradient(135deg, ${bannerC1}44, ${bannerC2}33)` }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent" />
      </div>

      <div className="px-5 pb-5">
        {/* Avatar overlapping banner */}
        <div className="-mt-10 mb-4">
          <div className="inline-block p-1 rounded-full bg-card shadow-lg" style={{ border: "3px solid var(--color-card)" }}>
            {authenticated && address ? (
              <GradientAvatar address={address} initials={initials} size={72} />
            ) : (
              <div className="h-[72px] w-[72px] rounded-full bg-muted flex items-center justify-center text-2xl font-bold text-muted-foreground">
                ?
              </div>
            )}
          </div>
        </div>

        {/* Display name */}
        <h2 className="text-lg font-bold leading-tight truncate">
          {authenticated ? (email || displayName) : "Not connected"}
        </h2>

        {/* Wallet address row */}
        {address ? (
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-xs text-muted-foreground font-mono tracking-tight">
              {address.slice(0, 8)}…{address.slice(-6)}
            </span>
            <button
              onClick={copyAddress}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Copy address"
            >
              {copied
                ? <CheckCircle2 className="h-3 w-3 text-green-500" />
                : <Copy className="h-3 w-3" />}
            </button>
            <a
              href={`https://snowtrace.io/address/${address}`}
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="View on Snowtrace"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        ) : !authenticated ? (
          <p className="text-xs text-muted-foreground mt-1">Connect wallet to view profile</p>
        ) : null}
      </div>
    </Card>
  )
}

// Named export for the gradient utilities so the profile page can reuse the avatar
export { GradientAvatar, getAddressGradient }
