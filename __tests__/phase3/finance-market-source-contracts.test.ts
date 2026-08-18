import { readFileSync } from "fs"
import path from "path"

const root = process.cwd()
const readSource = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8")

describe("Phase 3 finance and market source contracts", () => {
  it("gates request, proposal, and checkout paths by market activation", () => {
    expect(readSource("lib/services/request-service.ts")).toContain("marketConfigurationService.assertBookingMarketEnabled(input.country)")
    expect(readSource("lib/services/proposal-service.ts")).toContain("marketConfigurationService.assertBookingMarketEnabled(targetRequest.countryCode)")
    expect(readSource("lib/services/payment-guarantee.ts")).toContain("marketConfigurationService.assertPaymentMarketEnabled(proposal.request.countryCode)")
    expect(readSource("app/api/payments/checkout/route.ts")).toContain("MARKET_PAYMENTS_INACTIVE")
  })

  it("uses the central financial calculator for payment creation paths", () => {
    expect(readSource("lib/services/payment-guarantee.ts")).toContain("marketConfigurationService.calculateFinancials")
    expect(readSource("lib/services/stripe-webhook-handler.ts")).toContain("guaranteePaymentToBooking")
    expect(readSource("lib/services/payment-reconciliation.ts")).toContain("guaranteePaymentToBooking")
    expect(readSource("app/api/bookings/instant/payment/route.ts")).toContain("marketConfigurationService.calculateFinancials")
    expect(readSource("app/api/bookings/instant/payment-atomic/route.ts")).toContain("marketConfigurationService.calculateFinancials")
  })

  it("persists service-charge tax snapshots on new payment records", () => {
    const schema = readSource("prisma/schema.prisma")

    expect(schema).toContain("platformCommissionRate")
    expect(schema).toContain("serviceChargeTaxRate")
    expect(schema).toContain("serviceChargeTaxAmount")
    expect(schema).toContain("serviceChargeTaxDeductionEnabled")
    expect(schema).toContain("totalPlatformDeduction")
    expect(schema).toContain("taxJurisdiction")
    expect(schema).toContain("serviceChargeTaxStatus")
  })
})
