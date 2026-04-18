import { Worker, Job } from 'bullmq'
import Redis from 'ioredis'
import { logger } from '@/lib/monitoring/logger'
import { ReconciliationJobData, QUEUE_NAMES } from '../queue'
import { stripeReconciliationEngine } from '@/lib/services/stripe-reconciliation'
import { doubleEntryLedger } from '@/lib/services/double-entry-ledger'

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
}

/**
 * Reconciliation Worker
 * Syncs Stripe payments with local database
 * Handles:
 * - Missing webhooks
 * - Duplicate webhooks
 * - Out-of-order events
 * - Payment success but DB not updated
 */
export class ReconciliationWorker {
  private worker: Worker | null = null

  async start() {
    this.worker = new Worker(
      QUEUE_NAMES.RECONCILIATION,
      this.processReconciliation.bind(this),
      {
        connection: new Redis(redisConfig),
        concurrency: 1, // Run reconciliation serially
      }
    )

    this.worker.on('completed', (job) => {
      logger.info(`[RECONCILIATION_WORKER] Job completed`, {
        jobId: job.id,
        type: job.data.type,
      })
    })

    this.worker.on('failed', (job, error) => {
      logger.error(`[RECONCILIATION_WORKER] Job failed`, {
        jobId: job?.id,
        error: error.message,
      })
    })

    logger.info('[RECONCILIATION_WORKER] Started')
  }

  /**
   * Process reconciliation job
   */
  private async processReconciliation(job: Job<ReconciliationJobData>) {
    const { type, paymentId, payoutId, startDate, endDate } = job.data

    logger.info(`[RECONCILIATION_WORKER] Processing reconciliation`, {
      jobId: job.id,
      type,
    })

    try {
      let result

      switch (type) {
        case 'full':
          result = await stripeReconciliationEngine.reconcileAllPayments(startDate, endDate)
          break

        case 'incremental':
          // Reconcile last 24 hours
          const oneDayAgo = new Date(Date.now() - 86400000)
          result = await stripeReconciliationEngine.reconcileAllPayments(oneDayAgo)
          break

        case 'payment':
          if (!paymentId) {
            throw new Error('paymentId required for payment reconciliation')
          }
          result = await stripeReconciliationEngine.reconcilePayment(paymentId)
          break

        case 'payout':
          if (!payoutId) {
            throw new Error('payoutId required for payout reconciliation')
          }
          // TODO: Implement payout reconciliation
          result = { checked: 0, fixed: 0, errors: [], timestamp: new Date() }
          break

        default:
          throw new Error(`Unknown reconciliation type: ${type}`)
      }

      // Verify ledger integrity
      const integrity = await doubleEntryLedger.verifyIntegrity()
      if (!integrity.valid) {
        logger.error(`[RECONCILIATION_WORKER] Ledger integrity check failed`, {
          errors: integrity.errors,
        })
      }

      logger.info(`[RECONCILIATION_WORKER] Reconciliation completed`, {
        type,
        checked: result.checked,
        fixed: result.fixed,
        errors: result.errors.length,
      })

      return {
        status: 'success',
        type,
        ...result,
      }
    } catch (error) {
      logger.error(`[RECONCILIATION_WORKER] Error processing reconciliation`, {
        jobId: job.id,
        type,
        error: error instanceof Error ? error.message : String(error),
      })

      throw error
    }
  }

  async stop() {
    if (this.worker) {
      await this.worker.close()
      logger.info('[RECONCILIATION_WORKER] Stopped')
    }
  }
}

// Export singleton
let reconciliationWorker: ReconciliationWorker | null = null

export function getReconciliationWorker(): ReconciliationWorker {
  if (!reconciliationWorker) {
    reconciliationWorker = new ReconciliationWorker()
  }
  return reconciliationWorker
}
