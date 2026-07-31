/// <reference types="jest" />

import { readFileSync } from "fs"
import path from "path"

import { authNavItems, publicCtaItems, publicNavItems } from "@/lib/public-site"

const navbarSource = readFileSync(path.join(process.cwd(), "components/public/public-navbar.tsx"), "utf8")
const shellSource = readFileSync(path.join(process.cwd(), "components/public/public-shell.tsx"), "utf8")

describe("PublicNavbar hierarchy contract", () => {
  it("keeps primary navigation focused on the five discovery links", () => {
    expect(publicNavItems).toEqual([
      { label: "Browse Chefs", href: "/browse-chefs" },
      { label: "Experiences", href: "/experiences" },
      { label: "Reviews", href: "/reviews" },
      { label: "Gift Cards", href: "/gift-cards" },
      { label: "Pricing", href: "/pricing" },
    ])
  })

  it("centralizes customer and chef auth destinations with role query parameters", () => {
    expect(authNavItems.customerLogin.href).toBe("/login?role=CLIENT")
    expect(authNavItems.customerSignup.href).toBe("/register?role=CLIENT")
    expect(authNavItems.chefLogin.href).toBe("/login?role=CHEF")
    expect(authNavItems.chefSignup.href).toBe("/register?role=CHEF")
    expect(authNavItems.adminLogin.href).toBe("/login?role=ADMIN")
  })

  it("uses one primary CTA and one secondary CTA", () => {
    expect(publicCtaItems.findLocalChef).toEqual({ label: "Find Local Chef", href: "/find-local-chef" })
    expect(publicCtaItems.becomeChef).toEqual({ label: "Become a Chef", href: "/become-a-chef" })
    expect(navbarSource).not.toContain("Plan Your Event")
  })

  it("uses the shared dropdown primitive for public account authentication", () => {
    expect(navbarSource).toContain("DropdownMenu")
    expect(navbarSource).toContain('aria-label="Open account menu"')
    expect(navbarSource).toContain('aria-haspopup="menu"')
    expect(navbarSource).toContain("aria-expanded={open}")
    expect(navbarSource).toContain(">Sign in<")
    expect(navbarSource).toContain("Customers")
    expect(navbarSource).toContain("Chefs")
  })

  it("keeps admin login configured but out of the public navbar", () => {
    expect(authNavItems.adminLogin.href).toBe("/login?role=ADMIN")
    expect(navbarSource).not.toContain("authNavItems.adminLogin")
    expect(navbarSource).not.toContain("Admin Login")
  })

  it("keeps mobile auth grouped and closes the sheet on route selection", () => {
    expect(navbarSource).toContain("MobileAuthGroup")
    expect(navbarSource).toContain('title="Customers"')
    expect(navbarSource).toContain('title="Chefs"')
    expect(navbarSource).toContain("SheetClose")
  })

  it("supports active route state for primary navigation", () => {
    expect(navbarSource).toContain("usePathname")
    expect(navbarSource).toContain("aria-current")
    expect(navbarSource).toContain("isActivePath")
  })

  it("keeps the shared public header sticky with a lightweight scrolled glass state", () => {
    expect(navbarSource).toContain("sticky top-0")
    expect(navbarSource).toContain("data-scrolled={isScrolled}")
    expect(navbarSource).toContain("useState(false)")
    expect(navbarSource).not.toContain('useState(() => (typeof window === "undefined" ? false : window.scrollY > 12))')
    expect(navbarSource).toContain("window.scrollY > 12")
    expect(navbarSource).toContain('window.addEventListener("scroll", handleScroll, { passive: true })')
    expect(navbarSource).toContain("window.requestAnimationFrame(updateScrolledState)")
    expect(navbarSource).toContain("supports-[backdrop-filter]:backdrop-blur-[18px]")
    expect(navbarSource).toContain("motion-reduce:transition-none")
  })

  it("keeps the public shell compatible with sticky positioning and skip-link offsets", () => {
    expect(shellSource).toContain("overflow-x-clip")
    expect(shellSource).toContain("scroll-mt-24")
    expect(shellSource).not.toContain("overflow-x-hidden")
  })
})
