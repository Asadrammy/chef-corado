/**
 * Automatic Payment Reconciliation Cron Job
 * Runs every 5 minutes to find and fix payment inconsistencies
 */

import { NextRequest, NextResponse } from 'next/server'
import { paymentReconciliation } from '@/lib/services/payment-reconciliation'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  // Security: Only allow cron job or admin access
  const authHeader = request.headers.get('authorization')
  const cronAuth = process.env.CRON_SECRET

  if (!cronAuth) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  }
  
  // Check if it's a cron job or admin
  if (authHeader !== `Bearer ${cronAuth}`) {
    // Check for admin session (for manual testing)
    try {
      const { getRequiredSession } = await import('@/lib/auth-helpers')
      const { Role } = await import('@/types')
      await getRequiredSession(Role.ADMIN)
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  logger.info('[RECONCILIATION] Starting automatic reconciliation')

  try {
    // Step 1: Find and reconcile orphaned payments
    const orphanedResult = await paymentReconciliation.findOrphanedPayments()
    
    logger.info('[RECONCILIATION] Orphaned payments check completed', {
      total: orphanedResult.total,
      reconciled: orphanedResult.reconciled,
      failed: orphanedResult.failed,
      errors: orphanedResult.errors.length
    })

    // Step 2: Validate payment consistency
    const consistencyResult = await paymentReconciliation.validatePaymentConsistency()
    
    logger.info('[RECONCILIATION] Payment consistency check completed', {
      totalPayments: consistencyResult.totalPayments,
      consistentPayments: consistencyResult.consistentPayments,
      inconsistentPayments: consistencyResult.inconsistentPayments.length
    })

    // Step 3: Auto-fix inconsistent payments if any
    let autoFixed = 0
    const errors: Array<{ paymentId: string; issue: string; action: string }> = []

    for (const inconsistentPayment of consistencyResult.inconsistentPayments) {
      try {
        // Try to reconcile the inconsistent payment
        const reconcileResult = await paymentReconciliation.reconcilePayment(
          inconsistentPayment.paymentIntentId
        )

        if (reconcileResult.reconciled) {
          autoFixed++
          errors.push({
            paymentId: inconsistentPayment.paymentId,
            issue: inconsistentPayment.issue,
            action: 'Auto-reconciled successfully'
          })
        } else {
          errors.push({
            paymentId: inconsistentPayment.paymentId,
            issue: inconsistentPayment.issue,
            action: `Failed: ${reconcileResult.error}`
          })
        }
      } catch (error) {
        errors.push({
          paymentId: inconsistentPayment.paymentId,
          issue: inconsistentPayment.issue,
          action: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    }

    logger.info('[RECONCILIATION] Auto-fix completed', {
      autoFixed,
      totalErrors: errors.length
    })

    // Step 4: Clean up old webhook logs (keep last 7 days)
    try {
      const { prisma } = await import('@/lib/prisma')
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const deletedLogs = await prisma.webhookLog.deleteMany({
        where: {
          createdAt: { lt: sevenDaysAgo }
        }
      })

      logger.info('[RECONCILIATION] Cleaned old webhook logs', { deleted: deletedLogs.count })
    } catch (error) {
      logger.error('[RECONCILIATION] Failed to clean webhook logs', { error })
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results: {
        orphanedPayments: {
          total: orphanedResult.total,
          reconciled: orphanedResult.reconciled,
          failed: orphanedResult.failed,
          errors: orphanedResult.errors
        },
        consistency: {
          totalPayments: consistencyResult.totalPayments,
          consistentPayments: consistencyResult.consistentPayments,
          inconsistentPayments: consistencyResult.inconsistentPayments.length
        },
        autoFixed,
        errors,
        webhookLogsCleaned: true
      }
    })

  } catch (error) {
    logger.error('[RECONCILIATION] Cron job failed', { 
      error: error instanceof Error ? error.message : String(error) 
    })
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Reconciliation failed',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
