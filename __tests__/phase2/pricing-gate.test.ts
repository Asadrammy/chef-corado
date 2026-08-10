/// <reference types="jest" />

jest.mock("@/lib/prisma", () => ({
  prisma: {
    servicePricingRule: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}))

import { prisma } from "@/lib/prisma"
import {
  calculateGuestComposition,
  resolvePricingState,
  validateServiceSpecificAnswers,
} from "@/lib/service-engine"
import {
  assertPricingRuleMatchesRequest,
  assertProposalMeetsActivePricingRule,
  canTransitionPricingRule,
} from "@/lib/services/pricing-rule-service"

const mockPricingRuleModel = prisma.servicePricingRule as unknown as {
  findUnique: jest.Mock
  findFirst: jest.Mock
}

describe("Phase 2 pricing completion gate", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("enforces the pricing-rule lifecycle order", () => {
    expect(canTransitionPricingRule("DRAFT", "REVIEW")).toBe(true)
    expect(canTransitionPricingRule("REVIEW", "ACTIVE")).toBe(true)
    expect(canTransitionPricingRule("ACTIVE", "RETIRED")).toBe(true)

    expect(canTransitionPricingRule("DRAFT", "ACTIVE")).toBe(false)
    expect(canTransitionPricingRule("ACTIVE", "DRAFT")).toBe(false)
    expect(canTransitionPricingRule("RETIRED", "ACTIVE")).toBe(false)
  })

  it("preserves fractional children-under-10 billing units", () => {
    expect(calculateGuestComposition({ adultCount: 2, childrenUnder10: 2 })).toMatchObject({
      adultCount: 2,
      childrenUnder10: 2,
      actualAttendeeCount: 4,
      billableGuestCount: 3,
      pricingGuestCount: 3,
    })

    expect(calculateGuestComposition({ adultCount: 2, childrenUnder10: 3 })).toMatchObject({
      actualAttendeeCount: 5,
      billableGuestCount: 3.5,
      pricingGuestCount: 3.5,
    })

    expect(calculateGuestComposition({ adultCount: 0, childrenUnder10: 5 })).toMatchObject({
      actualAttendeeCount: 5,
      billableGuestCount: 2.5,
      pricingGuestCount: 2.5,
    })
  })

  it("rejects inactive, mismatched, or out-of-range pricing rules", () => {
    const request = {
      currency: "GBP",
      pricingGuestCount: 8,
      billableGuestCount: 8,
    }

    expect(() => assertPricingRuleMatchesRequest({
      rule: { status: "REVIEW", currency: "GBP", minGuests: 6, maxGuests: 250, version: "v1" },
      request,
    })).toThrow("PRICING_RULE_NOT_ACTIVE")

    expect(() => assertPricingRuleMatchesRequest({
      rule: { status: "ACTIVE", currency: "USD", minGuests: 6, maxGuests: 250, version: "v1" },
      request,
    })).toThrow("PRICING_RULE_CURRENCY_MISMATCH")

    expect(() => assertPricingRuleMatchesRequest({
      rule: { status: "ACTIVE", currency: "GBP", minGuests: 10, maxGuests: 250, version: "v1" },
      request,
    })).toThrow("PRICING_GUEST_COUNT_BELOW_MIN:10")

    expect(() => assertPricingRuleMatchesRequest({
      rule: { status: "ACTIVE", currency: "GBP", minGuests: 6, maxGuests: 7, version: "v1" },
      request,
    })).toThrow("PRICING_GUEST_COUNT_ABOVE_MAX:7")

    expect(() => assertPricingRuleMatchesRequest({
      rule: { status: "ACTIVE", currency: "GBP", minGuests: 6, maxGuests: 250, version: "v1" },
      request,
    })).not.toThrow()
  })

  it("uses approved country pricing for USA, Italy, and Kenya", () => {
    expect(resolvePricingState({
      serviceType: "SHARING_BUFFET",
      countryCode: "US",
      tier: "Casual dining",
      budget: 500,
    })).toMatchObject({
      currency: "USD",
      pricingStatus: "ACTIVE_RULE_APPLIED",
      budgetStatus: "WITHIN_GUIDANCE",
    })

    expect(resolvePricingState({
      serviceType: "THREE_COURSE_MEAL",
      countryCode: "IT",
      budget: 770,
    })).toMatchObject({
      currency: "EUR",
      pricingStatus: "ACTIVE_RULE_APPLIED",
      budgetStatus: "WITHIN_GUIDANCE",
    })

    expect(resolvePricingState({
      serviceType: "KIDS_PARTY",
      countryCode: "KE",
      budget: 20000,
    })).toMatchObject({
      currency: "KES",
      pricingStatus: "ACTIVE_RULE_APPLIED",
      budgetStatus: "WITHIN_GUIDANCE",
    })

    expect(resolvePricingState({
      serviceType: "KIDS_PARTY",
      countryCode: "KE",
      budget: 15000,
    })).toMatchObject({
      currency: "KES",
      pricingStatus: "ACTIVE_RULE_APPLIED",
      budgetStatus: "BELOW_MINIMUM_ALLOW_ENQUIRY",
    })
  })

  it("requires configured service-specific answers", () => {
    expect(validateServiceSpecificAnswers("SHARING_BUFFET", {})).toEqual([
      { id: "setupDetails", label: "Service and setup details" },
    ])

    expect(validateServiceSpecificAnswers("SHARING_BUFFET", {
      setupDetails: "Buffet table, serving utensils, and two-hour setup access.",
    })).toEqual([])
  })

  it("rejects proposals below the active rule minimum spend", async () => {
    mockPricingRuleModel.findUnique.mockResolvedValue({
      id: "spr_sharing_buffet",
      status: "ACTIVE",
      currency: "GBP",
      minimumSpend: 320,
      minGuests: 6,
      maxGuests: 250,
      version: "2026-08-phase-2-uk-pricing-v1",
    })

    const request = {
      serviceType: "SHARING_BUFFET",
      countryCode: "GB",
      currency: "GBP",
      serviceTier: null,
      pricingRuleId: "spr_sharing_buffet",
      pricingGuestCount: 8,
      billableGuestCount: 8,
    }

    await expect(assertProposalMeetsActivePricingRule({ request, proposalPrice: 319 }))
      .rejects.toThrow("PROPOSAL_BELOW_MINIMUM_SPEND:320")
    await expect(assertProposalMeetsActivePricingRule({ request, proposalPrice: 320 }))
      .resolves.toMatchObject({ id: "spr_sharing_buffet" })
  })

  it("rejects stale inactive request-bound rules before checkout", async () => {
    mockPricingRuleModel.findUnique.mockResolvedValue({
      id: "spr_old",
      status: "RETIRED",
      currency: "GBP",
      minimumSpend: 320,
      minGuests: 6,
      maxGuests: 250,
      version: "old",
    })

    await expect(assertProposalMeetsActivePricingRule({
      request: {
        serviceType: "GRAZING_TABLE",
        countryCode: "GB",
        currency: "GBP",
        serviceTier: null,
        pricingRuleId: "spr_old",
        pricingGuestCount: 8,
        billableGuestCount: 8,
      },
      proposalPrice: 500,
    })).rejects.toThrow("PRICING_RULE_NOT_ACTIVE")
  })

  it("uses the authoritative registry fallback for proposal validation when no DB rule is bound", async () => {
    mockPricingRuleModel.findUnique.mockResolvedValue(null)
    mockPricingRuleModel.findFirst.mockResolvedValue(null)

    const request = {
      serviceType: "THREE_COURSE_MEAL",
      countryCode: "US",
      currency: "USD",
      serviceTier: null,
      pricingRuleId: null,
      pricingGuestCount: 4,
      billableGuestCount: 4,
    }

    await expect(assertProposalMeetsActivePricingRule({ request, proposalPrice: 499 }))
      .rejects.toThrow("PROPOSAL_BELOW_MINIMUM_SPEND:500")
    await expect(assertProposalMeetsActivePricingRule({ request, proposalPrice: 500 }))
      .resolves.toMatchObject({ countryCode: "US", currency: "USD", version: "2026-08-10-client-confirmed" })
  })
})
