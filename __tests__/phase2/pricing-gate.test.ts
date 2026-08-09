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
import { calculateGuestComposition } from "@/lib/service-engine"
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
})
