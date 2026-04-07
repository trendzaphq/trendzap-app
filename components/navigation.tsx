"use client"

import React, { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { usePrivy, useWallets } from "@privy-io/react-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { WalletButton } from "@/components/wallet-button"
import {
  Search,
  Trophy,
  User,
  Settings,
  LogOut,
  BarChart3,
  ShieldCheck,
  Plus,
  Wallet,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { NotificationsBell } from "@/components/notifications-bell"
import { GradientAvatar } from "@/components/user-profile"

export function Navigation() {
  const router = useRouter()
  const { ready, authenticated, user, logout, login } = usePrivy()
  const { wallets } = useWallets()
  const [privyTimedOut, setPrivyTimedOut] = useState(false)

  useEffect(() => {
    if (ready) return
    const t = setTimeout(() => setPrivyTimedOut(true), 3000)
    return () => clearTimeout(t)
  }, [ready])

  const privyReady = ready || privyTimedOut
  const navAddress = wallets[0]?.address ?? ""
  const navInitials = (user?.email?.address?.charAt(0) || navAddress.charAt(2) || "U").toUpperCase()

  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<{
    market_id: number
    title: string | null
    thumbnail_url: string | null
    creator_address: string | null
  }[]>([])
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return }
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
        .then((r) => r.json())
        .then((d) => { if (d.ok) setSearchResults(d.results) })
        .catch(() => {})
    }, 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchResults([]); setSearchQuery("")
      }
    }
    document.addEventListener("mousedown", onOutside)
    return () => document.removeEventListener("mousedown", onOutside)
  }, [])

  return (
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-[oklch(0.11_0.02_264)]/95 backdrop-blur-xl supports-[backdrop-filter]:bg-[oklch(0.11_0.02_264)]/80">
        <div className="container mx-auto px-4 flex h-16 items-center gap-3">

          {/* Logo */}
          <Link href="/" className="flex items-center flex-shrink-0">
            <img src="/trendzap_logo.png" alt="TrendZap" width={130} height={36} className="h-8 w-auto" />
          </Link>

          {/* Search — desktop only */}
          <div className="flex-1 max-w-2xl hidden lg:block mx-4">
            <div className="relative group" ref={searchRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <Input
                placeholder="Search markets, creators, trends..."
                className="w-full pl-10 pr-16 h-10 bg-[oklch(0.14_0.02_264)] border-border/60 focus:border-primary/50 focus:bg-[oklch(0.16_0.02_264)] transition-all placeholder:text-muted-foreground/70"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border/60 bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                /
              </kbd>
              {searchResults.length > 0 && searchQuery.length >= 2 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border/60 rounded-lg shadow-2xl z-50 overflow-hidden">
                  {searchResults.map((r) => (
                    <button
                      key={r.market_id}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 text-left text-sm"
                      onClick={() => {
                        router.push(`/market/${r.market_id}`)
                        setSearchQuery(""); setSearchResults([])
                      }}
                    >
                      <span className="flex-1 truncate">{r.title || `Market #${r.market_id}`}</span>
                      <span className="text-xs text-muted-foreground">#{r.market_id}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Spacer on mobile to push right items to right edge */}
          <div className="flex-1 md:hidden" />

          {/* Right actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Leaderboard link — desktop only */}
            <Button size="sm" variant="ghost" className="hidden md:flex text-muted-foreground hover:text-primary gap-2" asChild>
              <Link href="/leaderboard">
                <Trophy className="h-4 w-4" />
                <span className="hidden lg:inline">Leaderboard</span>
              </Link>
            </Button>

            {authenticated && <NotificationsBell />}

            {/* Wallet button — desktop only */}
            <div className="hidden md:flex">
              <WalletButton />
            </div>

            {/* Mobile: Connect if unauthenticated */}
            {privyReady && !authenticated && (
              <Button
                size="sm"
                onClick={login}
                className="md:hidden h-8 px-3 text-xs bg-primary hover:bg-primary/90 font-semibold gap-1.5"
              >
                <Wallet className="h-3.5 w-3.5" />
                Connect
              </Button>
            )}

            {/* Avatar dropdown */}
            {privyReady && authenticated && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-9 w-9 rounded-full p-0 overflow-hidden border border-primary/20 hover:border-primary/40 transition-colors"
                  >
                    <GradientAvatar address={navAddress} initials={navInitials} size={36} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="flex flex-col gap-1">
                    <span className="font-medium">Your Account</span>
                    <span className="text-xs font-normal text-muted-foreground truncate">
                      {user?.email?.address || (navAddress ? navAddress.slice(0, 10) + "..." : "")}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/create" className="cursor-pointer gap-2 flex text-primary focus:text-primary font-semibold">
                      <Plus className="h-4 w-4" />Create Market
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer gap-2 flex">
                      <User className="h-4 w-4" />Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile?tab=bets" className="cursor-pointer gap-2 flex">
                      <BarChart3 className="h-4 w-4" />My Bets
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/leaderboard" className="cursor-pointer gap-2 flex">
                      <Trophy className="h-4 w-4" />Leaderboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="cursor-pointer gap-2 flex">
                      <Settings className="h-4 w-4" />Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="cursor-pointer gap-2 flex text-muted-foreground">
                      <ShieldCheck className="h-4 w-4" />Admin
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={logout}
                    className="text-destructive focus:text-destructive cursor-pointer gap-2 flex"
                  >
                    <LogOut className="h-4 w-4" />Disconnect
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>
  )
}
