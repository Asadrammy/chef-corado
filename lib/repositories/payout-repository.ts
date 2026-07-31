import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

export const payoutRepository = {
  async findChefProfile(userId: string) {
    return prisma.chefProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })
  },

  async getCompletedBookingsWithPayments(chefId: string) {
    return prisma.booking.findMany({
      where: {
        chefId,
        status: "COMPLETED",
        payments: {
          status: { in: ["PAID", "RELEASED"] },
        },
      },
      include: {
        payments: {
          where: {
            status: { in: ["PAID", "RELEASED"] },
          },
        },
      },
    })
  },

  async createPayout(chefId: string, amount: number, idempotencyKey: string) {
    return prisma.payout.create({
      data: {
        chefId,
        amount,
        status: "PENDING",
        idempotencyKey,
      },
      include: {
        chef: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })
  },

  async listPayouts(where: Prisma.PayoutWhereInput = {}) {
    return prisma.payout.findMany({
      where,
      include: {
        chef: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })
  },

  async findPayoutById(id: string) {
    return prisma.payout.findUnique({
      where: { id },
      include: {
        chef: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })
  },

  async updatePayoutStatus(id: string, data: Prisma.PayoutUpdateInput) {
    return prisma.payout.update({
      where: { id },
      data,
      include: {
        chef: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })
  },
}
