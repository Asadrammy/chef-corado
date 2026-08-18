import Stripe from "stripe"
import { z } from "zod"

import { authOptions } from "@/lib/auth"
import { apiError, apiSuccess } from "@/lib/api-response"
import { normalizeCurrency } from "@/lib/currency"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { sendEmail } from "@/lib/email"
import { paymentGuarantee } from "@/lib/services/payment-guarantee"
import { logger } from "@/lib/logger"
import { enforceUserModeration, enforceChefModeration } from "@/lib/security/moderation-guard"
import { enforceClientCompliance, enforceChefCompliance } from "@/lib/security/legal-compliance"
import {
  PROPOSAL_CHECKOUT_LOCK_TTL_SECONDS,
  acquireProposalCheckoutLocks,
  releaseProposalCheckoutLocks,
} from "@/lib/services/proposal-checkout-locks"
import { paymentPlanService } from "@/lib/services/payment-plan-service"
import {
  fromMinorUnits,
  PAYMENT_PLAN_TYPES,
  type PaymentPlanType,
} from "@/lib/payment-plan-rules"
import { getConfiguredAppBaseUrl } from "@/lib/site-config"

// Initialize Stripe with safety check
const getStripeClient = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY not configured")
  }

  // Check for placeholder keys
  if (process.env.STRIPE_SECRET_KEY.includes('placeholder') || 
      process.env.STRIPE_SECRET_KEY === 'sk_test_placeholder' ||
      process.env.STRIPE_SECRET_KEY === 'sk_live_placeholder') {
    throw new Error("STRIPE_SECRET_KEY is a placeholder. Please configure a real Stripe API key in your .env file.")
  }

  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-03-25.dahlia" as Stripe.LatestApiVersion,
  })
}

const checkoutSchema = z.object({
  proposalId: z.string().cuid(),
  planType: z.enum(["FULL_PAYMENT", "DEPOSIT", "SPLIT_BILL"]).default("FULL_PAYMENT"),
  shareCount: z.number().int().min(1).max(100).optional(),
  splitShares: z.array(z.object({
    payerName: z.string().trim().max(120).optional(),
    payerEmail: z.string().trim().email().optional(),
    amountMinor: z.number().int().positive().optional(),
  })).max(100).optional(),
})

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== "CLIENT") {
    return apiError("UNAUTHORIZED", "Unauthorized", 401)
  }

  // Enforce moderation - client must not be banned
  await enforceUserModeration(session.user.id)

  // Enforce client compliance (terms acceptance)
  await enforceClientCompliance(session.user.id)

  if (!process.env.STRIPE_SECRET_KEY || 
      process.env.STRIPE_SECRET_KEY.includes('placeholder') ||
      process.env.STRIPE_SECRET_KEY === 'sk_test_placeholder' ||
      process.env.STRIPE_SECRET_KEY === 'sk_live_placeholder') {
    return apiError("PAYMENT_CONFIGURATION_REQUIRED", "Card payments are temporarily unavailable. Please contact support or try again later.", 503)
  }

  let payload: z.infer<typeof checkoutSchema>
  try {
    const json = await request.json()
    payload = checkoutSchema.parse(json)
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
      )
    }
    return apiError("BAD_REQUEST", "Invalid payload", 400)
  }

  const proposal = await prisma.proposal.findUnique({
    where: { id: payload.proposalId },
    include: { 
      chef: { include: { user: true } }, 
      request: { include: { client: true, multiDayDates: true } }
    },
  })

  if (!proposal) {
    return apiError("NOT_FOUND", "Proposal not found", 404)
  }

  // Enforce chef moderation - chef must not be banned
  await enforceChefModeration(proposal.chefId)

  // Enforce chef compliance (terms + structured legal confirmations + approval)
  await enforceChefCompliance(proposal.chef.userId)

  if (proposal.request.clientId !== session.user.id) {
    return apiError("UNAUTHORIZED", "Unauthorized", 401)
  }

  if (!['ACCEPTED', 'ACCEPTED_PENDING_PAYMENT'].includes(proposal.status)) {
    return apiError("CONFLICT", "Proposal not accepted", 400)
  }

  // 🔴 P0 FIX #1: ATOMIC DISTRIBUTED LOCKING
  const lockKey = `payment_lock_${payload.proposalId}`
  let lockAcquired = false
  let releaseLocksOnExit = true
  
  try {
    // Import Redis dynamically to avoid build issues
    const { redisLocks } = await import("@/lib/redis")
    
    // ATOMIC: Try to acquire lock with single SET NX EX command
    const lockResult = await redisLocks.acquireLock(lockKey, PROPOSAL_CHECKOUT_LOCK_TTL_SECONDS)
    
    if (!lockResult) {
      logger.warn('[PAYMENT_CHECKOUT] Lock acquisition failed - concurrent payment', { proposalId: payload.proposalId })
      return apiError("CONFLICT", "Another user is booking this slot", 409)
    }
    
    lockAcquired = true
    logger.info('[PAYMENT_CHECKOUT] Atomic lock acquired', { proposalId: payload.proposalId })
    
  } catch (redisError) {
    logger.error('[PAYMENT_CHECKOUT] Redis lock error', { error: redisError })
    return apiError("INTERNAL_SERVER_ERROR", "Locking system unavailable", 503)
  }

  try {
    // CRITICAL: Validate proposal is ready for payment
    const validation = await paymentGuarantee.validateProposalForPayment(
      payload.proposalId,
      session.user.id
    )

    if (!validation.valid) {
      if (validation.error?.startsWith("MARKET_PAYMENTS_INACTIVE:")) {
        return apiError("MARKET_INACTIVE", "ChefaChef is preparing to launch payments in this market. Online checkout is not yet available.", 403)
      }
      return apiError("CONFLICT", validation.error || "Proposal not ready for payment", 400)
    }
    
    // 🔴 P0 FIX #2: CAPACITY CHECK BEFORE PAYMENT
    const requestedDates = proposal.request.multiDayDates.length > 0
      ? proposal.request.multiDayDates.map((item) => item.date)
      : [proposal.request.eventDate]

    const availabilitySlots = await prisma.availability.findMany({
      where: {
        chefId: proposal.chefId,
        date: { in: requestedDates },
        isAvailable: true,
        currentBookings: { lt: prisma.availability.fields.maxBookings }
      }
    })
    
    if (availabilitySlots.length !== requestedDates.length) {
      logger.warn('[PAYMENT_CHECKOUT] Slot no longer available', { 
        proposalId: payload.proposalId,
        eventDates: requestedDates.map((date) => date.toISOString().slice(0, 10)),
        chefId: proposal.chefId
      })
      return apiError("CONFLICT", "Slot no longer available", 409)
    }

    const checkoutLocks = await acquireProposalCheckoutLocks({
      proposalId: payload.proposalId,
      availabilityIds: availabilitySlots.map((slot) => slot.id),
      ttlSeconds: PROPOSAL_CHECKOUT_LOCK_TTL_SECONDS,
    })

    if (!checkoutLocks.acquired) {
      return apiError("CONFLICT", "Another checkout is already holding one or more selected dates", 409)
    }
    
    logger.info('[PAYMENT_CHECKOUT] Capacity check passed', { 
      proposalId: payload.proposalId,
      availabilityIds: availabilitySlots.map((slot) => slot.id),
    })

  const amount = Number(proposal.price)
  if (!Number.isFinite(amount)) {
    return apiError("BAD_REQUEST", "Invalid proposal price", 400)
  }
  const currency = normalizeCurrency((proposal.request as any)?.currency || "GBP")
  const plan = await paymentPlanService.createOrReusePlan({
    proposalId: payload.proposalId,
    clientId: session.user.id,
    planType: payload.planType,
    shareCount: payload.shareCount,
    splitShares: payload.splitShares,
  })

  if (plan.planType === PAYMENT_PLAN_TYPES.SPLIT_BILL) {
    releaseLocksOnExit = false
    const appBaseUrl = getConfiguredAppBaseUrl()
    const shareInvites = (plan as any).shareInvites ?? []
    const splitShares = plan.splitShares.map((share: any) => {
      const invite = shareInvites.find((item: any) => item.shareId === share.id)
      return {
        id: share.id,
        payerEmail: share.payerEmail,
        payerName: share.payerName,
        amount: fromMinorUnits(share.amountMinor),
        currency: share.currency,
        status: share.status,
        deadlineAt: share.deadlineAt,
        paymentUrl: invite ? `${appBaseUrl}/payment/split-bill/${invite.token}` : null,
      }
    })

    if (shareInvites.length) {
      await Promise.allSettled(splitShares
        .filter((share: any) => share.payerEmail && share.paymentUrl)
        .map((share: any) => sendEmail({
          to: share.payerEmail,
          subject: "ChefaChef split bill payment invitation",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>ChefaChef split bill payment invitation</h2>
              <p>You have been invited to pay a share for ${escapeHtml(proposal.request.title ?? "your event")}.</p>
              <p><strong>Amount:</strong> ${share.currency} ${share.amount.toFixed(2)}</p>
              <p><strong>Deadline:</strong> ${new Date(share.deadlineAt).toLocaleDateString()}</p>
              <p><a href="${share.paymentUrl}" style="display:inline-block;background:#FF5C00;color:#fff;padding:12px 18px;border-radius:6px;text-decoration:none;">Pay your share</a></p>
              <p>If you were not expecting this invitation, you can ignore this email.</p>
            </div>
          `,
        })))
      await prisma.notification.create({
        data: {
          userId: session.user.id,
          type: "SPLIT_BILL_CREATED",
          message: `Split bill created for ${fromMinorUnits(plan.totalAmountMinor)} ${plan.currency}.`,
        },
      })
    }

    return apiSuccess({
      paymentPlanId: plan.id,
      planType: plan.planType,
      status: plan.status,
      totalAmount: fromMinorUnits(plan.totalAmountMinor),
      paidAmount: fromMinorUnits(plan.paidAmountMinor),
      outstandingAmount: fromMinorUnits(plan.outstandingAmountMinor),
      currency: plan.currency,
      deadlineAt: plan.deadlineAt,
      splitShares,
    })
  }

  const { installment } = await paymentPlanService.getNextCheckoutInstallment(plan.id)
  const checkoutAmount = fromMinorUnits(installment.amountMinor)

  const appBaseUrl = getConfiguredAppBaseUrl()
  const successUrlBase = process.env.STRIPE_SUCCESS_URL ?? `${appBaseUrl}/dashboard/client/bookings/payment-success`
  const successUrl = `${successUrlBase}?proposalId=${proposal.id}&paymentPlanId=${plan.id}&session_id={CHECKOUT_SESSION_ID}`
  const cancelUrl = process.env.STRIPE_CANCEL_URL ?? `${appBaseUrl}/dashboard/client/bookings?status=cancelled`

  try {
    const stripe = getStripeClient()
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            unit_amount: installment.amountMinor,
            product_data: {
              name: payload.planType === PAYMENT_PLAN_TYPES.DEPOSIT
                ? `20% deposit with ${proposal.chef?.user?.name ?? "Chef"}`
                : `Booking with ${proposal.chef?.user?.name ?? "Chef"}`,
              description: proposal.request?.location ?? "Event location",
            },
          },
          quantity: 1,
        },
      ],
      customer_email: session.user.email ?? undefined,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        proposalId: proposal.id,
        paymentPlanId: plan.id,
        installmentId: installment.id,
        planType: plan.planType,
        installmentKind: installment.kind,
        currency,
      },
      payment_intent_data: {
        setup_future_usage: plan.planType === PAYMENT_PLAN_TYPES.DEPOSIT ? "off_session" : undefined,
        metadata: {
          proposalId: proposal.id,
          paymentPlanId: plan.id,
          installmentId: installment.id,
          planType: plan.planType,
          installmentKind: installment.kind,
          currency,
        },
      },
      customer_creation: plan.planType === PAYMENT_PLAN_TYPES.DEPOSIT ? "always" : undefined,
      expires_at: Math.floor(Date.now() / 1000) + PROPOSAL_CHECKOUT_LOCK_TTL_SECONDS,
    })

    await paymentPlanService.attachCheckoutSession({
      installmentId: installment.id,
      stripeCheckoutSessionId: checkoutSession.id,
    })

    logger.info('[PAYMENT_CHECKOUT] Stripe session created', { 
      sessionId: checkoutSession.id,
      proposalId: payload.proposalId 
    })

    releaseLocksOnExit = false
    return apiSuccess({
      url: checkoutSession.url,
      paymentPlanId: plan.id,
      planType: plan.planType as PaymentPlanType,
      installmentId: installment.id,
      installmentKind: installment.kind,
      amount: checkoutAmount,
      totalAmount: fromMinorUnits(plan.totalAmountMinor),
      outstandingAmount: fromMinorUnits(plan.outstandingAmountMinor),
      currency,
    })
  } catch (error) {
    logger.error('[PAYMENT_CHECKOUT] Stripe session creation failed', { error })
    await releaseProposalCheckoutLocks(payload.proposalId)
    return apiError("INTERNAL_SERVER_ERROR", "Unable to create checkout", 500)
  }
  
  } finally {
    // 🔴 P0 FIX #5: RELEASE LOCK ON FAILURE
    if (lockAcquired && releaseLocksOnExit) {
      try {
        const { redisLocks } = await import("@/lib/redis")
        await redisLocks.releaseLock(lockKey)
        await releaseProposalCheckoutLocks(payload.proposalId)
        logger.info('[PAYMENT_CHECKOUT] Lock released', { proposalId: payload.proposalId })
      } catch (redisError) {
        logger.error('[PAYMENT_CHECKOUT] Failed to release lock', { error: redisError })
      }
    }
  }
}
