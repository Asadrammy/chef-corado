import { createHash, randomBytes } from "crypto"

export const PAYMENT_PLAN_TYPES = {
  FULL_PAYMENT: "FULL_PAYMENT",
  DEPOSIT: "DEPOSIT",
  SPLIT_BILL: "SPLIT_BILL",
} as const

export const PAYMENT_PLAN_STATUS = {
  PENDING: "PENDING",
  PARTIALLY_PAID: "PARTIALLY_PAID",
  DEPOSIT_PAID: "DEPOSIT_PAID",
  BALANCE_SCHEDULED: "BALANCE_SCHEDULED",
  BALANCE_DUE: "BALANCE_DUE",
  BALANCE_PROCESSING: "BALANCE_PROCESSING",
  BALANCE_FAILED: "BALANCE_FAILED",
  RECOVERY_REQUIRED: "RECOVERY_REQUIRED",
  BALANCE_PAID: "BALANCE_PAID",
  FULLY_PAID: "FULLY_PAID",
  CANCELLED: "CANCELLED",
  REFUNDED: "REFUNDED",
  MANUAL_REVIEW_REQUIRED: "MANUAL_REVIEW_REQUIRED",
} as const

export const PAYMENT_INSTALLMENT_KIND = {
  FULL: "FULL",
  DEPOSIT: "DEPOSIT",
  BALANCE: "BALANCE",
  SPLIT_SHARE: "SPLIT_SHARE",
  SPLIT_GUARANTOR_SHORTFALL: "SPLIT_GUARANTOR_SHORTFALL",
  ADD_GUESTS: "ADD_GUESTS",
} as const

export const PAYMENT_INSTALLMENT_STATUS = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  PAID: "PAID",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
  REFUNDED: "REFUNDED",
} as const

export const GUEST_AMENDMENT_TYPES = {
  ADD_GUESTS: "ADD_GUESTS",
  REDUCE_GUESTS: "REDUCE_GUESTS",
} as const

export const GUEST_AMENDMENT_STATUS = {
  REQUESTED: "REQUESTED",
  PENDING_PAYMENT: "PENDING_PAYMENT",
  PAID: "PAID",
  APPLIED: "APPLIED",
  MANUAL_REVIEW_REQUIRED: "MANUAL_REVIEW_REQUIRED",
  CHEF_REVIEW_REQUIRED: "CHEF_REVIEW_REQUIRED",
  CHEF_APPROVED: "CHEF_APPROVED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
  REFUND_PENDING: "REFUND_PENDING",
  REFUNDED: "REFUNDED",
} as const

export type PaymentPlanType = typeof PAYMENT_PLAN_TYPES[keyof typeof PAYMENT_PLAN_TYPES]

export const DEFAULT_FLEXIBLE_PAYMENT_WINDOW_DAYS = 35
export const CHEFACHEF_FLEXIBLE_PAYMENT_WINDOW_DAYS = 35
export const FLEXIBLE_PAYMENT_WINDOW_DAYS = CHEFACHEF_FLEXIBLE_PAYMENT_WINDOW_DAYS
export const BALANCE_DUE_DAYS_BEFORE_EVENT = 30
export const BALANCE_RETRY_INTERVAL_DAYS = 3
export const BALANCE_FINAL_RISK_WINDOW_DAYS = 7
export const MAX_BALANCE_AUTOMATED_RETRIES = Math.floor(
  (BALANCE_DUE_DAYS_BEFORE_EVENT - BALANCE_FINAL_RISK_WINDOW_DAYS - 1) / BALANCE_RETRY_INTERVAL_DAYS
)
export const STANDARD_DEPOSIT_BASIS_POINTS = 2000
export const STANDARD_DEPOSIT_PERCENT = STANDARD_DEPOSIT_BASIS_POINTS / 100
export const STANDARD_BALANCE_PERCENT = 100 - STANDARD_DEPOSIT_PERCENT
export const PAYMENT_RECOVERY_GRACE_DAYS = Number(process.env.CHEFACHEF_PAYMENT_RECOVERY_GRACE_DAYS ?? 0)
export const GUEST_REDUCTION_REFUND_WINDOW_DAYS = 7
export const CHEF_REVIEW_REDUCTION_THRESHOLD = 0.2

const MS_PER_DAY = 24 * 60 * 60 * 1000

export function toMinorUnits(amount: number | string) {
  const numeric = typeof amount === "string" ? Number(amount) : amount
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new Error("INVALID_MONEY_AMOUNT")
  }
  return Math.round((numeric + Number.EPSILON) * 100)
}

export function fromMinorUnits(amountMinor: number) {
  if (!Number.isInteger(amountMinor)) {
    throw new Error("INVALID_MINOR_UNITS")
  }
  return amountMinor / 100
}

export function splitDepositBalance(totalAmountMinor: number) {
  assertPositiveMinor(totalAmountMinor)
  const depositAmountMinor = Math.round(totalAmountMinor * STANDARD_DEPOSIT_BASIS_POINTS / 10000)
  const balanceAmountMinor = totalAmountMinor - depositAmountMinor
  return { depositAmountMinor, balanceAmountMinor }
}

export function splitEvenly(totalAmountMinor: number, shareCount: number) {
  assertPositiveMinor(totalAmountMinor)
  if (!Number.isInteger(shareCount) || shareCount < 1 || shareCount > 100) {
    throw new Error("INVALID_SHARE_COUNT")
  }

  const baseAmount = Math.floor(totalAmountMinor / shareCount)
  const remainder = totalAmountMinor % shareCount
  return Array.from({ length: shareCount }, (_, index) => baseAmount + (index < remainder ? 1 : 0))
}

export function sumMinorUnits(values: number[]) {
  return values.reduce((sum, value) => {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error("INVALID_MINOR_UNITS")
    }
    return sum + value
  }, 0)
}

export function getEarliestServiceDate(dates: Array<Date | string | null | undefined>) {
  const normalized = dates
    .filter((value): value is Date | string => Boolean(value))
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime())

  if (!normalized.length) {
    throw new Error("EVENT_DATE_REQUIRED")
  }

  return normalized[0]
}

export function getCommercialDeadlineAnchor(input: {
  eventDate: Date | string
  serviceDates?: Array<Date | string | null | undefined>
}) {
  return getEarliestServiceDate([...(input.serviceDates ?? []), input.eventDate])
}

export function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

export function daysUntil(anchorDate: Date, now = new Date()) {
  return (anchorDate.getTime() - now.getTime()) / MS_PER_DAY
}

export function getPaymentEligibility(input: {
  eventDate: Date | string
  serviceDates?: Array<Date | string | null | undefined>
  now?: Date
}) {
  const anchorDate = getCommercialDeadlineAnchor(input)
  const flexiblePaymentEligible = daysUntil(anchorDate, input.now ?? new Date()) > FLEXIBLE_PAYMENT_WINDOW_DAYS
  const balanceDueAt = addDays(anchorDate, -BALANCE_DUE_DAYS_BEFORE_EVENT)
  const availablePlanTypes: PaymentPlanType[] = flexiblePaymentEligible
    ? [PAYMENT_PLAN_TYPES.DEPOSIT, PAYMENT_PLAN_TYPES.SPLIT_BILL, PAYMENT_PLAN_TYPES.FULL_PAYMENT]
    : [PAYMENT_PLAN_TYPES.FULL_PAYMENT]

  return {
    eventAnchorDate: anchorDate,
    flexiblePaymentEligible,
    availablePlanTypes,
    mandatoryPlanType: flexiblePaymentEligible ? null : PAYMENT_PLAN_TYPES.FULL_PAYMENT,
    balanceDueAt,
    deadlineAt: balanceDueAt,
  }
}

export function getBalanceFinalRiskBoundary(eventAnchorDate: Date | string) {
  const boundary = addDays(new Date(eventAnchorDate), -BALANCE_FINAL_RISK_WINDOW_DAYS)
  boundary.setUTCHours(0, 0, 0, 0)
  return boundary
}

export function isInsideBalanceFinalRiskWindow(input: {
  eventAnchorDate: Date | string
  now?: Date
}) {
  return (input.now ?? new Date()).getTime() >= getBalanceFinalRiskBoundary(input.eventAnchorDate).getTime()
}

export function getNextBalanceRetryAt(input: {
  eventAnchorDate: Date | string
  lastAttemptAt: Date | string
}) {
  const nextRetryAt = addDays(new Date(input.lastAttemptAt), BALANCE_RETRY_INTERVAL_DAYS)
  const finalRiskBoundary = getBalanceFinalRiskBoundary(input.eventAnchorDate)
  return nextRetryAt.getTime() < finalRiskBoundary.getTime() ? nextRetryAt : null
}

export function assertPlanTypeAllowed(planType: PaymentPlanType, availablePlanTypes: PaymentPlanType[]) {
  if (!availablePlanTypes.includes(planType)) {
    throw new Error("PAYMENT_PLAN_NOT_ELIGIBLE")
  }
}

export function generateSecureToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url")
}

export function hashSecureToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

function assertPositiveMinor(amountMinor: number) {
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    throw new Error("INVALID_MINOR_UNITS")
  }
}
