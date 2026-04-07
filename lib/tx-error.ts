/**
 * Parses raw ethers/blockchain errors into user-friendly messages.
 * Use this before showing any error to the user.
 */
export function parseTxError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err)

  // User cancelled in wallet
  if (/user rejected|user denied|rejected the request|cancelled/i.test(raw)) {
    return "Transaction cancelled."
  }

  // Insufficient native funds
  if (/insufficient funds|not enough funds|balance too low/i.test(raw)) {
    return "Not enough AVAX in your wallet to cover this transaction + gas."
  }

  // Gas estimation failed — usually means the tx will revert
  if (/cannot estimate gas|gas required exceeds|execution reverted/i.test(raw)) {
    // Parse known custom contract errors
    if (/InsufficientFunds/i.test(raw)) return "Not enough AVAX in your wallet."
    if (/MarketNotActive/i.test(raw)) return "This market is no longer accepting bets."
    if (/MarketAlreadyResolved/i.test(raw)) return "Market has already been resolved."
    if (/AlreadyClaimed/i.test(raw)) return "You've already claimed your winnings for this market."
    if (/InvalidAmount|BelowMin/i.test(raw)) return "Bet amount is too low. Try a larger amount."
    if (/Unauthorized|NotAdmin|OnlyAdmin/i.test(raw)) return "You're not authorized to perform this action."
    if (/MarketExpired/i.test(raw)) return "This market has already ended."
    if (/cannot estimate gas/i.test(raw)) {
      return "Transaction would fail. Check your wallet balance and try again."
    }
    return "Transaction reverted by the contract. Please try again."
  }

  // Wrong network
  if (/network changed|chain changed|wrong network/i.test(raw)) {
    return "Wrong network detected. Please switch to Avalanche mainnet."
  }

  // Rate limits / RPC
  if (/rate limit|too many requests/i.test(raw)) {
    return "Too many requests. Please wait a moment and try again."
  }

  // Timeout
  if (/timeout|timed out/i.test(raw)) {
    return "Request timed out. Please check your wallet for the transaction status."
  }

  // Nonce conflict
  if (/nonce too low|replacement fee too low|nonce has already been used/i.test(raw)) {
    return "Transaction conflict detected. Please try again."
  }

  // Connection issues
  if (/could not connect|failed to fetch|network error|no provider/i.test(raw)) {
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
