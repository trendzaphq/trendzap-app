// /_not-found is a special Next.js built-in that ignores the root layout's
// `dynamic` setting and gets statically prerendered by default.
// Declaring it here with force-dynamic prevents the prerender and the
// resulting "invalid Privy app ID" crash during Docker builds.
export const dynamic = "force-dynamic"

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">404</h2>
        <p className="text-muted-foreground">Page not found.</p>
        <a href="/" className="text-sm underline underline-offset-4">
          Go home
        </a>
      </div>
    </div>
  )
}
