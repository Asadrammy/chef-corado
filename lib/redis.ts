/**
 * Redis client for distributed locking and caching
 * Falls back to in-memory if Redis not available (development mode)
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

  constructor() {
    this.redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL || ''
    if (!this.redisUrl) {
      throw new Error('Redis URL not configured')
    }
  }

  private async command(cmd: string, ...args: (string | number)[]): Promise<any> {
    const stringArgs: string[] = args.map(arg => String(arg))
    const url = `${this.redisUrl}/${cmd}/${stringArgs.join('/')}`
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stringArgs),
      })

      if (!response.ok) {
        throw new Error(`Redis command failed: ${response.statusText}`)
      }

      const result = await response.json()
      return result.result
    } catch (error) {
      console.error('Redis command error:', error)
      throw error
    }
  }

  async get(key: string): Promise<string | null> {
    return await this.command('GET', key)
  }

  async set(key: string, value: string, mode?: string, duration?: number): Promise<string | null> {
    const args = [key, value]
    if (mode === 'NX' && duration) {
      args.push('NX', 'EX', duration.toString())
    } else if (mode === 'EX' && duration) {
      args.push('EX', duration.toString())
    }
    return await this.command('SET', ...args)
  }

  async del(key: string): Promise<number> {
    return await this.command('DEL', key)
  }

  async exists(key: string): Promise<number> {
    return await this.command('EXISTS', key)
  }

  async expire(key: string, seconds: number): Promise<number> {
    return await this.command('EXPIRE', key, seconds.toString())
  }
}

// Create Redis client instance
let redisClient: RedisClient

try {
  // Try Upstash Redis first (production)
  redisClient = new UpstashRedis()
  console.log('Redis client initialized (Upstash)')
} catch (error) {
  // Fallback to memory Redis (development)
  redisClient = new MemoryRedis()
  console.log('Redis client initialized (Memory fallback)')
}

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
