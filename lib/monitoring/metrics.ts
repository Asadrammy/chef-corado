/**
 * Metrics Collection and Tracking
 * 
 * Tracks:
 * - API latency
 * - Queue failures
 * - Payment failures
 * - Webhook issues
 * - System health
 */

export interface Metric {
  name: string
  value: number
  unit: string
  timestamp: Date
  tags?: Record<string, string>
}

class MetricsCollector {
  private metrics: Metric[] = []
  private counters: Map<string, number> = new Map()
  private histograms: Map<string, number[]> = new Map()

  /**
   * Record a metric
   */
  recordMetric(metric: Metric): void {
    this.metrics.push(metric)

    // Send to monitoring service if configured
    if (process.env.DATADOG_API_KEY || process.env.PROMETHEUS_PUSHGATEWAY) {
      this.sendMetric(metric)
    }
  }

  /**
   * Increment a counter
   */
  incrementCounter(name: string, value: number = 1, tags?: Record<string, string>): void {
    const key = this.getKey(name, tags)
    this.counters.set(key, (this.counters.get(key) || 0) + value)

    this.recordMetric({
      name,
      value: this.counters.get(key)!,
      unit: 'count',
      timestamp: new Date(),
      tags,
    })
  }

  /**
   * Record a histogram value (latency, duration, etc.)
   */
  recordHistogram(name: string, value: number, tags?: Record<string, string>): void {
    const key = this.getKey(name, tags)
    if (!this.histograms.has(key)) {
      this.histograms.set(key, [])
    }
    this.histograms.get(key)!.push(value)

    this.recordMetric({
      name,
      value,
      unit: 'ms',
      timestamp: new Date(),
      tags,
    })
  }

  /**
   * Get counter value
   */
  getCounter(name: string, tags?: Record<string, string>): number {
    const key = this.getKey(name, tags)
    return this.counters.get(key) || 0
  }

  /**
   * Get histogram statistics
   */
  getHistogramStats(name: string, tags?: Record<string, string>): HistogramStats | null {
    const key = this.getKey(name, tags)
    const values = this.histograms.get(key)

    if (!values || values.length === 0) {
      return null
    }

    const sorted = [...values].sort((a, b) => a - b)
    const sum = values.reduce((a, b) => a + b, 0)
    const avg = sum / values.length

    return {
      count: values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    }
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Metric[] {
    return [...this.metrics]
  }

  /**
   * Clear old metrics (keep last 1 hour)
   */
  cleanup(): void {
    const oneHourAgo = new Date(Date.now() - 3600000)
    this.metrics = this.metrics.filter((m) => m.timestamp > oneHourAgo)
  }

  /**
   * Send metric to monitoring service
   */
  private sendMetric(metric: Metric): void {
    // TODO: Implement integration with Datadog, Prometheus, or similar
    // Example for Datadog:
    // const dogapi = require("dogapi")
    // dogapi.metric.send(metric.name, metric.value, {
    //   tags: Object.entries(metric.tags || {}).map(([k, v]) => `${k}:${v}`),
    //   timestamp: Math.floor(metric.timestamp.getTime() / 1000)
    // })
  }

  private getKey(name: string, tags?: Record<string, string>): string {
    if (!tags || Object.keys(tags).length === 0) {
      return name
    }
    const tagStr = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join(',')
    return `${name}[${tagStr}]`
  }
}

export interface HistogramStats {
  count: number
  min: number
  max: number
  avg: number
  p50: number
  p95: number
  p99: number
}

// Singleton instance
export const metrics = new MetricsCollector()

/**
 * Middleware to track API latency
 */
export function metricsMiddleware(req: any, res: any, next: any): void {
  const startTime = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - startTime
    const path = req.path || req.url
    const method = req.method

    metrics.recordHistogram('api.latency', duration, {
      method,
      path,
      status: String(res.statusCode),
    })

    if (res.statusCode >= 400) {
      metrics.incrementCounter('api.errors', 1, {
        method,
        path,
        status: String(res.statusCode),
      })
    }
  })

  next()
}

/**
 * Track payment metrics
 */
export function trackPaymentMetric(
  event: 'capture' | 'refund' | 'payout' | 'failure',
  amount: number,
  metadata?: Record<string, string>
): void {
  metrics.incrementCounter(`payment.${event}`, 1, metadata)
  metrics.recordHistogram(`payment.${event}.amount`, amount, metadata)
}

/**
 * Track queue metrics
 */
export function trackQueueMetric(
  queueName: string,
  event: 'added' | 'completed' | 'failed',
  duration?: number
): void {
  metrics.incrementCounter(`queue.${event}`, 1, { queue: queueName })

  if (duration) {
    metrics.recordHistogram(`queue.${event}.duration`, duration, { queue: queueName })
  }
}

/**
 * Track webhook metrics
 */
export function trackWebhookMetric(
  eventType: string,
  status: 'success' | 'failure' | 'retry',
  duration?: number
): void {
  metrics.incrementCounter(`webhook.${status}`, 1, { type: eventType })

  if (duration) {
    metrics.recordHistogram(`webhook.${status}.duration`, duration, { type: eventType })
  }
}

/**
 * Track database metrics
 */
export function trackDatabaseMetric(
  operation: string,
  duration: number,
  success: boolean
): void {
  metrics.recordHistogram(`db.${operation}.duration`, duration, {
    status: success ? 'success' : 'failure',
  })

  if (!success) {
    metrics.incrementCounter('db.errors', 1, { operation })
  }
}

/**
 * Get health metrics
 */
export function getHealthMetrics(): {
  apiErrors: number
  paymentFailures: number
  queueFailures: number
  webhookFailures: number
  avgApiLatency: number
} {
  return {
    apiErrors: metrics.getCounter('api.errors') || 0,
    paymentFailures: metrics.getCounter('payment.failure') || 0,
    queueFailures: metrics.getCounter('queue.failed') || 0,
    webhookFailures: metrics.getCounter('webhook.failure') || 0,
    avgApiLatency: metrics.getHistogramStats('api.latency')?.avg || 0,
  }
}
