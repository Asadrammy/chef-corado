import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getRequiredSession, getSessionUserId } from '@/lib/auth-helpers';
import { handleApiError } from '@/lib/error-handler';
import { bookingService } from '@/lib/services/booking-service';

const updateBookingSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']),
});

const cancelBookingSchema = z.object({
  reason: z.string().optional(),
  refundAmount: z.number().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getRequiredSession();

    const { id } = await params;
    const booking = await bookingService.getBookingById(id, getSessionUserId(session), session.user.role);

    return NextResponse.json(booking);
  } catch (error) {
    if (error instanceof Error && error.message === 'BOOKING_NOT_FOUND') {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return handleApiError(error, 'Bookings [id] GET');
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getRequiredSession();
    const { id } = await params;
    const body = await request.json();
    const { status } = updateBookingSchema.parse(body);

    const booking = await bookingService.updateBookingStatus(
      id,
      getSessionUserId(session),
      session.user.role,
      status
    )

    return NextResponse.json(booking);
  } catch (error) {
    if (error instanceof Error && error.message === 'BOOKING_NOT_FOUND') {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return handleApiError(error, 'Bookings [id] PATCH');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getRequiredSession();

    const { id } = await params;
    const body = await request.json();
    const { reason, refundAmount } = cancelBookingSchema.parse(body);

    const result = await bookingService.cancelBooking(
      id,
      getSessionUserId(session),
      session.user.role,
      reason,
      refundAmount
    )

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'BOOKING_NOT_FOUND') {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (error instanceof Error && error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Only the client can cancel this booking' }, { status: 403 });
    }

    if (error instanceof Error && error.message === 'BOOKING_ALREADY_CANCELLED') {
      return NextResponse.json({ error: 'Booking already cancelled' }, { status: 400 });
    }

    if (error instanceof Error && error.message === 'BOOKING_COMPLETED_CANNOT_CANCEL') {
      return NextResponse.json({ error: 'Cannot cancel completed booking' }, { status: 400 });
    }

    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return handleApiError(error, 'Bookings [id] DELETE');
  }
}
