"use client"

import { cn } from "@/lib/utils"

interface UserAvatarProps {
  address: string
  size?: number
  className?: string
}

// Derives a stable avatar seed from the wallet address.
// Different wallets = different creatures. No API fetch required.
function getAvatarUrl(address: string): string {
  const seed = address ? address.replace(/^0x/i, "").slice(0, 12) : "anon"
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${seed}&radius=50&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`
}

export function UserAvatar({ address, size = 36, className }: UserAvatarProps) {
  return (
    <img
      src={getAvatarUrl(address)}
      width={size}
      height={size}
      className={cn("rounded-full shrink-0 bg-muted", className)}
      alt="Avatar"
    />
  )
}

export { getAvatarUrl }
