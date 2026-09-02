import { calculateDistance } from "@/lib/geo"
import { prisma } from "@/lib/prisma"

export type ChefRequestMatchingCandidate = {
  id: string
  userId: string
  latitude: number | null
  longitude: number | null
  radius: number
  user: {
    name?: string | null
    email?: string | null
  }
  menus?: Array<{
    cuisineType?: string | null
    eventType?: string | null
  }>
  experiences?: Array<{
    serviceType?: string | null
    cuisineType?: string | null
    eventType?: string | null
    minGuests?: number | null
    maxGuests?: number | null
  }>
}

export type ChefRequestMatchingRequest = {
  id: string
  requestMode?: string | null
  serviceType?: string | null
  cuisineTypes?: unknown
  eventDate: string | Date
  eventDates?: unknown
  multiDayDates?: Array<{ date?: string | Date | null; serviceType?: string | null; cuisineTypes?: unknown; dietaryRequirements?: unknown }>
  latitude?: number | null
  longitude?: number | null
  guestCount?: number | null
  actualAttendeeCount?: number | null
  billableGuestCount?: number | null
  pricingGuestCount?: number | null
  countryCode?: string | null
}

export type ChefRequestMatchEligibility = {
  eligible: boolean
  local: boolean
  distanceKm: number | null
  reasons: string[]
}

function parseStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }

  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return []

    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean)
      }
    } catch {
      return trimmed.split(",").map((item) => item.trim()).filter(Boolean)
    }
  }

  return []
}

function toDateKey(value: string | Date) {
  return new Date(value).toISOString().slice(0, 10)
}

function buildChefText(chef: ChefRequestMatchingCandidate) {
  return [
    chef.user?.name,
    ...(chef.menus ?? []).flatMap((menu) => [menu.cuisineType, menu.eventType]),
    ...(chef.experiences ?? []).flatMap((experience) => [experience.serviceType, experience.cuisineType, experience.eventType]),
  ].filter(Boolean).join(" ").toLowerCase()
}

function getRequestedServiceTypes(request: ChefRequestMatchingRequest) {
  if (request.requestMode === "MULTI_DAY") {
    return [...new Set((request.multiDayDates ?? []).map((date) => date.serviceType).filter(Boolean) as string[])]
  }

  return request.serviceType ? [request.serviceType] : []
}

function getRequestedCuisineTerms(request: ChefRequestMatchingRequest) {
  if (request.requestMode === "MULTI_DAY") {
    return [...new Set((request.multiDayDates ?? []).flatMap((date) => parseStringList(date.cuisineTypes)).map((value) => value.toLowerCase()))]
  }

  return parseStringList(request.cuisineTypes).map((value) => value.toLowerCase())
}

function getRequestedDateKeys(request: ChefRequestMatchingRequest) {
  if (request.requestMode === "MULTI_DAY" && (request.multiDayDates ?? []).length > 0) {
    return [...new Set((request.multiDayDates ?? []).map((date) => date.date).filter(Boolean).map((date) => toDateKey(date as string | Date)))].sort()
  }

  if (Array.isArray(request.eventDates) && request.eventDates.length > 0) {
    return [...new Set(request.eventDates.filter(Boolean).map((date) => toDateKey(date as string | Date)))].sort()
  }

  return request.eventDate ? [toDateKey(request.eventDate)] : []
}

async function hasAvailabilityConflict(chefId: string, dateKeys: string[]) {
  if (dateKeys.length === 0) return false

  const availability = await prisma.availability.findMany({
    where: {
      chefId,
      date: { in: dateKeys.map((date) => new Date(date)) },
    },
    select: {
      date: true,
      isAvailable: true,
      currentBookings: true,
      maxBookings: true,
    },
  })

  return availability.some((slot) => !slot.isAvailable || slot.currentBookings >= slot.maxBookings)
}

export async function evaluateChefRequestMatch(
  request: ChefRequestMatchingRequest,
  chef: ChefRequestMatchingCandidate & { baseCountryCode?: string | null },
  options: { enforceRadius?: boolean; enforceMarket?: boolean } = {}
): Promise<ChefRequestMatchEligibility> {
  const enforceRadius = options.enforceRadius ?? true
  const enforceMarket = options.enforceMarket ?? false
  const reasons: string[] = []
  const requestedServiceTypes = getRequestedServiceTypes(request)
  const requestedCuisineTerms = getRequestedCuisineTerms(request)
  const requestedDateKeys = getRequestedDateKeys(request)

  if (enforceMarket && request.countryCode && chef.baseCountryCode && request.countryCode !== chef.baseCountryCode) {
    reasons.push("MARKET_MISMATCH")
  }

  if (enforceRadius && (chef.latitude == null || chef.longitude == null || chef.radius <= 0)) {
    reasons.push("CHEF_LOCATION_UNAVAILABLE")
  }

  if (enforceRadius && (request.latitude == null || request.longitude == null)) {
    reasons.push("REQUEST_LOCATION_UNAVAILABLE")
  }

  let distanceKm: number | null = null
  let local = false
  if (
    request.latitude != null &&
    request.longitude != null &&
    chef.latitude != null &&
    chef.longitude != null &&
    chef.radius > 0
  ) {
    distanceKm = calculateDistance(request.latitude, request.longitude, chef.latitude, chef.longitude)
    local = distanceKm <= chef.radius
    if (enforceRadius && !local) {
      reasons.push("OUTSIDE_SERVICE_RADIUS")
    }
  }

  const chefText = buildChefText(chef)
  const chefExperiences = chef.experiences ?? []
  if (requestedServiceTypes.length > 0 && chefExperiences.length > 0) {
    const hasServiceMatch = request.requestMode === "MULTI_DAY"
      ? requestedServiceTypes.every((serviceType) =>
          chefExperiences.some((experience) => experience.serviceType === serviceType) ||
          chefText.includes(serviceType.toLowerCase().replaceAll("_", " "))
        )
      : requestedServiceTypes.some((serviceType) =>
          chefExperiences.some((experience) => experience.serviceType === serviceType) ||
          chefText.includes(serviceType.toLowerCase().replaceAll("_", " "))
        )

    if (!hasServiceMatch) {
      reasons.push("SERVICE_MISMATCH")
    }
  }

  if (requestedCuisineTerms.length > 0 && chefText) {
    const hasCuisineMatch = requestedCuisineTerms.some((cuisine) => chefText.includes(cuisine))
    if (!hasCuisineMatch) {
      reasons.push("CUISINE_MISMATCH")
    }
  }

  const pricingGuestCount = request.pricingGuestCount ?? request.billableGuestCount ?? request.actualAttendeeCount ?? request.guestCount
  const hasGuestCapacityConflict = chefExperiences.some((experience) =>
    requestedServiceTypes.some((serviceType) => experience.serviceType === serviceType) &&
    ((experience.minGuests != null && pricingGuestCount != null && pricingGuestCount < experience.minGuests) ||
      (experience.maxGuests != null && pricingGuestCount != null && pricingGuestCount > experience.maxGuests))
  )

  if (hasGuestCapacityConflict) {
    reasons.push("GUEST_CAPACITY_MISMATCH")
  }

  if (await hasAvailabilityConflict(chef.id, requestedDateKeys)) {
    reasons.push("AVAILABILITY_CONFLICT")
  }

  return {
    eligible: reasons.length === 0,
    local,
    distanceKm,
    reasons,
  }
}

export function getChefRequestDistanceKm(
  requestLatitude: number,
  requestLongitude: number,
  chefLatitude: number,
  chefLongitude: number
) {
  return calculateDistance(requestLatitude, requestLongitude, chefLatitude, chefLongitude)
}

export async function filterEligibleChefsForRequest(
  request: ChefRequestMatchingRequest,
  chefs: ChefRequestMatchingCandidate[]
) {
  const chefsWithoutAvailabilityConflicts: ChefRequestMatchingCandidate[] = []
  for (const chef of chefs) {
    const result = await evaluateChefRequestMatch(request, chef, { enforceRadius: true })
    if (result.eligible) {
      chefsWithoutAvailabilityConflicts.push(chef)
    }
  }

  return chefsWithoutAvailabilityConflicts
}
