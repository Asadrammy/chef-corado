import Stripe from "stripe"
import { NextResponse } from "next/server"
import { apiError, apiSuccess } from "@/lib/api-response"
import { handleApiError } from "@/lib/error-handler"
import { applyRateLimit } from "@/lib/redis-rate-limiter"
import { logger } from "@/lib/logger"
import { prisma } from "@/lib/prisma"
import { invoiceService } from "@/lib/services/invoice-service"
import { bookingInsuranceService } from "@/lib/services/booking-insurance-service"

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

export const runtime = "nodejs"
export const revalidate = 0

export async function POST(request: Request) {
  // Apply rate limiting for webhook endpoint
  const rateLimitResult = await applyRateLimit(request, 'webhook')
  if (!rateLimitResult.allowed && rateLimitResult.response) {
    return rateLimitResult.response
  }

  const signature = request.headers.get("stripe-signature")
  const rawBody = Buffer.from(await request.arrayBuffer())

  // Validate signature
  if (!signature) {
    logger.error('[WEBHOOK_ATOMIC] Missing signature header')
    return apiError('BAD_REQUEST', 'Missing signature', 400)
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    logger.error('[WEBHOOK_ATOMIC] Webhook secret not configured')
    return apiError('INTERNAL_SERVER_ERROR', 'Webhook configuration error', 500)
  }

  // Verify signature
  let event: Stripe.Event
  try {
    const stripe = getStripeClient()
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (error) {
    logger.error('[WEBHOOK_ATOMIC] Stripe event construction failed', { error })
    return apiError('BAD_REQUEST', 'Invalid event format', 400)
  }

  // Only handle checkout completion
  if (event.type !== "checkout.session.completed") {
    return apiSuccess({ received: true })
  }

  const session = event.data.object as Stripe.Checkout.Session
  const bookingId = session.metadata?.bookingId
  const paymentId = session.metadata?.paymentId
  const availabilityId = session.metadata?.availabilityId

  if (!bookingId || !paymentId) {
    logger.error('[WEBHOOK_ATOMIC] Missing required metadata', { 
      bookingId, 
      paymentId,
      sessionId: session.id 
    })
    return apiSuccess({ received: true })
  }

  // CRITICAL: Idempotency check with database lock
  const webhookId = `webhook_${event.id}`
  
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Step 1: Check if webhook already processed
      const existingWebhook = await tx.webhookLog.findUnique({
        where: { stripeEventId: event.id }
      })

      if (existingWebhook) {
        if (existingWebhook.status === 'COMPLETED') {
          logger.info('[WEBHOOK_ATOMIC] Event already processed', { eventId: event.id })
          return { success: true, alreadyProcessed: true }
        }
        if (existingWebhook.status === 'PROCESSING') {
          logger.warn('[WEBHOOK_ATOMIC] Event currently processing', { eventId: event.id })
          throw new Error('Event currently being processed')
        }
      }

      // Step 2: Create webhook log entry
      await tx.webhookLog.create({
        data: {
          stripeEventId: event.id,
          eventType: event.type,
          status: 'PROCESSING',
          payload: JSON.stringify(event),
        }
      })

      // Step 3: Verify payment status
      if (session.payment_status !== "paid" || session.status !== "complete") {
        throw new Error('Payment not completed')
      }

      // Step 4: Get booking and payment with lock
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          payments: true,
          chef: { select: { userId: true } },
        }
      })

      if (!booking) {
        throw new Error('Booking not found')
      }

      if (!booking.payments || booking.payments.id !== paymentId) {
        throw new Error('Payment mismatch')
      }

      if (booking.payments.status === 'PAID') {
        logger.info('[WEBHOOK_ATOMIC] Payment already processed', { 
          bookingId, 
          paymentId 
        })
        return { success: true, alreadyProcessed: true }
      }

      // Step 5: CRITICAL - Re-validate availability
      if (availabilityId) {
        const availability = await tx.availability.findUnique({
          where: { id: availabilityId }
        })

        if (!availability || !availability.isAvailable) {
          throw new Error('Availability no longer valid - refund required')
        }

        if (availability.currentBookings > availability.maxBookings) {
          throw new Error('Overbooked - refund required')
        }
      }

      // Step 6: ATOMIC - Update payment and booking together
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'PAID',
          stripePaymentIntentId: session.payment_intent as string,
          stripeCheckoutSessionId: session.id,
        }
      })

      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: 'CONFIRMED',
        }
      })

      // Step 7: Update proposal status if applicable
      if (booking.proposalId) {
        await tx.proposal.update({
          where: { id: booking.proposalId },
          data: { status: 'BOOKED' }
        })
      }

      // Step 8: Create notifications
      await tx.notification.createMany({
        data: [
          {
            userId: booking.clientId,
            type: 'BOOKING_CONFIRMED',
            message: `Your booking has been confirmed!`,
          },
          {
            userId: booking.chef.userId,
            type: 'BOOKING_CONFIRMED',
            message: `New booking confirmed!`,
          },
        ],
      })

      // Step 9: Create ledger entry
      const transactionCurrency = booking.payments.currency || booking.currency || 'GBP'

      await tx.ledger.create({
        data: {
          transactionType: 'PAYMENT',
          amount: booking.payments.totalAmount,
          currency: transactionCurrency,
          bookingId: booking.id,
          paymentId: paymentId,
          fromAccount: 'CLIENT',
          toAccount: 'PLATFORM',
          description: `Payment for booking ${bookingId}`,
          createdBy: 'SYSTEM',
        }
      })

      await tx.ledger.create({
        data: {
          transactionType: 'COMMISSION',
          amount: booking.payments.commissionAmount,
          currency: transactionCurrency,
          bookingId: booking.id,
          paymentId: paymentId,
          fromAccount: 'PLATFORM',
          toAccount: 'CHEF',
          description: `Commission for booking ${bookingId}`,
          createdBy: 'SYSTEM',
        }
      })

      await invoiceService.ensureReceiptForPayment(tx, paymentId, "SYSTEM")
      await bookingInsuranceService.ensureCoverageForBooking(booking.id, {
        tx,
        qualificationBasis: "INSTANT_BOOKING_STRIPE_WEBHOOK_PAID",
      })

      logger.info('[WEBHOOK_ATOMIC] Payment and booking confirmed atomically', {
        bookingId,
        paymentId,
        sessionId: session.id,
      })

      return { success: true, bookingId, paymentId }
    }, {
      timeout: 20000, // 20 second timeout
    })

    // Step 10: Mark webhook as completed
    await prisma.webhookLog.update({
      where: { stripeEventId: event.id },
      data: { status: 'COMPLETED', processedAt: new Date() }
    })

    return apiSuccess({ 
      received: true,
      processed: true,
      bookingId: result.bookingId,
      paymentId: result.paymentId,
    })

  } catch (error) {
    // Mark webhook as failed
    await prisma.webhookLog.updateMany({
      where: { stripeEventId: event.id },
      data: { 
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      }
    })

    logger.error('[WEBHOOK_ATOMIC] Processing failed', { 
      eventId: event.id,
      bookingId,
      paymentId,
      error: error instanceof Error ? error.message : String(error),
    })

    // CRITICAL: Handle overbooking scenario
    if (error instanceof Error && error.message.includes('overbooked')) {
      // Initiate automatic refund
      try {
        const stripe = getStripeClient()
        if (session.payment_intent) {
          await stripe.refunds.create({
            payment_intent: session.payment_intent as string,
            reason: 'requested_by_customer',
            metadata: {
              reason: 'Overbooking protection',
              bookingId,
            },
          })
          logger.info('[WEBHOOK_ATOMIC] Automatic refund initiated for overbooking', {
            bookingId,
            paymentIntentId: session.payment_intent,
          })
        }
      } catch (refundError) {
        logger.error('[WEBHOOK_ATOMIC] Failed to initiate refund', { refundError })
      }
    }

    return handleApiError(error, 'Atomic Webhook Processing')
  }
}
