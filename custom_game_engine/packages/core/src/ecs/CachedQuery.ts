import type { World } from './World.js';
import type { Entity } from './Entity.js';
import type { ComponentType } from '../types.js';

/**
 * Utility for caching world.query() results to avoid expensive repeated queries.
 *
 * Queries are cached based on tick and automatically invalidate after TTL.
 *
 * @example
 * // In a system class:
 * private agentQuery = new CachedQuery<AgentComponent>();
 *
 * update(world: World, entities: Entity[]): void {
 *   // Query is cached for 20 ticks (1 second)
 *   const agents = this.agentQuery
 *     .from(world)
 *     .with(CT.Agent, CT.Position)
 *     .ttl(20)
 *     .execute();
 *
 *   for (const agent of agents) {
 *     // Use cached results
 *   }
 * }
 *
 * @example
 * // One-liner for simple cases
 * const buildings = CachedQuery.simple(world, [CT.Building, CT.Position], 50);
 */
export class CachedQuery<T = Entity> {
  private cache: T[] | null = null;
  private cacheValidUntilTick = 0;
  private world: World | null = null;
  private componentTypes: ComponentType[] = [];
  private ttlTicks = 20; // Default 1 second at 20 TPS

  /**
   * Set the world to query from
   */
  from(world: World): this {
    this.world = world;
    return this;
  }

  /**
   * Set component types to query for
   */
  with(...componentTypes: ComponentType[]): this {
    this.componentTypes = componentTypes;
    return this;
  }

  /**
   * Set cache TTL in ticks (default 20 = 1 second)
   */
  ttl(ticks: number): this {
    this.ttlTicks = ticks;
    return this;
  }

  /**
   * Execute query, returning cached results if still valid
   */
  execute(): T[] {
    if (!this.world) {
      throw new Error('CachedQuery: must call from(world) first');
    }
    if (this.componentTypes.length === 0) {
      throw new Error('CachedQuery: must call with(...types) first');
    }

    if (this.cache && this.world.tick < this.cacheValidUntilTick) {
      return this.cache;
    }

    // Build and execute query
    let query = this.world.query();
    for (const ct of this.componentTypes) {
      query = query.with(ct);
    }
    this.cache = query.execute() as T[];
    this.cacheValidUntilTick = this.world.tick + this.ttlTicks;

    return this.cache;
  }

  /**
   * Force cache invalidation (call when you know data changed)
   */
  invalidate(): void {
    this.cache = null;
    this.cacheValidUntilTick = 0;
  }

  /**
   * Simple one-liner for common cases
   */
  static simple(world: World, componentTypes: ComponentType[], ttlTicks = 20): Entity[] {
    const query = new CachedQuery<Entity>();
    return query
      .from(world)
      .with(...componentTypes)
      .ttl(ttlTicks)
      .execute();
  }
}

/**
 * Global query cache for sharing cached queries across systems.
 * Useful for common queries like "all agents" or "all buildings".
 *
 * @example
 * // In any system:
 * const allAgents = QueryCache.get(world, 'all_agents', [CT.Agent, CT.Position], 20);
 */
export class QueryCache {
  private static caches = new Map<string, CachedQuery>();

  /**
   * Get or create a cached query by key
   */
  static get(world: World, key: string, componentTypes: ComponentType[], ttlTicks = 20): Entity[] {
    let cachedQuery = this.caches.get(key);

    if (!cachedQuery) {
      cachedQuery = new CachedQuery<Entity>();
      this.caches.set(key, cachedQuery);
    }

    return cachedQuery
      .from(world)
      .with(...componentTypes)
      .ttl(ttlTicks)
      .execute();
  }

  /**
   * Invalidate specific cache
   */
  static invalidate(key: string): void {
    const cachedQuery = this.caches.get(key);
    if (cachedQuery) {
      cachedQuery.invalidate();
    }
  }

  /**
   * Invalidate all caches (call on major world changes)
   */
  static invalidateAll(): void {
    for (const cachedQuery of this.caches.values()) {
      cachedQuery.invalidate();
    }
  }

  /**
   * Clear all cached queries (useful for testing or major state resets)
   */
  static clear(): void {
    this.caches.clear();
  }
}
