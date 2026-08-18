import Stripe from "stripe"
import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getRequiredSession, getSessionUserId } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { bookingGuestAmendmentService } from "@/lib/services/booking-guest-amendment-service"
import { fromMinorUnits, GUEST_AMENDMENT_STATUS, GUEST_AMENDMENT_TYPES } from "@/lib/payment-plan-rules"
import { getConfiguredAppBaseUrl } from "@/lib/site-config"

function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes("placeholder")) {
    throw new Error("STRIPE_NOT_CONFIGURED")
  }

  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-03-25.dahlia" as Stripe.LatestApiVersion,
  })
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; amendmentId: string }> }
) {
  try {
    const session = await getRequiredSession()
    if (session.user.role !== "CLIENT") {
      return apiError("FORBIDDEN", "Only the booking client can pay for this guest amendment", 403)
    }

    const { id, amendmentId } = await context.params
    const amendment = await prisma.bookingGuestAmendment.findUnique({
      where: { id: amendmentId },
      include: { booking: true },
    })
    if (!amendment || amendment.bookingId !== id) {
      return apiError("NOT_FOUND", "Guest amendment not found", 404)
    }
    if (amendment.booking.clientId !== getSessionUserId(session)) {
      return apiError("FORBIDDEN", "Forbidden", 403)
    }
    if (amendment.amendmentType !== GUEST_AMENDMENT_TYPES.ADD_GUESTS) {
      return apiError("CONFLICT", "Only Add Guests amendments can be paid here", 409)
    }
    if (amendment.status !== GUEST_AMENDMENT_STATUS.PENDING_PAYMENT || amendment.incrementalAmountMinor <= 0) {
      return apiError("CONFLICT", "This amendment is not ready for payment", 409)
    }

    const appBaseUrl = getConfiguredAppBaseUrl()
    const checkoutSession = await getStripeClient().checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: amendment.currency.toLowerCase(),
            unit_amount: amendment.incrementalAmountMinor,
            product_data: {
              name: "Add Guests",
              description: `Additional guests for booking ${id}`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${appBaseUrl}/dashboard/bookings/${id}?guest_amendment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appBaseUrl}/dashboard/bookings/${id}?guest_amendment=cancelled`,
      metadata: {
        amendmentId: amendment.id,
        bookingId: id,
        amendmentType: amendment.amendmentType,
      },
      payment_intent_data: {
        metadata: {
          amendmentId: amendment.id,
          bookingId: id,
          amendmentType: amendment.amendmentType,
        },
      },
    })

    await bookingGuestAmendmentService.attachCheckoutSession({
      amendmentId: amendment.id,
      stripeCheckoutSessionId: checkoutSession.id,
    })

    return apiSuccess({
      amendmentId: amendment.id,
      status: amendment.status,
      url: checkoutSession.url,
      amount: fromMinorUnits(amendment.incrementalAmountMinor),
      currency: amendment.currency,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create guest amendment checkout"
    return apiError("GUEST_AMENDMENT_CHECKOUT_FAILED", message, 400)
  }
}
