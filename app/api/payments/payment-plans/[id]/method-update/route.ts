import Stripe from "stripe"
import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { getRequiredSession, getSessionUserId } from "@/lib/auth-helpers"
import { paymentPlanService } from "@/lib/services/payment-plan-service"
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
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getRequiredSession()
    if (session.user.role !== "CLIENT") {
      return apiError("FORBIDDEN", "Only the booking client can update this payment method", 403)
    }

    const { id } = await context.params
    const appBaseUrl = getConfiguredAppBaseUrl()
    const checkoutSession = await paymentPlanService.createPaymentMethodUpdateSession({
      paymentPlanId: id,
      clientId: getSessionUserId(session),
      stripe: getStripeClient(),
      successUrl: `${appBaseUrl}/dashboard/bookings?payment_method=updated&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${appBaseUrl}/dashboard/bookings?payment_method=cancelled`,
    })

    return apiSuccess({ url: checkoutSession.url })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update payment method"
    const status = message === "FORBIDDEN" ? 403 : message === "PAYMENT_PLAN_NOT_FOUND" ? 404 : 400
    return apiError("PAYMENT_METHOD_UPDATE_FAILED", message, status)
  }
}
