import { prisma } from "@/lib/prisma"
import { getPricingRule } from "@/lib/request-options"

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
  const dbRule = await prisma.servicePricingRule.findFirst({
    where: {
      serviceType: input.serviceType,
      countryCode: input.countryCode,
      status: "ACTIVE",
      AND: [
        {
          OR: [
            { tier: input.tier ?? null },
            { tier: null },
          ],
        },
        {
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gt: new Date() } },
          ],
        },
      ],
      effectiveFrom: { lte: new Date() },
    },
    orderBy: [
      { tier: "desc" },
      { effectiveFrom: "desc" },
    ],
  })

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

  return prisma.servicePricingRule.findFirst({
    where: {
      serviceType: input.serviceType,
      countryCode: input.countryCode,
      status: "ACTIVE",
      AND: [
        {
          OR: [
            { tier: input.tier ?? null },
            { tier: null },
          ],
        },
        {
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gt: now } },
          ],
        },
      ],
      effectiveFrom: { lte: now },
    },
    orderBy: [
      { tier: "desc" },
      { effectiveFrom: "desc" },
    ],
  })
}

export async function transitionPricingRule(input: {
  ruleId: string
  toStatus: PricingRuleStatus
  actorId: string
  reason?: string | null
}) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.servicePricingRule.findUnique({ where: { id: input.ruleId } })
    if (!existing) {
      throw new Error("PRICING_RULE_NOT_FOUND")
    }

    if (!canTransitionPricingRule(existing.status, input.toStatus)) {
      throw new Error(`INVALID_PRICING_RULE_TRANSITION:${existing.status}:${input.toStatus}`)
    }

    const now = new Date()
    const statusData =
      input.toStatus === "REVIEW"
        ? { reviewedBy: input.actorId, reviewedAt: now }
        : input.toStatus === "ACTIVE"
          ? { reviewedBy: existing.reviewedBy ?? input.actorId, reviewedAt: existing.reviewedAt ?? now, activatedBy: input.actorId, activatedAt: now }
          : input.toStatus === "RETIRED"
            ? { retiredBy: input.actorId, retiredAt: now, effectiveTo: existing.effectiveTo ?? now }
            : {}

    if (input.toStatus === "ACTIVE") {
      await tx.servicePricingRule.updateMany({
        where: {
          id: { not: existing.id },
          serviceType: existing.serviceType,
          countryCode: existing.countryCode,
          currency: existing.currency,
          tier: existing.tier,
          status: "ACTIVE",
        },
        data: {
          status: "RETIRED",
          retiredBy: input.actorId,
          retiredAt: now,
          effectiveTo: now,
          lifecycleReason: `Retired by activation of ${existing.id}`,
          updatedBy: input.actorId,
        },
      })
    }

    const updated = await tx.servicePricingRule.update({
      where: { id: existing.id },
      data: {
        status: input.toStatus,
        lifecycleReason: input.reason ?? null,
        updatedBy: input.actorId,
        ...statusData,
      },
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

  const requestBoundRule = input.request.pricingRuleId
    ? await prisma.servicePricingRule.findUnique({ where: { id: input.request.pricingRuleId } })
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
