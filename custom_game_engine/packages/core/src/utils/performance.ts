/**
 * Performance optimization utilities
 *
 * Helper functions and classes for writing high-performance game code.
 * See PERFORMANCE.md for usage guidelines.
 */

import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { ComponentType } from '../types.js';

/**
 * Position-like object for distance calculations
 */
export interface Position {
  x: number;
  y: number;
}

// ============================================================================
// Distance Utilities (avoid Math.sqrt)
// ============================================================================

/**
 * Calculate squared distance between two positions.
 * Use this instead of Math.sqrt when you only need to compare distances.
 *
 * @example
 * if (distanceSquared(pos1, pos2) < radius * radius) {
 *   // Entity is within radius
 * }
 */
export function distanceSquared(a: Position, b: Position): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/**
 * Check if position a is within radius of position b.
 * More efficient than calculating actual distance.
 *
 * @example
 * if (isWithinRadius(agent, target, 5)) {
 *   // Agent is within 5 tiles of target
 * }
 */
export function isWithinRadius(a: Position, b: Position, radius: number): boolean {
  const radiusSquared = radius * radius;
  return distanceSquared(a, b) <= radiusSquared;
}

/**
 * Calculate actual distance (uses Math.sqrt - avoid if possible).
 * Only use when you need the exact distance value.
 */
export function distance(a: Position, b: Position): number {
  return Math.sqrt(distanceSquared(a, b));
}

/**
 * Manhattan distance (sum of absolute differences).
 * Useful for grid-based movement and early-exit checks.
 * Much faster than Euclidean distance.
 *
 * @example
 * // Fast early exit before expensive distance calculation
 * if (manhattanDistance(pos1, pos2) > radius * 2) {
 *   continue; // Definitely too far
 * }
 * if (isWithinRadius(pos1, pos2, radius)) {
 *   // Actually within radius
 * }
 */
export function manhattanDistance(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

// ============================================================================
// Cached Query Utilities
// ============================================================================

/**
 * Automatically cached query that invalidates each tick.
 * Useful for queries that are called multiple times per tick.
 *
 * @example
 * export class MySystem implements System {
 *   private agents = new CachedQuery('agent', 'position');
 *
 *   update(world: World) {
 *     const agents = this.agents.get(world);
 *     // Query only executes once per tick, even if get() called multiple times
 *   }
 * }
 */
export class CachedQuery {
  private cache: ReadonlyArray<Entity> | null = null;
  private cacheValidTick = -1;
  private components: ComponentType[];

  constructor(...components: ComponentType[]) {
    this.components = components;
  }

  /**
   * Get entities matching the query.
   * Caches result for the current tick.
   */
  get(world: World): ReadonlyArray<Entity> {
    if (this.cacheValidTick !== world.tick) {
      let query = world.query();
      for (const component of this.components) {
        query = query.with(component);
      }
      this.cache = query.executeEntities();
      this.cacheValidTick = world.tick;
    }
    return this.cache!;
  }

  /**
   * Manually invalidate the cache.
   */
  invalidate(): void {
    this.cache = null;
    this.cacheValidTick = -1;
  }
}

/**
 * Cached singleton entity query (for time, weather, etc).
 * More efficient than CachedQuery for entities that rarely change.
 *
 * @example
 * export class MySystem implements System {
 *   private timeEntity = new SingletonCache('time');
 *
 *   update(world: World) {
 *     const time = this.timeEntity.get(world);
 *     // Only queries once, then uses entity ID lookup
 *   }
 * }
 */
export class SingletonCache {
  private entityId: string | null = null;

  constructor(private componentType: ComponentType) {}

  /**
   * Get the singleton entity, or null if not found.
   * After first lookup, uses fast entity ID lookup.
   */
  get(world: World): Entity | null {
    // First time: query for entity
    if (!this.entityId) {
      const entities = world.query().with(this.componentType).executeEntities();
      if (entities.length > 0) {
        this.entityId = entities[0]!.id;
      }
    }

    // Subsequent times: fast ID lookup
    if (this.entityId) {
      const entity = world.getEntity(this.entityId);
      if (!entity) {
        this.entityId = null; // Entity was destroyed
        return null;
      }
      return entity;
    }

    return null;
  }

  /**
   * Manually invalidate the cache (if entity changes).
   */
  invalidate(): void {
    this.entityId = null;
  }
}

// ============================================================================
// Event-Based Cache with Invalidation
// ============================================================================

export interface CacheConfig<T> {
  /** How to compute the cached value */
  compute: (world: World) => T;

  /** Event types that invalidate the cache */
  invalidateOn?: string[];

  /** Optional TTL in ticks */
  ttlTicks?: number;
}

/**
 * Generic cache with event-based invalidation and optional TTL.
 *
 * @example
 * export class MySystem implements System {
 *   private buildingCache = new EventCache<Entity[]>({
 *     compute: (world) => world.query().with('building').executeEntities(),
 *     invalidateOn: ['building:complete', 'building:destroyed'],
 *     ttlTicks: 60, // Refresh every second
 *   });
 *
 *   initialize(_world: World, eventBus: EventBus) {
 *     this.buildingCache.subscribe(eventBus);
 *   }
 *
 *   update(world: World) {
 *     const buildings = this.buildingCache.get(world);
 *   }
 * }
 */
export class EventCache<T> {
  private cache: T | null = null;
  private cacheValidUntilTick = 0;

  constructor(private config: CacheConfig<T>) {}

  /**
   * Subscribe to events that invalidate the cache.
   * Call this in system.initialize().
   */
  subscribe(eventBus: { subscribe: (event: string, handler: () => void) => void }): void {
    if (!this.config.invalidateOn) return;

    for (const eventType of this.config.invalidateOn) {
      eventBus.subscribe(eventType, () => {
        this.cache = null;
      });
    }
  }

  /**
   * Get the cached value, recomputing if necessary.
   */
  get(world: World): T {
    const needsRecompute =
      !this.cache ||
      (this.config.ttlTicks && world.tick >= this.cacheValidUntilTick);

    if (needsRecompute) {
      this.cache = this.config.compute(world);
      if (this.config.ttlTicks) {
        this.cacheValidUntilTick = world.tick + this.config.ttlTicks;
      }
    }

    return this.cache!;
  }

  /**
   * Manually invalidate the cache.
   */
  invalidate(): void {
    this.cache = null;
  }
}

// ============================================================================
// Performance Measurement
// ============================================================================

/**
 * Simple performance timer for measuring code execution.
 *
 * @example
 * const timer = new PerfTimer();
 * timer.start('expensive-operation');
 * doExpensiveWork();
 * const ms = timer.end('expensive-operation');
 * console.log(`Operation took ${ms}ms`);
 */
export class PerfTimer {
  private marks = new Map<string, number>();

  start(label: string): void {
    this.marks.set(label, performance.now());
  }

  end(label: string): number {
    const start = this.marks.get(label);
    if (!start) {
      throw new Error(`No start mark found for "${label}"`);
    }
    const duration = performance.now() - start;
    this.marks.delete(label);
    return duration;
  }

  /**
   * Measure a function execution time.
   */
  measure<T>(label: string, fn: () => T): { result: T; duration: number } {
    this.start(label);
    const result = fn();
    const duration = this.end(label);
    return { result, duration };
  }
}

/**
 * Track average performance over multiple executions.
 *
 * @example
 * const tracker = new PerfTracker();
 *
 * // In your update loop
 * tracker.record('system-update', () => {
 *   system.update(world, entities, dt);
 * });
 *
 * // Log stats periodically
 * console.log(tracker.getStats('system-update'));
 */
export class PerfTracker {
  private stats = new Map<string, { total: number; count: number; min: number; max: number }>();

  record<T>(label: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;

    let stat = this.stats.get(label);
    if (!stat) {
      stat = { total: 0, count: 0, min: Infinity, max: -Infinity };
      this.stats.set(label, stat);
    }

    stat.total += duration;
    stat.count++;
    stat.min = Math.min(stat.min, duration);
    stat.max = Math.max(stat.max, duration);

    return result;
  }

  getStats(label: string): { avg: number; min: number; max: number; count: number } | null {
    const stat = this.stats.get(label);
    if (!stat) return null;

    return {
      avg: stat.total / stat.count,
      min: stat.min,
      max: stat.max,
      count: stat.count,
    };
  }

  reset(label?: string): void {
    if (label) {
      this.stats.delete(label);
    } else {
      this.stats.clear();
    }
  }
}

// ============================================================================
// Object Pooling (Advanced)
// ============================================================================

/**
 * Simple object pool to reduce allocations.
 * Use sparingly - only for objects created thousands of times per frame.
 *
 * @example
 * const vectorPool = new ObjectPool(() => ({ x: 0, y: 0 }));
 *
 * function expensiveLoop() {
 *   const temp = vectorPool.acquire();
 *   temp.x = 5;
 *   temp.y = 10;
 *   // ... use temp
 *   vectorPool.release(temp);
 * }
 */
export class ObjectPool<T> {
  private pool: T[] = [];

  constructor(
    private factory: () => T,
    private reset?: (obj: T) => void,
    initialSize = 10
  ) {
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(factory());
    }
  }

  acquire(): T {
    return this.pool.pop() ?? this.factory();
  }

  release(obj: T): void {
    if (this.reset) {
      this.reset(obj);
    }
    this.pool.push(obj);
  }

  get size(): number {
    return this.pool.length;
  }
}
