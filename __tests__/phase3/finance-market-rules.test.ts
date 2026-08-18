import {
  COUNTRY_MARKET_CONFIG,
  SERVICE_CHARGE_TAX_STATUS,
  assertMarketBookingEnabled,
  assertMarketPaymentsEnabled,
  calculateMarketplaceFinancials,
  calculatePlatformCommission,
  getInactiveMarketMessage,
} from "@/lib/marketplace-rules"

describe("Phase 3 finance and market rules", () => {
  it("uses 20% ChefaChef service charge for every prepared market", () => {
    expect(calculatePlatformCommission(1000, "GB")).toBe(200)
    expect(calculatePlatformCommission(1000, "US")).toBe(200)
    expect(calculatePlatformCommission(1000, "IT")).toBe(200)
    expect(calculatePlatformCommission(1000, "KE")).toBe(200)
  })

  it("keeps UK internal VAT tracking within the flat 20 percent platform fee", () => {
    const breakdown = calculateMarketplaceFinancials({ grossAmount: 1000, countryCode: "GB", currency: "GBP" })

    expect(breakdown.platformCommissionAmount).toBe(200)
    expect(breakdown.serviceChargeTaxRate).toBe(0.2)
    expect(breakdown.serviceChargeTaxAmount).toBe(40)
    expect(breakdown.serviceChargeTaxStatus).toBe(SERVICE_CHARGE_TAX_STATUS.INCLUDED_IN_PLATFORM_FEE)
    expect(breakdown.serviceChargeTaxDeductionEnabled).toBe(false)
    expect(breakdown.totalPlatformDeduction).toBe(200)
    expect(breakdown.chefNetPayout).toBe(800)
  })

  it("calculates inactive Italy and Kenya service-charge tax for audit without enabling checkout", () => {
    const italy = calculateMarketplaceFinancials({ grossAmount: 1000, countryCode: "IT", currency: "EUR" })
    const kenya = calculateMarketplaceFinancials({ grossAmount: 1000, countryCode: "KE", currency: "KES" })

    expect(italy.serviceChargeTaxAmount).toBe(44)
    expect(italy.serviceChargeTaxStatus).toBe(SERVICE_CHARGE_TAX_STATUS.MARKET_INACTIVE)
    expect(italy.chefNetPayout).toBe(800)
    expect(kenya.serviceChargeTaxAmount).toBe(32)
    expect(kenya.serviceChargeTaxStatus).toBe(SERVICE_CHARGE_TAX_STATUS.MARKET_INACTIVE)
    expect(kenya.chefNetPayout).toBe(800)
  })

  it("does not invent a USA service-charge tax rate", () => {
    const usa = calculateMarketplaceFinancials({ grossAmount: 1000, countryCode: "US", currency: "USD" })

    expect(usa.serviceChargeTaxRate).toBeNull()
    expect(usa.serviceChargeTaxAmount).toBe(0)
    expect(usa.serviceChargeTaxStatus).toBe(SERVICE_CHARGE_TAX_STATUS.NOT_CONFIGURED)
  })

  it("keeps UK active and USA/Italy/Kenya prepared but inactive", () => {
    expect(COUNTRY_MARKET_CONFIG.GB.bookingEnabled).toBe(true)
    expect(COUNTRY_MARKET_CONFIG.GB.paymentsEnabled).toBe(true)

    for (const code of ["US", "IT", "KE"] as const) {
      expect(COUNTRY_MARKET_CONFIG[code].supported).toBe(true)
      expect(COUNTRY_MARKET_CONFIG[code].bookingEnabled).toBe(false)
      expect(COUNTRY_MARKET_CONFIG[code].paymentsEnabled).toBe(false)
      expect(() => assertMarketBookingEnabled(code)).toThrow(`MARKET_BOOKING_INACTIVE:${code}`)
      expect(() => assertMarketPaymentsEnabled(code)).toThrow(`MARKET_PAYMENTS_INACTIVE:${code}`)
      expect(getInactiveMarketMessage(code)).toContain("Online booking is not yet available")
    }
  })
})
