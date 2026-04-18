/**
 * Automated Reconciliation Job
 * 
 * Runs daily to compare Stripe payments with database records
 * Detects inconsistencies and attempts to fix them automatically
 */

import { stripeReconciliationEngine } from '@/lib/services/stripe-reconciliation'
import { logger } from '@/lib/logger'

export interface ReconciliationJobResult {
  success: boolean
  checked: number
  fixed: number
  errors: string[]
  timestamp: Date
  duration: number
}

/**
 * Run daily reconciliation job
 * Compares payments from last 24 hours
 */
export async function runDailyReconciliation(): Promise<ReconciliationJobResult> {
  const startTime = Date.now()
  
  try {
    logger.info('[RECONCILIATION_JOB] Starting daily reconciliation')

    // Get payments from last 24 hours
    const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const endDate = new Date()

    const result = await stripeReconciliationEngine.reconcileAllPayments(startDate, endDate)
    const duration = Date.now() - startTime

    const jobResult: ReconciliationJobResult = {
      success: result.errors.length === 0,
      checked: result.checked,
      fixed: result.fixed,
      errors: result.errors,
      timestamp: result.timestamp,
      duration
    }

    logger.info('[RECONCILIATION_JOB] Daily reconciliation completed', {
      success: jobResult.success,
      checked: jobResult.checked,
      fixed: jobResult.fixed,
      errors: jobResult.errors.length,
      duration: jobResult.duration
    })

    // Alert on critical issues
    if (result.errors.length > 0) {
      logger.error('[RECONCILIATION_JOB] Critical issues detected', {
        errors: result.errors,
        checked: result.checked,
        fixed: result.fixed
      })

      // TODO: Send alert to monitoring system
      // await sendAlert({
      //   type: 'RECONCILIATION_FAILURE',
      //   severity: 'HIGH',
      //   message: `Found ${result.errors.length} reconciliation issues`,
      //   details: result.errors
      // })
    }

    return jobResult

  } catch (error) {
    const duration = Date.now() - startTime
    
    logger.error('[RECONCILIATION_JOB] Daily reconciliation failed', {
      error,
      duration
    })

    return {
      success: false,
      checked: 0,
      fixed: 0,
      errors: [`Job failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      timestamp: new Date(),
      duration
    }
  }
}

/**
 * Run weekly comprehensive reconciliation
 * Compares all payments from last 7 days
 */
export async function runWeeklyReconciliation(): Promise<ReconciliationJobResult> {
  const startTime = Date.now()
  
  try {
    logger.info('[RECONCILIATION_JOB] Starting weekly comprehensive reconciliation')

    // Get payments from last 7 days
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const endDate = new Date()

    const result = await stripeReconciliationEngine.reconcileAllPayments(startDate, endDate)
    const duration = Date.now() - startTime

    const jobResult: ReconciliationJobResult = {
      success: result.errors.length === 0,
      checked: result.checked,
      fixed: result.fixed,
      errors: result.errors,
      timestamp: result.timestamp,
      duration
    }

    logger.info('[RECONCILIATION_JOB] Weekly reconciliation completed', {
      success: jobResult.success,
      checked: jobResult.checked,
      fixed: jobResult.fixed,
      errors: jobResult.errors.length,
      duration
    })

    // Weekly reconciliation always generates a report
    logger.info('[RECONCILIATION_JOB] Weekly reconciliation summary', {
      totalChecked: jobResult.checked,
      issuesFixed: jobResult.fixed,
      issuesRemaining: jobResult.errors.length,
      processingTime: jobResult.duration
    })

    return jobResult

  } catch (error) {
    const duration = Date.now() - startTime
    
    logger.error('[RECONCILIATION_JOB] Weekly reconciliation failed', {
      error,
      duration
    })

    return {
      success: false,
      checked: 0,
      fixed: 0,
      errors: [`Weekly job failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      timestamp: new Date(),
      duration
    }
  }
}

/**
 * Run reconciliation for specific payment ID
 * Used for manual reconciliation or triggered by alerts
 */
export async function reconcilePayment(paymentId: string): Promise<ReconciliationJobResult> {
  const startTime = Date.now()
  
  try {
    logger.info('[RECONCILIATION_JOB] Starting payment-specific reconciliation', {
      paymentId
    })

    const result = await stripeReconciliationEngine.reconcilePayment(paymentId)
    const duration = Date.now() - startTime

    const jobResult: ReconciliationJobResult = {
      success: result.errors.length === 0,
      checked: result.checked,
      fixed: result.fixed,
      errors: result.errors,
      timestamp: result.timestamp,
      duration
    }

    logger.info('[RECONCILIATION_JOB] Payment reconciliation completed', {
      paymentId,
      success: jobResult.success,
      fixed: jobResult.fixed,
      errors: jobResult.errors.length,
      duration
    })

    return jobResult

  } catch (error) {
    const duration = Date.now() - startTime
    
    logger.error('[RECONCILIATION_JOB] Payment reconciliation failed', {
      paymentId,
      error,
      duration
    })

    return {
      success: false,
      checked: 0,
      fixed: 0,
      errors: [`Payment reconciliation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      timestamp: new Date(),
      duration
    }
  }
}

// Export job functions for cron scheduling
export const reconciliationJobs = {
  daily: runDailyReconciliation,
  weekly: runWeeklyReconciliation,
  payment: reconcilePayment
} as const
