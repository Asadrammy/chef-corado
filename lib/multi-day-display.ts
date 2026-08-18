import { formatCurrency } from "@/lib/currency"

export type MultiDayDateLike = {
  date?: Date | string | null
  startTime?: string | null
  endTime?: string | null
  serviceType?: string | null
  serviceTypeLabel?: string | null
  cuisineTypes?: string | string[] | null
  dietaryRequirements?: string | string[] | null
  adultCount?: number | null
  childrenUnder10?: number | null
  actualAttendeeCount?: number | null
  billableGuestCount?: number | null
  budget?: number | string | null
  notes?: string | null
}

export type ProposalLineItemLike = {
  serviceDate?: Date | string | null
  title?: string | null
  description?: string | null
  price?: number | string | null
  currency?: string | null
}

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
})

const longDateFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
})

function toDate(value?: Date | string | null) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function toDateKey(value?: Date | string | null) {
  const date = toDate(value)
  return date ? date.toISOString().slice(0, 10) : ""
}

export function parseJsonList(value?: string | string[] | null): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean)

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string" && entry.length > 0) : []
  } catch {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
  }
}

export function sortServiceDates<T extends MultiDayDateLike>(dates?: T[] | null): T[] {
  return [...(dates ?? [])].sort((a, b) => toDateKey(a.date).localeCompare(toDateKey(b.date)))
}

export function isMultiDayRequestLike(request?: { requestMode?: string | null; multiDayDates?: MultiDayDateLike[] | null } | null) {
  return request?.requestMode === "MULTI_DAY" || Boolean(request?.multiDayDates?.length)
}

export function getStructuredServiceDates(input?: {
  serviceDates?: MultiDayDateLike[] | null
  proposal?: {
    request?: {
      multiDayDates?: MultiDayDateLike[] | null
    } | null
  } | null
} | null) {
  const bookingDates = sortServiceDates(input?.serviceDates)
  if (bookingDates.length > 0) return bookingDates

  return sortServiceDates(input?.proposal?.request?.multiDayDates)
}

export function formatShortDate(value?: Date | string | null) {
  const date = toDate(value)
  return date ? dateFormatter.format(date) : "Not specified"
}

export function formatLongDate(value?: Date | string | null) {
  const date = toDate(value)
  return date ? longDateFormatter.format(date) : "Not specified"
}

export function formatServiceTime(day: MultiDayDateLike) {
  if (day.startTime && day.endTime) return `${day.startTime} - ${day.endTime}`
  return day.startTime || "Time TBD"
}

export function formatGuestSummary(day: MultiDayDateLike) {
  const adults = day.adultCount ?? 0
  const children = day.childrenUnder10 ?? 0
  const actual = day.actualAttendeeCount ?? adults + children
  const billable = day.billableGuestCount
  return billable != null
    ? `${actual} attendees (${billable} billable)`
    : `${actual} attendees`
}

export function formatServiceDateSummary(dates?: MultiDayDateLike[] | null, fallback?: Date | string | null) {
  const sorted = sortServiceDates(dates)
  if (sorted.length === 0) return formatShortDate(fallback)
  if (sorted.length === 1) return formatShortDate(sorted[0].date)

  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  return `${formatShortDate(first.date)} - ${formatShortDate(last.date)} · ${sorted.length} selected days`
}

export function formatServiceDatesCompact(dates?: MultiDayDateLike[] | null, fallback?: Date | string | null) {
  const sorted = sortServiceDates(dates)
  if (sorted.length <= 1) return formatServiceDateSummary(sorted, fallback)

  const firstFour = sorted.slice(0, 4).map((day) => formatShortDate(day.date))
  const suffix = sorted.length > firstFour.length ? ` + ${sorted.length - firstFour.length} more` : ""
  return `${sorted.length} service days: ${firstFour.join(", ")}${suffix}`
}

export function getServiceDateCountLabel(dates?: MultiDayDateLike[] | null) {
  const count = dates?.length ?? 0
  return `${count} service day${count === 1 ? "" : "s"}`
}

export function formatBudgetMode(value?: string | null) {
  if (value === "PER_DAY") return "Budget per day"
  if (value === "TOTAL_EVENT") return "Total budget for all days"
  return "Budget"
}

export function formatLineItemTotal(lineItems?: ProposalLineItemLike[] | null, fallback?: number | string | null, currency = "GBP") {
  const items = lineItems ?? []
  if (items.length === 0) {
    const amount = Number(fallback ?? 0)
    return formatCurrency(Number.isNaN(amount) ? 0 : amount, currency)
  }

  const total = items.reduce((sum, item) => {
    const amount = Number(item.price ?? 0)
    return sum + (Number.isNaN(amount) ? 0 : amount)
  }, 0)

  return formatCurrency(total, currency)
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

export function renderMultiDayEmailDetails({
  serviceDates,
  currency,
  budgetMode,
}: {
  serviceDates?: MultiDayDateLike[] | null
  currency?: string | null
  budgetMode?: string | null
}) {
  const sorted = sortServiceDates(serviceDates)
  if (sorted.length === 0) return ""

  const rows = sorted.map((day) => {
    const cuisines = parseJsonList(day.cuisineTypes).join(", ") || "Open to suggestions"
    const dietary = parseJsonList(day.dietaryRequirements).join(", ") || "None specified"
    const budget = day.budget != null && day.budget !== ""
      ? `<p><strong>Budget:</strong> ${formatCurrency(Number(day.budget), currency ?? "GBP")}</p>`
      : ""

    return `
      <div style="border-top: 1px solid #e5e7eb; padding-top: 12px; margin-top: 12px;">
        <p style="margin: 0 0 6px;"><strong>${escapeHtml(formatLongDate(day.date))}</strong> · ${escapeHtml(formatServiceTime(day))}</p>
        <p><strong>Service:</strong> ${escapeHtml(day.serviceTypeLabel || day.serviceType || "Service TBD")}</p>
        <p><strong>Cuisines:</strong> ${escapeHtml(cuisines)}</p>
        <p><strong>Dietary:</strong> ${escapeHtml(dietary)}</p>
        <p><strong>Guests:</strong> ${escapeHtml(formatGuestSummary(day))}</p>
        ${budget}
        ${day.notes ? `<p><strong>Notes:</strong> ${escapeHtml(day.notes)}</p>` : ""}
      </div>
    `
  }).join("")

  return `
    <div style="background: #fff7ed; border: 1px solid #fed7aa; padding: 16px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #9a3412;">Multi-Day Chef Hire</h3>
      <p><strong>${sorted.length} service day${sorted.length === 1 ? "" : "s"}</strong></p>
      ${budgetMode ? `<p><strong>Budget mode:</strong> ${escapeHtml(formatBudgetMode(budgetMode))}</p>` : ""}
      ${rows}
    </div>
  `
}

export function renderProposalLineItemsEmail(lineItems?: ProposalLineItemLike[] | null, currency = "GBP") {
  const items = [...(lineItems ?? [])].sort((a, b) => toDateKey(a.serviceDate).localeCompare(toDateKey(b.serviceDate)))
  if (items.length === 0) return ""

  const rows = items.map((item) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(formatShortDate(item.serviceDate))}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(item.title || "Service day")}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(item.description || "")}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(Number(item.price ?? 0), item.currency ?? currency)}</td>
    </tr>
  `).join("")

  return `
    <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
      <thead>
        <tr>
          <th style="padding: 8px; text-align: left;">Date</th>
          <th style="padding: 8px; text-align: left;">Service</th>
          <th style="padding: 8px; text-align: left;">Notes</th>
          <th style="padding: 8px; text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `
}
