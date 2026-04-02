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

// Get coordinates from address using geocoding API (mock implementation)
export async function geocodeAddress(address: string): Promise<{
  latitude: number;
  longitude: number;
} | null> {
  try {
    // Validate input
    if (!address || typeof address !== 'string' || address.trim().length === 0) {
      console.warn('Invalid address provided for geocoding:', address)
      return null
    }

    // In a real application, you would use a geocoding service like Google Maps API
    // For demo purposes, we'll return mock coordinates for common cities
    const mockCoordinates: Record<string, { latitude: number; longitude: number }> = {
      'new york': { latitude: 40.7128, longitude: -74.0060 },
      'los angeles': { latitude: 34.0522, longitude: -118.2437 },
      'chicago': { latitude: 41.8781, longitude: -87.6298 },
      'houston': { latitude: 29.7604, longitude: -95.3698 },
      'phoenix': { latitude: 33.4484, longitude: -112.0740 },
      'philadelphia': { latitude: 39.9526, longitude: -75.1652 },
      'san antonio': { latitude: 29.4241, longitude: -98.4936 },
      'san diego': { latitude: 32.7157, longitude: -117.1611 },
      'dallas': { latitude: 32.7767, longitude: -96.7970 },
      'san jose': { latitude: 37.3382, longitude: -121.8863 },
    };

    const normalizedAddress = address.toLowerCase().trim();
    for (const [city, coords] of Object.entries(mockCoordinates)) {
      if (normalizedAddress.includes(city)) {
        return coords;
      }
    }

    // Default to New York if no match found (safe fallback)
    console.warn('No coordinates found for address, defaulting to New York:', address)
    return mockCoordinates['new york'];
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
    .filter(chef => chef.latitude && chef.longitude)
    .map(chef => ({
      id: chef.id,
      distance: calculateDistance(centerLat, centerLon, chef.latitude!, chef.longitude!),
    }))
    .filter(result => result.distance <= searchRadius);
}
