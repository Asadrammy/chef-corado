import { prisma } from "@/lib/prisma"
import { getPricingRule } from "@/lib/request-options"
import { buildActiveServicePricingRuleWhere, buildServicePricingRuleOrderBy, buildServicePricingRuleSelect, getServicePricingRuleColumnAvailability, isServicePricingSchemaMismatch } from "@/lib/service-pricing-schema"

export const PRICING_RULE_STATUSES = ["DRAFT", "REVIEW", "ACTIVE", "RETIRED"] as const
export type PricingRuleStatus = typeof PRICING_RULE_STATUSES[number]

const allowedTransitions: Record<PricingRuleStatus, PricingRuleStatus[]> = {
  DRAFT: ["REVIEW", "RETIRED"],
  REVIEW: ["ACTIVE", "DRAFT", "RETIRED"],
  ACTIVE: ["RETIRED"],
  RETIRED: [],
}

export function canTransitionPricingRule(from: string, to: string) {
  return PRICING_RULE_STATUSES.includes(from as PricingRuleStatus) &&
    PRICING_RULE_STATUSES.includes(to as PricingRuleStatus) &&
    allowedTransitions[from as PricingRuleStatus].includes(to as PricingRuleStatus)
}

export async function findAuthoritativePricingRule(input: {
  serviceType: string
  countryCode: string
  tier?: string | null
}) {
  const select = await buildServicePricingRuleSelect([
    "id",
    "serviceType",
    "countryCode",
    "currency",
    "tier",
    "minimumSpend",
    "pricePerPersonMin",
    "pricePerPersonMax",
    "minGuests",
    "maxGuests",
    "warningCopy",
    "customerGuidance",
    "status",
    "version",
    "evidenceSource",
    "evidenceNotes",
  ])
  const where = await buildActiveServicePricingRuleWhere({
    serviceType: input.serviceType,
    countryCode: input.countryCode,
    tier: input.tier,
  })
  const orderBy = await buildServicePricingRuleOrderBy(["tier", "effectiveFrom"], "desc")

  if (!select || !where) {
    return getPricingRule(input.serviceType, input.countryCode, input.tier)
  }

  let dbRule: Awaited<ReturnType<typeof prisma.servicePricingRule.findFirst>> | null = null
  try {
    dbRule = await prisma.servicePricingRule.findFirst({
      where,
      ...(orderBy ? { orderBy } : {}),
      select,
    })
  } catch (error) {
    if (!isServicePricingSchemaMismatch(error)) {
      throw error
    }
    return getPricingRule(input.serviceType, input.countryCode, input.tier)
  }

  if (dbRule) {
    return {
      id: dbRule.id,
      serviceType: dbRule.serviceType,
      countryCode: dbRule.countryCode,
      currency: dbRule.currency,
      tier: dbRule.tier ?? undefined,
      minimumSpend: dbRule.minimumSpend ?? undefined,
      pricePerPersonMin: dbRule.pricePerPersonMin ?? undefined,
      pricePerPersonMax: dbRule.pricePerPersonMax ?? undefined,
      minGuests: dbRule.minGuests ?? undefined,
      maxGuests: dbRule.maxGuests ?? undefined,
      warningCopy: dbRule.warningCopy ?? undefined,
      customerGuidance: dbRule.customerGuidance ?? undefined,
      status: "ACTIVE" as const,
      version: dbRule.version,
      evidenceSource: dbRule.evidenceSource ?? "Admin pricing configuration",
      evidenceNotes: dbRule.evidenceNotes ?? "",
    }
  }

  return getPricingRule(input.serviceType, input.countryCode, input.tier)
}

export async function findActivePricingRule(input: {
  serviceType: string
  countryCode: string
  tier?: string | null
}) {
  const now = new Date()
  const select = await buildServicePricingRuleSelect([
    "id",
    "serviceType",
    "countryCode",
    "currency",
    "tier",
    "minimumSpend",
    "pricePerPersonMin",
    "pricePerPersonMax",
    "minGuests",
    "maxGuests",
    "warningCopy",
    "customerGuidance",
    "status",
    "version",
    "evidenceSource",
    "evidenceNotes",
  ])
  const where = await buildActiveServicePricingRuleWhere({
    serviceType: input.serviceType,
    countryCode: input.countryCode,
    tier: input.tier,
    now,
  })
  const orderBy = await buildServicePricingRuleOrderBy(["tier", "effectiveFrom"], "desc")

  if (!select || !where) {
    return null
  }

  try {
    return await prisma.servicePricingRule.findFirst({
      where,
      ...(orderBy ? { orderBy } : {}),
      select,
    })
  } catch (error) {
    if (isServicePricingSchemaMismatch(error)) {
      return null
    }
    throw error
  }
}

export async function transitionPricingRule(input: {
  ruleId: string
  toStatus: PricingRuleStatus
  actorId: string
  reason?: string | null
}) {
  return prisma.$transaction(async (tx) => {
    const availability = await getServicePricingRuleColumnAvailability()
    if (!availability.serviceType || !availability.countryCode || !availability.currency || !availability.status || !availability.version) {
      throw new Error("PRICING_RULE_SCHEMA_OUT_OF_SYNC")
    }

    const select = await buildServicePricingRuleSelect([
      "id",
      "serviceType",
      "countryCode",
      "currency",
      "tier",
      "status",
      "version",
      "effectiveFrom",
      "effectiveTo",
      "reviewedBy",
      "reviewedAt",
      "activatedBy",
      "activatedAt",
      "retiredBy",
      "retiredAt",
      "lifecycleReason",
      "updatedBy",
    ])
    if (!select) {
      throw new Error("PRICING_RULE_SCHEMA_OUT_OF_SYNC")
    }

    const existing = await tx.servicePricingRule.findUnique({ where: { id: input.ruleId }, select })
    if (!existing) {
      throw new Error("PRICING_RULE_NOT_FOUND")
    }

    if (!canTransitionPricingRule(existing.status, input.toStatus)) {
      throw new Error(`INVALID_PRICING_RULE_TRANSITION:${existing.status}:${input.toStatus}`)
    }

    const now = new Date()
    const statusData: Record<string, unknown> = {}
    if (input.toStatus === "REVIEW") {
      if (existing.reviewedBy !== undefined) statusData.reviewedBy = input.actorId
      if (existing.reviewedAt !== undefined) statusData.reviewedAt = now
    } else if (input.toStatus === "ACTIVE") {
      if (existing.reviewedBy !== undefined) statusData.reviewedBy = existing.reviewedBy ?? input.actorId
      if (existing.reviewedAt !== undefined) statusData.reviewedAt = existing.reviewedAt ?? now
      if (existing.activatedBy !== undefined) statusData.activatedBy = input.actorId
      if (existing.activatedAt !== undefined) statusData.activatedAt = now
    } else if (input.toStatus === "RETIRED") {
      if (existing.retiredBy !== undefined) statusData.retiredBy = input.actorId
      if (existing.retiredAt !== undefined) statusData.retiredAt = now
      if (existing.effectiveTo !== undefined) statusData.effectiveTo = existing.effectiveTo ?? now
    }

    if (input.toStatus === "ACTIVE") {
      await tx.servicePricingRule.updateMany({
        where: {
          id: { not: existing.id },
          serviceType: existing.serviceType,
          countryCode: existing.countryCode,
          currency: existing.currency,
          ...(existing.tier !== undefined ? { tier: existing.tier } : {}),
          status: "ACTIVE",
        },
        data: {
          status: "RETIRED",
          ...(existing.retiredBy !== undefined ? { retiredBy: input.actorId } : {}),
          ...(existing.retiredAt !== undefined ? { retiredAt: now } : {}),
          ...(existing.effectiveTo !== undefined ? { effectiveTo: now } : {}),
          ...(existing.lifecycleReason !== undefined ? { lifecycleReason: `Retired by activation of ${existing.id}` } : {}),
          updatedBy: input.actorId,
        },
      })
    }

    const updateData: Record<string, unknown> = {
      status: input.toStatus,
      updatedBy: input.actorId,
    }

    if (existing.lifecycleReason !== undefined) {
      updateData.lifecycleReason = input.reason ?? null
    }

    Object.assign(updateData, statusData)

    const updated = await tx.servicePricingRule.update({
      where: { id: existing.id },
      data: updateData,
      select,
    })

    await tx.auditLog.create({
      data: {
        action: "PRICING_RULE_STATUS_CHANGED",
        entityType: "ServicePricingRule",
        entityId: updated.id,
        oldValue: JSON.stringify({ status: existing.status }),
        newValue: JSON.stringify({ status: updated.status }),
        performedBy: input.actorId,
        reason: input.reason ?? `Pricing rule moved from ${existing.status} to ${updated.status}`,
      },
    })

    return updated
  })
}

export function assertPricingRuleMatchesRequest(input: {
  rule: {
    status: string
    currency: string
    minGuests?: number | null
    maxGuests?: number | null
    version: string
  }
  request: {
    currency: string | null
    pricingGuestCount: number | null
    billableGuestCount: number | null
  }
}) {
  if (input.rule.status !== "ACTIVE") {
    throw new Error("PRICING_RULE_NOT_ACTIVE")
  }

  if (input.request.currency && input.rule.currency !== input.request.currency) {
    throw new Error("PRICING_RULE_CURRENCY_MISMATCH")
  }

  const pricingGuestCount = input.request.pricingGuestCount ?? input.request.billableGuestCount

  if (pricingGuestCount != null) {
    if (input.rule.minGuests != null && pricingGuestCount < input.rule.minGuests) {
      throw new Error(`PRICING_GUEST_COUNT_BELOW_MIN:${input.rule.minGuests}`)
    }

    if (input.rule.maxGuests != null && pricingGuestCount > input.rule.maxGuests) {
      throw new Error(`PRICING_GUEST_COUNT_ABOVE_MAX:${input.rule.maxGuests}`)
    }
  }
}

export async function assertProposalMeetsActivePricingRule(input: {
  request: {
    serviceType: string | null
    countryCode: string | null
    currency: string | null
    serviceTier: string | null
    pricingRuleId: string | null
    pricingGuestCount: number | null
    billableGuestCount: number | null
  }
  proposalPrice: number
}) {
  if (!input.request.serviceType) {
    return null
  }

  const select = await buildServicePricingRuleSelect([
    "id",
    "serviceType",
    "countryCode",
    "currency",
    "tier",
    "minimumSpend",
    "minGuests",
    "maxGuests",
    "status",
    "version",
    "effectiveFrom",
    "effectiveTo",
  ])
  const requestBoundRule = input.request.pricingRuleId && select
    ? await prisma.servicePricingRule.findUnique({ where: { id: input.request.pricingRuleId }, select })
    : null
  const rule = requestBoundRule ?? await findAuthoritativePricingRule({
    serviceType: input.request.serviceType,
    countryCode: input.request.countryCode ?? "GB",
    tier: input.request.serviceTier,
  })

  if (!rule) {
    return null
  }

  assertPricingRuleMatchesRequest({
    rule,
    request: input.request,
  })

  if (rule.minimumSpend != null && input.proposalPrice < rule.minimumSpend) {
    throw new Error(`PROPOSAL_BELOW_MINIMUM_SPEND:${rule.minimumSpend}`)
  }

  return rule
}
