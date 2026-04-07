import { Navigation } from "@/components/navigation"
import Link from "next/link"
import { Shield, ChevronRight } from "lucide-react"

export const metadata = { title: "Terms of Service — TrendZap" }

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />

      <main className="flex-1">
        {/* Header */}
        <section className="border-b border-border/40 bg-gradient-to-br from-primary/5 to-secondary/5">
          <div className="container mx-auto px-4 py-10">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
              <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
              <ChevronRight className="h-3 w-3" />
              <span>Terms of Service</span>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 shrink-0 mt-1">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight mb-1">Terms of Service</h1>
                <p className="text-muted-foreground text-sm">Last updated: April 5, 2026</p>
              </div>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="container mx-auto px-4 py-10 max-w-3xl">
          <div className="prose prose-invert prose-sm max-w-none space-y-8">

            <div className="p-4 rounded-xl border border-accent/30 bg-accent/5 text-sm text-accent">
              <strong>Important:</strong> TrendZap markets involve real USDC. By using this platform you acknowledge the financial risks and confirm you are of legal age in your jurisdiction.
            </div>

            <Section title="1. Acceptance of Terms">
              <p>By accessing or using TrendZap ("the Platform," "we," "us," or "our"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform.</p>
              <p>TrendZap is a decentralised prediction market platform deployed on the Avalanche Mainnet. All market activity is executed via smart contracts, and outcomes are determined by verifiable on-chain data.</p>
            </Section>

            <Section title="2. Eligibility">
              <ul>
                <li>You must be at least 18 years old (or the age of legal majority in your jurisdiction).</li>
                <li>You must not reside in a jurisdiction where prediction markets or cryptocurrency activity is prohibited.</li>
                <li>You are responsible for complying with all applicable local laws and regulations.</li>
              </ul>
            </Section>

            <Section title="3. How Markets Work">
              <p>Prediction markets on TrendZap operate as follows:</p>
              <ul>
                <li><strong>Market Creation:</strong> Any authenticated user may create a market by posting a social media URL, choosing a metric (views, likes, etc.), a threshold, and a resolution time. A minimum seed bet of 0.01 USDC is required.</li>
                <li><strong>Betting:</strong> Users place bets on whether a post will be <em>Over</em> or <em>Under</em> the threshold at resolution time. Odds adjust via the LMSR mechanism.</li>
                <li><strong>Resolution:</strong> At resolution time, our oracle reads the actual metric value from the social platform. If actual value ≥ threshold, OVER wins; otherwise UNDER wins.</li>
                <li><strong>Payouts:</strong> Winners claim USDC proportional to their shares. A 3% protocol fee is deducted from winnings.</li>
              </ul>
            </Section>

            <Section title="4. Financial Risk Disclosure">
              <p>Prediction markets carry significant financial risk. You may lose the entire amount you bet. Past performance of other markets does not guarantee future results. TrendZap does not provide financial advice.</p>
              <p>USDC is a stablecoin pegged to USD. While considered stable, you should be aware that stablecoins carry their own risks including regulatory and counterparty risk.</p>
            </Section>

            <Section title="5. Market Integrity">
              <p>You agree not to:</p>
              <ul>
                <li>Artificially inflate or deflate social media metrics on a post that is the subject of an active market.</li>
                <li>Create markets on content you own with the intent to manipulate the outcome.</li>
                <li>Use bots, scripts, or automated tools to place bets at scale in a way that harms other users.</li>
                <li>Collude with oracle operators or platform administrators.</li>
              </ul>
              <p>Any user found manipulating markets may have their account suspended and winnings forfeited at our discretion.</p>
            </Section>

            <Section title="6. Smart Contracts and Immutability">
              <p>TrendZap markets are governed by smart contracts deployed on Avalanche Mainnet. Smart contracts are immutable by design. TrendZap cannot reverse, cancel, or modify transactions once confirmed on-chain. Please double-check all details before confirming any transaction.</p>
            </Section>

            <Section title="7. Oracle Reliance">
              <p>Market resolution depends on the TrendZap oracle reading data from third-party social platforms. TrendZap is not liable for resolution delays or errors caused by:</p>
              <ul>
                <li>API downtime from X (Twitter), TikTok, YouTube, or Instagram.</li>
                <li>Changes to third-party platform policies that restrict data access.</li>
                <li>Discrepancies between displayed and API-reported metric values.</li>
              </ul>
              <p>In the event of an oracle failure, the Platform reserves the right to void a market and return bets proportionally.</p>
            </Section>

            <Section title="8. User Content">
              <p>By creating a market, you represent that you have the right to reference the linked content and that doing so does not violate the intellectual property rights of the content creator or platform.</p>
              <p>TrendZap does not claim ownership of content linked in markets. We may remove market listings that link to illegal, hateful, or harmful content.</p>
            </Section>

            <Section title="9. Taxes">
              <p>You are solely responsible for determining and fulfilling any tax obligations in your jurisdiction arising from your use of TrendZap. TrendZap does not withhold taxes on behalf of users.</p>
            </Section>

            <Section title="10. Limitation of Liability">
              <p>To the maximum extent permitted by law, TrendZap and its contributors shall not be liable for any indirect, incidental, consequential, or punitive damages arising from your use of the Platform, including but not limited to loss of funds due to smart contract bugs, oracle failures, or market manipulation by third parties.</p>
            </Section>

            <Section title="11. Changes to Terms">
              <p>We may update these Terms at any time. Continued use of the Platform after changes constitutes acceptance of the updated Terms. We will display the "Last updated" date at the top of this page.</p>
            </Section>

            <Section title="12. Contact">
              <p>Questions about these Terms? Reach out at <a href="mailto:legal@trendzap.xyz" className="text-primary underline">legal@trendzap.xyz</a>.</p>
            </Section>

          </div>

          <div className="mt-12 pt-8 border-t border-border/40 flex gap-4 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link href="/" className="hover:text-foreground transition-colors">← Back to Markets</Link>
          </div>
        </section>
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed [&_strong]:text-foreground [&_a]:text-primary [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5">
        {children}
      </div>
    </div>
  )
}
