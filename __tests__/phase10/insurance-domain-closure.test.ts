import fs from "fs"
import path from "path"

const root = process.cwd()
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8")

describe("Implementation Pass 2 insurance and domain closure", () => {
  it("models internal platform insurance policies and one booking coverage association", () => {
    const schema = read("prisma/schema.prisma")

    expect(schema).toContain("model PlatformInsurancePolicy")
    expect(schema).toContain("model BookingInsuranceCoverage")
    expect(schema).toContain("policyVersion")
    expect(schema).toContain("coverageLimitMinor Int")
    expect(schema).toContain("serviceDateSnapshot Json?")
    expect(schema).toMatch(/bookingId\s+String\s+@unique/)
    expect(schema).toContain("insuranceCoverage")
    expect(schema).toContain("bookingInsuranceCoverages")
  })

  it("creates the insurance migration additively after the payment policy migration", () => {
    const migration = read("prisma/migrations/20260818090000_booking_insurance_coverage/migration.sql")

    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "PlatformInsurancePolicy"')
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "BookingInsuranceCoverage"')
    expect(migration).toContain('CREATE UNIQUE INDEX IF NOT EXISTS "BookingInsuranceCoverage_bookingId_key"')
    expect(migration).toContain('"serviceDateSnapshot" JSONB')
    expect(migration).not.toMatch(/\bDROP\s+TABLE\b/i)
    expect(migration).not.toMatch(/\bDELETE\s+FROM\b/i)
    expect(migration).not.toMatch(/\bTRUNCATE\b/i)
  })

  it("snapshots the confirmed GBP 5m platform coverage without inventing public policy metadata", () => {
    const service = read("lib/services/booking-insurance-service.ts")

    expect(service).toContain("PLATFORM_PUBLIC_LIABILITY_COVERAGE_LIMIT_MINOR = 500_000_000")
    expect(service).toContain('PLATFORM_PUBLIC_LIABILITY_CURRENCY = "GBP"')
    expect(service).toContain('PLATFORM_PUBLIC_LIABILITY_TYPE = "PUBLIC_LIABILITY"')
    expect(service).toContain("policyVersion: policy.policyVersion")
    expect(service).toContain("coverageLimitMinor: policy.coverageLimitMinor")
    expect(service).toContain("serviceDateSnapshot: buildServiceDateSnapshot(serviceDates)")
    expect(service).not.toMatch(/insurerName|policyNumber|certificateUrl/i)
  })

  it("qualifies only paid official platform bookings and refuses drafts or unpaid records", () => {
    const service = read("lib/services/booking-insurance-service.ts")

    expect(service).toContain('["CONFIRMED", "COMPLETED"].includes(booking.status)')
    expect(service).toContain("hasPlatformPaymentEvidence")
    expect(service).toContain("BOOKING_NOT_INSURANCE_QUALIFIED:NO_PLATFORM_PAYMENT")
    expect(service).toContain("payments: { select: { status: true } }")
    expect(service).toContain("paymentPlan: { select: { paidAmountMinor: true, status: true } }")
    expect(service).not.toContain("booking.status === \"PENDING\"")
  })

  it("uses one Multi-Day coverage row with service-date period and snapshot", () => {
    const service = read("lib/services/booking-insurance-service.ts")

    expect(service).toContain("serviceDates: { orderBy: [{ date: \"asc\" }, { sortOrder: \"asc\" }] }")
    expect(service).toContain("coverageStartAt: startOfServiceDay(serviceDates[0].date)")
    expect(service).toContain("coverageEndAt: endOfServiceDay(serviceDates[serviceDates.length - 1].date)")
    expect(service).toContain("const existing = await tx.bookingInsuranceCoverage.findUnique({ where: { bookingId } })")
  })

  it("wires coverage creation into official payment confirmation paths", () => {
    const proposalCheckout = read("lib/services/payment-guarantee.ts")
    const paymentPlans = read("lib/services/payment-plan-service.ts")
    const webhook = read("app/api/payments/webhook/atomic/route.ts")

    expect(proposalCheckout).toContain("bookingInsuranceService.ensureCoverageForBooking")
    expect(proposalCheckout).toContain("PROPOSAL_CHECKOUT_PAID_PLATFORM_BOOKING")
    expect(paymentPlans).toContain("bookingInsuranceService.ensureCoverageForBooking")
    expect(paymentPlans).toContain("PAYMENT_PLAN_PLATFORM_BOOKING_CREATED")
    expect(webhook).toContain("bookingInsuranceService.ensureCoverageForBooking")
    expect(webhook).toContain("INSTANT_BOOKING_STRIPE_WEBHOOK_PAID")
  })

  it("exposes booking coverage only on authorized admin booking detail", () => {
    const adminBooking = read("app/dashboard/admin/bookings/[id]/page.tsx")

    expect(adminBooking).toContain("insuranceCoverage")
    expect(adminBooking).toContain("Platform Liability Coverage")
    expect(adminBooking).toContain("Coverage limit")
    expect(adminBooking).toContain("Qualification basis")
  })

  it("does not leak internal insurance audit models through public API/page code", () => {
    const publicFiles = [
      "lib/public-chef-view.ts",
      "app/api/chefs/route.ts",
      "app/api/chefs/[chefId]/route.ts",
      "app/api/search/route.ts",
      "app/chefs/[chefId]/page.tsx",
      "components/public/public-chef-card.tsx",
    ].map(read).join("\n")

    expect(publicFiles).not.toContain("BookingInsuranceCoverage")
    expect(publicFiles).not.toContain("PlatformInsurancePolicy")
    expect(publicFiles).not.toContain("insuranceCoverage")
    expect(publicFiles).not.toContain("platformPolicy")
  })

  it("centralizes the official website domain while preserving the support email separately", () => {
    const siteConfig = read("lib/site-config.ts")
    const publicSite = read("lib/public-site.ts")
    const rules = read("lib/marketplace-rules.ts")
    const envExample = read(".env.example")
    const productionEnvExample = read(".env.production.example")
    const robots = read("public/robots.txt")

    expect(siteConfig).toContain('OFFICIAL_WEBSITE_URL = "https://chefachef.co.uk"')
    expect(publicSite).toContain("getConfiguredAppBaseUrl")
    expect(envExample).toContain('NEXTAUTH_URL="https://chefachef.co.uk"')
    expect(productionEnvExample).toContain("NEXTAUTH_URL=https://chefachef.co.uk")
    expect(robots).toContain("Sitemap: https://chefachef.co.uk/sitemap.xml")
    expect(rules).toContain('email: "info@chefachef.com"')
    expect(rules).not.toContain("info@chefachef.co.uk")
  })

  it("uses confirmed public insurance copy without exposing internal audit identifiers", () => {
    const copy = [
      read("app/(public)/faq/page.tsx"),
      read("app/(public)/terms/chef/page.tsx"),
      read("app/(public)/become-a-chef/page.tsx"),
      read("lib/request-options.ts"),
    ].join("\n")

    expect(copy).toContain("GBP 5 million")
    expect(copy).toContain("qualifying official ChefaChef bookings")
    expect(copy).toContain("off-platform")
    expect(copy).not.toContain("BookingInsuranceCoverage")
    expect(copy).not.toContain("PlatformInsurancePolicy")
    expect(copy).not.toMatch(/policy database|audit ID|coverage id/i)
  })

  it("documents the client-required professional chef profile photo standard", () => {
    const chefTerms = read("app/(public)/terms/chef/page.tsx")
    const chefProfile = read("app/dashboard/chef/profile/page.tsx")

    expect(chefTerms).toContain("Profile photos must show the chef's face clearly")
    expect(chefTerms).toContain("chef coat, apron, or chef cap")
    expect(chefProfile).toContain("clear face-visible photo")
    expect(chefProfile).toContain("chef coat, apron, or chef cap")
  })
})
