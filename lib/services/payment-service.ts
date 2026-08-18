import { Prisma } from "@prisma/client"
import type Stripe from "stripe"

import { prisma } from "@/lib/prisma"
import { paymentRepository } from "@/lib/repositories/payment-repository"
import { ledgerService } from "@/lib/services/ledger-service"
import { PaymentStateMachine, logStateTransition } from "@/lib/utils/state-machine"
import { generateIdempotencyKey } from "@/lib/utils/idempotency"
import { BookingStatus, PaymentStatus, ProposalStatus } from "@/types"
import { logPaymentSuccess, logPaymentFailure, logWebhookProcessed, logWebhookFailure, logLedgerError } from "@/lib/monitoring/financial-monitor"
import { logger } from "@/lib/logger"
import { invoiceService } from "@/lib/services/invoice-service"
import {
  triggerBookingCreatedNotification,
  triggerPaymentReceivedNotification,
  triggerPaymentSuccessNotification,
} from "@/lib/notifications"

const WEBHOOK_STATUS = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const

// Payment state machine constants
const PAYMENT_STATUS = {
  HELD: "HELD",
  AUTHORIZED: "AUTHORIZED", 
  CAPTURED: "CAPTURED",
  PAID: "PAID",
  RELEASED: "RELEASED",
  REFUNDED: "REFUNDED",
  FAILED: "FAILED",
  DISPUTED: "DISPUTED"
} as const

const PAYMENT_STATE_TRANSITIONS: Record<string, string[]> = {
  [PAYMENT_STATUS.HELD]: [PAYMENT_STATUS.AUTHORIZED, PAYMENT_STATUS.FAILED],
  [PAYMENT_STATUS.AUTHORIZED]: [PAYMENT_STATUS.CAPTURED, PAYMENT_STATUS.FAILED],
  [PAYMENT_STATUS.CAPTURED]: [PAYMENT_STATUS.PAID, PAYMENT_STATUS.FAILED],
  [PAYMENT_STATUS.PAID]: [PAYMENT_STATUS.RELEASED, PAYMENT_STATUS.REFUNDED, PAYMENT_STATUS.DISPUTED],
  [PAYMENT_STATUS.RELEASED]: [PAYMENT_STATUS.REFUNDED, PAYMENT_STATUS.DISPUTED],
  [PAYMENT_STATUS.REFUNDED]: [], // Terminal state
  [PAYMENT_STATUS.FAILED]: [], // Terminal state
  [PAYMENT_STATUS.DISPUTED]: [PAYMENT_STATUS.REFUNDED, PAYMENT_STATUS.RELEASED] // Can be resolved
} as const

export const paymentService = {
  verifyCheckoutSession(session: Stripe.Checkout.Session): boolean {
    return (
      session.payment_status === "paid" &&
      session.status === "complete" &&
      typeof session.payment_intent === "string"
    )
  },

  validatePaymentTransition(currentStatus: string, newStatus: string): boolean {
    return PaymentStateMachine.validateTransition(currentStatus, newStatus)
  },

  async logWebhookEvent(stripeEventId: string, eventType: string, payload: string) {
    try {
      const log = await paymentRepository.createWebhookLog(stripeEventId, eventType, payload)
      
      // Log webhook processed event
      logWebhookProcessed({
        stripeEventId,
        eventType,
        metadata: { logId: log.id }
      })
      
      return log
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const existingLog = paymentRepository.findWebhookLogByStripeEventId(stripeEventId)
        return existingLog
      }

      // Log webhook failure
      logWebhookFailure({
        stripeEventId,
        eventType,
        error: error instanceof Error ? error.message : 'Unknown webhook error',
        metadata: { errorType: error instanceof Error ? error.constructor.name : 'Unknown' }
      })

      throw error
    }
  },

  updateWebhookStatus(id: string, status: string, errorMessage?: string) {
    return paymentRepository.updateWebhookLog(id, status, errorMessage)
  },

  async processSuccessfulProposalCheckout(proposalId: string, session: Stripe.Checkout.Session) {
    // CRITICAL: Use payment guarantee system for money safety
    const { paymentGuarantee } = await import("@/lib/services/payment-guarantee")
    
    const amount = session.amount_total ? session.amount_total / 100 : 0
    const paymentIntentId = session.payment_intent as string
    const stripeSessionId = session.id

    let guaranteedBookingId: string | null = null

    // Execute atomic payment-to-booking guarantee
    await prisma.$transaction(async (tx) => {
      const result = await paymentGuarantee.guaranteePaymentToBooking(
        proposalId,
        stripeSessionId,
        paymentIntentId,
        amount,
        tx
      )

      if (!result.guaranteed) {
        throw new Error(`Payment guarantee failed: ${result.error}`)
      }
      guaranteedBookingId = result.bookingId ?? null

      // Record in ledger for financial tracking (CRITICAL for money safety)
      try {
        const persistedPayment = await tx.payment.findUnique({
          where: { id: result.paymentId! },
        })
        const commissionAmount = persistedPayment?.commissionAmount ?? 0
        const chefAmount = persistedPayment?.chefAmount ?? 0
        
        await ledgerService.recordPayment(
          result.paymentId!,
          result.bookingId!,
          amount,
          commissionAmount,
          chefAmount,
          "SYSTEM",
          {
            stripeSessionId: session.id,
            proposalId,
            finance: persistedPayment ? {
              platformCommissionRate: persistedPayment.platformCommissionRate,
              serviceChargeTaxRate: persistedPayment.serviceChargeTaxRate,
              serviceChargeTaxAmount: persistedPayment.serviceChargeTaxAmount,
              serviceChargeTaxDeductionEnabled: persistedPayment.serviceChargeTaxDeductionEnabled,
              totalPlatformDeduction: persistedPayment.totalPlatformDeduction,
              taxJurisdiction: persistedPayment.taxJurisdiction,
              serviceChargeTaxStatus: persistedPayment.serviceChargeTaxStatus,
            } : undefined,
          },
          (session.currency || "GBP").toUpperCase()
        )
      } catch (ledgerError) {
        // CRITICAL: Log ledger error and fail the transaction
        const { logLedgerError } = await import("@/lib/monitoring/financial-monitor")
        logLedgerError({
          transactionType: 'PAYMENT',
          amount,
          error: ledgerError instanceof Error ? ledgerError.message : 'Unknown ledger error',
          paymentId: result.paymentId!,
          bookingId: result.bookingId!,
          metadata: { stripeSessionId: session.id, proposalId }
        })
        throw ledgerError
      }

      await invoiceService.ensureReceiptForPayment(tx, result.paymentId!, "SYSTEM")

      logger.info('[PAYMENT_SERVICE] Payment guarantee completed successfully', {
        bookingId: result.bookingId,
        paymentId: result.paymentId,
        proposalId,
      })
    })

    if (guaranteedBookingId) {
      try {
        const booking = await prisma.booking.findUnique({
          where: { id: guaranteedBookingId },
          include: {
            client: { select: { id: true, name: true } },
            chef: { include: { user: { select: { id: true, name: true } } } },
            serviceDates: { orderBy: { sortOrder: "asc" } },
            proposal: {
              include: {
                request: {
                  include: {
                    multiDayDates: { orderBy: { sortOrder: "asc" } },
                  },
                },
              },
            },
          },
        })

        if (booking) {
          const serviceDates = booking.serviceDates.length
            ? booking.serviceDates
            : booking.proposal?.request?.multiDayDates ?? []
          const isMultiDay = booking.proposal?.request?.requestMode === "MULTI_DAY" || serviceDates.length > 1
          const context = {
            isMultiDay,
            serviceDates,
            location: booking.location,
            amount: booking.totalPrice,
            currency: booking.currency,
            bookingReference: booking.id,
          }

          await Promise.allSettled([
            triggerBookingCreatedNotification(booking.chef.userId, booking.client.name ?? "Client", context),
            triggerPaymentSuccessNotification(booking.clientId, booking.chef.user.name ?? "Chef", context),
            triggerPaymentReceivedNotification(booking.chef.userId, booking.client.name ?? "Client", context),
          ])
        }
      } catch (notificationError) {
        logger.warn("[PAYMENT_SERVICE] Booking/payment notification failed after checkout", {
          bookingId: guaranteedBookingId,
          error: notificationError instanceof Error ? notificationError.message : String(notificationError),
        })
      }
    }

    return
  },

  webhookStatus: WEBHOOK_STATUS,
}
