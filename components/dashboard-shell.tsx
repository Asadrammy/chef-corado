"use client"

import React from "react"
import { MarketplaceSidebar } from "@/components/marketplace-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarProvider, Sidebar } from "@/components/ui/sidebar"

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="relative flex h-screen w-full overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.08),transparent_24%),linear-gradient(180deg,rgba(248,250,252,0.96),rgba(244,247,251,0.98))] dark:bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.16),transparent_26%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.10),transparent_22%),linear-gradient(180deg,rgba(2,6,23,0.98),rgba(8,15,30,1))]">
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
              <main className="mt-7 flex w-full flex-col">
                {children}
              </main>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}
