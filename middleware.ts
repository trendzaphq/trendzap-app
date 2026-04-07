import { NextRequest, NextResponse } from "next/server"

/**
 * Protects /admin/* routes with a secret token stored in ADMIN_SECRET env var.
 * The admin URL is: /admin/[ADMIN_SECRET]
 * Any other path under /admin → hard 404 (reveals nothing).
 */
export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname

  if (path === "/admin" || path.startsWith("/admin/")) {
    const secret = process.env.ADMIN_SECRET
    // If no secret configured, deny all access
    if (!secret) {
      return new NextResponse(null, { status: 404 })
    }
    // Only exact match allowed: /admin/[secret]
    if (path !== `/admin/${secret}`) {
      return new NextResponse(null, { status: 404 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
}
