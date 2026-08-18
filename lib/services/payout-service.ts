import { payoutRepository } from "@/lib/repositories/payout-repository"
import { ledgerService } from "@/lib/services/ledger-service"
import { logStateTransition } from "@/lib/utils/state-machine"
import { generateIdempotencyKey } from "@/lib/utils/idempotency"
import { logger } from "@/lib/logger"
import { prisma } from "@/lib/prisma"
import { PLATFORM_COMMISSION_PERCENT } from "@/lib/marketplace-rules"
import { getStripeService, StripeService } from "@/lib/services/stripe-service"
import type { Prisma } from "@prisma/client"

type PayoutAction = "approve" | "process" | "pay" | "complete" | "fail" | "cancel" | "retry"
type CurrencyBalance = {
  currency: string
  availableBalance: number
  pendingEarnings: number
  totalEarnings: number
  totalPaidOut: number
  totalPendingPayouts: number
  completedBookings: number
}

type ChefPaymentSummary = {
  bookingId: string
  reference: string
  title: string
  serviceTypeLabel: string | null
  requestMode: string | null
  countryCode: string | null
  eventDate: Date
  transactionDate: Date
  currency: string
  customerPayment: number
  platformCommission: number
  commissionRatePercent: number
  serviceChargeTaxRate: number | null
  serviceChargeTaxAmount: number
  serviceChargeTaxStatus: string | null
  serviceChargeTaxDeductionEnabled: boolean
  totalPlatformDeduction: number
  taxJurisdiction: string | null
  chefPayout: number
  paymentStatus: string
  payoutEligibilityStatus: string
}

type PayoutStatusUpdateInput = {
  action: PayoutAction
  externalReference?: string
  adminNotes?: string
  failureReason?: string
  processedBy?: string
}

// Payout state machine constants
const PAYOUT_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  PROCESSING: "PROCESSING",
  PAID: "PAID",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
  FROZEN: "FROZEN",
  ONBOARDING_REQUIRED: "ONBOARDING_REQUIRED",
} as const

const PAYOUT_STATE_TRANSITIONS: Record<string, string[]> = {
  [PAYOUT_STATUS.PENDING]: [PAYOUT_STATUS.APPROVED, PAYOUT_STATUS.CANCELLED, PAYOUT_STATUS.FROZEN, PAYOUT_STATUS.FAILED, PAYOUT_STATUS.ONBOARDING_REQUIRED],
  [PAYOUT_STATUS.APPROVED]: [PAYOUT_STATUS.PROCESSING, PAYOUT_STATUS.CANCELLED, PAYOUT_STATUS.FAILED, PAYOUT_STATUS.ONBOARDING_REQUIRED],
  [PAYOUT_STATUS.PROCESSING]: [PAYOUT_STATUS.PAID, PAYOUT_STATUS.FAILED, PAYOUT_STATUS.ONBOARDING_REQUIRED],
  [PAYOUT_STATUS.FROZEN]: [PAYOUT_STATUS.PENDING], // Can unfreeze
  [PAYOUT_STATUS.ONBOARDING_REQUIRED]: [PAYOUT_STATUS.PENDING, PAYOUT_STATUS.PROCESSING, PAYOUT_STATUS.CANCELLED],
  [PAYOUT_STATUS.PAID]: [], // Terminal state
  [PAYOUT_STATUS.CANCELLED]: [], // Terminal state
  [PAYOUT_STATUS.FAILED]: [PAYOUT_STATUS.PENDING], // Can retry
} as const

const activePayoutStatuses = ["PENDING", "APPROVED", "PROCESSING", "FROZEN", "ONBOARDING_REQUIRED"]
const paidPayoutStatuses = ["PAID", "COMPLETED"]

function getEmptyBalance(currency: string): CurrencyBalance {
  return {
    currency,
    availableBalance: 0,
    pendingEarnings: 0,
    totalEarnings: 0,
    totalPaidOut: 0,
    totalPendingPayouts: 0,
    completedBookings: 0,
  }
}

function roundMoney(value: number) {
  return Number(value.toFixed(2))
}

function canTransition(currentStatus: string, nextStatus: string) {
  if ((currentStatus === PAYOUT_STATUS.PAID || currentStatus === PAYOUT_STATUS.CANCELLED) && currentStatus === nextStatus) {
    return false
  }

  const allowedTransitions = PAYOUT_STATE_TRANSITIONS[currentStatus] || []
  return allowedTransitions.includes(nextStatus) || currentStatus === nextStatus
}

async function verifyChefPayoutReadiness(chef: {
  stripeAccountId?: string | null
  stripeOnboardingComplete?: boolean | null
}) {
  if (!chef.stripeAccountId) {
    return { ready: false, reason: "STRIPE_CONNECT_ONBOARDING_REQUIRED" }
  }

  if (!StripeService.isConfigured()) {
    return { ready: false, reason: "STRIPE_CONNECT_VERIFICATION_UNAVAILABLE" }
  }

  const account = await getStripeService().retrieveConnectAccount(chef.stripeAccountId)
  if (!account.details_submitted || !account.payouts_enabled) {
    return { ready: false, reason: "STRIPE_CONNECT_ONBOARDING_REQUIRED" }
  }

  return { ready: true, reason: null }
}

export const payoutService = {
  async createPayout(userId: string, amount: number, currency?: string) {
    const chefProfile = await payoutRepository.findChefProfile(userId)

    if (!chefProfile) {
      throw new Error("CHEF_PROFILE_NOT_FOUND")
    }

    if (!chefProfile.isApproved) {
      throw new Error("CHEF_NOT_APPROVED")
    }

    const normalizedCurrency = (currency || chefProfile.preferredCurrency || "GBP").toUpperCase()
    const balance = await this.getPayoutBalance(userId)
    const selectedBalance = balance.balancesByCurrency.find((item: CurrencyBalance) => item.currency === normalizedCurrency)
    const availableBalance = selectedBalance?.availableBalance ?? 0

    if (amount > availableBalance) {
      throw new Error(`INSUFFICIENT_BALANCE:${normalizedCurrency}:${availableBalance.toFixed(2)}`)
    }

    const existingActivePayout = await payoutRepository.listPayouts({
      chefId: chefProfile.id,
      amount,
      currency: normalizedCurrency,
      status: { in: ["PENDING", "APPROVED", "PROCESSING", "FROZEN"] },
    })

    if (existingActivePayout.length > 0) {
      throw new Error("DUPLICATE_ACTIVE_PAYOUT")
    }

    const idempotencyKey = generateIdempotencyKey("MANUAL_PAYOUT_REQUEST", chefProfile.id, { amount, currency: normalizedCurrency })
    return payoutRepository.createPayout(chefProfile.id, amount, normalizedCurrency, idempotencyKey)
  },

  async getPayoutBalance(userId: string) {
    const chefProfile = await payoutRepository.findChefProfile(userId)

    if (!chefProfile) {
      throw new Error("CHEF_PROFILE_NOT_FOUND")
    }

    const balances = new Map<string, CurrencyBalance>()
    const ensureBalance = (currency?: string | null) => {
      const normalizedCurrency = (currency || chefProfile.preferredCurrency || "GBP").toUpperCase()
      if (!balances.has(normalizedCurrency)) {
        balances.set(normalizedCurrency, getEmptyBalance(normalizedCurrency))
      }
      return balances.get(normalizedCurrency)!
    }

    const completedBookings = await payoutRepository.getCompletedBookingsWithPayments(chefProfile.id)

    completedBookings.forEach((booking) => {
      const payment = booking.payments
      if (!payment || (payment.status !== "PAID" && payment.status !== "RELEASED")) return

      const balance = ensureBalance(payment.currency)
      balance.totalEarnings = roundMoney(balance.totalEarnings + payment.chefAmount)
      balance.completedBookings += 1
    })

    const paidPayouts = await payoutRepository.listPayouts({
      chefId: chefProfile.id,
      status: { in: paidPayoutStatuses },
    })

    paidPayouts.forEach((payout) => {
      const balance = ensureBalance(payout.currency)
      balance.totalPaidOut = roundMoney(balance.totalPaidOut + payout.amount)
    })

    const pendingPayouts = await payoutRepository.listPayouts({
      chefId: chefProfile.id,
      status: { in: activePayoutStatuses },
    })

    pendingPayouts.forEach((payout) => {
      const balance = ensureBalance(payout.currency)
      balance.totalPendingPayouts = roundMoney(balance.totalPendingPayouts + payout.amount)
    })

    ensureBalance(chefProfile.preferredCurrency)

    const paymentSummaries: ChefPaymentSummary[] = (await payoutRepository.getPaidBookingPaymentSummaries(chefProfile.id))
      .map((booking) => {
        const payment = booking.payments
        const currency = (payment?.currency || booking.currency || chefProfile.preferredCurrency || "GBP").toUpperCase()
        const title = booking.proposal?.request?.title || booking.location || `Booking ${booking.id}`
        const paymentStatus = payment?.status || "UNKNOWN"

        return {
          bookingId: booking.id,
          reference: booking.id,
          title,
          serviceTypeLabel: booking.serviceTypeLabel || booking.proposal?.request?.serviceTypeLabel || null,
          requestMode: booking.proposal?.request?.requestMode || booking.bookingType || null,
          countryCode: booking.proposal?.request?.countryCode || null,
          eventDate: booking.eventDate,
          transactionDate: payment?.createdAt || booking.createdAt,
          currency,
          customerPayment: roundMoney(payment?.totalAmount ?? booking.totalPrice ?? 0),
          platformCommission: roundMoney(payment?.commissionAmount ?? 0),
          commissionRatePercent: PLATFORM_COMMISSION_PERCENT,
          serviceChargeTaxRate: payment?.serviceChargeTaxRate ?? null,
          serviceChargeTaxAmount: roundMoney(payment?.serviceChargeTaxAmount ?? 0),
          serviceChargeTaxStatus: payment?.serviceChargeTaxStatus ?? null,
          serviceChargeTaxDeductionEnabled: Boolean(payment?.serviceChargeTaxDeductionEnabled),
          totalPlatformDeduction: roundMoney(payment?.totalPlatformDeduction ?? payment?.commissionAmount ?? 0),
          taxJurisdiction: payment?.taxJurisdiction ?? null,
          chefPayout: roundMoney(payment?.chefAmount ?? 0),
          paymentStatus,
          payoutEligibilityStatus: paymentStatus === "RELEASED" ? "Released for payout" : "Paid / awaiting completion or payout release",
        }
      })

    const balancesByCurrency = Array.from(balances.values()).map((balance) => ({
      ...balance,
      availableBalance: Math.max(0, roundMoney(balance.totalEarnings - balance.totalPaidOut - balance.totalPendingPayouts)),
    }))
    const primaryCurrency = (chefProfile.preferredCurrency || balancesByCurrency[0]?.currency || "GBP").toUpperCase()
    const primaryBalance = balancesByCurrency.find((balance) => balance.currency === primaryCurrency) ?? balancesByCurrency[0] ?? getEmptyBalance(primaryCurrency)

    return {
      currency: primaryBalance.currency,
      availableBalance: primaryBalance.availableBalance,
      pendingEarnings: primaryBalance.pendingEarnings,
      totalEarnings: primaryBalance.totalEarnings,
      completedBookings: primaryBalance.completedBookings,
      balancesByCurrency,
      paymentSummaries,
      multiCurrencyNotice: "Balances are separated by currency and are not combined without an approved FX conversion source.",
    }
  },

  async listPayouts(chefId?: string, status?: string) {
    const where: Prisma.PayoutWhereInput = {}
    if (chefId) where.chefId = chefId
    if (status) where.status = status

    return payoutRepository.listPayouts(where)
  },

  async listPayoutsForUser(userId: string, status?: string) {
    const chefProfile = await payoutRepository.findChefProfile(userId)
    if (!chefProfile) {
      throw new Error("CHEF_PROFILE_NOT_FOUND")
    }

    return this.listPayouts(chefProfile.id, status)
  },

  async getPayoutById(id: string) {
    const payout = await payoutRepository.findPayoutById(id)
    if (!payout) {
      throw new Error("PAYOUT_NOT_FOUND")
    }
    return payout
  },

  async updatePayoutStatus(id: string, input: PayoutStatusUpdateInput) {
    const payout = await payoutRepository.findPayoutById(id)
    if (!payout) {
      throw new Error("PAYOUT_NOT_FOUND")
    }

    // Validate state transition
    let newStatus: string
    switch (input.action) {
      case "approve":
        newStatus = PAYOUT_STATUS.APPROVED
        break
      case "process":
        newStatus = PAYOUT_STATUS.PROCESSING
        break
      case "pay":
      case "complete":
        newStatus = PAYOUT_STATUS.PAID
        break
      case "fail":
        newStatus = PAYOUT_STATUS.FAILED
        break
      case "cancel":
        newStatus = PAYOUT_STATUS.CANCELLED
        break
      case "retry":
        newStatus = PAYOUT_STATUS.PENDING
        break
      default:
        throw new Error("INVALID_ACTION")
    }

    if (newStatus === PAYOUT_STATUS.PAID && !input.externalReference) {
      throw new Error("EXTERNAL_REFERENCE_REQUIRED")
    }

    if (!canTransition(payout.status, newStatus)) {
      throw new Error(`INVALID_PAYOUT_TRANSITION:${payout.status}->${newStatus}`)
    }

    if (newStatus === PAYOUT_STATUS.PAID) {
      let readiness
      try {
        readiness = await verifyChefPayoutReadiness(payout.chef)
      } catch (error) {
        logger.error("[PAYOUT] Stripe Connect payout readiness verification failed", { payoutId: id, error })
        readiness = { ready: false, reason: "STRIPE_CONNECT_VERIFICATION_FAILED" }
      }

      if (!readiness.ready) {
        await prisma.$transaction(async (tx) => {
          const currentPayout = await tx.payout.findUnique({
            where: { id },
            select: { id: true, status: true },
          })

          if (!currentPayout) {
            throw new Error("PAYOUT_NOT_FOUND")
          }

          if (!canTransition(currentPayout.status, PAYOUT_STATUS.ONBOARDING_REQUIRED)) {
            throw new Error(`INVALID_PAYOUT_TRANSITION:${currentPayout.status}->${PAYOUT_STATUS.ONBOARDING_REQUIRED}`)
          }

          await tx.payout.update({
            where: { id },
            data: {
              status: PAYOUT_STATUS.ONBOARDING_REQUIRED,
              adminNotes: input.adminNotes ?? "Complete Stripe onboarding to receive payout.",
              failureReason: readiness.reason,
              processedBy: input.processedBy,
            },
          })

          await tx.auditLog.create({
            data: {
              action: "PAYOUT_ONBOARDING_REQUIRED",
              entityType: "Payout",
              entityId: id,
              oldValue: JSON.stringify({ status: currentPayout.status }),
              newValue: JSON.stringify({ status: PAYOUT_STATUS.ONBOARDING_REQUIRED, reason: readiness.reason }),
              performedBy: input.processedBy || "SYSTEM",
              reason: "Payout release held until Stripe Connect onboarding is complete.",
            },
          })
        })

        throw new Error("PAYOUT_ONBOARDING_REQUIRED")
      }
    }

    // Use transaction for atomic update with state transition logging
    const updatedPayout = await prisma.$transaction(async (tx) => {
      // Optimistic locking check
      const currentPayout = await tx.payout.findUnique({
        where: { id },
        select: { id: true, status: true, amount: true, chefId: true, processedBy: true },
      })

      if (!currentPayout) {
        throw new Error("PAYOUT_NOT_FOUND")
      }

      if (!canTransition(currentPayout.status, newStatus)) {
        throw new Error(`INVALID_PAYOUT_TRANSITION:${currentPayout.status}->${newStatus}`)
      }

      // Update payout record
      const updatedPayout = await tx.payout.update({
        where: { id },
        data: {
          status: newStatus,
          approvedAt: newStatus === PAYOUT_STATUS.APPROVED ? new Date() : undefined,
          approvedBy: newStatus === PAYOUT_STATUS.APPROVED ? input.processedBy : undefined,
          processedBy: [PAYOUT_STATUS.PROCESSING, PAYOUT_STATUS.PAID, PAYOUT_STATUS.FAILED].includes(newStatus as any)
            ? input.processedBy
            : undefined,
          processedAt: newStatus === PAYOUT_STATUS.PAID || newStatus === PAYOUT_STATUS.FAILED ? new Date() : undefined,
          cancelledAt: newStatus === PAYOUT_STATUS.CANCELLED ? new Date() : undefined,
          cancelledBy: newStatus === PAYOUT_STATUS.CANCELLED ? input.processedBy : undefined,
          externalReference: input.externalReference,
          adminNotes: input.adminNotes,
          failureReason: newStatus === PAYOUT_STATUS.FAILED ? input.failureReason : undefined,
          stripeTransferId: undefined,
        },
        include: {
          chef: {
            include: {
              user: {
                select: { name: true, email: true },
              },
            },
          },
        },
      })

      // CRITICAL: Record in ledger INSIDE transaction for atomicity
      // Ledger failures now block the entire payout operation
      if (newStatus === PAYOUT_STATUS.PAID) {
        await ledgerService.recordPayout(
          id,
          updatedPayout.chefId,
          updatedPayout.amount,
          input.processedBy || "SYSTEM",
          input.externalReference
        )
      }

      await tx.auditLog.create({
        data: {
          action: "PAYOUT_STATUS_CHANGED",
          entityType: "Payout",
          entityId: id,
          oldValue: JSON.stringify({ status: currentPayout.status }),
          newValue: JSON.stringify({ status: newStatus, externalReference: input.externalReference ?? null }),
          performedBy: input.processedBy || "SYSTEM",
          reason: input.adminNotes || input.failureReason || `Payout ${input.action}`,
        },
      })

      return updatedPayout
    })

    return updatedPayout
  },

  /**
   * Freeze payouts for a chef (e.g., when dispute opened)
   */
  async freezePayouts(chefId: string, reason?: string) {
    return prisma.$transaction(async (tx) => {
      const result = await tx.payout.updateMany({
        where: {
          chefId,
          status: { in: [PAYOUT_STATUS.PENDING, PAYOUT_STATUS.APPROVED, PAYOUT_STATUS.PROCESSING] },
        },
        data: {
          status: PAYOUT_STATUS.FROZEN,
        },
      })

      logger.info(`[PAYOUT] Froze ${result.count} payouts for chef ${chefId}`, { reason })

      return { frozen: result.count }
    })
  },

  /**
   * Unfreeze payouts for a chef (e.g., when dispute resolved)
   */
  async unfreezePayouts(chefId: string, processedBy?: string) {
    return prisma.$transaction(async (tx) => {
      const frozenPayouts = await tx.payout.findMany({
        where: {
          chefId,
          status: PAYOUT_STATUS.FROZEN,
        },
      })

      for (const payout of frozenPayouts) {
        await tx.payout.update({
          where: { id: payout.id },
          data: { status: PAYOUT_STATUS.PENDING },
        })

        await logStateTransition(tx, "PAYOUT", payout.id, "FROZEN", "PENDING", processedBy || "SYSTEM")
      }

      logger.info(`[PAYOUT] Unfroze ${frozenPayouts.length} payouts for chef ${chefId}`)

      return { unfrozen: frozenPayouts.length }
    })
  },
}
