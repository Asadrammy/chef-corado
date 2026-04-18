declare module '@/lib/redis' {
  export const redis: {
    get(key: string): Promise<string | null>
    set(key: string, value: string, mode?: string, duration?: number): Promise<string | null>
    del(key: string): Promise<number>
    exists(key: string): Promise<number>
    expire(key: string, seconds: number): Promise<number>
  }
  
  export const redisLocks: {
    acquireLock(key: string, ttlSeconds?: number): Promise<boolean>
    releaseLock(key: string): Promise<boolean>
    isLocked(key: string): Promise<boolean>
  }
  
  export default redis
}
