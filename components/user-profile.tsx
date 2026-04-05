"use client"

import { usePrivy, useWallets } from "@privy-io/react-auth"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Settings, Copy, ExternalLink, Plus, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

export function UserProfile() {
  const { user, authenticated } = usePrivy()
  const { wallets } = useWallets()
  const [copied, setCopied] = useState(false)

  const wallet = wallets[0]
  const address = wallet?.address
  const email = user?.email?.address
  const displayName = email
    ? email.split("@")[0]
    : address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : "Anonymous"
  const initials = displayName.slice(0, 2).toUpperCase()

  const copyAddress = () => {
    if (!address) return
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="overflow-hidden">
      {/* Banner gradient */}
      <div className="h-20 bg-gradient-to-br from-primary/30 via-secondary/20 to-accent/20 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
      </div>

      <div className="px-5 pb-5">
        {/* Avatar (overlapping banner) */}
        <div className="-mt-9 mb-3 flex items-end justify-between">
          <Avatar className="h-16 w-16 border-4 border-card bg-card shadow-lg">
            <AvatarFallback className="bg-gradient-to-br from-primary/30 to-secondary/30 text-foreground text-xl font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Name + address */}
        <div className="space-y-1 mb-4">
          <h2 className="text-base font-bold break-all leading-tight">{email || displayName}</h2>

          {address ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground font-mono">
                {address.slice(0, 8)}…{address.slice(-6)}
              </span>
              <button
                onClick={copyAddress}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Copy address"
              >
                {copied
                  ? <CheckCircle2 className="h-3 w-3 text-green-500" />
                  : <Copy className="h-3 w-3" />
                }
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
            <p className="text-xs text-muted-foreground">Connect wallet to view profile</p>
          ) : null}
        </div>

        {/* Actions */}
        <div className="space-y-2">
          {authenticated && (
            <Link href="/create" className="block">
              <Button className="w-full gap-2 bg-primary hover:bg-primary/90 font-semibold h-9 text-sm">
                <Plus className="h-4 w-4" />
                Create Market
              </Button>
            </Link>
          )}
          <Link href="/settings" className="block">
            <Button variant="outline" className="w-full gap-2 bg-transparent h-9 text-sm">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  )
}
