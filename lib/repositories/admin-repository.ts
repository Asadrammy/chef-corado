import { prisma } from "@/lib/prisma"

export const adminRepository = {
  listChefs() {
    return prisma.chefProfile.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            experiences: true,
            bookings: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  },

  listBookings() {
    return prisma.booking.findMany({
      include: {
        client: {
          select: {
            name: true,
            email: true,
          },
        },
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
        proposal: {
          include: {
            menu: {
              select: {
                title: true,
                price: true,
              },
            },
          },
        },
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    })
  },

  listPayments() {
    return prisma.payment.findMany({
      include: {
        booking: {
          include: {
            client: {
              select: {
                name: true,
                email: true,
              },
            },
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
        },
      },
      orderBy: { createdAt: "desc" },
    })
  },
}
