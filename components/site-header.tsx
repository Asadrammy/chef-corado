"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useMemo, useRef, useEffect } from "react"
import { Search, Command, Slash } from "lucide-react"

import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import ThemeToggleButton from "@/components/common/ThemeToggleButton"
import NotificationDropdown from "@/components/header/NotificationDropdown"
import UserDropdown from "@/components/header/UserDropdown"

export function SiteHeader() {
  const pathname = usePathname()
  const inputRef = useRef<HTMLInputElement>(null)

  const pathSegments = useMemo(() => {
    return pathname
      .split("/")
      .filter(Boolean)
      .map((segment, index, segments) => ({
        label: segment
          .replace(/-/g, " ")
          .replace(/\b\w/g, (char) => char.toUpperCase()),
        href: `/${segments.slice(0, index + 1).join("/")}`,
      }))
  }, [pathname])

  const currentPage = pathSegments[pathSegments.length - 1]?.label ?? "Dashboard"

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  return (
    <header className="sticky top-0 z-40">
      <div className="w-full items-center justify-between gap-4 rounded-2xl border border-border/60 bg-background/85 px-3 py-3 shadow-sm shadow-black/5 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 md:px-4 flex">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <SidebarTrigger
            className="size-10 rounded-xl border border-border/60 bg-background/80 text-muted-foreground shadow-sm transition-all duration-200 hover:bg-accent hover:text-foreground"
            aria-label="Toggle Sidebar"
          />

          <div className="min-w-0">
            <Breadcrumb className="hidden md:block">
              <BreadcrumbList>
                {pathSegments.slice(0, -1).map((item) => (
                  <BreadcrumbItem key={item.href}>
                    <BreadcrumbLink asChild>
                      <Link href={item.href}>{item.label}</Link>
                    </BreadcrumbLink>
                    <BreadcrumbSeparator />
                  </BreadcrumbItem>
                ))}
                <BreadcrumbItem>
                  <BreadcrumbPage>{currentPage}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <div className="flex items-center gap-2">
              <h1 className="truncate text-base font-semibold tracking-tight text-foreground md:text-lg">
                {currentPage}
              </h1>
              <span className="hidden rounded-full border border-border/60 bg-muted/60 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground lg:inline-flex">
                Workspace
              </span>
            </div>
          </div>

          <div className="hidden max-w-xl flex-1 lg:flex">
            <div className="group relative w-full">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-foreground" />
              <Input
                ref={inputRef}
                type="text"
                placeholder="Search or type command..."
                className="h-11 rounded-xl border-border/60 bg-muted/30 pr-24 pl-10 text-sm shadow-sm transition-all duration-200 placeholder:text-muted-foreground/80 focus-visible:bg-background focus-visible:border-border focus-visible:shadow-md focus-visible:shadow-black/5"
              />
              <div className="pointer-events-none absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-1 rounded-lg border border-border/60 bg-background/95 px-2 py-1 text-[11px] font-medium text-muted-foreground shadow-sm shadow-black/5">
                <Command className="size-3" />
                <Slash className="size-3" />
                <span>K</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="hidden h-10 rounded-xl border-border/60 bg-background/80 px-3 text-muted-foreground shadow-sm transition-all duration-200 hover:border-border hover:bg-muted/70 hover:text-foreground hover:shadow-md hover:-translate-y-0.5 md:inline-flex"
              onClick={() => inputRef.current?.focus()}
            >
              <Search className="size-4" />
              <span>Quick search</span>
            </Button>

            <ThemeToggleButton />
            <NotificationDropdown />
            <UserDropdown />
          </div>
        </div>
      </div>
    </header>
  )
}
