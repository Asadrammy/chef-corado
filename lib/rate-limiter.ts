import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (request: NextRequest) => string; // Custom key generator
  message?: string; // Custom error message
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cleanup old entries every 5 minutes
    if (typeof global !== 'undefined') {
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, 5 * 60 * 1000);
    }
  }

  private cleanup() {
    const now = Date.now();
    for (const key in this.store) {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    }
  }

  private getKey(request: NextRequest, config: RateLimitConfig): string {
    if (config.keyGenerator) {
      return config.keyGenerator(request);
    }

    // Default: use IP address
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown';

    return `rate-limit:${ip}`;
  }

  check(request: NextRequest, config: RateLimitConfig): { allowed: boolean; remaining: number; resetTime: number } {
    const key = this.getKey(request, config);
    const now = Date.now();

    // Initialize or reset if window expired
    if (!this.store[key] || this.store[key].resetTime < now) {
      this.store[key] = {
        count: 1,
        resetTime: now + config.windowMs,
      };
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: this.store[key].resetTime,
      };
    }

    // Increment count
    this.store[key].count++;

    const allowed = this.store[key].count <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - this.store[key].count);

    return {
      allowed,
      remaining,
      resetTime: this.store[key].resetTime,
    };
  }

  middleware(config: RateLimitConfig) {
    return (request: NextRequest) => {
      const { allowed, remaining, resetTime } = this.check(request, config);

      if (!allowed) {
        const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
        return NextResponse.json(
          {
            error: config.message || 'Too many requests. Please try again later.',
            retryAfter,
          },
          {
            status: 429,
            headers: {
              'Retry-After': retryAfter.toString(),
              'X-RateLimit-Limit': config.maxRequests.toString(),
              'X-RateLimit-Remaining': remaining.toString(),
              'X-RateLimit-Reset': resetTime.toString(),
            },
          }
        );
      }

      // Add rate limit headers to response
      const response = NextResponse.next();
      response.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
      response.headers.set('X-RateLimit-Remaining', remaining.toString());
      response.headers.set('X-RateLimit-Reset', resetTime.toString());

      return response;
    };
  }
}

export const rateLimiter = new RateLimiter();

// Preset configurations
export const rateLimitConfigs = {
  // Auth endpoints: 5 attempts per 15 minutes
  auth: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    message: 'Too many login attempts. Please try again in 15 minutes.',
  },

  // API endpoints: 100 requests per 15 minutes
  api: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100,
    message: 'Too many requests. Please try again later.',
  },

  // Messages: 50 requests per 15 minutes
  messages: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 50,
    message: 'Too many messages. Please slow down.',
  },

  // Payments: 20 requests per 15 minutes
  payments: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 20,
    message: 'Too many payment requests. Please try again later.',
  },

  // Payouts: 10 requests per 15 minutes
  payouts: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 10,
    message: 'Too many payout requests. Please try again later.',
  },

  // Search: 30 requests per minute
  search: {
    windowMs: 60 * 1000,
    maxRequests: 30,
    message: 'Too many search requests. Please slow down.',
  },
};
