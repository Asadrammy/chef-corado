/// <reference types="jest" />

import { calculateDistance, filterChefsByRadius, geocodeAddress } from "@/lib/geo"

const originalEnv = process.env

describe("Phase 1 geocoding and radius matching", () => {
  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv, GOOGLE_GEOCODING_API_KEY: "test-key" }
  })

  afterEach(() => {
    process.env = originalEnv
    jest.restoreAllMocks()
  })

  it("geocodes a UK location using the configured provider", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "OK",
        results: [{
          formatted_address: "London, UK",
          geometry: { location: { lat: 51.5074, lng: -0.1278 } },
          address_components: [
            { long_name: "London", short_name: "London", types: ["postal_town"] },
            { long_name: "England", short_name: "England", types: ["administrative_area_level_1"] },
            { long_name: "United Kingdom", short_name: "GB", types: ["country"] },
          ],
        }],
      }),
    }) as any

    await expect(geocodeAddress("London", "GB")).resolves.toMatchObject({
      latitude: 51.5074,
      longitude: -0.1278,
      city: "London",
      countryCode: "GB",
      provider: "google",
      status: "VERIFIED",
    })
  })

  it("geocodes a US location using the configured provider", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "OK",
        results: [{
          formatted_address: "New York, NY, USA",
          geometry: { location: { lat: 40.7128, lng: -74.006 } },
          address_components: [
            { long_name: "New York", short_name: "NYC", types: ["locality"] },
            { long_name: "New York", short_name: "NY", types: ["administrative_area_level_1"] },
            { long_name: "United States", short_name: "US", types: ["country"] },
          ],
        }],
      }),
    }) as any

    await expect(geocodeAddress("New York", "US")).resolves.toMatchObject({
      latitude: 40.7128,
      longitude: -74.006,
      city: "New York",
      region: "New York",
      countryCode: "US",
    })
  })

  it("returns null for invalid provider result and uses local UK fallback for provider failure", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ZERO_RESULTS", results: [] }),
    }) as any

    await expect(geocodeAddress("not a real place", "GB")).resolves.toBeNull()

    global.fetch = jest.fn().mockRejectedValue(new Error("provider unavailable")) as any
    await expect(geocodeAddress("London", "GB")).resolves.toMatchObject({
      latitude: 51.5074,
      longitude: -0.1278,
      provider: "local-uk-fallback",
      status: "APPROXIMATE",
    })
  })

  it("filters inside-radius matches and excludes outside-radius chefs", () => {
    const london = { lat: 51.5074, lon: -0.1278 }
    const nearbyLat = 51.52
    const nearbyLon = -0.12
    const farLat = 53.4808
    const farLon = -2.2426

    expect(calculateDistance(london.lat, london.lon, nearbyLat, nearbyLon)).toBeLessThan(5)
    expect(calculateDistance(london.lat, london.lon, farLat, farLon)).toBeGreaterThan(200)

    expect(
      filterChefsByRadius(
        [
          { id: "near", latitude: nearbyLat, longitude: nearbyLon, radius: 25 },
          { id: "far", latitude: farLat, longitude: farLon, radius: 25 },
          { id: "unknown", latitude: null, longitude: null, radius: 25 },
        ],
        london.lat,
        london.lon,
        25
      ).map((match) => match.id)
    ).toEqual(["near"])
  })
})
