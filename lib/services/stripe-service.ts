/**
 * Stripe Service with Circuit Breaker and Retry Logic
 * 
 * Provides safe Stripe API operations with:
 * - Circuit breaker protection
 * - Exponential backoff retry
 * - Request logging
 * - Error handling
 */

import Stripe from 'stripe'
import { withCircuitBreaker, circuitBreakers } from '@/lib/utils/circuit-breaker'
import { logger } from '@/lib/logger'

export class StripeService {
  private stripe: Stripe
  private static instance: StripeService

  private constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY not configured')
    }

    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-03-25.dahlia' as Stripe.LatestApiVersion,
      // Add timeout to prevent hanging requests
      timeout: 30000, // 30 seconds
    })
  }

  static getInstance(): StripeService {
    if (!StripeService.instance) {
      StripeService.instance = new StripeService()
    }
    return StripeService.instance
  }

  /**
   * Check if Stripe is properly configured
   * Returns true if a valid (non-placeholder) API key is configured
   */
  static isConfigured(): boolean {
    if (!process.env.STRIPE_SECRET_KEY) {
      return false
    }

    // Check for placeholder keys
    if (process.env.STRIPE_SECRET_KEY.includes('placeholder') || 
        process.env.STRIPE_SECRET_KEY === 'sk_test_placeholder' ||
        process.env.STRIPE_SECRET_KEY === 'sk_live_placeholder') {
      return false
    }

    return true
  }

  /**
   * Validate that Stripe is configured, throws error if not
   */
  static validateConfigured(): void {
    if (!StripeService.isConfigured()) {
      throw new Error('STRIPE_SECRET_KEY is not configured or is a placeholder. Please add a valid Stripe API key to your .env file.')
    }
  }

  /**
   * Create a payment intent with circuit breaker protection
   */
  async createPaymentIntent(params: Stripe.PaymentIntentCreateParams): Promise<Stripe.PaymentIntent> {
    StripeService.validateConfigured()
    return withCircuitBreaker('stripe', async () => {
      logger.info('[STRIPE] Creating payment intent', { 
        amount: params.amount,
        currency: params.currency,
        metadata: params.metadata
      })

      const paymentIntent = await this.stripe.paymentIntents.create(params)
      
      logger.info('[STRIPE] Payment intent created successfully', {
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status
      })

      return paymentIntent
    }, 'createPaymentIntent')
  }

  /**
   * Create a checkout session with circuit breaker protection
   */
  async createCheckoutSession(params: Stripe.Checkout.SessionCreateParams): Promise<Stripe.Checkout.Session> {
    StripeService.validateConfigured()
    return withCircuitBreaker('stripe', async () => {
      logger.info('[STRIPE] Creating checkout session', {
        successUrl: params.success_url,
        cancelUrl: params.cancel_url,
        metadata: params.metadata
      })

      const session = await this.stripe.checkout.sessions.create(params)
      
      logger.info('[STRIPE] Checkout session created successfully', {
        sessionId: session.id,
        paymentStatus: session.payment_status
      })

      return session
    }, 'createCheckoutSession')
  }

  async createConnectAccount(params?: Stripe.AccountCreateParams): Promise<Stripe.Account> {
    StripeService.validateConfigured()
    return withCircuitBreaker('stripe', async () => {
      logger.info('[STRIPE] Creating connect account')

      const account = await this.stripe.accounts.create({
        type: 'express',
        capabilities: {
          transfers: { requested: true },
        },
        ...(params ?? {}),
      })

      logger.info('[STRIPE] Connect account created successfully', {
        accountId: account.id,
      })

      return account
    }, 'createConnectAccount')
  }

  async createConnectAccountLink(params: Stripe.AccountLinkCreateParams): Promise<Stripe.AccountLink> {
    StripeService.validateConfigured()
    return withCircuitBreaker('stripe', async () => {
      logger.info('[STRIPE] Creating account onboarding link', {
        account: params.account,
      })

      const link = await this.stripe.accountLinks.create(params)

      logger.info('[STRIPE] Account onboarding link created successfully', {
        account: params.account,
      })

      return link
    }, 'createConnectAccountLink')
  }

  async retrieveConnectAccount(accountId: string): Promise<Stripe.Account> {
    StripeService.validateConfigured()
    return withCircuitBreaker('stripe', async () => {
      logger.debug('[STRIPE] Retrieving connect account', { accountId })

      const account = await this.stripe.accounts.retrieve(accountId)

      logger.debug('[STRIPE] Connect account retrieved successfully', {
        accountId,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
      })

      return account
    }, 'retrieveConnectAccount')
  }

  /**
   * Retrieve a payment intent with circuit breaker protection
   */
  async retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    StripeService.validateConfigured()
    return withCircuitBreaker('stripe', async () => {
      logger.debug('[STRIPE] Retrieving payment intent', { paymentIntentId })

      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId)
      
      logger.debug('[STRIPE] Payment intent retrieved successfully', {
        paymentIntentId,
        status: paymentIntent.status
      })

      return paymentIntent
    }, 'retrievePaymentIntent')
  }

  /**
   * Confirm a payment intent with circuit breaker protection
   */
  async confirmPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    StripeService.validateConfigured()
    return withCircuitBreaker('stripe', async () => {
      logger.info('[STRIPE] Confirming payment intent', { paymentIntentId })

      const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId)
      
      logger.info('[STRIPE] Payment intent confirmed successfully', {
        paymentIntentId,
        status: paymentIntent.status
      })

      return paymentIntent
    }, 'confirmPaymentIntent')
  }

  /**
   * Create a refund with circuit breaker protection
   */
  async createRefund(params: Stripe.RefundCreateParams): Promise<Stripe.Refund> {
    StripeService.validateConfigured()
    return withCircuitBreaker('stripe', async () => {
      logger.info('[STRIPE] Creating refund', {
        paymentIntentId: params.payment_intent,
        amount: params.amount,
        reason: params.reason
      })

      const refund = await this.stripe.refunds.create(params)
      
      logger.info('[STRIPE] Refund created successfully', {
        refundId: refund.id,
        status: refund.status,
        amount: refund.amount
      })

      return refund
    }, 'createRefund')
  }

  /**
   * Create a transfer (for payouts) with circuit breaker protection
   */
  async createTransfer(params: Stripe.TransferCreateParams): Promise<Stripe.Transfer> {
    return withCircuitBreaker('stripe', async () => {
      logger.info('[STRIPE] Creating transfer', {
        amount: params.amount,
        destination: params.destination,
        metadata: params.metadata
      })

      const transfer = await this.stripe.transfers.create(params)
      
      logger.info('[STRIPE] Transfer created successfully', {
        transferId: transfer.id,
        amount: transfer.amount,
        destination: transfer.destination
      })

      return transfer
    }, 'createTransfer')
  }

  /**
   * Retrieve a balance with circuit breaker protection
   */
  async retrieveBalance(): Promise<Stripe.Balance> {
    return withCircuitBreaker('stripe', async () => {
      logger.debug('[STRIPE] Retrieving account balance')

      const balance = await this.stripe.balance.retrieve()
      
      logger.debug('[STRIPE] Balance retrieved successfully', {
        available: balance.available,
        pending: balance.pending
      })

      return balance
    }, 'retrieveBalance')
  }

  /**
   * List payment intents with circuit breaker protection
   */
  async listPaymentIntents(params?: Stripe.PaymentIntentListParams): Promise<Stripe.ApiList<Stripe.PaymentIntent>> {
    return withCircuitBreaker('stripe', async () => {
      logger.debug('[STRIPE] Listing payment intents', { params })

      const paymentIntents = await this.stripe.paymentIntents.list(params)
      
      logger.debug('[STRIPE] Payment intents listed successfully', {
        count: paymentIntents.data.length,
        hasMore: paymentIntents.has_more
      })

      return paymentIntents
    }, 'listPaymentIntents')
  }

  /**
   * Verify webhook signature with circuit breaker protection
   */
  constructWebhookEvent(payload: string, signature: string): Stripe.Event {
    // This is a synchronous operation, but we still want to log it
    try {
      if (!process.env.STRIPE_WEBHOOK_SECRET) {
        throw new Error('STRIPE_WEBHOOK_SECRET not configured')
      }

      const event = this.stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET)
      
      logger.info('[STRIPE] Webhook event constructed successfully', {
        eventId: event.id,
        type: event.type
      })

      return event
    } catch (error) {
      logger.error('[STRIPE] Webhook signature verification failed', { error })
      throw error
    }
  }

  /**
   * Get circuit breaker status for monitoring
   */
  getCircuitBreakerStatus() {
    return {
      stripe: circuitBreakers.stripe.getStats()
    }
  }

  /**
   * Test Stripe connectivity
   */
  async testConnectivity(): Promise<boolean> {
    try {
      await this.retrieveBalance()
      return true
    } catch (error) {
      logger.error('[STRIPE] Connectivity test failed', { error })
      return false
    }
  }
}

// Export singleton instance
export const stripeService = StripeService.getInstance()
