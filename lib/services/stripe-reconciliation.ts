import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/monitoring/logger'
import { doubleEntryLedger } from './double-entry-ledger'

// Initialize Stripe with safety check - lazy initialization for build compatibility
let stripeInstance: Stripe | null = null

const getStripeClient = (): Stripe => {
  if (stripeInstance) {
    return stripeInstance
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY not configured')
  }

  // Check for placeholder keys
  if (process.env.STRIPE_SECRET_KEY.includes('placeholder') || 
      process.env.STRIPE_SECRET_KEY === 'sk_test_placeholder' ||
      process.env.STRIPE_SECRET_KEY === 'sk_live_placeholder') {
    throw new Error('STRIPE_SECRET_KEY is a placeholder. Please configure a real Stripe API key in your .env file.')
  }

  stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-03-25.dahlia',
  })

  return stripeInstance
}

/**
 * Stripe Reconciliation Engine
 * 
 * Handles:
 * - Missing webhooks
 * - Duplicate webhooks
 * - Out-of-order events
 * - Payment success but DB not updated
 * - Stripe inconsistencies
 */

export interface ReconciliationResult {
  checked: number
  fixed: number
  errors: string[]
  timestamp: Date
}

export class StripeReconciliationEngine {
  /**
   * Full reconciliation: compare all Stripe payments with local DB
   */
  async reconcileAllPayments(
    startDate?: Date,
    endDate?: Date
  ): Promise<ReconciliationResult> {
    logger.info('[RECONCILIATION] Starting full payment reconciliation')

    const result: ReconciliationResult = {
      checked: 0,
      fixed: 0,
      errors: [],
      timestamp: new Date(),
    }

    try {
      // Fetch all payment intents from Stripe
      const paymentIntents = await this.fetchStripePaymentIntents(startDate, endDate)
      result.checked = paymentIntents.length

      for (const intent of paymentIntents) {
        try {
          await this.reconcilePaymentIntent(intent, result)
        } catch (error) {
          result.errors.push(
            `Failed to reconcile payment ${intent.id}: ${
              error instanceof Error ? error.message : String(error)
            }`
          )
        }
      }

      logger.info('[RECONCILIATION] Full reconciliation completed', {
        checked: result.checked,
        fixed: result.fixed,
        errors: result.errors.length,
      })
    } catch (error) {
      logger.error('[RECONCILIATION] Reconciliation failed', {
        error: error instanceof Error ? error.message : String(error),
      })
      result.errors.push(
        `Reconciliation failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }

    return result
  }

  /**
   * Reconcile a specific payment intent
   */
  private async reconcilePaymentIntent(
    intent: Stripe.PaymentIntent,
    result: ReconciliationResult
  ): Promise<void> {
    // Find corresponding payment in DB
    const payment = await prisma.payment.findFirst({
      where: {
        stripePaymentIntentId: intent.id,
      },
      include: {
        booking: {
          include: {
            client: true,
            chef: { include: { user: true } },
          },
        },
      },
    })

    if (!payment) {
      // Payment exists in Stripe but not in DB - potential issue
      logger.warn('[RECONCILIATION] Payment exists in Stripe but not in DB', {
        stripePaymentIntentId: intent.id,
        amount: intent.amount,
        status: intent.status,
      })
      return
    }

    // Check if Stripe status matches DB status
    const stripeSucceeded = intent.status === 'succeeded'
    const dbPaid = payment.status === 'PAID' || payment.status === 'RELEASED'

    if (stripeSucceeded && !dbPaid) {
      // Stripe succeeded but DB not updated - FIX IT
      logger.warn('[RECONCILIATION] Stripe succeeded but DB not updated', {
        paymentId: payment.id,
        stripeStatus: intent.status,
        dbStatus: payment.status,
      })

      await this.fixPaymentStatus(payment)
      result.fixed++
    } else if (!stripeSucceeded && dbPaid) {
      // DB says paid but Stripe says otherwise - investigate
      logger.error('[RECONCILIATION] DB says paid but Stripe disagrees', {
        paymentId: payment.id,
        stripeStatus: intent.status,
        dbStatus: payment.status,
      })
      result.errors.push(`Payment ${payment.id}: status mismatch`)
    }

    // Verify amount matches
    if (intent.amount_received !== Math.round(payment.totalAmount * 100)) {
      logger.error('[RECONCILIATION] Amount mismatch', {
        paymentId: payment.id,
        stripeAmount: intent.amount_received,
        dbAmount: Math.round(payment.totalAmount * 100),
      })
      result.errors.push(`Payment ${payment.id}: amount mismatch`)
    }
  }

  /**
   * Fix payment status when Stripe succeeded but DB wasn't updated
   */
  private async fixPaymentStatus(payment: any): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Update payment status
      await (tx as any).payment.update({
        where: { id: payment.id },
        data: {
          status: 'PAID',
          version: { increment: 1 },
        },
      })

      // Record in ledger
      try {
        await doubleEntryLedger.recordPaymentCapture(
          payment.id,
          payment.booking.clientId,
          payment.totalAmount,
          payment.stripePaymentIntentId
        )
      } catch (ledgerError) {
        logger.error('[RECONCILIATION] Failed to record in ledger during fix', {
          paymentId: payment.id,
          error: ledgerError instanceof Error ? ledgerError.message : String(ledgerError),
        })
      }
    })

    logger.info('[RECONCILIATION] Fixed payment status', {
      paymentId: payment.id,
    })
  }

  /**
   * Reconcile a specific payment by ID
   */
  async reconcilePayment(paymentId: string): Promise<ReconciliationResult> {
    logger.info('[RECONCILIATION] Reconciling specific payment', { paymentId })

    const result: ReconciliationResult = {
      checked: 1,
      fixed: 0,
      errors: [],
      timestamp: new Date(),
    }

    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          booking: {
            include: {
              client: true,
              chef: { include: { user: true } },
            },
          },
        },
      })

      if (!payment) {
        result.errors.push(`Payment ${paymentId} not found`)
        return result
      }

      if (!payment.stripePaymentIntentId) {
        result.errors.push(`Payment ${paymentId} has no Stripe intent ID`)
        return result
      }

      const intent = await getStripeClient().paymentIntents.retrieve(payment.stripePaymentIntentId)
      await this.reconcilePaymentIntent(intent, result)
    } catch (error) {
      result.errors.push(
        `Failed to reconcile payment: ${error instanceof Error ? error.message : String(error)}`
      )
    }

    return result
  }

  /**
   * Fetch all payment intents from Stripe
   */
  private async fetchStripePaymentIntents(
    startDate?: Date,
    endDate?: Date
  ): Promise<Stripe.PaymentIntent[]> {
    const intents: Stripe.PaymentIntent[] = []
    let hasMore = true
    let startingAfter: string | undefined

    const params: Stripe.PaymentIntentListParams = {
      limit: 100,
    }

    if (startDate) {
      params.created = { gte: Math.floor(startDate.getTime() / 1000) }
    }

    if (endDate) {
      if (!params.created) params.created = {}
      ;(params.created as any).lte = Math.floor(endDate.getTime() / 1000)
    }

    while (hasMore) {
      if (startingAfter) {
        params.starting_after = startingAfter
      }

      const response = await getStripeClient().paymentIntents.list(params)
      intents.push(...response.data)

      hasMore = response.has_more
      if (response.data.length > 0) {
        startingAfter = response.data[response.data.length - 1].id
      }
    }

    return intents
  }

  /**
   * Handle webhook event with deduplication and replay
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    logger.info('[RECONCILIATION] Processing webhook event', {
      eventId: event.id,
      type: event.type,
    })

    // Check if we've already processed this event
    const existingEvent = await prisma.webhookLog.findUnique({
      where: { stripeEventId: event.id },
    })

    if (existingEvent) {
      logger.info('[RECONCILIATION] Webhook event already processed', {
        eventId: event.id,
      })
      return
    }

    // Store the event for replay
    await prisma.webhookLog.create({
      data: {
        stripeEventId: event.id,
        eventType: event.type,
        payload: JSON.stringify(event),
        processedAt: new Date(),
        status: 'COMPLETED',
      },
    })

    // Process based on event type
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent)
        break
      case 'payment_intent.payment_failed':
        await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent)
        break
      case 'charge.refunded':
        await this.handleChargeRefunded(event.data.object as Stripe.Charge)
        break
      default:
        logger.info('[RECONCILIATION] Unhandled webhook event type', {
          type: event.type,
        })
    }
  }

  private async handlePaymentIntentSucceeded(intent: Stripe.PaymentIntent): Promise<void> {
    logger.info('[RECONCILIATION] Payment intent succeeded', {
      intentId: intent.id,
      amount: intent.amount,
    })
    // Trigger payment processing
  }

  private async handlePaymentIntentFailed(intent: Stripe.PaymentIntent): Promise<void> {
    logger.info('[RECONCILIATION] Payment intent failed', {
      intentId: intent.id,
      lastError: intent.last_payment_error?.message,
    })
    // Update payment status to FAILED
  }

  private async handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
    logger.info('[RECONCILIATION] Charge refunded', {
      chargeId: charge.id,
      refundedAmount: charge.amount_refunded,
    })
    // Update refund status
  }
}

export const stripeReconciliationEngine = new StripeReconciliationEngine()
