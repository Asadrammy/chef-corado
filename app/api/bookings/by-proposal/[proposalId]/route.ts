/**
 * Get Booking by Proposal ID API
 * 
 * Used by frontend to verify payment completion
 * Returns booking with payment details
 */

import { NextRequest, NextResponse } from 'next/server'
import { getRequiredSession } from '@/lib/auth-helpers'
import { handleApiError, ApiError } from '@/lib/error-handler'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest, context: { params: Promise<{ proposalId: string }> }) {
  try {
    await getRequiredSession()
    const { proposalId } = await context.params

    const booking = await prisma.booking.findFirst({
      where: { proposalId },
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
        booking: null,
        message: 'No booking found for this proposal',
      })
    }

    return NextResponse.json({
      booking,
    })

  } catch (error) {
    return handleApiError(error, 'Get Booking by Proposal')
  }
}
