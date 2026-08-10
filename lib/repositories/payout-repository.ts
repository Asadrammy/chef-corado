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
          is: {
            status: { in: ["PAID", "RELEASED"] },
          },
        },
      },
      include: {
        payments: true,
      },
    })
  },

  async getPaidBookingPaymentSummaries(chefId: string) {
    return prisma.booking.findMany({
      where: {
        chefId,
        payments: {
          is: {
            status: { in: ["PAID", "RELEASED"] },
          },
        },
      },
      include: {
        payments: true,
        proposal: {
          include: {
            request: {
              select: {
                title: true,
                requestMode: true,
                serviceTypeLabel: true,
                countryCode: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    })
  },

  async createPayout(chefId: string, amount: number, currency: string, idempotencyKey: string) {
    return prisma.payout.create({
      data: {
        chefId,
        amount,
        currency,
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
