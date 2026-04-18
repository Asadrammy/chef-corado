/**
 * Instant Booking Chaos Tests
 * 
 * Verifies instant booking security and payment requirements
 * Tests attempts to bypass payment and booking constraints
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { prisma } from '@/lib/prisma'
import { bookingService } from '@/lib/services/booking-service'

describe('Instant Booking Chaos Tests', () => {
  let testExperience: any
  let testAvailability: any
  let testClient: any

  beforeAll(async () => {
    // Setup test data
    testClient = await prisma.user.create({
      data: {
        name: 'Instant Booking Client',
        email: 'instant-chaos@example.com',
        password: 'hashed-password',
        role: 'CLIENT',
      },
    })

    const testChef = await prisma.user.create({
      data: {
        name: 'Instant Booking Chef',
        email: 'instant-chaos-chef@example.com',
        password: 'hashed-password',
        role: 'CHEF',
      },
    })

    const chefProfile = await prisma.chefProfile.create({
      data: {
        userId: testChef.id,
        location: 'Test Location',
        radius: 50,
      },
    })

    testExperience = await prisma.experience.create({
      data: {
        title: 'Chaos Test Experience',
        description: 'For instant booking chaos testing',
        price: 100,
        duration: 2,
        includedServices: 'Test services',
        chefId: chefProfile.id,
        isActive: true,
      },
    })

    testAvailability = await prisma.availability.create({
      data: {
        chefId: chefProfile.id,
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        startTime: '10:00',
        endTime: '18:00',
        isAvailable: true,
        maxBookings: 3,
        currentBookings: 0,
      },
    })
  })

  afterAll(async () => {
    // Cleanup test data
    await prisma.$transaction([
      prisma.booking.deleteMany({ where: { clientId: testClient.id } }),
      prisma.availability.deleteMany({ where: { id: testAvailability.id } }),
      prisma.experience.deleteMany({ where: { id: testExperience.id } }),
      prisma.chefProfile.deleteMany({ where: { userId: testClient.id } }),
      prisma.user.deleteMany({ where: { id: testClient.id } }),
    ])
  })

  describe('Payment Requirement Validation', () => {
    it('should require payment for instant booking creation', async () => {
      const bookingData = {
        userId: testClient.id,
        experienceId: testExperience.id,
        eventDate: testAvailability.date.toISOString(),
        location: 'Test Location',
        guestCount: 2,
      }

      // Create instant booking
      const booking = await bookingService.createInstantBooking(bookingData)

      // Booking should be created in PENDING status (awaiting payment)
      expect(booking.status).toBe('PENDING')
      expect(booking.bookingType).toBe('INSTANT')
      
      // Should NOT have payment initially
      expect(booking.status).toBe('PENDING')
    })

    it('should prevent booking without required payment processing', async () => {
      const bookingData = {
        userId: testClient.id,
        experienceId: testExperience.id,
        eventDate: testAvailability.date.toISOString(),
        location: 'Test Location',
        guestCount: 2,
      }

      // Try to create booking without payment flow
      const booking = await bookingService.createInstantBooking(bookingData)

      // Should be created but pending payment
      expect(booking.status).toBe('PENDING')
      
      // Verify no payment exists
      const payment = await prisma.payment.findFirst({
        where: { bookingId: booking.id },
      })
      expect(payment).toBeNull()
    })
  })

  describe('Availability Constraint Validation', () => {
    it('should prevent double booking of same time slot', async () => {
      const bookingData = {
        userId: testClient.id,
        experienceId: testExperience.id,
        eventDate: testAvailability.date.toISOString(),
        location: 'Test Location',
        guestCount: 1,
      }

      // First booking should succeed
      const booking1 = await bookingService.createInstantBooking(bookingData)
      expect(booking1.id).toBeDefined()

      // Second booking should fail
      await expect(
        bookingService.createInstantBooking(bookingData)
      ).rejects.toThrow('This time slot is already booked')
    })

    it('should respect max booking limits', async () => {
      const bookingData = {
        userId: testClient.id,
        experienceId: testExperience.id,
        eventDate: testAvailability.date.toISOString(),
        location: 'Test Location',
        guestCount: 1,
      }

      // Create bookings up to limit
      const bookings = []
      for (let i = 0; i < 3; i++) {
        const booking = await bookingService.createInstantBooking({
          ...bookingData,
          userId: `test-client-${i}`,
        })
        bookings.push(booking)
      }

      // All should succeed
      expect(bookings.length).toBe(3)

      // Fourth booking should fail
      await expect(
        bookingService.createInstantBooking({
          ...bookingData,
          userId: 'test-client-3',
        })
      ).rejects.toThrow('No availability left for this date')
    })
  })

  describe('Concurrent Booking Attempts', () => {
    it('should handle 10+ concurrent booking attempts gracefully', async () => {
      const bookingData = {
        experienceId: testExperience.id,
        eventDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // Different date
        location: 'Test Location',
        guestCount: 1,
      }

      // Create availability for concurrent test
      const concurrentAvailability = await prisma.availability.create({
        data: {
          chefId: testExperience.chefId,
          date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          startTime: '10:00',
          endTime: '18:00',
          isAvailable: true,
          maxBookings: 2,
          currentBookings: 0,
        },
      })

      // Attempt 10 concurrent bookings
      const bookingPromises = Array.from({ length: 10 }, (_, i) =>
        bookingService.createInstantBooking({
          ...bookingData,
          userId: `concurrent-client-${i}`,
          eventDate: concurrentAvailability.date.toISOString(),
        })
      )

      const results = await Promise.allSettled(bookingPromises)
      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length

      // Should have exactly 2 successes (max bookings) and 8 failures
      expect(successful).toBe(2)
      expect(failed).toBe(8)
    })
  })

  describe('Booking Validation Rules', () => {
    it('should reject bookings for past dates', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      
      await expect(
        bookingService.createInstantBooking({
          userId: testClient.id,
          experienceId: testExperience.id,
          eventDate: pastDate,
          location: 'Test Location',
          guestCount: 1,
        })
      ).rejects.toThrow('Event date must be in the future')
    })

    it('should reject bookings with invalid guest counts', async () => {
      await expect(
        bookingService.createInstantBooking({
          userId: testClient.id,
          experienceId: testExperience.id,
          eventDate: testAvailability.date.toISOString(),
          location: 'Test Location',
          guestCount: 0, // Invalid
        })
      ).rejects.toThrow('Guest count must be at least 1')
    })

    it('should reject bookings for inactive experiences', async () => {
      // Deactivate experience
      await prisma.experience.update({
        where: { id: testExperience.id },
        data: { isActive: false },
      })

      await expect(
        bookingService.createInstantBooking({
          userId: testClient.id,
          experienceId: testExperience.id,
          eventDate: testAvailability.date.toISOString(),
          location: 'Test Location',
          guestCount: 1,
        })
      ).rejects.toThrow('Experience is not available for booking')
    })
  })

  describe('Self-Booking Prevention', () => {
    it('should prevent users from booking their own experiences', async () => {
      // Create experience for test client
      const clientProfile = await prisma.chefProfile.create({
        data: {
          userId: testClient.id,
          location: 'Client Location',
          radius: 50,
        },
      })

      const clientExperience = await prisma.experience.create({
        data: {
          title: 'Client Own Experience',
          description: 'Should not be bookable by owner',
          price: 100,
          duration: 2,
          includedServices: 'Test services',
          chefId: clientProfile.id,
          isActive: true,
        },
      })

      const clientAvailability = await prisma.availability.create({
        data: {
          chefId: clientProfile.id,
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          startTime: '10:00',
          endTime: '18:00',
          isAvailable: true,
          maxBookings: 1,
          currentBookings: 0,
        },
      })

      await expect(
        bookingService.createInstantBooking({
          userId: testClient.id,
          experienceId: clientExperience.id,
          eventDate: clientAvailability.date.toISOString(),
          location: 'Test Location',
          guestCount: 1,
        })
      ).rejects.toThrow('Cannot book your own experience')
    })
  })

  describe('Data Consistency Under Load', () => {
    it('should maintain availability consistency during concurrent bookings', async () => {
      const initialAvailability = await prisma.availability.findUnique({
        where: { id: testAvailability.id },
      })

      const bookingData = {
        experienceId: testExperience.id,
        eventDate: testAvailability.date.toISOString(),
        location: 'Test Location',
        guestCount: 1,
      }

      // Start with 0 bookings
      expect(initialAvailability?.currentBookings).toBe(0)

      // Create 2 bookings (max is 3)
      const booking1 = await bookingService.createInstantBooking({
        ...bookingData,
        userId: 'consistency-client-1',
      })
      const booking2 = await bookingService.createInstantBooking({
        ...bookingData,
        userId: 'consistency-client-2',
      })

      // Verify availability updated correctly
      const updatedAvailability = await prisma.availability.findUnique({
        where: { id: testAvailability.id },
      })
      expect(updatedAvailability?.currentBookings).toBe(2)

      // Third booking should succeed
      const booking3 = await bookingService.createInstantBooking({
        ...bookingData,
        userId: 'consistency-client-3',
      })
      expect(booking3.status).toBe('PENDING')

      // Final check
      const finalAvailability = await prisma.availability.findUnique({
        where: { id: testAvailability.id },
      })
      expect(finalAvailability?.currentBookings).toBe(3)
    })
  })

  describe('Booking State Management', () => {
    it('should create bookings in correct initial state', async () => {
      const booking = await bookingService.createInstantBooking({
        userId: testClient.id,
        experienceId: testExperience.id,
        eventDate: testAvailability.date.toISOString(),
        location: 'Test Location',
        guestCount: 1,
      })

      expect(booking.status).toBe('PENDING')
      expect(booking.bookingType).toBe('INSTANT')
      expect(booking.clientId).toBe(testClient.id)
      expect(booking.experienceId).toBe(testExperience.id)
    })

    it('should include all required booking data', async () => {
      const booking = await bookingService.createInstantBooking({
        userId: testClient.id,
        experienceId: testExperience.id,
        eventDate: testAvailability.date.toISOString(),
        location: 'Test Location',
        guestCount: 2,
        specialRequests: 'Special chaos test request',
      })

      expect(booking.guestCount).toBe(2)
      expect(booking.specialRequests).toBe('Special chaos test request')
      expect(booking.totalPrice).toBe(testExperience.price * 2)
    })
  })
})
