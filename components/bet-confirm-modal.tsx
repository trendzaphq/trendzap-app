"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, Zap, AlertCircle, Loader2 } from "lucide-react"

interface BetConfirmModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  position: "over" | "under"
  amount: string
  marketTitle: string
  metric: string
  threshold: number
  overPct: number
  underPct: number
  expectedPayout: number
  onConfirm: () => Promise<void>
  loading?: boolean
  error?: string | null
}

export function BetConfirmModal({
  open,
  onOpenChange,
  position,
  amount,
  marketTitle,
  metric,
  threshold,
  overPct,
  underPct,
  expectedPayout,
  onConfirm,
  loading = false,
  error,
}: BetConfirmModalProps) {
  const amountNum = parseFloat(amount) || 0
  const isOver = position === "over"
  const odds = isOver ? overPct : underPct
  const impliedProb = odds / 100
  const profitIfWin = expectedPayout - amountNum

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Confirm Your Bet</DialogTitle>
        </DialogHeader>

        {/* Position pill */}
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-xl border ${
            isOver
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-destructive/10 border-destructive/30 text-destructive"
          }`}
        >
          {isOver ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
          <span className="font-bold text-lg">{isOver ? "OVER" : "UNDER"}</span>
          <span className="ml-auto font-mono font-bold">{odds}% odds</span>
        </div>

        {/* Market summary */}
        <div className="space-y-3 py-1">
          <p className="text-sm text-muted-foreground line-clamp-2">{marketTitle}</p>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Threshold</span>
              <span className="font-mono font-semibold">
                {threshold.toLocaleString()} {metric}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Your bet</span>
              <span className="font-mono font-semibold flex items-center gap-1">
                <Zap className="h-3.5 w-3.5 text-primary" />
                {amountNum.toFixed(4)} USDC
              </span>
            </div>
            <div className="h-px bg-border/60" />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Expected return if correct</span>
              <span className="font-mono font-bold text-green-400">
                +{profitIfWin.toFixed(4)} USDC
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total payout if correct</span>
              <span className="font-mono font-bold">
                {expectedPayout.toFixed(4)} USDC
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Implied probability</span>
              <span className="font-semibold">{(impliedProb * 100).toFixed(0)}%</span>
            </div>
          </div>

          {/* Risk note */}
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/40 text-xs text-muted-foreground">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>
              If the market resolves against your position, you lose your {amountNum.toFixed(4)} USDC bet.
              Fees: 3%.
            </span>
          </div>
        </div>

        {error && (
          <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
        )}

        <DialogFooter className="gap-2 flex-row">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            className={`flex-1 font-semibold ${
              isOver
                ? "bg-primary hover:bg-primary/90"
                : "bg-destructive hover:bg-destructive/90"
            }`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              `Bet ${isOver ? "Over" : "Under"}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
