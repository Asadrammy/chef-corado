import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

export const bookingRepository = {
  findChefProfileByUserId(userId: string) {
    return prisma.chefProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        userId: true,
      },
    })
  },

  listBookings(where: Prisma.BookingWhereInput, skip: number, take: number, orderBy: Prisma.BookingOrderByWithRelationInput) {
    return Promise.all([
      prisma.booking.findMany({
        where,
        orderBy,
        select: {
          id: true,
          totalPrice: true,
          currency: true,
          status: true,
          createdAt: true,
          client: {
            select: {
              name: true,
              email: true,
            },
          },
          chef: {
            select: {
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
          experience: {
            select: {
              title: true,
            },
          },
          proposal: {
            select: {
              menu: {
                select: {
                  title: true,
                },
              },
              request: {
                select: {
                  eventDate: true,
                  details: true,
                  location: true,
                },
              },
            },
          },
        },
        skip,
        take,
      }),
      prisma.booking.count({ where }),
    ])
  },

  findBookingById(id: string) {
    return prisma.booking.findUnique({
      where: { id },
      include: {
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
            request: true,
            menu: {
              select: {
                id: true,
                title: true,
                description: true,
                price: true,
                currency: true,
              },
            },
          },
        },
        experience: true,
        payments: true,
        review: true,
      },
    })
  },

  updateBookingStatus(id: string, status: string) {
    return prisma.booking.update({
      where: { id },
      data: { status },
      include: {
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
            request: true,
            menu: true,
          },
        },
        experience: true,
        payments: true,
        review: true,
      },
    })
  },

  updatePaymentStatus(id: string, status: string) {
    return prisma.payment.update({
      where: { id },
      data: { status },
    })
  },

  createInstantBooking(input: {
    clientId: string
    chefId: string
    experienceId: string
    eventDate: Date
    location: string
    latitude: number | null
    longitude: number | null
    guestCount: number
    totalPrice: number
    currency: string
    specialRequests: string | null
    chefUserId: string
    experienceTitle: string
    availabilityId: string
    currentBookings: number
  }) {
    return prisma.$transaction(async (tx) => {
      const booking = await tx.booking.create({
        data: {
          clientId: input.clientId,
          chefId: input.chefId,
          experienceId: input.experienceId,
          eventDate: input.eventDate,
          location: input.location,
          latitude: input.latitude,
          longitude: input.longitude,
          guestCount: input.guestCount,
          totalPrice: input.totalPrice,
          currency: input.currency,
          bookingType: 'INSTANT',
          status: 'PENDING',
          specialRequests: input.specialRequests,
        } as any,
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
          experience: true,
        },
      })

      await tx.availability.update({
        where: { id: input.availabilityId },
        data: {
          currentBookings: input.currentBookings + 1,
        },
      })

      await tx.notification.create({
        data: {
          userId: input.chefUserId,
          type: 'BOOKING_CREATED',
          message: `New instant booking for "${input.experienceTitle}" on ${input.eventDate.toLocaleDateString()}`,
        },
      })

      await tx.notification.create({
        data: {
          userId: input.clientId,
          type: 'BOOKING_CREATED',
          message: `Your booking for "${input.experienceTitle}" has been created and is pending confirmation`,
        },
      })

      return booking
    })
  },
}
