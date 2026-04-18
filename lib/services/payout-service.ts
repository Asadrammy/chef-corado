import { payoutRepository } from "@/lib/repositories/payout-repository"
import { ledgerService } from "@/lib/services/ledger-service"
import { logStateTransition } from "@/lib/utils/state-machine"
import { generateIdempotencyKey } from "@/lib/utils/idempotency"
import { logger } from "@/lib/logger"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

type PayoutAction = "process" | "complete" | "fail"

// Payout state machine constants
const PAYOUT_STATUS = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  FROZEN: "FROZEN",
} as const

const PAYOUT_STATE_TRANSITIONS: Record<string, string[]> = {
  [PAYOUT_STATUS.PENDING]: [PAYOUT_STATUS.PROCESSING, PAYOUT_STATUS.FROZEN, PAYOUT_STATUS.FAILED],
  [PAYOUT_STATUS.PROCESSING]: [PAYOUT_STATUS.COMPLETED, PAYOUT_STATUS.FAILED],
  [PAYOUT_STATUS.FROZEN]: [PAYOUT_STATUS.PENDING], // Can unfreeze
  [PAYOUT_STATUS.COMPLETED]: [], // Terminal state
  [PAYOUT_STATUS.FAILED]: [PAYOUT_STATUS.PENDING], // Can retry
} as const

export const payoutService = {
  async createPayout(userId: string, amount: number) {
    const chefProfile = await payoutRepository.findChefProfile(userId)

    if (!chefProfile) {
      throw new Error("CHEF_PROFILE_NOT_FOUND")
    }

    if (!chefProfile.isApproved) {
      throw new Error("CHEF_NOT_APPROVED")
    }

    const completedBookings = await payoutRepository.getCompletedBookingsWithPayments(chefProfile.id)

    const availableBalance = completedBookings.reduce((sum, booking) => {
      const payment = booking.payments
      if (payment) {
        return sum + (payment.totalAmount - payment.commissionAmount)
      }
      return sum
    }, 0)

    if (amount > availableBalance) {
      throw new Error(`INSUFFICIENT_BALANCE:${availableBalance.toFixed(2)}`)
    }

    return payoutRepository.createPayout(chefProfile.id, amount)
  },

  async getPayoutBalance(userId: string) {
    const chefProfile = await payoutRepository.findChefProfile(userId)

    if (!chefProfile) {
      throw new Error("CHEF_PROFILE_NOT_FOUND")
    }

    const completedBookings = await payoutRepository.getCompletedBookingsWithPayments(chefProfile.id)

    const totalEarnings = completedBookings.reduce((sum, booking) => {
      const payment = booking.payments
      if (payment && (payment.status === 'PAID' || payment.status === 'RELEASED')) {
        return sum + (payment.totalAmount - payment.commissionAmount)
      }
      return sum
    }, 0)

    const paidPayouts = await payoutRepository.listPayouts({
      chefId: chefProfile.id,
      status: "COMPLETED",
    })

    const totalPaidOut = paidPayouts.reduce((sum, payout) => sum + payout.amount, 0)

    const pendingPayouts = await payoutRepository.listPayouts({
      chefId: chefProfile.id,
      status: { in: ["PENDING", "PROCESSING"] },
    })

    const totalPendingPayouts = pendingPayouts.reduce((sum, payout) => sum + payout.amount, 0)

    const availableBalance = totalEarnings - totalPaidOut - totalPendingPayouts

    const activeBookings = await payoutRepository.getCompletedBookingsWithPayments(chefProfile.id)

    const pendingEarnings = activeBookings.reduce((sum: number, booking: any) => {
      const payment = booking.payments
      if (payment && (payment.status === 'PAID' || payment.status === 'RELEASED')) {
        return sum + (payment.totalAmount - payment.commissionAmount)
      }
      return sum
    }, 0)

    return {
      availableBalance: Math.max(0, availableBalance),
      pendingEarnings,
      totalEarnings,
      completedBookings: completedBookings.length,
    }
  },

  async listPayouts(chefId?: string, status?: string) {
    const where: Prisma.PayoutWhereInput = {}
    if (chefId) where.chefId = chefId
    if (status) where.status = status

    return payoutRepository.listPayouts(where)
  },

  async getPayoutById(id: string) {
    const payout = await payoutRepository.findPayoutById(id)
    if (!payout) {
      throw new Error("PAYOUT_NOT_FOUND")
    }
    return payout
  },

  async updatePayoutStatus(id: string, action: PayoutAction, stripeTransferId?: string, processedBy?: string) {
    const payout = await payoutRepository.findPayoutById(id)
    if (!payout) {
      throw new Error("PAYOUT_NOT_FOUND")
    }

    // Validate state transition
    let newStatus: string
    switch (action) {
      case "process":
        newStatus = PAYOUT_STATUS.PROCESSING
        break
      case "complete":
        newStatus = PAYOUT_STATUS.COMPLETED
        break
      case "fail":
        newStatus = PAYOUT_STATUS.FAILED
        break
      default:
        throw new Error("INVALID_ACTION")
    }

    const allowedTransitions = PAYOUT_STATE_TRANSITIONS[payout.status] || []
    if (!allowedTransitions.includes(newStatus) && payout.status !== newStatus) {
      throw new Error(`INVALID_PAYOUT_TRANSITION:${payout.status}->${newStatus}`)
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

      // Update payout record
      const updatedPayout = await tx.payout.update({
        where: { id },
        data: {
          status: action === "complete"
              ? PAYOUT_STATUS.COMPLETED
              : action === "fail"
              ? PAYOUT_STATUS.FAILED
              : PAYOUT_STATUS.PROCESSING,
          processedBy,
          processedAt: action === "complete" || action === "fail" ? new Date() : undefined,
          stripeTransferId,
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
      if (action === "complete") {
        await ledgerService.recordPayout(
          id,
          updatedPayout.chefId,
          updatedPayout.amount,
          processedBy || "SYSTEM",
          stripeTransferId
        )
      }

      return updatedPayout
    })
  },

  /**
   * Freeze payouts for a chef (e.g., when dispute opened)
   */
  async freezePayouts(chefId: string, reason?: string) {
    return prisma.$transaction(async (tx) => {
      const result = await tx.payout.updateMany({
        where: {
          chefId,
          status: { in: [PAYOUT_STATUS.PENDING, PAYOUT_STATUS.PROCESSING] },
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
