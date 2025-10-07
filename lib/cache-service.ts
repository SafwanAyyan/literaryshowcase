// High-performance caching service for frequently accessed data
// Reduces database queries and API calls for better performance

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
}

export class CacheService {
  private static cache = new Map<string, CacheEntry<any>>()
  
  // Cache TTL configurations (in milliseconds)
  static readonly TTL = {
    SETTINGS: 5 * 60 * 1000,     // 5 minutes for settings
    CONTENT: 2 * 60 * 1000,      // 2 minutes for content
    STATS: 1 * 60 * 1000,        // 1 minute for stats
    PROVIDERS: 10 * 60 * 1000,   // 10 minutes for AI provider configs
    SHORT: 30 * 1000,            // 30 seconds for frequently changing data
    LONG: 30 * 60 * 1000         // 30 minutes for rarely changing data
  } as const

  /**
   * Get cached data or execute function and cache result
   */
  static async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = this.TTL.SETTINGS
  ): Promise<T> {
    const now = Date.now()
    const cached = this.cache.get(key)
    
    // Return cached data if still valid
    if (cached && (now - cached.timestamp) < cached.ttl) {
      return cached.data
    }
    
    // Fetch fresh data
    try {
      const data = await fetchFn()
      
      // Cache the result
      this.cache.set(key, {
        data,
        timestamp: now,
        ttl
      })
      
      return data
    } catch (error) {
      // If fetch fails and we have stale cached data, return it
      if (cached) {
        console.warn(`[Cache] Using stale data for key: ${key}`)
        return cached.data
      }
      throw error
    }
  }

  /**
   * Set cache value directly
   */
  static set<T>(key: string, data: T, ttl: number = this.TTL.SETTINGS): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  /**
   * Get cached value without fallback
   */
  static get<T>(key: string): T | null {
    const now = Date.now()
    const cached = this.cache.get(key)
    
    if (cached && (now - cached.timestamp) < cached.ttl) {
      return cached.data
    }
    
    return null
  }

  /**
   * Invalidate specific cache key
   */
  static invalidate(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Invalidate all cache entries matching pattern
   */
  static invalidatePattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Clear all cache
   */
  static clear(): void {
    this.cache.clear()
  }

  /**
   * Clean up expired entries
   */
  static cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if ((now - entry.timestamp) >= entry.ttl) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Get cache statistics
   */
  static getStats(): {
    totalEntries: number
    validEntries: number
    expiredEntries: number
    memoryUsage: string
  } {
    const now = Date.now()
    let validEntries = 0
    let expiredEntries = 0
    
    for (const [key, entry] of this.cache.entries()) {
      if ((now - entry.timestamp) < entry.ttl) {
        validEntries++
      } else {
        expiredEntries++
      }
    }
    
    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      memoryUsage: `${Math.round(JSON.stringify([...this.cache.values()]).length / 1024)}KB`
    }
  }

  /**
   * Preload commonly accessed data
   */
  static async preloadCriticalData(): Promise<void> {
    try {
      // Import services dynamically to avoid circular imports
      const { DatabaseService } = await import('./database-service')
      
      // Preload settings
      await this.getOrSet('admin-settings', () => DatabaseService.getSettings(), this.TTL.SETTINGS)
      
      // Preload content stats for dashboard
      await this.getOrSet('content-stats', () => DatabaseService.getStatistics(), this.TTL.STATS)
      
      console.log('[Cache] Critical data preloaded successfully')
    } catch (error) {
      console.warn('[Cache] Failed to preload critical data:', error)
    }
  }
}

// Cleanup expired entries every 5 minutes
if (typeof window === 'undefined') { // Server-side only
  setInterval(() => {
    CacheService.cleanup()
  }, 5 * 60 * 1000)
}