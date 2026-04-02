import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { handleApiError, ApiError, validateSession } from '@/lib/error-handler';
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
    const session = await getServerSession(authOptions);
    validateSession(session);

    const userId = session!.user!.id;

    const body = await request.json();
    const validatedData = instantBookingSchema.parse(body);

    const { experienceId, eventDate, location, latitude, longitude, guestCount, specialRequests } = validatedData;

    logger.info('Booking request started', { experienceId, guestCount });

    // Validate date is in the future
    const bookingDate = new Date(eventDate);
    if (bookingDate < new Date()) {
      throw new ApiError(400, 'Event date must be in the future');
    }

    // Get the experience details
    const experience = await prisma.experience.findUnique({
      where: { id: experienceId },
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
    });

    if (!experience) {
      throw new ApiError(404, 'Experience not found');
    }

    if (!experience.isActive) {
      throw new ApiError(400, 'Experience is not available for booking');
    }

    // Validate guest count
    if (experience.minGuests && guestCount < experience.minGuests) {
      throw new ApiError(400, `Minimum ${experience.minGuests} guests required`);
    }

    if (experience.maxGuests && guestCount > experience.maxGuests) {
      throw new ApiError(400, `Maximum ${experience.maxGuests} guests allowed`);
    }

    // Check if client is trying to book their own experience
    const clientChefProfile = await prisma.chefProfile.findUnique({
      where: { userId: userId as string },
    });

    if (clientChefProfile?.id && experience.chefId && clientChefProfile.id === experience.chefId) {
      throw new ApiError(400, 'Cannot book your own experience');
    }

    // Check availability for the selected date
    const availability = await prisma.availability.findFirst({
      where: {
        chefId: experience.chefId,
        date: bookingDate,
        isAvailable: true,
      },
    });

    if (!availability) {
      throw new ApiError(400, 'Chef is not available on this date');
    }

    // CRITICAL: Check for double booking with transaction to prevent race conditions
    const existingBooking = await prisma.booking.findFirst({
      where: {
        chefId: experience.chefId,
        experienceId: experienceId,
        eventDate: bookingDate,
        status: { not: 'CANCELLED' },
      },
    });

    if (existingBooking) {
      throw new ApiError(400, 'This time slot is already booked. Please select another date.');
    }

    // Check if availability has capacity
    if (availability.currentBookings >= availability.maxBookings) {
      throw new ApiError(400, 'No availability left for this date');
    }

    // Calculate total price
    const totalPrice = experience.price * guestCount;

    // Create the booking with transaction
    const booking = await prisma.$transaction(async (tx) => {
      // Create booking
      const newBooking = await tx.booking.create({
        data: {
          clientId: userId as string,
          chefId: experience.chefId,
          experienceId: experienceId,
          eventDate: bookingDate,
          location,
          latitude: latitude || null,
          longitude: longitude || null,
          guestCount,
          totalPrice,
          bookingType: 'INSTANT',
          status: 'PENDING',
          specialRequests: specialRequests || null,
        },
        include: {
          client: {
            select: {
              name: true,
              email: true,
            },
          },
          chef: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
          experience: true,
        },
      });

      // Update availability
      await tx.availability.update({
        where: { id: availability.id },
        data: {
          currentBookings: availability.currentBookings + 1,
        },
      });

      // Create notifications
      await tx.notification.create({
        data: {
          userId: experience.chef.user.id as string,
          type: 'BOOKING_CREATED',
          message: `New instant booking for "${experience.title}" on ${bookingDate.toLocaleDateString()}`,
        },
      });

      await tx.notification.create({
        data: {
          userId: userId as string,
          type: 'BOOKING_CREATED',
          message: `Your booking for "${experience.title}" has been created and is pending confirmation`,
        },
      });

      return newBooking;
    });

    logger.info('Booking created successfully', { bookingId: booking.id });
    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    logger.error('Error creating instant booking', error);
    return handleApiError(error, 'Instant Booking');
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    validateSession(session);

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

    // Get experience details
    const experience = await prisma.experience.findUnique({
      where: { id: experienceId },
      include: {
        chef: true,
      },
    });

    if (!experience) {
      throw new ApiError(404, 'Experience not found');
    }

    // Check availability
    const availability = await prisma.availability.findFirst({
      where: {
        chefId: experience.chefId,
        date: new Date(date),
        isAvailable: true,
      },
    });

    const canBook = !!availability && availability.currentBookings < availability.maxBookings;
    const remainingSlots = availability ? availability.maxBookings - availability.currentBookings : 0;

    return NextResponse.json({
      canBook,
      remainingSlots,
      availability: availability ? {
        startTime: availability.startTime,
        endTime: availability.endTime,
        maxBookings: availability.maxBookings,
        currentBookings: availability.currentBookings,
      } : null,
    });
  } catch (error) {
    logger.error('Error checking booking availability', error);
    return handleApiError(error, 'Availability Check');
  }
}
