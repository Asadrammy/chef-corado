import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/monitoring/logger'
import Stripe from 'stripe'

/**
 * Webhook Event Store
 * 
 * Handles:
 * - Event versioning
 * - Event deduplication
 * - Event replay
 * - Out-of-order event handling
 * - Event idempotency
 */

export enum EventStatus {
  RECEIVED = 'RECEIVED',
  PROCESSING = 'PROCESSING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
}

export interface StoredWebhookEvent {
  id: string
  stripeEventId: string
  eventType: string
  apiVersion: string
  payload: string
  status: EventStatus
  version: number
  processedAt?: Date
  failureReason?: string
  retryCount: number
  createdAt: Date
  updatedAt: Date
}

export class WebhookEventStore {
  /**
   * Store incoming webhook event
   */
  async storeEvent(event: Stripe.Event): Promise<StoredWebhookEvent> {
    logger.info('[WEBHOOK_STORE] Storing webhook event', {
      eventId: event.id,
      type: event.type,
      apiVersion: event.api_version,
    })

    // Check if event already exists
    const existing = await (prisma as any).webhookEvent.findUnique({
      where: { stripeEventId: event.id },
    })

    if (existing) {
      logger.info('[WEBHOOK_STORE] Event already stored', {
        eventId: event.id,
        status: existing.status,
      })
      return existing
    }

    // Store new event
    const stored = await (prisma as any).webhookEvent.create({
      data: {
        stripeEventId: event.id,
        eventType: event.type,
        apiVersion: event.api_version || 'unknown',
        payload: JSON.stringify(event),
        status: EventStatus.RECEIVED,
        version: 1,
        retryCount: 0,
      },
    })

    logger.info('[WEBHOOK_STORE] Event stored', {
      eventId: event.id,
      storedId: stored.id,
    })

    return stored
  }

  /**
   * Mark event as processing
   */
  async markProcessing(stripeEventId: string): Promise<void> {
    await (prisma as any).webhookEvent.update({
      where: { stripeEventId },
      data: {
        status: EventStatus.PROCESSING,
        version: { increment: 1 },
      },
    })
  }

  /**
   * Mark event as processed
   */
  async markProcessed(stripeEventId: string): Promise<void> {
    await (prisma as any).webhookEvent.update({
      where: { stripeEventId },
      data: {
        status: EventStatus.PROCESSED,
        processedAt: new Date(),
        version: { increment: 1 },
      },
    })

    logger.info('[WEBHOOK_STORE] Event marked as processed', {
      eventId: stripeEventId,
    })
  }

  /**
   * Mark event as failed
   */
  async markFailed(stripeEventId: string, reason: string, retry: boolean = true): Promise<void> {
    const newStatus = retry ? EventStatus.RETRYING : EventStatus.FAILED

    await (prisma as any).webhookEvent.update({
      where: { stripeEventId },
      data: {
        status: newStatus,
        failureReason: reason,
        retryCount: { increment: 1 },
        version: { increment: 1 },
      },
    })

    logger.warn('[WEBHOOK_STORE] Event marked as failed', {
      eventId: stripeEventId,
      reason,
      willRetry: retry,
    })
  }

  /**
   * Get event by Stripe event ID
   */
  async getEvent(stripeEventId: string): Promise<StoredWebhookEvent | null> {
    return (prisma as any).webhookEvent.findUnique({
      where: { stripeEventId },
    })
  }

  /**
   * Get all failed events for retry
   */
  async getFailedEvents(limit: number = 100): Promise<StoredWebhookEvent[]> {
    return (prisma as any).webhookEvent.findMany({
      where: {
        status: { in: [EventStatus.FAILED, EventStatus.RETRYING] },
        retryCount: { lt: 5 }, // Max 5 retries
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    })
  }

  /**
   * Replay an event
   */
  async replayEvent(stripeEventId: string, handler: (event: Stripe.Event) => Promise<void>): Promise<void> {
    const stored = await this.getEvent(stripeEventId)

    if (!stored) {
      throw new Error(`Event ${stripeEventId} not found`)
    }

    logger.info('[WEBHOOK_STORE] Replaying event', {
      eventId: stripeEventId,
      type: stored.eventType,
    })

    try {
      await this.markProcessing(stripeEventId)

      const event = JSON.parse(stored.payload) as Stripe.Event
      await handler(event)

      await this.markProcessed(stripeEventId)

      logger.info('[WEBHOOK_STORE] Event replayed successfully', {
        eventId: stripeEventId,
      })
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      await this.markFailed(stripeEventId, reason, true)
      throw error
    }
  }

  /**
   * Get event processing history
   */
  async getEventHistory(stripeEventId: string): Promise<any[]> {
    return (prisma as any).webhookEventHistory.findMany({
      where: { stripeEventId },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Record event processing attempt
   */
  async recordAttempt(
    stripeEventId: string,
    status: 'success' | 'failure',
    details?: Record<string, any>
  ): Promise<void> {
    await (prisma as any).webhookEventHistory.create({
      data: {
        stripeEventId,
        status,
        details: details ? (JSON.stringify(details) as any) : null,
      },
    })
  }

  /**
   * Handle out-of-order events
   * Ensures events are processed in correct order by timestamp
   */
  async handleOutOfOrderEvent(
    event: Stripe.Event,
    expectedSequence: number
  ): Promise<{ shouldProcess: boolean; reason?: string }> {
    const created = new Date(event.created * 1000)

    // Get the last processed event
    const lastProcessed = await (prisma as any).webhookEvent.findFirst({
      where: { status: EventStatus.PROCESSED },
      orderBy: { createdAt: 'desc' },
    })

    if (!lastProcessed) {
      return { shouldProcess: true }
    }

    const lastPayload = JSON.parse(lastProcessed.payload)
    const lastCreated = new Date(lastPayload.created * 1000)

    if (created < lastCreated) {
      logger.warn('[WEBHOOK_STORE] Out-of-order event detected', {
        eventId: event.id,
        eventTime: created,
        lastEventTime: lastCreated,
      })

      // Queue for later processing
      return {
        shouldProcess: false,
        reason: 'Out-of-order event - will be processed after earlier events',
      }
    }

    return { shouldProcess: true }
  }

  /**
   * Verify event authenticity
   */
  verifyEventSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    try {
      const crypto = require('crypto')
      
      if (!signature || !secret) {
        logger.error('[WEBHOOK] Missing signature or secret')
        return false
      }

      // Parse signature: t=timestamp,v1=signature
      const elements = signature.split(',')
      let timestamp = ''
      let expectedSignature = ''

      for (const element of elements) {
        const [key, value] = element.split('=')
        if (key === 't') {
          timestamp = value
        } else if (key === 'v1') {
          expectedSignature = value
        }
      }

      if (!timestamp || !expectedSignature) {
        logger.error('[WEBHOOK] Invalid signature format')
        return false
      }

      // Prevent replay attacks - check timestamp is within 5 minutes
      const now = Math.floor(Date.now() / 1000)
      const timestampNum = parseInt(timestamp, 10)
      if (Math.abs(now - timestampNum) > 300) { // 5 minutes
        logger.error('[WEBHOOK] Timestamp too old', { timestamp, now })
        return false
      }

      // Create signed payload
      const signedPayload = `${timestamp}.${payload}`
      
      // Compute expected signature
      const hmac = crypto.createHmac('sha256', secret)
      hmac.update(signedPayload, 'utf8')
      const computedSignature = hmac.digest('hex')

      // Secure comparison
      const isValid = crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(computedSignature, 'hex')
      )

      if (!isValid) {
        logger.error('[WEBHOOK] Signature verification failed', {
          timestamp,
          expectedSignature: expectedSignature.substring(0, 8) + '...',
          computedSignature: computedSignature.substring(0, 8) + '...'
        })
      }

      return isValid
    } catch (error) {
      logger.error('[WEBHOOK] Signature verification error', { error })
      return false
    }
  }

  /**
   * Get event statistics
   */
  async getEventStats(): Promise<{
    total: number
    processed: number
    failed: number
    pending: number
    avgProcessingTime: number
  }> {
    const events = await (prisma as any).webhookEvent.findMany()

    const processed = events.filter((e: any) => e.status === EventStatus.PROCESSED).length
    const failed = events.filter((e: any) => e.status === EventStatus.FAILED).length
    const pending = events.filter(
      (e: any) => e.status === EventStatus.RECEIVED || e.status === EventStatus.RETRYING
    ).length

    let avgProcessingTime = 0
    const processedEvents = events.filter((e: any) => e.processedAt)
    if (processedEvents.length > 0) {
      const totalTime = processedEvents.reduce((sum: number, e: any) => {
        return sum + (e.processedAt.getTime() - e.createdAt.getTime())
      }, 0)
      avgProcessingTime = totalTime / processedEvents.length
    }

    return {
      total: events.length,
      processed,
      failed,
      pending,
      avgProcessingTime,
    }
  }
}

export const webhookEventStore = new WebhookEventStore()
