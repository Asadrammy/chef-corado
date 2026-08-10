import { NextRequest } from 'next/server'
import { DELETE as deleteBooking } from '@/app/api/bookings/[id]/route'
import { POST as createInstantBooking } from '@/app/api/bookings/instant/route'
import { getRequiredSession, getSessionUserId } from '@/lib/auth-helpers'
import { ApiError } from '@/lib/error-handler'
import { bookingService } from '@/lib/services/booking-service'
import { Role } from '@/types'

jest.mock('@/lib/auth-helpers', () => ({
  getRequiredSession: jest.fn(),
  getSessionUserId: jest.fn((session) => session.user.id),
}))

jest.mock('@/lib/services/booking-service', () => ({
  bookingService: {
    createInstantBooking: jest.fn(),
    cancelBooking: jest.fn(),
  },
}))

const mockGetRequiredSession = getRequiredSession as jest.MockedFunction<typeof getRequiredSession>
const mockGetSessionUserId = getSessionUserId as jest.MockedFunction<typeof getSessionUserId>
const mockBookingService = bookingService as jest.Mocked<typeof bookingService>

function jsonRequest(url: string, body: unknown) {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function clientSession(id = 'client-test-user') {
  return {
    user: {
      id,
      role: Role.CLIENT,
      email: `${id}@example.test`,
      name: 'Test Client',
    },
    expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  } as any
}

describe('Booking API - Critical Flow Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetRequiredSession.mockResolvedValue(clientSession())
    mockGetSessionUserId.mockImplementation((session) => session.user.id)
  })

  describe('Instant Booking Creation', () => {
    it('creates a booking with valid data', async () => {
      const eventDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      mockBookingService.createInstantBooking.mockResolvedValue({
        id: 'booking-test-id',
        status: 'PENDING',
        eventDate,
      } as any)

      const response = await createInstantBooking(
        jsonRequest('http://localhost/api/bookings/instant', {
          experienceId: 'experience-test-id',
          eventDate,
          location: 'Test Location',
          guestCount: 4,
        })
      )

      expect(response.status).toBe(201)
      await expect(response.json()).resolves.toMatchObject({ id: 'booking-test-id' })
      expect(mockBookingService.createInstantBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'client-test-user',
          experienceId: 'experience-test-id',
          guestCount: 4,
        })
      )
    })

    it('maps service rejection for a past date to 400', async () => {
      mockBookingService.createInstantBooking.mockRejectedValue(
        new ApiError(400, 'Event date must be in the future')
      )

      const response = await createInstantBooking(
        jsonRequest('http://localhost/api/bookings/instant', {
          experienceId: 'experience-test-id',
          eventDate: new Date(Date.now() - 1000).toISOString(),
          location: 'Test Location',
          guestCount: 4,
        })
      )

      expect(response.status).toBe(400)
      await expect(response.json()).resolves.toMatchObject({
        error: 'Event date must be in the future',
      })
    })

    it('maps duplicate availability rejection to 400', async () => {
      mockBookingService.createInstantBooking.mockRejectedValue(
        new ApiError(400, 'This time slot is already booked. Please select another date.')
      )

      const response = await createInstantBooking(
        jsonRequest('http://localhost/api/bookings/instant', {
          experienceId: 'experience-test-id',
          eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          location: 'Test Location',
          guestCount: 4,
        })
      )

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('already booked')
    })

    it('rejects invalid guest count before calling the service', async () => {
      const response = await createInstantBooking(
        jsonRequest('http://localhost/api/bookings/instant', {
          experienceId: 'experience-test-id',
          eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          location: 'Test Location',
          guestCount: 0,
        })
      )

      expect(response.status).toBe(422)
      expect(mockBookingService.createInstantBooking).not.toHaveBeenCalled()
    })

    it('maps experience guest-limit rejection to 400', async () => {
      mockBookingService.createInstantBooking.mockRejectedValue(
        new ApiError(400, 'Maximum 12 guests allowed')
      )

      const response = await createInstantBooking(
        jsonRequest('http://localhost/api/bookings/instant', {
          experienceId: 'experience-test-id',
          eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          location: 'Test Location',
          guestCount: 100,
        })
      )

      expect(response.status).toBe(400)
      await expect(response.json()).resolves.toMatchObject({ error: 'Maximum 12 guests allowed' })
    })
  })

  describe('Booking Authorization', () => {
    it('prevents unauthorized instant booking', async () => {
      mockGetRequiredSession.mockRejectedValue(new Error('UNAUTHORIZED'))

      const response = await createInstantBooking(
        jsonRequest('http://localhost/api/bookings/instant', {
          experienceId: 'experience-test-id',
          eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          location: 'Test Location',
          guestCount: 4,
        })
      )

      expect(response.status).toBe(401)
      expect(mockBookingService.createInstantBooking).not.toHaveBeenCalled()
    })

    it('maps own-experience booking rejection to 400', async () => {
      mockBookingService.createInstantBooking.mockRejectedValue(
        new ApiError(400, 'Cannot book your own experience')
      )

      const response = await createInstantBooking(
        jsonRequest('http://localhost/api/bookings/instant', {
          experienceId: 'experience-test-id',
          eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          location: 'Test Location',
          guestCount: 4,
        })
      )

      expect(response.status).toBe(400)
      await expect(response.json()).resolves.toMatchObject({
        error: 'Cannot book your own experience',
      })
    })
  })

  describe('Booking Cancellation', () => {
    it('allows a client to cancel their own booking', async () => {
      mockBookingService.cancelBooking.mockResolvedValue({
        booking: { id: 'booking-test-id', status: 'CANCELLED' },
        refund: null,
      } as any)

      const response = await deleteBooking(
        new NextRequest('http://localhost/api/bookings/booking-test-id', {
          method: 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ reason: 'Changed plans' }),
        }),
        { params: Promise.resolve({ id: 'booking-test-id' }) }
      )

      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toMatchObject({
        booking: { id: 'booking-test-id', status: 'CANCELLED' },
      })
      expect(mockBookingService.cancelBooking).toHaveBeenCalledWith(
        'booking-test-id',
        'client-test-user',
        Role.CLIENT,
        'Changed plans',
        undefined
      )
    })

    it('prevents cancellation of a completed booking', async () => {
      mockBookingService.cancelBooking.mockRejectedValue(
        new Error('BOOKING_COMPLETED_CANNOT_CANCEL')
      )

      const response = await deleteBooking(
        new NextRequest('http://localhost/api/bookings/completed-booking', {
          method: 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ reason: 'Changed plans' }),
        }),
        { params: Promise.resolve({ id: 'completed-booking' }) }
      )

      expect(response.status).toBe(400)
      await expect(response.json()).resolves.toMatchObject({
        error: 'Cannot cancel completed booking',
      })
    })
  })
})
