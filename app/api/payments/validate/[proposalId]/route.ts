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
import { paymentPlanService } from '@/lib/services/payment-plan-service'

export async function GET(request: NextRequest, context: { params: Promise<{ proposalId: string }> }) {
  try {
    const session = await getRequiredSession()
    const userId = getSessionUserId(session)
    const { proposalId } = await context.params

    // CRITICAL: Validate proposal is ready for payment
    const validation = await paymentGuarantee.validateProposalForPayment(proposalId, userId)

    if (!validation.valid) {
      if (validation.error?.startsWith('MARKET_PAYMENTS_INACTIVE:')) {
        return NextResponse.json({
          valid: false,
          error: 'ChefaChef is preparing to launch payments in this market. Online checkout is not yet available.',
        }, { status: 403 })
      }

      return NextResponse.json({
        valid: false,
        error: validation.error || 'Proposal not ready for payment',
      }, { status: 400 })
    }

    const paymentEligibility = validation.proposal
      ? paymentPlanService.getEligibilityForProposal(validation.proposal)
      : null

    return NextResponse.json({
      valid: true,
      proposal: validation.proposal,
      paymentEligibility,
    })

  } catch (error) {
    return handleApiError(error, 'Payment Validation')
  }
}
