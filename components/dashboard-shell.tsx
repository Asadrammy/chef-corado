"use client"

import React from "react"
import { MarketplaceSidebar } from "@/components/marketplace-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarProvider, Sidebar, SidebarContent, SidebarInset } from "@/components/ui/sidebar"

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <SidebarProvider>
        <Sidebar className="w-64 border-r border-border glass-effect">
          <MarketplaceSidebar />
        </Sidebar>
        
        {/* Main Content */}
        <SidebarInset className="flex-1 flex flex-col">
          {/* Header */}
          <SiteHeader />
          
          {/* Page Content */}
          <main className="flex-1 max-w-7xl mx-auto px-6 py-6 space-y-6">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
