/**
 * BaseBehavior - Interface for agent behaviors
 *
 * All behaviors implement this interface to ensure consistent
 * execution and lifecycle management.
 *
 * Part of the AISystem decomposition (work-order: ai-system-refactor)
 */

import type { Entity, EntityImpl } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import type { AgentBehavior, AgentComponent } from '../../components/AgentComponent.js';
import type { SteeringComponent } from '../../components/SteeringComponent.js';
import type { MovementComponent } from '../../components/MovementComponent.js';
import type { VelocityComponent } from '../../components/VelocityComponent.js';
import { ComponentType as CT } from '../../types/ComponentType.js';
import { safeUpdateComponent } from '../../utils/componentUtils.js';
import { getPosition, getAgent } from '../../utils/componentHelpers.js';

/**
 * Centralized ChunkSpatialQuery instance for all behaviors.
 * Injected once at startup, shared by all behavior classes.
 */
let sharedChunkSpatialQuery: any | null = null;

/**
 * Inject ChunkSpatialQuery for all behaviors to use.
 * Call this once during game initialization.
 */
export function injectChunkSpatialQueryToBehaviors(spatialQuery: any): void {
  sharedChunkSpatialQuery = spatialQuery;
}

/**
 * Get the shared ChunkSpatialQuery instance.
 * Returns null if not yet injected (behaviors should fall back to global query).
 */
export function getSharedChunkSpatialQuery(): any | null {
  return sharedChunkSpatialQuery;
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

/**
 * Interface for agent behaviors.
 *
 * Behaviors are stateless - they read state from the entity's
 * behaviorState and write results back to it.
 */
export interface IBehavior {
  /** Behavior name (matches AgentBehavior type) */
  readonly name: AgentBehavior;

  /**
   * Execute the behavior for one tick.
   *
   * @param entity - The agent entity
   * @param world - The game world
   * @returns Result indicating completion status
   */
  execute(entity: EntityImpl, world: World): BehaviorResult | void;
}

/**
 * Abstract base class for behaviors with common utilities.
 */
export abstract class BaseBehavior implements IBehavior {
  abstract readonly name: AgentBehavior;

  abstract execute(entity: EntityImpl, world: World): BehaviorResult | void;

  /**
   * Calculate distance between two positions.
   */
  protected distance(
    a: { x: number; y: number },
    b: { x: number; y: number }
  ): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate squared distance between two positions.
   * Use this for distance comparisons to avoid expensive sqrt.
   *
   * Example: if (distanceSquared(a, b) < radius * radius) { ... }
   */
  protected distanceSquared(
    a: { x: number; y: number },
    b: { x: number; y: number }
  ): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return dx * dx + dy * dy;
  }

  /**
   * Get entities in radius using ChunkSpatialQuery (fast) with fallback to global query.
   * This is the preferred method for spatial queries in behaviors.
   *
   * @param world - The game world
   * @param x - Center X coordinate
   * @param y - Center Y coordinate
   * @param radius - Search radius in tiles
   * @param componentTypes - Component types to filter by (using CT enum)
   * @param options - Additional options (limit, excludeIds, filter)
   * @returns Array of {entity, distance, distanceSquared, position}
   */
  protected getEntitiesInRadius(
    world: World,
    x: number,
    y: number,
    radius: number,
    componentTypes: string[],
    options?: {
      limit?: number;
      excludeIds?: Set<string>;
      filter?: (entity: Entity) => boolean;
    }
  ): Array<{ entity: Entity; distance: number; distanceSquared: number; position: { x: number; y: number } }> {
    // Prefer world.spatialQuery (new unified approach)
    if (world.spatialQuery) {
      return world.spatialQuery.getEntitiesInRadius(x, y, radius, componentTypes, options);
    }

    // Legacy: Try shared injection (for transition period)
    if (sharedChunkSpatialQuery) {
      return sharedChunkSpatialQuery.getEntitiesInRadius(x, y, radius, componentTypes, options);
    }

    // Fallback: Global query (slower, scans all entities)
    return this.globalQueryEntitiesInRadius(world, x, y, radius, componentTypes, options);
  }

  /**
   * Find the nearest entity matching criteria.
   * Uses ChunkSpatialQuery when available for performance.
   */
  protected getNearestEntity(
    world: World,
    x: number,
    y: number,
    componentTypes: string[],
    options?: {
      maxRadius?: number;
      excludeIds?: Set<string>;
      filter?: (entity: Entity) => boolean;
    }
  ): { entity: Entity; distance: number; distanceSquared: number; position: { x: number; y: number } } | null {
    // Prefer world.spatialQuery (new unified approach)
    if (world.spatialQuery) {
      return world.spatialQuery.getNearestEntity(x, y, componentTypes, options);
    }

    // Legacy: Try shared injection (for transition period)
    if (sharedChunkSpatialQuery) {
      return sharedChunkSpatialQuery.getNearestEntity(x, y, componentTypes, options);
    }

    // Fallback: use getEntitiesInRadius and take first
    const results = this.getEntitiesInRadius(
      world, x, y,
      options?.maxRadius ?? 200,
      componentTypes,
      { ...options, limit: 1 }
    );
    return results[0] ?? null;
  }

  /**
   * Check if any entity exists in radius (early exit optimization).
   */
  protected hasEntityInRadius(
    world: World,
    x: number,
    y: number,
    radius: number,
    componentTypes: string[]
  ): boolean {
    // Prefer world.spatialQuery (new unified approach)
    if (world.spatialQuery) {
      return world.spatialQuery.hasEntityInRadius(x, y, radius, componentTypes);
    }

    // Legacy: Try shared injection (for transition period)
    if (sharedChunkSpatialQuery) {
      return sharedChunkSpatialQuery.hasEntityInRadius(x, y, radius, componentTypes);
    }

    // Fallback
    return this.getEntitiesInRadius(world, x, y, radius, componentTypes, { limit: 1 }).length > 0;
  }

  /**
   * Fallback global query when ChunkSpatialQuery is not available.
   * Scans all entities with matching components and filters by distance.
   */
  private globalQueryEntitiesInRadius(
    world: World,
    x: number,
    y: number,
    radius: number,
    componentTypes: string[],
    options?: {
      limit?: number;
      excludeIds?: Set<string>;
      filter?: (entity: Entity) => boolean;
    }
  ): Array<{ entity: Entity; distance: number; distanceSquared: number; position: { x: number; y: number } }> {
    // Build query with all component types
    let query = world.query();
    for (const ct of componentTypes) {
      query = query.with(ct);
    }
    query = query.with(CT.Position);

    const entities = query.executeEntities();
    const radiusSquared = radius * radius;
    const results: Array<{ entity: Entity; distance: number; distanceSquared: number; position: { x: number; y: number } }> = [];

    for (const entity of entities) {
      // Skip excluded entities
      if (options?.excludeIds?.has(entity.id)) continue;

      // Get position
      const posComp = (entity as EntityImpl).getComponent(CT.Position);
      if (!posComp || !('x' in posComp) || !('y' in posComp)) continue;
      const pos = { x: posComp.x as number, y: posComp.y as number };

      // Check distance (squared for performance)
      const dx = pos.x - x;
      const dy = pos.y - y;
      const distSq = dx * dx + dy * dy;

      if (distSq > radiusSquared) continue;

      // Apply custom filter
      if (options?.filter && !options.filter(entity)) continue;

      results.push({
        entity,
        distance: Math.sqrt(distSq),
        distanceSquared: distSq,
        position: { x: pos.x, y: pos.y }
      });

      // Early exit if limit reached and we don't need sorting
      if (options?.limit && results.length >= options.limit * 2) break;
    }

    // Sort by distance
    results.sort((a, b) => a.distanceSquared - b.distanceSquared);

    // Apply limit
    if (options?.limit) {
      return results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Set movement target for entity.
   */
  protected setMovementTarget(
    entity: EntityImpl,
    target: { x: number; y: number },
    speed?: number
  ): void {
    entity.updateComponent<MovementComponent>('movement', (current) => ({
      ...current,
      targetX: target.x,
      targetY: target.y,
      hasTarget: true,
      ...(speed !== undefined ? { speed } : {}),
    }));
  }

  /**
   * Stop entity movement (legacy - only clears target flags).
   * @deprecated Use disableSteeringAndStop() for complete velocity control.
   */
  protected stopMovement(entity: EntityImpl): void {
    entity.updateComponent<MovementComponent>('movement', (current) => ({
      ...current,
      hasTarget: false,
      targetX: 0,
      targetY: 0,
    }));
  }

  /**
   * Disable steering system so it doesn't override behavior-controlled movement.
   * Call this at the start of execute() for behaviors that control movement directly.
   */
  protected disableSteering(entity: EntityImpl): void {
    if (entity.hasComponent('steering')) {
      safeUpdateComponent<SteeringComponent>(entity, 'steering', () => ({
        behavior: 'none'
      }));
    }
  }

  /**
   * Set velocity on both MovementComponent and VelocityComponent.
   * This ensures MovementSystem doesn't override behavior-set velocities.
   */
  protected setVelocity(entity: EntityImpl, vx: number, vy: number): void {
    entity.updateComponent<MovementComponent>('movement', (current) => ({
      ...current,
      velocityX: vx,
      velocityY: vy,
    }));

    if (entity.hasComponent('velocity')) {
      safeUpdateComponent<VelocityComponent>(entity, 'velocity', () => ({
        vx,
        vy,
      }));
    }
  }

  /**
   * Stop all movement completely - clears velocity on both components.
   */
  protected stopAllMovement(entity: EntityImpl): void {
    this.setVelocity(entity, 0, 0);
  }

  /**
   * Disable steering and stop all movement.
   * Use this when switching behaviors or completing actions.
   */
  protected disableSteeringAndStop(entity: EntityImpl): void {
    this.disableSteering(entity);
    this.stopAllMovement(entity);
  }

  /**
   * Move toward a target position with smooth arrival.
   * Handles slowing down as the entity approaches the target.
   * Uses predictive velocity clamping to prevent oscillation from overshooting.
   *
   * @param entity - The entity to move
   * @param targetPos - Target position {x, y}
   * @param options - Movement options
   * @returns Distance to target
   */
  protected moveToward(
    entity: EntityImpl,
    targetPos: { x: number; y: number },
    options: {
      /** Base movement speed (default: from movement component) */
      speed?: number;
      /** Distance considered "arrived" (default: 1.5) */
      arrivalDistance?: number;
    } = {}
  ): number {
    const position = getPosition(entity);
    const movement = entity.getComponent<MovementComponent>('movement');

    if (!position || !movement) {
      return Infinity;
    }

    const dx = targetPos.x - position.x;
    const dy = targetPos.y - position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) {
      this.stopAllMovement(entity);
      this.stopMovement(entity); // Clear movement target
      return 0;
    }

    const baseSpeed = options.speed ?? movement.speed;
    const arrivalDistance = options.arrivalDistance ?? 1.5;

    // Set movement target so navigation UI can display it
    this.setMovementTarget(entity, targetPos, baseSpeed);

    // Hysteresis: if already stopped and within arrival zone, stay stopped
    // Only start moving again if we've drifted significantly outside (arrivalDistance + 0.5)
    const isCurrentlyStopped = Math.abs(movement.velocityX) < 0.01 && Math.abs(movement.velocityY) < 0.01;
    const hysteresisDistance = arrivalDistance + 0.5;

    if (isCurrentlyStopped && distance <= hysteresisDistance) {
      // Already stopped and close enough - don't restart movement
      return distance;
    }

    // If within arrival distance, stop immediately
    if (distance <= arrivalDistance) {
      this.stopAllMovement(entity);
      this.stopMovement(entity); // Clear movement target
      return distance;
    }

    // Calculate distance remaining beyond arrival zone
    const distanceToArrival = distance - arrivalDistance;

    // Use full speed - predictive clamping handles stopping smoothly
    let targetSpeed = baseSpeed;

    // Predictive velocity clamping: ensure we don't overshoot in one frame
    // This is the key anti-oscillation fix - we cap velocity so that even at
    // worst-case frame timing, we won't overshoot the arrival zone
    // Assume worst case: deltaTime=1/30 (low framerate) with 20x time acceleration
    const maxDeltaTime = (1 / 30) * 20; // ~0.67 seconds game time per frame
    const maxMovementThisFrame = targetSpeed * maxDeltaTime;

    // If we'd overshoot the arrival zone, clamp speed to exactly reach it
    if (maxMovementThisFrame > distanceToArrival) {
      // Set speed so that at max deltaTime, we'd just reach arrival distance
      targetSpeed = distanceToArrival / maxDeltaTime;
    }

    const vx = (dx / distance) * targetSpeed;
    const vy = (dy / distance) * targetSpeed;

    this.setVelocity(entity, vx, vy);

    return distance;
  }

  /**
   * Check if entity has reached position.
   */
  protected hasReached(
    entity: EntityImpl,
    target: { x: number; y: number },
    threshold: number = 1.5
  ): boolean {
    const position = getPosition(entity);
    if (!position) return false;
    return this.distance(position, target) <= threshold;
  }

  /**
   * Update behavior state.
   */
  protected updateState(
    entity: EntityImpl,
    updates: Record<string, unknown>
  ): void {
    entity.updateComponent<AgentComponent>('agent', (current) => ({
      ...current,
      behaviorState: {
        ...current.behaviorState,
        ...updates,
      },
    }));
  }

  /**
   * Get behavior state.
   */
  protected getState(entity: EntityImpl): Record<string, unknown> {
    const agent = getAgent(entity);
    return agent?.behaviorState ?? {};
  }

  /**
   * Mark behavior as complete.
   */
  protected complete(entity: EntityImpl): void {
    entity.updateComponent<AgentComponent>('agent', (current) => ({
      ...current,
      behaviorCompleted: true,
    }));
  }

  /**
   * Switch to a different behavior.
   *
   * Note: Will not switch if the queue is paused (autonomic override active).
   */
  protected switchTo(
    entity: EntityImpl,
    behavior: AgentBehavior,
    state?: Record<string, unknown>
  ): void {
    entity.updateComponent<AgentComponent>('agent', (current) => {
      // Don't switch behaviors if queue is paused (autonomic override)
      if (current.queuePaused) {
        return current;
      }

      return {
        ...current,
        behavior,
        behaviorState: state ?? {},
        behaviorCompleted: false,
      };
    });
  }
}
