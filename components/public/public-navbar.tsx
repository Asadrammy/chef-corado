"use client";

import Link from "next/link";
import { Menu, ChefHat } from "lucide-react";

import { authNavItems, publicNavItems } from "@/lib/public-site";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

function BrandMark() {
  return (
    <Link href="/" className="flex items-center gap-3" aria-label="Chef Marketplace home">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,hsl(var(--brand-primary)),hsl(var(--brand-secondary)))] text-white shadow-lg shadow-primary/20">
        <ChefHat className="h-5 w-5" />
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-semibold uppercase tracking-[0.22em] text-primary/80">Chef Marketplace</span>
        <span className="hidden text-sm text-muted-foreground sm:block">Private chefs for beautifully hosted gatherings</span>
      </div>
    </Link>
  );
}

function AuthActions({ mobile = false }: { mobile?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", mobile && "flex-col items-stretch gap-3") }>
      <Button variant="ghost" asChild className={cn("text-foreground/75", mobile && "justify-start") }>
        <Link href={authNavItems.customerLogin.href}>Sign In</Link>
      </Button>
      <Button asChild className={cn("brand-gradient-button border-0 shadow-lg shadow-primary/20", mobile && "justify-start") }>
        <Link href="/find-local-chef">Plan Your Event</Link>
      </Button>
    </div>
  );
}

export function PublicNavbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/90 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/72">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-xl focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-lg">
        Skip to main content
      </a>
      <div className="mx-auto flex min-h-[76px] w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <BrandMark />

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Primary">
          {publicNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-2 text-sm font-medium text-foreground/78 transition-colors hover:bg-muted hover:text-foreground xl:px-4"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Button variant="ghost" asChild className="text-foreground/65">
            <Link href="/become-a-chef">For Chefs</Link>
          </Button>
          <AuthActions />
        </div>

        <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 rounded-2xl border-border/70 bg-background/80 lg:hidden"
              aria-label="Open public navigation"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[88vw] max-w-sm border-l border-border/60 bg-background/95 px-0">
            <SheetHeader className="border-b border-border/60 px-6 pb-4">
              <SheetTitle className="text-left">
                <BrandMark />
              </SheetTitle>
              <SheetDescription className="text-left">
                Discover chefs, compare cuisines, and plan a private dining occasion with confidence.
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-6">
              <nav className="flex flex-col gap-2" aria-label="Mobile primary">
                {publicNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-2xl border border-transparent px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-border/60 hover:bg-muted/60"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="rounded-3xl border border-border/60 bg-muted/30 p-4">
                <p className="text-sm font-semibold text-foreground">Planning a dinner, celebration, or private event?</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Start with location, cuisine, and the atmosphere you want around the table.
                </p>
              </div>
              <AuthActions mobile />
              <div className="grid gap-2 border-t border-border/60 pt-4">
                <Link href="/become-a-chef" className="rounded-2xl px-4 py-3 text-sm font-medium text-foreground/80 hover:bg-muted/60">
                  Apply as a Chef
                </Link>
                <Link href={authNavItems.chefLogin.href} className="rounded-2xl px-4 py-3 text-sm font-medium text-foreground/70 hover:bg-muted/60">
                  Chef Sign In
                </Link>
              </div>
            </div>
          </SheetContent>
        </Sheet>
        </div>
      </div>
    </header>
  );
}
