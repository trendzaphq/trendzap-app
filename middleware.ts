import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

function unauthorizedResponse() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="TrendZap Admin", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  })
}

function isAuthorized(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Basic ")) return false

  const user = process.env.ADMIN_BASIC_AUTH_USER
  const pass = process.env.ADMIN_BASIC_AUTH_PASS
  if (!user || !pass) return false

  const token = authHeader.slice(6).trim()

  try {
    const decoded = atob(token)
    const sepIndex = decoded.indexOf(":")
    if (sepIndex < 0) return false

    const inputUser = decoded.slice(0, sepIndex)
    const inputPass = decoded.slice(sepIndex + 1)
    return inputUser === user && inputPass === pass
  } catch {
    return false
  }
}

/**
 * Backend enforcement for sensitive routes.
 * Protects admin UI and operational APIs independently of client-side wallet checks.
 */
export function middleware(req: NextRequest) {
  if (!isAuthorized(req)) {
    return unauthorizedResponse()
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/api/indexer/:path*"],
}
