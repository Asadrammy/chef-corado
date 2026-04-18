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

      // Record in ledger for financial tracking (CRITICAL for money safety)
      try {
        const commissionAmount = amount * 0.2
        const chefAmount = amount * 0.8
        
        await ledgerService.recordPayment(
          result.paymentId!,
          result.bookingId!,
          amount,
          commissionAmount,
          chefAmount,
          "SYSTEM",
          { stripeSessionId: session.id, proposalId }
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

      logger.info('[PAYMENT_SERVICE] Payment guarantee completed successfully', {
        bookingId: result.bookingId,
        paymentId: result.paymentId,
        proposalId,
      })
    })

    return
  },

  webhookStatus: WEBHOOK_STATUS,
}
