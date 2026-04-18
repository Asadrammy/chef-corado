import { NextRequest, NextResponse } from 'next/server'
import { getRequiredSession } from '@/lib/auth-helpers'
import { handleApiError } from '@/lib/error-handler'
import { stripeReconciliationEngine } from '@/lib/services/stripe-reconciliation'
import { Role } from '@/types'
import { logger } from '@/lib/logger'
import { applyRateLimit } from '@/lib/redis-rate-limiter'

// GET - Run reconciliation between Stripe and DB
export async function GET(request: NextRequest) {
  // Apply rate limiting for reconciliation endpoint
  const rateLimitResult = await applyRateLimit(request, 'general')
  if (!rateLimitResult.allowed && rateLimitResult.response) {
    return rateLimitResult.response
  }

  try {
    const session = await getRequiredSession(Role.ADMIN)
    
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') 
      ? new Date(searchParams.get('startDate')!) 
      : new Date(Date.now() - 24 * 60 * 60 * 1000) // Default: last 24 hours
    const endDate = searchParams.get('endDate') 
      ? new Date(searchParams.get('endDate')!) 
      : new Date()

    logger.info('[RECONCILIATION] Starting Stripe vs DB reconciliation', {
      startDate,
      endDate,
      triggeredBy: session.user.id
    })

    const result = await stripeReconciliationEngine.reconcileAllPayments(startDate, endDate)

    logger.info('[RECONCILIATION] Reconciliation completed', {
      checked: result.checked,
      fixed: result.fixed,
      errors: result.errors.length,
      triggeredBy: session.user.id
    })

    // If there are critical issues, alert
    if (result.errors.length > 0) {
      logger.error('[RECONCILIATION] Critical reconciliation errors detected', {
        errors: result.errors,
        triggeredBy: session.user.id
      })
    }

    return NextResponse.json({
      success: true,
      result: {
        checked: result.checked,
        fixed: result.fixed,
        errors: result.errors,
        timestamp: result.timestamp,
        hasCriticalIssues: result.errors.length > 0
      }
    })

  } catch (error) {
    logger.error('[RECONCILIATION] Reconciliation failed', { error })
    return handleApiError(error, 'Reconciliation GET')
  }
}

// POST - Reconcile specific payment
export async function POST(request: NextRequest) {
  // Apply rate limiting for reconciliation endpoint
  const rateLimitResult = await applyRateLimit(request, 'general')
  if (!rateLimitResult.allowed && rateLimitResult.response) {
    return rateLimitResult.response
  }

  try {
    const session = await getRequiredSession(Role.ADMIN)
    
    const body = await request.json()
    const { paymentId } = body

    if (!paymentId || typeof paymentId !== 'string') {
      return NextResponse.json({ 
        error: 'Payment ID is required' 
      }, { status: 400 })
    }

    logger.info('[RECONCILIATION] Starting specific payment reconciliation', {
      paymentId,
      triggeredBy: session.user.id
    })

    const result = await stripeReconciliationEngine.reconcilePayment(paymentId)

    logger.info('[RECONCILIATION] Specific payment reconciliation completed', {
      paymentId,
      checked: result.checked,
      fixed: result.fixed,
      errors: result.errors.length,
      triggeredBy: session.user.id
    })

    return NextResponse.json({
      success: true,
      result: {
        paymentId,
        checked: result.checked,
        fixed: result.fixed,
        errors: result.errors,
        timestamp: result.timestamp
      }
    })

  } catch (error) {
    logger.error('[RECONCILIATION] Specific payment reconciliation failed', { error })
    return handleApiError(error, 'Reconciliation POST')
  }
}
