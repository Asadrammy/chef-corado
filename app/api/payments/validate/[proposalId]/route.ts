/**
 * Payment Validation API
 * 
 * CRITICAL: Validates if a proposal is ready for payment
 * Prevents payments for invalid/cancelled/expired proposals
 */

import { NextRequest, NextResponse } from 'next/server'
import { getRequiredSession, getSessionUserId } from '@/lib/auth-helpers'
import { handleApiError, ApiError } from '@/lib/error-handler'
import { paymentGuarantee } from '@/lib/services/payment-guarantee'

export async function GET(request: NextRequest, context: { params: Promise<{ proposalId: string }> }) {
  try {
    const session = await getRequiredSession()
    const userId = getSessionUserId(session)
    const { proposalId } = await context.params

    // CRITICAL: Validate proposal is ready for payment
    const validation = await paymentGuarantee.validateProposalForPayment(proposalId, userId)

    if (!validation.valid) {
      return NextResponse.json({
        valid: false,
        error: validation.error || 'Proposal not ready for payment',
      }, { status: 400 })
    }

    return NextResponse.json({
      valid: true,
      proposal: validation.proposal,
    })

  } catch (error) {
    return handleApiError(error, 'Payment Validation')
  }
}
