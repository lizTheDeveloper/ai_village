/**
 * BehaviorContext - Provides behaviors with pre-wired dependencies
 *
 * This is the "pit of success" API for behaviors. Instead of passing raw
 * `entity` and `world` objects (which tempt developers to use slow global queries),
 * we provide a context with the correct, performant APIs already wired up.
 *
 * Usage in behaviors:
 * ```typescript
 * execute(ctx: BehaviorContext): BehaviorResult {
 *   // Get nearby food - uses ChunkSpatialQuery automatically
 *   const nearbyFood = ctx.getEntitiesInRadius(50, [CT.Plant, CT.Building]);
 *
 *   // Move toward target - uses pre-fetched position
 *   ctx.moveToward(nearbyFood[0].position);
 * }
 * ```
 */

import type { Entity, EntityImpl } from '../ecs/Entity.js';
import type { World } from '../ecs/World.js';
import type { Component } from '../ecs/Component.js';
import type { AgentComponent, AgentBehavior } from '../components/AgentComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { MovementComponent } from '../components/MovementComponent.js';
import type { InventoryComponent } from '../components/InventoryComponent.js';
import type { NeedsComponent } from '../components/NeedsComponent.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { CHUNK_SIZE } from '../types.js';
import { getSharedChunkSpatialQuery } from './behaviors/BaseBehavior.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Result of a spatial query - entity with distance info
 */
export interface EntityWithDistance {
  entity: Entity;
  distance: number;
  distanceSquared: number;
  position: { x: number; y: number };
}

/**
 * Options for spatial queries
 */
export interface SpatialQueryOptions {
  /** Maximum number of results to return */
  limit?: number;
  /** Entity IDs to exclude from results */
  excludeIds?: Set<string>;
  /** Custom filter function */
  filter?: (entity: Entity) => boolean;
}

/**
 * Options for movement
 */
export interface MoveOptions {
  /** Movement speed override */
  speed?: number;
  /** Distance at which to stop (default: 1.5) */
  arrivalDistance?: number;
}

/**
 * BehaviorContext - The primary API for behaviors
 *
 * This interface provides everything a behavior needs without exposing
 * dangerous/slow APIs like world.query().
 */
export interface BehaviorContext {
  // ============================================================================
  // Core References (read-only access to entity and world)
  // ============================================================================

  /** The entity executing this behavior */
  readonly entity: EntityImpl;

  /** Current game tick */
  readonly tick: number;

  // ============================================================================
  // Pre-fetched Components (commonly needed, fetched once)
  // ============================================================================

  /** Entity's current position */
  readonly position: Readonly<PositionComponent>;

  /** Entity's agent component */
  readonly agent: Readonly<AgentComponent>;

  /** Entity's movement component (if present) */
  readonly movement: Readonly<MovementComponent> | null;

  /** Entity's inventory (if present) */
  readonly inventory: Readonly<InventoryComponent> | null;

  /** Entity's needs (if present) */
  readonly needs: Readonly<NeedsComponent> | null;

  // ============================================================================
  // Spatial Queries (use ChunkSpatialQuery, fall back to global)
  // ============================================================================

  /**
   * Find entities within radius. Uses optimized chunk-based queries.
   *
   * @param radius - Search radius in tiles
   * @param componentTypes - Component types to filter by (use CT enum)
   * @param options - Query options (limit, excludeIds, filter)
   * @returns Entities sorted by distance (closest first)
   *
   * @example
   * const nearbyPlants = ctx.getEntitiesInRadius(30, [CT.Plant], { limit: 5 });
   */
  getEntitiesInRadius(
    radius: number,
    componentTypes: string[],
    options?: SpatialQueryOptions
  ): EntityWithDistance[];

  /**
   * Find the nearest entity matching criteria.
   *
   * @param componentTypes - Component types to filter by
   * @param maxRadius - Maximum search radius (default: 200)
   * @param options - Query options
   * @returns Nearest entity or null
   *
   * @example
   * const nearestStorage = ctx.getNearestEntity([CT.Building, CT.Inventory], 100);
   */
  getNearestEntity(
    componentTypes: string[],
    maxRadius?: number,
    options?: Omit<SpatialQueryOptions, 'limit'>
  ): EntityWithDistance | null;

  /**
   * Check if any entity exists in radius (early exit, fast).
   *
   * @example
   * if (ctx.hasEntityInRadius(10, [CT.Threat])) {
   *   return ctx.switchTo('flee');
   * }
   */
  hasEntityInRadius(
    radius: number,
    componentTypes: string[]
  ): boolean;

  /**
   * Count entities in radius (no allocation, returns number).
   */
  countEntitiesInRadius(
    radius: number,
    componentTypes: string[]
  ): number;

  // ============================================================================
  // Distance Utilities (squared by default for performance)
  // ============================================================================

  /**
   * Calculate squared distance to a position.
   * Use this for comparisons - avoids expensive sqrt.
   *
   * @example
   * if (ctx.distanceSquaredTo(target) < 25) { // Within 5 tiles
   *   ctx.stopMovement();
   * }
   */
  distanceSquaredTo(target: { x: number; y: number }): number;

  /**
   * Calculate actual distance to a position.
   * Only use when you need the real distance value (e.g., for display).
   */
  distanceTo(target: { x: number; y: number }): number;

  /**
   * Check if within range of a target (uses squared distance internally).
   */
  isWithinRange(target: { x: number; y: number }, range: number): boolean;

  // ============================================================================
  // Movement Control
  // ============================================================================

  /**
   * Move toward a target position with smooth arrival.
   *
   * @returns Distance to target
   */
  moveToward(target: { x: number; y: number }, options?: MoveOptions): number;

  /**
   * Set velocity directly.
   */
  setVelocity(vx: number, vy: number): void;

  /**
   * Stop all movement.
   */
  stopMovement(): void;

  // ============================================================================
  // Behavior State Management
  // ============================================================================

  /**
   * Get behavior state value.
   */
  getState<T = unknown>(key: string): T | undefined;

  /**
   * Get all behavior state.
   */
  getAllState(): Record<string, unknown>;

  /**
   * Update behavior state (merged with existing).
   */
  updateState(updates: Record<string, unknown>): void;

  /**
   * Set agent's last thought (for UI/debugging).
   */
  setThought(thought: string): void;

  // ============================================================================
  // Behavior Transitions
  // ============================================================================

  /**
   * Switch to a different behavior.
   *
   * @returns BehaviorResult indicating the switch
   */
  switchTo(behavior: AgentBehavior, state?: Record<string, unknown>): BehaviorResult;

  /**
   * Mark behavior as complete.
   *
   * @returns BehaviorResult indicating completion
   */
  complete(reason?: string): BehaviorResult;

  // ============================================================================
  // Component Access (type-safe)
  // ============================================================================

  /**
   * Get a component from this entity.
   * Prefer pre-fetched components (position, agent, etc.) when available.
   */
  getComponent<T extends Component>(type: string): T | undefined;

  /**
   * Update a component on this entity.
   */
  updateComponent<T extends Component>(type: string, updater: (current: T) => T): void;

  /**
   * Check if entity has a component.
   */
  hasComponent(type: string): boolean;

  // ============================================================================
  // Event Emission
  // ============================================================================

  /**
   * Emit an event.
   */
  emit(event: { type: string; source?: string; data?: unknown }): void;

  // ============================================================================
  // World Access (limited, read-only where possible)
  // ============================================================================

  /**
   * Get another entity by ID.
   */
  getEntity(id: string): Entity | undefined;

  /**
   * Get game time info.
   */
  readonly gameTime: { day: number; hour: number; season: string };
}

/**
 * Result of behavior execution
 */
export interface BehaviorResult {
  /** Whether the behavior completed this tick */
  complete: boolean;
  /** New behavior to transition to (if any) */
  nextBehavior?: AgentBehavior;
  /** State to pass to next behavior */
  nextState?: Record<string, unknown>;
  /** Reason for completion/transition */
  reason?: string;
}

// ============================================================================
// Implementation
// ============================================================================

/**
 * Implementation of BehaviorContext
 */
export class BehaviorContextImpl implements BehaviorContext {
  readonly entity: EntityImpl;
  readonly tick: number;
  readonly position: Readonly<PositionComponent>;
  readonly agent: Readonly<AgentComponent>;
  readonly movement: Readonly<MovementComponent> | null;
  readonly inventory: Readonly<InventoryComponent> | null;
  readonly needs: Readonly<NeedsComponent> | null;
  readonly gameTime: { day: number; hour: number; season: string };

  private readonly world: World;
  private readonly spatialQuery: any | null;

  constructor(entity: EntityImpl, world: World) {
    this.entity = entity;
    this.world = world;
    this.tick = world.tick;
    this.spatialQuery = getSharedChunkSpatialQuery();

    // Pre-fetch commonly needed components
    const position = entity.getComponent<PositionComponent>(CT.Position);
    const agent = entity.getComponent<AgentComponent>(CT.Agent);

    if (!position) {
      throw new Error(`[BehaviorContext] Entity ${entity.id} missing Position component`);
    }
    if (!agent) {
      throw new Error(`[BehaviorContext] Entity ${entity.id} missing Agent component`);
    }

    this.position = position;
    this.agent = agent;
    this.movement = entity.getComponent<MovementComponent>(CT.Movement) ?? null;
    this.inventory = entity.getComponent<InventoryComponent>(CT.Inventory) ?? null;
    this.needs = entity.getComponent<NeedsComponent>(CT.Needs) ?? null;

    // Game time
    this.gameTime = {
      day: world.gameTime.day,
      hour: world.gameTime.hour,
      season: world.gameTime.season,
    };
  }

  // ============================================================================
  // Spatial Queries
  // ============================================================================

  getEntitiesInRadius(
    radius: number,
    componentTypes: string[],
    options?: SpatialQueryOptions
  ): EntityWithDistance[] {
    if (this.spatialQuery) {
      return this.spatialQuery.getEntitiesInRadius(
        this.position.x,
        this.position.y,
        radius,
        componentTypes,
        options
      );
    }

    // Fallback to global query
    return this.globalQueryEntitiesInRadius(radius, componentTypes, options);
  }

  getNearestEntity(
    componentTypes: string[],
    maxRadius: number = 200,
    options?: Omit<SpatialQueryOptions, 'limit'>
  ): EntityWithDistance | null {
    if (this.spatialQuery) {
      return this.spatialQuery.getNearestEntity(
        this.position.x,
        this.position.y,
        componentTypes,
        { maxRadius, ...options }
      );
    }

    const results = this.getEntitiesInRadius(maxRadius, componentTypes, { ...options, limit: 1 });
    return results[0] ?? null;
  }

  hasEntityInRadius(radius: number, componentTypes: string[]): boolean {
    if (this.spatialQuery) {
      return this.spatialQuery.hasEntityInRadius(
        this.position.x,
        this.position.y,
        radius,
        componentTypes
      );
    }

    return this.getEntitiesInRadius(radius, componentTypes, { limit: 1 }).length > 0;
  }

  countEntitiesInRadius(radius: number, componentTypes: string[]): number {
    if (this.spatialQuery) {
      return this.spatialQuery.countEntitiesInRadius(
        this.position.x,
        this.position.y,
        radius,
        componentTypes
      );
    }

    return this.getEntitiesInRadius(radius, componentTypes).length;
  }

  private globalQueryEntitiesInRadius(
    radius: number,
    componentTypes: string[],
    options?: SpatialQueryOptions
  ): EntityWithDistance[] {
    let query = this.world.query();
    for (const ct of componentTypes) {
      query = query.with(ct);
    }
    query = query.with(CT.Position);

    const entities = query.executeEntities();
    const radiusSquared = radius * radius;
    const results: EntityWithDistance[] = [];

    for (const entity of entities) {
      if (options?.excludeIds?.has(entity.id)) continue;

      const pos = (entity as EntityImpl).getComponent<PositionComponent>(CT.Position);
      if (!pos) continue;

      const dx = pos.x - this.position.x;
      const dy = pos.y - this.position.y;
      const distSq = dx * dx + dy * dy;

      if (distSq > radiusSquared) continue;
      if (options?.filter && !options.filter(entity)) continue;

      results.push({
        entity,
        distance: Math.sqrt(distSq),
        distanceSquared: distSq,
        position: { x: pos.x, y: pos.y },
      });
    }

    results.sort((a, b) => a.distanceSquared - b.distanceSquared);

    if (options?.limit) {
      return results.slice(0, options.limit);
    }

    return results;
  }

  // ============================================================================
  // Distance Utilities
  // ============================================================================

  distanceSquaredTo(target: { x: number; y: number }): number {
    const dx = target.x - this.position.x;
    const dy = target.y - this.position.y;
    return dx * dx + dy * dy;
  }

  distanceTo(target: { x: number; y: number }): number {
    return Math.sqrt(this.distanceSquaredTo(target));
  }

  isWithinRange(target: { x: number; y: number }, range: number): boolean {
    return this.distanceSquaredTo(target) <= range * range;
  }

  // ============================================================================
  // Movement Control
  // ============================================================================

  moveToward(target: { x: number; y: number }, options?: MoveOptions): number {
    if (!this.movement) {
      return this.distanceTo(target);
    }

    const dx = target.x - this.position.x;
    const dy = target.y - this.position.y;
    const distanceSquared = dx * dx + dy * dy;
    const distance = Math.sqrt(distanceSquared);

    if (distance === 0) {
      this.stopMovement();
      return 0;
    }

    const arrivalDistance = options?.arrivalDistance ?? 1.5;

    if (distance <= arrivalDistance) {
      this.stopMovement();
      return distance;
    }

    const speed = options?.speed ?? this.movement.speed;
    const vx = (dx / distance) * speed;
    const vy = (dy / distance) * speed;

    this.setVelocity(vx, vy);

    return distance;
  }

  setVelocity(vx: number, vy: number): void {
    this.entity.updateComponent<MovementComponent>(CT.Movement, (current) => ({
      ...current,
      velocityX: vx,
      velocityY: vy,
    }));
  }

  stopMovement(): void {
    this.setVelocity(0, 0);
  }

  // ============================================================================
  // Behavior State Management
  // ============================================================================

  getState<T = unknown>(key: string): T | undefined {
    return this.agent.behaviorState?.[key] as T | undefined;
  }

  getAllState(): Record<string, unknown> {
    return this.agent.behaviorState ?? {};
  }

  updateState(updates: Record<string, unknown>): void {
    this.entity.updateComponent<AgentComponent>(CT.Agent, (current) => ({
      ...current,
      behaviorState: {
        ...current.behaviorState,
        ...updates,
      },
    }));
  }

  setThought(thought: string): void {
    this.entity.updateComponent<AgentComponent>(CT.Agent, (current) => ({
      ...current,
      lastThought: thought,
    }));
  }

  // ============================================================================
  // Behavior Transitions
  // ============================================================================

  switchTo(behavior: AgentBehavior, state?: Record<string, unknown>): BehaviorResult {
    this.entity.updateComponent<AgentComponent>(CT.Agent, (current) => ({
      ...current,
      behavior,
      behaviorState: state ?? {},
      behaviorCompleted: false,
    }));

    return {
      complete: false,
      nextBehavior: behavior,
      nextState: state,
    };
  }

  complete(reason?: string): BehaviorResult {
    this.entity.updateComponent<AgentComponent>(CT.Agent, (current) => ({
      ...current,
      behaviorCompleted: true,
    }));

    return {
      complete: true,
      reason,
    };
  }

  // ============================================================================
  // Component Access
  // ============================================================================

  getComponent<T extends Component>(type: string): T | undefined {
    return this.entity.getComponent<T>(type);
  }

  updateComponent<T extends Component>(type: string, updater: (current: T) => T): void {
    this.entity.updateComponent<T>(type, updater);
  }

  hasComponent(type: string): boolean {
    return this.entity.hasComponent(type);
  }

  // ============================================================================
  // Event Emission
  // ============================================================================

  emit(event: { type: string; source?: string; data?: unknown }): void {
    this.world.eventBus.emit({
      type: event.type as any,
      source: event.source ?? this.entity.id,
      data: event.data as any,
    });
  }

  // ============================================================================
  // World Access
  // ============================================================================

  getEntity(id: string): Entity | undefined {
    return this.world.getEntity(id);
  }
}

/**
 * Create a BehaviorContext for an entity.
 */
export function createBehaviorContext(entity: EntityImpl, world: World): BehaviorContext {
  return new BehaviorContextImpl(entity, world);
}
