"use client"

import * as React from "react"
import { type Icon } from "@tabler/icons-react"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavSecondary({
  items,
  ...props
}: {
  items: {
    title: string
    url: string
    icon: Icon
    isActive?: boolean
    tone?: "default" | "destructive"
    action?: "signOut"
  }[]
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu className="gap-1.5">
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              {item.action === "signOut" ? (
                <SidebarMenuButton
                  isActive={item.isActive}
                  className={cn(
                    "h-10 rounded-xl border border-transparent px-3 text-sm font-medium transition-all duration-200 relative",
                    item.tone === "destructive"
                      ? "text-destructive hover:border-destructive/25 hover:bg-destructive/10 hover:text-destructive hover:shadow-sm hover:shadow-black/5"
                      : item.isActive
                        ? "border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground shadow-sm shadow-black/5 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-0.5 before:h-5 before:bg-primary before:rounded-r-full"
                        : "text-muted-foreground hover:border-border/70 hover:bg-muted/70 hover:text-foreground hover:shadow-sm hover:shadow-black/5"
                  )}
                  onClick={() => signOut({ callbackUrl: "/login" })}
                >
                  <span
                    className={cn(
                      "flex size-8 items-center justify-center rounded-lg border border-transparent transition-all duration-200",
                      item.tone === "destructive"
                        ? "text-destructive/90 group-hover:text-destructive group-hover:bg-destructive/5 group-hover:border-destructive/20"
                        : item.isActive
                          ? "bg-background/90 text-foreground shadow-sm border-border/40"
                          : "text-muted-foreground group-hover:bg-background/80 group-hover:text-foreground group-hover:border-border/30"
                    )}
                  >
                    <item.icon />
                  </span>
                  <span className="truncate">{item.title}</span>
                </SidebarMenuButton>
              ) : (
                <SidebarMenuButton
                  asChild
                  isActive={item.isActive}
                  className={cn(
                    "h-10 rounded-xl border border-transparent px-3 text-sm font-medium transition-all duration-200 relative",
                    item.tone === "destructive"
                      ? "text-destructive hover:border-destructive/25 hover:bg-destructive/10 hover:text-destructive hover:shadow-sm hover:shadow-black/5"
                      : item.isActive
                        ? "border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground shadow-sm shadow-black/5 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-0.5 before:h-5 before:bg-primary before:rounded-r-full"
                        : "text-muted-foreground hover:border-border/70 hover:bg-muted/70 hover:text-foreground hover:shadow-sm hover:shadow-black/5"
                  )}
                >
                  <a href={item.url}>
                    <span
                      className={cn(
                        "flex size-8 items-center justify-center rounded-lg border border-transparent transition-all duration-200",
                        item.tone === "destructive"
                          ? "text-destructive/90 group-hover:text-destructive group-hover:bg-destructive/5 group-hover:border-destructive/20"
                          : item.isActive
                            ? "bg-background/90 text-foreground shadow-sm border-border/40"
                            : "text-muted-foreground group-hover:bg-background/80 group-hover:text-foreground group-hover:border-border/30"
                      )}
                    >
                      <item.icon />
                    </span>
                    <span className="truncate">{item.title}</span>
                  </a>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
