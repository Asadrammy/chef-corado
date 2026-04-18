import { Queue, Worker, QueueEvents, ConnectionOptions } from 'bullmq'
import Redis from 'ioredis'
import { logger } from '@/lib/monitoring/logger'

// Redis connection configuration
const redisConfig: ConnectionOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  enableOfflineQueue: false,
}

// Use Upstash Redis if available (production)
const getRedisConnection = () => {
  if (process.env.UPSTASH_REDIS_REST_URL) {
    // For Upstash, we use the REST API via a wrapper
    return new Redis(process.env.UPSTASH_REDIS_REST_URL)
  }
  return new Redis(redisConfig)
}

// Queue definitions
export const QUEUE_NAMES = {
  PAYMENTS: 'payments',
  NOTIFICATIONS: 'notifications',
  PAYOUTS: 'payouts',
  RECONCILIATION: 'reconciliation',
  RETRIES: 'retries',
  CLEANUP: 'cleanup',
  WEBHOOKS: 'webhooks',
} as const

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES]

// Job data types
export interface PaymentJobData {
  paymentId: string
  bookingId: string
  stripePaymentIntentId: string
  amount: number
  idempotencyKey: string
}

export interface NotificationJobData {
  userId: string
  type: string
  message: string
  metadata?: Record<string, any>
}

export interface PayoutJobData {
  payoutId: string
  chefId: string
  amount: number
  stripeAccountId: string
}

export interface ReconciliationJobData {
  type: 'full' | 'incremental' | 'payment' | 'payout'
  paymentId?: string
  payoutId?: string
  startDate?: Date
  endDate?: Date
}

export interface RetryJobData {
  originalJobId: string
  queueName: QueueName
  jobData: any
  retryCount: number
  maxRetries: number
}

export interface CleanupJobData {
  type: 'expire_proposals' | 'clear_stale_bookings' | 'archive_old_events'
  olderThan?: Date
}

export interface WebhookJobData {
  eventId: string
  eventType: string
  payload: Record<string, any>
  timestamp: Date
  retryCount: number
}

// Queue instances
class QueueManager {
  private queues: Map<QueueName, Queue> = new Map()
  private redis: Redis

  constructor() {
    this.redis = getRedisConnection()
  }

  /**
   * Get or create a queue
   */
  getQueue(name: QueueName): Queue {
    if (!this.queues.has(name)) {
      const queue = new Queue(name, {
        connection: this.redis,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: {
            age: 3600, // Keep completed jobs for 1 hour
          },
          removeOnFail: false, // Keep failed jobs for debugging
        },
      })

      // Set up queue event listeners
      this.setupQueueEvents(name, queue)

      this.queues.set(name, queue)
    }

    return this.queues.get(name)!
  }

  /**
   * Set up event listeners for a queue
   */
  private setupQueueEvents(name: QueueName, queue: Queue) {
    const queueEvents = new QueueEvents(name, { connection: this.redis })

    queueEvents.on('completed', ({ jobId, returnvalue }) => {
      logger.info(`[QUEUE] Job completed`, {
        queue: name,
        jobId,
        result: returnvalue,
      })
    })

    queueEvents.on('failed', ({ jobId, failedReason }) => {
      logger.error(`[QUEUE] Job failed`, {
        queue: name,
        jobId,
        reason: failedReason,
      })
    })

    queueEvents.on('error', (error) => {
      logger.error(`[QUEUE] Queue error`, {
        queue: name,
        error: error.message,
      })
    })
  }

  /**
   * Add job to queue
   */
  async addJob<T>(
    queueName: QueueName,
    jobData: T,
    options?: {
      jobId?: string
      priority?: number
      delay?: number
      attempts?: number
    }
  ) {
    const queue = this.getQueue(queueName)

    try {
      const job = await queue.add(queueName, jobData, {
        jobId: options?.jobId,
        priority: options?.priority,
        delay: options?.delay,
        attempts: options?.attempts,
      })

      logger.info(`[QUEUE] Job added`, {
        queue: queueName,
        jobId: job.id,
      })

      return job
    } catch (error) {
      logger.error(`[QUEUE] Failed to add job`, {
        queue: queueName,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(queueName: QueueName, jobId: string) {
    const queue = this.getQueue(queueName)
    const job = await queue.getJob(jobId)

    if (!job) {
      return null
    }

    return {
      id: job.id,
      status: await job.getState(),
      progress: job.progress,
      attempts: job.attemptsMade,
      maxAttempts: job.opts.attempts,
      failedReason: job.failedReason,
      stacktrace: job.stacktrace,
      data: job.data,
    }
  }

  /**
   * Get queue stats
   */
  async getQueueStats(queueName: QueueName) {
    const queue = this.getQueue(queueName)
    const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed')

    return {
      queue: queueName,
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      completed: counts.completed ?? 0,
      failed: counts.failed ?? 0,
      delayed: counts.delayed ?? 0,
    }
  }

  /**
   * Get all queue stats
   */
  async getAllQueueStats() {
    const stats: Record<QueueName, any> = {} as any

    for (const queueName of Object.values(QUEUE_NAMES)) {
      stats[queueName as QueueName] = await this.getQueueStats(queueName as QueueName)
    }

    return stats
  }

  /**
   * Retry a failed job
   */
  async retryJob(queueName: QueueName, jobId: string) {
    const queue = this.getQueue(queueName)
    const job = await queue.getJob(jobId)

    if (!job) {
      throw new Error(`Job ${jobId} not found in queue ${queueName}`)
    }

    await job.retry()
    logger.info(`[QUEUE] Job retried`, { queue: queueName, jobId })
  }

  /**
   * Move job to dead-letter queue
   */
  async moveToDeadLetter(queueName: QueueName, jobId: string, reason: string) {
    const queue = this.getQueue(queueName)
    const job = await queue.getJob(jobId)

    if (!job) {
      throw new Error(`Job ${jobId} not found in queue ${queueName}`)
    }

    // Store in dead-letter queue
    const dlQueue = this.getQueue('retries' as QueueName)
    await dlQueue.add('dead-letter', {
      originalQueue: queueName,
      jobId,
      jobData: job.data,
      reason,
      timestamp: new Date(),
    })

    await job.remove()
    logger.warn(`[QUEUE] Job moved to dead-letter queue`, {
      queue: queueName,
      jobId,
      reason,
    })
  }

  /**
   * Close all queues
   */
  async close() {
    for (const queue of this.queues.values()) {
      await queue.close()
    }
    await this.redis.quit()
  }
}

// Singleton instance
let queueManager: QueueManager | null = null

export function getQueueManager(): QueueManager {
  if (!queueManager) {
    queueManager = new QueueManager()
  }
  return queueManager
}

// Export convenience functions
export async function addPaymentJob(data: PaymentJobData) {
  return getQueueManager().addJob(QUEUE_NAMES.PAYMENTS, data, {
    jobId: data.idempotencyKey,
    priority: 10, // High priority
  })
}

export async function addNotificationJob(data: NotificationJobData) {
  return getQueueManager().addJob(QUEUE_NAMES.NOTIFICATIONS, data)
}

export async function addPayoutJob(data: PayoutJobData) {
  return getQueueManager().addJob(QUEUE_NAMES.PAYOUTS, data, {
    priority: 8,
  })
}

export async function addReconciliationJob(data: ReconciliationJobData) {
  return getQueueManager().addJob(QUEUE_NAMES.RECONCILIATION, data, {
    priority: 5,
  })
}

export async function addCleanupJob(data: CleanupJobData) {
  return getQueueManager().addJob(QUEUE_NAMES.CLEANUP, data, {
    delay: 60000, // Delay 1 minute
  })
}

export async function addWebhookJob(data: WebhookJobData) {
  return getQueueManager().addJob(QUEUE_NAMES.WEBHOOKS, data, {
    jobId: data.eventId,
    priority: 9, // High priority
  })
}
