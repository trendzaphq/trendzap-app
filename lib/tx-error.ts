/**
 * Parses raw ethers/blockchain errors into user-friendly messages.
 * Use this before showing any error to the user.
 */
export function parseTxError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err)

  // Also try to extract revert reason from ethers error info
  const errAny = err as Record<string, unknown> | undefined
  const reason =
    (errAny?.reason as string) ||
    (errAny?.data?.message as string) ||
    (errAny?.error?.message as string) ||
    (errAny?.info?.error?.message as string) ||
    ""

  const combined = `${raw} ${reason}`

  // User cancelled in wallet
  if (/user rejected|user denied|rejected the request|cancelled/i.test(combined)) {
    return "Transaction cancelled."
  }

  // Insufficient native funds
  if (/insufficient funds|not enough funds|balance too low/i.test(combined)) {
    return "Not enough AVAX in your wallet to cover this transaction + gas."
  }

  // Gas estimation failed — usually means the tx will revert
  if (/cannot estimate gas|gas required exceeds|execution reverted|CALL_EXCEPTION/i.test(combined)) {
    // Parse known custom contract errors
    if (/InsufficientFunds/i.test(combined)) return "Not enough AVAX in your wallet."
    if (/MarketNotActive/i.test(combined)) return "This market is no longer accepting bets."
    if (/MarketAlreadyResolved/i.test(combined)) return "Market has already been resolved."
    if (/AlreadyClaimed/i.test(combined)) return "You've already claimed your winnings for this market."
    if (/InvalidAmount|BelowMin/i.test(combined)) return "Bet amount is too low. Try a larger amount."
    if (/Unauthorized|NotAdmin|OnlyAdmin/i.test(combined)) return "You're not authorized to perform this action."
    if (/MarketExpired/i.test(combined)) return "This market has already ended."
    if (/InvalidStartTime|StartTimeTooEarly/i.test(combined)) return "Start time is invalid. The market may need a longer lead time."
    if (/InvalidEndTime|EndTimeInPast/i.test(combined)) return "End time is in the past. Choose a later deadline."
    if (/InvalidThreshold/i.test(combined)) return "Invalid threshold value."
    if (/Paused|WhenNotPaused/i.test(combined)) return "The contract is currently paused. Try again later."

    // Try to extract a reason string from the error
    const reasonMatch = combined.match(/reason="([^"]+)"/) ||
                        combined.match(/reverted with reason string '([^']+)'/) ||
                        combined.match(/revert ([A-Z][A-Za-z]+)/)
    if (reasonMatch?.[1]) {
      return `Contract error: ${reasonMatch[1]}`
    }

    if (/cannot estimate gas/i.test(combined)) {
      return "Transaction would fail on-chain. The contract rejected the parameters — double-check the URL, threshold, and seed amount."
    }
    return "Transaction reverted by the contract. Double-check URL, threshold, and seed amount, then try again."
  }

  // Wrong network
  if (/network changed|chain changed|wrong network/i.test(combined)) {
    return "Wrong network detected. Please switch to Avalanche mainnet."
  }

  // Rate limits / RPC
  if (/rate limit|too many requests/i.test(combined)) {
    return "Too many requests. Please wait a moment and try again."
  }

  // Timeout
  if (/timeout|timed out/i.test(combined)) {
    return "Request timed out. Please check your wallet for the transaction status."
  }

  // Nonce conflict
  if (/nonce too low|replacement fee too low|nonce has already been used/i.test(combined)) {
    return "Transaction conflict detected. Please try again."
  }

  // Connection issues
  if (/could not connect|failed to fetch|network error|no provider/i.test(combined)) {
    return "Network connection issue. Please check your internet and try again."
  }

  // Strip noisy ethers internals and truncate
  const clean = raw
    .replace(/\(action="[^"]*",\s*data=[^,)]*,?\s*/g, "")
    .replace(/\s*\(code=\w+,\s*/g, " (")
    .replace(/,?\s*version=ethers\/[\d.]+\)/g, "")
    .trim()

  return clean.length > 120 ? clean.slice(0, 117) + "…" : clean
}
