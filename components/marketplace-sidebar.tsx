"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import { Role } from "@/types"
import { getVisibleAdminModuleGroups } from "@/lib/admin-permissions"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroupLabel,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { 
  IconChefHat, 
  IconFileText, 
  IconCalendar, 
  IconClock,
  IconUsers, 
  IconMessageCircle,
  IconHelp,
  IconCurrencyDollar, 
  IconSettings, 
  IconHome,
  IconMenu2,
  IconShieldLock,
  type Icon 
} from "@tabler/icons-react"

type NavItem = {
  title: string
  url: string
  icon: Icon
  isActive: boolean
}

type NavGroup = {
  label: string
  items: NavItem[]
}

const createNavItem = (
  title: string,
  url: string,
  icon: Icon,
  pathname: string,
  exact = false
): NavItem => ({
  title,
  url,
  icon,
  isActive: exact ? pathname === url : pathname === url || pathname.startsWith(`${url}/`),
})

const getClientNavGroups = (pathname: string): NavGroup[] => [
  {
    label: "Overview",
    items: [createNavItem("Dashboard", "/dashboard/client", IconHome, pathname, true)],
  },
  {
    label: "Planning",
    items: [
      createNavItem("Create Request", "/dashboard/client/create-request", IconFileText, pathname),
      createNavItem("My Requests", "/dashboard/client/requests", IconFileText, pathname),
    ],
  },
  {
    label: "Hiring",
    items: [
      createNavItem("Proposals", "/dashboard/client/proposals", IconUsers, pathname),
      createNavItem("Bookings", "/dashboard/client/bookings", IconCalendar, pathname),
      createNavItem("Receipts", "/dashboard/client/invoices", IconCurrencyDollar, pathname),
      createNavItem("Messages", "/dashboard/chat", IconMessageCircle, pathname),
      createNavItem("Support", "/dashboard/client/support", IconHelp, pathname),
      createNavItem("Notifications", "/dashboard/notifications", IconMessageCircle, pathname),
    ],
  },
  {
    label: "Account",
    items: [
      createNavItem("Profile", "/dashboard/settings", IconUsers, pathname, true),
      createNavItem("Settings", "/dashboard/settings/account", IconSettings, pathname),
    ],
  },
]

const getChefNavGroups = (pathname: string): NavGroup[] => [
  {
    label: "Overview",
    items: [createNavItem("Dashboard", "/dashboard/chef", IconHome, pathname, true)],
  },
  {
    label: "Operations",
    items: [
      createNavItem("Requests", "/dashboard/chef/requests", IconUsers, pathname),
      createNavItem("Bookings", "/dashboard/chef/bookings", IconCalendar, pathname),
      createNavItem("Availability", "/dashboard/chef/availability", IconClock, pathname),
      createNavItem("Messages", "/dashboard/chef/messages", IconMessageCircle, pathname),
      createNavItem("Menus", "/dashboard/chef/menus", IconFileText, pathname),
      createNavItem("Experiences", "/dashboard/chef/experiences", IconChefHat, pathname),
      createNavItem("Payouts", "/dashboard/chef/payouts", IconCurrencyDollar, pathname),
    ],
  },
  {
    label: "Account",
    items: [
      createNavItem("Profile", "/dashboard/chef/profile", IconChefHat, pathname),
      createNavItem("Settings", "/dashboard/chef/settings", IconSettings, pathname),
      createNavItem("Help Desk", "/dashboard/chef/help", IconHelp, pathname),
      createNavItem("Support Tickets", "/dashboard/chef/support", IconMessageCircle, pathname),
    ],
  },
]

const adminIconFor = (title: string): Icon => {
  if (title.includes("Chef")) return IconChefHat
  if (title.includes("Booking") || title === "Calendar") return IconCalendar
  if (title.includes("Finance") || title.includes("Payment") || title.includes("Payout") || title.includes("Invoice") || title.includes("Commission") || title.includes("Refund")) return IconCurrencyDollar
  if (title.includes("Staff") || title.includes("Audit") || title.includes("Compliance") || title.includes("Background")) return IconShieldLock
  if (title.includes("Support")) return IconMessageCircle
  if (title.includes("User")) return IconUsers
  if (title.includes("Request") || title.includes("Pricing") || title.includes("Asset")) return IconFileText
  if (title.includes("Settings")) return IconSettings
  return IconHome
}

const getAdminNavGroups = (pathname: string, adminRole?: string | null, adminPermissions?: string | null): NavGroup[] => {
  return getVisibleAdminModuleGroups(adminRole, adminPermissions).map((group) => ({
    label: group.label,
    items: group.modules.map((module) => createNavItem(module.title, module.url, adminIconFor(module.title), pathname, module.url === "/dashboard/admin")),
  }))
}

export function MarketplaceSidebar() {
  const { data: session } = useSession()
  const userRole = session?.user?.role
  const pathname = usePathname()

  const navGroups = (() => {
    switch (userRole) {
      case Role.CLIENT:
        return getClientNavGroups(pathname)
      case Role.CHEF:
        return getChefNavGroups(pathname)
      case Role.ADMIN:
        return getAdminNavGroups(pathname, session?.user?.adminRole, session?.user?.adminPermissions)
      default:
        return []
    }
  })()

  const navSecondary = [
    {
      title: "Logout",
      url: "/login",
      icon: IconMenu2,
      isActive: false,
      tone: "destructive" as const,
      action: "signOut" as const,
    },
  ]

  return (
    <SidebarContent className="flex h-full min-h-0 flex-col bg-transparent">
      <SidebarHeader className="border-b border-border/50 px-3 py-4">
        <div className="rounded-2xl border border-border/60 bg-muted/40 p-3 shadow-sm shadow-black/5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl border border-border/60 bg-background/90 shadow-sm">
              <IconChefHat className="size-5 text-foreground" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-foreground">ChefaChef</p>
              <p className="truncate text-xs text-muted-foreground">
                {userRole === Role.ADMIN ? "Admin Console" : userRole === Role.CHEF ? "Chef Workspace" : "Client Workspace"}
              </p>
            </div>
          </div>
        </div>
      </SidebarHeader>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <nav className="space-y-6">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-2">
              <SidebarGroupLabel className="px-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/80 select-none">
                {group.label}
              </SidebarGroupLabel>
              <NavMain items={group.items} />
            </div>
          ))}

          <SidebarSeparator className="mx-1" />

          <div className="space-y-2">
            <SidebarGroupLabel className="px-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/80 select-none">
              Account
            </SidebarGroupLabel>
            <NavSecondary items={navSecondary} />
          </div>
        </nav>
      </div>

      <SidebarFooter className="border-t border-border/50 px-3 py-4">
        <NavUser user={{
          name: session?.user?.name || "User",
          email: session?.user?.email || "user@example.com",
          avatar: session?.user?.image || "",
        }} />
      </SidebarFooter>
    </SidebarContent>
  )
}
