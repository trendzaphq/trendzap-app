// /_not-found is a special Next.js built-in that ignores the root layout's
// `dynamic` setting and gets statically prerendered by default.
// Declaring it here with force-dynamic prevents the prerender and the
// resulting "invalid Privy app ID" crash during Docker builds.
export const dynamic = "force-dynamic"

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">404</h2>
        <p className="text-muted-foreground">Page not found.</p>
        <div className="flex items-center justify-center gap-4">
          <a href="/" className="text-sm underline underline-offset-4 text-muted-foreground hover:text-foreground">
            Go home
          </a>
          <a href="/admin" className="text-sm underline underline-offset-4 text-primary hover:text-primary/80">
            Admin Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
