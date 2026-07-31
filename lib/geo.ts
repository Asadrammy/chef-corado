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

export type GeocodeStatus = "VERIFIED" | "UNAVAILABLE" | "PROVIDER_ERROR"

export type GeocodeResult = {
  latitude: number
  longitude: number
  formattedAddress?: string
  city?: string
  region?: string
  countryCode?: string
  provider: string
  status: "VERIFIED"
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
      return null
    }

    return await provider.geocode(address, countryCode)
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
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
