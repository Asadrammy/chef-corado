const mockAvailabilityFindMany = jest.fn()

jest.mock("@/lib/prisma", () => ({
  prisma: {
    availability: {
      findMany: (...args: unknown[]) => mockAvailabilityFindMany(...args),
    },
  },
}))

jest.mock("@/lib/services/market-configuration-service", () => ({
  marketConfigurationService: {
    getMarketConfiguration: jest.fn().mockResolvedValue({
      countryCode: "GB",
      currencyCode: "GBP",
      enabled: true,
      bookingEnabled: true,
      paymentEnabled: true,
    }),
  },
}))

import { evaluateChefRequestAccessForRecords, MAX_QUOTES_PER_REQUEST } from "@/lib/services/request-eligibility-service"

const now = new Date("2026-09-02T12:00:00.000Z")

function chef(overrides: Record<string, unknown> = {}) {
  return {
    id: "chef-local",
    userId: "user-chef-local",
    isApproved: true,
    isBanned: false,
    latitude: 51.5074,
    longitude: -0.1278,
    radius: 50,
    baseCountryCode: "GB",
    user: { name: "Chef Local", role: "CHEF", isBanned: false },
    menus: [],
    experiences: [],
    ...overrides,
  } as any
}

function request(overrides: Record<string, unknown> = {}) {
  return {
    id: "request-1",
    clientId: "client-1",
    countryCode: "GB",
    createdAt: new Date("2026-09-02T00:30:00.000Z"),
    eventDate: new Date("2026-09-06T18:00:00.000Z"),
    eventType: "Dinner Party",
    serviceType: "PRIVATE_DINING",
    cuisineTypes: JSON.stringify([]),
    latitude: 51.52,
    longitude: -0.12,
    guestCount: 6,
    proposals: [],
    invitations: [],
    _count: { proposals: 0 },
    ...overrides,
  } as any
}

describe("request eligibility service", () => {
  beforeEach(() => {
    mockAvailabilityFindMany.mockResolvedValue([])
  })

  it("allows a local approved chef during the first 24 hours", async () => {
    const access = await evaluateChefRequestAccessForRecords({ chef: chef(), request: request(), now })

    expect(access.canView).toBe(true)
    expect(access.canPropose).toBe(true)
    expect(access.earlyAccess).toBe(true)
    expect(access.local).toBe(true)
  })

  it("blocks a broader non-local chef before the 24 hour window expires", async () => {
    const access = await evaluateChefRequestAccessForRecords({
      chef: chef({ id: "chef-far", userId: "user-chef-far", latitude: 53.4808, longitude: -2.2426, radius: 10 }),
      request: request(),
      now,
    })

    expect(access.canView).toBe(false)
    expect(access.canPropose).toBe(false)
    expect(access.reasons).toContain("EARLY_ACCESS_LOCAL_ONLY")
  })

  it("allows a broader eligible chef after the 24 hour window", async () => {
    const access = await evaluateChefRequestAccessForRecords({
      chef: chef({ id: "chef-far", userId: "user-chef-far", latitude: 53.4808, longitude: -2.2426, radius: 10 }),
      request: request({ createdAt: new Date("2026-09-01T00:00:00.000Z") }),
      now,
    })

    expect(access.canView).toBe(true)
    expect(access.canPropose).toBe(true)
    expect(access.broaderAccess).toBe(true)
  })

  it("denies requests with missing coordinates during early access", async () => {
    const access = await evaluateChefRequestAccessForRecords({
      chef: chef(),
      request: request({ latitude: null, longitude: null }),
      now,
    })

    expect(access.canView).toBe(false)
    expect(access.reasons).toContain("REQUEST_LOCATION_UNAVAILABLE")
  })

  it("denies zero-radius chefs", async () => {
    const access = await evaluateChefRequestAccessForRecords({
      chef: chef({ radius: 0 }),
      request: request(),
      now,
    })

    expect(access.canView).toBe(false)
    expect(access.reasons).toContain("CHEF_LOCATION_UNAVAILABLE")
  })

  it("enforces direct request exclusivity for unrelated chefs inside 48 hours", async () => {
    const access = await evaluateChefRequestAccessForRecords({
      chef: chef({ id: "chef-uninvited" }),
      request: request({ invitations: [{ chefId: "chef-target", status: "PENDING", createdAt: new Date("2026-09-02T00:30:00.000Z") }] }),
      now,
    })

    expect(access.canView).toBe(false)
    expect(access.reasons).toContain("DIRECT_REQUEST_RESTRICTED")
  })

  it("allows the targeted chef to view and respond to a direct request", async () => {
    const access = await evaluateChefRequestAccessForRecords({
      chef: chef({ id: "chef-target" }),
      request: request({ invitations: [{ chefId: "chef-target", status: "PENDING", createdAt: new Date("2026-09-02T00:30:00.000Z") }] }),
      now,
    })

    expect(access.canView).toBe(true)
    expect(access.canPropose).toBe(true)
    expect(access.directRequest).toBe(true)
    expect(access.invited).toBe(true)
  })

  it("releases expired direct requests to eligible local chefs after 48 hours", async () => {
    const access = await evaluateChefRequestAccessForRecords({
      chef: chef({ id: "chef-local-release" }),
      request: request({
        createdAt: new Date("2026-08-30T00:00:00.000Z"),
        invitations: [{ chefId: "chef-target", status: "PENDING", createdAt: new Date("2026-08-30T00:00:00.000Z") }],
      }),
      now,
    })

    expect(access.canView).toBe(true)
    expect(access.canPropose).toBe(true)
    expect(access.directRequest).toBe(true)
    expect(access.invited).toBe(false)
    expect(access.local).toBe(true)
  })

  it("does not release expired direct requests to non-local chefs", async () => {
    const access = await evaluateChefRequestAccessForRecords({
      chef: chef({ id: "chef-far-release", latitude: 53.4808, longitude: -2.2426, radius: 10 }),
      request: request({
        createdAt: new Date("2026-08-30T00:00:00.000Z"),
        invitations: [{ chefId: "chef-target", status: "PENDING", createdAt: new Date("2026-08-30T00:00:00.000Z") }],
      }),
      now,
    })

    expect(access.canView).toBe(false)
    expect(access.reasons).toContain("DIRECT_REQUEST_LOCAL_RELEASE_ONLY")
  })

  it("keeps direct request exclusive after the targeted chef has responded", async () => {
    const access = await evaluateChefRequestAccessForRecords({
      chef: chef({ id: "chef-uninvited-after-response" }),
      request: request({
        createdAt: new Date("2026-08-30T00:00:00.000Z"),
        invitations: [{ chefId: "chef-target", status: "PENDING", createdAt: new Date("2026-08-30T00:00:00.000Z") }],
        proposals: [{ chefId: "chef-target", status: "PENDING" }],
      }),
      now,
    })

    expect(access.canView).toBe(false)
    expect(access.reasons).toContain("DIRECT_REQUEST_RESTRICTED")
  })

  it("blocks new proposals once the quote cap is reached", async () => {
    const access = await evaluateChefRequestAccessForRecords({
      chef: chef(),
      request: request({ _count: { proposals: MAX_QUOTES_PER_REQUEST } }),
      now,
    })

    expect(access.canPropose).toBe(false)
    expect(access.reasons).toContain("QUOTE_CAP_REACHED")
  })

  it("marks be first to respond only for eligible zero-proposal requests", async () => {
    const first = await evaluateChefRequestAccessForRecords({ chef: chef(), request: request(), now })
    const second = await evaluateChefRequestAccessForRecords({
      chef: chef(),
      request: request({ _count: { proposals: 1 }, proposals: [{ chefId: "other-chef", status: "PENDING" }] }),
      now,
    })

    expect(first.beFirstToRespond).toBe(true)
    expect(second.beFirstToRespond).toBe(false)
  })

  it("treats no availability row as available for local early access", async () => {
    mockAvailabilityFindMany.mockResolvedValueOnce([]).mockResolvedValueOnce([])

    const access = await evaluateChefRequestAccessForRecords({ chef: chef(), request: request(), now })

    expect(access.canPropose).toBe(true)
    expect(access.reasons).not.toContain("AVAILABILITY_CONFLICT")
  })

  it("blocks a local chef with an explicit unavailable row", async () => {
    mockAvailabilityFindMany
      .mockResolvedValueOnce([
        {
          date: new Date("2026-09-06T00:00:00.000Z"),
          isAvailable: false,
          currentBookings: 0,
          maxBookings: 0,
        },
      ])
      .mockResolvedValueOnce([
        {
          date: new Date("2026-09-06T00:00:00.000Z"),
          isAvailable: false,
          currentBookings: 0,
          maxBookings: 0,
        },
      ])

    const access = await evaluateChefRequestAccessForRecords({ chef: chef(), request: request(), now })

    expect(access.canPropose).toBe(false)
    expect(access.reasons).toContain("AVAILABILITY_CONFLICT")
  })
})
