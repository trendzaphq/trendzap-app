import { NextResponse } from "next/server"

/**
 * Middleware placeholder — admin access is controlled by wallet address check
 * in app/admin/page.tsx (only ADMIN_ADDRESS can see the dashboard).
 */
export function middleware() {
  return NextResponse.next()
}
