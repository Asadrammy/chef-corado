import { readFileSync } from "fs"
import path from "path"

import { calculateMarketplaceFinancials } from "@/lib/marketplace-rules"
import { isLegalDocumentActive } from "@/lib/services/legal-version-service"

const root = process.cwd()
const readSource = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8")

describe("Phase 3 completion contracts", () => {
  it("adds persisted market configuration without making pricing equal activation", () => {
    const schema = readSource("prisma/schema.prisma")
    const migration = readSource("prisma/migrations/20260812040000_market_activation_and_legal_versioning/migration.sql")
    const pricingMigration = readSource("prisma/migrations/20260810010000_client_country_pricing_rules/migration.sql")
    const correctiveMigration = readSource("prisma/migrations/20260818093000_market_pricing_evidence_note_alignment/migration.sql")

    expect(schema).toContain("model MarketConfiguration")
    expect(migration).toContain("'GB', 'United Kingdom', 'GBP', true, true, true, true, true")
    expect(migration).toContain("'US', 'United States', 'USD', true, false, false, false, false")
    expect(migration).toContain("'IT', 'Italy', 'EUR', true, false, false, false, false")
    expect(migration).toContain("'KE', 'Kenya', 'KES', true, false, false, false, false")
    expect(pricingMigration).toContain("Client confirmed US, Italy, and Kenya online booking pricing")
    expect(correctiveMigration).toContain("pricing row does not activate USA bookings or checkout.")
    expect(correctiveMigration).toContain("Forward-only data correction")
    expect(readSource("lib/service-engine.ts")).not.toContain("online bookings")
  })

  it("keeps market mutation Super Admin-only and audit logged", () => {
    const route = readSource("app/api/admin/markets/route.ts")
    const service = readSource("lib/services/market-configuration-service.ts")

    expect(route).toContain('actor.adminRole !== "SUPER_ADMIN"')
    expect(route).toContain('requireAdminPermission("platformSettings.manage")')
    expect(service).toContain("MARKET_PREREQUISITES_FAILED")
    expect(service).toContain("MARKET_CONFIGURATION_UPDATED")
    expect(service).toContain("tx.auditLog.create")
  })

  it("preserves UK 20 percent flat platform deduction with no extra chef VAT deduction", () => {
    const uk = calculateMarketplaceFinancials({ grossAmount: 1000, countryCode: "GB", currency: "GBP" })

    expect(uk.serviceChargeTaxRate).toBe(0.2)
    expect(uk.serviceChargeTaxAmount).toBe(40)
    expect(uk.serviceChargeTaxDeductionEnabled).toBe(false)
    expect(uk.totalPlatformDeduction).toBe(200)
    expect(uk.chefNetPayout).toBe(800)
  })

  it("keeps direct API request and checkout bypasses behind server-side gates", () => {
    expect(readSource("app/api/requests/route.ts")).toContain("marketConfigurationService.assertBookingMarketEnabled(body.country)")
    expect(readSource("app/api/requests/multi-day/route.ts")).toContain("MARKET_BOOKING_INACTIVE")
    expect(readSource("app/api/full-time-chef-enquiries/route.ts")).toContain("MARKET_BOOKING_INACTIVE")
    expect(readSource("app/api/proposals/route.ts")).toContain("MARKET_BOOKING_INACTIVE")
    expect(readSource("app/api/payments/checkout/route.ts")).toContain("MARKET_PAYMENTS_INACTIVE")
    expect(readSource("app/api/payments/validate/[proposalId]/route.ts")).toContain("MARKET_PAYMENTS_INACTIVE")
    expect(readSource("app/api/bookings/instant/payment/route.ts")).toContain("marketConfigurationService.assertPaymentMarketEnabled(countryCode)")
    expect(readSource("app/api/bookings/instant/payment-atomic/route.ts")).toContain("marketConfigurationService.assertPaymentMarketEnabled(countryCode)")
  })

  it("keeps pending legal documents out of current active status", () => {
    expect(isLegalDocumentActive({ status: "PENDING_APPROVAL" })).toBe(false)
    expect(isLegalDocumentActive({ status: "DRAFT" })).toBe(false)
    expect(isLegalDocumentActive({ status: "RETIRED" })).toBe(false)
    expect(isLegalDocumentActive({ status: "ACTIVE", effectiveTo: new Date("2020-01-01") })).toBe(false)
  })

  it("adds policy-neutral refund snapshot fields", () => {
    const schema = readSource("prisma/schema.prisma")
    const refundService = readSource("lib/services/refund-service.ts")

    expect(schema).toContain("originalGrossAmount")
    expect(schema).toContain("originalServiceChargeTaxAmount")
    expect(schema).toContain("originalTotalPlatformDeduction")
    expect(refundService).toContain("originalPaymentSnapshot")
  })
})
