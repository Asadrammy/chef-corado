import { NextRequest, NextResponse } from 'next/server';
import { getRequiredSession, getSessionUserId } from '@/lib/auth-helpers';
import { handleApiError, ApiError } from '@/lib/error-handler';
import { bookingService } from '@/lib/services/booking-service';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const instantBookingSchema = z.object({
  experienceId: z.string().min(1, 'Experience ID is required'),
  eventDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date format'),
  location: z.string().min(3, 'Location must be at least 3 characters'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  guestCount: z.number().int().positive('Guest count must be at least 1'),
  specialRequests: z.string().max(1000, 'Special requests cannot exceed 1000 characters').optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getRequiredSession();
    const userId = getSessionUserId(session);

    const body = await request.json();
    const validatedData = instantBookingSchema.parse(body);

    const { experienceId, guestCount } = validatedData;

    logger.info('Booking request started', { experienceId, guestCount });
    const booking = await bookingService.createInstantBooking({
      userId,
      ...validatedData,
    })

    logger.info('Booking created successfully', { bookingId: booking.id });
    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    logger.error('Error creating instant booking', error);
    if (error instanceof Error && error.message.startsWith("MARKET_BOOKING_INACTIVE:")) {
      return NextResponse.json({ error: "ChefaChef is preparing to launch bookings in this market. Instant booking is not yet available." }, { status: 403 });
    }
    return handleApiError(error, 'Instant Booking');
  }
}

export async function GET(request: NextRequest) {
  try {
    await getRequiredSession();

    const { searchParams } = new URL(request.url);
    const experienceId = searchParams.get('experienceId');
    const date = searchParams.get('date');

    if (!experienceId || !date) {
      throw new ApiError(400, 'Experience ID and date are required');
    }

    // Validate date format
    if (isNaN(Date.parse(date))) {
      throw new ApiError(400, 'Invalid date format');
    }

    const result = await bookingService.getInstantAvailability(experienceId, date)

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error checking booking availability', error);
    return handleApiError(error, 'Availability Check');
  }
}
