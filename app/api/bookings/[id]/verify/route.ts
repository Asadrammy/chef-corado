/**
 * Booking Verification API
 * 
 * CRITICAL: Verifies booking exists and payment is confirmed
 * Used by frontend to ensure payment success is real
 */

import { NextRequest, NextResponse } from 'next/server'
import { getRequiredSession } from '@/lib/auth-helpers'
import { handleApiError, ApiError } from '@/lib/error-handler'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await getRequiredSession()
    const { id: bookingId } = await context.params

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        payments: true,
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
            request: {
              select: {
                title: true,
                eventDate: true,
                location: true,
              },
            },
          },
        },
      },
    })

    if (!booking) {
      return NextResponse.json({
        verified: false,
        error: 'Booking not found',
      })
    }

    // CRITICAL: Verify payment exists and is PAID
    if (!booking.payments) {
      return NextResponse.json({
        verified: false,
        error: 'Payment not found for booking',
      })
    }

    if (booking.payments.status !== 'PAID') {
      return NextResponse.json({
        verified: false,
        error: `Payment not completed: ${booking.payments.status}`,
      })
    }

    // CRITICAL: Verify booking status
    if (booking.status !== 'CONFIRMED') {
      return NextResponse.json({
        verified: false,
        error: `Booking not confirmed: ${booking.status}`,
      })
    }

    return NextResponse.json({
      verified: true,
      booking,
    })

  } catch (error) {
    return handleApiError(error, 'Booking Verification')
  }
}
