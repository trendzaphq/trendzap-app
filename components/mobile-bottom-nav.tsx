"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { usePrivy } from "@privy-io/react-auth"
import { Home, Trophy, Plus, BarChart3, User } from "lucide-react"
import { cn } from "@/lib/utils"

export function MobileBottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { authenticated } = usePrivy()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[oklch(0.10_0.02_264)]/95 backdrop-blur-xl border-t border-border/40 safe-area-pb">
      <div className="flex items-center justify-around h-16 px-2">
        {/* Home */}
        <Link href="/" className={cn("flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors", pathname === "/" ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
          <Home className="h-5 w-5" />
          <span className="text-[10px] font-medium">Home</span>
        </Link>
        {/* Leaderboard */}
        <Link href="/leaderboard" className={cn("flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors", pathname === "/leaderboard" ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
          <Trophy className="h-5 w-5" />
          <span className="text-[10px] font-medium">Ranks</span>
        </Link>
        {/* Center Create Button */}
        <button
          onClick={() => authenticated && router.push("/create")}
          className={cn(
            "flex flex-col items-center justify-center -mt-6 w-14 h-14 rounded-full shadow-lg transition-all",
            authenticated
              ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-95"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
          aria-label="Create Market"
        >
          <Plus className="h-6 w-6" />
        </button>
        {/* Bets */}
        <Link href="/profile?tab=bets" className={cn("flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors", pathname?.includes("tab=bets") ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
          <BarChart3 className="h-5 w-5" />
          <span className="text-[10px] font-medium">Bets</span>
        </Link>
        {/* Profile */}
        <Link href="/profile" className={cn("flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors", pathname === "/profile" ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
          <User className="h-5 w-5" />
          <span className="text-[10px] font-medium">Profile</span>
        </Link>
      </div>
    </nav>
  )
}
