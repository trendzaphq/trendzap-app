"use client"

import { Navigation } from "@/components/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Bell,
  Lock,
  Eye,
  Wallet,
  LogOut,
  Shield,
  ExternalLink,
  Copy,
  FileText,
  ChevronRight,
} from "lucide-react"
import { usePrivy, useWallets } from "@privy-io/react-auth"
import Link from "next/link"

export default function SettingsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Settings</h1>
            <p className="text-muted-foreground">Manage your account preferences and security</p>
          </div>

          {/* Settings Tabs */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Desktop Sidebar Navigation */}
            <div className="hidden lg:block">
              <div className="space-y-2 sticky top-24">
                <Button variant="ghost" className="w-full justify-start gap-3 h-10">
                  <Shield className="h-4 w-4" />
                  Account
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-3 h-10">
                  <Lock className="h-4 w-4" />
                  Security
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-3 h-10">
                  <Bell className="h-4 w-4" />
                  Notifications
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-3 h-10">
                  <Wallet className="h-4 w-4" />
                  Wallet
                </Button>
              </div>
            </div>

            {/* Settings Content */}
            <div className="lg:col-span-3">
              {/* Mobile: Tabs */}
              <Tabs defaultValue="account" className="lg:hidden">
                <TabsList className="grid w-full grid-cols-5 mb-6">
                  <TabsTrigger value="account">Account</TabsTrigger>
                  <TabsTrigger value="security">Security</TabsTrigger>
                  <TabsTrigger value="notifications">Alerts</TabsTrigger>
                  <TabsTrigger value="wallet">Wallet</TabsTrigger>
                  <TabsTrigger value="legal">Legal</TabsTrigger>
                </TabsList>

                <TabsContent value="account" className="space-y-6">
                  <AccountSettings />
                </TabsContent>
                <TabsContent value="security" className="space-y-6">
                  <SecuritySettings />
                </TabsContent>
                <TabsContent value="notifications" className="space-y-6">
                  <NotificationSettings />
                </TabsContent>
                <TabsContent value="wallet" className="space-y-6">
                  <WalletSettings />
                </TabsContent>
                <TabsContent value="legal" className="space-y-6">
                  <LegalSection />
                </TabsContent>
              </Tabs>

              {/* Desktop: Show all sections */}
              <div className="hidden lg:space-y-6 lg:block">
                <AccountSettings />
                <SecuritySettings />
                <NotificationSettings />
                <WalletSettings />
                <LegalSection />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function AccountSettings() {
  const { user } = usePrivy()
  const email = user?.email?.address || ""

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        Account Settings
      </h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Email</label>
          <Input defaultValue={email} readOnly className="bg-card" />
        </div>
        <p className="text-xs text-muted-foreground">Account details are managed through your Privy login.</p>
      </div>
    </Card>
  )
}

function SecuritySettings() {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <Lock className="h-5 w-5 text-primary" />
        Security
      </h2>
      <div className="space-y-4">
        <Button variant="outline" className="w-full justify-start h-12 gap-3 bg-transparent">
          <Shield className="h-4 w-4" />
          Enable Two-Factor Authentication
        </Button>
        <Button variant="outline" className="w-full justify-start h-12 gap-3 bg-transparent">
          <Eye className="h-4 w-4" />
          Change Password
        </Button>
        <div className="pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground mb-4">Active Sessions</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-card rounded-lg">
              <div>
                <p className="font-medium text-sm">Chrome on macOS</p>
                <p className="text-xs text-muted-foreground">Last active now</p>
              </div>
              <Badge>Current</Badge>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

function NotificationSettings() {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <Bell className="h-5 w-5 text-primary" />
        Notifications
      </h2>
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 hover:bg-card/50 rounded-lg transition-colors">
          <div>
            <p className="font-medium text-sm">Market Resolved</p>
            <p className="text-xs text-muted-foreground">Get notified when your markets resolve</p>
          </div>
          <input type="checkbox" defaultChecked className="w-5 h-5" />
        </div>
        <div className="flex items-center justify-between p-3 hover:bg-card/50 rounded-lg transition-colors">
          <div>
            <p className="font-medium text-sm">Liquidity Updates</p>
            <p className="text-xs text-muted-foreground">Notify on significant pool changes</p>
          </div>
          <input type="checkbox" defaultChecked className="w-5 h-5" />
        </div>
        <div className="flex items-center justify-between p-3 hover:bg-card/50 rounded-lg transition-colors">
          <div>
            <p className="font-medium text-sm">Trending Markets</p>
            <p className="text-xs text-muted-foreground">Daily digest of trending predictions</p>
          </div>
          <input type="checkbox" className="w-5 h-5" />
        </div>
      </div>
    </Card>
  )
}

function WalletSettings() {
  const { logout } = usePrivy()
  const { wallets } = useWallets()
  const address = wallets[0]?.address

  const copyAddress = () => {
    if (address) navigator.clipboard.writeText(address)
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <Wallet className="h-5 w-5 text-primary" />
        Wallet Management
      </h2>
      <div className="space-y-4">
        <div className="p-4 bg-card border border-border rounded-lg">
          <p className="text-sm font-medium mb-2">Connected Wallet</p>
          {address ? (
            <>
              <p className="font-mono text-sm break-all mb-4">{address}</p>
              <div className="flex gap-2">
                <Button size="sm" className="bg-primary hover:bg-primary/90 gap-2" asChild>
                  <a href={`https://snowtrace.io/address/${address}`} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3 w-3" />
                    View on Chain
                  </a>
                </Button>
                <Button size="sm" variant="outline" className="bg-transparent gap-2" onClick={copyAddress}>
                  <Copy className="h-3 w-3" />
                  Copy
                </Button>
                <Button size="sm" variant="outline" className="bg-transparent gap-2" onClick={logout}>
                  <LogOut className="h-4 w-4" />
                  Disconnect
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No wallet connected</p>
          )}
        </div>
      </div>
    </Card>
  )
}

function LegalSection() {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        Legal
      </h2>
      <div className="space-y-2">
        {[
          { label: "Terms of Service", href: "/terms", desc: "Rules for using TrendZap, market creation, and payouts" },
          { label: "Privacy Policy", href: "/privacy", desc: "How we collect, use, and protect your data" },
        ].map(({ label, href, desc }) => (
          <Link
            key={href}
            href={href}
            target="_blank"
            className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group"
          >
            <div>
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Link>
        ))}

        <div className="pt-4 mt-4 border-t border-border/40">
          <p className="text-xs text-muted-foreground">
            TrendZap v1.0 — Avalanche Mainnet — By using this platform you agree to the Terms of Service.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Questions? Contact us at{" "}
            <a href="mailto:support@trendzap.xyz" className="text-primary underline">support@trendzap.xyz</a>
          </p>
        </div>
      </div>
    </Card>
  )
}
