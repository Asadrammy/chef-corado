/**
 * Financial Event Monitoring
 * 
 * Logs critical financial events for monitoring and alerting
 * Provides hooks for external monitoring systems
 */

import { logger } from '@/lib/logger'

export interface FinancialEvent {
  type: 'PAYMENT_SUCCESS' | 'PAYMENT_FAILED' | 'REFUND_PROCESSED' | 'REFUND_FAILED' | 'PAYOUT_RELEASED' | 'PAYOUT_FAILED' | 'WEBHOOK_PROCESSED' | 'WEBHOOK_FAILED' | 'LEDGER_ERROR'
  timestamp: Date
  amount?: number
  currency?: string
  paymentId?: string
  refundId?: string
  payoutId?: string
  bookingId?: string
  userId?: string
  chefId?: string
  clientId?: string
  stripeEventId?: string
  stripeTransferId?: string
  error?: string
  metadata?: Record<string, any>
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

export class FinancialMonitor {
  private static instance: FinancialMonitor
  private eventQueue: FinancialEvent[] = []
  private batchSize = 50
  private flushInterval = 30000 // 30 seconds

  private constructor() {
    // Start periodic flush
    this.startPeriodicFlush()
  }

  static getInstance(): FinancialMonitor {
    if (!FinancialMonitor.instance) {
      FinancialMonitor.instance = new FinancialMonitor()
    }
    return FinancialMonitor.instance
  }

  /**
   * Log a payment success event
   */
  logPaymentSuccess(data: {
    paymentId: string
    bookingId: string
    amount: number
    currency: string
    userId: string
    chefId?: string
    clientId?: string
    metadata?: Record<string, any>
  }) {
    const event: FinancialEvent = {
      type: 'PAYMENT_SUCCESS',
      timestamp: new Date(),
      amount: data.amount,
      currency: data.currency,
      paymentId: data.paymentId,
      bookingId: data.bookingId,
      userId: data.userId,
      chefId: data.chefId,
      clientId: data.clientId,
      metadata: data.metadata,
      severity: 'MEDIUM'
    }

    this.logEvent(event)
  }

  /**
   * Log a payment failure event
   */
  logPaymentFailure(data: {
    paymentId?: string
    bookingId?: string
    error: string
    userId?: string
    stripeEventId?: string
    metadata?: Record<string, any>
  }) {
    const event: FinancialEvent = {
      type: 'PAYMENT_FAILED',
      timestamp: new Date(),
      paymentId: data.paymentId,
      bookingId: data.bookingId,
      userId: data.userId,
      stripeEventId: data.stripeEventId,
      error: data.error,
      metadata: data.metadata,
      severity: 'HIGH'
    }

    this.logEvent(event)
  }

  /**
   * Log a refund processed event
   */
  logRefundProcessed(data: {
    refundId: string
    paymentId: string
    amount: number
    currency: string
    bookingId: string
    userId: string
    reason: string
    metadata?: Record<string, any>
  }) {
    const event: FinancialEvent = {
      type: 'REFUND_PROCESSED',
      timestamp: new Date(),
      amount: data.amount,
      currency: data.currency,
      refundId: data.refundId,
      paymentId: data.paymentId,
      bookingId: data.bookingId,
      userId: data.userId,
      metadata: { ...data.metadata, reason: data.reason },
      severity: 'MEDIUM'
    }

    this.logEvent(event)
  }

  /**
   * Log a refund failure event
   */
  logRefundFailure(data: {
    refundId: string
    paymentId: string
    error: string
    userId?: string
    metadata?: Record<string, any>
  }) {
    const event: FinancialEvent = {
      type: 'REFUND_FAILED',
      timestamp: new Date(),
      refundId: data.refundId,
      paymentId: data.paymentId,
      userId: data.userId,
      error: data.error,
      metadata: data.metadata,
      severity: 'HIGH'
    }

    this.logEvent(event)
  }

  /**
   * Log a payout released event
   */
  logPayoutReleased(data: {
    payoutId: string
    amount: number
    currency: string
    chefId: string
    userId: string
    stripeTransferId?: string
    metadata?: Record<string, any>
  }) {
    const event: FinancialEvent = {
      type: 'PAYOUT_RELEASED',
      timestamp: new Date(),
      amount: data.amount,
      currency: data.currency,
      payoutId: data.payoutId,
      chefId: data.chefId,
      userId: data.userId,
      stripeTransferId: data.stripeTransferId,
      metadata: data.metadata,
      severity: 'LOW'
    }

    this.logEvent(event)
  }

  /**
   * Log a payout failure event
   */
  logPayoutFailure(data: {
    payoutId: string
    chefId: string
    error: string
    userId?: string
    metadata?: Record<string, any>
  }) {
    const event: FinancialEvent = {
      type: 'PAYOUT_FAILED',
      timestamp: new Date(),
      payoutId: data.payoutId,
      chefId: data.chefId,
      userId: data.userId,
      error: data.error,
      metadata: data.metadata,
      severity: 'HIGH'
    }

    this.logEvent(event)
  }

  /**
   * Log a webhook processed event
   */
  logWebhookProcessed(data: {
    stripeEventId: string
    eventType: string
    paymentId?: string
    metadata?: Record<string, any>
  }) {
    const event: FinancialEvent = {
      type: 'WEBHOOK_PROCESSED',
      timestamp: new Date(),
      stripeEventId: data.stripeEventId,
      paymentId: data.paymentId,
      metadata: { ...data.metadata, eventType: data.eventType },
      severity: 'LOW'
    }

    this.logEvent(event)
  }

  /**
   * Log a webhook failure event
   */
  logWebhookFailure(data: {
    stripeEventId: string
    eventType: string
    error: string
    metadata?: Record<string, any>
  }) {
    const event: FinancialEvent = {
      type: 'WEBHOOK_FAILED',
      timestamp: new Date(),
      stripeEventId: data.stripeEventId,
      error: data.error,
      metadata: { ...data.metadata, eventType: data.eventType },
      severity: 'MEDIUM'
    }

    this.logEvent(event)
  }

  /**
   * Log a ledger error event (CRITICAL)
   */
  logLedgerError(data: {
    transactionType: string
    amount?: number
    error: string
    paymentId?: string
    refundId?: string
    payoutId?: string
    bookingId?: string
    metadata?: Record<string, any>
  }) {
    const event: FinancialEvent = {
      type: 'LEDGER_ERROR',
      timestamp: new Date(),
      amount: data.amount,
      paymentId: data.paymentId,
      refundId: data.refundId,
      payoutId: data.payoutId,
      bookingId: data.bookingId,
      error: data.error,
      metadata: { ...data.metadata, transactionType: data.transactionType },
      severity: 'CRITICAL'
    }

    this.logEvent(event)
    
    // Immediate alert for ledger errors
    this.sendAlert(event)
  }

  /**
   * Add event to queue and potentially flush
   */
  private logEvent(event: FinancialEvent) {
    this.eventQueue.push(event)

    // Immediate flush for critical events
    if (event.severity === 'CRITICAL') {
      this.flushEvents()
    }

    // Flush if queue is getting full
    if (this.eventQueue.length >= this.batchSize) {
      this.flushEvents()
    }
  }

  /**
   * Flush events to logging system
   */
  private flushEvents() {
    if (this.eventQueue.length === 0) return

    const events = [...this.eventQueue]
    this.eventQueue = []

    for (const event of events) {
      const logMessage = this.formatLogMessage(event)
      
      switch (event.severity) {
        case 'CRITICAL':
          logger.error(`[FINANCIAL_CRITICAL] ${logMessage}`, event)
          break
        case 'HIGH':
          logger.warn(`[FINANCIAL_HIGH] ${logMessage}`, event)
          break
        case 'MEDIUM':
          logger.info(`[FINANCIAL_MEDIUM] ${logMessage}`, event)
          break
        case 'LOW':
          logger.debug(`[FINANCIAL_LOW] ${logMessage}`, event)
          break
      }
    }

    // Send alerts for high/critical events
    const alertEvents = events.filter(e => e.severity === 'HIGH' || e.severity === 'CRITICAL')
    for (const event of alertEvents) {
      this.sendAlert(event)
    }
  }

  /**
   * Format event for logging
   */
  private formatLogMessage(event: FinancialEvent): string {
    const parts = [
      event.type,
      event.amount ? `$${event.amount}` : '',
      event.paymentId || event.refundId || event.payoutId || '',
      event.bookingId || '',
      event.error || ''
    ].filter(Boolean)

    return parts.join(' - ')
  }

  /**
   * Send alert to external monitoring system
   */
  private sendAlert(event: FinancialEvent) {
    // TODO: Integrate with external monitoring systems
    // - Sentry
    // - PagerDuty
    // - Slack
    // - Custom webhook
    
    logger.warn('[ALERT] Financial event requires attention', {
      type: event.type,
      severity: event.severity,
      error: event.error,
      timestamp: event.timestamp
    })
  }

  /**
   * Start periodic flush
   */
  private startPeriodicFlush() {
    if (typeof setInterval !== 'undefined') {
      const interval = setInterval(() => {
        this.flushEvents()
      }, this.flushInterval)
      interval.unref?.()
    }
  }

  /**
   * Get monitoring statistics
   */
  getStats() {
    return {
      queueSize: this.eventQueue.length,
      batchSize: this.batchSize,
      flushInterval: this.flushInterval
    }
  }
}

// Export singleton instance
export const financialMonitor = FinancialMonitor.getInstance()

// Export convenience functions
export const logPaymentSuccess = (data: Parameters<FinancialMonitor['logPaymentSuccess']>[0]) => 
  financialMonitor.logPaymentSuccess(data)

export const logPaymentFailure = (data: Parameters<FinancialMonitor['logPaymentFailure']>[0]) => 
  financialMonitor.logPaymentFailure(data)

export const logRefundProcessed = (data: Parameters<FinancialMonitor['logRefundProcessed']>[0]) => 
  financialMonitor.logRefundProcessed(data)

export const logRefundFailure = (data: Parameters<FinancialMonitor['logRefundFailure']>[0]) => 
  financialMonitor.logRefundFailure(data)

export const logPayoutReleased = (data: Parameters<FinancialMonitor['logPayoutReleased']>[0]) => 
  financialMonitor.logPayoutReleased(data)

export const logPayoutFailure = (data: Parameters<FinancialMonitor['logPayoutFailure']>[0]) => 
  financialMonitor.logPayoutFailure(data)

export const logWebhookProcessed = (data: Parameters<FinancialMonitor['logWebhookProcessed']>[0]) => 
  financialMonitor.logWebhookProcessed(data)

export const logWebhookFailure = (data: Parameters<FinancialMonitor['logWebhookFailure']>[0]) => 
  financialMonitor.logWebhookFailure(data)

export const logLedgerError = (data: Parameters<FinancialMonitor['logLedgerError']>[0]) => 
  financialMonitor.logLedgerError(data)
