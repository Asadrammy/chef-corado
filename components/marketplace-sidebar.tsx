"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import { Role } from "@/types"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { 
  IconChefHat, 
  IconFileText, 
  IconCalendar, 
  IconUsers, 
  IconCurrencyDollar, 
  IconSettings, 
  IconHome,
  IconMenu2,
  type Icon 
} from "@tabler/icons-react"

const getClientNavItems = (pathname: string) => [
  {
    title: "Dashboard",
    url: "/dashboard/client",
    icon: IconHome,
    isActive: pathname === "/dashboard/client" || pathname === "/dashboard/client",
  },
  {
    title: "Create Request",
    url: "/dashboard/client/create-request",
    icon: IconFileText,
    isActive: pathname === "/dashboard/client/create-request",
  },
  {
    title: "My Requests",
    url: "/dashboard/client/requests",
    icon: IconFileText,
    isActive: pathname === "/dashboard/client/requests",
  },
  {
    title: "Proposals",
    url: "/dashboard/client/proposals",
    icon: IconUsers,
    isActive: pathname === "/dashboard/client/proposals",
  },
  {
    title: "Bookings",
    url: "/dashboard/client/bookings",
    icon: IconCalendar,
    isActive: pathname === "/dashboard/client/bookings",
  },
]

const getChefNavItems = (pathname: string) => [
  {
    title: "Dashboard",
    url: "/dashboard/chef",
    icon: IconHome,
    isActive: pathname === "/dashboard/chef" || pathname === "/dashboard/chef",
  },
  {
    title: "Profile",
    url: "/dashboard/chef/profile",
    icon: IconChefHat,
    isActive: pathname === "/dashboard/chef/profile",
  },
  {
    title: "Menus",
    url: "/dashboard/chef/menus",
    icon: IconFileText,
    isActive: pathname === "/dashboard/chef/menus",
  },
  {
    title: "Requests",
    url: "/dashboard/chef/requests",
    icon: IconUsers,
    isActive: pathname === "/dashboard/chef/requests",
  },
  {
    title: "Bookings",
    url: "/dashboard/chef/bookings",
    icon: IconCalendar,
    isActive: pathname === "/dashboard/chef/bookings",
  },
]

const getAdminNavItems = (pathname: string) => [
  {
    title: "Dashboard",
    url: "/dashboard/admin",
    icon: IconHome,
    isActive: pathname === "/dashboard/admin" || pathname === "/dashboard/admin",
  },
  {
    title: "Chefs",
    url: "/dashboard/admin/chefs",
    icon: IconChefHat,
    isActive: pathname === "/dashboard/admin/chefs",
  },
  {
    title: "Bookings",
    url: "/dashboard/admin/bookings",
    icon: IconCalendar,
    isActive: pathname === "/dashboard/admin/bookings",
  },
  {
    title: "Payments",
    url: "/dashboard/admin/payments",
    icon: IconCurrencyDollar,
    isActive: pathname === "/dashboard/admin/payments",
  },
]

export function MarketplaceSidebar() {
  const { data: session } = useSession()
  const userRole = session?.user?.role
  const pathname = usePathname()

  const getNavItems = () => {
    switch (userRole) {
      case Role.CLIENT:
        return getClientNavItems(pathname)
      case Role.CHEF:
        return getChefNavItems(pathname)
      case Role.ADMIN:
        return getAdminNavItems(pathname)
      default:
        return []
    }
  }

  const navSecondary = [
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: IconSettings,
      isActive: pathname === "/dashboard/settings",
    },
    {
      title: "Logout",
      url: "/api/auth/signout",
      icon: IconSettings,
      isActive: false,
    },
  ]

  return (
    <SidebarContent className="h-screen">
      <SidebarHeader className="border-b border-border/50 pb-4">
        <div className="flex items-center gap-3">
          <IconChefHat className="size-6 rounded-sm text-foreground" />
          <span className="text-base font-medium text-foreground">Chef Marketplace</span>
        </div>
      </SidebarHeader>
      
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-6">
          <div>
            <h2 className="mb-4 text-xs uppercase tracking-wider text-muted-foreground">
              Menu
            </h2>
            <NavMain items={getNavItems()} />
          </div>

          <div>
            <h2 className="mb-4 text-xs uppercase tracking-wider text-muted-foreground">
              Others
            </h2>
            <NavSecondary items={navSecondary} />
          </div>
        </nav>
      </div>
      
      <SidebarFooter className="border-t border-border/50 pt-4">
        <NavUser user={{
          name: session?.user?.name || "User",
          email: session?.user?.email || "user@example.com",
          avatar: "",
        }} />
      </SidebarFooter>
    </SidebarContent>
  )
}
