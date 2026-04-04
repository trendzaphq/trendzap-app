"use client"

import { usePrivy, useWallets } from "@privy-io/react-auth"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Zap, Settings, Copy, ExternalLink } from "lucide-react"
import Link from "next/link"

export function UserProfile() {
  const { user, authenticated } = usePrivy()
  const { wallets } = useWallets()

  const wallet = wallets[0]
  const address = wallet?.address
  const email = user?.email?.address
  const displayName = email ? email.split("@")[0] : address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Anonymous"
  const initials = displayName.slice(0, 2).toUpperCase()

  const copyAddress = () => {
    if (address) navigator.clipboard.writeText(address)
  }

  return (
    <Card className="p-6">
      <div className="text-center space-y-4">
        <div className="relative inline-block">
          <Avatar className="h-24 w-24 border-4 border-primary/20">
            <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold">{initials}</AvatarFallback>
          </Avatar>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-1 break-all">{email || displayName}</h2>
          {address && (
            <div className="flex items-center justify-center gap-2 mt-1">
              <p className="text-xs text-muted-foreground font-mono">
                {address.slice(0, 8)}…{address.slice(-6)}
              </p>
              <button onClick={copyAddress} className="text-muted-foreground hover:text-foreground transition-colors">
                <Copy className="h-3 w-3" />
              </button>
              <a
                href={`https://snowtrace.io/address/${address}`}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
          {!authenticated && (
            <p className="text-sm text-muted-foreground">Connect wallet to view profile</p>
          )}
        </div>

        <div className="pt-4 space-y-2">
          <Link href="/" className="block">
            <Button className="w-full gap-2">
              <Zap className="h-4 w-4" />
              Create Market
            </Button>
          </Link>
          <Link href="/settings" className="block">
            <Button variant="outline" className="w-full gap-2 bg-transparent">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  )
}
