import { Navigation } from "@/components/navigation"
import Link from "next/link"
import { Eye, ChevronRight } from "lucide-react"

export const metadata = { title: "Privacy Policy — TrendZap" }

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />

      <main className="flex-1">
        {/* Header */}
        <section className="border-b border-border/40 bg-gradient-to-br from-secondary/5 to-primary/5">
          <div className="container mx-auto px-4 py-10">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
              <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
              <ChevronRight className="h-3 w-3" />
              <span>Privacy Policy</span>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-secondary/10 shrink-0 mt-1">
                <Eye className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight mb-1">Privacy Policy</h1>
                <p className="text-muted-foreground text-sm">Last updated: April 5, 2026</p>
              </div>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="container mx-auto px-4 py-10 max-w-3xl">
          <div className="space-y-8">

            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 text-sm text-muted-foreground">
              TrendZap is designed with privacy in mind. We collect the minimum data necessary to operate the platform. We do not sell your personal data.
            </div>

            <PrivSection title="1. What We Collect">
              <p>We collect the following categories of data:</p>
              <ul>
                <li><strong>Wallet address</strong> — required to associate bets, markets, and winnings to you. Your wallet address is public on-chain.</li>
                <li><strong>Email address</strong> (if you sign in with email via Privy) — used solely for authentication. We do not send marketing emails without opt-in.</li>
                <li><strong>Transaction data</strong> — bet amounts, market IDs, positions. This is recorded on the Avalanche blockchain (public ledger) and may be indexed in our database for display purposes.</li>
                <li><strong>Market metadata</strong> — the URL, title, thumbnail, and metric settings you submit when creating a market.</li>
                <li><strong>Usage data</strong> — standard server logs (IP address, browser user-agent, pages visited). Retained for up to 30 days.</li>
              </ul>
            </PrivSection>

            <PrivSection title="2. What We Do NOT Collect">
              <ul>
                <li>Government-issued ID or KYC documents (we are non-custodial).</li>
                <li>Private keys or seed phrases — ever.</li>
                <li>Precise geolocation.</li>
                <li>Biometric data.</li>
              </ul>
            </PrivSection>

            <PrivSection title="3. How We Use Your Data">
              <ul>
                <li><strong>Platform operation:</strong> Displaying your profile, bets, and market history.</li>
                <li><strong>Oracle resolution:</strong> Fetching social metrics to resolve markets you created or bet in.</li>
                <li><strong>Risk assessment:</strong> Market creation requests are evaluated by our risk service to detect potentially manipulative or invalid markets. No personal data is shared with the risk service — only the post URL, platform, and threshold.</li>
                <li><strong>Security and fraud prevention:</strong> Detecting and blocking abusive activity.</li>
                <li><strong>Analytics:</strong> Aggregated, anonymised usage statistics to improve the platform.</li>
              </ul>
            </PrivSection>

            <PrivSection title="4. Third Parties">
              <p>We share data with the following third parties to operate the platform:</p>
              <ul>
                <li><strong>Privy</strong> — authentication provider. Their privacy policy applies to data processed during login.</li>
                <li><strong>Neon (PostgreSQL)</strong> — database hosting. Market metadata and indexed on-chain events are stored here.</li>
                <li><strong>Cloudinary</strong> — image hosting for market thumbnails.</li>
                <li><strong>Railway</strong> — hosts our oracle and risk-assessment services. Only market URL and metadata are sent; no personal data.</li>
                <li><strong>Social platforms (X, YouTube, TikTok, Instagram)</strong> — queried for metric data at market resolution. Your data is not sent to these platforms.</li>
              </ul>
              <p>We do not sell data to advertisers or data brokers.</p>
            </PrivSection>

            <PrivSection title="5. Blockchain Data">
              <p>All on-chain transactions (bets, market creation, claims) are permanently recorded on the Avalanche public blockchain. This data is inherently public and cannot be deleted by TrendZap or by you. By placing a bet or creating a market, you accept that your wallet address and transaction details are publicly visible on the blockchain.</p>
            </PrivSection>

            <PrivSection title="6. Cookies & Storage">
              <p>We use local storage and session cookies for:</p>
              <ul>
                <li>Authentication state (Privy session token).</li>
                <li>UI preferences (theme, filter state).</li>
              </ul>
              <p>We do not use third-party advertising or tracking cookies.</p>
            </PrivSection>

            <PrivSection title="7. Data Retention">
              <ul>
                <li>Market metadata and indexed on-chain data: retained indefinitely (mirrors permanent blockchain state).</li>
                <li>Server logs: 30 days.</li>
                <li>Email data (via Privy): governed by Privy's retention policy. You may delete your Privy account to remove email association.</li>
              </ul>
            </PrivSection>

            <PrivSection title="8. Your Rights">
              <p>Depending on your jurisdiction, you may have the right to:</p>
              <ul>
                <li>Access the personal data we hold about you.</li>
                <li>Request correction of inaccurate data.</li>
                <li>Request deletion of off-chain data (note: on-chain data cannot be deleted).</li>
                <li>Opt out of analytics tracking.</li>
              </ul>
              <p>To exercise these rights, email <a href="mailto:privacy@trendzap.xyz" className="text-primary underline">privacy@trendzap.xyz</a>.</p>
            </PrivSection>

            <PrivSection title="9. Security">
              <p>We use industry-standard security practices: HTTPS for all transport, encrypted database connections, and access controls on backend services. However, no system is perfectly secure. In the event of a data breach we will notify affected users as required by applicable law.</p>
            </PrivSection>

            <PrivSection title="10. Changes to This Policy">
              <p>We may update this Privacy Policy periodically. We will update the "Last updated" date at the top. Continued use of the Platform after changes constitutes acceptance.</p>
            </PrivSection>

            <PrivSection title="11. Contact">
              <p>Privacy questions? Email <a href="mailto:privacy@trendzap.xyz" className="text-primary underline">privacy@trendzap.xyz</a>.</p>
            </PrivSection>

          </div>

          <div className="mt-12 pt-8 border-t border-border/40 flex gap-4 text-sm text-muted-foreground">
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
            <Link href="/" className="hover:text-foreground transition-colors">← Back to Markets</Link>
          </div>
        </section>
      </main>
    </div>
  )
}

function PrivSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed [&_strong]:text-foreground [&_a]:text-primary [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5">
        {children}
      </div>
    </div>
  )
}
