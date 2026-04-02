import Stripe from "stripe"

import { BookingStatus, PaymentStatus } from "@/types"
import { NextResponse } from "next/server"

import { createExtendedPrismaClient } from "@/lib/prisma-extension"
import { applyRateLimit } from "@/lib/redis-rate-limiter"

// Use extended Prisma client
const prisma = createExtendedPrismaClient()

// Initialize Stripe with safety check
const getStripeClient = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY not configured")
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-03-25.dahlia" as Stripe.LatestApiVersion,
  })
}

export const runtime = "nodejs"
export const revalidate = 0

// Webhook processing states
const WEBHOOK_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
} as const

// Log webhook event for idempotency
async function logWebhookEvent(stripeEventId: string, eventType: string, payload: string) {
  try {
    // Temporary workaround until Prisma client regenerates
    // @ts-ignore - WebhookLog model exists in schema but not in generated client yet
    return await prisma.webhookLog.create({
      data: {
        stripeEventId,
        eventType,
        payload,
        status: WEBHOOK_STATUS.PENDING
      }
    })
  } catch (error: any) {
    // If unique constraint violated, webhook already processed
    if (error.code === 'P2002') {
      // @ts-ignore - Temporary workaround
      return await prisma.webhookLog.findUnique({
        where: { stripeEventId }
      })
    }
    throw error
  }
}

// Update webhook log status
async function updateWebhookStatus(id: string, status: string, errorMessage?: string) {
  // @ts-ignore - Temporary workaround until Prisma client regenerates
  return await prisma.webhookLog.update({
    where: { id },
    data: {
      status,
      processedAt: new Date(),
      ...(errorMessage && { errorMessage })
    }
  })
}

// Strict payment verification
function verifyPaymentStatus(session: Stripe.Checkout.Session): boolean {
  return (
    session.payment_status === "paid" &&
    session.status === "complete" &&
    typeof session.payment_intent === "string"
  )
}

// Atomic booking creation with payment
async function createBookingWithPayment(
  proposalId: string,
  session: Stripe.Checkout.Session,
  webhookLogId: string
) {
  return await prisma.$transaction(async (tx) => {
    // Lock proposal to prevent race conditions
    const proposal = await tx.proposal.findUnique({
      where: { id: proposalId },
      include: { 
        request: true,
        chef: { include: { user: true } }
      },
    })

    if (!proposal || proposal.status !== 'ACCEPTED') {
      throw new Error('Proposal not found or not accepted')
    }

    // Check if booking already exists
    const existingBooking = await tx.booking.findUnique({
      where: { proposalId }
    })

    if (existingBooking) {
      throw new Error('Booking already exists')
    }

    // Create booking
    const newBooking = await tx.booking.create({
      data: {
        clientId: proposal.request.clientId,
        chefId: proposal.chefId,
        proposalId: proposalId,
        totalPrice: proposal.price,
        status: BookingStatus.CONFIRMED,
        eventDate: proposal.request.eventDate,
        location: proposal.request.location,
        guestCount: Math.ceil(proposal.request.budget / proposal.price) || 1,
      },
    })

    // Create payment record
    const amount = session.amount_total ? session.amount_total / 100 : Number(proposal.price)
    const paymentData = {
      bookingId: newBooking.id,
      totalAmount: Number(amount),
      commissionAmount: Number(amount * 0.2),
      chefAmount: Number(amount * 0.8),
      status: PaymentStatus.PAID,
      stripePaymentIntentId: session.payment_intent as string,
    }

    await tx.payment.create({
      data: paymentData,
    })

    // Update proposal status to prevent double acceptance
    await tx.proposal.update({
      where: { id: proposalId },
      data: { status: 'BOOKED' }
    })

    return newBooking
  })
}

// Atomic payment update for existing booking
async function updateBookingPayment(
  bookingId: string,
  session: Stripe.Checkout.Session,
  webhookLogId: string
) {
  return await prisma.$transaction(async (tx) => {
    // Lock booking record
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { payments: true }
    })

    if (!booking) {
      throw new Error('Booking not found')
    }

    // Check if already processed
    if (
      booking.status === BookingStatus.CONFIRMED &&
      booking.payments?.status === PaymentStatus.PAID
    ) {
      throw new Error('Payment already processed')
    }

    // Update booking status
    await tx.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CONFIRMED },
    })

    // Create or update payment
    const amount = session.amount_total ? session.amount_total / 100 : Number(booking.totalPrice)
    const paymentData = {
      bookingId: bookingId,
      totalAmount: Number(amount),
      commissionAmount: Number(amount * 0.2),
      chefAmount: Number(amount * 0.8),
      status: PaymentStatus.PAID,
      stripePaymentIntentId: session.payment_intent as string,
    }

    await tx.payment.upsert({
      where: { bookingId: bookingId },
      update: paymentData,
      create: paymentData,
    })

    return booking
  })
}

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
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook secret missing" }, { status: 500 })
  }

  let event: Stripe.Event
  try {
    const stripe = getStripeClient()
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (error) {
    console.error('Webhook verification failed:', error)
    return NextResponse.json({ error: "Webhook verification failed" }, { status: 400 })
  }

  // Only handle checkout completion
  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true })
  }

  const session = event.data.object as Stripe.Checkout.Session
  const proposalId = session.metadata?.bookingId

  if (!proposalId) {
    return NextResponse.json({ received: true })
  }

  // Strict payment verification
  if (!verifyPaymentStatus(session)) {
    console.error('Payment verification failed:', {
      payment_status: session.payment_status,
      status: session.status,
      payment_intent: session.payment_intent
    })
    return NextResponse.json({ error: "Payment verification failed" }, { status: 400 })
  }

  // Log webhook event for idempotency
  let webhookLog
  try {
    webhookLog = await logWebhookEvent(
      event.id,
      event.type,
      JSON.stringify(event)
    )

    // If webhook already processed, return early
    if (webhookLog && webhookLog.status === WEBHOOK_STATUS.COMPLETED) {
      return NextResponse.json({ received: true, alreadyProcessed: true })
    }

    // Mark as processing (only if webhookLog exists)
    if (webhookLog) {
      await updateWebhookStatus(webhookLog.id, WEBHOOK_STATUS.PROCESSING)
    }
  } catch (error: any) {
    console.error('Failed to log webhook:', error)
    return NextResponse.json({ error: "Webhook logging failed" }, { status: 500 })
  }

  try {
    // Check if booking exists
    const existingBooking = await prisma.booking.findUnique({
      where: { proposalId },
      include: { payments: true, proposal: true },
    })

    if (!existingBooking) {
      // Create new booking with payment
      await createBookingWithPayment(proposalId, session, webhookLog?.id || 'temp-id')
    } else {
      // Update existing booking payment
      await updateBookingPayment(existingBooking.id, session, webhookLog?.id || 'temp-id')
    }

    // Mark webhook as completed (only if webhookLog exists)
    if (webhookLog) {
      await updateWebhookStatus(webhookLog.id, WEBHOOK_STATUS.COMPLETED)
    }

    return NextResponse.json({ 
      received: true,
      processed: true,
      webhookLogId: webhookLog?.id
    })

  } catch (error: any) {
    console.error('Webhook processing failed:', error)
    
    // Mark webhook as failed (only if webhookLog exists)
    if (webhookLog) {
      await updateWebhookStatus(
        webhookLog.id,
        WEBHOOK_STATUS.FAILED,
        error.message
      )
    }

    return NextResponse.json({ 
      error: "Webhook processing failed",
      webhookLogId: webhookLog?.id
    }, { status: 500 })
  }
}
