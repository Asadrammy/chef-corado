/**
 * Payment Reconciliation Service
 * 
 * CRITICAL: Handles payment success but DB failure scenarios
 * Provides compensation patterns for system recovery
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { getProposalBookingCounts } from '@/lib/booking-counts'
import Stripe from 'stripe'

export class PaymentReconciliationService {
  /**
   * Reconcile Stripe payment with local database
   * 
   * CRITICAL: This handles the scenario where:
   * - Stripe payment succeeded
   * - Webhook failed to process
   * - Booking was not created
   */
  static async reconcilePayment(paymentIntentId: string): Promise<{
        reconciled: boolean
        bookingId?: string
        paymentId?: string
        error?: string
      }> {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2026-03-25.dahlia' as Stripe.LatestApiVersion,
      })

      // Step 1: Get payment intent from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
      
      if (paymentIntent.status !== 'succeeded') {
        return { reconciled: false, error: 'Payment not succeeded' }
      }

      // Step 2: Check if payment already recorded
      const existingPayment = await prisma.payment.findFirst({
        where: { stripePaymentIntentId: paymentIntentId },
        include: { booking: true },
      })

      if (existingPayment) {
        logger.info('[RECONCILIATION] Payment already recorded', {
          paymentId: existingPayment.id,
          bookingId: existingPayment.booking?.id,
        })
        return {
          reconciled: true,
          bookingId: existingPayment.booking?.id,
          paymentId: existingPayment.id,
        }
      }

      // Step 3: Extract proposal metadata
      const proposalId = paymentIntent.metadata?.proposalId
      if (!proposalId) {
        return { reconciled: false, error: 'No proposal ID in payment metadata' }
      }

      // Step 4: Verify proposal exists and is payable
      const proposal = await prisma.proposal.findUnique({
        where: { id: proposalId },
        include: {
          request: true,
          chef: { include: { user: true } },
        },
      })

      if (!proposal) {
        return { reconciled: false, error: 'Proposal not found' }
      }

      if (!['ACCEPTED', 'ACCEPTED_PENDING_PAYMENT'].includes(proposal.status)) {
        return { reconciled: false, error: 'Proposal not payable' }
      }

      // Step 5: Check if booking already exists for this proposal
      const existingBooking = await prisma.booking.findFirst({
        where: { proposalId },
        include: { payments: true },
      })

      if (existingBooking) {
        logger.warn('[RECONCILIATION] Booking exists but payment missing', {
          bookingId: existingBooking.id,
          proposalId,
        })
        return { reconciled: false, error: 'Booking exists without payment' }
      }

      // Step 6: ATOMIC: Create booking and payment
      const result = await prisma.$transaction(async (tx) => {
        const amount = paymentIntent.amount / 100
        const commissionAmount = amount * 0.2
        const chefAmount = amount * 0.8
        const bookingCounts = getProposalBookingCounts(proposal.request)

        // Create booking
        const booking = await tx.booking.create({
          data: {
            clientId: proposal.request.clientId,
            chefId: proposal.chefId,
            proposalId: proposal.id,
            totalPrice: amount,
            status: 'CONFIRMED',
            eventDate: proposal.request.eventDate,
            location: proposal.request.location,
            latitude: proposal.request.latitude,
            longitude: proposal.request.longitude,
            guestCount: bookingCounts.guestCount,
            studentCount: bookingCounts.studentCount,
            bookingType: 'PROPOSAL',
          },
        })

        // Create payment
        const payment = await tx.payment.create({
          data: {
            bookingId: booking.id,
            totalAmount: amount,
            commissionAmount,
            chefAmount,
            status: 'PAID',
            stripePaymentIntentId: paymentIntentId,
            stripeChargeId: paymentIntent.latest_charge as string,
          },
        })

        // Update proposal status
        await tx.proposal.update({
          where: { id: proposalId },
          data: { status: 'BOOKED' },
        })

        logger.info('[RECONCILIATION] Created booking and payment', {
          bookingId: booking.id,
          paymentId: payment.id,
          proposalId,
          amount,
        })

        return { booking, payment }
      })

      return {
        reconciled: true,
        bookingId: result.booking.id,
        paymentId: result.payment.id,
      }

    } catch (error) {
      logger.error('[RECONCILIATION] Failed to reconcile payment', {
        paymentIntentId,
        error: error instanceof Error ? error.message : String(error),
      })
      return {
        reconciled: false,
        error: error instanceof Error ? error.message : 'Reconciliation failed',
      }
    }
  }

  /**
   * Find and reconcile all orphaned payments
   * 
   * CRITICAL: This finds payments that succeeded but weren't processed
   */
  static async findOrphanedPayments(): Promise<{
        total: number
        reconciled: number
        failed: number
        errors: Array<{ paymentIntentId: string; error: string }>
      }> {
    try {
      if (!process.env.STRIPE_SECRET_KEY || 
          process.env.STRIPE_SECRET_KEY.includes('placeholder') ||
          process.env.STRIPE_SECRET_KEY === 'sk_test_placeholder' ||
          process.env.STRIPE_SECRET_KEY === 'sk_live_placeholder') {
        return {
          total: 0,
          reconciled: 0,
          failed: 0,
          errors: [{
            paymentIntentId: 'system',
            error: 'Stripe not configured. Please add a valid STRIPE_SECRET_KEY to your .env file.',
          }],
        }
      }

      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2026-03-25.dahlia' as Stripe.LatestApiVersion,
      })

      // Get recent successful payments
      const payments = await stripe.paymentIntents.list({
        limit: 100,
      })

      let reconciled = 0
      let failed = 0
      const errors: Array<{ paymentIntentId: string; error: string }> = []

      for (const payment of payments.data) {
        if (!payment.metadata?.proposalId || payment.status !== 'succeeded') {
          continue
        }

        const result = await this.reconcilePayment(payment.id)
        
        if (result.reconciled) {
          reconciled++
        } else {
          failed++
          errors.push({
            paymentIntentId: payment.id,
            error: result.error || 'Unknown error',
          })
        }
      }

      return {
        total: payments.data.length,
        reconciled,
        failed,
        errors,
      }

    } catch (error) {
      logger.error('[RECONCILIATION] Failed to find orphaned payments', {
        error: error instanceof Error ? error.message : String(error),
      })
      return {
        total: 0,
        reconciled: 0,
        failed: 0,
        errors: [{
          paymentIntentId: 'system',
          error: error instanceof Error ? error.message : 'System error',
        }],
      }
    }
  }

  /**
   * Validate payment consistency
   * 
   * CRITICAL: Ensures every payment has corresponding booking
   */
  static async validatePaymentConsistency(): Promise<{
        totalPayments: number
        consistentPayments: number
        inconsistentPayments: Array<{
          paymentId: string
          paymentIntentId: string
          issue: string
        }>
      }> {
    try {
      const payments = await prisma.payment.findMany({
        where: { status: 'PAID' },
        include: { booking: true },
      })

      const inconsistentPayments: Array<{
        paymentId: string
        paymentIntentId: string
        issue: string
      }> = []

      for (const payment of payments) {
        if (!payment.booking) {
          inconsistentPayments.push({
            paymentId: payment.id,
            paymentIntentId: payment.stripePaymentIntentId || 'unknown',
            issue: 'Payment exists without booking',
          })
        }
      }

      return {
        totalPayments: payments.length,
        consistentPayments: payments.length - inconsistentPayments.length,
        inconsistentPayments,
      }

    } catch (error) {
      logger.error('[RECONCILIATION] Failed to validate payment consistency', {
        error: error instanceof Error ? error.message : String(error),
      })
      return {
        totalPayments: 0,
        consistentPayments: 0,
        inconsistentPayments: [{
          paymentId: 'system',
          paymentIntentId: 'system',
          issue: error instanceof Error ? error.message : 'System error',
        }],
      }
    }
  }
}

export const paymentReconciliation = PaymentReconciliationService
