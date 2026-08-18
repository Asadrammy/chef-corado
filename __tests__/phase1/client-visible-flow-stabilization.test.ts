/// <reference types="jest" />

import { existsSync, readFileSync } from "fs"
import path from "path"

const readSource = (relativePath: string) => readFileSync(path.join(process.cwd(), relativePath), "utf8")

describe("Phase 1 client-visible flow stabilization contracts", () => {
  const discoverySource = readSource("components/public/local-chef-discovery-wizard.tsx")
  const requestWizardSource = readSource("components/request-wizard-form.tsx")
  const registerFormSource = readSource("components/auth/RegisterForm.tsx")
  const loginFormSource = readSource("components/auth/LoginForm.tsx")
  const registerRouteSource = readSource("app/api/auth/register/route.ts")
  const authSource = readSource("lib/auth.ts")
  const publicRoutesSource = readSource("lib/public-routes.ts")
  const multiDaySource = readSource("components/multi-day-chef-hire-form.tsx")

  it("shows Skip only when zero cuisines are selected and Next after one to three selected cuisines", () => {
    expect(discoverySource).toContain('const cuisineForwardLabel = step === 7 && selectedCuisines.length === 0 ? "Skip" : "Next"')
    expect(discoverySource).toContain("{cuisineForwardLabel}")
    expect(requestWizardSource).toContain("Food Preferences: cuisinePreferences optional; zero selections means Skip")
    expect(requestWizardSource).not.toContain("Select at least one cuisine preference")
  })

  it("prevents a fourth public cuisine selection without losing selected cuisine state", () => {
    expect(discoverySource).toContain("return current.length >= 3 ? current : [...current, cuisine]")
    expect(discoverySource).toContain("const disabled = !selected && selectedCuisines.length >= 3")
    expect(discoverySource).toContain("disabled={disabled}")
    expect(discoverySource).toContain("aria-pressed={selected}")
  })

  it("keeps the approved cuisine list canonical and accented labels intact", () => {
    const requestOptionsSource = readSource("lib/request-options.ts")

    expect(requestOptionsSource).toContain("Canap\\u00e9 Party")
    expect(requestOptionsSource).toContain("British")
    expect(requestOptionsSource).toContain("Pan Asian")
    expect(requestOptionsSource).toContain("Afternoon Tea")
    expect(requestOptionsSource).toContain("normalizeCuisineType")
    expect(requestOptionsSource).not.toContain("CanapÃ")
  })

  it("preserves selected cuisines in the public draft and authenticated request restoration", () => {
    expect(discoverySource).toContain("cuisinePreferences: selectedCuisines")
    expect(requestWizardSource).toContain("draft.cuisinePreferences.filter")
    expect(requestWizardSource).toContain("isKnownOption(CUISINE_TYPES, value)).slice(0, 3)")
  })

  it("routes special event types into dedicated workflows with an opaque session draft", () => {
    expect(requestWizardSource).toContain("storeDraftAndRouteToTailoredFlow")
    expect(requestWizardSource).toContain("/dashboard/client/multi-day-chef-hire?draft=")
    expect(requestWizardSource).toContain("/dashboard/client/full-time-chef?draft=")
    expect(requestWizardSource).toContain("window.sessionStorage.setItem(`chefachef:request-draft:${draftId}`")
    expect(requestWizardSource).toContain("if (selectedEventNeedsTailoredFlow && storeDraftAndRouteToTailoredFlow(formData.eventType))")
  })

  it("does not submit invalid non-canonical cuisine fallback values from Multi-Day", () => {
    expect(multiDaySource).toContain("cuisinePreferences: defaultCuisines.length ? defaultCuisines : firstDay.cuisinePreferences")
    expect(multiDaySource).not.toContain('cuisinePreferences: cuisines.length ? cuisines : ["Other"]')
    expect(multiDaySource).not.toContain('["Other"]')
    expect(multiDaySource).toContain("day.cuisinePreferences.length === 0")
  })

  it("creates unverified Client/Chef accounts and sends verification email through existing email infrastructure", () => {
    expect(registerRouteSource).toContain("verified: false")
    expect(registerRouteSource).toContain("sendVerificationEmail")
    expect(registerRouteSource).toContain("verificationRequired: true")
    expect(registerRouteSource).toContain('emailDelivery: emailResult.success ? "SENT" : "CONFIGURATION_REQUIRED"')
  })

  it("keeps registration pending instead of auto-redirecting to a generic login state", () => {
    expect(registerFormSource).toContain("pendingVerification")
    expect(registerFormSource).toContain("Account created successfully")
    expect(registerFormSource).toContain("Resend verification email")
    expect(registerFormSource).toContain("callbackUrl: safeCallbackUrl")
    expect(registerFormSource).not.toContain("Registration successful! Redirecting to login")
  })

  it("blocks newly unverified Client/Chef login and exposes resend without admin public signup", () => {
    expect(authSource).toContain("requiresEmailVerification")
    expect(authSource).toContain('throw new Error("EMAIL_NOT_VERIFIED")')
    expect(loginFormSource).toContain("verificationRequired")
    expect(loginFormSource).toContain("/api/auth/resend-verification")
    expect(loginFormSource).toContain('requestedRole === "CLIENT" || requestedRole === "CHEF"')
    expect(loginFormSource).not.toContain("/register?role=ADMIN")
  })

  it("has public verification routes and APIs", () => {
    expect(publicRoutesSource).toContain('"/verify-email"')
    expect(publicRoutesSource).toContain('"/verify-email/pending"')
    expect(existsSync(path.join(process.cwd(), "app/verify-email/page.tsx"))).toBe(true)
    expect(existsSync(path.join(process.cwd(), "app/verify-email/pending/page.tsx"))).toBe(true)
    expect(existsSync(path.join(process.cwd(), "app/api/auth/verify-email/route.ts"))).toBe(true)
    expect(existsSync(path.join(process.cwd(), "app/api/auth/resend-verification/route.ts"))).toBe(true)
  })
})
