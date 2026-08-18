import { prisma } from "@/lib/prisma"

export const adminRepository = {
  listChefs() {
    return prisma.chefProfile.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            firstName: true,
            surname: true,
            email: true,
            isBanned: true,
            banReason: true,
            banAdminNotes: true,
            bannedAt: true,
            termsAcceptedAt: true,
            termsVersion: true,
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
        serviceDates: { orderBy: { sortOrder: "asc" } },
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        chef: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        proposal: {
          include: {
            lineItems: { orderBy: { sortOrder: "asc" } },
            menu: {
              select: {
                title: true,
                price: true,
              },
            },
            request: {
              select: {
                eventType: true,
                requestMode: true,
                serviceType: true,
                serviceTypeLabel: true,
                eventDate: true,
                location: true,
                guestCount: true,
                budgetMode: true,
                totalBudget: true,
                defaultDailyBudget: true,
                multiDayDates: {
                  orderBy: { sortOrder: "asc" },
                },
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
