import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/monitoring/logger'
import { withTransactionRecovery, withRetry } from '@/lib/utils/resilience'

/**
 * Booking Concurrency Safety
 * 
 * Ensures:
 * - No double bookings under high concurrency
 * - Slot locking remains correct
 * - Booking + payment linkage is consistent
 * - Rollback if payment fails
 */

export class BookingConcurrencySafety {
  /**
   * Acquire slot lock with timeout
   * Uses pessimistic locking to prevent race conditions
   */
  async acquireSlotLock(
    availabilityId: string,
    timeout: number = 30000
  ): Promise<{ acquired: boolean; lockId: string }> {
    const lockId = `slot_lock_${availabilityId}_${Date.now()}`

    try {
      // Try to acquire lock with timeout
      const lock = await Promise.race([
        this.tryAcquireLock(availabilityId, lockId),
        new Promise<null>((_, reject) => {
          const timeoutHandle = setTimeout(() => reject(new Error('Lock acquisition timeout')), timeout)
          timeoutHandle.unref?.()
        }),
      ])

      if (!lock) {
        return { acquired: false, lockId }
      }

      logger.info('[BOOKING_CONCURRENCY] Slot lock acquired', {
        availabilityId,
        lockId,
      })

      return { acquired: true, lockId }
    } catch (error) {
      logger.warn('[BOOKING_CONCURRENCY] Failed to acquire slot lock', {
        availabilityId,
        error: error instanceof Error ? error.message : String(error),
      })
      return { acquired: false, lockId }
    }
  }

  /**
   * Release slot lock
   */
  async releaseSlotLock(lockId: string): Promise<void> {
    try {
      await (prisma as any).slotLock.delete({
        where: { id: lockId },
      })

      logger.info('[BOOKING_CONCURRENCY] Slot lock released', { lockId })
    } catch (error) {
      logger.warn('[BOOKING_CONCURRENCY] Failed to release slot lock', {
        lockId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Create booking with guaranteed consistency
   */
  async createBookingWithConsistency(bookingData: {
    clientId: string
    chefId: string
    experienceId: string
    availabilityId: string
    eventDate: Date
    guestCount: number
    totalPrice: number
    location: string
  }): Promise<any> {
    logger.info('[BOOKING_CONCURRENCY] Creating booking with consistency checks', {
      clientId: bookingData.clientId,
      experienceId: bookingData.experienceId,
    })

    // Acquire slot lock
    const { acquired, lockId } = await this.acquireSlotLock(bookingData.availabilityId)

    if (!acquired) {
      throw new Error('Failed to acquire slot lock - slot may be unavailable')
    }

    try {
      // Create booking within transaction with recovery
      const booking = await withTransactionRecovery(
        async (tx) => {
          // Verify availability hasn't changed
          const availability = await (tx as any).availability.findUnique({
            where: { id: bookingData.availabilityId },
          })

          if (!availability) {
            throw new Error('Availability not found')
          }

          if (!availability.isAvailable) {
            throw new Error('Availability is no longer available')
          }

          if (availability.currentBookings >= availability.maxBookings) {
            throw new Error('No slots available')
          }

          // Create booking
          const newBooking = await (tx as any).booking.create({
            data: {
              clientId: bookingData.clientId,
              chefId: bookingData.chefId,
              experienceId: bookingData.experienceId,
              eventDate: bookingData.eventDate,
              location: bookingData.location,
              guestCount: bookingData.guestCount,
              totalPrice: bookingData.totalPrice,
              status: 'PENDING_PAYMENT',
              version: 1,
            },
            include: {
              client: true,
              chef: { include: { user: true } },
              experience: true,
            },
          })

          // Update availability atomically
          const updateResult = await (tx as any).availability.updateMany({
            where: {
              id: bookingData.availabilityId,
              currentBookings: availability.currentBookings, // Ensure no concurrent change
            },
            data: {
              currentBookings: { increment: 1 },
              version: { increment: 1 },
            },
          })

          if (updateResult.count === 0) {
            throw new Error('Availability was modified by another request - race condition detected')
          }

          return newBooking
        },
        '[BOOKING_CONCURRENCY] Create booking transaction',
        prisma,
        3
      )

      logger.info('[BOOKING_CONCURRENCY] Booking created successfully', {
        bookingId: booking.id,
        clientId: bookingData.clientId,
      })

      return booking
    } finally {
      // Always release lock
      await this.releaseSlotLock(lockId)
    }
  }

  /**
   * Verify booking + payment consistency
   */
  async verifyBookingPaymentConsistency(bookingId: string): Promise<{
    consistent: boolean
    issues: string[]
  }> {
    const issues: string[] = []

    try {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { payments: true },
      })

      if (!booking) {
        return { consistent: false, issues: ['Booking not found'] }
      }

      // Check if booking has payment
      if (!booking.payments) {
        if (booking.status !== 'PENDING_PAYMENT' && booking.status !== 'CANCELLED') {
          issues.push(`Booking status is ${booking.status} but has no payment`)
        }
      } else {
        const payment = booking.payments

        // Verify payment amount matches booking
        if (payment.totalAmount !== booking.totalPrice) {
          issues.push(
            `Payment amount ${payment.totalAmount} doesn't match booking price ${booking.totalPrice}`
          )
        }

        // Verify payment status is consistent with booking
        const validPaymentStatuses: Record<string, string[]> = {
          PENDING_PAYMENT: ['INITIATED', 'HELD'],
          CONFIRMED: ['PAID', 'RELEASED'],
          IN_PROGRESS: ['PAID', 'RELEASED'],
          COMPLETED: ['PAID', 'RELEASED'],
          CANCELLED: ['REFUNDED', 'FAILED'],
        }

        const validStatuses = validPaymentStatuses[booking.status] || []
        if (!validStatuses.includes(payment.status)) {
          issues.push(
            `Booking status ${booking.status} incompatible with payment status ${payment.status}`
          )
        }
      }

      return {
        consistent: issues.length === 0,
        issues,
      }
    } catch (error) {
      return {
        consistent: false,
        issues: [error instanceof Error ? error.message : String(error)],
      }
    }
  }

  /**
   * Rollback booking if payment fails
   */
  async rollbackBookingOnPaymentFailure(bookingId: string, reason: string): Promise<void> {
    logger.warn('[BOOKING_CONCURRENCY] Rolling back booking due to payment failure', {
      bookingId,
      reason,
    })

    await withTransactionRecovery(
      async (tx) => {
        // Get booking
        const booking = await (tx as any).booking.findUnique({
          where: { id: bookingId },
        })

        if (!booking) {
          throw new Error(`Booking ${bookingId} not found`)
        }

        // Cancel booking
        await (tx as any).booking.update({
          where: { id: bookingId },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
            cancellationReason: `Payment failed: ${reason}`,
            version: { increment: 1 },
          },
        })

        // Release availability slot
        await (tx as any).availability.updateMany({
          where: {
            id: booking.availabilityId,
            currentBookings: { gt: 0 },
          },
          data: {
            currentBookings: { decrement: 1 },
            version: { increment: 1 },
          },
        })

        // Mark payment as failed
        if (booking.paymentId) {
          await (tx as any).payment.update({
            where: { id: booking.paymentId },
            data: {
              status: 'FAILED',
              failureReason: reason,
              version: { increment: 1 },
            },
          })
        }
      },
      '[BOOKING_CONCURRENCY] Rollback booking transaction',
      prisma,
      3
    )

    logger.info('[BOOKING_CONCURRENCY] Booking rolled back successfully', { bookingId })
  }

  /**
   * Try to acquire lock (internal)
   */
  private async tryAcquireLock(availabilityId: string, lockId: string): Promise<any> {
    try {
      const lock = await (prisma as any).slotLock.create({
        data: {
          id: lockId,
          availabilityId,
          acquiredAt: new Date(),
          expiresAt: new Date(Date.now() + 60000), // 1 minute timeout
        },
      })

      return lock
    } catch (error) {
      // Lock already exists
      return null
    }
  }

  /**
   * Cleanup expired locks (should run periodically)
   */
  async cleanupExpiredLocks(): Promise<number> {
    const result = await (prisma as any).slotLock.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    })

    logger.info('[BOOKING_CONCURRENCY] Cleaned up expired locks', {
      count: result.count,
    })

    return result.count
  }
}

export const bookingConcurrencySafety = new BookingConcurrencySafety()
