/// <reference types="jest" />

import { readFileSync } from "fs"
import path from "path"

import {
  getDashboardPathForRole,
  getLoginPathForRole,
  getSafePostLoginRedirect,
} from "@/lib/role-routes"
import { Role } from "@/types"

const loginFormSource = readFileSync(path.join(process.cwd(), "components/auth/LoginForm.tsx"), "utf8")
const authNavigationSource = readFileSync(path.join(process.cwd(), "lib/auth-navigation.ts"), "utf8")
const navSecondarySource = readFileSync(path.join(process.cwd(), "components/nav-secondary.tsx"), "utf8")
const userDropdownSource = readFileSync(path.join(process.cwd(), "components/header/UserDropdown.tsx"), "utf8")
const navUserSource = readFileSync(path.join(process.cwd(), "components/nav-user.tsx"), "utf8")
const accountBannedSource = readFileSync(path.join(process.cwd(), "app/account-banned/page.tsx"), "utf8")
const proxySource = readFileSync(path.join(process.cwd(), "proxy.ts"), "utf8")

describe("role-aware auth navigation", () => {
  it("generates canonical login and dashboard paths for each role", () => {
    expect(getLoginPathForRole(Role.CLIENT)).toBe("/login?role=CLIENT")
    expect(getLoginPathForRole(Role.CHEF)).toBe("/login?role=CHEF")
    expect(getLoginPathForRole(Role.ADMIN)).toBe("/login?role=ADMIN")
    expect(getLoginPathForRole("UNKNOWN")).toBe("/login")

    expect(getDashboardPathForRole(Role.CLIENT)).toBe("/dashboard/client")
    expect(getDashboardPathForRole(Role.CHEF)).toBe("/dashboard/chef")
    expect(getDashboardPathForRole(Role.ADMIN)).toBe("/dashboard/admin")
    expect(getDashboardPathForRole("UNKNOWN")).toBe("/dashboard")
  })

  it("preserves role-compatible dashboard callback URLs and rejects cross-role dashboard callbacks", () => {
    expect(getSafePostLoginRedirect(Role.CLIENT, "/dashboard/client/requests")).toBe("/dashboard/client/requests")
    expect(getSafePostLoginRedirect(Role.CHEF, "/dashboard/chef/bookings")).toBe("/dashboard/chef/bookings")
    expect(getSafePostLoginRedirect(Role.ADMIN, "/dashboard/admin/users")).toBe("/dashboard/admin/users")

    expect(getSafePostLoginRedirect(Role.CLIENT, "/dashboard/admin")).toBe("/dashboard/client")
    expect(getSafePostLoginRedirect(Role.CHEF, "/dashboard/client/create-request")).toBe("/dashboard/chef")
    expect(getSafePostLoginRedirect(Role.ADMIN, "/dashboard/chef/requests")).toBe("/dashboard/admin")
  })

  it("keeps non-dashboard safe callback URLs and rejects unsafe external-style callback URLs", () => {
    expect(getSafePostLoginRedirect(Role.CLIENT, "/browse-chefs")).toBe("/browse-chefs")
    expect(getSafePostLoginRedirect(Role.CLIENT, "//evil.example/path")).toBe("/dashboard/client")
    expect(getSafePostLoginRedirect(Role.CHEF, "https://evil.example/path")).toBe("/dashboard/chef")
  })

  it("uses the shared role-aware sign-out helper for every dashboard logout surface", () => {
    expect(authNavigationSource).toContain("getLoginPathForRole(role)")
    expect(authNavigationSource).toContain("signOut({ callbackUrl:")
    expect(authNavigationSource).toContain("clearAuthCallbackCookies")

    expect(navSecondarySource).toContain("signOutForRole(session?.user?.role)")
    expect(userDropdownSource).toContain("signOutForRole(session?.user?.role)")
    expect(navUserSource).toContain("signOutForRole(session?.user?.role)")
    expect(navUserSource).toContain("<DropdownMenuItem onClick")
    expect(accountBannedSource).toContain("RoleAwareSignOutButton")
    expect(accountBannedSource).not.toContain("/api/auth/signout")

    expect(navSecondarySource).not.toContain("window.location.origin}/login")
    expect(userDropdownSource).not.toContain("window.location.origin}/login")
    expect(navUserSource).not.toContain("<DropdownMenuItem>\n              <IconLogout />")
  })

  it("keeps admin login role-aware without exposing admin signup", () => {
    expect(loginFormSource).toContain('heading: "Admin Login"')
    expect(loginFormSource).toContain("isAdminLogin")
    expect(loginFormSource).toContain("Admin access is provisioned by the platform owner.")
    expect(loginFormSource).not.toContain("/register?role=ADMIN")
  })

  it("keeps proxy cross-dashboard blocking in place", () => {
    expect(proxySource).toContain("pathname.startsWith('/dashboard/admin') && role !== 'ADMIN'")
    expect(proxySource).toContain("pathname.startsWith('/dashboard/chef') && role !== 'CHEF'")
    expect(proxySource).toContain("pathname.startsWith('/dashboard/client') && role !== 'CLIENT'")
  })
})
