import Stripe from "stripe"
import { NextRequest } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { prisma } from "@/lib/prisma"
import { fromMinorUnits, hashSecureToken, PAYMENT_INSTALLMENT_STATUS } from "@/lib/payment-plan-rules"
import { getConfiguredAppBaseUrl } from "@/lib/site-config"

function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes("placeholder")) {
    throw new Error("STRIPE_NOT_CONFIGURED")
  }

  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-03-25.dahlia" as Stripe.LatestApiVersion,
  })
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  return createShareCheckout(request, context)
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  return createShareCheckout(request, context)
}

async function createShareCheckout(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params
    const share = await prisma.splitBillShare.findUnique({
      where: { tokenHash: hashSecureToken(token) },
      include: {
        installment: true,
        paymentPlan: {
          include: {
            proposal: {
              include: {
                chef: { include: { user: true } },
                request: true,
              },
            },
          },
        },
      },
    })

    if (!share || !share.installment) {
      return apiError("NOT_FOUND", "Split bill share not found", 404)
    }
    if (share.tokenExpiresAt.getTime() <= Date.now()) {
      return apiError("EXPIRED", "This split bill link has expired", 410)
    }
    if (share.status === PAYMENT_INSTALLMENT_STATUS.PAID || share.installment.status === PAYMENT_INSTALLMENT_STATUS.PAID) {
      return apiSuccess({ status: "PAID", message: "This share has already been paid." })
    }
    if (share.status !== PAYMENT_INSTALLMENT_STATUS.PENDING || share.installment.status !== PAYMENT_INSTALLMENT_STATUS.PENDING) {
      return apiError("CONFLICT", "This split bill share is not payable", 409)
    }

    const stripe = getStripeClient()
    const appBaseUrl = getConfiguredAppBaseUrl()
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: share.payerEmail ?? undefined,
      line_items: [
        {
          price_data: {
            currency: share.currency.toLowerCase(),
            unit_amount: share.amountMinor,
            product_data: {
              name: "ChefaChef split bill share",
              description: `Share for booking request ${share.paymentPlan.proposal.request.title}`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${appBaseUrl}/payment/split-bill/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appBaseUrl}/payment/split-bill/cancelled`,
      metadata: {
        proposalId: share.paymentPlan.proposalId,
        paymentPlanId: share.paymentPlanId,
        installmentId: share.installment.id,
        splitShareId: share.id,
        planType: share.paymentPlan.planType,
        installmentKind: share.installment.kind,
      },
      payment_intent_data: {
        metadata: {
          proposalId: share.paymentPlan.proposalId,
          paymentPlanId: share.paymentPlanId,
          installmentId: share.installment.id,
          splitShareId: share.id,
          planType: share.paymentPlan.planType,
          installmentKind: share.installment.kind,
        },
      },
    })

    await prisma.$transaction([
      prisma.splitBillShare.update({
        where: { id: share.id },
        data: { stripeCheckoutSessionId: checkoutSession.id },
      }),
      prisma.paymentInstallment.update({
        where: { id: share.installment.id },
        data: { stripeCheckoutSessionId: checkoutSession.id },
      }),
    ])

    return apiSuccess({
      url: checkoutSession.url,
      amount: fromMinorUnits(share.amountMinor),
      currency: share.currency,
      deadlineAt: share.deadlineAt,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create split share checkout"
    return apiError("SPLIT_SHARE_CHECKOUT_FAILED", message, message === "STRIPE_NOT_CONFIGURED" ? 503 : 400)
  }
}
