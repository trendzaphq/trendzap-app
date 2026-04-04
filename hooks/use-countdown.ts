"use client"

import { useEffect, useState } from "react"

export function useCountdown(endTimeUnix: number): string {
  const [display, setDisplay] = useState("")

  useEffect(() => {
    const compute = () => {
      const now = Math.floor(Date.now() / 1000)
      const diff = endTimeUnix - now
      if (diff <= 0) return "Ended"
      const d = Math.floor(diff / 86400)
      const h = Math.floor((diff % 86400) / 3600)
      const m = Math.floor((diff % 3600) / 60)
      const s = diff % 60
      if (d > 0) return `${d}d ${h}h ${String(m).padStart(2, "0")}m`
      if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`
      if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`
      return `${s}s`
    }
    setDisplay(compute())
    const interval = setInterval(() => setDisplay(compute()), 1000)
    return () => clearInterval(interval)
  }, [endTimeUnix])

  return display
}
