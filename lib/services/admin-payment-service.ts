import { prisma } from "@/lib/prisma"
import { emailTemplates, sendPreferenceAwareEmail } from "@/lib/email"
import { ledgerService } from "@/lib/services/ledger-service"
import { PaymentStateMachine, logStateTransition } from "@/lib/utils/state-machine"
import { logger } from "@/lib/logger"
import { auditService } from "@/lib/services/audit-service"

export const adminPaymentService = {
  async releasePayment(paymentId: string, releasedBy: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        booking: true,
      },
    })

    if (!payment) {
      throw new Error("PAYMENT_NOT_FOUND")
    }

    // Validate state transition using state machine
    // Allow both PAID and HELD to transition to RELEASED
    const validStartStates = ["PAID", "HELD"]
    if (!validStartStates.includes(payment.status)) {
      throw new Error(`PAYMENT_NOT_RELEASABLE: Cannot transition from ${payment.status} to RELEASED`)
    }

    const paymentWithRelations = await prisma.$transaction(async (tx) => {
      // Use status check - check version hasn't changed
      const currentPayment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: {
          booking: true
        }
      })

      if (!currentPayment || (currentPayment.status !== "PAID" && currentPayment.status !== "HELD")) {
        throw new Error("PAYMENT_NOT_RELEASABLE: Payment must be in PAID or HELD state")
      }

      // Check for existing disputes on this booking
      const existingDispute = await tx.dispute.findFirst({
        where: {
          bookingId: currentPayment.bookingId,
          status: { in: ['PENDING', 'UNDER_REVIEW'] }
        }
      })

      if (existingDispute) {
        throw new Error("PAYMENT_BLOCKED_BY_DISPUTE: Cannot release payment while dispute is active")
      }

      // Update with status check instead of optimistic locking
      const updated = await tx.payment.updateMany({
        where: {
          id: paymentId,
          status: { in: ["PAID", "HELD"] }, // Ensure payment is still in PAID or HELD state
        },
        data: {
          status: "RELEASED",
          releasedAt: new Date(),
          releasedBy,
        },
      })

      if (updated.count === 0) {
        throw new Error("PAYMENT_CONCURRENT_MODIFICATION")
      }

      // Fetch the updated payment with relations
      const updatedPayment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: {
          booking: {
            include: {
              client: true,
              chef: {
                include: {
                  user: true
                }
              }
            }
          }
        }
      })

      if (!updatedPayment) {
        throw new Error("PAYMENT_NOT_FOUND_AFTER_UPDATE")
      }

      // Log state transition
      await logStateTransition(tx, "PAYMENT", paymentId, currentPayment.status, "RELEASED", releasedBy)

      return updatedPayment
    })

    // Record in ledger AFTER transaction succeeds (outside transaction to avoid blocking)
    try {
      await ledgerService.recordPayout(
        paymentId, // Using paymentId as reference since payout may not exist yet
        paymentWithRelations.booking.chefId,
        paymentWithRelations.chefAmount,
        releasedBy,
        undefined, // No stripe transfer ID yet
        paymentWithRelations.currency
      )

      // Audit log for payment release
      await auditService.logAction('ADMIN_PAYMENT_RELEASE', {
        userId: releasedBy,
        role: 'ADMIN',
        paymentId,
        bookingId: paymentWithRelations.booking.id,
        amount: paymentWithRelations.chefAmount,
        metadata: {
          chefId: paymentWithRelations.booking.chefId,
          clientId: paymentWithRelations.booking.clientId
        }
      })
    } catch (ledgerError) {
      // Log but don't fail - payment was already released
      logger.error("[LEDGER] Failed to record payout in ledger:", {
        error: ledgerError,
        paymentId,
        chefId: paymentWithRelations.booking.chefId,
        amount: paymentWithRelations.chefAmount,
      })
    }

    const chefUser = paymentWithRelations.booking.chef?.user
    const clientUser = paymentWithRelations.booking.client

    if (chefUser?.email) {
      await sendPreferenceAwareEmail({
        userId: paymentWithRelations.booking.chef.userId,
        topic: "bookings",
        email: chefUser.email,
        subject: `Payment Released!`,
        html: emailTemplates.paymentReleased(
          chefUser.name,
          paymentWithRelations.chefAmount,
          `Booking with ${clientUser?.name || "Client"}`
        ),
      }).catch(() => undefined)
    }

    return paymentWithRelations
  },
}
