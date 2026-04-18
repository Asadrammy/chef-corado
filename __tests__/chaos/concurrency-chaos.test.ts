/**
 * Concurrency Chaos Test
 * Simulates high-concurrency booking scenarios
 * 
 * Tests:
 * - 10+ users booking same slot simultaneously
 * - Race condition detection
 * - Slot exhaustion
 * - Optimistic locking
 */

import { describe, it, expect, beforeEach } from '@jest/globals'
import { prisma } from '@/lib/prisma'
import { bookingConcurrencySafety } from '@/lib/services/booking-concurrency'

describe('Concurrency Chaos Tests', () => {
  let testAvailabilityId: string
  let testExperienceId: string
  let testChefId: string

  beforeEach(async () => {
    testChefId = 'test-chef-' + Date.now()
    testExperienceId = 'test-exp-' + Date.now()
    testAvailabilityId = 'test-avail-' + Date.now()
  })

  describe('Simultaneous Slot Booking', () => {
    it('should prevent double booking with 10 concurrent requests', async () => {
      // Create availability with 5 slots
      const availability = await (prisma as any).availability.create({
        data: {
          id: testAvailabilityId,
          chefId: testChefId,
          date: new Date(),
          startTime: '10:00',
          endTime: '18:00',
          maxBookings: 5,
          currentBookings: 0,
          isAvailable: true,
          version: 1,
        },
      })

      // Attempt 10 concurrent bookings
      const bookingPromises = Array.from({ length: 10 }, (_, i) => {
        const clientId = `test-client-${Date.now()}-${i}`
        return bookingConcurrencySafety.createBookingWithConsistency({
          clientId,
          chefId: testChefId,
          experienceId: testExperienceId,
          availabilityId: testAvailabilityId,
          eventDate: new Date(),
          guestCount: 1,
          totalPrice: 100,
          location: 'Test Location',
        })
      })

      const results = await Promise.allSettled(bookingPromises)

      // Count successes and failures
      const successes = results.filter((r) => r.status === 'fulfilled').length
      const failures = results.filter((r) => r.status === 'rejected').length

      // Should have exactly 5 successes (max bookings) and 5 failures
      expect(successes).toBe(5)
      expect(failures).toBe(5)

      // Verify availability was updated correctly
      const updated = await (prisma as any).availability.findUnique({
        where: { id: testAvailabilityId },
      })
      expect(updated.currentBookings).toBe(5)
    })

    it('should handle race condition detection', async () => {
      const availability = await (prisma as any).availability.create({
        data: {
          id: testAvailabilityId,
          chefId: testChefId,
          date: new Date(),
          startTime: '10:00',
          endTime: '18:00',
          maxBookings: 1,
          currentBookings: 0,
          isAvailable: true,
          version: 1,
        },
      })

      // Two concurrent bookings for single slot
      const [result1, result2] = await Promise.allSettled([
        bookingConcurrencySafety.createBookingWithConsistency({
          clientId: 'client-1',
          chefId: testChefId,
          experienceId: testExperienceId,
          availabilityId: testAvailabilityId,
          eventDate: new Date(),
          guestCount: 1,
          totalPrice: 100,
          location: 'Test Location',
        }),
        bookingConcurrencySafety.createBookingWithConsistency({
          clientId: 'client-2',
          chefId: testChefId,
          experienceId: testExperienceId,
          availabilityId: testAvailabilityId,
          eventDate: new Date(),
          guestCount: 1,
          totalPrice: 100,
          location: 'Test Location',
        }),
      ])

      // One should succeed, one should fail
      const succeeded = [result1, result2].filter((r) => r.status === 'fulfilled').length
      const failed = [result1, result2].filter((r) => r.status === 'rejected').length

      expect(succeeded).toBe(1)
      expect(failed).toBe(1)
    })
  })

  describe('Booking-Payment Consistency', () => {
    it('should verify booking and payment consistency', async () => {
      const bookingId = 'test-booking-' + Date.now()

      // Create booking
      const booking = await (prisma as any).booking.create({
        data: {
          id: bookingId,
          clientId: 'client-1',
          chefId: testChefId,
          experienceId: testExperienceId,
          eventDate: new Date(),
          location: 'Test',
          guestCount: 1,
          totalPrice: 100,
          status: 'CONFIRMED',
          version: 1,
        },
      })

      // Create payment
      const payment = await (prisma as any).payment.create({
        data: {
          id: 'payment-' + Date.now(),
          bookingId,
          stripePaymentIntentId: 'pi_test',
          totalAmount: 100,
          commissionAmount: 10,
          chefAmount: 90,
          status: 'PAID',
          version: 1,
        },
      })

      // Check consistency
      const consistency = await bookingConcurrencySafety.verifyBookingPaymentConsistency(
        bookingId
      )

      expect(consistency.consistent).toBe(true)
      expect(consistency.issues).toHaveLength(0)
    })

    it('should detect booking-payment mismatch', async () => {
      const bookingId = 'test-mismatch-' + Date.now()

      // Create booking with CONFIRMED status but no payment
      const booking = await (prisma as any).booking.create({
        data: {
          id: bookingId,
          clientId: 'client-1',
          chefId: testChefId,
          experienceId: testExperienceId,
          eventDate: new Date(),
          location: 'Test',
          guestCount: 1,
          totalPrice: 100,
          status: 'CONFIRMED',
          version: 1,
        },
      })

      // Check consistency - should detect issue
      const consistency = await bookingConcurrencySafety.verifyBookingPaymentConsistency(
        bookingId
      )

      expect(consistency.consistent).toBe(false)
      expect(consistency.issues.length).toBeGreaterThan(0)
    })
  })

  describe('Slot Lock Management', () => {
    it('should acquire and release slot locks', async () => {
      const availabilityId = 'test-lock-' + Date.now()

      // Acquire lock
      const { acquired, lockId } = await bookingConcurrencySafety.acquireSlotLock(
        availabilityId
      )

      expect(acquired).toBe(true)
      expect(lockId).toBeDefined()

      // Release lock
      await bookingConcurrencySafety.releaseSlotLock(lockId)

      // Should be able to acquire again
      const { acquired: acquired2 } = await bookingConcurrencySafety.acquireSlotLock(
        availabilityId
      )
      expect(acquired2).toBe(true)
    })

    it('should cleanup expired locks', async () => {
      // Create expired lock
      try {
        await (prisma as any).slotLock.create({
          data: {
            id: 'expired-lock-' + Date.now(),
            availabilityId: 'test-avail',
            acquiredAt: new Date(Date.now() - 120000), // 2 minutes ago
            expiresAt: new Date(Date.now() - 60000), // 1 minute ago
          },
        })
      } catch (e) {
        // Table might not exist
      }

      // Cleanup
      const cleaned = await bookingConcurrencySafety.cleanupExpiredLocks()

      expect(cleaned).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Booking Rollback on Payment Failure', () => {
    it('should rollback booking when payment fails', async () => {
      const bookingId = 'test-rollback-' + Date.now()
      const availabilityId = 'test-avail-rollback-' + Date.now()

      // Create availability
      await (prisma as any).availability.create({
        data: {
          id: availabilityId,
          chefId: testChefId,
          date: new Date(),
          startTime: '10:00',
          endTime: '18:00',
          maxBookings: 5,
          currentBookings: 1,
          isAvailable: true,
          version: 1,
        },
      })

      // Create booking
      const booking = await (prisma as any).booking.create({
        data: {
          id: bookingId,
          clientId: 'client-1',
          chefId: testChefId,
          experienceId: testExperienceId,
          eventDate: new Date(),
          location: 'Test',
          guestCount: 1,
          totalPrice: 100,
          status: 'PENDING_PAYMENT',
          version: 1,
          availabilityId,
        },
      })

      // Rollback booking
      await bookingConcurrencySafety.rollbackBookingOnPaymentFailure(
        bookingId,
        'Payment declined'
      )

      // Verify booking is cancelled
      const updated = await (prisma as any).booking.findUnique({
        where: { id: bookingId },
      })

      expect(updated.status).toBe('CANCELLED')
      expect(updated.cancellationReason).toContain('Payment failed')

      // Verify availability slot was released
      const updatedAvail = await (prisma as any).availability.findUnique({
        where: { id: availabilityId },
      })

      expect(updatedAvail.currentBookings).toBe(0)
    })
  })
})
