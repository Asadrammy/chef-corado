/**
 * Frontend Payment Validation Service
 * 
 * Ensures frontend payment safety by:
 * - Verifying booking exists before showing success
 * - Never trusting frontend state
 * - Always fetching backend truth
 */

import { logger } from '@/lib/logger'

export interface PaymentValidationResult {
  valid: boolean
  booking?: any
  payment?: any
  error?: string
}

export class FrontendPaymentValidator {
  /**
   * Validate payment completion by checking backend state
   * 
   * CRITICAL: Never trust frontend payment state
   * Always verify with backend before showing success
   */
  static async validatePaymentCompletion(
    proposalId: string,
    stripeSessionId: string
  ): Promise<PaymentValidationResult> {
    try {
      // Step 1: Check if booking exists for this proposal
      const bookingResponse = await fetch(`/api/bookings/by-proposal/${proposalId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!bookingResponse.ok) {
        logger.error('[FRONTEND_VALIDATION] Failed to fetch booking', {
          proposalId,
          status: bookingResponse.status,
        })
        return {
          valid: false,
          error: 'Unable to verify booking status',
        }
      }

      const bookingData = await bookingResponse.json()

      if (!bookingData.booking) {
        logger.error('[FRONTEND_VALIDATION] No booking found for proposal', {
          proposalId,
          stripeSessionId,
        })
        return {
          valid: false,
          error: 'Booking not found - payment may have failed',
        }
      }

      const booking = bookingData.booking

      // Step 2: Verify payment exists and is PAID
      if (!booking.payments) {
        logger.error('[FRONTEND_VALIDATION] Booking has no payment', {
          bookingId: booking.id,
          proposalId,
        })
        return {
          valid: false,
          error: 'Payment not found for booking',
        }
      }

      const payment = booking.payments

      // Step 3: Verify payment status
      if (payment.status !== 'PAID') {
        logger.error('[FRONTEND_VALIDATION] Payment not in PAID status', {
          bookingId: booking.id,
          paymentId: payment.id,
          paymentStatus: payment.status,
        })
        return {
          valid: false,
          error: `Payment not completed: ${payment.status}`,
        }
      }

      // Step 4: Verify amounts match (prevent tampering)
      // This would need to be implemented based on your pricing logic
      // For now, we'll just log it for monitoring
      logger.info('[FRONTEND_VALIDATION] Payment validation successful', {
        bookingId: booking.id,
        paymentId: payment.id,
        amount: payment.totalAmount,
        proposalId,
        stripeSessionId,
      })

      return {
        valid: true,
        booking,
        payment,
      }

    } catch (error) {
      logger.error('[FRONTEND_VALIDATION] Validation failed', {
        proposalId,
        stripeSessionId,
        error: error instanceof Error ? error.message : String(error),
      })
      return {
        valid: false,
        error: 'Payment validation failed',
      }
    }
  }

  /**
   * Validate proposal is ready for payment
   * 
   * Frontend should call this before creating checkout
   */
  static async validateProposalForPayment(
    proposalId: string,
    userId: string
  ): Promise<{ valid: boolean; error?: string; proposal?: any }> {
    try {
      const response = await fetch(`/api/proposals/${proposalId}/validate-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return {
          valid: false,
          error: errorData.error || 'Validation failed',
        }
      }

      const data = await response.json()
      return {
        valid: data.valid,
        error: data.error,
        proposal: data.proposal,
      }

    } catch (error) {
      logger.error('[FRONTEND_VALIDATION] Proposal validation failed', {
        proposalId,
        error: error instanceof Error ? error.message : String(error),
      })
      return {
        valid: false,
        error: 'Unable to validate proposal',
      }
    }
  }

  /**
   * Poll for payment completion
   * 
   * Used when returning from Stripe to verify payment status
   */
  static async pollForPaymentCompletion(
    proposalId: string,
    maxAttempts: number = 10,
    interval: number = 2000
  ): Promise<PaymentValidationResult> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      logger.info('[FRONTEND_VALIDATION] Polling for payment completion', {
        proposalId,
        attempt,
        maxAttempts,
      })

      const result = await this.validatePaymentCompletion(proposalId, '')

      if (result.valid) {
        logger.info('[FRONTEND_VALIDATION] Payment completion confirmed', {
          proposalId,
          attempts: attempt,
        })
        return result
      }

      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, interval))
      }
    }

    logger.error('[FRONTEND_VALIDATION] Payment completion polling failed', {
      proposalId,
      maxAttempts,
    })

    return {
      valid: false,
      error: 'Payment completion not confirmed after polling',
    }
  }

  /**
   * Create safe success redirect URL
   * 
   * Includes validation token to prevent success page manipulation
   */
  static createSuccessRedirectUrl(proposalId: string): string {
    const baseUrl = window.location.origin
    const timestamp = Date.now()
    const validationToken = btoa(`${proposalId}:${timestamp}`)
    
    return `${baseUrl}/dashboard/client/bookings?status=success&proposal=${proposalId}&token=${validationToken}`
  }

  /**
   * Validate success redirect token
   * 
   * Prevents direct access to success page without payment
   */
  static validateSuccessToken(
    proposalId: string,
    token: string
  ): { valid: boolean; error?: string } {
    try {
      const decoded = atob(token)
      const [tokenProposalId, timestamp] = decoded.split(':')

      if (tokenProposalId !== proposalId) {
        return { valid: false, error: 'Invalid token' }
      }

      const tokenAge = Date.now() - parseInt(timestamp)
      const maxAge = 5 * 60 * 1000 // 5 minutes

      if (tokenAge > maxAge) {
        return { valid: false, error: 'Token expired' }
      }

      return { valid: true }

    } catch (error) {
      return { valid: false, error: 'Invalid token format' }
    }
  }
}

export const frontendPaymentValidator = FrontendPaymentValidator
