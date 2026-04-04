"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { usePrivy } from "@privy-io/react-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { WalletButton } from "@/components/wallet-button"
import {
  Zap,
  Search,
  TrendingUp,
  Flame,
  Clock,
  Menu,
  X,
  Trophy,
  User,
  Settings,
  LogOut,
  BarChart3,
  Bell,
  ShieldCheck,
  Plus,
} from "lucide-react"
import { useState, useEffect, useRef } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CreateMarketDialog } from "@/components/create-market-dialog"

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [createMarketOpen, setCreateMarketOpen] = useState(false)
  const { ready, authenticated, user, logout } = usePrivy()
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<{ market_id: number; title: string | null; thumbnail_url: string | null; creator_address: string | null }[]>([])
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
        .then((r) => r.json())
        .then((d) => { if (d.ok) setSearchResults(d.results) })
        .catch(() => {})
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Close search results on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchResults([])
        setSearchQuery("")
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const navCategories = [
    { label: "TikTok", value: "tiktok" },
    { label: "YouTube", value: "youtube" },
    { label: "X", value: "x" },
    { label: "Instagram", value: "instagram" },
    { label: "Creators", value: "creators" },
    { label: "Viral", value: "viral" },
    { label: "Music", value: "music" },
  ]

  const setPlatform = (value: string) => {
    router.push(`/?platform=${value}`)
  }

  return (
    <>
      {/* Main Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-[oklch(0.11_0.02_264)]/95 backdrop-blur-xl supports-[backdrop-filter]:bg-[oklch(0.11_0.02_264)]/80">
        <div className="container mx-auto px-4 flex h-16 items-center justify-between gap-4">
          {/* Left: Logo */}
          <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
            {/* <div className="relative">
              <Zap className="h-7 w-7 text-primary fill-primary group-hover:scale-110 transition-transform" />
              <div className="absolute inset-0 bg-primary/20 blur-lg group-hover:bg-primary/40 transition-colors" />
            </div>
            <span className="text-xl font-bold tracking-tight hidden sm:inline-block bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              TrendZap
            </span> */}
            <img src="/trendzap_logo.png" alt="TrendZap Logo" width={150} height={150} />
          </Link>

          {/* Center: Search Bar - Hidden on mobile */}
          <div className="flex-1 max-w-2xl hidden lg:block mx-4">
            <div className="relative group" ref={searchRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <Input
                placeholder="Search markets, creators, trends..."
                className="w-full pl-10 pr-16 h-10 bg-[oklch(0.14_0.02_264)] border-border/60 focus:border-primary/50 focus:bg-[oklch(0.16_0.02_264)] transition-all placeholder:text-muted-foreground/70"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border/60 bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                /
              </kbd>
              {searchResults.length > 0 && searchQuery.length >= 2 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border/60 rounded-lg shadow-2xl z-50 overflow-hidden">
                  {searchResults.map((r) => (
                    <button
                      key={r.market_id}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 text-left text-sm"
                      onClick={() => { router.push(`/market/${r.market_id}`); setSearchQuery(""); setSearchResults([]) }}
                    >
                      <span className="flex-1 truncate">{r.title || `Market #${r.market_id}`}</span>
                      <span className="text-xs text-muted-foreground">#{r.market_id}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Leaderboard Link */}
            <Button
              size="sm"
              variant="ghost"
              className="hidden md:flex text-muted-foreground hover:text-primary gap-2"
              asChild
            >
              <Link href="/leaderboard">
                <Trophy className="h-4 w-4" />
                <span className="hidden lg:inline">Leaderboard</span>
              </Link>
            </Button>

            {authenticated && (
              <Button size="sm" variant="ghost" className="relative text-muted-foreground hover:text-primary">
                <Bell className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-accent text-[10px] font-bold flex items-center justify-center text-accent-foreground">
                  3
                </span>
              </Button>
            )}

            <WalletButton />

            {ready && authenticated && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-9 w-9 rounded-full p-0 bg-gradient-to-br from-primary/20 to-secondary/20 hover:from-primary/30 hover:to-secondary/30 border border-primary/30"
                  >
                    <div className="h-6 w-6 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xs font-bold text-primary-foreground">
                      {user?.email?.address?.charAt(0).toUpperCase() || "U"}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="flex flex-col gap-1">
                    <span className="font-medium">Your Account</span>
                    <span className="text-xs font-normal text-muted-foreground truncate">
                      {user?.email?.address || user?.wallet?.address?.slice(0, 10) + "..."}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setCreateMarketOpen(true)}
                    className="cursor-pointer gap-2 flex text-primary focus:text-primary font-semibold"
                  >
                    <Plus className="h-4 w-4" />
                    Create Market
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer gap-2 flex">
                      <User className="h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile?tab=bets" className="cursor-pointer gap-2 flex">
                      <BarChart3 className="h-4 w-4" />
                      My Bets
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/leaderboard" className="cursor-pointer gap-2 flex">
                      <Trophy className="h-4 w-4" />
                      Leaderboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="cursor-pointer gap-2 flex">
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="cursor-pointer gap-2 flex text-muted-foreground">
                      <ShieldCheck className="h-4 w-4" />
                      Admin
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={logout}
                    className="text-destructive focus:text-destructive cursor-pointer gap-2 flex"
                  >
                    <LogOut className="h-4 w-4" />
                    Disconnect
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Mobile Menu Toggle */}
            <Button size="sm" variant="ghost" className="hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Category Navigation - Scrollable */}
        <div className="border-t border-border/40 bg-[oklch(0.09_0.01_264)]/50 overflow-x-auto">
          <div className="container mx-auto px-4">
            <nav className="flex items-center gap-1 py-2 no-scrollbar">
              <Button
                variant={pathname === "/" ? "default" : "ghost"}
                size="sm"
                className="gap-2 flex-shrink-0 rounded-lg"
                asChild
              >
                <Link href="/">
                  <TrendingUp className="h-4 w-4" />
                  Trending
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 flex-shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <Flame className="h-4 w-4" />
                Breaking
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 flex-shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <Clock className="h-4 w-4" />
                New
              </Button>
              <div className="h-4 w-px bg-border/60 mx-1 flex-shrink-0" />
              {navCategories.map((cat) => (
                <Button
                  key={cat.value}
                  variant="ghost"
                  size="sm"
                  className="flex-shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
                  onClick={() => setPlatform(cat.value)}
                >
                  {cat.label}
                </Button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Create Market Dialog (controlled from dropdown) */}
      {authenticated && (
        <CreateMarketDialog open={createMarketOpen} onOpenChange={setCreateMarketOpen} />
      )}

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-16 z-40 bg-background/95 backdrop-blur-xl lg:hidden animate-slide-up">
          <div className="container mx-auto px-4 py-6 space-y-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search markets..." className="w-full pl-10 h-12 bg-card border-border/60" />
            </div>
            <div className="space-y-2">
              <Button size="lg" variant="ghost" className="w-full justify-start gap-2" asChild>
                <Link href="/" onClick={() => setMobileMenuOpen(false)}>
                  <TrendingUp className="h-5 w-5" />
                  Trending Markets
                </Link>
              </Button>
              <Button size="lg" variant="ghost" className="w-full justify-start gap-2" asChild>
                <Link href="/leaderboard" onClick={() => setMobileMenuOpen(false)}>
                  <Trophy className="h-5 w-5" />
                  Leaderboard
                </Link>
              </Button>
              {authenticated && (
                <>
                  <Button
                    size="lg"
                    className="w-full justify-start gap-2 bg-primary hover:bg-primary/90 font-semibold"
                    onClick={() => { setMobileMenuOpen(false); setCreateMarketOpen(true) }}
                  >
                    <Plus className="h-5 w-5" />
                    Create Market
                  </Button>
                  <Button size="lg" variant="ghost" className="w-full justify-start gap-2" asChild>
                    <Link href="/profile" onClick={() => setMobileMenuOpen(false)}>
                      <User className="h-5 w-5" />
                      Profile
                    </Link>
                  </Button>
                  <Button size="lg" variant="ghost" className="w-full justify-start gap-2" asChild>
                    <Link href="/settings" onClick={() => setMobileMenuOpen(false)}>
                      <Settings className="h-5 w-5" />
                      Settings
                    </Link>
                  </Button>
                </>
              )}
            </div>
            <div className="pt-4 space-y-2 border-t border-border/40">
              <div className="flex justify-center">
                <WalletButton />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
