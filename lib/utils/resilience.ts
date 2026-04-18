import { logger } from '@/lib/monitoring/logger'

/**
 * Failure-Resilient Workflow Utilities
 * 
 * Provides:
 * - Retry with exponential backoff
 * - Idempotency checking
 * - Transaction recovery
 * - Circuit breaker pattern
 */

export interface RetryOptions {
  maxAttempts?: number
  initialDelayMs?: number
  maxDelayMs?: number
  backoffMultiplier?: number
  timeoutMs?: number
}

export interface CircuitBreakerOptions {
  failureThreshold?: number
  successThreshold?: number
  timeout?: number
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  context: string,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    backoffMultiplier = 2,
    timeoutMs = 30000,
  } = options

  let lastError: Error | null = null
  let delay = initialDelayMs

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      logger.debug(`[RETRY] Attempt ${attempt}/${maxAttempts}`, { context })

      // Execute with timeout
      const result = await Promise.race([
        fn(),
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)
        ),
      ])

      logger.info(`[RETRY] Success on attempt ${attempt}`, { context })
      return result
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt === maxAttempts) {
        logger.error(`[RETRY] Failed after ${maxAttempts} attempts`, {
          context,
          error: lastError.message,
        })
        throw lastError
      }

      // Check if error is retryable
      if (!isRetryableError(lastError)) {
        logger.error(`[RETRY] Non-retryable error`, {
          context,
          error: lastError.message,
        })
        throw lastError
      }

      logger.warn(`[RETRY] Attempt ${attempt} failed, retrying in ${delay}ms`, {
        context,
        error: lastError.message,
      })

      // Wait before retry
      await sleep(delay)
      delay = Math.min(delay * backoffMultiplier, maxDelayMs)
    }
  }

  throw lastError || new Error('Retry failed')
}

/**
 * Wrap operation with idempotency checking
 */
export async function withIdempotency<T>(
  fn: () => Promise<T>,
  idempotencyKey: string,
  context: string,
  storage: IdempotencyStorage
): Promise<T> {
  logger.debug(`[IDEMPOTENCY] Checking key`, { context, idempotencyKey })

  // Check if already processed
  const cached = await storage.get(idempotencyKey)
  if (cached) {
    logger.info(`[IDEMPOTENCY] Cache hit`, { context, idempotencyKey })
    return cached as T
  }

  try {
    // Execute operation
    const result = await fn()

    // Cache result
    await storage.set(idempotencyKey, result, 86400) // 24 hour TTL

    logger.info(`[IDEMPOTENCY] Operation completed and cached`, {
      context,
      idempotencyKey,
    })

    return result
  } catch (error) {
    logger.error(`[IDEMPOTENCY] Operation failed`, {
      context,
      idempotencyKey,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

/**
 * Wrap transaction with recovery capability
 */
export async function withTransactionRecovery<T>(
  fn: (tx: any) => Promise<T>,
  context: string,
  prisma: any,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.debug(`[RECOVERY] Transaction attempt ${attempt}/${maxRetries}`, { context })

      const result = await prisma.$transaction(fn, {
        timeout: 30000,
        maxWait: 5000,
      })

      logger.info(`[RECOVERY] Transaction succeeded`, { context })
      return result
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Check if error is retryable
      if (!isTransactionRetryable(lastError)) {
        logger.error(`[RECOVERY] Non-retryable transaction error`, {
          context,
          error: lastError.message,
        })
        throw lastError
      }

      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000)
        logger.warn(`[RECOVERY] Transaction failed, retrying in ${delay}ms`, {
          context,
          error: lastError.message,
          attempt,
        })
        await sleep(delay)
      }
    }
  }

  logger.error(`[RECOVERY] Transaction failed after ${maxRetries} attempts`, {
    context,
    error: lastError?.message,
  })

  throw lastError || new Error('Transaction recovery failed')
}

/**
 * Circuit breaker pattern
 */
export class CircuitBreaker {
  private failureCount = 0
  private successCount = 0
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'
  private lastFailureTime: number | null = null

  constructor(
    private name: string,
    private options: CircuitBreakerOptions = {}
  ) {
    this.options = {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000,
      ...options,
    }
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      // Check if timeout has passed
      if (
        this.lastFailureTime &&
        Date.now() - this.lastFailureTime > (this.options.timeout || 60000)
      ) {
        logger.info(`[CIRCUIT_BREAKER] Transitioning to HALF_OPEN`, { name: this.name })
        this.state = 'HALF_OPEN'
        this.successCount = 0
      } else {
        throw new Error(`Circuit breaker ${this.name} is OPEN`)
      }
    }

    try {
      const result = await fn()

      if (this.state === 'HALF_OPEN') {
        this.successCount++
        if (this.successCount >= (this.options.successThreshold || 2)) {
          logger.info(`[CIRCUIT_BREAKER] Transitioning to CLOSED`, { name: this.name })
          this.state = 'CLOSED'
          this.failureCount = 0
          this.successCount = 0
        }
      } else if (this.state === 'CLOSED') {
        this.failureCount = 0
      }

      return result
    } catch (error) {
      this.failureCount++
      this.lastFailureTime = Date.now()

      if (this.failureCount >= (this.options.failureThreshold || 5)) {
        logger.warn(`[CIRCUIT_BREAKER] Transitioning to OPEN`, {
          name: this.name,
          failures: this.failureCount,
        })
        this.state = 'OPEN'
      }

      throw error
    }
  }

  getState(): string {
    return this.state
  }

  reset(): void {
    this.state = 'CLOSED'
    this.failureCount = 0
    this.successCount = 0
    this.lastFailureTime = null
  }
}

/**
 * Idempotency storage interface
 */
export interface IdempotencyStorage {
  get(key: string): Promise<any | null>
  set(key: string, value: any, ttlSeconds: number): Promise<void>
  delete(key: string): Promise<void>
}

/**
 * In-memory idempotency storage (development)
 */
export class InMemoryIdempotencyStorage implements IdempotencyStorage {
  private store = new Map<string, { value: any; expiresAt: number }>()

  async get(key: string): Promise<any | null> {
    const entry = this.store.get(key)
    if (!entry) return null

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }

    return entry.value
  }

  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    })
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key)
  }
}

/**
 * Redis idempotency storage (production)
 */
export class RedisIdempotencyStorage implements IdempotencyStorage {
  constructor(private redis: any) {}

  async get(key: string): Promise<any | null> {
    const value = await this.redis.get(key)
    return value ? JSON.parse(value) : null
  }

  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    await this.redis.setex(key, ttlSeconds, JSON.stringify(value))
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key)
  }
}

/**
 * Determine if error is retryable
 */
function isRetryableError(error: Error): boolean {
  const nonRetryablePatterns = [
    'not found',
    'invalid',
    'unauthorized',
    'forbidden',
    'validation',
    'bad request',
  ]

  const message = error.message.toLowerCase()
  return !nonRetryablePatterns.some((pattern) => message.includes(pattern))
}

/**
 * Determine if transaction error is retryable
 */
function isTransactionRetryable(error: Error): boolean {
  const retryablePatterns = [
    'deadlock',
    'timeout',
    'connection',
    'serialization',
    'concurrent',
  ]

  const message = error.message.toLowerCase()
  return retryablePatterns.some((pattern) => message.includes(pattern))
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Export circuit breaker instances for critical services
export const stripeCircuitBreaker = new CircuitBreaker('stripe', {
  failureThreshold: 3,
  successThreshold: 2,
  timeout: 30000,
})

export const databaseCircuitBreaker = new CircuitBreaker('database', {
  failureThreshold: 5,
  successThreshold: 3,
  timeout: 60000,
})
