// Haversine formula to calculate distance between two points on Earth
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export type GeocodeStatus = "VERIFIED" | "APPROXIMATE" | "UNAVAILABLE" | "PROVIDER_ERROR"

export type GeocodeResult = {
  latitude: number
  longitude: number
  formattedAddress?: string
  city?: string
  region?: string
  countryCode?: string
  provider: string
  status: "VERIFIED" | "APPROXIMATE"
}

type GeocodingProvider = {
  name: string
  geocode(address: string, countryCode?: string): Promise<GeocodeResult | null>
}

export function parseCoordinatesFromLocation(address: string): {
  latitude: number
  longitude: number
} | null {
  const match = address.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/)
  if (!match) return null

  const latitude = Number(match[1])
  const longitude = Number(match[2])

  if (
    Number.isNaN(latitude) ||
    Number.isNaN(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null
  }

  return { latitude, longitude }
}

export function normalizeAddress(address: string, countryCode?: string): string {
  return [address, countryCode].filter(Boolean).join(", ").replace(/\s+/g, " ").trim()
}

function getGoogleApiKey() {
  return process.env.GOOGLE_GEOCODING_API_KEY || process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
}

function componentValue(components: any[], type: string, short = false) {
  const component = components.find((item) => Array.isArray(item.types) && item.types.includes(type))
  return component ? (short ? component.short_name : component.long_name) : undefined
}

function createGoogleGeocodingProvider(): GeocodingProvider | null {
  const apiKey = getGoogleApiKey()

  if (!apiKey || apiKey.includes("placeholder")) {
    return null
  }

  return {
    name: "google",
    async geocode(address: string, countryCode?: string) {
      const url = new URL("https://maps.googleapis.com/maps/api/geocode/json")
      url.searchParams.set("address", normalizeAddress(address, countryCode))
      url.searchParams.set("key", apiKey)
      if (countryCode) {
        url.searchParams.set("components", `country:${countryCode}`)
      }

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`GOOGLE_GEOCODING_HTTP_${response.status}`)
      }

      const payload = await response.json()
      if (payload.status !== "OK" || !Array.isArray(payload.results) || payload.results.length === 0) {
        return null
      }

      const result = payload.results[0]
      const location = result.geometry?.location
      if (!location || typeof location.lat !== "number" || typeof location.lng !== "number") {
        return null
      }

      const components = result.address_components ?? []
      return {
        latitude: location.lat,
        longitude: location.lng,
        formattedAddress: result.formatted_address,
        city:
          componentValue(components, "locality") ??
          componentValue(components, "postal_town") ??
          componentValue(components, "administrative_area_level_2"),
        region: componentValue(components, "administrative_area_level_1"),
        countryCode: componentValue(components, "country", true),
        provider: "google",
        status: "VERIFIED",
      }
    },
  }
}

function getGeocodingProvider(): GeocodingProvider | null {
  return createGoogleGeocodingProvider()
}

const UK_LOCATION_FALLBACKS: Record<string, { latitude: number; longitude: number; city: string; region?: string }> = {
  london: { latitude: 51.5074, longitude: -0.1278, city: "London", region: "England" },
  westminster: { latitude: 51.4975, longitude: -0.1357, city: "London", region: "England" },
  chelsea: { latitude: 51.4875, longitude: -0.1687, city: "London", region: "England" },
  kensington: { latitude: 51.4991, longitude: -0.1938, city: "London", region: "England" },
  manchester: { latitude: 53.4808, longitude: -2.2426, city: "Manchester", region: "England" },
  birmingham: { latitude: 52.4862, longitude: -1.8904, city: "Birmingham", region: "England" },
  leeds: { latitude: 53.8008, longitude: -1.5491, city: "Leeds", region: "England" },
  liverpool: { latitude: 53.4084, longitude: -2.9916, city: "Liverpool", region: "England" },
  bristol: { latitude: 51.4545, longitude: -2.5879, city: "Bristol", region: "England" },
  sheffield: { latitude: 53.3811, longitude: -1.4701, city: "Sheffield", region: "England" },
  nottingham: { latitude: 52.9548, longitude: -1.1581, city: "Nottingham", region: "England" },
  cardiff: { latitude: 51.4816, longitude: -3.1791, city: "Cardiff", region: "Wales" },
  edinburgh: { latitude: 55.9533, longitude: -3.1883, city: "Edinburgh", region: "Scotland" },
  glasgow: { latitude: 55.8642, longitude: -4.2518, city: "Glasgow", region: "Scotland" },
  belfast: { latitude: 54.5973, longitude: -5.9301, city: "Belfast", region: "Northern Ireland" },
  oxford: { latitude: 51.752, longitude: -1.2577, city: "Oxford", region: "England" },
  cambridge: { latitude: 52.2053, longitude: 0.1218, city: "Cambridge", region: "England" },
}

const LONDON_POSTCODE_AREA_PATTERN = /\b(?:E|EC|N|NW|SE|SW|W|WC)\d{1,2}[A-Z]?\b/i

function geocodeWithLocalFallback(address: string, countryCode?: string): GeocodeResult | null {
  const normalizedCountry = countryCode?.toUpperCase()
  const normalizedAddress = address.toLowerCase()

  if (normalizedCountry && normalizedCountry !== "GB" && normalizedCountry !== "UK") {
    return null
  }

  const postcodeArea = address.match(LONDON_POSTCODE_AREA_PATTERN)
  if (postcodeArea) {
    const fallback = UK_LOCATION_FALLBACKS.london
    return {
      ...fallback,
      countryCode: "GB",
      formattedAddress: normalizeAddress(address, countryCode),
      provider: "local-uk-fallback",
      status: "APPROXIMATE",
    }
  }

  const match = Object.entries(UK_LOCATION_FALLBACKS).find(([key]) => normalizedAddress.includes(key))
  if (!match) {
    return null
  }

  const fallback = match[1]
  return {
    ...fallback,
    countryCode: "GB",
    formattedAddress: normalizeAddress(address, countryCode),
    provider: "local-uk-fallback",
    status: "APPROXIMATE",
  }
}

// Get coordinates only when a safe deterministic source or configured provider is available.
export async function geocodeAddress(address: string, countryCode?: string): Promise<GeocodeResult | null> {
  try {
    if (!address || typeof address !== 'string' || address.trim().length === 0) {
      console.warn('Invalid address provided for geocoding:', address)
      return null
    }

    const parsedCoordinates = parseCoordinatesFromLocation(address)
    if (parsedCoordinates) {
      return {
        ...parsedCoordinates,
        provider: "coordinates",
        status: "VERIFIED",
        formattedAddress: normalizeAddress(address, countryCode),
        countryCode,
      }
    }

    const provider = getGeocodingProvider()
    if (!provider) {
      return geocodeWithLocalFallback(address, countryCode)
    }

    return (await provider.geocode(address, countryCode)) ?? geocodeWithLocalFallback(address, countryCode)
  } catch (error) {
    console.error('Error geocoding address:', error);
    return geocodeWithLocalFallback(address, countryCode);
  }
}

// Filter chefs within a given radius from a point
export function filterChefsByRadius(
  chefs: Array<{
    id: string;
    latitude?: number | null;
    longitude?: number | null;
    radius: number;
  }>,
  centerLat: number,
  centerLon: number,
  searchRadius: number
): Array<{ id: string; distance: number }> {
  return chefs
    .filter(chef => chef.latitude != null && chef.longitude != null)
    .map(chef => ({
      id: chef.id,
      distance: calculateDistance(centerLat, centerLon, chef.latitude!, chef.longitude!),
    }))
    .filter(result => result.distance <= searchRadius);
}
