import { prisma } from "@/lib/prisma"
import { refundService } from "./refund-service"
import { payoutService } from "./payout-service"
import { DisputeStateMachine, logStateTransition } from "@/lib/utils/state-machine"
import { logger } from "@/lib/logger"

// Define constants for dispute statuses and reasons
const DISPUTE_STATUS = {
  OPEN: "OPEN",
  INVESTIGATING: "INVESTIGATING", 
  RESOLVED_CLIENT_FAVOR: "RESOLVED_CLIENT_FAVOR",
  RESOLVED_CHEF_FAVOR: "RESOLVED_CHEF_FAVOR",
  CLOSED: "CLOSED"
} as const

const DISPUTE_REASON = {
  SERVICE_NOT_DELIVERED: "SERVICE_NOT_DELIVERED",
  QUALITY_MISMATCH: "QUALITY_MISMATCH",
  PAYMENT_ISSUE: "PAYMENT_ISSUE",
  SAFETY_CONCERN: "SAFETY_CONCERN",
  OTHER: "OTHER"
} as const

type DisputeStatus = typeof DISPUTE_STATUS[keyof typeof DISPUTE_STATUS]
type DisputeReason = typeof DISPUTE_REASON[keyof typeof DISPUTE_REASON]

export const disputeService = {
  async createDispute(data: {
    bookingId: string
    reason: DisputeReason
    description: string
    evidence?: string[]
    initiatedBy: string
  }) {
    const booking = await prisma.booking.findUnique({
      where: { id: data.bookingId },
      include: {
        client: true,
        chef: { include: { user: true } },
        payments: true
      }
    })

    if (!booking) {
      throw new Error("BOOKING_NOT_FOUND")
    }

    if (data.initiatedBy !== booking.clientId && data.initiatedBy !== booking.chef.userId) {
      throw new Error("UNAUTHORIZED_TO_CREATE_DISPUTE")
    }

    const validStatuses = ['CONFIRMED', 'COMPLETED', 'CANCELLED']
    if (!validStatuses.includes(booking.status)) {
      throw new Error("BOOKING_NOT_ELIGIBLE_FOR_DISPUTE")
    }

    // Store booking reference for use after transaction
    const bookingData = booking

    const dispute = await prisma.$transaction(async (tx) => {
      const createdDispute = await (tx as any).dispute.create({
        data: {
          bookingId: data.bookingId,
          reason: data.reason,
          description: data.description,
          evidence: data.evidence ? JSON.stringify(data.evidence) : null,
          initiatedBy: data.initiatedBy,
          status: DISPUTE_STATUS.OPEN
        },
        include: {
          booking: {
            include: {
              client: { select: { id: true, name: true, email: true } },
              chef: { include: { user: { select: { id: true, name: true, email: true } } } },
              payments: true
            }
          }
        }
      })

      // Log state transition
      await logStateTransition(tx, "DISPUTE", createdDispute.id, "DRAFT", "OPEN", data.initiatedBy)

      // Freeze payouts for the chef using payout service
      // This is done outside the transaction to avoid locking issues
      // but we can prepare by checking if any payouts exist
      const pendingPayouts = await tx.payout.count({
        where: {
          chefId: bookingData.chefId,
          status: { in: ['PENDING', 'PROCESSING'] }
        }
      })

      if (pendingPayouts > 0) {
        logger.info(`[DISPUTE] Will freeze ${pendingPayouts} payouts for chef ${bookingData.chefId}`)
      }

      await tx.notification.createMany({
        data: [
          {
            userId: 'ADMIN',
            type: 'DISPUTE_CREATED',
            message: `New dispute created for booking ${bookingData.id}`,
          },
          {
            userId: data.initiatedBy === bookingData.clientId ? bookingData.chef.userId : bookingData.clientId,
            type: 'DISPUTE_CREATED',
            message: `A dispute has been created for booking ${bookingData.id}`,
          }
        ]
      })

      return createdDispute
    })

    // Freeze payouts after transaction succeeds (outside transaction)
    try {
      await payoutService.freezePayouts(bookingData.chefId, `Dispute created for booking ${bookingData.id}`)
    } catch (freezeError) {
      logger.error("[DISPUTE] Failed to freeze payouts:", {
        error: freezeError,
        chefId: bookingData.chefId,
        bookingId: bookingData.id,
      })
    }

    return dispute
  },

  async updateDisputeStatus(disputeId: string, status: DisputeStatus, resolvedBy?: string, resolution?: string) {
    const dispute = await (prisma as any).dispute.findUnique({
      where: { id: disputeId },
      include: {
        booking: {
          include: {
            client: true,
            chef: { include: { user: true } },
            payments: true
          }
        }
      }
    })

    if (!dispute) {
      throw new Error("DISPUTE_NOT_FOUND")
    }

    const validTransitions: Record<string, string[]> = {
      [DISPUTE_STATUS.OPEN]: [DISPUTE_STATUS.INVESTIGATING, DISPUTE_STATUS.RESOLVED_CLIENT_FAVOR, DISPUTE_STATUS.RESOLVED_CHEF_FAVOR, DISPUTE_STATUS.CLOSED],
      [DISPUTE_STATUS.INVESTIGATING]: [DISPUTE_STATUS.RESOLVED_CLIENT_FAVOR, DISPUTE_STATUS.RESOLVED_CHEF_FAVOR, DISPUTE_STATUS.CLOSED],
      [DISPUTE_STATUS.RESOLVED_CLIENT_FAVOR]: [DISPUTE_STATUS.CLOSED],
      [DISPUTE_STATUS.RESOLVED_CHEF_FAVOR]: [DISPUTE_STATUS.CLOSED],
      [DISPUTE_STATUS.CLOSED]: []
    }

    if (!validTransitions[dispute.status].includes(status)) {
      throw new Error(`INVALID_STATUS_TRANSITION:${dispute.status}->${status}`)
    }

    return prisma.$transaction(async (tx) => {
      const updatedDispute = await (tx as any).dispute.update({
        where: { id: disputeId },
        data: {
          status,
          resolvedBy: resolvedBy || dispute.resolvedBy,
          resolvedAt: ['RESOLVED_CLIENT_FAVOR', 'RESOLVED_CHEF_FAVOR', 'CLOSED'].includes(status) ? new Date() : dispute.resolvedAt,
          resolution: resolution || dispute.resolution
        },
        include: {
          booking: {
            include: {
              client: true,
              chef: { include: { user: true } },
              payments: true
            }
          }
        }
      })

      if (status === DISPUTE_STATUS.RESOLVED_CLIENT_FAVOR) {
        const payment = dispute.booking.payments
        if (payment && (payment.status === 'COMPLETED' || payment.status === 'RELEASED')) {
          try {
            await refundService.createRefundRequest({
              paymentId: payment.id,
              amount: payment.totalAmount,
              reason: 'OTHER',
              description: `Automatic refund due to dispute resolution: ${resolution || 'Dispute resolved in client favor'}`,
              requestedBy: resolvedBy || 'SYSTEM'
            })
          } catch (error) {
            console.error('Failed to create automatic refund:', error)
          }
        }
      } else if (status === DISPUTE_STATUS.RESOLVED_CHEF_FAVOR || status === DISPUTE_STATUS.CLOSED) {
        await tx.payout.updateMany({
          where: {
            chefId: dispute.booking.chefId,
            status: 'FROZEN'
          },
          data: {
            status: 'PENDING'
          }
        })
      }

      if (['INVESTIGATING', 'RESOLVED_CLIENT_FAVOR', 'RESOLVED_CHEF_FAVOR', 'CLOSED'].includes(status)) {
        await tx.notification.createMany({
          data: [
            {
              userId: dispute.booking.clientId,
              type: 'DISPUTE_UPDATED',
              message: `Dispute for booking ${dispute.booking.id} status updated to ${status}`,
            },
            {
              userId: dispute.booking.chef.userId,
              type: 'DISPUTE_UPDATED',
              message: `Dispute for booking ${dispute.booking.id} status updated to ${status}`,
            }
          ]
        })
      }

      return updatedDispute
    })
  },

  async addEvidence(disputeId: string, evidence: string[], addedBy: string) {
    const dispute = await (prisma as any).dispute.findUnique({
      where: { id: disputeId }
    })

    if (!dispute) {
      throw new Error("DISPUTE_NOT_FOUND")
    }

    if (dispute.status !== DISPUTE_STATUS.OPEN && dispute.status !== DISPUTE_STATUS.INVESTIGATING) {
      throw new Error("DISPUTE_NOT_ACCEPTING_EVIDENCE")
    }

    const existingEvidence = dispute.evidence ? JSON.parse(dispute.evidence) : []
    const updatedEvidence = [...existingEvidence, ...evidence]

    return (prisma as any).dispute.update({
      where: { id: disputeId },
      data: {
        evidence: JSON.stringify(updatedEvidence)
      }
    })
  },

  async listDisputes(filters: {
    status?: DisputeStatus
    bookingId?: string
    initiatedBy?: string
    clientId?: string
    chefId?: string
    reason?: DisputeReason
    page?: number
    limit?: number
  }) {
    const where: any = {}
    if (filters.status) where.status = filters.status
    if (filters.bookingId) where.bookingId = filters.bookingId
    if (filters.initiatedBy) where.initiatedBy = filters.initiatedBy
    if (filters.reason) where.reason = filters.reason
    
    // Filter by client or chef through booking
    if (filters.clientId || filters.chefId) {
      where.booking = {}
      if (filters.clientId) where.booking.clientId = filters.clientId
      if (filters.chefId) where.booking.chefId = filters.chefId
    }

    const page = filters.page || 1
    const limit = filters.limit || 20
    const skip = (page - 1) * limit

    const [disputes, total] = await prisma.$transaction([
      (prisma as any).dispute.findMany({
        where,
        include: {
          booking: {
            include: {
              client: { select: { id: true, name: true, email: true } },
              chef: { include: { user: { select: { id: true, name: true, email: true } } } },
              payments: { select: { id: true, totalAmount: true, status: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      (prisma as any).dispute.count({ where })
    ])

    return {
      disputes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  },

  async getDisputeById(disputeId: string) {
    return (prisma as any).dispute.findUnique({
      where: { id: disputeId },
      include: {
        booking: {
          include: {
            client: { select: { id: true, name: true, email: true } },
            chef: { include: { user: { select: { id: true, name: true, email: true } } } },
            payments: true,
            proposals: true,
            reviews: true
          }
        }
      }
    })
  },

  async getDisputeStats() {
    const [
      totalDisputes,
      openDisputes,
      investigatingDisputes,
      resolvedDisputes,
      disputesByReason
    ] = await Promise.all([
      (prisma as any).dispute.count(),
      (prisma as any).dispute.count({ where: { status: DISPUTE_STATUS.OPEN } }),
      (prisma as any).dispute.count({ where: { status: DISPUTE_STATUS.INVESTIGATING } }),
      (prisma as any).dispute.count({ 
        where: { 
          status: { in: [DISPUTE_STATUS.RESOLVED_CLIENT_FAVOR, DISPUTE_STATUS.RESOLVED_CHEF_FAVOR] }
        } 
      }),
      (prisma as any).dispute.groupBy({
        by: ['reason'],
        _count: true
      })
    ])

    return {
      totalDisputes,
      openDisputes,
      investigatingDisputes,
      resolvedDisputes,
      disputesByReason: disputesByReason.map((item: any) => ({
        reason: item.reason,
        count: item._count
      }))
    }
  }
}
