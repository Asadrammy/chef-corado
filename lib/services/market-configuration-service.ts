import { prisma } from "@/lib/prisma"
import {
  COUNTRY_MARKET_CONFIG,
  SERVICE_CHARGE_TAX_STATUS,
  calculateMarketplaceFinancialsForMarket,
  getMarketConfig,
  isCountryMarketCode,
  type CountryMarketCode,
  type MarketplaceFinancialBreakdown,
  type MarketConfigurationShape,
  type ServiceChargeTaxStatus,
} from "@/lib/marketplace-rules"

export type MarketConfigurationSource = "DATABASE" | "DEFAULT"

export type ResolvedMarketConfiguration = MarketConfigurationShape & {
  id?: string
  source: MarketConfigurationSource
  active: boolean
  activationPrerequisites?: string | null
  internalNotes?: string | null
  updatedBy?: string | null
  updatedAt?: Date | null
}

export type MarketConfigurationPatch = {
  active?: boolean
  bookingEnabled?: boolean
  paymentsEnabled?: boolean
  legalEnabled?: boolean
  internalNotes?: string | null
}

function isMissingMarketTable(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes("MarketConfiguration") && (
    message.includes("does not exist") ||
    message.includes("not exist") ||
    message.includes("P2021") ||
    message.includes("relation")
  )
}

function toMarketStatus(active: boolean) {
  return active ? "ACTIVE" : "PREPARED_INACTIVE"
}

function fromRow(row: {
  id: string
  countryCode: string
  countryName: string
  currency: string
  supported: boolean
  active: boolean
  bookingEnabled: boolean
  paymentsEnabled: boolean
  legalEnabled: boolean
  platformCommissionRate: number
  serviceChargeTaxRate: number | null
  serviceChargeTaxStatus: string
  serviceChargeTaxDeductionEnabled: boolean
  activationPrerequisites: string | null
  internalNotes: string | null
  updatedBy: string | null
  updatedAt: Date
}): ResolvedMarketConfiguration {
  const defaults = getMarketConfig(row.countryCode)
  return {
    id: row.id,
    source: "DATABASE",
    countryCode: defaults.countryCode,
    countryName: row.countryName,
    currency: row.currency as MarketConfigurationShape["currency"],
    marketStatus: toMarketStatus(row.active),
    active: row.active,
    supported: row.supported,
    bookingEnabled: row.bookingEnabled,
    paymentsEnabled: row.paymentsEnabled,
    legalEnabled: row.legalEnabled,
    platformCommissionRate: row.platformCommissionRate,
    serviceChargeTaxRate: row.serviceChargeTaxRate,
    serviceChargeTaxStatus: row.serviceChargeTaxStatus as ServiceChargeTaxStatus,
    serviceChargeTaxDeductionEnabled: row.serviceChargeTaxDeductionEnabled,
    activationPrerequisites: row.activationPrerequisites,
    internalNotes: row.internalNotes,
    updatedBy: row.updatedBy,
    updatedAt: row.updatedAt,
  }
}

function fromDefault(countryCode: CountryMarketCode): ResolvedMarketConfiguration {
  return {
    ...COUNTRY_MARKET_CONFIG[countryCode],
    source: "DEFAULT",
    active: COUNTRY_MARKET_CONFIG[countryCode].marketStatus === "ACTIVE",
    activationPrerequisites: null,
    internalNotes: null,
    updatedBy: null,
    updatedAt: null,
  }
}

function validateKnownCountry(countryCode: string): CountryMarketCode {
  if (!isCountryMarketCode(countryCode)) {
    throw new Error(`UNKNOWN_MARKET:${countryCode}`)
  }
  return countryCode
}

async function getActivePricingRuleCount(countryCode: CountryMarketCode) {
  try {
    return await prisma.servicePricingRule.count({
      where: {
        countryCode,
        status: "ACTIVE",
        effectiveFrom: { lte: new Date() },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }],
      },
    })
  } catch (error) {
    if (isMissingMarketTable(error)) return 0
    throw error
  }
}

async function validateActivationPrerequisites(
  countryCode: CountryMarketCode,
  existing: ResolvedMarketConfiguration,
  next: ResolvedMarketConfiguration
) {
  const issues: string[] = []

  if (!next.supported && (next.active || next.bookingEnabled || next.paymentsEnabled || next.legalEnabled)) {
    issues.push("Unsupported markets cannot be activated.")
  }

  if ((next.bookingEnabled || next.paymentsEnabled || next.legalEnabled) && !next.active) {
    issues.push("Booking, payment, and legal availability require the market to be active.")
  }

  if (next.paymentsEnabled && !next.bookingEnabled) {
    issues.push("Payments cannot be enabled unless bookings are enabled.")
  }

  if (next.bookingEnabled && !next.legalEnabled) {
    issues.push("Bookings cannot be enabled unless legal availability is enabled.")
  }

  if (next.serviceChargeTaxDeductionEnabled && next.serviceChargeTaxStatus !== SERVICE_CHARGE_TAX_STATUS.ACTIVE) {
    issues.push("Service-charge tax deduction cannot be enabled unless tax status is ACTIVE.")
  }

  if (!existing.bookingEnabled && next.bookingEnabled) {
    const activePricingRules = await getActivePricingRuleCount(countryCode)
    if (activePricingRules === 0) {
      issues.push("At least one active pricing rule must exist before enabling bookings.")
    }
  }

  if (issues.length > 0) {
    throw new Error(`MARKET_PREREQUISITES_FAILED:${issues.join(" ")}`)
  }
}

export const marketConfigurationService = {
  async listMarketConfigurations(): Promise<ResolvedMarketConfiguration[]> {
    if (!(prisma as any).marketConfiguration?.findMany) {
      return (Object.keys(COUNTRY_MARKET_CONFIG) as CountryMarketCode[]).map(fromDefault)
    }

    try {
      const rows = await prisma.marketConfiguration.findMany({ orderBy: { countryCode: "asc" } })
      const byCountry = new Map(rows.map((row) => [row.countryCode, fromRow(row)]))
      return (Object.keys(COUNTRY_MARKET_CONFIG) as CountryMarketCode[]).map((countryCode) =>
        byCountry.get(countryCode) ?? fromDefault(countryCode)
      )
    } catch (error) {
      if (isMissingMarketTable(error)) {
        return (Object.keys(COUNTRY_MARKET_CONFIG) as CountryMarketCode[]).map(fromDefault)
      }
      throw error
    }
  },

  async getMarketConfiguration(countryCode?: string | null): Promise<ResolvedMarketConfiguration> {
    const resolvedCountryCode = validateKnownCountry((countryCode || "GB").toUpperCase())
    if (!(prisma as any).marketConfiguration?.findUnique) {
      return fromDefault(resolvedCountryCode)
    }

    try {
      const row = await prisma.marketConfiguration.findUnique({ where: { countryCode: resolvedCountryCode } })
      return row ? fromRow(row) : fromDefault(resolvedCountryCode)
    } catch (error) {
      if (isMissingMarketTable(error)) {
        return fromDefault(resolvedCountryCode)
      }
      throw error
    }
  },

  async assertBookingMarketEnabled(countryCode?: string | null) {
    const market = await this.getMarketConfiguration(countryCode)
    if (!market.bookingEnabled) {
      throw new Error(`MARKET_BOOKING_INACTIVE:${market.countryCode}`)
    }
    return market
  },

  async isMarketActive(countryCode?: string | null) {
    return (await this.getMarketConfiguration(countryCode)).active
  },

  async isBookingEnabled(countryCode?: string | null) {
    return (await this.getMarketConfiguration(countryCode)).bookingEnabled
  },

  async isPaymentEnabled(countryCode?: string | null) {
    return (await this.getMarketConfiguration(countryCode)).paymentsEnabled
  },

  async isLegalEnabled(countryCode?: string | null) {
    return (await this.getMarketConfiguration(countryCode)).legalEnabled
  },

  async assertPaymentMarketEnabled(countryCode?: string | null) {
    const market = await this.getMarketConfiguration(countryCode)
    if (!market.paymentsEnabled) {
      throw new Error(`MARKET_PAYMENTS_INACTIVE:${market.countryCode}`)
    }
    return market
  },

  async calculateFinancials(input: {
    grossAmount: number
    countryCode?: string | null
    currency?: string | null
  }): Promise<MarketplaceFinancialBreakdown> {
    const market = await this.getMarketConfiguration(input.countryCode)
    return calculateMarketplaceFinancialsForMarket({ grossAmount: input.grossAmount, currency: input.currency }, market)
  },

  async updateMarketConfiguration(input: {
    countryCode: string
    patch: MarketConfigurationPatch
    actorId: string
    reason?: string | null
  }) {
    const countryCode = validateKnownCountry(input.countryCode.toUpperCase())
    const existing = await this.getMarketConfiguration(countryCode)
    const defaults = getMarketConfig(countryCode)
    const next: ResolvedMarketConfiguration = {
      ...existing,
      active: input.patch.active ?? existing.active,
      marketStatus: toMarketStatus(input.patch.active ?? existing.active),
      bookingEnabled: input.patch.bookingEnabled ?? existing.bookingEnabled,
      paymentsEnabled: input.patch.paymentsEnabled ?? existing.paymentsEnabled,
      legalEnabled: input.patch.legalEnabled ?? existing.legalEnabled,
      internalNotes: input.patch.internalNotes === undefined ? existing.internalNotes : input.patch.internalNotes,
    } as ResolvedMarketConfiguration

    await validateActivationPrerequisites(countryCode, existing, next)

    return prisma.$transaction(async (tx) => {
      const saved = await tx.marketConfiguration.upsert({
        where: { countryCode },
        update: {
          active: next.marketStatus === "ACTIVE",
          bookingEnabled: next.bookingEnabled,
          paymentsEnabled: next.paymentsEnabled,
          legalEnabled: next.legalEnabled,
          internalNotes: next.internalNotes,
          updatedBy: input.actorId,
        },
        create: {
          countryCode,
          countryName: defaults.countryName,
          currency: defaults.currency,
          supported: defaults.supported,
          active: next.marketStatus === "ACTIVE",
          bookingEnabled: next.bookingEnabled,
          paymentsEnabled: next.paymentsEnabled,
          legalEnabled: next.legalEnabled,
          platformCommissionRate: defaults.platformCommissionRate,
          serviceChargeTaxRate: defaults.serviceChargeTaxRate,
          serviceChargeTaxStatus: defaults.serviceChargeTaxStatus,
          serviceChargeTaxDeductionEnabled: defaults.serviceChargeTaxDeductionEnabled,
          activationPrerequisites: existing.activationPrerequisites,
          internalNotes: next.internalNotes,
          updatedBy: input.actorId,
        },
      })

      await tx.auditLog.create({
        data: {
          action: "MARKET_CONFIGURATION_UPDATED",
          entityType: "MarketConfiguration",
          entityId: saved.countryCode,
          oldValue: JSON.stringify({
            marketStatus: existing.marketStatus,
            bookingEnabled: existing.bookingEnabled,
            paymentsEnabled: existing.paymentsEnabled,
            legalEnabled: existing.legalEnabled,
            internalNotes: existing.internalNotes,
          }),
          newValue: JSON.stringify({
            active: saved.active,
            bookingEnabled: saved.bookingEnabled,
            paymentsEnabled: saved.paymentsEnabled,
            legalEnabled: saved.legalEnabled,
            internalNotes: saved.internalNotes,
          }),
          performedBy: input.actorId,
          reason: input.reason ?? "Super Admin market configuration change",
        },
      })

      return fromRow(saved)
    })
  },
}
