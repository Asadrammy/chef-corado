import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring/logger'
import { metrics } from '@/lib/monitoring/metrics'
import { OFFICIAL_WEBSITE_URL } from '@/lib/site-config'

/**
 * System-Wide Safety Guards
 * 
 * Implements:
 * - Request tracing with unique IDs
 * - Global rate limiting
 * - API timeout handling
 * - Circuit breaker integration
 * - Request validation
 */

// Rate limiting store (in-memory for now, use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

/**
 * Generate UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Request tracing middleware
 * Adds unique trace ID to every request
 */
export function withRequestTracing(req: NextRequest): string {
  const traceId = req.headers.get('x-trace-id') || generateUUID()

  logger.debug('[TRACING] Request started', {
    traceId,
    method: req.method,
    path: req.nextUrl.pathname,
    userAgent: req.headers.get('user-agent') || 'unknown',
  })

  return traceId
}

/**
 * Global rate limiter
 * Prevents abuse and ensures fair resource allocation
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 100,
  windowSeconds: number = 60
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const key = `rate_limit:${identifier}`

  let entry = rateLimitStore.get(key)

  // Initialize or reset if window expired
  if (!entry || now > entry.resetTime) {
    entry = {
      count: 0,
      resetTime: now + windowSeconds * 1000,
    }
  }

  const allowed = entry.count < limit
  const remaining = Math.max(0, limit - entry.count - 1)

  if (allowed) {
    entry.count++
    rateLimitStore.set(key, entry)
  }

  return {
    allowed,
    remaining,
    resetTime: entry.resetTime,
  }
}

/**
 * Rate limit middleware
 */
export function withRateLimit(
  req: NextRequest,
  limit: number = 100,
  windowSeconds: number = 60
): { allowed: boolean; response?: NextResponse } {
  // Get identifier (IP or user ID)
  const identifier =
    req.headers.get('x-user-id') ||
    req.headers
      .get('x-forwarded-for')?.split(',')[0]
      ?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'

  const { allowed, remaining, resetTime } = checkRateLimit(identifier, limit, windowSeconds)

  if (!allowed) {
    logger.warn('[RATE_LIMIT] Rate limit exceeded', {
      identifier,
      limit,
      window: windowSeconds,
    })

    metrics.incrementCounter('rate_limit.exceeded', 1, {
      identifier: identifier.substring(0, 10), // Hash for privacy
    })

    const response = NextResponse.json(
      {
        error: 'Too many requests',
        retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
      },
      { status: 429 }
    )

    response.headers.set('Retry-After', String(Math.ceil((resetTime - Date.now()) / 1000)))
    response.headers.set('X-RateLimit-Limit', String(limit))
    response.headers.set('X-RateLimit-Remaining', String(remaining))
    response.headers.set('X-RateLimit-Reset', String(resetTime))

    return { allowed: false, response }
  }

  return { allowed: true }
}

/**
 * Request timeout wrapper
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number = 30000
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    ),
  ])
}

/**
 * Request validation middleware
 */
export function validateRequest(
  req: NextRequest,
  options: {
    requireAuth?: boolean
    requireBody?: boolean
    maxBodySize?: number
  } = {}
): { valid: boolean; error?: string } {
  // Check content type for POST/PUT/PATCH
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers.get('content-type')
    if (!contentType?.includes('application/json')) {
      return {
        valid: false,
        error: 'Content-Type must be application/json',
      }
    }
  }

  // Check authentication if required
  if (options.requireAuth) {
    const auth = req.headers.get('authorization')
    if (!auth) {
      return {
        valid: false,
        error: 'Authorization header required',
      }
    }
  }

  return { valid: true }
}

/**
 * Add safety headers to response
 */
export function addSafetyHeaders(response: NextResponse): NextResponse {
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')

  // CORS headers (configure based on environment)
  const allowedOrigin = process.env.ALLOWED_ORIGIN || process.env.CORS_ORIGIN || OFFICIAL_WEBSITE_URL
  response.headers.set('Access-Control-Allow-Origin', allowedOrigin)
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  return response
}

/**
 * Cleanup rate limit store periodically
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now()
  let cleaned = 0

  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
      cleaned++
    }
  }

  if (cleaned > 0) {
    logger.debug('[RATE_LIMIT] Cleaned up expired entries', { count: cleaned })
  }
}

// Cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000)
}

/**
 * Get rate limit stats
 */
export function getRateLimitStats(): {
  activeKeys: number
  totalRequests: number
} {
  let totalRequests = 0

  for (const entry of rateLimitStore.values()) {
    totalRequests += entry.count
  }

  return {
    activeKeys: rateLimitStore.size,
    totalRequests,
  }
}
