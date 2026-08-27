const mockFindUnique = jest.fn()
const mockUpdate = jest.fn()
const mockGeocodeAddress = jest.fn()
const mockEnforceUserModeration = jest.fn()
const mockEnforceClientCompliance = jest.fn()
const mockAssertBookingMarketEnabled = jest.fn()
const mockFindActivePricingRule = jest.fn()
const mockGetPricingRule = jest.fn()
const mockResolvePricingState = jest.fn()
const mockAssertPricingRuleMatchesRequest = jest.fn()
const mockValidatePolicyFields = jest.fn()

jest.mock("../../lib/prisma", () => ({
  prisma: {
    request: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}))

jest.mock("../../lib/geo", () => ({
  geocodeAddress: (...args: unknown[]) => mockGeocodeAddress(...args),
}))

jest.mock("../../lib/security/moderation-guard", () => ({
  enforceUserModeration: (...args: unknown[]) => mockEnforceUserModeration(...args),
}))

jest.mock("../../lib/security/legal-compliance", () => ({
  enforceClientCompliance: (...args: unknown[]) => mockEnforceClientCompliance(...args),
}))

jest.mock("../../lib/security/communication-policy", () => ({
  validatePolicyFields: (...args: unknown[]) => mockValidatePolicyFields(...args),
}))

jest.mock("../../lib/services/market-configuration-service", () => ({
  marketConfigurationService: {
    assertBookingMarketEnabled: (...args: unknown[]) => mockAssertBookingMarketEnabled(...args),
  },
}))

jest.mock("../../lib/services/pricing-rule-service", () => ({
  findActivePricingRule: (...args: unknown[]) => mockFindActivePricingRule(...args),
  assertPricingRuleMatchesRequest: (...args: unknown[]) => mockAssertPricingRuleMatchesRequest(...args),
}))

jest.mock("../../lib/request-options", () => ({
  COUNTRY_OPTIONS: [{ value: "GB", label: "United Kingdom" }],
  EVENT_TYPES: ["Birthday", "Wedding", "Dinner Party", "Anniversary", "Multi-Day Chef Hire", "Full-Time Chef"],
  REQUEST_SERVICE_TYPES: ["DINING", "COOKING_CLASS"],
  LEGACY_EXPERIENCE_SERVICE_TYPES: ["DINING", "COOKING_CLASS"],
  CUISINE_TYPES: ["Italian"],
  DIETARY_REQUIREMENTS: ["Vegetarian"],
  SERVICE_TYPE_REGISTRY_VERSION: "registry-test",
  calculateGuestComposition: ({ adultCount, childrenUnder10, fallbackGuestCount }: any) => {
    const adults = Number.isFinite(adultCount) ? adultCount : fallbackGuestCount ?? 1
    const children = Number.isFinite(childrenUnder10) ? childrenUnder10 : 0
    return {
      adultCount: adults,
      childrenUnder10: children,
      actualAttendeeCount: adults + children,
      billableGuestCount: adults + Math.ceil(children / 2),
      pricingGuestCount: adults + Math.ceil(children / 2),
    }
  },
  getCurrencyForCountry: () => "GBP",
  getPricingRule: (...args: unknown[]) => mockGetPricingRule(...args),
  getServiceTypeOption: () => ({
    enabled: true,
    supportedCountries: ["GB"],
    serviceTiers: ["Classic"],
    label: "Classic Dining",
    minGuests: null,
    maxGuests: null,
  }),
  getServiceTypeLabel: () => "Classic Dining",
  resolvePricingState: (...args: unknown[]) => mockResolvePricingState(...args),
  validateServiceSpecificAnswers: () => [],
}))

function makeValidPayload(overrides: Record<string, unknown> = {}) {
  return {
    title: "Birthday Dinner",
    eventType: "Birthday",
    serviceType: "DINING",
    cuisinePreferences: ["Italian"],
    dietaryRequirements: [],
    serviceTier: "Classic",
    serviceSpecificAnswers: {},
    eventDate: "2026-09-15",
    eventTime: "19:00",
    location: "London",
    country: "GB",
    guestCount: 4,
    adultCount: 4,
    childrenUnder10: 0,
    actualAttendeeCount: 4,
    billableGuestCount: 4,
    pricingGuestCount: 4,
    budget: 500,
    details: "Please keep the menu seasonal.",
    ...overrides,
  }
}

describe("request editing service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockEnforceUserModeration.mockResolvedValue(undefined)
    mockEnforceClientCompliance.mockResolvedValue(undefined)
    mockAssertBookingMarketEnabled.mockResolvedValue(undefined)
    mockFindActivePricingRule.mockResolvedValue(null)
    mockGetPricingRule.mockReturnValue(null)
    mockResolvePricingState.mockReturnValue({
      pricingStatus: "LOCAL_QUOTE_REQUIRED",
      budgetStatus: "UNASSESSED",
      budgetWarning: null,
    })
    mockAssertPricingRuleMatchesRequest.mockReturnValue(undefined)
    mockValidatePolicyFields.mockReturnValue(undefined)
    mockGeocodeAddress.mockResolvedValue({
      latitude: 51.5072,
      longitude: -0.1276,
      city: "London",
      region: "London",
      formattedAddress: "London, UK",
      provider: "geocode",
    })
  })

  it("allows an owner to edit a standard request and persist editable fields only", async () => {
    mockFindUnique.mockResolvedValue({
      id: "request-1",
      clientId: "client-1",
      requestMode: "STANDARD",
      _count: { proposals: 0 },
    })
    mockUpdate.mockResolvedValue({ id: "request-1", title: "Updated title" })

    const { requestService } = await import("../../lib/services/request-service")
    const result = await requestService.updateRequest("client-1", "request-1", makeValidPayload({ title: "Updated title" }))

    expect(result.id).toBe("request-1")
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "request-1" },
        data: expect.objectContaining({
          title: "Updated title",
          eventType: "Birthday",
          serviceType: "DINING",
          location: "London",
          budget: 500,
        }),
      })
    )
    const updatePayload = mockUpdate.mock.calls[0][0].data
    expect(updatePayload).not.toHaveProperty("clientId")
    expect(updatePayload).not.toHaveProperty("requestMode")
    expect(updatePayload).not.toHaveProperty("proposals")
    expect(updatePayload).not.toHaveProperty("booking")
  })

  it("allows notes-only edits after submission without rewriting commercial fields", async () => {
    mockFindUnique.mockResolvedValue({
      id: "request-1",
      clientId: "client-1",
      requestMode: "STANDARD",
      details: "Old notes",
      proposals: [{ status: "PENDING" }],
    })
    mockUpdate.mockResolvedValue({ id: "request-1", details: "Updated notes" })

    const { requestService } = await import("../../lib/services/request-service")
    const result = await requestService.updateRequestNotes("client-1", "request-1", { details: "Updated notes" })

    expect(result.id).toBe("request-1")
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "request-1" },
        data: expect.objectContaining({
          details: "Updated notes",
        }),
      })
    )
  })

  it("rejects a non-owner before any update is written", async () => {
    mockFindUnique.mockResolvedValue({
      id: "request-1",
      clientId: "someone-else",
      requestMode: "STANDARD",
      _count: { proposals: 0 },
    })

    const { requestService } = await import("../../lib/services/request-service")

    await expect(requestService.updateRequest("client-1", "request-1", makeValidPayload())).rejects.toThrow("FORBIDDEN")
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it("rejects requests that already have proposals or are not standard requests", async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: "request-1",
      clientId: "client-1",
      requestMode: "STANDARD",
      _count: { proposals: 1 },
    })

    const { requestService } = await import("../../lib/services/request-service")
    await expect(requestService.updateRequest("client-1", "request-1", makeValidPayload())).rejects.toThrow("REQUEST_HAS_PROPOSALS")

    mockFindUnique.mockResolvedValueOnce({
      id: "request-2",
      clientId: "client-1",
      requestMode: "MULTI_DAY",
      _count: { proposals: 0 },
    })

    await expect(requestService.updateRequest("client-1", "request-2", makeValidPayload())).rejects.toThrow("REQUEST_EDIT_NOT_SUPPORTED")
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it("routes locked requests to support instead of allowing direct notes changes", async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: "request-1",
      clientId: "client-1",
      requestMode: "STANDARD",
      details: "Locked notes",
      proposals: [{ status: "ACCEPTED_PENDING_PAYMENT" }],
    })

    const { requestService } = await import("../../lib/services/request-service")
    await expect(requestService.updateRequestNotes("client-1", "request-1", { details: "Try to change" })).rejects.toThrow("REQUEST_SUPPORT_ONLY")
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})
