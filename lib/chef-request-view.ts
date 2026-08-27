import { getServiceTypeLabel } from "@/lib/request-options"

export type ChefRequestPhotoView = {
  id: string
  url: string
  originalName: string | null
}

export type ChefRequestMultiDayDateView = {
  id: string
  date: string
  startTime: string | null
  endTime: string | null
  serviceType: string | null
  serviceTypeLabel: string | null
  serviceTier: string | null
  cuisineTypes: string[]
  dietaryRequirements: string[]
  adultCount: number | null
  childrenUnder10: number | null
  actualAttendeeCount: number | null
  billableGuestCount: number | null
  budget: number | null
  notes: string | null
  serviceNeeds: string | null
}

export type ChefRequestView = {
  id: string
  title: string
  eventType: string | null
  requestMode: string
  serviceType: string | null
  serviceTypeLabel: string
  serviceTier: string | null
  clientName: string
  clientGreetingName: string
  location: string
  currency: string
  budget: number
  eventDate: string
  eventDates: string[]
  guestCount: number | null
  adultCount: number | null
  childrenUnder10: number | null
  actualAttendeeCount: number | null
  billableGuestCount: number | null
  pricingGuestCount: number | null
  description: string | null
  details: string | null
  cuisinePreferences: string[]
  dietaryRequirements: string[]
  serviceSpecificAnswers: Record<string, unknown> | null
  serviceSpecificAnswerSummary: string[]
  budgetMode: string | null
  totalBudget: number | null
  defaultDailyBudget: number | null
  distanceKm?: number | null
  broaderMatching?: boolean
  geocodingStatus?: string | null
  photos: ChefRequestPhotoView[]
  multiDayDates: ChefRequestMultiDayDateView[]
  createdAt?: string | null
  submittedAt?: string | null
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

function parseServiceSpecificAnswers(value: unknown): Record<string, unknown> | null {
  if (!value) return null
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch {
      return null
    }
  }

  return null
}

function formatAnswerValue(value: unknown): string | null {
  if (value == null) return null

  if (Array.isArray(value)) {
    const items = value.map((item) => formatAnswerValue(item)).filter(Boolean) as string[]
    return items.length ? items.join(", ") : null
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => {
        const formatted = formatAnswerValue(item)
        return formatted ? `${humanizeKey(key)}: ${formatted}` : null
      })
      .filter(Boolean) as string[]
    return entries.length ? entries.join("; ") : null
  }

  const text = String(value).trim()
  return text || null
}

function humanizeKey(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (character) => character.toUpperCase())
}

function getSafeClientDisplayName(client?: { firstName?: string | null; name?: string | null } | null) {
  const firstName = client?.firstName?.trim()
  if (firstName) {
    return firstName
  }

  const displayName = client?.name?.trim()
  if (!displayName || displayName.includes("@")) {
    return null
  }

  const firstToken = displayName.split(/\s+/).find(Boolean)?.trim()
  if (!firstToken || firstToken.includes("@")) {
    return null
  }

  return firstToken
}

export function getSafeClientGreetingName(client?: { firstName?: string | null; name?: string | null } | null) {
  return getSafeClientDisplayName(client) ?? "Client"
}

export function buildChefRequestView(request: any, options: {
  distanceKm?: number | null
  broaderMatching?: boolean
} = {}): ChefRequestView {
  const clientGreetingName = getSafeClientGreetingName(request.client)
  const cuisinePreferences = parseStringList(request.cuisineTypes)
  const dietaryRequirements = parseStringList(request.dietaryRequirements)
  const serviceSpecificAnswers = parseServiceSpecificAnswers(request.serviceSpecificAnswers)
  const serviceSpecificAnswerSummary = Object.entries(serviceSpecificAnswers ?? {})
    .map(([key, value]) => {
      const formatted = formatAnswerValue(value)
      return formatted ? `${humanizeKey(key)}: ${formatted}` : null
    })
    .filter(Boolean) as string[]

  return {
    id: request.id,
    title: request.title?.trim() || request.eventType || "Request",
    eventType: request.eventType ?? null,
    requestMode: request.requestMode ?? "STANDARD",
    serviceType: request.serviceType ?? null,
    serviceTypeLabel: request.serviceTypeLabel ?? getServiceTypeLabel(request.serviceType, request.serviceTypeLabel),
    serviceTier: request.serviceTier ?? null,
    clientName: clientGreetingName,
    clientGreetingName,
    location: request.formattedAddress ?? request.location,
    currency: request.currency ?? "GBP",
    budget: Number(request.budget ?? 0),
    eventDate: request.eventDate instanceof Date ? request.eventDate.toISOString() : String(request.eventDate),
    eventDates: parseStringList(request.eventDates),
    guestCount: request.guestCount ?? null,
    adultCount: request.adultCount ?? null,
    childrenUnder10: request.childrenUnder10 ?? null,
    actualAttendeeCount: request.actualAttendeeCount ?? null,
    billableGuestCount: request.billableGuestCount ?? null,
    pricingGuestCount: request.pricingGuestCount ?? null,
    description: request.description ?? null,
    details: request.details ?? null,
    cuisinePreferences,
    dietaryRequirements,
    serviceSpecificAnswers,
    serviceSpecificAnswerSummary,
    budgetMode: request.budgetMode ?? null,
    totalBudget: request.totalBudget ?? null,
    defaultDailyBudget: request.defaultDailyBudget ?? null,
    distanceKm: options.distanceKm ?? request.distanceKm ?? null,
    broaderMatching: options.broaderMatching ?? request.broaderMatching ?? false,
    geocodingStatus: request.geocodingStatus ?? null,
    photos: (request.photos ?? []).map((photo: any) => ({
      id: photo.id,
      url: photo.url,
      originalName: photo.originalName ?? null,
    })),
    multiDayDates: (request.multiDayDates ?? []).map((date: any) => ({
      id: date.id,
      date: date.date instanceof Date ? date.date.toISOString() : String(date.date),
      startTime: date.startTime ?? null,
      endTime: date.endTime ?? null,
      serviceType: date.serviceType ?? null,
      serviceTypeLabel: date.serviceTypeLabel ?? getServiceTypeLabel(date.serviceType, date.serviceTypeLabel),
      serviceTier: date.serviceTier ?? null,
      cuisineTypes: parseStringList(date.cuisineTypes),
      dietaryRequirements: parseStringList(date.dietaryRequirements),
      adultCount: date.adultCount ?? null,
      childrenUnder10: date.childrenUnder10 ?? null,
      actualAttendeeCount: date.actualAttendeeCount ?? null,
      billableGuestCount: date.billableGuestCount ?? null,
      budget: date.budget ?? null,
      notes: date.notes ?? null,
      serviceNeeds: date.serviceNeeds ?? null,
    })),
    createdAt: request.createdAt instanceof Date ? request.createdAt.toISOString() : request.createdAt ?? null,
    submittedAt: request.submittedAt instanceof Date ? request.submittedAt.toISOString() : request.submittedAt ?? null,
  }
}
