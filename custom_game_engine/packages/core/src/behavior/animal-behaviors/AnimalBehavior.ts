/**
 * AnimalBehavior - Base interface for animal behaviors
 *
 * Part of Phase 5 of the AISystem decomposition (work-order: ai-system-refactor)
 */

import type { EntityImpl } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import type { AnimalComponent, AnimalState } from '../../components/AnimalComponent.js';

/**
 * Result from executing an animal behavior
 */
export interface AnimalBehaviorResult {
  /** Whether the behavior is complete */
  complete: boolean;
  /** New state to transition to (if any) */
  newState?: AnimalState;
  /** Reason for completion/transition */
  reason?: string;
}

/**
 * Base interface for animal behaviors.
 *
 * Animal behaviors are simpler than agent behaviors - they operate on
 * instinct rather than planning. They use the same targeting and movement
 * services as agents but with simpler decision logic.
 */
export interface IAnimalBehavior {
  /** Behavior name (matches AnimalState) */
  readonly name: AnimalState;

  /**
   * Execute the behavior for one tick.
   *
   * @param entity - The animal entity
   * @param world - The game world
   * @param animal - The animal component
   * @returns Result indicating completion status
   */
  execute(entity: EntityImpl, world: World, animal: AnimalComponent): AnimalBehaviorResult;

  /**
   * Check if this behavior can start given current state.
   *
   * @param entity - The animal entity
   * @param animal - The animal component
   * @returns true if behavior can start
   */
  canStart(entity: EntityImpl, animal: AnimalComponent): boolean;

  /**
   * Get the priority of this behavior (higher = more important).
   * Used when multiple behaviors are possible.
   */
  getPriority(animal: AnimalComponent): number;
}

/**
 * Abstract base class for animal behaviors.
 * Provides common utility methods.
 */
export abstract class BaseAnimalBehavior implements IAnimalBehavior {
  abstract readonly name: AnimalState;

  abstract execute(
    entity: EntityImpl,
    world: World,
    animal: AnimalComponent
  ): AnimalBehaviorResult;

  abstract canStart(entity: EntityImpl, animal: AnimalComponent): boolean;

  abstract getPriority(animal: AnimalComponent): number;

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
   * Move entity toward a target position.
   * Sets velocityX/Y based on direction to target so MovementSystem processes it.
   * @throws Error if entity lacks movement or position component
   */
  protected moveToward(
    entity: EntityImpl,
    target: { x: number; y: number },
    speed: number = 1.0
  ): void {
    const movement = entity.getComponent('movement');
    if (!movement) {
      throw new Error(
        `Animal ${entity.id} missing required 'movement' component. ` +
        `Ensure MovementComponent is added during spawning.`
      );
    }

    const position = entity.getComponent('position') as { x: number; y: number } | undefined;
    if (!position) {
      throw new Error(
        `Animal ${entity.id} missing required 'position' component. ` +
        `Ensure PositionComponent is added during spawning.`
      );
    }

    // Calculate direction to target
    const dx = target.x - position.x;
    const dy = target.y - position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Calculate velocity (normalized direction * speed)
    let velocityX = 0;
    let velocityY = 0;
    if (dist > 0.1) {
      velocityX = (dx / dist) * speed;
      velocityY = (dy / dist) * speed;
    }

    entity.updateComponent('movement', (current: any) => ({
      ...current,
      targetX: target.x,
      targetY: target.y,
      velocityX,
      velocityY,
      speed,
    }));
  }

  /**
   * Stop entity movement.
   * @throws Error if entity lacks movement component
   */
  protected stopMovement(entity: EntityImpl): void {
    const movement = entity.getComponent('movement');
    if (!movement) {
      throw new Error(
        `Animal ${entity.id} missing required 'movement' component. ` +
        `Ensure MovementComponent is added during spawning.`
      );
    }
    entity.updateComponent('movement', (current: any) => ({
      ...current,
      targetX: 0,
      targetY: 0,
      velocityX: 0,
      velocityY: 0,
    }));
  }

  /**
   * Check if entity has reached a position.
   */
  protected hasReached(
    entity: EntityImpl,
    target: { x: number; y: number },
    threshold: number = 1.5
  ): boolean {
    const position = entity.getComponent('position') as any;
    if (!position) return false;

    return this.distance(position, target) <= threshold;
  }
}
