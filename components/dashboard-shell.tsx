"use client"

import React from "react"
import { MarketplaceSidebar } from "@/components/marketplace-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarProvider, Sidebar } from "@/components/ui/sidebar"

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-muted/30">
        <div className="flex h-screen w-full overflow-hidden">
          {/* Custom Flex Sidebar for Desktop */}
          <div className="fixed inset-y-0 left-0 z-30 hidden h-screen w-64 border-r border-border/60 bg-background shadow-sm md:block">
            <MarketplaceSidebar />
          </div>

          {/* Mobile Sidebar (Overlay) */}
          <Sidebar className="border-r border-border/60 bg-background/95 shadow-sm shadow-black/5 backdrop-blur-xl md:hidden">
            <MarketplaceSidebar />
          </Sidebar>

          {/* Main Content Area */}
          <div className="h-screen flex-1 overflow-y-auto bg-transparent md:ml-64">
            <div className="min-h-full w-full px-4 py-6 md:px-6 md:py-6">
              <SiteHeader />
              <main className="mt-6 flex w-full flex-col">
                {children}
              </main>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}
