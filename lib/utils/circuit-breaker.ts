/**
 * Circuit Breaker Pattern Implementation
 * 
 * Prevents cascading failures when external services (Stripe) are down
 * Implements retry logic with exponential backoff
 */

export interface CircuitBreakerConfig {
  failureThreshold: number
  resetTimeout: number
  monitoringPeriod: number
  maxRetries: number
  baseDelay: number
  maxDelay: number
}

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Circuit is open, fail fast
  HALF_OPEN = 'HALF_OPEN' // Testing if service has recovered
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED
  private failures = 0
  private lastFailureTime = 0
  private successCount = 0

  constructor(
    private config: CircuitBreakerConfig,
    private serviceName: string
  ) {}

  async execute<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN
        this.successCount = 0
      } else {
        throw new Error(`Circuit breaker is OPEN for ${this.serviceName}`)
      }
    }

    let lastError: Error | null = null
    
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const result = await operation()
        
        // Success - reset failure count and close circuit if needed
        this.onSuccess()
        return result
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        
        if (attempt < this.config.maxRetries) {
          const delay = this.calculateDelay(attempt)
          console.warn(`[CIRCUIT_BREAKER] ${this.serviceName} failed, retry ${attempt + 1}/${this.config.maxRetries} in ${delay}ms`, {
            error: lastError.message,
            context
          })
          await this.sleep(delay)
        }
      }
    }

    // All retries failed
    this.onFailure()
    throw lastError || new Error(`Operation failed after ${this.config.maxRetries} retries`)
  }

  private onSuccess(): void {
    this.failures = 0
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++
      if (this.successCount >= 3) { // Need 3 consecutive successes to close
        this.state = CircuitState.CLOSED
        console.info(`[CIRCUIT_BREAKER] ${this.serviceName} circuit closed after recovery`)
      }
    }
  }

  private onFailure(): void {
    this.failures++
    this.lastFailureTime = Date.now()

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN
      console.warn(`[CIRCUIT_BREAKER] ${this.serviceName} circuit opened after half-open failure`)
    } else if (this.failures >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN
      console.warn(`[CIRCUIT_BREAKER] ${this.serviceName} circuit opened after ${this.failures} failures`)
    }
  }

  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastFailureTime > this.config.resetTimeout
  }

  private calculateDelay(attempt: number): number {
    const delay = Math.min(
      this.config.baseDelay * Math.pow(2, attempt),
      this.config.maxDelay
    )
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  getState(): CircuitState {
    return this.state
  }

  getStats() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
      successCount: this.successCount
    }
  }
}

// Circuit breaker configurations for different services
export const circuitBreakerConfigs = {
  stripe: {
    failureThreshold: 5,      // Open after 5 failures
    resetTimeout: 60000,      // Try to reset after 1 minute
    monitoringPeriod: 30000,  // Monitor for 30 seconds
    maxRetries: 3,           // Max 3 retries per request
    baseDelay: 1000,         // Start with 1 second delay
    maxDelay: 10000          // Max 10 seconds delay
  },
  
  database: {
    failureThreshold: 3,
    resetTimeout: 30000,
    monitoringPeriod: 15000,
    maxRetries: 2,
    baseDelay: 500,
    maxDelay: 5000
  },

  externalAPI: {
    failureThreshold: 10,
    resetTimeout: 120000,
    monitoringPeriod: 60000,
    maxRetries: 5,
    baseDelay: 2000,
    maxDelay: 30000
  }
}

// Circuit breaker instances
export const circuitBreakers = {
  stripe: new CircuitBreaker(circuitBreakerConfigs.stripe, 'Stripe'),
  database: new CircuitBreaker(circuitBreakerConfigs.database, 'Database'),
  externalAPI: new CircuitBreaker(circuitBreakerConfigs.externalAPI, 'ExternalAPI')
}

/**
 * Wrapper function to execute operations with circuit breaker protection
 */
export async function withCircuitBreaker<T>(
  serviceName: keyof typeof circuitBreakers,
  operation: () => Promise<T>,
  context?: string
): Promise<T> {
  const circuitBreaker = circuitBreakers[serviceName]
  return circuitBreaker.execute(operation, context)
}
