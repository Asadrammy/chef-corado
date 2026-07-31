import type { Prisma } from "@prisma/client"

import { bookingRepository } from "@/lib/repositories/booking-repository"
import { ledgerService } from "@/lib/services/ledger-service"
import { eventQueueService } from "@/lib/services/event-queue-service"
import { BookingStateMachine, logStateTransition } from "@/lib/utils/state-machine"
import { generateIdempotencyKey } from "@/lib/utils/idempotency"
import { ApiError } from "@/lib/error-handler"
import { BookingStatus, Role } from "@/types"
import type { RefundReason } from "@/lib/services/refund-service"
import { prisma } from "@/lib/prisma"
import { enforceUserModeration, enforceChefModeration } from "@/lib/security/moderation-guard"
import { enforceClientCompliance, enforceChefCompliance } from "@/lib/security/legal-compliance"
import { validatePolicyFields } from "@/lib/security/communication-policy"
import { validateExperienceBookingCounts } from "@/lib/booking-counts"

const SORTABLE_BOOKING_FIELDS = new Set(["createdAt", "eventDate", "totalPrice", "status"])

export const bookingService = {
  async listBookings(input: {
    userId: string
    role: string | null | undefined
    page: number
    limit: number
    status?: string | null
    sortBy: string
    sortOrder: "asc" | "desc"
  }) {
    const where: Prisma.BookingWhereInput = {}

    if (input.role === Role.CLIENT) {
      where.clientId = input.userId
    } else if (input.role === Role.CHEF) {
      const chefProfile = await bookingRepository.findChefProfileByUserId(input.userId)
      if (!chefProfile) {
        return {
          bookings: [],
          pagination: { page: input.page, limit: input.limit, total: 0, pages: 0 },
        }
      }
      where.chefId = chefProfile.id
    }

    if (input.status) {
      where.status = input.status
    }

    const safeSortBy = SORTABLE_BOOKING_FIELDS.has(input.sortBy) ? input.sortBy : "createdAt"
    const orderBy = { [safeSortBy]: input.sortOrder } as Prisma.BookingOrderByWithRelationInput
    const skip = (input.page - 1) * input.limit

    const [bookings, total] = await bookingRepository.listBookings(where, skip, input.limit, orderBy)

    return {
      bookings,
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        pages: Math.ceil(total / input.limit),
      },
    }
  },

  async getBookingById(bookingId: string, sessionUserId: string, role: string | null | undefined) {
    const booking = await bookingRepository.findBookingById(bookingId)

    if (!booking) {
      throw new Error("BOOKING_NOT_FOUND")
    }

    const chefUserId = booking.chef.user.id
    if (booking.clientId !== sessionUserId && chefUserId !== sessionUserId && role !== Role.ADMIN) {
      throw new Error("FORBIDDEN")
    }

    return booking
  },

  async updateBookingStatus(bookingId: string, sessionUserId: string, role: string | null | undefined, status: string) {
    const booking = await this.getBookingById(bookingId, sessionUserId, role)

    if (role !== Role.ADMIN && booking.clientId !== sessionUserId && booking.chef.user.id !== sessionUserId) {
      throw new Error("FORBIDDEN")
    }

    return bookingRepository.updateBookingStatus(bookingId, status)
  },

  async cancelBooking(bookingId: string, sessionUserId: string, role: string | null | undefined, reason?: string, refundAmount?: number) {
    const booking = await bookingRepository.findBookingById(bookingId)

    if (!booking) {
      throw new Error("BOOKING_NOT_FOUND")
    }

    if (booking.clientId !== sessionUserId && role !== Role.ADMIN) {
      throw new Error("FORBIDDEN")
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new Error("BOOKING_ALREADY_CANCELLED")
    }

    if (booking.status === BookingStatus.COMPLETED) {
      throw new Error("BOOKING_COMPLETED_CANNOT_CANCEL")
    }

    const updatedBooking = await bookingRepository.updateBookingStatus(bookingId, BookingStatus.CANCELLED)
    const payment = booking.payments

    let refund = null
    if (payment && (payment.status === 'PAID' || payment.status === 'RELEASED')) {
      // Create real refund record
      const refundService = (await import("@/lib/services/refund-service")).refundService
      
      // Check for existing refund to prevent duplication
      const existingRefunds = await prisma.refund.findMany({
        where: {
          paymentId: payment.id,
          status: { in: ['PENDING', 'APPROVED', 'PROCESSED'] }
        }
      })
      
      if (existingRefunds.length > 0) {
        throw new Error("REFUND_ALREADY_EXISTS")
      }
      
      refund = await refundService.createRefundRequest({
        paymentId: payment.id,
        amount: refundAmount || payment.totalAmount,
        reason: (reason || 'CANCELLATION') as RefundReason,
        description: `Refund for cancelled booking ${bookingId}`,
        requestedBy: sessionUserId
      })
      
      // Ledger entry is created inside refundService.createRefundRequest
    }

    return {
      booking: updatedBooking,
      refund: refund
        ? {
            id: refund.id,
            amount: refund.amount,
            reason: refund.reason,
            status: refund.status
          }
        : null,
    }
  },

  async createInstantBooking(input: {
    userId: string
    experienceId: string
    eventDate: string
    location: string
    latitude?: number
    longitude?: number
    guestCount: number
    specialRequests?: string
  }) {
    const { prisma } = await import("@/lib/prisma")
    const bookingDate = new Date(input.eventDate)

    // Enforce client moderation and compliance
    await enforceUserModeration(input.userId)
    await enforceClientCompliance(input.userId)

    validatePolicyFields({
      location: input.location,
      specialRequests: input.specialRequests,
    })

    if (bookingDate < new Date()) {
      throw new ApiError(400, 'Event date must be in the future')
    }

    // ATOMIC TRANSACTION - PREVENT RACE CONDITIONS
    const booking = await prisma.$transaction(async (tx) => {
      // Get experience first so we can derive chef/availability details
      const experience = await tx.experience.findUnique({
        where: { id: input.experienceId },
        include: {
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
        },
      })

      if (!experience) {
        throw new ApiError(404, 'Experience not found')
      }

      if (!experience.isActive) {
        throw new ApiError(400, 'Experience is not available for booking')
      }

      // Enforce chef moderation
      if (experience.chef.isBanned || experience.chef.user?.id === undefined) {
        throw new ApiError(403, 'This chef is not currently available for booking')
      }
      
      // Enforce chef compliance (terms + structured legal confirmations + approval)
      if (experience.chef.user?.id) {
        await enforceChefCompliance(experience.chef.user.id)
      }

      if (experience.minGuests && input.guestCount < experience.minGuests) {
        throw new ApiError(400, `Minimum ${experience.minGuests} guests required`)
      }

      if (experience.maxGuests && input.guestCount > experience.maxGuests) {
        throw new ApiError(400, `Maximum ${experience.maxGuests} guests allowed`)
      }

      // Check availability with optimistic concurrency
      const availability = await tx.availability.findFirst({
        where: {
          chefId: experience.chefId,
          date: bookingDate,
          isAvailable: true,
        },
      })

      if (!availability) {
        throw new ApiError(400, 'Chef is not available on this date')
      }

      if (availability.currentBookings >= availability.maxBookings) {
        throw new ApiError(400, 'No availability left for this date')
      }

      const clientChefProfile = await bookingRepository.findChefProfileByUserId(input.userId)
      if (clientChefProfile?.id && clientChefProfile.id === experience.chefId) {
        throw new ApiError(400, 'Cannot book your own experience')
      }

      // Check for existing bookings
      const existingBooking = await tx.booking.findFirst({
        where: {
          chefId: experience.chefId,
          experienceId: input.experienceId,
          eventDate: bookingDate,
          status: { not: BookingStatus.CANCELLED },
        },
      })

      if (existingBooking) {
        throw new ApiError(400, 'This time slot is already booked. Please select another date.')
      }

      const experienceCurrency = (experience as any).currency || 'GBP'
      const bookingCounts = validateExperienceBookingCounts(experience as any, input.guestCount)

      // Create booking atomically
      const booking = await tx.booking.create({
        data: {
          clientId: input.userId,
          chefId: experience.chefId,
          experienceId: input.experienceId,
          eventDate: bookingDate,
          location: input.location,
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
          guestCount: bookingCounts.guestCount,
          studentCount: bookingCounts.studentCount,
          totalPrice: bookingCounts.totalPrice,
          currency: experienceCurrency,
          bookingType: 'INSTANT',
          status: BookingStatus.PENDING,
          specialRequests: input.specialRequests ?? null,
        } as any,
        include: {
          client: true,
          chef: { include: { user: true } },
          experience: true,
        },
      })

      // Update availability with race condition prevention
      const updateResult = await tx.availability.updateMany({
        where: { 
          id: availability.id,
          currentBookings: availability.currentBookings // Ensure no concurrent modification
        },
        data: {
          currentBookings: availability.currentBookings + 1,
        },
      })

      if (updateResult.count === 0) {
        throw new ApiError(409, 'Race condition detected: Availability was modified by another request. Please try again.')
      }

      // Create notifications atomically
      await tx.notification.createMany({
        data: [
          {
            userId: experience.chef.user.id,
            type: 'BOOKING_CREATED',
            message: `New instant booking for "${experience.title}" on ${bookingDate.toLocaleDateString()}`,
          },
          {
            userId: input.userId,
            type: 'BOOKING_CREATED',
            message: `Your booking for "${experience.title}" has been created and is pending confirmation`,
          },
        ],
      })

      // Log state transition: DRAFT -> PENDING
      await logStateTransition(tx, "BOOKING", booking.id, "DRAFT", "PENDING", input.userId)

      return booking
    }, {
      timeout: 10000, // 10 second timeout for transaction
    })

    // Emit event AFTER transaction succeeds (outside transaction)
    try {
      await eventQueueService.emit({
        eventType: "BOOKING_CREATED",
        payload: {
          bookingId: booking.id,
          clientId: input.userId,
          chefId: booking.chefId,
          experienceId: input.experienceId,
          totalPrice: booking.totalPrice,
          eventDate: booking.eventDate,
        },
        priority: 1, // High priority
      })
    } catch (eventError) {
      // Log but don't fail - booking was already created
      console.error("[EVENT] Failed to emit BOOKING_CREATED event:", eventError)
    }

    return booking
  },

  async getInstantAvailability(experienceId: string, date: string) {
    const { prisma } = await import("@/lib/prisma")
    const experience = await prisma.experience.findUnique({
      where: { id: experienceId },
      include: { chef: true },
    })

    if (!experience) {
      throw new ApiError(404, 'Experience not found')
    }

    const availability = await prisma.availability.findFirst({
      where: {
        chefId: experience.chefId,
        date: new Date(date),
        isAvailable: true,
      },
    })

    return {
      canBook: !!availability && availability.currentBookings < availability.maxBookings,
      remainingSlots: availability ? availability.maxBookings - availability.currentBookings : 0,
      availability: availability
        ? {
            startTime: availability.startTime,
            endTime: availability.endTime,
            maxBookings: availability.maxBookings,
            currentBookings: availability.currentBookings,
          }
        : null,
    }
  },
}
