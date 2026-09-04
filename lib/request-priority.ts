export const URGENT_REQUEST_WINDOW_DAYS = 35
export const LAST_MINUTE_MIN_HOURS = 24
export const LAST_MINUTE_MAX_HOURS = 72

export const HIGH_INTENT_WEIGHTS = {
  paymentActivity: 40,
  instantBook: 20,
  dietaryOrAllergyDetail: 10,
  kitchenOrServiceDetail: 10,
  cuisineSpecificity: 10,
  exactUkPostcode: 15,
  tightBookingWindow: 20,
  verifiedEmail: 10,
  messagingEngagement: 15,
} as const

export const DEFAULT_HIGH_INTENT_THRESHOLD = 45
export const HIGH_INTENT_THRESHOLD = DEFAULT_HIGH_INTENT_THRESHOLD

const MS_PER_HOUR = 60 * 60 * 1000
const MS_PER_DAY = 24 * MS_PER_HOUR
const UK_POSTCODE_PATTERN = /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i

export type UrgencyTier = "LAST_MINUTE" | "URGENT" | "STANDARD"

export type RequestUrgency = {
  isUrgent: boolean
  tier: UrgencyTier
  hoursUntilEvent: number | null
  daysUntilEvent: number | null
}

export type HighIntentResult = {
  score: number
  qualifiesHighIntent: boolean
  threshold: number
  signalCount: number
  internalReasons: string[]
}

export function getHighIntentThreshold() {
  const configured = Number(process.env.CHEFACHEF_HIGH_INTENT_THRESHOLD)
  if (Number.isFinite(configured) && configured > 0) {
    return Math.min(100, Math.round(configured))
  }

  return DEFAULT_HIGH_INTENT_THRESHOLD
}

function toValidDate(value?: Date | string | null) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isFinite(date.getTime()) ? date : null
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

function parseRecord(value: unknown): Record<string, unknown> {
  if (!value) return {}
  if (typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>
  if (typeof value !== "string") return {}

  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

function hasMeaningfulValue(value: unknown): boolean {
  if (value == null) return false
  if (Array.isArray(value)) return value.some(hasMeaningfulValue)
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).some(hasMeaningfulValue)
  return String(value).trim().length > 0
}

function hasActivePaymentEvidence(value: any, seen = new WeakSet<object>()): boolean {
  if (!value) return false
  if (Array.isArray(value)) return value.some((item) => hasActivePaymentEvidence(item, seen))
  if (typeof value !== "object") return false
  if (seen.has(value)) return false
  seen.add(value)

  const status = String(value.status ?? "").toUpperCase()
  const planType = String(value.planType ?? "").toUpperCase()
  const installmentStatus = String(value.paymentStatus ?? value.installmentStatus ?? "").toUpperCase()

  if ([
    "PAID",
    "HELD",
    "DEPOSIT_PAID",
    "PARTIALLY_PAID",
    "BALANCE_SCHEDULED",
    "FULLY_PAID",
    "PROCESSING",
    "SUCCEEDED",
  ].includes(status) || ["PAID", "PROCESSING", "SUCCEEDED"].includes(installmentStatus)) {
    return true
  }

  if (["DEPOSIT", "SPLIT_BILL", "FULL_PAYMENT"].includes(planType)) return true
  if (value.stripePaymentIntentId || value.stripeCheckoutSessionId || value.stripeSetupIntentId) return true
  if (Number(value.paidAmountMinor) > 0) return true

  return hasActivePaymentEvidence(value.payment, seen) ||
    hasActivePaymentEvidence(value.payments, seen) ||
    hasActivePaymentEvidence(value.paymentPlan, seen) ||
    hasActivePaymentEvidence(value.paymentPlans, seen) ||
    hasActivePaymentEvidence(value.installments, seen) ||
    hasActivePaymentEvidence(value.splitShares, seen) ||
    hasActivePaymentEvidence(value.booking, seen) ||
    hasActivePaymentEvidence(value.bookings, seen) ||
    hasActivePaymentEvidence(value.proposals, seen)
}

function hasMessagingEvidence(value: any, seen = new WeakSet<object>()): boolean {
  if (!value) return false
  if (Array.isArray(value)) return value.some((item) => hasMessagingEvidence(item, seen))
  if (typeof value !== "object") return false
  if (seen.has(value)) return false
  seen.add(value)

  const messages = value.messages ?? value.conversationMessages
  if (Array.isArray(messages) && messages.length > 0) return true
  if (Number(value.messageCount ?? value._count?.messages) > 0) return true

  return hasMessagingEvidence(value.booking, seen) ||
    hasMessagingEvidence(value.bookings, seen) ||
    hasMessagingEvidence(value.conversation, seen) ||
    hasMessagingEvidence(value.conversations, seen) ||
    hasMessagingEvidence(value.proposals, seen)
}

function hasInstantBookEvidence(request: any, explicit?: boolean) {
  return Boolean(explicit) ||
    request.requestMode === "INSTANT" ||
    request.bookingType === "INSTANT" ||
    request.instantBook === true ||
    request.isInstantBooking === true ||
    request.booking?.bookingType === "INSTANT" ||
    (Array.isArray(request.bookings) && request.bookings.some((booking: any) => booking?.bookingType === "INSTANT"))
}

export function getRequestUrgency(input: {
  eventDate?: Date | string | null
  now?: Date
}): RequestUrgency {
  const now = input.now ?? new Date()
  const eventDate = toValidDate(input.eventDate)
  if (!eventDate) {
    return {
      isUrgent: false,
      tier: "STANDARD",
      hoursUntilEvent: null,
      daysUntilEvent: null,
    }
  }

  const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / MS_PER_HOUR
  const daysUntilEvent = hoursUntilEvent / 24
  const isLastMinute = hoursUntilEvent >= LAST_MINUTE_MIN_HOURS && hoursUntilEvent <= LAST_MINUTE_MAX_HOURS
  const isUrgent = daysUntilEvent >= 0 && daysUntilEvent <= URGENT_REQUEST_WINDOW_DAYS

  return {
    isUrgent,
    tier: isLastMinute ? "LAST_MINUTE" : isUrgent ? "URGENT" : "STANDARD",
    hoursUntilEvent,
    daysUntilEvent,
  }
}

export function hasExactUkPostcode(input: {
  location?: string | null
  formattedAddress?: string | null
  countryCode?: string | null
}) {
  const countryCode = input.countryCode?.toUpperCase()
  if (countryCode && countryCode !== "GB" && countryCode !== "UK") return false
  return UK_POSTCODE_PATTERN.test([input.location, input.formattedAddress].filter(Boolean).join(" "))
}

export function evaluateHighIntent(input: {
  request: any
  now?: Date
  paymentActivity?: boolean
  instantBook?: boolean
  messagingEngagement?: boolean
}): HighIntentResult {
  const request = input.request
  const reasons: string[] = []
  let score = 0

  const add = (condition: boolean, key: keyof typeof HIGH_INTENT_WEIGHTS, reason: string) => {
    if (!condition) return
    score += HIGH_INTENT_WEIGHTS[key]
    reasons.push(reason)
  }

  const dietary = parseList(request.dietaryRequirements)
  const cuisines = parseList(request.cuisineTypes)
  const serviceAnswers = parseRecord(request.serviceSpecificAnswers)
  const urgency = getRequestUrgency({ eventDate: request.eventDate, now: input.now })
  const client = request.client ?? {}

  add(Boolean(input.paymentActivity) || hasActivePaymentEvidence(request), "paymentActivity", "payment activity")
  add(hasInstantBookEvidence(request, input.instantBook), "instantBook", "instant book path")
  add(dietary.length > 0, "dietaryOrAllergyDetail", "dietary or allergy detail")
  add(Object.values(serviceAnswers).some(hasMeaningfulValue) || Boolean(request.details?.trim()), "kitchenOrServiceDetail", "service brief detail")
  add(cuisines.length > 0, "cuisineSpecificity", "specific cuisine selected")
  add(hasExactUkPostcode(request), "exactUkPostcode", "exact UK postcode")
  add((urgency.daysUntilEvent ?? Number.POSITIVE_INFINITY) >= 2 && (urgency.daysUntilEvent ?? 0) <= 14, "tightBookingWindow", "event within 2-14 days")
  add(Boolean(client.verified), "verifiedEmail", "verified email")
  add(Boolean(input.messagingEngagement) || hasMessagingEvidence(request), "messagingEngagement", "message engagement")

  const threshold = getHighIntentThreshold()

  return {
    score,
    qualifiesHighIntent: score >= threshold,
    threshold,
    signalCount: reasons.length,
    internalReasons: reasons,
  }
}

export function getRequestPriorityRank(request: {
  urgentTier?: UrgencyTier | null
  highIntent?: boolean | null
}) {
  if (request.urgentTier === "LAST_MINUTE") return 4
  if (request.highIntent && request.urgentTier === "URGENT") return 3
  if (request.urgentTier === "URGENT") return 2
  if (request.highIntent) return 1
  return 0
}
