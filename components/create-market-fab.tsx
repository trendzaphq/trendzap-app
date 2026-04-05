"use client"

import { usePrivy } from "@privy-io/react-auth"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"

export function CreateMarketFab() {
  const { authenticated } = usePrivy()

  if (!authenticated) return null

  return (
    <Button
      asChild
      className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-2xl bg-primary hover:bg-primary/90 text-primary-foreground border-0 p-0 group transition-all hover:scale-105 active:scale-95"
      aria-label="Create Market"
    >
      <Link href="/create">
        <Plus className="h-6 w-6 group-hover:rotate-90 transition-transform duration-200" />
        <span className="absolute inset-0 rounded-full bg-primary/30 blur-md -z-10 group-hover:bg-primary/50 transition-colors" />
      </Link>
    </Button>
  )
}
