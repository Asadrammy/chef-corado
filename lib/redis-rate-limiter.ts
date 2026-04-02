import { NextResponse } from 'next/server'

// Redis-based rate limiter for production
// Falls back to in-memory if Redis not available

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  keyGenerator?: (request: Request) => string
  message?: string
}

class RedisRateLimiter {
  private memoryStore = new Map<string, { count: number; resetTime: number }>()
  private redisUrl: string | undefined

  constructor() {
    this.redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL
  }

  private async redisCommand(command: string, ...args: (string | number)[]): Promise<any> {
    if (!this.redisUrl) {
      throw new Error('Redis not available')
    }

    try {
      // Convert all args to strings for URL-based Redis API
      const stringArgs = args.map(arg => String(arg))
      const response = await fetch(`${this.redisUrl}/${command}/${stringArgs.join('/')}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stringArgs),
      })

      if (!response.ok) {
        throw new Error(`Redis command failed: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Redis error:', error)
      throw error
    }
  }

  private getKey(request: Request, config: RateLimitConfig): string {
    if (config.keyGenerator) {
      return config.keyGenerator(request)
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown'
    
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const userId = this.extractUserIdFromRequest(request)
    
    // Use user ID if available, otherwise IP + user agent
    return userId ? `user:${userId}` : `ip:${ip}:${Buffer.from(userAgent).toString('base64').slice(0, 8)}`
  }

  private extractUserIdFromRequest(request: Request): string | null {
    // Try to extract user ID from session token or headers
    const authorization = request.headers.get('authorization')
    if (authorization?.startsWith('Bearer ')) {
      try {
        // This is a simplified extraction - in production, verify JWT
        const token = authorization.slice(7)
        const payload = JSON.parse(atob(token.split('.')[1]))
        return payload.sub || payload.userId || null
      } catch {
        // Invalid token, ignore
      }
    }
    return null
  }

  async checkRateLimit(request: Request, config: RateLimitConfig): Promise<{
    allowed: boolean
    remaining: number
    resetTime: number
    response?: NextResponse
  }> {
    const key = this.getKey(request, config)
    const now = Date.now()
    const windowStart = now - config.windowMs

    if (this.redisUrl) {
      return await this.checkRedisRateLimit(key, config, now, windowStart)
    } else {
      return this.checkMemoryRateLimit(key, config, now, windowStart)
    }
  }

  private async checkRedisRateLimit(
    key: string, 
    config: RateLimitConfig, 
    now: number, 
    windowStart: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number; response?: NextResponse }> {
    try {
      // Use Redis pipeline for atomic operations
      const pipeline = [
        ['ZREMRANGEBYSCORE', key, 0, windowStart], // Remove old entries
        ['ZCARD', key], // Count current entries
        ['ZADD', key, now, `${now}-${Math.random()}`], // Add current request
        ['EXPIRE', key, Math.ceil(config.windowMs / 1000)], // Set expiration
      ]

      const results = await Promise.all(
        pipeline.map(([cmd, ...args]) => {
          const stringArgs: string[] = args.map(arg => String(arg))
          return (this.redisCommand as any)(cmd, ...stringArgs)
        })
      )

      const count = results[1] // ZCARD result

      if (count > config.maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: now + config.windowMs,
          response: NextResponse.json(
            { 
              error: config.message || "Too many requests",
              retryAfter: Math.ceil(config.windowMs / 1000)
            },
            { 
              status: 429,
              headers: {
                'X-RateLimit-Limit': config.maxRequests.toString(),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': new Date(now + config.windowMs).toISOString(),
                'Retry-After': Math.ceil(config.windowMs / 1000).toString()
              }
            }
          )
        }
      }

      return {
        allowed: true,
        remaining: config.maxRequests - count,
        resetTime: now + config.windowMs
      }

    } catch (error) {
      console.error('Redis rate limit failed, falling back to memory:', error)
      return this.checkMemoryRateLimit(key, config, now, windowStart)
    }
  }

  private checkMemoryRateLimit(
    key: string, 
    config: RateLimitConfig, 
    now: number, 
    windowStart: number
  ): { allowed: boolean; remaining: number; resetTime: number; response?: NextResponse } {
    const existing = this.memoryStore.get(key)

    if (!existing || now > existing.resetTime) {
      // New window
      this.memoryStore.set(key, {
        count: 1,
        resetTime: now + config.windowMs
      })

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs
      }
    }

    // Update existing
    existing.count++

    if (existing.count > config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: existing.resetTime,
        response: NextResponse.json(
          { 
            error: config.message || "Too many requests",
            retryAfter: Math.ceil((existing.resetTime - now) / 1000)
          },
          { 
            status: 429,
            headers: {
              'X-RateLimit-Limit': config.maxRequests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': new Date(existing.resetTime).toISOString(),
              'Retry-After': Math.ceil((existing.resetTime - now) / 1000).toString()
            }
          }
        )
      }
    }

    return {
      allowed: true,
      remaining: config.maxRequests - existing.count,
      resetTime: existing.resetTime
    }
  }

  // Cleanup old entries periodically
  cleanup(): void {
    const now = Date.now()
    for (const [key, data] of this.memoryStore.entries()) {
      if (now > data.resetTime) {
        this.memoryStore.delete(key)
      }
    }
  }
}

// Singleton instance
const rateLimiter = new RedisRateLimiter()

// Cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => rateLimiter.cleanup(), 5 * 60 * 1000)
}

// Rate limit configurations for different endpoints
export const rateLimitConfigs = {
  // Auth endpoints - very strict
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
    message: "Too many authentication attempts. Please try again later."
  },

  // Proposal endpoints - moderate
  proposals: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 20, // 20 proposals per 15 minutes
    message: "Too many proposal requests. Please try again later."
  },

  // Payment endpoints - strict
  payments: {
    windowMs: 10 * 60 * 1000, // 10 minutes
    maxRequests: 10, // 10 payment attempts per 10 minutes
    message: "Too many payment attempts. Please try again later."
  },

  // General API - lenient
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // 100 requests per 15 minutes
    message: "Too many requests. Please try again later."
  },

  // Webhook endpoints - very lenient (Stripe can retry)
  webhook: {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 1000, // 1000 webhooks per minute
    message: "Webhook rate limit exceeded"
  }
}

// Middleware function for Next.js API routes
export async function applyRateLimit(
  request: Request,
  configName: keyof typeof rateLimitConfigs
): Promise<{ allowed: boolean; response?: NextResponse }> {
  const config = rateLimitConfigs[configName]
  const result = await rateLimiter.checkRateLimit(request, config)

  if (!result.allowed && result.response) {
    return { allowed: false, response: result.response }
  }

  return { allowed: true }
}

export default rateLimiter
