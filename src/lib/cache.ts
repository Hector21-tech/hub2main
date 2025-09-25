/**
 * Simple In-Memory Cache Implementation for Scout Hub 2
 * Improves API performance by caching frequently requested data
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>()
  private defaultTTL = 5 * 60 * 1000 // 5 minutes default

  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    }
    this.cache.set(key, entry)
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  has(key: string): boolean {
    const entry = this.cache.get(key)

    if (!entry) {
      return false
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key)
      }
    })

    keysToDelete.forEach(key => this.cache.delete(key))
  }

  // Get cache statistics
  getStats() {
    const now = Date.now()
    let expired = 0
    let active = 0

    this.cache.forEach((entry) => {
      if (now - entry.timestamp > entry.ttl) {
        expired++
      } else {
        active++
      }
    })

    return {
      total: this.cache.size,
      active,
      expired
    }
  }
}

// Create global cache instance
const globalCache = new MemoryCache()

// Auto-cleanup every 10 minutes
setInterval(() => {
  globalCache.cleanup()
}, 10 * 60 * 1000)

export { globalCache as cache }

// Cache key generators for different data types
export const CacheKeys = {
  dashboardStats: (tenantId: string) => `dashboard:stats:${tenantId}`,
  playersList: (tenantId: string) => `players:list:${tenantId}`,
  requestsList: (tenantId: string) => `requests:list:${tenantId}`,
  trialsList: (tenantId: string) => `trials:list:${tenantId}`,
  playerDetails: (playerId: string) => `player:${playerId}`,
  requestDetails: (requestId: string) => `request:${requestId}`,
  trialDetails: (trialId: string) => `trial:${trialId}`
}

// Cache TTL constants (in milliseconds)
export const CacheTTL = {
  DASHBOARD_STATS: 2 * 60 * 1000,    // 2 minutes - frequently changing data
  PLAYER_LIST: 5 * 60 * 1000,        // 5 minutes - semi-static data
  PLAYER_DETAILS: 10 * 60 * 1000,    // 10 minutes - relatively static
  REQUEST_LIST: 1 * 60 * 1000,       // 1 minute - frequently changing
  TRIAL_LIST: 3 * 60 * 1000,         // 3 minutes - moderately changing
  ANALYTICS: 15 * 60 * 1000,         // 15 minutes - aggregate data
  CONFIGURATION: 30 * 60 * 1000      // 30 minutes - rarely changing
}

// Helper function to create cache-aware API handler
export function withCache<T>(
  key: string,
  ttl: number,
  dataFetcher: () => Promise<T>
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    try {
      // Try to get from cache first
      const cached = globalCache.get<T>(key)
      if (cached !== null) {
        resolve(cached)
        return
      }

      // If not in cache, fetch data
      const data = await dataFetcher()

      // Store in cache
      globalCache.set(key, data, ttl)

      resolve(data)
    } catch (error) {
      reject(error)
    }
  })
}

// Cache invalidation helpers
export const CacheInvalidation = {
  // Invalidate all cache entries for a tenant
  invalidateTenant: (tenantId: string) => {
    const keysToDelete = [
      CacheKeys.dashboardStats(tenantId),
      CacheKeys.playersList(tenantId),
      CacheKeys.requestsList(tenantId),
      CacheKeys.trialsList(tenantId)
    ]

    keysToDelete.forEach(key => globalCache.delete(key))
  },

  // Invalidate player-related cache
  invalidatePlayer: (tenantId: string, playerId?: string) => {
    globalCache.delete(CacheKeys.playersList(tenantId))
    globalCache.delete(CacheKeys.dashboardStats(tenantId))

    if (playerId) {
      globalCache.delete(CacheKeys.playerDetails(playerId))
    }
  },

  // Invalidate request-related cache
  invalidateRequest: (tenantId: string, requestId?: string) => {
    globalCache.delete(CacheKeys.requestsList(tenantId))
    globalCache.delete(CacheKeys.dashboardStats(tenantId))

    if (requestId) {
      globalCache.delete(CacheKeys.requestDetails(requestId))
    }
  },

  // Invalidate trial-related cache
  invalidateTrial: (tenantId: string, trialId?: string) => {
    globalCache.delete(CacheKeys.trialsList(tenantId))
    globalCache.delete(CacheKeys.dashboardStats(tenantId))

    if (trialId) {
      globalCache.delete(CacheKeys.trialDetails(trialId))
    }
  }
}