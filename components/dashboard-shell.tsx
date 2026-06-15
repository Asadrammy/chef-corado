"use client"

import React from "react"
import Link from "next/link"
import { toast } from "sonner"

import { MarketplaceSidebar } from "@/components/marketplace-sidebar"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/site-header"
import { SidebarProvider, Sidebar } from "@/components/ui/sidebar"
import { COMMUNICATION_POLICY_EXTENDED } from "@/lib/request-options"

type DashboardShellProps = {
  children: React.ReactNode
  legalNotice?: {
    needsAttention: boolean
    chefComplianceNeedsAttention?: boolean
    termsVersion?: string | null
    complianceVersion?: string | null
  }
}

export function DashboardShell({ children, legalNotice }: DashboardShellProps) {
  const [acknowledging, setAcknowledging] = React.useState(false)

  const handleAcknowledgeLatestTerms = async () => {
    setAcknowledging(true)
    try {
      const response = await fetch("/api/account/legal-acceptance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acceptedTerms: true,
          acceptedVia: "modal",
        }),
      })
      if (!response.ok) {
        throw new Error("Failed to confirm the latest terms")
      }

      toast.success("Latest platform terms confirmed")
      window.location.reload()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "Failed to confirm the latest terms")
    } finally {
      setAcknowledging(false)
    }
  }

  return (
    <SidebarProvider>
      <div className="brand-surface relative flex h-screen w-full overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.4),transparent_35%,transparent_65%,rgba(255,255,255,0.25))] dark:bg-[linear-gradient(120deg,rgba(255,255,255,0.02),transparent_35%,transparent_65%,rgba(255,255,255,0.03))]" />
        <div className="relative flex h-screen w-full overflow-hidden">
          {/* Custom Flex Sidebar for Desktop */}
          <div className="fixed inset-y-0 left-0 z-30 hidden h-screen w-72 border-r border-white/40 bg-white/75 shadow-2xl shadow-slate-900/5 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/65 md:block">
            <MarketplaceSidebar />
          </div>

          {/* Mobile Sidebar (Overlay) */}
          <Sidebar className="border-r border-white/40 bg-white/85 shadow-2xl shadow-slate-900/10 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/80 md:hidden">
            <MarketplaceSidebar />
          </Sidebar>

          {/* Main Content Area */}
          <div className="h-screen flex-1 overflow-y-auto bg-transparent md:ml-72">
            <div className="min-h-full w-full px-4 py-5 md:px-7 md:py-7 xl:px-8 xl:py-8">
              <SiteHeader />
              <main className="mt-7 flex w-full flex-col gap-6 pb-8">
                {legalNotice?.needsAttention ? (
                  <div className="rounded-2xl border border-amber-300/70 bg-amber-50/90 px-4 py-4 text-sm text-amber-900 shadow-sm dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">Please review the latest platform terms</p>
                        <p>
                          Your account is using an older or missing terms acknowledgement.
                          {legalNotice.chefComplianceNeedsAttention ? " Chef compliance requirements are also part of your booking readiness and need your confirmation." : ""}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
                          <Link href="/terms/client" className="text-foreground hover:text-primary">Client Terms</Link>
                          <Link href="/terms/chef" className="text-foreground hover:text-primary">Chef Terms</Link>
                          <Link href="/privacy" className="text-foreground hover:text-primary">Privacy Policy</Link>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <Button type="button" onClick={() => void handleAcknowledgeLatestTerms()} disabled={acknowledging} className="rounded-xl">
                          {acknowledging ? "Confirming..." : "Confirm latest terms"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}
                {children}
                <footer className="rounded-2xl border border-border/60 bg-background/70 px-4 py-4 text-sm text-muted-foreground shadow-sm backdrop-blur">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <p className="max-w-3xl">{COMMUNICATION_POLICY_EXTENDED}</p>
                    <div className="flex flex-wrap items-center gap-3">
                      <Link href="/terms/client" className="font-medium text-foreground hover:text-primary">Client Terms</Link>
                      <Link href="/terms/chef" className="font-medium text-foreground hover:text-primary">Chef Terms</Link>
                      <Link href="/privacy" className="font-medium text-foreground hover:text-primary">Privacy Policy</Link>
                    </div>
                  </div>
                </footer>
              </main>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}
