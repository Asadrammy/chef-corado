"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChefHat, Menu, UserRound } from "lucide-react";

import { authNavItems, publicCtaItems, publicNavItems } from "@/lib/public-site";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

function BrandMark() {
  return (
    <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label="ChefaChef home">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,hsl(var(--brand-primary)),hsl(var(--brand-secondary)))] text-white shadow-lg shadow-primary/20">
        <ChefHat className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <span className="block whitespace-nowrap text-sm font-semibold uppercase tracking-[0.18em] text-primary/80 sm:text-[15px]">
          ChefaChef
        </span>
      </div>
    </Link>
  );
}

const customerAuthItems = [
  { label: "Log in", href: authNavItems.customerLogin.href },
  { label: "Sign up", href: authNavItems.customerSignup.href },
];

const chefAuthItems = [
  { label: "Chef log in", href: authNavItems.chefLogin.href },
  { label: "Apply as a chef", href: publicCtaItems.becomeChef.href },
];

const adminAuthItems = [
  { label: "Admin login", href: authNavItems.adminLogin.href },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function AccountDropdown() {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 text-sm font-medium text-foreground/80 shadow-sm transition-all hover:border-primary/30 hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          open && "border-primary/35 bg-muted/70 text-foreground shadow-md"
        )}
        aria-label="Open account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onPointerDown={(event) => {
          if (event.button !== 0 || event.ctrlKey) {
            return;
          }

          event.preventDefault();
          setOpen(true);
        }}
        onClick={(event) => {
          event.preventDefault();
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <UserRound className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="whitespace-nowrap">Sign in</span>
        <ChevronDown
          className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={10} className="w-72 rounded-2xl border-border/70 bg-background/95 p-2 shadow-xl shadow-black/10 backdrop-blur-xl">
        <DropdownMenuLabel className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Customers
        </DropdownMenuLabel>
        {customerAuthItems.map((item) => (
          <DropdownMenuItem key={item.href} asChild className="cursor-pointer rounded-xl px-3 py-2.5 text-sm">
            <Link href={item.href}>{item.label}</Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="my-2" />
        <DropdownMenuLabel className="px-3 pt-1 pb-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Chefs
        </DropdownMenuLabel>
        {chefAuthItems.map((item) => (
          <DropdownMenuItem key={item.href} asChild className="cursor-pointer rounded-xl px-3 py-2.5 text-sm">
            <Link href={item.href}>{item.label}</Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="my-2" />
        <DropdownMenuLabel className="px-3 pt-1 pb-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
          Admin
        </DropdownMenuLabel>
        {adminAuthItems.map((item) => (
          <DropdownMenuItem key={item.href} asChild className="cursor-pointer rounded-xl px-3 py-2 text-sm text-muted-foreground">
            <Link href={item.href}>{item.label}</Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileNavLink({ href, children, active = false }: { href: string; children: ReactNode; active?: boolean }) {
  return (
    <SheetClose asChild>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "rounded-2xl border border-transparent px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-border/60 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          active && "border-primary/20 bg-primary/10 text-primary"
        )}
      >
        {children}
      </Link>
    </SheetClose>
  );
}

function MobileAuthGroup({ title, items, quiet = false }: { title: string; items: typeof customerAuthItems; quiet?: boolean }) {
  return (
    <div className={cn("grid gap-2 rounded-3xl border border-border/60 bg-background/70 p-3", quiet && "bg-muted/20")}>
      <p className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
      {items.map((item) => (
        <SheetClose key={item.href} asChild>
          <Button variant="ghost" asChild className={cn("h-11 justify-start rounded-2xl", quiet ? "text-muted-foreground" : "text-foreground/80")}>
            <Link href={item.href}>{item.label}</Link>
          </Button>
        </SheetClose>
      ))}
    </div>
  );
}

export function PublicNavbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    let frameId = 0;

    const updateScrolledState = () => {
      frameId = 0;
      setIsScrolled(window.scrollY > 12);
    };

    const handleScroll = () => {
      if (frameId) {
        return;
      }

      frameId = window.requestAnimationFrame(updateScrolledState);
    };

    updateScrolledState();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  return (
    <header
      data-scrolled={isScrolled}
      className={cn(
        "sticky top-0 z-50 border-b backdrop-blur-xl transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 ease-out motion-reduce:transition-none",
        isScrolled
          ? "border-border/70 bg-background/[0.88] shadow-[0_18px_45px_rgba(15,23,42,0.10)] supports-[backdrop-filter]:bg-background/[0.82] supports-[backdrop-filter]:backdrop-blur-[18px]"
          : "border-border/35 bg-background/[0.96] shadow-none supports-[backdrop-filter]:bg-background/[0.94] supports-[backdrop-filter]:backdrop-blur-md"
      )}
    >
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-xl focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-lg">
        Skip to main content
      </a>
      <div className="mx-auto flex min-h-[76px] w-full max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <BrandMark />

        <nav className="hidden items-center gap-1 xl:flex" aria-label="Primary">
          {publicNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActivePath(pathname, item.href) ? "page" : undefined}
              className={cn(
                "rounded-full px-3 py-2 text-sm font-medium text-foreground/72 transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 2xl:px-4",
                isActivePath(pathname, item.href) && "bg-muted text-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 xl:flex">
          <AccountDropdown />
          <Button
            variant="outline"
            asChild
            className={cn(
              "h-11 rounded-full border-border/70 bg-background/80 px-4 text-sm font-semibold shadow-sm transition-all hover:border-primary/30 hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isActivePath(pathname, publicCtaItems.becomeChef.href) && "border-primary/30 bg-primary/10 text-primary"
            )}
          >
            <Link href={publicCtaItems.becomeChef.href} aria-current={isActivePath(pathname, publicCtaItems.becomeChef.href) ? "page" : undefined}>
              {publicCtaItems.becomeChef.label}
            </Link>
          </Button>
          <Button asChild className="brand-gradient-button h-11 border-0 px-5 text-sm font-semibold shadow-lg shadow-primary/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <Link href={publicCtaItems.findLocalChef.href} aria-current={isActivePath(pathname, publicCtaItems.findLocalChef.href) ? "page" : undefined}>
              {publicCtaItems.findLocalChef.label}
            </Link>
          </Button>
        </div>

        <div className="xl:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-background/80 text-foreground transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 xl:hidden"
              aria-label="Open public navigation"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
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
                <div className="grid gap-3">
                  <SheetClose asChild>
                    <Button asChild className="brand-gradient-button h-12 justify-start border-0 shadow-lg shadow-primary/20">
                      <Link href={publicCtaItems.findLocalChef.href}>{publicCtaItems.findLocalChef.label}</Link>
                    </Button>
                  </SheetClose>
                </div>
                <nav className="flex flex-col gap-2" aria-label="Mobile primary">
                  {publicNavItems.map((item) => (
                    <MobileNavLink key={item.href} href={item.href} active={isActivePath(pathname, item.href)}>
                      {item.label}
                    </MobileNavLink>
                  ))}
                </nav>
                <SheetClose asChild>
                  <Button variant="outline" asChild className="h-12 justify-start rounded-2xl border-border/70 bg-background/80">
                    <Link href={publicCtaItems.becomeChef.href}>{publicCtaItems.becomeChef.label}</Link>
                  </Button>
                </SheetClose>
                <div className="grid gap-3">
                  <MobileAuthGroup title="Customers" items={customerAuthItems} />
                  <MobileAuthGroup title="Chefs" items={chefAuthItems} />
                  <MobileAuthGroup title="Admin" items={adminAuthItems} quiet />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
