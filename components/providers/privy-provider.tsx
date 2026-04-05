"use client"

import { PrivyProvider } from "@privy-io/react-auth"
import type { ReactNode } from "react"

interface PrivyClientProviderProps {
  children: ReactNode
}

// Avalanche C-Chain mainnet (primary)
const avalancheMainnet = {
  id: 43114,
  name: "Avalanche",
  network: "avalanche",
  nativeCurrency: { name: "Avalanche", symbol: "AVAX", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_RPC_URL || "https://avax-mainnet.g.alchemy.com/v2/A4flIcxFitRYpoWndHzTe"] },
    public: { http: ["https://api.avax.network/ext/bc/C/rpc"] },
  },
  blockExplorers: {
    default: { name: "Snowtrace", url: "https://snowtrace.io" },
  },
}

// Avalanche Fuji testnet (kept for reference/testing)
const avalancheFuji = {
  id: 43113,
  name: "Avalanche Fuji",
  network: "avalanche-fuji",
  nativeCurrency: { name: "Avalanche", symbol: "AVAX", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://api.avax-test.network/ext/bc/C/rpc"] },
    public: { http: ["https://api.avax-test.network/ext/bc/C/rpc"] },
  },
  blockExplorers: {
    default: { name: "Snowtrace", url: "https://testnet.snowtrace.io" },
  },
}

export function PrivyClientProvider({ children }: PrivyClientProviderProps) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""

  // During Docker build NEXT_PUBLIC_* vars are absent — render children directly
  // rather than passing an invalid appId to Privy which throws at prerender time
  if (!appId) return <>{children}</>

  return (
    <PrivyProvider
      appId={appId}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#00E5BE",
          logo: "/trendzap-logo.svg",
          showWalletLoginFirst: false,
        },
        loginMethods: ["email", "wallet", "google", "twitter"],
        embeddedWallets: {
          createOnLogin: "users-without-wallets",
        },
        externalWallets: {
          coinbaseWallet: {
            connectionOptions: "smartWalletOnly",
          },
        },
        defaultChain: avalancheMainnet,
        supportedChains: [avalancheMainnet, avalancheFuji],
      }}
    >
      {children}
    </PrivyProvider>
  )
}
