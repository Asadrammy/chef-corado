import { prisma } from "@/lib/prisma"

export const PLATFORM_PUBLIC_LIABILITY_COVERAGE_LIMIT_MINOR = 500_000_000
export const PLATFORM_PUBLIC_LIABILITY_CURRENCY = "GBP"
export const PLATFORM_PUBLIC_LIABILITY_TYPE = "PUBLIC_LIABILITY"
export const PLATFORM_INSURANCE_POLICY_VERSION = "platform-public-liability-2026-08-client-confirmed"

type Tx = any

type ServiceDateLike = {
  id?: string | null
  date: Date
  startTime?: string | null
  endTime?: string | null
  serviceType?: string | null
  serviceTypeLabel?: string | null
  sortOrder?: number | null
}

function startOfServiceDay(date: Date) {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  return value
}

function endOfServiceDay(date: Date) {
  const value = new Date(date)
  value.setHours(23, 59, 59, 999)
  return value
}

function normalizeServiceDates(booking: { eventDate: Date; serviceDates?: ServiceDateLike[] }) {
  const dates = booking.serviceDates?.length
    ? booking.serviceDates
    : [{ date: booking.eventDate, sortOrder: 0 }]

  return dates
    .filter((item) => item.date instanceof Date && Number.isFinite(item.date.getTime()))
    .sort((a, b) => a.date.getTime() - b.date.getTime() || (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
}

function buildServiceDateSnapshot(serviceDates: ServiceDateLike[]) {
  return serviceDates.map((item, index) => ({
    id: item.id ?? null,
    date: item.date.toISOString(),
    startTime: item.startTime ?? null,
    endTime: item.endTime ?? null,
    serviceType: item.serviceType ?? null,
    serviceTypeLabel: item.serviceTypeLabel ?? null,
    sortOrder: item.sortOrder ?? index,
  }))
}

function hasPlatformPaymentEvidence(booking: {
  payments?: { status: string } | null
  paymentPlan?: { paidAmountMinor: number; status: string } | null
}) {
  if (booking.payments && ["PAID", "RELEASED"].includes(booking.payments.status)) {
    return true
  }

  if (booking.paymentPlan && booking.paymentPlan.paidAmountMinor > 0 && booking.paymentPlan.status !== "PENDING") {
    return true
  }

  return false
}

async function ensureActivePlatformPolicy(tx: Tx = prisma) {
  return tx.platformInsurancePolicy.upsert({
    where: { policyVersion: PLATFORM_INSURANCE_POLICY_VERSION },
    update: {
      coverageType: PLATFORM_PUBLIC_LIABILITY_TYPE,
      coverageLimitMinor: PLATFORM_PUBLIC_LIABILITY_COVERAGE_LIMIT_MINOR,
      currency: PLATFORM_PUBLIC_LIABILITY_CURRENCY,
      status: "ACTIVE",
    },
    create: {
      policyVersion: PLATFORM_INSURANCE_POLICY_VERSION,
      coverageType: PLATFORM_PUBLIC_LIABILITY_TYPE,
      coverageLimitMinor: PLATFORM_PUBLIC_LIABILITY_COVERAGE_LIMIT_MINOR,
      currency: PLATFORM_PUBLIC_LIABILITY_CURRENCY,
      status: "ACTIVE",
    },
  })
}

export const bookingInsuranceService = {
  async ensureCoverageForBooking(
    bookingId: string,
    options: {
      tx?: Tx
      qualificationBasis?: string
      performedBy?: string
    } = {}
  ) {
    const tx = options.tx ?? prisma
    const existing = await tx.bookingInsuranceCoverage.findUnique({ where: { bookingId } })
    if (existing) return existing

    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        payments: { select: { status: true } },
        paymentPlan: { select: { paidAmountMinor: true, status: true } },
        serviceDates: { orderBy: [{ date: "asc" }, { sortOrder: "asc" }] },
      },
    })

    if (!booking) {
      throw new Error("BOOKING_NOT_FOUND")
    }

    if (!["CONFIRMED", "COMPLETED"].includes(booking.status)) {
      throw new Error(`BOOKING_NOT_INSURANCE_QUALIFIED:${booking.status}`)
    }

    if (!hasPlatformPaymentEvidence(booking)) {
      throw new Error("BOOKING_NOT_INSURANCE_QUALIFIED:NO_PLATFORM_PAYMENT")
    }

    const serviceDates = normalizeServiceDates(booking)
    if (!serviceDates.length) {
      throw new Error("BOOKING_NOT_INSURANCE_QUALIFIED:NO_SERVICE_DATES")
    }

    const policy = await ensureActivePlatformPolicy(tx)
    const coverage = await tx.bookingInsuranceCoverage.create({
      data: {
        bookingId: booking.id,
        chefId: booking.chefId,
        platformPolicyId: policy.id,
        policyVersion: policy.policyVersion,
        coverageType: policy.coverageType,
        coverageLimitMinor: policy.coverageLimitMinor,
        currency: policy.currency,
        coverageStatus: "QUALIFIED",
        coverageStartAt: startOfServiceDay(serviceDates[0].date),
        coverageEndAt: endOfServiceDay(serviceDates[serviceDates.length - 1].date),
        qualificationBasis: options.qualificationBasis ?? "OFFICIAL_PLATFORM_BOOKING_PAYMENT_CONFIRMED",
        serviceDateSnapshot: buildServiceDateSnapshot(serviceDates),
      },
    })

    await tx.auditLog.create({
      data: {
        action: "BOOKING_INSURANCE_COVERAGE_CREATED",
        entityType: "BookingInsuranceCoverage",
        entityId: coverage.id,
        oldValue: null,
        newValue: JSON.stringify({
          bookingId: booking.id,
          chefId: booking.chefId,
          policyVersion: coverage.policyVersion,
          coverageLimitMinor: coverage.coverageLimitMinor,
          currency: coverage.currency,
          coverageStatus: coverage.coverageStatus,
        }),
        performedBy: options.performedBy ?? "SYSTEM",
        reason: "Internal platform public liability coverage association for qualifying official ChefaChef booking.",
      },
    })

    return coverage
  },

  async markCoverageStatusForBooking(
    bookingId: string,
    coverageStatus: string,
    options: { tx?: Tx; performedBy?: string; reason?: string } = {}
  ) {
    const tx = options.tx ?? prisma
    const existing = await tx.bookingInsuranceCoverage.findUnique({ where: { bookingId } })
    if (!existing || existing.coverageStatus === coverageStatus) return existing

    const updated = await tx.bookingInsuranceCoverage.update({
      where: { bookingId },
      data: { coverageStatus },
    })

    await tx.auditLog.create({
      data: {
        action: "BOOKING_INSURANCE_COVERAGE_STATUS_CHANGED",
        entityType: "BookingInsuranceCoverage",
        entityId: updated.id,
        oldValue: JSON.stringify({ coverageStatus: existing.coverageStatus }),
        newValue: JSON.stringify({ coverageStatus }),
        performedBy: options.performedBy ?? "SYSTEM",
        reason: options.reason ?? "Booking insurance coverage status updated.",
      },
    })

    return updated
  },
}
