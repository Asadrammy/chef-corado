import fs from "fs"
import path from "path"

import { getChefRequestDistanceKm } from "../../lib/chef-request-matching"

const mockGetServerSession = jest.fn()
const mockRequestUpdate = jest.fn()
const mockRequestNotesUpdate = jest.fn()
const mockRequestFindUnique = jest.fn()
const mockChefProfileFindUnique = jest.fn()
const mockRequestPrismaUpdate = jest.fn()
const mockGeocodeAddress = jest.fn()
const mockEnforceUserModeration = jest.fn()
const mockEnforceClientCompliance = jest.fn()
const mockAssertBookingMarketEnabled = jest.fn()
const mockFindActivePricingRule = jest.fn()
const mockGetPricingRule = jest.fn()
const mockResolvePricingState = jest.fn()
const mockAssertPricingRuleMatchesRequest = jest.fn()
const mockValidatePolicyFields = jest.fn()

jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}))

jest.mock("../../lib/services/request-service", () => ({
  requestService: {
    updateRequest: (...args: unknown[]) => mockRequestUpdate(...args),
    updateRequestNotes: (...args: unknown[]) => mockRequestNotesUpdate(...args),
  },
}))

jest.mock("../../lib/prisma", () => ({
  prisma: {
    request: {
      findUnique: (...args: unknown[]) => mockRequestFindUnique(...args),
      update: (...args: unknown[]) => mockRequestPrismaUpdate(...args),
    },
    chefProfile: {
      findUnique: (...args: unknown[]) => mockChefProfileFindUnique(...args),
    },
    availability: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
  isPrismaConnectionError: () => false,
}))

jest.mock("../../lib/geo", () => ({
  ...jest.requireActual("../../lib/geo"),
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
  COOKING_CLASS_TYPES: ["Hands-On"],
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

const root = process.cwd()
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8")

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

describe("request editing", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetServerSession.mockResolvedValue({
      user: { id: "client-1", role: "CLIENT", email: "client@example.com" },
    })
    mockAssertBookingMarketEnabled.mockResolvedValue(undefined)
    mockEnforceUserModeration.mockResolvedValue(undefined)
    mockEnforceClientCompliance.mockResolvedValue(undefined)
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

  it("returns 401 for unauthenticated clients and 400 for invalid payloads at the route", async () => {
    mockGetServerSession.mockResolvedValueOnce(null)
    const { PATCH } = await import("../../app/api/requests/[requestId]/route")

    const unauthorizedResponse = await PATCH(new Request("http://localhost/api/requests/request-1", { method: "PATCH" }) as any, {
      params: Promise.resolve({ requestId: "request-1" }),
    })
    expect(unauthorizedResponse.status).toBe(401)
    expect(mockRequestUpdate).not.toHaveBeenCalled()

    mockGetServerSession.mockResolvedValueOnce({
      user: { id: "client-1", role: "CLIENT", email: "client@example.com" },
    })
    const invalidResponse = await PATCH(
      new Request("http://localhost/api/requests/request-1", {
        method: "PATCH",
        body: JSON.stringify({ eventType: "Birthday" }),
        headers: { "content-type": "application/json" },
      }) as any,
      { params: Promise.resolve({ requestId: "request-1" }) }
    )

    expect(invalidResponse.status).toBe(422)
    expect(await invalidResponse.json()).toEqual({ error: "Invalid request" })
  })

  it("routes notes-only updates through the safe notes branch", async () => {
    mockRequestNotesUpdate.mockResolvedValue({ id: "request-1", details: "Updated notes" })
    const { PATCH } = await import("../../app/api/requests/[requestId]/route")

    const response = await PATCH(
      new Request("http://localhost/api/requests/request-1", {
        method: "PATCH",
        body: JSON.stringify({ mode: "notes", details: "Updated notes" }),
        headers: { "content-type": "application/json" },
      }) as any,
      { params: Promise.resolve({ requestId: "request-1" }) }
    )

    expect(response.status).toBe(200)
    expect(mockRequestNotesUpdate).toHaveBeenCalledWith("client-1", "request-1", { details: "Updated notes" })
    expect(await response.json()).toEqual({ request: { id: "request-1", details: "Updated notes" } })
  })

  it("uses the canonical kilometer matcher for chef request detail access", async () => {
    const { GET } = await import("../../app/api/requests/[requestId]/route")
    mockGetServerSession.mockResolvedValue({
      user: { id: "chef-user", role: "CHEF", email: "chef@example.com" },
    })
    const requestLatitude = 51.5072
    const requestLongitude = -0.1276
    const boundaryChefLatitude = 51.5572
    const boundaryChefLongitude = -0.1276
    const boundaryDistanceKm = getChefRequestDistanceKm(requestLatitude, requestLongitude, boundaryChefLatitude, boundaryChefLongitude)
    mockRequestFindUnique.mockResolvedValue({
      id: "request-1",
      latitude: requestLatitude,
      longitude: requestLongitude,
      client: { id: "client-1", name: "Michael Thompson", email: "michael@example.com" },
      photos: [],
    })
    mockChefProfileFindUnique.mockResolvedValue({
      userId: "chef-user",
      latitude: boundaryChefLatitude,
      longitude: boundaryChefLongitude,
      radius: boundaryDistanceKm,
    })

    const allowed = await GET(new Request("http://localhost/api/requests/request-1") as any, {
      params: Promise.resolve({ requestId: "request-1" }),
    })

    expect(allowed.status).toBe(200)

    mockChefProfileFindUnique.mockResolvedValueOnce({
      userId: "chef-user",
      latitude: boundaryChefLatitude,
      longitude: boundaryChefLongitude,
      radius: Math.max(0, boundaryDistanceKm - 0.01),
    })

    const denied = await GET(new Request("http://localhost/api/requests/request-1") as any, {
      params: Promise.resolve({ requestId: "request-1" }),
    })

    expect(denied.status).toBe(403)
  })

  it("rejects chef detail access when coordinates or radius are missing", async () => {
    const { GET } = await import("../../app/api/requests/[requestId]/route")
    mockGetServerSession.mockResolvedValue({
      user: { id: "chef-user", role: "CHEF", email: "chef@example.com" },
    })
    mockRequestFindUnique.mockResolvedValue({
      id: "request-1",
      latitude: null,
      longitude: null,
      client: { id: "client-1", name: "Michael Thompson", email: "michael@example.com" },
      photos: [],
    })
    mockChefProfileFindUnique.mockResolvedValue({
      userId: "chef-user",
      latitude: 51.5072,
      longitude: -0.1276,
      radius: 10,
    })

    const missingRequestCoords = await GET(new Request("http://localhost/api/requests/request-1") as any, {
      params: Promise.resolve({ requestId: "request-1" }),
    })
    expect(missingRequestCoords.status).toBe(403)

    mockRequestFindUnique.mockResolvedValueOnce({
      id: "request-1",
      latitude: 51.5072,
      longitude: -0.1276,
      client: { id: "client-1", name: "Michael Thompson", email: "michael@example.com" },
      photos: [],
    })
    mockChefProfileFindUnique.mockResolvedValueOnce({
      userId: "chef-user",
      latitude: 51.5072,
      longitude: -0.1276,
      radius: 0,
    })

    const zeroRadius = await GET(new Request("http://localhost/api/requests/request-1") as any, {
      params: Promise.resolve({ requestId: "request-1" }),
    })
    expect(zeroRadius.status).toBe(403)
  })

  it("keeps the edit route and form wired together for the client dashboard", () => {
    const route = read("app/api/requests/[requestId]/route.ts")
    const detailPage = read("app/dashboard/client/requests/[requestId]/page.tsx")
    const editPage = read("app/dashboard/client/requests/[requestId]/edit/page.tsx")
    const wizard = read("components/request-wizard-form.tsx")

    expect(route).toContain("export async function PATCH")
    expect(route).toContain("requestService.updateRequest")
    expect(route).toContain("requestService.updateRequestNotes")
    expect(detailPage).toContain("Edit Request")
    expect(detailPage).toContain("Add Notes")
    expect(detailPage).toContain("/dashboard/client/requests/${request.id}/edit")
    expect(detailPage).toContain("/dashboard/client/requests/${request.id}/edit?mode=notes")
    expect(detailPage).toContain("findFirst")
    expect(editPage).toContain('RequestWizardForm mode="edit"')
    expect(editPage).toContain("RequestNotesEditor")
    expect(wizard).toContain("apiClient.patch(`/api/requests/${initialRequest.id}`")
    expect(wizard).toContain("requestPhotos.length > 0")
    expect(wizard).toContain("Request updated successfully")
  })
})
