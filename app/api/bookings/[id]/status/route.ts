import { NextRequest, NextResponse } from 'next/server';
import { getRequiredSession, getSessionUserId } from '@/lib/auth-helpers';
import { handleApiError, ApiError } from '@/lib/error-handler';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getRequiredSession();
    const { id: bookingId } = await params;

    if (!bookingId) {
      throw new ApiError(400, 'Booking ID is required');
    }

    // Get booking with payment status
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        status: true,
        clientId: true,
        chefId: true,
        eventDate: true,
        totalPrice: true,
        createdAt: true,
        payments: {
          select: {
            id: true,
            status: true,
            totalAmount: true,
            stripePaymentIntentId: true,
            createdAt: true,
          }
        },
        experience: {
          select: {
            title: true,
            duration: true,
          }
        },
        chef: {
          select: {
            user: {
              select: {
                name: true,
                email: true,
              }
            }
          }
        },
      },
    });

    if (!booking) {
      throw new ApiError(404, 'Booking not found');
    }

    // CRITICAL: Determine effective status based on payment
    let effectiveStatus = booking.status;
    let paymentStatus = null;
    
    if (booking.payments) {
      paymentStatus = booking.payments.status;
      
      // Payment status takes precedence for user-facing status
      if (booking.payments.status === 'PAID') {
        effectiveStatus = 'CONFIRMED';
      } else if (booking.payments.status === 'FAILED') {
        effectiveStatus = 'FAILED';
      } else if (booking.payments.status === 'REFUNDED') {
        effectiveStatus = 'CANCELLED';
      } else if (booking.payments.status === 'HELD') {
        effectiveStatus = 'PENDING_PAYMENT';
      }
    }

    // CRITICAL: Check if booking is stale (created more than 15 minutes ago but still pending)
    const isStale = booking.createdAt && 
      (Date.now() - booking.createdAt.getTime()) > 15 * 60 * 1000 && 
      effectiveStatus === 'PENDING_PAYMENT';

    if (isStale) {
      logger.warn('[BOOKING_STATUS] Stale booking detected', {
        bookingId,
        createdAt: booking.createdAt,
        effectiveStatus,
      });
      
      // Auto-cancel stale bookings
      await prisma.$transaction(async (tx) => {
        // Update booking status
        await tx.booking.update({
          where: { id: bookingId },
          data: { status: 'CANCELLED' }
        });

        // Update payment status
        if (booking.payments) {
          await tx.payment.update({
            where: { id: booking.payments.id },
            data: { status: 'FAILED' }
          });
        }

        // Release availability slot
        await tx.availability.updateMany({
          where: {
            date: booking.eventDate,
            currentBookings: { gt: 0 },
          },
          data: {
            currentBookings: { decrement: 1 },
          },
        });
      });

      effectiveStatus = 'CANCELLED';
    }

    logger.info('[BOOKING_STATUS] Status retrieved', {
      bookingId,
      originalStatus: booking.status,
      effectiveStatus,
      paymentStatus,
      isStale,
    });

    return NextResponse.json({
      id: booking.id,
      status: effectiveStatus,
      paymentStatus,
      isStale,
      booking: {
        id: booking.id,
        eventDate: booking.eventDate,
        totalPrice: booking.totalPrice,
        experience: booking.experience,
        chef: booking.chef,
        createdAt: booking.createdAt,
      },
    });

  } catch (error) {
    logger.error('[BOOKING_STATUS] Error retrieving status', error);
    return handleApiError(error, 'Booking Status');
  }
}
