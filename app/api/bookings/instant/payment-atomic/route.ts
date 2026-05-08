import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Stripe from 'stripe';
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/api-response';
import { normalizeCurrency } from '@/lib/currency';
import { logger } from '@/lib/logger';
import { enforceUserModeration } from '@/lib/security/moderation-guard';
import { enforceClientCompliance } from '@/lib/security/legal-compliance';
import { enforceChefModeration } from '@/lib/security/moderation-guard';

// Initialize Stripe
const getStripeClient = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY not configured");
  }

  // Check for placeholder keys
  if (process.env.STRIPE_SECRET_KEY.includes('placeholder') || 
      process.env.STRIPE_SECRET_KEY === 'sk_test_placeholder' ||
      process.env.STRIPE_SECRET_KEY === 'sk_live_placeholder') {
    throw new Error("STRIPE_SECRET_KEY is a placeholder. Please configure a real Stripe API key in your .env file.")
  }

  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-03-25.dahlia" as Stripe.LatestApiVersion,
  });
};

const atomicPaymentSchema = z.object({
  experienceId: z.string().cuid(),
  eventDate: z.string(),
  location: z.string().min(3),
  guestCount: z.number().int().positive(),
  specialRequests: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "CLIENT") {
      return apiError("UNAUTHORIZED", "Unauthorized", 401);
    }

    // Enforce moderation - client must not be banned
    await enforceUserModeration(session.user.id as string);

    // Enforce client compliance (terms acceptance)
    await enforceClientCompliance(session.user.id as string);

    if (!process.env.STRIPE_SECRET_KEY || 
        process.env.STRIPE_SECRET_KEY.includes('placeholder') ||
        process.env.STRIPE_SECRET_KEY === 'sk_test_placeholder' ||
        process.env.STRIPE_SECRET_KEY === 'sk_live_placeholder') {
      return apiError("INTERNAL_SERVER_ERROR", "Stripe not configured. Please add a valid STRIPE_SECRET_KEY to your .env file.", 500);
    }

    const payload = atomicPaymentSchema.parse(await request.json());

    // CRITICAL: Atomic transaction - validate availability AND create payment session
    const stripe = getStripeClient();
    
    const result = await prisma.$transaction(async (tx) => {
      // Step 1: Get and validate experience
      const experience = await tx.experience.findUnique({
        where: { id: payload.experienceId },
        include: {
          chef: true,
        },
      });

      if (!experience) {
        throw new Error("Experience not found");
      }

      // Enforce chef moderation - chef must not be banned
      await enforceChefModeration(experience.chefId);

      if (!experience.isActive) {
        throw new Error("Experience is not available");
      }

      // Step 2: Check availability with pessimistic locking
      const bookingDate = new Date(payload.eventDate);
      const availability = await tx.availability.findFirst({
        where: {
          chefId: experience.chefId,
          date: bookingDate,
          isAvailable: true,
        },
      });

      if (!availability) {
        throw new Error("Chef is not available on this date");
      }

      if (availability.currentBookings >= availability.maxBookings) {
        throw new Error("No availability left for this date");
      }

      // Step 3: Check for existing bookings (double booking prevention)
      const existingBooking = await tx.booking.findFirst({
        where: {
          chefId: experience.chefId,
          experienceId: payload.experienceId,
          eventDate: bookingDate,
          status: { not: 'CANCELLED' },
        },
      });

      if (existingBooking) {
        throw new Error("This time slot is already booked");
      }

      // Step 4: Calculate pricing with cooking class invariant
      const isCookingClass = experience.serviceType === 'COOKING_CLASS';
      const unitPrice = isCookingClass
        ? (experience.pricePerStudent ?? experience.price)
        : experience.price;
      const totalPrice = unitPrice * payload.guestCount;
      const commissionAmount = totalPrice * 0.2;
      const chefAmount = totalPrice * 0.8;
      const currency = normalizeCurrency((experience as any).currency || 'GBP');
      const bookingData = {
        clientId: session.user.id as string,
        chefId: experience.chefId,
        experienceId: payload.experienceId,
        eventDate: bookingDate,
        location: payload.location,
        guestCount: payload.guestCount,
        totalPrice,
        currency,
        bookingType: 'INSTANT',
        status: 'PENDING_PAYMENT',
        specialRequests: payload.specialRequests || null,
      } as any
      const paymentData = {
        bookingId: undefined as unknown as string,
        totalAmount: totalPrice,
        commissionAmount,
        chefAmount,
        currency,
        status: 'HELD',
      } as any

      // Step 5: Create PENDING booking (will be confirmed in webhook)
      const booking = await tx.booking.create({
        data: bookingData,
      });

      // Step 6: Create payment record in HELD state
      paymentData.bookingId = booking.id
      const payment = await tx.payment.create({
        data: paymentData,
      });

      // Step 7: Update availability (atomic)
      await tx.availability.update({
        where: { id: availability.id },
        data: {
          currentBookings: availability.currentBookings + 1,
        },
      });

      return {
        booking,
        payment,
        experience,
        availability,
      };
    }, {
      timeout: 15000, // 15 second timeout
    });

    // Step 8: Create Stripe checkout session outside transaction
    const successUrl = process.env.STRIPE_SUCCESS_URL ?? 
      `${process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/dashboard/client/bookings?status=success`;
    const cancelUrl = process.env.STRIPE_CANCEL_URL ?? 
      `${process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/dashboard/client/bookings?status=cancelled`;

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: normalizeCurrency((result.booking as any).currency || 'GBP'),
            unit_amount: Math.round(result.booking.totalPrice * 100),
            product_data: {
              name: `Instant Booking: ${result.experience.title}`,
              description: `Event on ${result.booking.eventDate.toLocaleDateString()} at ${result.booking.location}`,
            },
          },
          quantity: 1,
        },
      ],
      customer_email: session.user.email ?? undefined,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        bookingId: result.booking.id,
        paymentId: result.payment.id,
        bookingType: "INSTANT_ATOMIC",
        availabilityId: result.availability.id,
        currency: normalizeCurrency((result.booking as any).currency || 'GBP'),
      },
      // CRITICAL: Add payment intent data for webhook processing
      payment_intent_data: {
        metadata: {
          bookingId: result.booking.id,
          paymentId: result.payment.id,
        },
      },
    });

    // Step 9: Update payment with Stripe IDs
    await prisma.payment.update({
      where: { id: result.payment.id },
      data: {
        stripePaymentIntentId: checkoutSession.payment_intent as string,
        stripeChargeId: checkoutSession.id,
      },
    });

    logger.info('[ATOMIC_PAYMENT] Payment session created', {
      bookingId: result.booking.id,
      paymentId: result.payment.id,
      sessionId: checkoutSession.id,
    });

    return apiSuccess({ 
      url: checkoutSession.url,
      bookingId: result.booking.id,
      paymentId: result.payment.id,
    });

  } catch (error) {
    logger.error('[ATOMIC_PAYMENT] Error creating payment session', error);
    
    if (error instanceof z.ZodError) {
      return apiError(
        "VALIDATION_ERROR",
        "Validation failed",
        422,
        error.errors.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        }))
      );
    }

    // CRITICAL: Don't expose internal error details
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // CRITICAL: Log but don't expose availability details
    if (errorMessage.includes("availability") || errorMessage.includes("booked")) {
      return apiError("AVAILABILITY_ERROR", "Selected time slot is no longer available", 400);
    }
    
    return apiError("INTERNAL_SERVER_ERROR", "Unable to create payment session", 500);
  }
}
