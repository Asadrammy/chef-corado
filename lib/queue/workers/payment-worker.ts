import { Worker, Job } from 'bullmq'
import Redis from 'ioredis'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/monitoring/logger'
import { PaymentJobData, QUEUE_NAMES } from '../queue'
import { ledgerService } from '@/lib/services/ledger-service'
import { logStateTransition } from '@/lib/utils/state-machine'
import { createNotification } from '@/lib/notifications'
import Stripe from 'stripe'
import type { Prisma } from '@prisma/client'

// Initialize Stripe with safety check
const getStripeClient = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY not configured')
  }

  // Check for placeholder keys
  if (process.env.STRIPE_SECRET_KEY.includes('placeholder') || 
      process.env.STRIPE_SECRET_KEY === 'sk_test_placeholder' ||
      process.env.STRIPE_SECRET_KEY === 'sk_live_placeholder') {
    throw new Error('STRIPE_SECRET_KEY is a placeholder. Please configure a real Stripe API key in your .env file.')
  }

  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-03-25.dahlia',
  })
}

const stripe = getStripeClient()

type PaymentWithRelations = Prisma.PaymentGetPayload<{
  include: {
    booking: {
      include: {
        client: true
        chef: { include: { user: true } }
      }
    }
  }
}>

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
}

/**
 * Payment Worker
 * Processes payment jobs from the queue
 * Handles:
 * - Payment verification with Stripe
 * - Ledger recording
 * - State transitions
 * - Failure recovery
 */
export class PaymentWorker {
  private worker: Worker | null = null

  async start() {
    this.worker = new Worker(QUEUE_NAMES.PAYMENTS, this.processPayment.bind(this), {
      connection: new Redis(redisConfig),
      concurrency: 5, // Process 5 payments concurrently
    })

    this.worker.on('completed', (job) => {
      logger.info(`[PAYMENT_WORKER] Job completed`, {
        jobId: job.id,
        data: job.data,
      })
    })

    this.worker.on('failed', (job, error) => {
      logger.error(`[PAYMENT_WORKER] Job failed`, {
        jobId: job?.id,
        error: error.message,
        attempts: job?.attemptsMade,
      })
    })

    logger.info('[PAYMENT_WORKER] Started')
  }

  /**
   * Process a payment job
   */
  private async processPayment(job: Job<PaymentJobData>) {
    const { paymentId, bookingId, stripePaymentIntentId, amount, idempotencyKey } = job.data

    logger.info(`[PAYMENT_WORKER] Processing payment`, {
      jobId: job.id,
      paymentId,
      bookingId,
      amount,
    })

    try {
      // Step 1: Verify payment exists in DB
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
        throw new Error(`Payment ${paymentId} not found`)
      }

      // Step 2: Check if already processed (idempotency)
      if (payment.status === 'PAID' || payment.status === 'RELEASED') {
        logger.info(`[PAYMENT_WORKER] Payment already processed`, { paymentId })
        return { status: 'already_processed', paymentId }
      }

      // Step 3: Verify with Stripe
      const intent = await stripe.paymentIntents.retrieve(stripePaymentIntentId)

      if (intent.status !== 'succeeded') {
        throw new Error(`Payment intent not succeeded: ${intent.status}`)
      }

      if (intent.amount_received < amount * 100) {
        throw new Error(`Amount mismatch: expected ${amount * 100}, got ${intent.amount_received}`)
      }

      // Step 4: Update payment status in transaction
      const updatedPayment = await prisma.$transaction(async (tx) => {
        // Verify current status
        const currentPayment = await tx.payment.findUnique({
          where: { id: paymentId },
          select: { status: true },
        })

        if (!currentPayment) {
          throw new Error(`Payment ${paymentId} not found during update`)
        }

        if (currentPayment.status !== 'HELD') {
          throw new Error(`Payment status is ${currentPayment.status}, expected HELD`)
        }

        // Update payment status
        const updated = await tx.payment.update({
          where: { id: paymentId },
          data: {
            status: 'PAID',
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

        // Log state transition
        await logStateTransition(tx, 'PAYMENT', paymentId, 'HELD', 'PAID', 'SYSTEM')

        return updated as PaymentWithRelations
      })

      // Step 5: Record in ledger (outside transaction)
      try {
        const booking = updatedPayment.booking
        if (!booking) {
          throw new Error('PAYMENT_BOOKING_RELATION_MISSING')
        }

        await ledgerService.recordPayment(
          paymentId,
          booking.id,
          updatedPayment.totalAmount,
          updatedPayment.commissionAmount,
          updatedPayment.chefAmount,
          'SYSTEM',
          { stripePaymentIntentId }
        )
      } catch (ledgerError) {
        logger.error(`[PAYMENT_WORKER] Failed to record in ledger`, {
          paymentId,
          error: ledgerError instanceof Error ? ledgerError.message : String(ledgerError),
        })
        // Don't fail the job - ledger can be reconciled later
      }

      // Step 6: Create notifications (with preference checking)
      try {
        await Promise.all([
          createNotification(
            updatedPayment.booking.clientId,
            'PAYMENT_CONFIRMED',
            `Payment confirmed for booking ${bookingId}`
          ),
          createNotification(
            updatedPayment.booking.chef.userId,
            'PAYMENT_RECEIVED',
            `Payment received for booking ${bookingId}`
          ),
        ])
      } catch (notifError) {
        logger.error(`[PAYMENT_WORKER] Failed to create notifications`, {
          paymentId,
          error: notifError instanceof Error ? notifError.message : String(notifError),
        })
      }

      logger.info(`[PAYMENT_WORKER] Payment processed successfully`, {
        paymentId,
        bookingId,
        amount,
      })

      return {
        status: 'success',
        paymentId,
        bookingId,
        amount,
      }
    } catch (error) {
      logger.error(`[PAYMENT_WORKER] Error processing payment`, {
        jobId: job.id,
        paymentId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })

      // Determine if this is a retryable error
      const isRetryable = this.isRetryableError(error)

      if (!isRetryable) {
        // Move to dead-letter queue
        logger.warn(`[PAYMENT_WORKER] Non-retryable error, moving to dead-letter`, {
          paymentId,
          error: error instanceof Error ? error.message : String(error),
        })
      }

      throw error // Let BullMQ handle retry logic
    }
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (!(error instanceof Error)) return true

    const nonRetryablePatterns = [
      'not found',
      'invalid',
      'unauthorized',
      'forbidden',
      'amount mismatch',
    ]

    return !nonRetryablePatterns.some((pattern) =>
      error.message.toLowerCase().includes(pattern)
    )
  }

  async stop() {
    if (this.worker) {
      await this.worker.close()
      logger.info('[PAYMENT_WORKER] Stopped')
    }
  }
}

// Export singleton
let paymentWorker: PaymentWorker | null = null

export function getPaymentWorker(): PaymentWorker {
  if (!paymentWorker) {
    paymentWorker = new PaymentWorker()
  }
  return paymentWorker
}
