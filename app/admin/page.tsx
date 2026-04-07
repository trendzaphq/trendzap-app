import { notFound } from "next/navigation"

// Admin dashboard is only accessible at /admin/[token]
// See middleware.ts and app/admin/[token]/page.tsx
export default function AdminIndexPage() {
  notFound()
}
