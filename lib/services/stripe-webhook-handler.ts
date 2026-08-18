/**
 * Production-grade Stripe webhook handler
 * Handles ALL Stripe events with proper idempotency and error handling
 */

import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { paymentService } from '@/lib/services/payment-service'
import { redisLocks } from '@/lib/redis'
import { paymentGuarantee } from '@/lib/services/payment-guarantee'
import { releaseProposalCheckoutLocks } from '@/lib/services/proposal-checkout-locks'
import { ProposalStatus } from '@/types'
import { paymentPlanService } from '@/lib/services/payment-plan-service'
import { bookingGuestAmendmentService } from '@/lib/services/booking-guest-amendment-service'

export class StripeWebhookHandler {
  private stripe: Stripe

  constructor() {
    // Lazy initialization - don't validate or initialize Stripe here
    this.stripe = null as any
  }

  private ensureInitialized() {
    if (!this.stripe) {
      if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('STRIPE_SECRET_KEY not configured')
      }

      // Check for placeholder keys only at runtime
      if (process.env.STRIPE_SECRET_KEY.includes('placeholder') || 
          process.env.STRIPE_SECRET_KEY === 'sk_test_placeholder' ||
          process.env.STRIPE_SECRET_KEY === 'sk_live_placeholder') {
        throw new Error('STRIPE_SECRET_KEY is a placeholder. Please configure a real Stripe API key in your .env file.')
      }

      this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2026-03-25.dahlia' as Stripe.LatestApiVersion,
      })
    }
    return this.stripe
  }

  async handleWebhook(event: Stripe.Event): Promise<{ processed: boolean; error?: string }> {
    const eventType = event.type
    const object = event.data.object

    logger.info('[WEBHOOK] Processing event', { eventType, eventId: event.id })

    try {
      switch (eventType) {
        case 'checkout.session.completed':
          return await this.handleCheckoutSessionCompleted(object as Stripe.Checkout.Session)
        
        case 'payment_intent.succeeded':
          return await this.handlePaymentIntentSucceeded(object as Stripe.PaymentIntent)
        
        case 'payment_intent.payment_failed':
          return await this.handlePaymentIntentFailed(object as Stripe.PaymentIntent)

        case 'setup_intent.succeeded':
          return await this.handleSetupIntentSucceeded(object as Stripe.SetupIntent)
        
        case 'payment_intent.canceled':
          return await this.handlePaymentIntentCanceled(object as Stripe.PaymentIntent)
        
        case 'checkout.session.expired':
          return await this.handleCheckoutSessionExpired(object as Stripe.Checkout.Session)
        
        case 'charge.dispute.created':
          return await this.handleChargeDisputeCreated(object as Stripe.Charge)
        
        case 'charge.succeeded':
          return await this.handleChargeSucceeded(object as Stripe.Charge)
        
        case 'charge.failed':
          return await this.handleChargeFailed(object as Stripe.Charge)
        
        case 'payout.created':
        case 'payout.paid':
        case 'payout.failed':
          return await this.handlePayoutEvent(eventType, object as Stripe.Payout)
        
        default:
          logger.info('[WEBHOOK] Unhandled event type', { eventType })
          return { processed: false }
      }
    } catch (error) {
      logger.error('[WEBHOOK] Event processing failed', { 
        eventType, 
        eventId: event.id, 
        error: error instanceof Error ? error.message : String(error) 
      })
      return { processed: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<{ processed: boolean; error?: string }> {
    const amendmentProcessed = await bookingGuestAmendmentService.processAddGuestCheckoutSessionCompleted(session)
    if (amendmentProcessed) {
      logger.info('[WEBHOOK] Guest-amendment checkout session processed successfully', {
        sessionId: session.id,
        amendmentId: session.metadata?.amendmentId,
      })
      return { processed: true }
    }

    const proposalId = session.metadata?.proposalId
    
    if (!proposalId) {
      logger.warn('[WEBHOOK] No proposal ID in checkout session', { sessionId: session.id })
      return { processed: false }
    }

    // Release payment lock
    const lockKey = `payment_lock_${proposalId}`
    try {
      await redisLocks.releaseLock(lockKey)
      logger.info('[WEBHOOK] Payment lock released on checkout completion', { proposalId })
    } catch (error) {
      logger.error('[WEBHOOK] Failed to release payment lock', { proposalId, error })
    }

    // Process the payment
    try {
      if (session.metadata?.paymentPlanId && typeof session.payment_intent === "string") {
        const stripe = this.ensureInitialized()
        const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent)
        await paymentPlanService.rememberPlanPaymentMethod(paymentIntent)
      }
      const planProcessed = await paymentPlanService.processCheckoutSessionCompleted(session)
      if (planProcessed) {
        logger.info('[WEBHOOK] Payment-plan checkout session processed successfully', {
          proposalId,
          sessionId: session.id,
          paymentPlanId: session.metadata?.paymentPlanId,
        })
        return { processed: true }
      }

      await paymentService.processSuccessfulProposalCheckout(proposalId, session)
      logger.info('[WEBHOOK] Checkout session processed successfully', { proposalId, sessionId: session.id })
      return { processed: true }
    } catch (error) {
      logger.error('[WEBHOOK] Failed to process checkout session', { proposalId, error })
      return { processed: false, error: error instanceof Error ? error.message : 'Processing failed' }
    }
  }

  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<{ processed: boolean; error?: string }> {
    const proposalId = paymentIntent.metadata?.proposalId
    if (paymentIntent.metadata?.paymentPlanId) {
      const processed = await paymentPlanService.processPlanPaymentIntentSucceeded(paymentIntent)
      logger.info('[WEBHOOK] Payment-plan payment_intent.succeeded processed', {
        paymentIntentId: paymentIntent.id,
        paymentPlanId: paymentIntent.metadata.paymentPlanId,
        installmentId: paymentIntent.metadata.installmentId,
        processed,
      })
      return { processed: true }
    }
    
    if (!proposalId) {
      logger.warn('[WEBHOOK] No proposal ID in payment intent', { paymentIntentId: paymentIntent.id })
      return { processed: false }
    }

    // Check if already processed (idempotency)
    const existingPayment = await prisma.payment.findFirst({
      where: { stripePaymentIntentId: paymentIntent.id },
      include: { booking: true }
    })

    if (existingPayment) {
      logger.info('[WEBHOOK] Payment intent already processed', { paymentIntentId: paymentIntent.id })
      return { processed: true }
    }

    // This might be a direct payment intent (not through checkout)
    // Try to find the proposal and create booking
    try {
      const proposal = await prisma.proposal.findUnique({
        where: { id: proposalId },
        include: { request: true, chef: true }
      })

      if (!proposal) {
        logger.error('[WEBHOOK] Proposal not found for payment intent', { proposalId, paymentIntentId: paymentIntent.id })
        return { processed: false, error: 'Proposal not found' }
      }

      const result = await prisma.$transaction(async (tx) => {
        const amount = paymentIntent.amount / 100
        if (Math.round(amount * 100) !== Math.round(proposal.price * 100)) {
          throw new Error('Payment amount does not match proposal price')
        }

        const guaranteed = await paymentGuarantee.guaranteePaymentToBooking(
          proposalId,
          null,
          paymentIntent.id,
          amount,
          tx
        )

        if (!guaranteed.guaranteed) {
          throw new Error(`Payment guarantee failed: ${guaranteed.error}`)
        }

        return guaranteed
      })

      logger.info('[WEBHOOK] Direct payment intent processed', { 
        proposalId, 
        paymentIntentId: paymentIntent.id,
        bookingId: result.bookingId 
      })

      return { processed: true }
    } catch (error) {
      logger.error('[WEBHOOK] Failed to process direct payment intent', { 
        proposalId, 
        paymentIntentId: paymentIntent.id, 
        error 
      })
      return { processed: false, error: error instanceof Error ? error.message : 'Processing failed' }
    }
  }

  private async handleSetupIntentSucceeded(setupIntent: Stripe.SetupIntent): Promise<{ processed: boolean; error?: string }> {
    if (!setupIntent.metadata?.paymentPlanId) {
      return { processed: false }
    }

    const processed = await paymentPlanService.processSetupIntentSucceeded(setupIntent)
    logger.info('[WEBHOOK] setup_intent.succeeded processed', {
      setupIntentId: setupIntent.id,
      paymentPlanId: setupIntent.metadata.paymentPlanId,
      processed,
    })
    return { processed: true }
  }

  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<{ processed: boolean; error?: string }> {
    const proposalId = paymentIntent.metadata?.proposalId
    const amendmentFailureRecorded = await bookingGuestAmendmentService.markAmendmentPaymentFailed(
      paymentIntent.id,
      paymentIntent.metadata?.amendmentId
    )
    const planFailureRecorded = await paymentPlanService.markInstallmentFailed({
      stripePaymentIntentId: paymentIntent.id,
      failureCode: paymentIntent.last_payment_error?.code,
      failureMessage: paymentIntent.last_payment_error?.message,
    })
    
    if (proposalId) {
      // Release payment lock
      const lockKey = `payment_lock_${proposalId}`
      try {
        await redisLocks.releaseLock(lockKey)
        await releaseProposalCheckoutLocks(proposalId)
        logger.info('[WEBHOOK] Payment lock released on payment failure', { proposalId })
      } catch (error) {
        logger.error('[WEBHOOK] Failed to release payment lock on failure', { proposalId, error })
      }

      // Update proposal status back to ACCEPTED if it was changed
      try {
        await prisma.proposal.update({
          where: { id: proposalId },
          data: { status: ProposalStatus.ACCEPTED }
        })
        logger.info('[WEBHOOK] Proposal status reset after payment failure', { proposalId })
      } catch (error) {
        logger.error('[WEBHOOK] Failed to reset proposal status', { proposalId, error })
      }
    }

    logger.info('[WEBHOOK] Payment intent failed', { paymentIntentId: paymentIntent.id, planFailureRecorded, amendmentFailureRecorded })
    return { processed: true }
  }

  private async handlePaymentIntentCanceled(paymentIntent: Stripe.PaymentIntent): Promise<{ processed: boolean; error?: string }> {
    const proposalId = paymentIntent.metadata?.proposalId
    
    if (proposalId) {
      // Release payment lock
      const lockKey = `payment_lock_${proposalId}`
      try {
        await redisLocks.releaseLock(lockKey)
        await releaseProposalCheckoutLocks(proposalId)
        logger.info('[WEBHOOK] Payment lock released on payment cancellation', { proposalId })
      } catch (error) {
        logger.error('[WEBHOOK] Failed to release payment lock on cancellation', { proposalId, error })
      }

      // Update proposal status back to ACCEPTED
      try {
        await prisma.proposal.update({
          where: { id: proposalId },
          data: { status: ProposalStatus.ACCEPTED }
        })
        logger.info('[WEBHOOK] Proposal status reset after payment cancellation', { proposalId })
      } catch (error) {
        logger.error('[WEBHOOK] Failed to reset proposal status on cancellation', { proposalId, error })
      }
    }

    logger.info('[WEBHOOK] Payment intent canceled', { paymentIntentId: paymentIntent.id })
    return { processed: true }
  }

  private async handleCheckoutSessionExpired(session: Stripe.Checkout.Session): Promise<{ processed: boolean; error?: string }> {
    const proposalId = session.metadata?.proposalId
    
    if (proposalId) {
      // Release payment lock
      const lockKey = `payment_lock_${proposalId}`
      try {
        await redisLocks.releaseLock(lockKey)
        await releaseProposalCheckoutLocks(proposalId)
        logger.info('[WEBHOOK] Payment lock released on session expiration', { proposalId })
      } catch (error) {
        logger.error('[WEBHOOK] Failed to release payment lock on expiration', { proposalId, error })
      }

      // Update proposal status back to ACCEPTED
      try {
        await prisma.proposal.update({
          where: { id: proposalId },
          data: { status: ProposalStatus.ACCEPTED }
        })
        logger.info('[WEBHOOK] Proposal status reset after session expiration', { proposalId })
      } catch (error) {
        logger.error('[WEBHOOK] Failed to reset proposal status on expiration', { proposalId, error })
      }
    }

    logger.info('[WEBHOOK] Checkout session expired', { sessionId: session.id })
    return { processed: true }
  }

  private async handleChargeDisputeCreated(charge: Stripe.Charge): Promise<{ processed: boolean; error?: string }> {
    // Create dispute record
    try {
      const payment = await prisma.payment.findFirst({
        where: { stripeChargeId: charge.id },
        include: { booking: true }
      })

      if (payment?.booking) {
        await prisma.dispute.create({
          data: {
            bookingId: payment.booking.id,
            reason: 'Payment disputed',
            description: charge.failure_message || 'Charge disputed by customer',
            status: 'OPEN',
            initiatedBy: 'STRIPE',
          }
        })

        logger.warn('[WEBHOOK] Dispute created', { 
          chargeId: charge.id, 
          bookingId: payment.booking.id
        })
      }

      return { processed: true }
    } catch (error) {
      logger.error('[WEBHOOK] Failed to create dispute', { chargeId: charge.id, error })
      return { processed: false, error: error instanceof Error ? error.message : 'Dispute creation failed' }
    }
  }

  private async handleChargeSucceeded(charge: Stripe.Charge): Promise<{ processed: boolean; error?: string }> {
    logger.info('[WEBHOOK] Charge succeeded', { chargeId: charge.id })
    return { processed: true }
  }

  private async handleChargeFailed(charge: Stripe.Charge): Promise<{ processed: boolean; error?: string }> {
    logger.info('[WEBHOOK] Charge failed', { chargeId: charge.id })
    return { processed: true }
  }

  private async handlePayoutEvent(eventType: string, payout: Stripe.Payout): Promise<{ processed: boolean; error?: string }> {
    logger.info('[WEBHOOK] Payout event', { eventType, payoutId: payout.id })
    return { processed: true }
  }
}

let instance: StripeWebhookHandler | null = null

export function getStripeWebhookHandler(): StripeWebhookHandler {
  if (!instance) {
    instance = new StripeWebhookHandler()
  }
  return instance
}
