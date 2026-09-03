import type { ChefRequestSortKey } from "@/lib/chef-request-marketplace"
import { getRequestPerPersonBudget, getRequestGuestCount } from "@/lib/chef-request-view"

export type ChefMarketplaceTab = "requests" | "responded"

export type ChefMarketplaceFilters = {
  tab: ChefMarketplaceTab
  search: string
  budgetMin: number | null
  budgetMax: number | null
  perPersonMin: number | null
  perPersonMax: number | null
  guestsMin: number | null
  guestsMax: number | null
  dateFrom: string | null
  dateTo: string | null
  radiusKm: number | null
  earlyAccessOnly: boolean
  directOnly: boolean
  beFirstOnly: boolean
  urgentOnly: boolean
  lastMinuteOnly: boolean
  highIntentOnly: boolean
  mapNorth: number | null
  mapSouth: number | null
  mapEast: number | null
  mapWest: number | null
  sort: ChefRequestSortKey
  page: number
  limit: number
}

export type MarketplaceFilterSubject = {
  id: string
  title?: string | null
  details?: string | null
  location?: string | null
  locationCity?: string | null
  formattedAddress?: string | null
  eventType?: string | null
  serviceTypeLabel?: string | null
  cuisinePreferences?: string[]
  dietaryRequirements?: string[]
  eventDate?: string | Date | null
  eventDates?: string[]
  multiDayDates?: Array<{ date?: string | Date | null }>
  budget?: number
  totalBudget?: number | null
  currency?: string | null
  guestCount?: number | null
  actualAttendeeCount?: number | null
  billableGuestCount?: number | null
  pricingGuestCount?: number | null
  createdAt?: string | Date | null
  submittedAt?: string | Date | null
  distanceKm?: number | null
  broaderMatching?: boolean
  latitude?: number | null
  longitude?: number | null
  clientName?: string | null
  earlyAccess?: boolean
  directRequest?: boolean
  beFirstToRespond?: boolean
  urgent?: boolean
  urgentTier?: "LAST_MINUTE" | "URGENT" | "STANDARD" | null
  highIntent?: boolean
}

const DEFAULT_LIMIT = 12
const DEFAULT_SORT: ChefRequestSortKey = "newest"
const DEFAULT_TAB: ChefMarketplaceTab = "requests"

function readValue(input: Record<string, string | string[] | undefined>, key: string) {
  const value = input[key]
  return Array.isArray(value) ? value[0] : value
}

function toNumber(value: string | undefined, min?: number, max?: number) {
  if (!value || value.trim() === "") return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  const rounded = Math.round(parsed * 100) / 100
  if (min != null && rounded < min) return min
  if (max != null && rounded > max) return max
  return rounded
}

function toInteger(value: string | undefined, min: number, max: number, fallback: number) {
  if (!value || value.trim() === "") return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

function toTab(value: string | undefined): ChefMarketplaceTab {
  return value === "responded" ? "responded" : DEFAULT_TAB
}

function toSort(value: string | undefined): ChefRequestSortKey {
  if (value === "event-date" || value === "closest" || value === "budget-high" || value === "budget-low" || value === "match-score" || value === "urgent" || value === "high-intent") {
    return value
  }
  return DEFAULT_SORT
}

function normalizeDate(value: string | undefined | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? value.slice(0, 10) : null
}

function toBoolean(value: string | undefined) {
  return value === "1" || value === "true"
}

function toLatitude(value: string | undefined) {
  return toNumber(value, -90, 90)
}

function toLongitude(value: string | undefined) {
  return toNumber(value, -180, 180)
}

export function parseMarketplaceFilters(input: Record<string, string | string[] | undefined>): ChefMarketplaceFilters {
  const dateFrom = normalizeDate(readValue(input, "dateFrom") ?? readValue(input, "date"))
  const dateTo = normalizeDate(readValue(input, "dateTo") ?? readValue(input, "date"))

  const parsed: ChefMarketplaceFilters = {
    tab: toTab(readValue(input, "tab")),
    search: (readValue(input, "search") ?? "").trim(),
    budgetMin: toNumber(readValue(input, "budgetMin"), 0),
    budgetMax: toNumber(readValue(input, "budgetMax"), 0),
    perPersonMin: toNumber(readValue(input, "ppMin"), 0),
    perPersonMax: toNumber(readValue(input, "ppMax"), 0),
    guestsMin: toNumber(readValue(input, "guestsMin"), 1),
    guestsMax: toNumber(readValue(input, "guestsMax"), 1),
    dateFrom,
    dateTo,
    radiusKm: toNumber(readValue(input, "radius"), 0),
    earlyAccessOnly: toBoolean(readValue(input, "earlyAccess")),
    directOnly: toBoolean(readValue(input, "direct")),
    beFirstOnly: toBoolean(readValue(input, "beFirst")),
    urgentOnly: toBoolean(readValue(input, "urgent")),
    lastMinuteOnly: toBoolean(readValue(input, "lastMinute")),
    highIntentOnly: toBoolean(readValue(input, "highIntent")),
    mapNorth: toLatitude(readValue(input, "north")),
    mapSouth: toLatitude(readValue(input, "south")),
    mapEast: toLongitude(readValue(input, "east")),
    mapWest: toLongitude(readValue(input, "west")),
    sort: toSort(readValue(input, "sort")),
    page: toInteger(readValue(input, "page"), 1, 999, 1),
    limit: toInteger(readValue(input, "limit"), 6, 48, DEFAULT_LIMIT),
  }

  if (parsed.budgetMin != null && parsed.budgetMax != null && parsed.budgetMin > parsed.budgetMax) {
    parsed.budgetMax = parsed.budgetMin
  }

  if (parsed.perPersonMin != null && parsed.perPersonMax != null && parsed.perPersonMin > parsed.perPersonMax) {
    parsed.perPersonMax = parsed.perPersonMin
  }

  if (parsed.guestsMin != null && parsed.guestsMax != null && parsed.guestsMin > parsed.guestsMax) {
    parsed.guestsMax = parsed.guestsMin
  }

  if (parsed.dateFrom && parsed.dateTo && parsed.dateFrom > parsed.dateTo) {
    parsed.dateTo = parsed.dateFrom
  }

  return parsed
}

export function getMarketplaceActiveFilterCount(filters: ChefMarketplaceFilters) {
  return [
    filters.search,
    filters.budgetMin,
    filters.budgetMax,
    filters.perPersonMin,
    filters.perPersonMax,
    filters.guestsMin,
    filters.guestsMax,
    filters.dateFrom,
    filters.dateTo,
    filters.radiusKm != null && filters.radiusKm > 0 ? filters.radiusKm : null,
    filters.earlyAccessOnly ? "earlyAccess" : null,
    filters.directOnly ? "direct" : null,
    filters.beFirstOnly ? "beFirst" : null,
    filters.urgentOnly ? "urgent" : null,
    filters.lastMinuteOnly ? "lastMinute" : null,
    filters.highIntentOnly ? "highIntent" : null,
    filters.mapNorth != null && filters.mapSouth != null && filters.mapEast != null && filters.mapWest != null ? "mapBounds" : null,
  ].filter((value) => value != null && value !== "").length
}

function parseList(value: unknown): string[] {
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

function getServiceDateKeys(request: MarketplaceFilterSubject) {
  if ((request.multiDayDates ?? []).length > 0) {
    return (request.multiDayDates ?? [])
      .map((date) => date.date)
      .filter((date): date is string | Date => Boolean(date))
      .map((date) => toDateKey(date))
  }

  if (request.eventDates?.length) {
    return request.eventDates.map((date) => toDateKey(date))
  }

  if (request.eventDate) {
    return [toDateKey(request.eventDate)]
  }

  return []
}

function matchesDateFilter(request: MarketplaceFilterSubject, filters: ChefMarketplaceFilters) {
  if (!filters.dateFrom && !filters.dateTo) return true

  const keys = getServiceDateKeys(request)
  if (keys.length === 0) return false

  const from = filters.dateFrom ?? filters.dateTo
  const to = filters.dateTo ?? filters.dateFrom
  if (!from || !to) {
    return keys.some((key) => key === (from ?? to))
  }

  return keys.some((key) => key >= from && key <= to)
}

function matchesRadiusFilter(request: MarketplaceFilterSubject, filters: ChefMarketplaceFilters, chefRadiusKm: number) {
  if (request.broaderMatching && filters.radiusKm == null) return true

  const effectiveRadius = Math.min(filters.radiusKm ?? chefRadiusKm, chefRadiusKm)
  if (effectiveRadius <= 0) return false
  if (request.distanceKm == null) {
    return (filters.radiusKm ?? chefRadiusKm) >= chefRadiusKm
  }

  return request.distanceKm <= effectiveRadius
}

function getSearchableText(request: MarketplaceFilterSubject) {
  return [
    request.title,
    request.details,
    request.location,
    request.locationCity,
    request.formattedAddress,
    request.eventType,
    request.serviceTypeLabel,
    ...(request.cuisinePreferences ?? []),
    ...(request.dietaryRequirements ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
}

function matchesBudgetFilter(request: MarketplaceFilterSubject, filters: ChefMarketplaceFilters, marketCurrency?: string | null) {
  if (filters.budgetMin == null && filters.budgetMax == null) return true
  if (marketCurrency && request.currency && request.currency !== marketCurrency) return false

  const budget = Number(request.budget ?? request.totalBudget ?? 0)
  if (!Number.isFinite(budget)) return false

  if (filters.budgetMin != null && budget < filters.budgetMin) return false
  if (filters.budgetMax != null && budget > filters.budgetMax) return false
  return true
}

function matchesPerPersonFilter(request: MarketplaceFilterSubject, filters: ChefMarketplaceFilters, marketCurrency?: string | null) {
  if (filters.perPersonMin == null && filters.perPersonMax == null) return true
  if (marketCurrency && request.currency && request.currency !== marketCurrency) return false

  const perPerson = getRequestPerPersonBudget(request)
  if (perPerson == null) return false
  if (filters.perPersonMin != null && perPerson < filters.perPersonMin) return false
  if (filters.perPersonMax != null && perPerson > filters.perPersonMax) return false
  return true
}

function matchesGuestFilter(request: MarketplaceFilterSubject, filters: ChefMarketplaceFilters) {
  if (filters.guestsMin == null && filters.guestsMax == null) return true

  const guests = getRequestGuestCount(request)
  if (guests == null) return false
  if (filters.guestsMin != null && guests < filters.guestsMin) return false
  if (filters.guestsMax != null && guests > filters.guestsMax) return false
  return true
}

function matchesSearchFilter(request: MarketplaceFilterSubject, filters: ChefMarketplaceFilters) {
  if (!filters.search) return true
  const text = getSearchableText(request)
  if (!text) return false
  const tokens = filters.search
    .toLowerCase()
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean)

  return tokens.every((token) => text.includes(token))
}

function matchesSpotlightFilters(request: MarketplaceFilterSubject, filters: ChefMarketplaceFilters) {
  if (filters.earlyAccessOnly && !request.earlyAccess) return false
  if (filters.directOnly && !request.directRequest) return false
  if (filters.beFirstOnly && !request.beFirstToRespond) return false
  if (filters.urgentOnly && !request.urgent) return false
  if (filters.lastMinuteOnly && request.urgentTier !== "LAST_MINUTE") return false
  if (filters.highIntentOnly && !request.highIntent) return false
  return true
}

function matchesMapBoundsFilter(request: MarketplaceFilterSubject, filters: ChefMarketplaceFilters) {
  if (filters.mapNorth == null || filters.mapSouth == null || filters.mapEast == null || filters.mapWest == null) return true
  if (request.latitude == null || request.longitude == null) return false
  if (request.latitude > filters.mapNorth || request.latitude < filters.mapSouth) return false
  if (request.longitude < filters.mapWest || request.longitude > filters.mapEast) return false
  return true
}

export function requestMatchesMarketplaceFilters(
  request: MarketplaceFilterSubject,
  filters: ChefMarketplaceFilters,
  options: {
    chefRadiusKm: number
    marketCurrency?: string | null
  }
) {
  if (!matchesSearchFilter(request, filters)) return false
  if (!matchesBudgetFilter(request, filters, options.marketCurrency)) return false
  if (!matchesPerPersonFilter(request, filters, options.marketCurrency)) return false
  if (!matchesGuestFilter(request, filters)) return false
  if (!matchesDateFilter(request, filters)) return false
  if (!matchesRadiusFilter(request, filters, options.chefRadiusKm)) return false
  if (!matchesSpotlightFilters(request, filters)) return false
  if (!matchesMapBoundsFilter(request, filters)) return false

  return true
}
