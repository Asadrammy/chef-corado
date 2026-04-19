import Stripe from "stripe"

import { NextResponse } from "next/server"

import { apiError, apiSuccess } from "@/lib/api-response"
import { handleApiError } from "@/lib/error-handler"
import { applyRateLimit } from "@/lib/redis-rate-limiter"
import { getStripeWebhookHandler } from "@/lib/services/stripe-webhook-handler"
import { paymentService } from "@/lib/services/payment-service"
import { logger } from "@/lib/logger"

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
    logger.error('[WEBHOOK] Missing signature header')
    return apiError('BAD_REQUEST', 'Missing signature', 400)
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    logger.error('[WEBHOOK] Webhook secret not configured')
    return apiError('INTERNAL_SERVER_ERROR', 'Webhook configuration error', 500)
  }

  // Verify signature using our secure implementation
  const { webhookEventStore } = await import("@/lib/services/webhook-event-store")
  const isValidSignature = webhookEventStore.verifyEventSignature(
    rawBody.toString('utf8'),
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  )

  if (!isValidSignature) {
    logger.error('[WEBHOOK] Invalid signature detected', { 
      signatureLength: signature.length,
      bodyLength: rawBody.length
    })
    return apiError('BAD_REQUEST', 'Invalid signature', 400)
  }

  // Initialize Stripe client only at runtime
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    logger.error('[WEBHOOK] Stripe secret key not configured')
    return apiError('INTERNAL_SERVER_ERROR', 'Stripe configuration error', 500)
  }

  if (secretKey.includes('placeholder') || 
      secretKey === 'sk_test_placeholder' ||
      secretKey === 'sk_live_placeholder') {
    logger.error('[WEBHOOK] Stripe secret key is a placeholder')
    return apiError('INTERNAL_SERVER_ERROR', 'Stripe configuration error', 500)
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: "2026-03-25.dahlia" as Stripe.LatestApiVersion,
  })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (error) {
    logger.error('[WEBHOOK] Stripe event construction failed', { error })
    return apiError('BAD_REQUEST', 'Invalid event format', 400)
  }

  // CRITICAL: Check if webhook already processed (idempotency)
  let webhookLog
  try {
    const { webhookEventStore } = await import("@/lib/services/webhook-event-store")
    const existingEvent = await webhookEventStore.getEvent(event.id)
    
    if (existingEvent) {
      if (existingEvent.status === 'PROCESSED') {
        logger.info('[WEBHOOK] Event already processed', { eventId: event.id })
        return apiSuccess({ received: true, alreadyProcessed: true })
      }
      
      if (existingEvent.status === 'PROCESSING') {
        logger.warn('[WEBHOOK] Event currently processing', { eventId: event.id })
        return apiError('CONFLICT', 'Event currently being processed', 409)
      }

      webhookLog = existingEvent
    } else {
      webhookLog = await paymentService.logWebhookEvent(
        event.id,
        event.type,
        JSON.stringify(event)
      )
    }

    // Mark as processing
    if (webhookLog) {
      await paymentService.updateWebhookStatus(webhookLog.id, paymentService.webhookStatus.PROCESSING)
    }
  } catch (error) {
    // If error is due to unique constraint violation, event was already processed
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      logger.info('[WEBHOOK] Event already processed (unique constraint)', { eventId: event.id })
      return apiSuccess({ received: true, alreadyProcessed: true })
    }
    return handleApiError(error, 'Payments Webhook Log')
  }

  // Handle ALL Stripe events with comprehensive handler
  const stripeWebhookHandler = getStripeWebhookHandler()
  const result = await stripeWebhookHandler.handleWebhook(event)
  
  if (!result.processed && result.error) {
    logger.error('[WEBHOOK] Event processing failed', { 
      eventType: event.type, 
      eventId: event.id, 
      error: result.error 
    })
    if (webhookLog) {
      await paymentService.updateWebhookStatus(webhookLog.id, paymentService.webhookStatus.FAILED, result.error)
    }
    return apiError('INTERNAL_SERVER_ERROR', result.error, 500)
  }

  // Mark webhook as completed (only if webhookLog exists)
  if (webhookLog) {
    await paymentService.updateWebhookStatus(webhookLog.id, paymentService.webhookStatus.COMPLETED)
  }

  logger.info('[WEBHOOK] Event processed successfully', { 
    eventType: event.type, 
    eventId: event.id,
    processed: result.processed 
  })

  return apiSuccess({ 
    received: true,
    processed: result.processed,
    webhookLogId: webhookLog?.id ?? null
  })
}
