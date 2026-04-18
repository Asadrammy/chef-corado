import Stripe from "stripe"
import { z } from "zod"

import { authOptions } from "@/lib/auth"
import { apiError, apiSuccess } from "@/lib/api-response"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { sendEmail, emailTemplates } from "@/lib/email"
import { paymentGuarantee } from "@/lib/services/payment-guarantee"
import { logger } from "@/lib/logger"

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
})

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== "CLIENT") {
    return apiError("UNAUTHORIZED", "Unauthorized", 401)
  }

  if (!process.env.STRIPE_SECRET_KEY || 
      process.env.STRIPE_SECRET_KEY.includes('placeholder') ||
      process.env.STRIPE_SECRET_KEY === 'sk_test_placeholder' ||
      process.env.STRIPE_SECRET_KEY === 'sk_live_placeholder') {
    return apiError("INTERNAL_SERVER_ERROR", "Stripe not configured. Please add a valid STRIPE_SECRET_KEY to your .env file.", 500)
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
      request: { include: { client: true } }
    },
  })

  if (!proposal) {
    return apiError("NOT_FOUND", "Proposal not found", 404)
  }

  if (proposal.request.clientId !== session.user.id) {
    return apiError("UNAUTHORIZED", "Unauthorized", 401)
  }

  if (!['ACCEPTED', 'ACCEPTED_PENDING_PAYMENT'].includes(proposal.status)) {
    return apiError("CONFLICT", "Proposal not accepted", 400)
  }

  // 🔴 P0 FIX #1: ATOMIC DISTRIBUTED LOCKING
  const lockKey = `payment_lock_${payload.proposalId}`
  let lockAcquired = false
  
  try {
    // Import Redis dynamically to avoid build issues
    const { redisLocks } = await import("@/lib/redis")
    
    // ATOMIC: Try to acquire lock with single SET NX EX command
    const lockResult = await redisLocks.acquireLock(lockKey, 300) // 5 minutes
    
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
      return apiError("CONFLICT", validation.error || "Proposal not ready for payment", 400)
    }
    
    // 🔴 P0 FIX #2: CAPACITY CHECK BEFORE PAYMENT
    const availability = await prisma.availability.findFirst({
      where: {
        chefId: proposal.chefId,
        date: proposal.request.eventDate,
        isAvailable: true,
        currentBookings: { lt: prisma.availability.fields.maxBookings }
      }
    })
    
    if (!availability) {
      logger.warn('[PAYMENT_CHECKOUT] Slot no longer available', { 
        proposalId: payload.proposalId,
        eventDate: proposal.request.eventDate,
        chefId: proposal.chefId
      })
      return apiError("CONFLICT", "Slot no longer available", 409)
    }
    
    logger.info('[PAYMENT_CHECKOUT] Capacity check passed', { 
      proposalId: payload.proposalId,
      availabilityId: availability.id,
      currentBookings: availability.currentBookings,
      maxBookings: availability.maxBookings
    })

  const amount = Number(proposal.price)
  if (!Number.isFinite(amount)) {
    return apiError("BAD_REQUEST", "Invalid proposal price", 400)
  }

  const successUrl = process.env.STRIPE_SUCCESS_URL ?? `${process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/dashboard/client/bookings/payment-success`
  const cancelUrl = process.env.STRIPE_CANCEL_URL ?? `${process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/dashboard/client/bookings?status=cancelled`

  try {
    const stripe = getStripeClient()
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: Math.round(amount * 100),
            product_data: {
              name: `Booking with ${proposal.chef?.user?.name ?? "Chef"}`,
              description: proposal.request?.location ?? 'Event location',
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
      },
    })

    logger.info('[PAYMENT_CHECKOUT] Stripe session created', { 
      sessionId: checkoutSession.id,
      proposalId: payload.proposalId 
    })

    return apiSuccess({ url: checkoutSession.url })
  } catch (error) {
    logger.error('[PAYMENT_CHECKOUT] Stripe session creation failed', { error })
    return apiError("INTERNAL_SERVER_ERROR", "Unable to create checkout", 500)
  }
  
  } finally {
    // 🔴 P0 FIX #5: RELEASE LOCK ON FAILURE
    if (lockAcquired) {
      try {
        const { redisLocks } = await import("@/lib/redis")
        await redisLocks.releaseLock(lockKey)
        logger.info('[PAYMENT_CHECKOUT] Lock released', { proposalId: payload.proposalId })
      } catch (redisError) {
        logger.error('[PAYMENT_CHECKOUT] Failed to release lock', { error: redisError })
      }
    }
  }
}
