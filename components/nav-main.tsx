"use client"

import type { Icon } from "@tabler/icons-react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { cn } from "@/lib/utils"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: Icon
    isActive?: boolean
  }[]
}) {
  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton 
                tooltip={item.title} 
                asChild
                className={cn(
                  "menu-item group relative rounded-lg transition-all duration-150",
                  item.isActive 
                    ? "menu-item-active bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-medium" 
                    : "menu-item-inactive text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
                )}
              >
                <Link href={item.url}>
                  <span className={cn(
                    "menu-item-icon transition-transform duration-150",
                    item.isActive 
                      ? "menu-item-icon-active text-indigo-600 dark:text-indigo-400" 
                      : "menu-item-icon-inactive text-gray-600 dark:text-gray-300"
                  )}>
                    {item.icon && <item.icon />}
                  </span>
                  <span className="menu-item-text">{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
