"use client"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import Link from "next/link"
import { useState, useRef, useEffect } from "react"
import { useSidebar } from "@/context/SidebarContext"
import ThemeToggleButton from "@/components/common/ThemeToggleButton"
import NotificationDropdown from "@/components/header/NotificationDropdown"
import UserDropdown from "@/components/header/UserDropdown"

export function SiteHeader() {
  const [isApplicationMenuOpen, setApplicationMenuOpen] = useState(false)
  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleToggle = () => {
    if (window.innerWidth >= 1024) {
      toggleSidebar()
    } else {
      toggleMobileSidebar()
    }
  }

  const toggleApplicationMenu = () => {
    setApplicationMenuOpen(!isApplicationMenuOpen)
  }

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
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto max-w-7xl px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Left side - Logo and Sidebar Trigger */}
          <div className="flex items-center gap-4">
            <SidebarTrigger 
              className="h-9 w-9 rounded-xl hover:bg-accent transition-all duration-200"
              aria-label="Toggle Sidebar"
            />
            
            <Link href="/dashboard" className="hidden lg:block">
              <span className="text-lg font-semibold text-foreground">
                Chef Marketplace
              </span>
            </Link>
            
            <Link href="/dashboard" className="lg:hidden">
              <span className="text-lg font-semibold text-foreground">
                Chef Marketplace
              </span>
            </Link>
          </div>

          {/* Center - Search (desktop only) */}
          <div className="hidden lg:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </span>
              <input
                ref={inputRef}
                type="text"
                placeholder="Search or type command..."
                className="w-full h-10 pl-10 pr-4 text-sm bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-2">
            {/* Mobile menu toggle */}
            <button
              onClick={toggleApplicationMenu}
              className="lg:hidden h-9 w-9 flex items-center justify-center rounded-xl hover:bg-accent transition-all duration-200"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M5.99902 10.4951C6.82745 10.4951 7.49902 11.1667 7.49902 11.9951V12.0051C7.49902 12.8335 6.82745 13.5051 5.99902 13.5051C5.1706 13.5051 4.49902 12.8335 4.49902 12.0051V11.9951C4.49902 11.1667 5.1706 10.4951 5.99902 10.4951ZM17.999 10.4951C18.8275 10.4951 19.499 11.1667 19.499 11.9951V12.0051C19.499 12.8335 18.8275 13.5051 17.999 13.5051C17.1706 13.5051 16.499 12.8335 16.499 12.0051V11.9951C16.499 11.1667 17.1706 10.4951 17.999 10.4951ZM13.499 11.9951C13.499 11.1667 12.8275 10.4951 11.999 10.4951C11.1706 10.4951 10.499 11.1667 10.499 11.9951V12.0051C10.499 12.8335 11.1706 13.5051 11.999 13.5051C12.8275 13.5051 13.499 12.8335 13.499 12.5051V11.9951Z"
                  fill="currentColor"
                />
              </svg>
            </button>

            {/* Theme toggle */}
            <ThemeToggleButton />
            
            {/* Notifications */}
            <NotificationDropdown />
            
            {/* User menu */}
            <UserDropdown />
          </div>
        </div>

        {/* Mobile menu */}
        {isApplicationMenuOpen && (
          <div className="lg:hidden py-4 border-t border-border">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search or type command..."
                className="w-full h-10 pl-10 pr-4 text-sm bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
