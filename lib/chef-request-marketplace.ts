export type ChefRequestSortKey =
  | "newest"
  | "event-date"
  | "closest"
  | "budget-high"
  | "budget-low"
  | "match-score"

export type SortableChefRequest = {
  id: string
  title?: string | null
  eventDate?: string | Date | null
  createdAt?: string | Date | null
  submittedAt?: string | Date | null
  activityAt?: string | Date | null
  multiDayDates?: Array<unknown>
  budget: number
  distanceKm?: number | null
}

function toTime(value?: string | Date | null) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  const time = date.getTime()
  return Number.isFinite(time) ? time : null
}

function extractDateValue(value: unknown) {
  if (value instanceof Date || typeof value === "string") {
    return value
  }

  if (value && typeof value === "object" && "date" in value) {
    const date = (value as { date?: unknown }).date
    if (date instanceof Date || typeof date === "string") {
      return date
    }
  }

  return null
}

function compareNullableNumber(a: number | null | undefined, b: number | null | undefined, direction: "asc" | "desc") {
  const aValid = typeof a === "number" && Number.isFinite(a)
  const bValid = typeof b === "number" && Number.isFinite(b)
  if (!aValid && !bValid) return 0
  if (!aValid) return 1
  if (!bValid) return -1
  return direction === "asc" ? a - b : b - a
}

function tieBreak(a: SortableChefRequest, b: SortableChefRequest) {
  return (a.title || a.id).localeCompare(b.title || b.id) || a.id.localeCompare(b.id)
}

export function getRequestSubmittedAt(request: SortableChefRequest) {
  return toTime(request.activityAt) ?? toTime(request.submittedAt) ?? toTime(request.createdAt)
}

export function getEarliestUpcomingRequestEventAt(request: SortableChefRequest, now: Date = new Date()) {
  const nowTime = now.getTime()
  const serviceDateTimes = (request.multiDayDates ?? [])
    .map((date) => toTime(extractDateValue(date)))
    .filter((time): time is number => typeof time === "number")
    .sort((a, b) => a - b)

  const upcomingServiceDate = serviceDateTimes.find((time) => time >= nowTime)
  if (upcomingServiceDate != null) return upcomingServiceDate

  const primaryEventDate = toTime(request.eventDate)
  if (primaryEventDate != null && primaryEventDate >= nowTime) return primaryEventDate

  return null
}

export function sortChefMarketplaceRequests<T extends SortableChefRequest>(
  requests: T[],
  sortBy: ChefRequestSortKey,
  options: { now?: Date; getMatchScore?: (request: T) => number | null | undefined } = {}
) {
  const now = options.now ?? new Date()

  return [...requests].sort((a, b) => {
    switch (sortBy) {
      case "match-score": {
        const matchScoreSort = compareNullableNumber(options.getMatchScore?.(b), options.getMatchScore?.(a), "asc")
        return matchScoreSort || tieBreak(a, b)
      }
      case "budget-high":
        return b.budget - a.budget || tieBreak(a, b)
      case "budget-low":
        return a.budget - b.budget || tieBreak(a, b)
      case "event-date":
        return (
          compareNullableNumber(getEarliestUpcomingRequestEventAt(a, now), getEarliestUpcomingRequestEventAt(b, now), "asc") ||
          compareNullableNumber(getRequestSubmittedAt(b), getRequestSubmittedAt(a), "asc") ||
          tieBreak(a, b)
        )
      case "closest":
        return compareNullableNumber(a.distanceKm, b.distanceKm, "asc") || tieBreak(a, b)
      case "newest":
      default:
        return compareNullableNumber(getRequestSubmittedAt(b), getRequestSubmittedAt(a), "asc") || tieBreak(a, b)
    }
  })
}
