import { readFileSync } from "fs"
import path from "path"

import {
  APPROVED_PUBLIC_CONTACT,
  COUNTRY_MARKET_CONFIG,
  SERVICE_CHARGE_TAX_STATUS,
  calculateMarketplaceFinancials,
} from "@/lib/marketplace-rules"

const root = process.cwd()
const readSource = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8")

describe("confirmed client decisions", () => {
  it("keeps UK booking finance at 20 percent platform fee and 80 percent chef payout", () => {
    const finance = calculateMarketplaceFinancials({ grossAmount: 1000, countryCode: "GB", currency: "GBP" })

    expect(finance.platformCommissionAmount).toBe(200)
    expect(finance.serviceChargeTaxAmount).toBe(40)
    expect(finance.serviceChargeTaxStatus).toBe(SERVICE_CHARGE_TAX_STATUS.INCLUDED_IN_PLATFORM_FEE)
    expect(finance.serviceChargeTaxDeductionEnabled).toBe(false)
    expect(finance.totalPlatformDeduction).toBe(200)
    expect(finance.chefNetPayout).toBe(800)
  })

  it("uses the confirmed legal contact email and London UK storage wording", () => {
    expect(APPROVED_PUBLIC_CONTACT.email).toBe("info@chefachef.com")
    expect(readSource("app/(public)/privacy/page.tsx")).toContain("secure servers in London, UK")
    expect(readSource("app/(public)/privacy/page.tsx")).toContain("APPROVED_PUBLIC_CONTACT.email")
  })

  it("allows USA terms publication without activating USA bookings or payments", () => {
    const legalService = readSource("lib/services/legal-version-service.ts")

    expect(legalService).toContain("2026-08-US-DOCX")
    expect(legalService).toContain("USA Terms may remain published")
    expect(COUNTRY_MARKET_CONFIG.US.marketStatus).toBe("PREPARED_INACTIVE")
    expect(COUNTRY_MARKET_CONFIG.US.bookingEnabled).toBe(false)
    expect(COUNTRY_MARKET_CONFIG.US.paymentsEnabled).toBe(false)
    expect(COUNTRY_MARKET_CONFIG.IT.bookingEnabled).toBe(false)
    expect(COUNTRY_MARKET_CONFIG.KE.paymentsEnabled).toBe(false)
  })
})
