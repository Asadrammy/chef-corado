import Redis from "ioredis"

/**
 * Redis client for distributed locking and caching.
 * Development may use in-memory fallback; production must use a durable Redis provider.
 */

interface RedisClient {
  get(key: string): Promise<string | null>
  set(key: string, value: string, mode?: string, duration?: number): Promise<string | null>
  del(key: string): Promise<number>
  exists(key: string): Promise<number>
  expire(key: string, seconds: number): Promise<number>
}

class MemoryRedis implements RedisClient {
  private store = new Map<string, { value: string; expiry: number }>()
  
  private cleanExpired(): void {
    const now = Date.now()
    for (const [key, data] of this.store.entries()) {
      if (data.expiry > 0 && now > data.expiry) {
        this.store.delete(key)
      }
    }
  }

  async get(key: string): Promise<string | null> {
    this.cleanExpired()
    const data = this.store.get(key)
    if (!data) return null
    
    if (data.expiry > 0 && Date.now() > data.expiry) {
      this.store.delete(key)
      return null
    }
    
    return data.value
  }

  async set(key: string, value: string, mode?: string, duration?: number): Promise<string | null> {
    const expiry = duration ? Date.now() + (duration * 1000) : 0
    
    if (mode === 'NX' && duration) {
      // ATOMIC: SET with NX (only if not exists)
      if (this.store.has(key)) {
        return null // Key exists, NX failed
      }
      this.store.set(key, { value, expiry })
      return 'OK'
    }
    
    if (mode === 'EX' && duration) {
      // SET with expiration
      this.store.set(key, { value, expiry })
      return 'OK'
    }
    
    // Regular SET
    this.store.set(key, { value, expiry })
    return 'OK'
  }

  async del(key: string): Promise<number> {
    this.cleanExpired()
    return this.store.delete(key) ? 1 : 0
  }

  async exists(key: string): Promise<number> {
    this.cleanExpired()
    return this.store.has(key) ? 1 : 0
  }

  async expire(key: string, seconds: number): Promise<number> {
    const data = this.store.get(key)
    if (!data) return 0
    
    data.expiry = Date.now() + (seconds * 1000)
    return 1
  }
}

class UpstashRedis implements RedisClient {
  private redisUrl: string
  private token: string

  constructor() {
    this.redisUrl = (process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '')
    this.token = process.env.UPSTASH_REDIS_REST_TOKEN || ''
    if (!this.redisUrl || !this.token) {
      throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must both be configured')
    }
  }

  private async command(args: (string | number)[]): Promise<any> {
    try {
      const response = await fetch(this.redisUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(args.map(arg => String(arg))),
      })

      if (!response.ok) {
        throw new Error(`Redis command failed: ${response.statusText}`)
      }

      const result = await response.json()
      if (result.error) {
        throw new Error(`Redis command failed: ${result.error}`)
      }
      return result.result
    } catch (error) {
      console.error('Redis command error:', error)
      throw error
    }
  }

  async get(key: string): Promise<string | null> {
    return await this.command(['GET', key])
  }

  async set(key: string, value: string, mode?: string, duration?: number): Promise<string | null> {
    const args: (string | number)[] = ['SET', key, value]
    if (mode === 'NX' && duration) {
      args.push('EX', duration, 'NX')
    } else if (mode === 'EX' && duration) {
      args.push('EX', duration)
    }
    return await this.command(args)
  }

  async del(key: string): Promise<number> {
    return await this.command(['DEL', key])
  }

  async exists(key: string): Promise<number> {
    return await this.command(['EXISTS', key])
  }

  async expire(key: string, seconds: number): Promise<number> {
    return await this.command(['EXPIRE', key, seconds])
  }
}

class IORedisClient implements RedisClient {
  private client: Redis

  constructor(redisUrl: string) {
    this.client = new Redis(redisUrl, {
      enableReadyCheck: true,
      maxRetriesPerRequest: 2,
      lazyConnect: true,
    })
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key)
  }

  async set(key: string, value: string, mode?: string, duration?: number): Promise<string | null> {
    if (mode === 'NX' && duration) {
      return this.client.set(key, value, 'EX', duration, 'NX')
    }
    if (mode === 'EX' && duration) {
      return this.client.set(key, value, 'EX', duration)
    }
    return this.client.set(key, value)
  }

  async del(key: string): Promise<number> {
    return this.client.del(key)
  }

  async exists(key: string): Promise<number> {
    return this.client.exists(key)
  }

  async expire(key: string, seconds: number): Promise<number> {
    return this.client.expire(key, seconds)
  }
}

class UnavailableRedis implements RedisClient {
  private fail(): never {
    throw new Error('REDIS_REQUIRED_IN_PRODUCTION')
  }

  async get(): Promise<string | null> {
    this.fail()
  }

  async set(): Promise<string | null> {
    this.fail()
  }

  async del(): Promise<number> {
    this.fail()
  }

  async exists(): Promise<number> {
    this.fail()
  }

  async expire(): Promise<number> {
    this.fail()
  }
}

export function isDistributedRedisConfigured() {
  return Boolean(
    (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) ||
    process.env.REDIS_URL
  )
}

function createRedisClient(): RedisClient {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.log('Redis client initialized (Upstash REST)')
    return new UpstashRedis()
  }

  if (process.env.REDIS_URL) {
    console.log('Redis client initialized (Redis URL)')
    return new IORedisClient(process.env.REDIS_URL)
  }

  if (process.env.NODE_ENV === 'production') {
    console.error('Redis is required in production for checkout and availability locks. Configure UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN or REDIS_URL.')
    return new UnavailableRedis()
  }

  console.log('Redis client initialized (Memory fallback for development)')
  return new MemoryRedis()
}

const redisClient = createRedisClient()
export const redis = redisClient

// Production-grade distributed locking
export const redisLocks = {
  // ATOMIC lock acquisition using SET NX EX
  async acquireLock(key: string, ttlSeconds: number = 300): Promise<boolean> {
    try {
      const result = await redis.set(key, 'locked', 'NX', ttlSeconds)
      return result === 'OK'
    } catch (error) {
      console.error('Failed to acquire lock:', error)
      if (process.env.NODE_ENV === 'production' || (error instanceof Error && error.message === 'REDIS_REQUIRED_IN_PRODUCTION')) {
        throw error
      }
      return false
    }
  },

  // Safe lock release
  async releaseLock(key: string): Promise<boolean> {
    try {
      const result = await redis.del(key)
      return result > 0
    } catch (error) {
      console.error('Failed to release lock:', error)
      return false
    }
  },

  // Check lock status
  async isLocked(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key)
      return result > 0
    } catch (error) {
      console.error('Failed to check lock:', error)
      return false
    }
  },

  // Extend lock TTL (for long operations)
  async extendLock(key: string, ttlSeconds: number = 300): Promise<boolean> {
    try {
      const result = await redis.expire(key, ttlSeconds)
      return result > 0
    } catch (error) {
      console.error('Failed to extend lock:', error)
      return false
    }
  }
}

export default redisClient
