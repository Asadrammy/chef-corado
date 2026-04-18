/**
 * Proposal Payment Validation API
 * 
 * Validates if a proposal is ready for payment
 * Used by frontend before creating Stripe checkout
 */

import { NextRequest, NextResponse } from 'next/server'
import { getRequiredSession, getSessionUserId } from '@/lib/auth-helpers'
import { handleApiError, ApiError } from '@/lib/error-handler'
import { paymentGuarantee } from '@/lib/services/payment-guarantee'

export async function POST(request: NextRequest, context: { params: Promise<{ proposalId: string }> }) {
  try {
    const session = await getRequiredSession()
    const userId = getSessionUserId(session)
    const { proposalId } = await context.params

    const body = await request.json()
    const { userId: requestUserId } = body

    // Verify the user is the same as the one making the request
    if (requestUserId !== userId) {
      throw new ApiError(401, 'Unauthorized')
    }

    // Validate proposal is ready for payment
    const result = await paymentGuarantee.validateProposalForPayment(proposalId, userId)

    if (!result.valid) {
      throw new ApiError(400, result.error || 'Proposal not ready for payment')
    }

    return NextResponse.json({
      valid: true,
      proposal: result.proposal,
    })

  } catch (error) {
    return handleApiError(error, 'Proposal Payment Validation')
  }
}
