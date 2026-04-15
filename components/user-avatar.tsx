"use client"

import { cn } from "@/lib/utils"

interface UserAvatarProps {
  address: string
  size?: number
  className?: string
}

const ANIMALS = [
  "dog",
  "fox",
  "cat",
  "rabbit",
  "bear",
  "panda",
  "owl",
  "deer",
  "raccoon",
  "penguin",
  "wolf",
  "hamster",
] as const

function getAnimalName(address: string): string {
  if (!address) return "bear"
  // Use last 8 hex chars → deterministic but spread across animals
  const hex = address.toLowerCase().replace(/^0x/, "").slice(-8)
  const num = parseInt(hex, 16)
  return ANIMALS[num % ANIMALS.length]
}

export function UserAvatar({ address, size = 36, className }: UserAvatarProps) {
  const animal = getAnimalName(address)
  return (
    <img
      src={`/avatars/${animal}.svg`}
      width={size}
      height={size}
      className={cn("rounded-full shrink-0", className)}
      alt={animal}
      draggable={false}
    />
  )
}

export { getAnimalName }
