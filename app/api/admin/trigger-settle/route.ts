/**
 * Admin-only settle trigger — bypasses CRON_SECRET.
 * Called from the admin dashboard's "⚡ Auto-Settle" button.
 * Runs server-side so ADMIN_PRIVATE_KEY is never exposed to the client.
 */
import { NextResponse } from "next/server"
import { run } from "@/app/api/cron/settle-expired/route"

export async function GET() {
  try {
    const result = await run()
    return NextResponse.json(result)
  } catch (err) {
    console.error("[admin/trigger-settle]", err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
