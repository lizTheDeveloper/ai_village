/**
 * MovementAPI - Centralized movement service for agents and animals
 *
 * This shared service provides movement commands that can be used by both
 * AgentBrainSystem and AnimalBrainSystem. It solves the oscillation problem
 * by providing a single entry point for all movement control.
 *
 * Key features:
 * 1. Automatically disables steering when manually controlling movement
 * 2. Provides both function-based and class-based APIs
 * 3. Handles both velocity and movement components
 * 4. Reusable across agent and animal behaviors
 *
 * Part of Phase 0 of the AISystem decomposition (work-order: ai-system-refactor)
 */

import type { Entity, EntityImpl } from '../ecs/Entity.js';
import type { MovementComponent } from '../components/MovementComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { VelocityComponent } from '../components/VelocityComponent.js';
import type { SteeringComponent, SteeringBehavior as ComponentSteeringBehavior } from '../components/SteeringComponent.js';
import { getSteering } from '../utils/componentHelpers.js';
import { safeUpdateComponent } from '../utils/componentUtils.js';
import { ComponentType as CT } from '../types/ComponentType.js';

/**
 * Steering behavior types supported by SteeringSystem
 * Re-export from SteeringComponent for consistency
 */
export type SteeringBehavior = ComponentSteeringBehavior;

/**
 * Movement target position
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * MovementAPI Class - Object-oriented interface for movement control
 *
 * Usage:
 * ```typescript
 * const movementAPI = new MovementAPI();
 * movementAPI.moveToward(entity, { x: 10, y: 20 });
 * if (movementAPI.hasReachedTarget(entity)) {
 *   movementAPI.stop(entity);
 * }
 * ```
 */
export class MovementAPI {
  /**
   * Command entity to move toward a target position.
   * Disables steering to prevent oscillation.
   */
  moveToward(entity: EntityImpl, target: Position): void {
    const position = entity.getComponent<PositionComponent>(CT.Position);
    const movement = entity.getComponent<MovementComponent>(CT.Movement);

    if (!position || !movement) return;

    const dx = target.x - position.x;
    const dy = target.y - position.y;
    // PERFORMANCE: Use squared distance for comparison to avoid sqrt
    const distanceSquared = dx * dx + dy * dy;

    if (distanceSquared < 0.01) { // 0.1 * 0.1
      this.stop(entity);
      return;
    }

    // Calculate velocity toward target (need actual distance for normalization)
    const distance = Math.sqrt(distanceSquared);
    const vx = (dx / distance) * movement.speed;
    const vy = (dy / distance) * movement.speed;

    // Disable steering to prevent conflict
    this.disableSteering(entity);

    // Set velocity
    entity.updateComponent<MovementComponent>(CT.Movement, (current) => ({
      ...current,
      velocityX: vx,
      velocityY: vy,
      targetX: target.x,
      targetY: target.y,
      hasTarget: true,
    }));

    // Also update velocity component if present
    if (entity.hasComponent(CT.Velocity)) {
      safeUpdateComponent<VelocityComponent>(entity, CT.Velocity, () => ({
        vx,
        vy,
      }));
    }
  }

  /**
   * Command entity to move toward another entity.
   */
  moveTowardEntity(entity: EntityImpl, target: Entity): void {
    const targetPos = (target as EntityImpl).getComponent<PositionComponent>(CT.Position);
    if (!targetPos) {
      throw new Error(`Target entity ${target.id} has no position`);
    }
    this.moveToward(entity, targetPos);
  }

  /**
   * Check if entity has reached its target (within threshold).
   */
  hasReachedTarget(entity: EntityImpl, threshold: number = 1.0): boolean {
    const movement = entity.getComponent<MovementComponent>(CT.Movement);
    const position = entity.getComponent<PositionComponent>(CT.Position);

    if (!movement || !position) return true;
    if (movement.targetX === undefined && movement.targetY === undefined) return true;

    const dx = (movement.targetX ?? 0) - position.x;
    const dy = (movement.targetY ?? 0) - position.y;
    // PERFORMANCE: Use squared distance for comparison
    const thresholdSquared = threshold * threshold;
    const distSquared = dx * dx + dy * dy;

    return distSquared <= thresholdSquared;
  }

  /**
   * Stop entity movement and disable steering.
   */
  stop(entity: EntityImpl): void {
    this.disableSteering(entity);

    // Zero out velocity component
    if (entity.hasComponent(CT.Velocity)) {
      safeUpdateComponent<VelocityComponent>(entity, CT.Velocity, () => ({
        vx: 0,
        vy: 0,
      }));
    }

    // Zero out movement velocity and clear target
    if (entity.hasComponent(CT.Movement)) {
      entity.updateComponent<MovementComponent>(CT.Movement, (current) => ({
        ...current,
        velocityX: 0,
        velocityY: 0,
        hasTarget: false,
      }));
    }
  }

  /**
   * Flee from a threat (move in opposite direction).
   */
  fleeFrom(entity: EntityImpl, threat: Position, distance: number = 10): void {
    const position = entity.getComponent<PositionComponent>(CT.Position);
    if (!position) return;

    // Calculate direction away from threat
    const dx = position.x - threat.x;
    const dy = position.y - threat.y;
    // PERFORMANCE: Need actual distance for normalization (cannot avoid sqrt here)
    const len = Math.sqrt(dx * dx + dy * dy) || 1;

    this.moveToward(entity, {
      x: position.x + (dx / len) * distance,
      y: position.y + (dy / len) * distance,
    });
  }

  /**
   * Calculate distance between entity and target position.
   * PERFORMANCE: Returns actual distance - use isAdjacent for comparisons where possible.
   */
  distanceTo(entity: EntityImpl, target: Position): number {
    const position = entity.getComponent<PositionComponent>(CT.Position);
    if (!position) return Infinity;

    const dx = target.x - position.x;
    const dy = target.y - position.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Check if entity is adjacent to target (within threshold).
   */
  isAdjacent(entity: EntityImpl, target: Position, threshold: number = 1.5): boolean {
    const position = entity.getComponent<PositionComponent>(CT.Position);
    if (!position) return false;

    // PERFORMANCE: Use squared distance for comparison
    const dx = target.x - position.x;
    const dy = target.y - position.y;
    const thresholdSquared = threshold * threshold;
    const distSquared = dx * dx + dy * dy;
    return distSquared < thresholdSquared;
  }

  /**
   * Enable steering system control for autonomous movement.
   */
  enableSteering(entity: EntityImpl, behavior: SteeringBehavior, target?: Position): void {
    if (!entity.hasComponent(CT.Steering)) return;

    safeUpdateComponent<SteeringComponent>(entity, CT.Steering, () => ({
      behavior,
      ...(target ? { target: { x: target.x, y: target.y } } : {}),
    }));
  }

  /**
   * Disable steering system to prevent conflicts with manual velocity control.
   */
  private disableSteering(entity: EntityImpl): void {
    if (entity.hasComponent(CT.Steering)) {
      safeUpdateComponent<SteeringComponent>(entity, CT.Steering, () => ({
        behavior: 'none',
      }));
    }
  }
}

// ============================================================================
// Functional API - Standalone functions for simpler usage
// ============================================================================

// Create a singleton instance for functional API
const movementAPI = new MovementAPI();

/**
 * Stop an entity's movement and disable steering.
 * Use this when an entity should be stationary (idle, resting, harvesting, etc.)
 */
export function stopMovement(entity: Entity): void {
  movementAPI.stop(entity as EntityImpl);
}

/**
 * Set entity velocity directly, disabling steering.
 * Use this when AI behavior needs direct velocity control.
 */
export function setVelocity(entity: Entity, vx: number, vy: number): void {
  const impl = entity as EntityImpl;

  // Disable steering system to prevent conflict
  if (impl.hasComponent(CT.Steering)) {
    safeUpdateComponent<SteeringComponent>(impl, CT.Steering, () => ({
      behavior: 'none',
    }));
  }

  // Set velocity component
  if (impl.hasComponent(CT.Velocity)) {
    safeUpdateComponent<VelocityComponent>(impl, CT.Velocity, () => ({
      vx,
      vy,
    }));
  }

  // Set movement velocity directly
  if (impl.hasComponent(CT.Movement)) {
    impl.updateComponent<MovementComponent>(CT.Movement, (current) => ({
      ...current,
      velocityX: vx,
      velocityY: vy,
    }));
  }
}

/**
 * Move entity toward a target position, disabling steering.
 * Returns distance to target.
 */
export function moveToward(entity: Entity, target: Position, speed?: number): number {
  const impl = entity as EntityImpl;
  const position = impl.getComponent<PositionComponent>(CT.Position);
  const movement = impl.getComponent<MovementComponent>(CT.Movement);

  if (!position || !movement) return Infinity;

  const dx = target.x - position.x;
  const dy = target.y - position.y;
  // PERFORMANCE: Use squared distance for comparison
  const distanceSquared = dx * dx + dy * dy;

  if (distanceSquared < 0.01) { // 0.1 * 0.1
    stopMovement(entity);
    return 0;
  }

  // Need actual distance for normalization
  const distance = Math.sqrt(distanceSquared);
  const moveSpeed = speed ?? movement.speed;
  const vx = (dx / distance) * moveSpeed;
  const vy = (dy / distance) * moveSpeed;

  setVelocity(entity, vx, vy);

  return distance;
}

/**
 * Calculate distance between entity and target position.
 */
export function distanceTo(entity: Entity, target: Position): number {
  return movementAPI.distanceTo(entity as EntityImpl, target);
}

/**
 * Check if entity is adjacent to target (within threshold).
 */
export function isAdjacent(entity: Entity, target: Position, threshold: number = 1.5): boolean {
  return movementAPI.isAdjacent(entity as EntityImpl, target, threshold);
}

/**
 * Movement helper: Move to target and stop when adjacent.
 * Returns true if entity is at/adjacent to target.
 */
export function moveToAndStop(
  entity: Entity,
  target: Position,
  speed?: number,
  adjacencyThreshold: number = 1.5
): boolean {
  const distance = distanceTo(entity, target);

  if (distance < adjacencyThreshold) {
    stopMovement(entity);
    return true;
  }

  moveToward(entity, target, speed);
  return false;
}

/**
 * Enable steering system control.
 */
export function enableSteering(
  entity: Entity,
  behavior: SteeringBehavior,
  target?: Position
): void {
  movementAPI.enableSteering(entity as EntityImpl, behavior, target);
}

/**
 * Check if steering is currently active.
 */
export function isSteeringActive(entity: Entity): boolean {
  const steering = getSteering(entity);
  return steering !== null && steering.behavior !== 'none';
}
