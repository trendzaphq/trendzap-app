/** All addresses stored lowercase for case-insensitive comparison */
export const ADMIN_ADDRESSES = [
  "0x05394029ea22767d2283bcd0be03b13353781212",
  "0x345001b9686a1de8a81202a9940ca885a781b69c",
]

export function isAdminAddress(address: string | undefined | null): boolean {
  if (!address) return false
  return ADMIN_ADDRESSES.includes(address.toLowerCase())
}
