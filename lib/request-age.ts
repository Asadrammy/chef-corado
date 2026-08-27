const RELATIVE_UNITS = [
  { label: "month", seconds: 30 * 24 * 60 * 60 },
  { label: "week", seconds: 7 * 24 * 60 * 60 },
  { label: "day", seconds: 24 * 60 * 60 },
  { label: "hour", seconds: 60 * 60 },
  { label: "minute", seconds: 60 },
] as const

function toDate(value?: string | Date | null) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isFinite(date.getTime()) ? date : null
}

export function getCanonicalRequestSubmittedAt(input: { submittedAt?: string | Date | null; createdAt?: string | Date | null }) {
  return toDate(input.submittedAt) ?? toDate(input.createdAt)
}

export function formatSubmittedDate(value?: string | Date | null) {
  const date = toDate(value)
  if (!date) return null

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date)
}

export function formatRelativeRequestAge(value?: string | Date | null, now: Date = new Date()) {
  const date = toDate(value)
  if (!date) return null

  const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000))
  if (elapsedSeconds < 60) return "just now"

  const unit = RELATIVE_UNITS.find((candidate) => elapsedSeconds >= candidate.seconds)
  if (!unit) return "just now"

  const amount = Math.floor(elapsedSeconds / unit.seconds)
  return `${amount} ${unit.label}${amount === 1 ? "" : "s"} ago`
}
