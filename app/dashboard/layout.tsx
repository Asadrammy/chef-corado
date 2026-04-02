"use client"

import { DashboardShell } from "@/components/dashboard-shell"

// Prevent static generation
export const dynamic = 'force-dynamic'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>
}
