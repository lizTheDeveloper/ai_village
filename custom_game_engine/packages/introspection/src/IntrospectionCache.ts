/**
 * IntrospectionCache - Entity query result cache with tick-based expiry
 *
 * Caches the results of entity queries (e.g., component data, relationships)
 * to avoid redundant serialization and traversal. Uses tick-based expiry
 * similar to SchedulerRenderCache.
 *
 * Key features:
 * - Tick-based automatic expiry (default: 20 ticks = 1 second at 20 TPS)
 * - Manual invalidation by key or entity ID
 * - Hit/miss rate tracking for metrics
 * - Memory usage estimation
 */

/**
 * Cache entry with metadata
 */
export interface CachedEntry<T = any> {
  /** Cache key */
  key: string;

  /** Cached value */
  value: T;

  /** Entity ID this cache belongs to (for invalidation) */
  entityId: string;

  /** Tick when this was cached */
  cachedAtTick: number;

  /** Tick when cache should expire */
  expiryTick: number;

  /** Timestamp when cached (for LRU eviction) */
  cachedAt: number;

  /** Manually invalidated flag */
  invalidated: boolean;
}

/**
 * Cache statistics
 */
export interface IntrospectionCacheStats {
  /** Total cache hits */
  hits: number;

  /** Total cache misses */
  misses: number;

  /** Manual invalidations */
  invalidations: number;

  /** Current cache size (number of entries) */
  size: number;

  /** Hit rate (0-1) */
  hitRate: number;

  /** Average cache lifetime (ticks) */
  avgLifetime: number;

  /** Estimated memory usage (bytes) */
  memoryUsage: number;
}

/**
 * Cache for entity query results with tick-based expiry
 */
export class IntrospectionCache<T = any> {
  private cache = new Map<string, CachedEntry<T>>();
  private currentTick: number = 0;
  private defaultTTL: number = 20; // Default 20 ticks = 1 second at 20 TPS

  // Statistics
  private stats = {
    hits: 0,
    misses: 0,
    invalidations: 0,
    totalLifetime: 0,
    lifetimeCount: 0,
  };

  /**
   * Create a new IntrospectionCache
   * @param defaultTTL - Default time-to-live in ticks (default: 20)
   */
  constructor(defaultTTL: number = 20) {
    this.defaultTTL = defaultTTL;
  }

  /**
   * Get cached value if valid
   * @param key - Cache key
   * @returns Cached value if valid, null otherwise
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (this.currentTick >= entry.expiryTick) {
      this.stats.misses++;
      this.recordLifetime(entry);
      this.cache.delete(key);
      return null;
    }

    // Check if manually invalidated
    if (entry.invalidated) {
      this.stats.misses++;
      this.recordLifetime(entry);
      this.cache.delete(key);
      return null;
    }

    // Cache hit!
    this.stats.hits++;
    return entry.value;
  }

  /**
   * Store value in cache
   * @param key - Cache key
   * @param value - Value to cache
   * @param entityId - Entity ID for invalidation
   * @param ttl - Time-to-live in ticks (optional, uses default if not provided)
   */
  set(key: string, value: T, entityId: string, ttl?: number): void {
    const expiryTicks = ttl !== undefined ? ttl : this.defaultTTL;
    const expiryTick = this.currentTick + expiryTicks;

    this.cache.set(key, {
      key,
      value,
      entityId,
      cachedAtTick: this.currentTick,
      expiryTick,
      cachedAt: Date.now(),
      invalidated: false,
    });
  }

  /**
   * Invalidate a specific cache entry
   * @param key - Cache key to invalidate
   */
  invalidate(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      entry.invalidated = true;
      this.stats.invalidations++;
    }
  }

  /**
   * Invalidate all cache entries for an entity
   * @param entityId - Entity ID to invalidate
   */
  invalidateEntity(entityId: string): void {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.entityId === entityId && !entry.invalidated) {
        entry.invalidated = true;
        this.stats.invalidations++;
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Update current tick (should be called each game tick)
   * @param tick - Current game tick
   */
  onTick(tick: number): void {
    this.currentTick = tick;
    this.pruneExpired();
  }

  /**
   * Get cache statistics
   */
  getStats(): IntrospectionCacheStats {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? this.stats.hits / total : 0;
    const avgLifetime =
      this.stats.lifetimeCount > 0 ? this.stats.totalLifetime / this.stats.lifetimeCount : 0;

    // Estimate memory usage: ~2KB per entry (rough approximation)
    const memoryUsage = this.cache.size * 2048;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      invalidations: this.stats.invalidations,
      size: this.cache.size,
      hitRate,
      avgLifetime,
      memoryUsage,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      invalidations: 0,
      totalLifetime: 0,
      lifetimeCount: 0,
    };
  }

  /**
   * Check if a key exists and is valid
   * @param key - Cache key
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (entry.invalidated) return false;
    if (this.currentTick >= entry.expiryTick) return false;
    return true;
  }

  /**
   * Get cache details for debugging
   */
  getCacheDetails(): Array<{
    key: string;
    entityId: string;
    age: number;
    ticksUntilExpiry: number;
    invalidated: boolean;
  }> {
    const details: Array<any> = [];

    for (const entry of this.cache.values()) {
      details.push({
        key: entry.key,
        entityId: entry.entityId,
        age: this.currentTick - entry.cachedAtTick,
        ticksUntilExpiry: entry.expiryTick - this.currentTick,
        invalidated: entry.invalidated,
      });
    }

    return details;
  }

  // ========================================================================
  // Private methods
  // ========================================================================

  /**
   * Record lifetime of a cache entry for statistics
   */
  private recordLifetime(entry: CachedEntry<T>): void {
    const lifetime = this.currentTick - entry.cachedAtTick;
    this.stats.totalLifetime += lifetime;
    this.stats.lifetimeCount++;
  }

  /**
   * Remove expired and invalidated entries
   */
  private pruneExpired(): void {
    const toDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.invalidated || this.currentTick >= entry.expiryTick) {
        toDelete.push(key);
        this.recordLifetime(entry);
      }
    }

    for (const key of toDelete) {
      this.cache.delete(key);
    }
  }
}
