import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Stripe from 'stripe';
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/api-response';
import { normalizeCurrency } from '@/lib/currency';
import { calculateChefPayout, calculatePlatformCommission } from '@/lib/marketplace-rules';

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

const instantPaymentSchema = z.object({
  bookingId: z.string().cuid(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "CLIENT") {
      return apiError("UNAUTHORIZED", "Unauthorized", 401);
    }

    if (!process.env.STRIPE_SECRET_KEY || 
        process.env.STRIPE_SECRET_KEY.includes('placeholder') ||
        process.env.STRIPE_SECRET_KEY === 'sk_test_placeholder' ||
        process.env.STRIPE_SECRET_KEY === 'sk_live_placeholder') {
      return apiError("INTERNAL_SERVER_ERROR", "Stripe not configured. Please add a valid STRIPE_SECRET_KEY to your .env file.", 500);
    }

    const payload = instantPaymentSchema.parse(await request.json());

    // Fetch the booking
    const booking = await prisma.booking.findUnique({
      where: { id: payload.bookingId },
      include: {
        client: true,
        chef: {
          include: { user: true }
        },
        experience: true,
        payments: true,
      },
    });

    if (!booking) {
      return apiError("NOT_FOUND", "Booking not found", 404);
    }

    if (booking.clientId !== session.user.id) {
      return apiError("UNAUTHORIZED", "Unauthorized", 401);
    }

    if (booking.bookingType !== "INSTANT") {
      return apiError("BAD_REQUEST", "Not an instant booking", 400);
    }

    // Check if payment already exists
    if (booking.payments) {
      return apiError("CONFLICT", "Payment already exists for this booking", 400);
    }

    const amount = booking.totalPrice;
    if (!Number.isFinite(amount)) {
      return apiError("BAD_REQUEST", "Invalid booking price", 400);
    }
    const currency = normalizeCurrency((booking as any).currency || "GBP");

    const successUrl = process.env.STRIPE_SUCCESS_URL ?? 
      `${process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/dashboard/client/bookings?status=success`;
    const cancelUrl = process.env.STRIPE_CANCEL_URL ?? 
      `${process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/dashboard/client/bookings?status=cancelled`;

    // Create Stripe checkout session
    const stripe = getStripeClient();
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: Math.round(amount * 100),
            product_data: {
              name: `Instant Booking: ${booking.experience?.title || "Experience"}`,
              description: `Event on ${booking.eventDate.toLocaleDateString()} at ${booking.location}`,
            },
          },
          quantity: 1,
        },
      ],
      customer_email: session.user.email ?? undefined,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        bookingId: booking.id,
        bookingType: "INSTANT",
        currency,
      },
      payment_intent_data: {
        metadata: {
          bookingId: booking.id,
          bookingType: "INSTANT",
        },
      },
    });

    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        totalAmount: amount,
        commissionAmount: calculatePlatformCommission(amount),
        chefAmount: calculateChefPayout(amount),
        currency,
        status: "HELD",
        stripeCheckoutSessionId: checkoutSession.id,
        stripePaymentIntentId: typeof checkoutSession.payment_intent === "string" ? checkoutSession.payment_intent : undefined,
      },
    });

    return apiSuccess({ url: checkoutSession.url });
  } catch (error) {
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
    return apiError("INTERNAL_SERVER_ERROR", "Unable to create checkout", 500);
  }
}
