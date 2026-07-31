/// <reference types="jest" />

import { existsSync, readFileSync } from "fs"
import path from "path"

const registerFormSource = readFileSync(path.join(process.cwd(), "components/auth/RegisterForm.tsx"), "utf8")
const registerRouteSource = readFileSync(path.join(process.cwd(), "app/api/auth/register/route.ts"), "utf8")
const forgotPasswordSource = readFileSync(path.join(process.cwd(), "app/forgot-password/page.tsx"), "utf8")
const publicSiteSource = readFileSync(path.join(process.cwd(), "lib/public-site.ts"), "utf8")
const proxySource = readFileSync(path.join(process.cwd(), "proxy.ts"), "utf8")
const discoverySource = readFileSync(path.join(process.cwd(), "components/public/local-chef-discovery-wizard.tsx"), "utf8")

describe("auth and navigation stabilization contracts", () => {
  it("locks role-specific customer and chef signup journeys in the UI", () => {
    expect(registerFormSource).toContain("const lockedRole")
    expect(registerFormSource).toContain("requestedRole === Role.CLIENT || requestedRole === Role.CHEF")
    expect(registerFormSource).toContain('aria-readonly="true"')
    expect(registerFormSource).toContain("if (lockedRole)")
    expect(registerFormSource).toContain("/api/auth/register?role=")
  })

  it("keeps generic signup role selection available", () => {
    expect(registerFormSource).toContain("<Select value={formData.role} onValueChange={handleRoleChange} disabled={loading}>")
    expect(registerFormSource).toContain('<SelectItem value={Role.CLIENT}>Client - Looking for chefs</SelectItem>')
    expect(registerFormSource).toContain('<SelectItem value={Role.CHEF}>Chef - Offering services</SelectItem>')
  })

  it("rejects manipulated locked-role signup payloads on the server", () => {
    expect(registerRouteSource).toContain('request.nextUrl.searchParams.get("role")')
    expect(registerRouteSource).toContain("validatedData.role !== lockedRole")
    expect(registerRouteSource).toContain("This signup link only supports")
    expect(registerRouteSource).toContain("{ status: 400 }")
  })

  it("keeps forgot password in the shared premium auth visual family", () => {
    expect(forgotPasswordSource).toContain("brand-auth-surface")
    expect(forgotPasswordSource).toContain("/images/login-bg.png")
    expect(forgotPasswordSource).toContain("Back to Homepage")
    expect(forgotPasswordSource).toContain("Back to Sign In")
    expect(forgotPasswordSource).toContain('/api/auth/reset-password')
  })

  it("serves a public generic terms landing page without removing role-specific terms", () => {
    expect(existsSync(path.join(process.cwd(), "app/(public)/terms/page.tsx"))).toBe(true)
    expect(publicSiteSource).toContain('"/terms"')
    expect(publicSiteSource).toContain('"/privacy"')
  })

  it("uses canonical auth routes and safe callback preservation", () => {
    expect(publicSiteSource).toContain('"/login?role=CLIENT"')
    expect(publicSiteSource).toContain('"/login?role=CHEF"')
    expect(publicSiteSource).toContain('"/login?role=ADMIN"')
    expect(publicSiteSource).toContain('"/register?role=CLIENT"')
    expect(publicSiteSource).toContain('"/register?role=CHEF"')
    expect(proxySource).toContain("loginUrl.searchParams.set('callbackUrl'")
    expect(proxySource).toContain("loginUrl.searchParams.set('role', 'CLIENT')")
    expect(proxySource).toContain("loginUrl.searchParams.set('role', 'CHEF')")
    expect(proxySource).toContain("loginUrl.searchParams.set('role', 'ADMIN')")
    expect(registerFormSource).toContain('callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//")')
    expect(registerFormSource).not.toContain("/auth/login")
  })

  it("preserves discovery data through customer auth callback URLs", () => {
    expect(discoverySource).toContain("createRequestPath")
    expect(discoverySource).toContain("/dashboard/client/create-request")
    expect(discoverySource).toContain("/login?role=CLIENT&callbackUrl=")
    expect(discoverySource).toContain("/register?role=CLIENT&callbackUrl=")
  })
})
