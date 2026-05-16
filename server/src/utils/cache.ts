/**
 * Server-side in-memory cache with TTL support
 * Used for caching frequently accessed data like tournament settings and categories
 */

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

class ServerCache {
  private cache = new Map<string, CacheEntry<any>>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Run cleanup every 5 minutes to remove expired entries
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Get a cached value, or fetch it if not cached or expired
   */
  async getOrFetch<T>(
    key: string,
    ttlMs: number,
    fetcher: () => Promise<T>
  ): Promise<T> {
    const entry = this.cache.get(key);

    if (entry && Date.now() < entry.expiry) {
      return entry.data;
    }

    // Fetch fresh data
    const data = await fetcher();
    this.set(key, data, ttlMs);
    return data;
  }

  /**
   * Get a cached value (returns null if not found or expired)
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() < entry.expiry) {
      return entry.data;
    }
    if (entry) {
      this.cache.delete(key);
    }
    return null;
  }

  /**
   * Set a value in the cache with TTL
   */
  set<T>(key: string, data: T, ttlMs: number): void {
    this.cache.set(key, { data, expiry: Date.now() + ttlMs });
  }

  /**
   * Invalidate a specific key or all keys matching a pattern
   */
  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Remove all expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expiry) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache stats for monitoring
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Cleanup on shutdown
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

// Singleton instance
export const serverCache = new ServerCache();

// Cache TTL constants (in milliseconds)
export const CACHE_TTL = {
  TOURNAMENT_SETTINGS: 60 * 1000,      // 60 seconds
  CATEGORIES: 5 * 60 * 1000,           // 5 minutes
  RETENTION_SETTINGS: 60 * 1000,       // 60 seconds
};

/**
 * Cache key generators for consistent key naming
 */
export const cacheKeys = {
  tournamentSettings: (tournamentId: string) => `tournament:${tournamentId}:settings`,
  categories: (tournamentId: string) => `tournament:${tournamentId}:categories`,
  retentionSettings: (tournamentId: string) => `tournament:${tournamentId}:retention`,
};
