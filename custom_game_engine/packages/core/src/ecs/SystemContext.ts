/**
 * SystemContext - "Pit of Success" API for System Development
 *
 * Provides pre-fetched components, cached queries, type-safe event emission,
 * and automatic subscription cleanup for systems.
 *
 * ## Problems Solved:
 * 1. Repeated getComponent() boilerplate in every system
 * 2. Easy to write O(N²) query patterns
 * 3. Forgetting SimulationScheduler.filterActiveEntities()
 * 4. Unsafe component access (missing null checks)
 * 5. Event subscription leaks
 * 6. Inconsistent throttling patterns
 *
 * ## Usage:
 * ```typescript
 * export class MySystem extends BaseSystem {
 *   readonly id = 'my_system';
 *   readonly priority = 100;
 *   readonly requiredComponents = [CT.Agent, CT.Position];
 *
 *   protected onUpdate(ctx: SystemContext): void {
 *     for (const entity of ctx.activeEntities) {
 *       // Pre-fetched, type-safe component access
 *       const comps = ctx.components(entity);
 *       const { agent, position } = comps.require('agent', 'position');
 *       const movement = comps.optional('movement');
 *
 *       // Cached spatial query (runs once per tick, not per entity)
 *       const nearby = ctx.getNearbyEntities(position, 50, [CT.Resource]);
 *
 *       // Type-safe event emission
 *       ctx.emit('agent:idle', { agentId: entity.id });
 *     }
 *   }
 * }
 * ```
 */

import type { Entity, EntityImpl } from './Entity.js';
import type { World, WorldMutator } from './World.js';
import type { EventBus } from '../events/EventBus.js';
import type { SystemEventManager } from '../events/TypedEventEmitter.js';
import type { GameEventMap, EventType } from '../events/EventMap.js';
import type { System, SystemMetadata } from './System.js';
import type { Component } from './Component.js';
import type {
  SystemId,
  ComponentType,
  EntityId,
  Tick,
} from '../types.js';
/**
 * Minimal interface for chunk spatial query to avoid circular package dependency.
 * The actual ChunkSpatialQuery class from @ai-village/world implements this interface.
 * Systems should check if methods exist at runtime before using.
 */
interface ChunkSpatialQuery {
  queryRadius?(
    x: number,
    y: number,
    radius: number,
    componentTypes?: ComponentType[]
  ): Entity[];
  getEntitiesInRadius?(
    x: number,
    y: number,
    radius: number,
    componentTypes: ComponentType[],
    options?: {
      limit?: number;
      excludeIds?: Set<EntityId>;
      filter?: (entity: Entity) => boolean;
    }
  ): Array<{ entity: Entity; distance: number; distanceSquared: number }>;
}

// ============================================================================
// Component Accessor
// ============================================================================

/**
 * Type-safe component accessor for an entity.
 * Provides require() for mandatory components and optional() for optional ones.
 */
export interface ComponentAccessor {
  /**
   * Get required components. Throws if any are missing.
   *
   * @param types - Component types to require
   * @returns Object with component values
   * @throws Error if any component is missing
   */
  require<K extends ComponentType>(
    ...types: K[]
  ): Record<K, Component>;

  /**
   * Get an optional component. Returns undefined if missing.
   */
  optional<T extends Component>(type: ComponentType): T | undefined;

  /**
   * Check if entity has a component.
   */
  has(type: ComponentType): boolean;

  /**
   * Update a component with type safety.
   */
  update<T extends Component>(
    type: ComponentType,
    updater: (current: T) => T
  ): void;
}

/**
 * Implementation of ComponentAccessor.
 */
export class ComponentAccessorImpl implements ComponentAccessor {
  constructor(
    private readonly entity: EntityImpl,
    private readonly systemId: SystemId
  ) {}

  require<K extends ComponentType>(...types: K[]): Record<K, Component> {
    const result: Record<string, Component> = {};

    for (const type of types) {
      const component = this.entity.getComponent(type);
      if (!component) {
        throw new Error(
          `[${this.systemId}] Entity ${this.entity.id} missing required component: ${type}`
        );
      }
      result[type] = component;
    }

    return result as Record<K, Component>;
  }

  optional<T extends Component>(type: ComponentType): T | undefined {
    return this.entity.getComponent<T>(type);
  }

  has(type: ComponentType): boolean {
    return this.entity.hasComponent(type);
  }

  update<T extends Component>(
    type: ComponentType,
    updater: (current: T) => T
  ): void {
    const current = this.entity.getComponent<T>(type);
    if (!current) {
      throw new Error(
        `[${this.systemId}] Cannot update missing component: ${type}`
      );
    }
    this.entity.updateComponent(type, updater);
  }
}

// ============================================================================
// Spatial Query Cache
// ============================================================================

/**
 * Entity with pre-computed distance information.
 */
export interface EntityWithDistance {
  entity: EntityImpl;
  distance: number;
  distanceSquared: number;
}

/**
 * Cached spatial query result.
 */
interface CachedQuery {
  tick: Tick;
  key: string;
  results: ReadonlyArray<EntityWithDistance>;
}

// ============================================================================
// System Context
// ============================================================================

/**
 * Context provided to systems during update().
 * Encapsulates common patterns with type safety and performance optimizations.
 */
export interface SystemContext {
  /** Current world (with mutation capabilities) */
  readonly world: WorldMutator;

  /** Current tick */
  readonly tick: Tick;

  /** Delta time since last update */
  readonly deltaTime: number;

  /** Event manager for type-safe emission and subscription */
  readonly events: SystemEventManager;

  /**
   * Active entities after SimulationScheduler filtering.
   * Only entities that should be processed this tick.
   */
  readonly activeEntities: ReadonlyArray<EntityImpl>;

  /**
   * Get component accessor for an entity.
   * Provides type-safe require/optional access.
   */
  components(entity: EntityImpl): ComponentAccessor;

  /**
   * Get entities within radius of a position.
   * Uses chunk-based spatial query for O(nearby) instead of O(all).
   * Results are cached per tick.
   *
   * @param center - Center position {x, y}
   * @param radius - Search radius
   * @param componentTypes - Required components for results
   * @param options - Additional filtering options
   */
  getNearbyEntities(
    center: { x: number; y: number },
    radius: number,
    componentTypes?: ComponentType[],
    options?: {
      filter?: (entity: EntityImpl) => boolean;
      maxResults?: number;
      excludeIds?: Set<EntityId>;
    }
  ): ReadonlyArray<EntityWithDistance>;

  /**
   * Get the single nearest entity to a position.
   */
  getNearestEntity(
    center: { x: number; y: number },
    radius: number,
    componentTypes?: ComponentType[],
    options?: {
      filter?: (entity: EntityImpl) => boolean;
      excludeIds?: Set<EntityId>;
    }
  ): EntityWithDistance | null;

  /**
   * Check if any entity exists within radius.
   * More efficient than getNearbyEntities when you only need existence check.
   */
  hasEntityInRadius(
    center: { x: number; y: number },
    radius: number,
    componentTypes?: ComponentType[]
  ): boolean;

  /**
   * Emit a typed event (queued for end of tick).
   */
  emit<T extends EventType>(
    type: T,
    data: GameEventMap[T],
    source?: EntityId
  ): void;

  /**
   * Get singleton entity by component type.
   * Cached after first lookup.
   */
  getSingleton<T extends Component>(componentType: ComponentType): T | null;
}

// ============================================================================
// System Context Implementation
// ============================================================================

/**
 * Implementation of SystemContext.
 */
export class SystemContextImpl implements SystemContext {
  readonly world: WorldMutator;
  readonly tick: Tick;
  readonly deltaTime: number;
  readonly events: SystemEventManager;
  readonly activeEntities: ReadonlyArray<EntityImpl>;

  private readonly systemId: SystemId;
  private readonly queryCache = new Map<string, CachedQuery>();
  private readonly singletonCache = new Map<ComponentType, Component | null>();
  private chunkSpatialQuery: ChunkSpatialQuery | null = null;

  constructor(
    world: WorldMutator,
    systemId: SystemId,
    events: SystemEventManager,
    entities: ReadonlyArray<Entity>,
    deltaTime: number,
    chunkSpatialQuery?: ChunkSpatialQuery,
    skipSimulationFiltering: boolean = false
  ) {
    this.world = world;
    this.systemId = systemId;
    this.events = events;
    this.tick = world.tick;
    this.deltaTime = deltaTime;
    this.chunkSpatialQuery = chunkSpatialQuery ?? null;

    // Apply SimulationScheduler filtering (unless explicitly skipped)
    // Systems that iterate dirtyTracker directly should skip this for performance
    if (skipSimulationFiltering) {
      this.activeEntities = entities as EntityImpl[];
    } else {
      const scheduler = world.simulationScheduler;
      if (scheduler?.filterActiveEntities) {
        this.activeEntities = scheduler.filterActiveEntities(
          entities,
          world.tick
        ) as EntityImpl[];
      } else {
        this.activeEntities = entities as EntityImpl[];
      }
    }
  }

  components(entity: EntityImpl): ComponentAccessor {
    return new ComponentAccessorImpl(entity, this.systemId);
  }

  getNearbyEntities(
    center: { x: number; y: number },
    radius: number,
    componentTypes?: ComponentType[],
    options?: {
      filter?: (entity: EntityImpl) => boolean;
      maxResults?: number;
      excludeIds?: Set<EntityId>;
    }
  ): ReadonlyArray<EntityWithDistance> {
    // Create cache key
    const cacheKey = `nearby:${center.x},${center.y}:${radius}:${componentTypes?.join(',') ?? ''}`;

    // Check cache
    const cached = this.queryCache.get(cacheKey);
    if (cached && cached.tick === this.tick) {
      // Apply runtime filters to cached results
      let results = cached.results;
      if (options?.filter) {
        results = results.filter((r) => options.filter!(r.entity));
      }
      if (options?.excludeIds) {
        results = results.filter((r) => !options.excludeIds!.has(r.entity.id));
      }
      if (options?.maxResults) {
        results = results.slice(0, options.maxResults);
      }
      return results;
    }

    // Perform query
    const radiusSq = radius * radius;
    const results: EntityWithDistance[] = [];

    // Use chunk spatial query if available
    if (this.chunkSpatialQuery && this.chunkSpatialQuery.queryRadius) {
      const entities = this.chunkSpatialQuery.queryRadius(
        center.x,
        center.y,
        radius,
        componentTypes
      );

      for (const entity of entities) {
        const posRaw = entity.getComponent('position');
        // Type guard: check that position has x and y coordinates
        if (!posRaw || typeof posRaw !== 'object' || !('x' in posRaw) || !('y' in posRaw)) continue;
        const pos = posRaw as { x: number; y: number };

        const dx = pos.x - center.x;
        const dy = pos.y - center.y;
        const distSq = dx * dx + dy * dy;

        if (distSq <= radiusSq) {
          results.push({
            entity: entity as EntityImpl,
            distanceSquared: distSq,
            distance: Math.sqrt(distSq),
          });
        }
      }
    } else {
      // Fallback to full scan (less efficient)
      for (const entity of this.world.entities.values()) {
        // Check component requirements
        if (componentTypes) {
          let hasAll = true;
          for (const ct of componentTypes) {
            if (!entity.hasComponent(ct)) {
              hasAll = false;
              break;
            }
          }
          if (!hasAll) continue;
        }

        const posRaw = entity.getComponent('position');
        // Type guard: check that position has x and y coordinates
        if (!posRaw || typeof posRaw !== 'object' || !('x' in posRaw) || !('y' in posRaw)) continue;
        const pos = posRaw as { x: number; y: number };

        const dx = pos.x - center.x;
        const dy = pos.y - center.y;
        const distSq = dx * dx + dy * dy;

        if (distSq <= radiusSq) {
          results.push({
            entity: entity as EntityImpl,
            distanceSquared: distSq,
            distance: Math.sqrt(distSq),
          });
        }
      }
    }

    // Sort by distance
    results.sort((a, b) => a.distanceSquared - b.distanceSquared);

    // Cache base results (before runtime filters)
    this.queryCache.set(cacheKey, {
      tick: this.tick,
      key: cacheKey,
      results,
    });

    // Apply runtime filters
    let filtered = results;
    if (options?.filter) {
      filtered = filtered.filter((r) => options.filter!(r.entity));
    }
    if (options?.excludeIds) {
      filtered = filtered.filter((r) => !options.excludeIds!.has(r.entity.id));
    }
    if (options?.maxResults) {
      filtered = filtered.slice(0, options.maxResults);
    }

    return filtered;
  }

  getNearestEntity(
    center: { x: number; y: number },
    radius: number,
    componentTypes?: ComponentType[],
    options?: {
      filter?: (entity: EntityImpl) => boolean;
      excludeIds?: Set<EntityId>;
    }
  ): EntityWithDistance | null {
    const results = this.getNearbyEntities(center, radius, componentTypes, {
      ...options,
      maxResults: 1,
    });
    return results[0] ?? null;
  }

  hasEntityInRadius(
    center: { x: number; y: number },
    radius: number,
    componentTypes?: ComponentType[]
  ): boolean {
    return this.getNearbyEntities(center, radius, componentTypes, {
      maxResults: 1,
    }).length > 0;
  }

  emit<T extends EventType>(
    type: T,
    data: GameEventMap[T],
    source?: EntityId
  ): void {
    this.events.emit(type, data, source);
  }

  getSingleton<T extends Component>(componentType: ComponentType): T | null {
    // Check cache
    if (this.singletonCache.has(componentType)) {
      return this.singletonCache.get(componentType) as T | null;
    }

    // Find singleton
    for (const entity of this.world.entities.values()) {
      const component = entity.getComponent<T>(componentType);
      if (component) {
        this.singletonCache.set(componentType, component);
        return component;
      }
    }

    this.singletonCache.set(componentType, null);
    return null;
  }

  /**
   * Inject chunk spatial query (called by system registry).
   */
  setChunkSpatialQuery(query: ChunkSpatialQuery): void {
    this.chunkSpatialQuery = query;
  }
}

// ============================================================================
// Base System Class
// ============================================================================

/**
 * Base class for systems that use SystemContext.
 *
 * Provides:
 * - Automatic event manager setup and cleanup
 * - Throttling support
 * - SystemContext creation
 *
 * Subclasses implement onUpdate() instead of update().
 */
export abstract class BaseSystem implements System {
  abstract readonly id: SystemId;
  abstract readonly priority: number;
  abstract readonly requiredComponents: ReadonlyArray<ComponentType>;

  /**
   * Components that must exist in the world for this system to run.
   * Override this in subclasses to enable lazy activation.
   *
   * If specified and none of these components exist anywhere in the world,
   * the system is skipped entirely (O(1) check in GameLoop).
   *
   * Example:
   * ```typescript
   * readonly activationComponents = ['player_control'] as const;
   * ```
   */
  readonly activationComponents?: ReadonlyArray<ComponentType>;

  readonly metadata?: SystemMetadata;

  protected events!: SystemEventManager;
  protected world!: WorldMutator;

  private lastUpdateTick = -Infinity;
  private chunkSpatialQuery: ChunkSpatialQuery | null = null;

  /**
   * Override this to set throttle interval in ticks.
   * Default: 0 (run every tick)
   */
  protected readonly throttleInterval: number = 0;

  /**
   * Skip SimulationScheduler filtering in SystemContext.
   * Set to true for systems that don't use ctx.activeEntities
   * (e.g., systems that iterate dirtyTracker directly).
   * This avoids O(entities * components * agents) filtering overhead.
   * Default: false
   */
  protected readonly skipSimulationFiltering: boolean = false;

  /**
   * Called once when system is registered.
   * Override onInitialize() instead of this method.
   */
  async initialize(world: WorldMutator, eventBus: EventBus): Promise<void> {
    this.world = world;

    // Import SystemEventManager dynamically to avoid circular deps
    const { SystemEventManager } = await import('../events/TypedEventEmitter.js');
    this.events = new SystemEventManager(eventBus, this.id);

    await this.onInitialize?.(world, eventBus);
  }

  /**
   * Override to add custom initialization logic.
   */
  protected onInitialize?(world: WorldMutator, eventBus: EventBus): void | Promise<void>;

  /**
   * Main update loop. Creates SystemContext and delegates to onUpdate().
   */
  update(
    world: WorldMutator,
    entities: ReadonlyArray<Entity>,
    deltaTime: number
  ): void {
    // Skip updates until initialize() has completed (events is set asynchronously)
    if (!this.events) {
      return;
    }

    // Throttling
    if (this.throttleInterval > 0) {
      if (world.tick - this.lastUpdateTick < this.throttleInterval) {
        return;
      }
      this.lastUpdateTick = world.tick;
    }

    // Create context
    const ctx = new SystemContextImpl(
      world,
      this.id,
      this.events,
      entities,
      deltaTime,
      this.chunkSpatialQuery ?? undefined,
      this.skipSimulationFiltering
    );

    // Delegate to subclass
    this.onUpdate(ctx);
  }

  /**
   * Override this method to implement system logic.
   */
  protected abstract onUpdate(ctx: SystemContext): void;

  /**
   * Called when system is unregistered.
   */
  cleanup(): void {
    this.events?.cleanup();
    this.onCleanup?.();
  }

  /**
   * Override to add custom cleanup logic.
   */
  protected onCleanup?(): void;

  /**
   * Inject chunk spatial query (called by system registry or main.ts).
   */
  setChunkSpatialQuery(query: ChunkSpatialQuery): void {
    this.chunkSpatialQuery = query;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a SystemContext for use in existing systems.
 * Use this when migrating existing systems incrementally.
 */
export async function createSystemContext(
  world: WorldMutator,
  systemId: SystemId,
  eventBus: EventBus,
  entities: ReadonlyArray<Entity>,
  deltaTime: number,
  chunkSpatialQuery?: ChunkSpatialQuery,
  skipSimulationFiltering: boolean = false
): Promise<SystemContext> {
  const { SystemEventManager } = await import('../events/TypedEventEmitter.js');
  const events = new SystemEventManager(eventBus, systemId);

  return new SystemContextImpl(
    world,
    systemId,
    events,
    entities,
    deltaTime,
    chunkSpatialQuery,
    skipSimulationFiltering
  );
}
