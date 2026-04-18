/**
 * Manual Reconciliation API for Payment Success Polling
 * Used when webhook is delayed and polling times out
 */

import { NextRequest, NextResponse } from 'next/server'
import { paymentReconciliation } from '@/lib/services/payment-reconciliation'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { proposalId } = body

    if (!proposalId) {
      return NextResponse.json({ error: 'Proposal ID required' }, { status: 400 })
    }

    logger.info('[MANUAL_RECONCILIATION] Starting manual reconciliation', { proposalId })

    // Try to find any payments for this proposal
    const { prisma } = await import('@/lib/prisma')
    
    // Check if there's already a booking
    const existingBooking = await prisma.booking.findFirst({
      where: { proposalId },
      include: { payments: true }
    })

    if (existingBooking && existingBooking.payments?.status === 'PAID') {
      logger.info('[MANUAL_RECONCILIATION] Booking already exists and paid', { 
        proposalId, 
        bookingId: existingBooking.id 
      })
      return NextResponse.json({
        success: true,
        booking: existingBooking,
        message: 'Booking already confirmed'
      })
    }

    // Try to reconcile by checking recent Stripe payments
    if (!process.env.STRIPE_SECRET_KEY || 
        process.env.STRIPE_SECRET_KEY.includes('placeholder') ||
        process.env.STRIPE_SECRET_KEY === 'sk_test_placeholder' ||
        process.env.STRIPE_SECRET_KEY === 'sk_live_placeholder') {
      return NextResponse.json({
        success: false,
        error: 'Stripe not configured. Please add a valid STRIPE_SECRET_KEY to your .env file.',
        message: 'Stripe not configured'
      }, { status: 503 })
    }

    const Stripe = require('stripe')
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-03-25.dahlia'
    })

    // Get recent payment intents with this proposal metadata
    const paymentIntents = await stripe.paymentIntents.list({
      limit: 10,
      expand: ['data.latest_charge']
    })

    const matchingPayment = paymentIntents.data.find((pi: any) => 
      pi.metadata?.proposalId === proposalId && 
      pi.status === 'succeeded'
    )

    if (matchingPayment) {
      logger.info('[MANUAL_RECONCILIATION] Found matching payment intent', { 
        proposalId, 
        paymentIntentId: matchingPayment.id 
      })

      // Try to reconcile this payment
      const reconcileResult = await paymentReconciliation.reconcilePayment(matchingPayment.id)

      if (reconcileResult.reconciled) {
        logger.info('[MANUAL_RECONCILIATION] Successfully reconciled payment', { 
          proposalId, 
          bookingId: reconcileResult.bookingId 
        })

        return NextResponse.json({
          success: true,
          bookingId: reconcileResult.bookingId,
          paymentId: reconcileResult.paymentId,
          message: 'Payment reconciled successfully'
        })
      } else {
        logger.error('[MANUAL_RECONCILIATION] Failed to reconcile payment', { 
          proposalId, 
          error: reconcileResult.error 
        })
        return NextResponse.json({
          success: false,
          error: reconcileResult.error,
          message: 'Payment found but reconciliation failed'
        })
      }
    }

    // No matching payment found
    logger.warn('[MANUAL_RECONCILIATION] No matching payment found', { proposalId })
    return NextResponse.json({
      success: false,
      message: 'No payment found for this proposal'
    })

  } catch (error) {
    logger.error('[MANUAL_RECONCILIATION] Manual reconciliation failed', { 
      error: error instanceof Error ? error.message : String(error) 
    })
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Reconciliation failed'
    }, { status: 500 })
  }
}
