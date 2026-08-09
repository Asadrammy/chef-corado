import { prisma } from "@/lib/prisma"
import { PaymentStateMachine, logStateTransition } from "@/lib/utils/state-machine"
import { generateIdempotencyKey } from "@/lib/utils/idempotency"
import { logger } from "@/lib/logger"
import { auditService } from "@/lib/services/audit-service"
import type Stripe from "stripe"

// Refund status constants aligned with state machine
const REFUND_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  PROCESSED: "PROCESSED",
  FAILED: "FAILED"
} as const

const REFUND_REASON = {
  CANCELLATION: "CANCELLATION",
  NO_SHOW: "NO_SHOW",
  SERVICE_ISSUE: "SERVICE_ISSUE",
  QUALITY_ISSUE: "QUALITY_ISSUE",
  OTHER: "OTHER"
} as const

type RefundStatus = typeof REFUND_STATUS[keyof typeof REFUND_STATUS]
export type RefundReason = typeof REFUND_REASON[keyof typeof REFUND_REASON]

export const refundService = {
  async createRefundRequest(data: {
    paymentId: string
    amount: number
    reason: RefundReason
    description: string
    requestedBy: string
  }) {
    // Validate payment exists and has sufficient amount
    const payment = await prisma.payment.findUnique({
      where: { id: data.paymentId },
      include: {
        booking: true,
        refunds: {
          where: { status: { in: ['PENDING', 'APPROVED', 'PROCESSED'] } }
        }
      }
    })

    if (!payment) {
      throw new Error("PAYMENT_NOT_FOUND")
    }

    if (payment.status !== 'PAID' && payment.status !== 'RELEASED') {
      throw new Error("PAYMENT_NOT_ELIGIBLE_FOR_REFUND")
    }

    // Calculate total refunded amount
    const totalRefunded = payment.refunds.reduce((sum, refund) => sum + refund.amount, 0)
    const availableForRefund = payment.totalAmount - totalRefunded

    if (data.amount > availableForRefund) {
      throw new Error(`REFUND_AMOUNT_EXCEEDS_AVAILABLE:${availableForRefund}`)
    }

    // Check for existing pending refund
    const existingPendingRefund = payment.refunds.find(r => r.status === 'PENDING')
    if (existingPendingRefund) {
      throw new Error("REFUND_ALREADY_PENDING")
    }

    let refund = null
    let paymentDetails = null
    let bookingDetails = null

    return prisma.$transaction(async (tx) => {
      refund = await tx.refund.create({
        data: {
          paymentId: data.paymentId,
          amount: data.amount,
          reason: data.reason,
          description: data.description,
          status: REFUND_STATUS.PENDING,
        },
        include: {
          payment: {
            include: {
              booking: {
                include: {
                  client: true,
                  chef: { include: { user: true } }
                }
              }
            }
          }
        }
      })

      // Store details for audit logging
      paymentDetails = refund.payment
      bookingDetails = refund.payment.booking

      // Freeze related payouts if any exist
      await tx.payout.updateMany({
        where: {
          chefId: bookingDetails.chefId,
          status: 'PENDING'
        },
        data: {
          status: 'FROZEN'
        }
      })

      // Create notification for admin
      await tx.notification.create({
        data: {
          userId: 'ADMIN', // In real system, get admin IDs
          type: 'REFUND_REQUESTED',
          message: `Refund request of $${data.amount} for booking ${bookingDetails.id}`,
        }
      })

      return refund
    })

    // Audit log for refund creation (outside transaction)
    if (paymentDetails && bookingDetails && refund) {
      await auditService.logAction('REFUND_CREATED', {
        userId: data.requestedBy,
        paymentId: data.paymentId,
        bookingId: bookingDetails.id,
        refundId: refund.id,
        amount: data.amount,
        reason: data.reason,
        metadata: {
          clientId: bookingDetails.clientId,
          chefId: bookingDetails.chefId
        }
      })
    }
  },

  async approveRefund(refundId: string, approvedBy: string, stripeClient: Stripe) {
    const refund = await prisma.refund.findUnique({
      where: { id: refundId },
      include: {
        payment: {
          include: {
            booking: true
          }
        }
      }
    })

    if (!refund) {
      throw new Error("REFUND_NOT_FOUND")
    }

    if (refund.status !== REFUND_STATUS.PENDING) {
      throw new Error("REFUND_NOT_PENDING")
    }

    if (!refund.payment.stripePaymentIntentId) {
      throw new Error("NO_STRIPE_PAYMENT_INTENT")
    }

    const processedRefund = await prisma.$transaction(async (tx) => {
      try {
        const stripeRefund = await stripeClient.refunds.create({
          payment_intent: refund.payment.stripePaymentIntentId || undefined,
          amount: Math.round(refund.amount * 100),
          reason: 'requested_by_customer',
          metadata: {
            refundId: refund.id,
            bookingId: refund.payment.booking.id
          }
        })

        const updatedRefund = await tx.refund.update({
          where: { id: refundId },
          data: {
            status: REFUND_STATUS.PROCESSED,
            processedBy: approvedBy,
            processedAt: new Date(),
            stripeRefundId: stripeRefund.id
          }
        })

        await logStateTransition(tx, "REFUND", refundId, "PENDING", "PROCESSED", approvedBy)

        const totalRefunded = await tx.refund.aggregate({
          where: {
            paymentId: refund.paymentId,
            status: REFUND_STATUS.PROCESSED
          },
          _sum: { amount: true }
        })

        const isFullyRefunded = (totalRefunded._sum.amount || 0) >= refund.payment.totalAmount

        if (isFullyRefunded) {
          const paymentTransition = PaymentStateMachine.validateTransition(
            refund.payment.status,
            "REFUNDED"
          )

          if (!paymentTransition) {
            throw new Error(`INVALID_PAYMENT_TRANSITION:${refund.payment.status}->REFUNDED`)
          }

          await tx.payment.update({
            where: { id: refund.paymentId },
            data: { status: 'REFUNDED' }
          })

          await logStateTransition(tx, "PAYMENT", refund.paymentId, refund.payment.status, "REFUNDED", approvedBy)
        }

        await tx.ledger.create({
          data: {
            transactionType: "REFUND",
            amount: -refund.amount,
            currency: refund.payment.currency,
            bookingId: refund.payment.bookingId,
            paymentId: refund.paymentId,
            refundId: refund.id,
            fromAccount: "PLATFORM_HOLDING",
            toAccount: "STRIPE_REFUND",
            description: `Refund processed: ${refund.amount} ${refund.payment.currency} - ${refund.description}`,
            metadata: JSON.stringify({ reason: refund.reason, stripeRefundId: stripeRefund.id }),
            createdBy: approvedBy,
          },
        })

        await tx.auditLog.create({
          data: {
            action: "REFUND_APPROVED",
            entityType: "Refund",
            entityId: refund.id,
            oldValue: JSON.stringify({ status: refund.status }),
            newValue: JSON.stringify({ status: updatedRefund.status, stripeRefundId: stripeRefund.id }),
            performedBy: approvedBy,
            reason: refund.description,
          },
        })

        await tx.notification.createMany({
          data: [
            {
              userId: refund.payment.booking.clientId,
              type: 'REFUND_APPROVED',
              message: `Your refund of ${refund.amount} ${refund.payment.currency} has been processed`,
            },
            {
              userId: refund.payment.booking.chefId,
              type: 'REFUND_APPROVED',
              message: `A refund of ${refund.amount} ${refund.payment.currency} has been processed for booking ${refund.payment.booking.id}`,
            }
          ]
        })

        return updatedRefund

      } catch (stripeError) {
        // Mark refund as failed
        await tx.refund.update({
          where: { id: refundId },
          data: {
            status: REFUND_STATUS.FAILED,
            processedBy: approvedBy,
            processedAt: new Date(),
            failureReason: stripeError instanceof Error ? stripeError.message : 'Unknown Stripe error'
          }
        })
        throw stripeError
      }
    })

    return processedRefund
  },

  async rejectRefund(refundId: string, rejectedBy: string, reason: string) {
    const refund = await prisma.refund.findUnique({
      where: { id: refundId },
      include: {
        payment: {
          include: {
            booking: true
          }
        }
      }
    })

    if (!refund) {
      throw new Error("REFUND_NOT_FOUND")
    }

    if (refund.status !== REFUND_STATUS.PENDING) {
      throw new Error("REFUND_NOT_PENDING")
    }

    return prisma.$transaction(async (tx) => {
      const updatedRefund = await tx.refund.update({
        where: { id: refundId },
        data: {
          status: REFUND_STATUS.REJECTED,
          processedBy: rejectedBy,
          processedAt: new Date(),
          failureReason: reason
        }
      })

      // Unfreeze related payouts
      await tx.payout.updateMany({
        where: {
          chefId: refund.payment.booking.chefId,
          status: 'FROZEN'
        },
        data: {
          status: 'PENDING'
        }
      })

      // Create notifications
      await tx.notification.create({
        data: {
          userId: refund.payment.booking.clientId,
          type: 'REFUND_REJECTED',
          message: `Your refund request was rejected: ${reason}`,
        }
      })

      await tx.auditLog.create({
        data: {
          action: "REFUND_REJECTED",
          entityType: "Refund",
          entityId: refundId,
          oldValue: JSON.stringify({ status: refund.status }),
          newValue: JSON.stringify({ status: updatedRefund.status, failureReason: reason }),
          performedBy: rejectedBy,
          reason: reason || "Refund rejected",
        },
      })

      return updatedRefund
    })
  },

  async listRefunds(filters: {
    status?: RefundStatus
    paymentId?: string
    clientId?: string
    chefId?: string
    page?: number
    limit?: number
  }) {
    const where: any = {}
    if (filters.status) where.status = filters.status
    if (filters.paymentId) where.paymentId = filters.paymentId
    
    // Filter by client or chef through payment booking
    if (filters.clientId || filters.chefId) {
      where.payment = {
        booking: {}
      }
      if (filters.clientId) where.payment.booking.clientId = filters.clientId
      if (filters.chefId) where.payment.booking.chefId = filters.chefId
    }

    const page = filters.page || 1
    const limit = filters.limit || 20
    const skip = (page - 1) * limit

    const [refunds, total] = await prisma.$transaction([
      prisma.refund.findMany({
        where,
        include: {
          payment: {
            include: {
              booking: {
                include: {
                  client: { select: { id: true, name: true, email: true } },
                  chef: { include: { user: { select: { id: true, name: true, email: true } } } }
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.refund.count({ where })
    ])

    return {
      refunds,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  },

  async getRefundById(refundId: string) {
    return prisma.refund.findUnique({
      where: { id: refundId },
      include: {
        payment: {
          include: {
            booking: {
              include: {
                client: { select: { id: true, name: true, email: true } },
                chef: { include: { user: { select: { id: true, name: true, email: true } } } }
              }
            }
          }
        }
      }
    })
  }
}
