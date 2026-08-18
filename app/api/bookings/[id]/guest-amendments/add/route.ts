import Stripe from "stripe"
import { NextRequest } from "next/server"
import { z } from "zod"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getRequiredSession, getSessionUserId } from "@/lib/auth-helpers"
import { bookingGuestAmendmentService } from "@/lib/services/booking-guest-amendment-service"
import { fromMinorUnits, GUEST_AMENDMENT_STATUS } from "@/lib/payment-plan-rules"
import { getConfiguredAppBaseUrl } from "@/lib/site-config"

const schema = z.object({
  addedAdultCount: z.number().int().min(0).max(200).default(0),
  addedChildrenUnder10: z.number().int().min(0).max(200).default(0),
})

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
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getRequiredSession()
    if (session.user.role !== "CLIENT") {
      return apiError("FORBIDDEN", "Only the booking client can add guests", 403)
    }

    const { id } = await context.params
    const payload = schema.parse(await request.json())
    const amendment = await bookingGuestAmendmentService.requestAddGuests({
      bookingId: id,
      requesterId: getSessionUserId(session),
      requesterRole: session.user.role,
      addedAdultCount: payload.addedAdultCount,
      addedChildrenUnder10: payload.addedChildrenUnder10,
    })

    if (amendment.status === GUEST_AMENDMENT_STATUS.CHEF_REVIEW_REQUIRED) {
      return apiSuccess({
        amendmentId: amendment.id,
        status: amendment.status,
        message: "Your chef needs to approve the additional guest price before payment can be taken.",
      }, 202)
    }

    const stripe = getStripeClient()
    const appBaseUrl = getConfiguredAppBaseUrl()
    const successUrl = `${appBaseUrl}/dashboard/bookings/${id}?guest_amendment=success&session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${appBaseUrl}/dashboard/chat?guest_amendment=cancelled`

    const checkoutSession = await stripe.checkout.sessions.create({
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
      success_url: successUrl,
      cancel_url: cancelUrl,
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
    if (error instanceof z.ZodError) {
      return apiError("VALIDATION_ERROR", "Validation failed", 400, error.errors.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })))
    }

    const message = error instanceof Error ? error.message : "Unable to add guests"
    const status = message === "FORBIDDEN" ? 403 : message === "BOOKING_NOT_FOUND" ? 404 : 400
    return apiError("GUEST_AMENDMENT_FAILED", message, status)
  }
}
