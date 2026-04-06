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
        <SidebarMenu className="gap-1.5">
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                tooltip={item.title}
                isActive={item.isActive}
                asChild
                className={cn(
                  "group h-11 rounded-xl border border-transparent px-3 text-[0.95rem] shadow-none transition-all duration-200 relative",
                  item.isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-border shadow-sm shadow-black/5 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-0.5 before:h-5 before:bg-primary before:rounded-r-full"
                    : "text-muted-foreground hover:border-border/70 hover:bg-muted/70 hover:text-foreground hover:shadow-sm hover:shadow-black/5"
                )}
              >
                <Link href={item.url}>
                  <span
                    className={cn(
                      "flex size-8 items-center justify-center rounded-lg border border-transparent transition-all duration-200",
                      item.isActive
                        ? "bg-background/90 text-foreground shadow-sm border-border/40"
                        : "text-muted-foreground group-hover:bg-background/80 group-hover:text-foreground group-hover:border-border/30"
                    )}
                  >
                    {item.icon && <item.icon />}
                  </span>
                  <span className="truncate font-medium">{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
