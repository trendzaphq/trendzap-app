"use client"

import { useState, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { usePrivy, useWallets } from "@privy-io/react-auth"
import { Home, Search, Plus, Trophy, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { SearchModal } from "@/components/search-modal"
import { GradientAvatar } from "@/components/user-profile"

export function MobileBottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { authenticated, login, user } = usePrivy()
  const { wallets } = useWallets()
  const [searchOpen, setSearchOpen] = useState(false)

  const navAddress = wallets[0]?.address ?? ""
  const navInitials = (user?.email?.address?.charAt(0) || navAddress.charAt(2) || "U").toUpperCase()

  const isProfile = pathname.startsWith("/profile")
  const isLeaderboard = pathname === "/leaderboard"
  const isHome = pathname === "/"

  return (
    <>
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />

      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden safe-area-pb">
        {/* Frosted glass bar */}
        <div className="bg-[oklch(0.09_0.02_264)]/95 backdrop-blur-xl border-t border-border/30">
          <div className="flex items-center justify-around h-[60px] px-1">

            {/* Home */}
            <NavItem
              label="Home"
              active={isHome}
              onClick={() => router.push("/")}
            >
              <Home className="h-[22px] w-[22px]" />
            </NavItem>

            {/* Search */}
            <NavItem
              label="Search"
              active={false}
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-[22px] w-[22px]" />
            </NavItem>

            {/* Center Create button */}
            <div className="flex flex-col items-center justify-center">
              <button
                onClick={() => { if (authenticated) router.push("/create"); else login() }}
                className={cn(
                  "flex items-center justify-center -mt-5 w-[52px] h-[52px] rounded-full transition-all duration-200",
                  "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)]",
                  "hover:bg-primary/90 hover:scale-105 active:scale-95"
                )}
                aria-label="Create Market"
              >
                <Plus className="h-[22px] w-[22px] stroke-[2.5]" />
              </button>
              <span className="text-[9px] font-medium text-muted-foreground mt-0.5">Create</span>
            </div>

            {/* Leaderboard */}
            <NavItem
              label="Ranks"
              active={isLeaderboard}
              onClick={() => router.push("/leaderboard")}
            >
              <Trophy className="h-[22px] w-[22px]" />
            </NavItem>

            {/* Profile */}
            <NavItem
              label="Profile"
              active={isProfile}
              onClick={() => { if (authenticated) router.push("/profile"); else login() }}
            >
              {authenticated && navAddress ? (
                <div className={cn("rounded-full transition-all duration-200", isProfile ? "ring-2 ring-primary ring-offset-1 ring-offset-[oklch(0.09_0.02_264)]" : "")}>
                  <GradientAvatar address={navAddress} initials={navInitials} size={24} />
                </div>
              ) : (
                <User className="h-[22px] w-[22px]" />
              )}
            </NavItem>

          </div>
        </div>
      </nav>
    </>
  )
}

function NavItem({
  label,
  active,
  onClick,
  children,
}: {
  label: string
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center justify-center gap-[3px] min-w-[56px] py-1.5 px-2 rounded-xl transition-all duration-200",
        active
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
      <span className={cn("text-[9px] font-medium transition-colors", active ? "text-primary" : "")}>
        {label}
      </span>
      {/* Active dot indicator */}
      {active && (
        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
      )}
    </button>
  )
}
