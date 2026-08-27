import { getServiceTypeLabel } from "@/lib/request-options"
import { ProposalStatus } from "@/types"
import { formatRelativeRequestAge, formatSubmittedDate, getCanonicalRequestSubmittedAt } from "@/lib/request-age"

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
  locationCity?: string | null
  formattedAddress?: string | null
  latitude?: number | null
  longitude?: number | null
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
  activityAt?: string | null
  submittedDateLabel?: string | null
  submittedAgeLabel?: string | null
  totalProposalCount?: number | null
  maxProposalCount?: number | null
  perPersonBudget?: number | null
}

export type ChefRespondedRequestView = ChefRequestView & {
  proposal: {
    id: string
    price: number
    currency: string
    status: string
    statusLabel: string
    createdAt: string
    sentDateLabel: string | null
    sentAgeLabel: string | null
    message: string | null
  }
  detailHref: string
  followUpHref: string | null
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

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

export function getRequestGuestCount(request: any) {
  const actualAttendeeCount = Number(request.actualAttendeeCount)
  if (Number.isFinite(actualAttendeeCount) && actualAttendeeCount > 0) {
    return actualAttendeeCount
  }

  const guestCount = Number(request.guestCount)
  if (Number.isFinite(guestCount) && guestCount > 0) {
    return guestCount
  }

  return null
}

export function getRequestPerPersonBudget(request: any) {
  const pricingGuestCount = Number(request.pricingGuestCount)
  const totalBudget = Number(request.totalBudget ?? request.budget)
  if (!Number.isFinite(pricingGuestCount) || pricingGuestCount <= 0 || !Number.isFinite(totalBudget) || totalBudget <= 0) {
    return null
  }

  return roundMoney(totalBudget / pricingGuestCount)
}

export function formatChefProposalStatusLabel(status?: string | null) {
  switch (status) {
    case ProposalStatus.PENDING:
      return "Awaiting Client Decision"
    case ProposalStatus.ACCEPTED_PENDING_PAYMENT:
      return "Accepted - Payment Pending"
    case ProposalStatus.ACCEPTED:
      return "Accepted"
    case ProposalStatus.REJECTED:
      return "Rejected"
    case ProposalStatus.BOOKED:
      return "Booked"
    case ProposalStatus.EXPIRED:
      return "Expired"
    case ProposalStatus.WITHDRAWN:
      return "Withdrawn"
    default:
      return status ? humanizeKey(status) : "Proposal Sent"
  }
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
    locationCity: request.locationCity ?? null,
    formattedAddress: request.formattedAddress ?? null,
    latitude: request.latitude ?? null,
    longitude: request.longitude ?? null,
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
    activityAt: request.activityAt instanceof Date ? request.activityAt.toISOString() : request.activityAt ?? null,
    submittedDateLabel: formatSubmittedDate(getCanonicalRequestSubmittedAt(request)),
    submittedAgeLabel: formatRelativeRequestAge(getCanonicalRequestSubmittedAt(request)),
    totalProposalCount: request.totalProposalCount ?? request._count?.proposals ?? null,
    maxProposalCount: 10,
    perPersonBudget: getRequestPerPersonBudget(request),
  }
}

export function buildChefRespondedRequestView(proposal: any, options: {
  distanceKm?: number | null
  broaderMatching?: boolean
} = {}): ChefRespondedRequestView {
  const requestView = buildChefRequestView(proposal.request, options)
  const createdAt = proposal.createdAt instanceof Date ? proposal.createdAt.toISOString() : String(proposal.createdAt)
  const clientId = proposal.request?.clientId

  return {
    ...requestView,
    proposal: {
      id: proposal.id,
      price: Number(proposal.price ?? 0),
      currency: proposal.currency ?? requestView.currency,
      status: proposal.status ?? ProposalStatus.PENDING,
      statusLabel: formatChefProposalStatusLabel(proposal.status),
      createdAt,
      sentDateLabel: formatSubmittedDate(proposal.createdAt),
      sentAgeLabel: formatRelativeRequestAge(proposal.createdAt),
      message: proposal.message ?? null,
    },
    activityAt: createdAt,
    detailHref: `/dashboard/chef/requests/${requestView.id}`,
    followUpHref: clientId ? `/dashboard/chef/messages/${clientId}` : null,
  }
}
