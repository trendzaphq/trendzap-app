/** All addresses stored lowercase for case-insensitive comparison */
export const ADMIN_ADDRESSES = [
  "0x05394029ea22767d2283bcd0be03b13353781212",
  "0x345001b9686a1de8a81202a9940ca885a781b69c",
  "0x4525e129b3990f78Fe7106696377128fdc8F4b91",
  "0xF7eCA0F5Fb5E7475C07B72927c25E97Bd513c951",
  "0xB56AdEa2CBE54d8C6b848b6b79C4a2BAed4Cab30",
  "0x2E7c73ccB422605E8C40994BAFD314Aa1D9b95c6",
  "0xE84209127ACce18c038f052C819F6731F8f151a1",
  "0xC591563b191cc8cC142e647fDB625ce7D13A7DF7",
  "0x279fDC4Ffe0f9D0098A94A1b678e59E7367C35D0",
  "0x9348c247c64e6cEbedB98B6e186676Ff9405505e",

]

export function isAdminAddress(address: string | undefined | null): boolean {
  if (!address) return false
  return ADMIN_ADDRESSES.includes(address.toLowerCase())
}
