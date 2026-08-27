import { normalizeCurrency } from "@/lib/currency"
import { prisma } from "@/lib/prisma"
import { buildServicePricingRuleSelect, getServicePricingRuleColumnAvailability, isServicePricingSchemaMismatch } from "@/lib/service-pricing-schema"

type MinimumSpendSource = {
  id: string
  baseCountryCode?: string | null
  preferredCurrency?: string | null
  publicMinimumSpend?: number | null
  publicMinimumSpendCurrency?: string | null
}

type ServicePricingRuleSummary = {
  countryCode: string
  currency: string
  minimumSpend: number | null
}

export async function getActivePublicMinimumSpendRules() {
  const now = new Date()
  const availability = await getServicePricingRuleColumnAvailability()
  const select = await buildServicePricingRuleSelect(["countryCode", "currency", "minimumSpend"])
  if (!select || !availability.status || !availability.minimumSpend || !availability.effectiveFrom || !availability.effectiveTo) {
    return new Map<string, ServicePricingRuleSummary>()
  }

  let rules: Array<ServicePricingRuleSummary> = []
  try {
    rules = await prisma.servicePricingRule.findMany({
      where: {
        status: "ACTIVE",
        minimumSpend: { not: null },
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
      },
      select,
    })
  } catch (error) {
    if (!isServicePricingSchemaMismatch(error)) {
      throw error
    }
    return new Map<string, ServicePricingRuleSummary>()
  }

  const byMarket = new Map<string, ServicePricingRuleSummary>()
  for (const rule of rules) {
    const countryCode = rule.countryCode || "GB"
    const currency = normalizeCurrency(rule.currency || "GBP")
    const key = `${countryCode}:${currency}`
    const existing = byMarket.get(key)
    if (!existing || Number(rule.minimumSpend) < Number(existing.minimumSpend)) {
      byMarket.set(key, {
        countryCode,
        currency,
        minimumSpend: rule.minimumSpend,
      })
    }
  }

  return byMarket
}

export function derivePublicMinimumSpend(
  chef: MinimumSpendSource,
  activeRules: Map<string, ServicePricingRuleSummary>
) {
  if (typeof chef.publicMinimumSpend === "number") {
    return {
      amount: chef.publicMinimumSpend,
      currency: normalizeCurrency(chef.publicMinimumSpendCurrency || chef.preferredCurrency || "GBP"),
    }
  }

  const countryCode = chef.baseCountryCode || "GB"
  const currency = normalizeCurrency(chef.preferredCurrency || "GBP")
  const marketRule = activeRules.get(`${countryCode}:${currency}`)

  return {
    amount: marketRule?.minimumSpend ?? null,
    currency,
  }
}

export function applyPublicMinimumSpendFilter<T extends MinimumSpendSource>(
  chefs: T[],
  minBudget?: number | null,
  maxBudget?: number | null
) {
  if (minBudget == null && maxBudget == null) return chefs

  return chefs.filter((chef) => {
    if (typeof chef.publicMinimumSpend !== "number") return false
    if (minBudget != null && chef.publicMinimumSpend < minBudget) return false
    if (maxBudget != null && chef.publicMinimumSpend > maxBudget) return false
    return true
  })
}
