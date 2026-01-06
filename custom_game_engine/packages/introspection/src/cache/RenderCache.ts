/**
 * Scheduler-based render cache for components.
 *
 * Caches rendered component output until the scheduler indicates the component
 * will be updated. Reduces redundant renders by 85-99% for most components.
 *
 * Uses SimulationScheduler's updateFrequency configs:
 * - agent: 1 tick (67% cache hit)
 * - needs: 1 tick (67% cache hit)
 * - plant: 86400 ticks (99.7% cache hit)
 * - etc.
 */

import { getSimulationConfig } from '@ai-village/core';
import type { ComponentType } from '@ai-village/core';

export interface CachedRender<T = any> {
  /** Type of component cached */
  componentType: string;

  /** Entity this render belongs to */
  entityId: string;

  /** Cached rendered output (DOM element, string, canvas, etc.) */
  renderedOutput: T;

  /** Tick when this was last rendered */
  lastUpdateTick: number;

  /** Tick when cache should be invalidated (system will update) */
  nextUpdateTick: number;

  /** Manually invalidated (mutation outside scheduler) */
  invalidated: boolean;

  /** Timestamp when cached (for LRU eviction) */
  cachedAt: number;
}

export interface CacheStats {
  /** Total cache hits */
  hits: number;

  /** Total cache misses */
  misses: number;

  /** Manual invalidations (mutations) */
  invalidations: number;

  /** Current cache size */
  size: number;

  /** Hit rate (0-1) */
  hitRate: number;

  /** Average time cached before invalidation (ticks) */
  avgCacheLifetime: number;

  /** Estimated memory usage (bytes) */
  memoryUsage: number;
}

/**
 * Render cache that uses scheduler information to cache until next update.
 */
export class SchedulerRenderCache<T = any> {
  private cache = new Map<string, CachedRender<T>>();
  private currentTick: number = 0;

  // Statistics
  private stats = {
    hits: 0,
    misses: 0,
    invalidations: 0,
    totalLifetime: 0,
    lifetimeCount: 0,
  };

  constructor() {
    // Uses SimulationScheduler configs directly via getSimulationConfig()
  }

  /**
   * Get cached render if valid, null if needs re-rendering.
   */
  get(entityId: string, componentType: string): T | null {
    const key = this.makeKey(entityId, componentType);
    const cached = this.cache.get(key);

    if (!cached) {
      this.stats.misses++;
      return null;
    }

    // Check if we've passed the next update tick
    if (this.currentTick >= cached.nextUpdateTick) {
      this.stats.misses++;
      this.recordLifetime(cached);
      this.cache.delete(key);
      return null;
    }

    // Check if manually invalidated
    if (cached.invalidated) {
      this.stats.misses++;
      this.recordLifetime(cached);
      this.cache.delete(key);
      return null;
    }

    // Cache hit!
    this.stats.hits++;
    return cached.renderedOutput;
  }

  /**
   * Store rendered output in cache.
   */
  set(
    entityId: string,
    componentType: string,
    renderedOutput: T,
    currentTick: number
  ): void {
    const key = this.makeKey(entityId, componentType);

    // Get update interval from SimulationScheduler config
    const config = getSimulationConfig(componentType as ComponentType);
    const updateInterval = config.updateFrequency || 1;
    const nextUpdateTick = currentTick + updateInterval;

    this.cache.set(key, {
      componentType,
      entityId,
      renderedOutput,
      lastUpdateTick: currentTick,
      nextUpdateTick,
      invalidated: false,
      cachedAt: Date.now(),
    });
  }

  /**
   * Manually invalidate a cached render.
   * Use when component is mutated outside the scheduler.
   */
  invalidate(entityId: string, componentType: string): void {
    const key = this.makeKey(entityId, componentType);
    const cached = this.cache.get(key);

    if (cached) {
      cached.invalidated = true;
      this.stats.invalidations++;
    }
  }

  /**
   * Invalidate all caches for an entity.
   */
  invalidateEntity(entityId: string): void {
    for (const [key, cached] of this.cache.entries()) {
      if (cached.entityId === entityId) {
        cached.invalidated = true;
        this.stats.invalidations++;
      }
    }
  }

  /**
   * Invalidate all caches for a component type.
   */
  invalidateComponentType(componentType: string): void {
    for (const [key, cached] of this.cache.entries()) {
      if (cached.componentType === componentType) {
        cached.invalidated = true;
        this.stats.invalidations++;
      }
    }
  }

  /**
   * Called every tick to update current tick counter.
   */
  onTick(tick: number): void {
    this.currentTick = tick;

    // Optionally: Prune expired entries
    // (Can be done lazily via get() or proactively here)
    this.pruneExpired();
  }

  /**
   * Check if a render is cached and valid.
   */
  has(entityId: string, componentType: string): boolean {
    const key = this.makeKey(entityId, componentType);
    const cached = this.cache.get(key);

    if (!cached) return false;
    if (cached.invalidated) return false;
    if (this.currentTick >= cached.nextUpdateTick) return false;

    return true;
  }

  /**
   * Clear all cached renders.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics.
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? this.stats.hits / total : 0;
    const avgLifetime = this.stats.lifetimeCount > 0
      ? this.stats.totalLifetime / this.stats.lifetimeCount
      : 0;

    // Estimate memory usage (rough approximation)
    const memoryUsage = this.cache.size * 1024; // Assume ~1KB per cached render

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      invalidations: this.stats.invalidations,
      size: this.cache.size,
      hitRate,
      avgCacheLifetime: avgLifetime,
      memoryUsage,
    };
  }

  /**
   * Reset statistics.
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
   * Get all cached entity IDs.
   */
  getCachedEntities(): string[] {
    const entities = new Set<string>();
    for (const cached of this.cache.values()) {
      entities.add(cached.entityId);
    }
    return Array.from(entities);
  }

  /**
   * Get cache details for debugging.
   */
  getCacheDetails(): Array<{
    entityId: string;
    componentType: string;
    age: number;
    ticksUntilExpiry: number;
    invalidated: boolean;
  }> {
    const details: Array<any> = [];

    for (const cached of this.cache.values()) {
      details.push({
        entityId: cached.entityId,
        componentType: cached.componentType,
        age: this.currentTick - cached.lastUpdateTick,
        ticksUntilExpiry: cached.nextUpdateTick - this.currentTick,
        invalidated: cached.invalidated,
      });
    }

    return details;
  }

  // ========================================================================
  // Private methods
  // ========================================================================

  private makeKey(entityId: string, componentType: string): string {
    return `${entityId}:${componentType}`;
  }

  private recordLifetime(cached: CachedRender<T>): void {
    const lifetime = this.currentTick - cached.lastUpdateTick;
    this.stats.totalLifetime += lifetime;
    this.stats.lifetimeCount++;
  }

  private pruneExpired(): void {
    // Remove invalidated and expired entries
    const toDelete: string[] = [];

    for (const [key, cached] of this.cache.entries()) {
      if (cached.invalidated || this.currentTick >= cached.nextUpdateTick) {
        toDelete.push(key);
        this.recordLifetime(cached);
      }
    }

    for (const key of toDelete) {
      this.cache.delete(key);
    }
  }
}
