import {
  getEarliestUpcomingRequestEventAt,
  sortChefMarketplaceRequests,
  type SortableChefRequest,
} from "../../lib/chef-request-marketplace"
import { calculateDistance } from "../../lib/geo"

const now = new Date("2026-08-17T12:00:00.000Z")

const request = (overrides: Partial<SortableChefRequest>): SortableChefRequest => ({
  id: overrides.id ?? "request",
  title: overrides.title ?? overrides.id ?? "Request",
  eventDate: Object.prototype.hasOwnProperty.call(overrides, "eventDate") ? overrides.eventDate : "2026-09-01T12:00:00.000Z",
  createdAt: Object.prototype.hasOwnProperty.call(overrides, "createdAt") ? overrides.createdAt : "2026-08-01T12:00:00.000Z",
  multiDayDates: Object.prototype.hasOwnProperty.call(overrides, "multiDayDates") ? overrides.multiDayDates : [],
  budget: overrides.budget ?? 1000,
  distanceKm: overrides.distanceKm,
})

describe("chef request marketplace sorting", () => {
  it("sorts newest by submitted request timestamp, not event date", () => {
    const sorted = sortChefMarketplaceRequests([
      request({ id: "older-created-later-event", createdAt: "2026-08-10T10:00:00.000Z", eventDate: "2026-08-20T12:00:00.000Z" }),
      request({ id: "newer-created-earlier-event", createdAt: "2026-08-16T10:00:00.000Z", eventDate: "2026-08-18T12:00:00.000Z" }),
    ], "newest", { now })

    expect(sorted.map((item) => item.id)).toEqual(["newer-created-earlier-event", "older-created-later-event"])
  })

  it("sorts event date by closest upcoming date with past and missing dates last", () => {
    const sorted = sortChefMarketplaceRequests([
      request({ id: "far", eventDate: "2026-10-01T12:00:00.000Z" }),
      request({ id: "past", eventDate: "2026-08-01T12:00:00.000Z" }),
      request({ id: "near", eventDate: "2026-08-18T12:00:00.000Z" }),
      request({ id: "missing", eventDate: null }),
    ], "event-date", { now })

    expect(sorted.map((item) => item.id)).toEqual(["near", "far", "missing", "past"])
  })

  it("uses the earliest upcoming multi-day service date", () => {
    const multiDay = request({
      id: "multi-day",
      eventDate: "2026-08-01T12:00:00.000Z",
      multiDayDates: [
        "2026-08-01T12:00:00.000Z",
        "2026-08-19T12:00:00.000Z",
        "2026-08-21T12:00:00.000Z",
      ],
    })

    expect(new Date(getEarliestUpcomingRequestEventAt(multiDay, now)!).toISOString()).toBe("2026-08-19T12:00:00.000Z")

    const sorted = sortChefMarketplaceRequests([
      request({ id: "single", eventDate: "2026-08-20T12:00:00.000Z" }),
      multiDay,
    ], "event-date", { now })

    expect(sorted.map((item) => item.id)).toEqual(["multi-day", "single"])
  })

  it("sorts closest by real geographic distance and leaves missing coordinates last", () => {
    const chefLat = 51.5072
    const chefLon = -0.1276
    const westminsterDistance = Math.round(calculateDistance(chefLat, chefLon, 51.4995, -0.1248) * 10) / 10
    const manchesterDistance = Math.round(calculateDistance(chefLat, chefLon, 53.4808, -2.2426) * 10) / 10

    const sorted = sortChefMarketplaceRequests([
      request({ id: "unknown", distanceKm: null }),
      request({ id: "manchester", distanceKm: manchesterDistance }),
      request({ id: "westminster", distanceKm: westminsterDistance }),
    ], "closest", { now })

    expect(westminsterDistance).toBeLessThan(manchesterDistance)
    expect(sorted.map((item) => item.id)).toEqual(["westminster", "manchester", "unknown"])
  })

  it("sorts client opportunity budget high-to-low and low-to-high", () => {
    const requests = [
      request({ id: "mid", budget: 1200 }),
      request({ id: "low", budget: 400 }),
      request({ id: "high", budget: 2500 }),
    ]

    expect(sortChefMarketplaceRequests(requests, "budget-high", { now }).map((item) => item.id)).toEqual(["high", "mid", "low"])
    expect(sortChefMarketplaceRequests(requests, "budget-low", { now }).map((item) => item.id)).toEqual(["low", "mid", "high"])
  })
})
