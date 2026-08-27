import {
  getMarketplaceActiveFilterCount,
  parseMarketplaceFilters,
  requestMatchesMarketplaceFilters,
} from "@/lib/chef-request-marketplace-filters"

function makeRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: "request-1",
    title: "Italian dinner",
    details: "Seasonal tasting menu",
    location: "London",
    locationCity: "London",
    formattedAddress: "London, UK",
    eventType: "Dinner Party",
    serviceTypeLabel: "Dining",
    cuisinePreferences: ["Italian", "Modern European"],
    dietaryRequirements: ["Vegetarian"],
    eventDate: "2026-08-31T18:00:00.000Z",
    multiDayDates: [],
    budget: 1500,
    totalBudget: 1500,
    currency: "GBP",
    guestCount: 12,
    actualAttendeeCount: 12,
    billableGuestCount: 11,
    pricingGuestCount: 11,
    createdAt: "2026-08-20T10:00:00.000Z",
    submittedAt: "2026-08-20T10:00:00.000Z",
    distanceKm: 8,
    ...overrides,
  }
}

describe("chef request marketplace filters", () => {
  it("sanitizes URL params and keeps the active filter count honest", () => {
    const filters = parseMarketplaceFilters({
      tab: "responded",
      search: "italian",
      budgetMin: "2500",
      budgetMax: "1000",
      ppMin: "90",
      ppMax: "50",
      guestsMin: "20",
      guestsMax: "5",
      dateFrom: "2026-09-10",
      dateTo: "2026-09-01",
      radius: "20",
      sort: "budget-high",
      page: "3",
      limit: "24",
    })

    expect(filters.tab).toBe("responded")
    expect(filters.budgetMin).toBe(2500)
    expect(filters.budgetMax).toBe(2500)
    expect(filters.perPersonMin).toBe(90)
    expect(filters.perPersonMax).toBe(90)
    expect(filters.guestsMin).toBe(20)
    expect(filters.guestsMax).toBe(20)
    expect(filters.dateFrom).toBe("2026-09-10")
    expect(filters.dateTo).toBe("2026-09-10")
    expect(filters.page).toBe(3)
    expect(filters.limit).toBe(24)
    expect(getMarketplaceActiveFilterCount(filters)).toBeGreaterThan(0)
  })

  it("matches budget, per-person, guest and search filters without using client names", () => {
    const filters = parseMarketplaceFilters({
      budgetMin: "1400",
      budgetMax: "1600",
      ppMin: "120",
      ppMax: "140",
      guestsMin: "10",
      guestsMax: "14",
      search: "italian london vegetarian",
    })

    expect(
      requestMatchesMarketplaceFilters(makeRequest(), filters, {
        chefRadiusKm: 50,
        marketCurrency: "GBP",
      })
    ).toBe(true)

    expect(
      requestMatchesMarketplaceFilters(
        makeRequest({
          clientName: "Michael Thompson",
          title: "Corporate lunch",
          location: "London",
          details: "Lunch for a board meeting",
        }),
        parseMarketplaceFilters({ search: "michael" }),
        {
          chefRadiusKm: 50,
          marketCurrency: "GBP",
        }
      )
    ).toBe(false)
  })

  it("matches exact and range dates including multi-day requests", () => {
    const exactFilters = parseMarketplaceFilters({ dateFrom: "2026-08-31", dateTo: "2026-08-31" })
    expect(
      requestMatchesMarketplaceFilters(makeRequest(), exactFilters, {
        chefRadiusKm: 50,
        marketCurrency: "GBP",
      })
    ).toBe(true)

    const multiDay = makeRequest({
      eventDate: "2026-08-30T18:00:00.000Z",
      multiDayDates: [
        { date: "2026-09-02T18:00:00.000Z" },
        { date: "2026-09-04T18:00:00.000Z" },
      ],
    })
    const rangeFilters = parseMarketplaceFilters({ dateFrom: "2026-09-01", dateTo: "2026-09-03" })
    expect(
      requestMatchesMarketplaceFilters(multiDay, rangeFilters, {
        chefRadiusKm: 50,
        marketCurrency: "GBP",
      })
    ).toBe(true)
  })

  it("honors the hard chef radius and excludes missing coordinates when narrowed", () => {
    const narrow = parseMarketplaceFilters({ radius: "5" })

    expect(
      requestMatchesMarketplaceFilters(makeRequest({ distanceKm: 8 }), narrow, {
        chefRadiusKm: 50,
        marketCurrency: "GBP",
      })
    ).toBe(false)

    expect(
      requestMatchesMarketplaceFilters(makeRequest({ distanceKm: null }), narrow, {
        chefRadiusKm: 50,
        marketCurrency: "GBP",
      })
    ).toBe(false)

    expect(
      requestMatchesMarketplaceFilters(makeRequest({ distanceKm: null }), parseMarketplaceFilters({}), {
        chefRadiusKm: 50,
        marketCurrency: "GBP",
      })
    ).toBe(true)
  })
})
