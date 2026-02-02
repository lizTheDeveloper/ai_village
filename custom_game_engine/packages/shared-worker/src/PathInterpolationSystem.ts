/**
 * Path Interpolation System (Window-Side)
 *
 * Interpolates entity positions based on path predictions from worker.
 * Runs locally in each window to calculate positions between worker updates.
 *
 * This system runs ONLY in windows (view-only mode), not in the worker.
 */

import type { World, Entity } from '@ai-village/core';
import { BaseSystem, type SystemContext } from '@ai-village/core';
import type {
  PathPrediction,
  PathInterpolatorComponent,
  WanderPath,
  SteeringPath,
} from './path-prediction-types.js';
import { predictPosition } from './path-prediction-types.js';

/**
 * Path Interpolation System
 *
 * Priority: 5 (before rendering, after state sync)
 */
export class PathInterpolationSystem extends BaseSystem {
  public readonly id = 'path_interpolation' as const;
  public readonly priority = 5;
  public readonly requiredComponents = ['path_interpolator', 'position'] as const;
  protected readonly throttleInterval = 200; // VERY_SLOW - 10 seconds

  protected onUpdate(ctx: SystemContext): void {
    for (const entity of ctx.activeEntities) {
      this.interpolate(entity, ctx.world);
    }
  }

  /**
   * Interpolate entity position based on prediction
   */
  private interpolate(entity: Entity, world: World): void {
    const interpolator = entity.getComponent('path_interpolator') as
      | PathInterpolatorComponent
      | undefined;
    const position = entity.getComponent('position') as { x: number; y: number } | undefined;

    if (!interpolator || !position) return;

    const ticksElapsed = world.tick - interpolator.baseTick;
    const prediction = interpolator.prediction;

    // Calculate interpolated position
    let interpolated: { x: number; y: number };

    switch (prediction.type) {
      case 'linear':
        interpolated = this.interpolateLinear(interpolator, ticksElapsed);
        break;

      case 'wander':
        interpolated = this.interpolateWander(interpolator, ticksElapsed, entity.id);
        break;

      case 'steering':
        interpolated = this.interpolateSteering(interpolator, ticksElapsed);
        break;

      case 'stationary':
        interpolated = { ...interpolator.basePosition };
        break;

      default:
        interpolated = { ...interpolator.basePosition };
    }

    // Update local position (view only)
    position.x = interpolated.x;
    position.y = interpolated.y;
  }

  /**
   * Interpolate linear movement
   */
  private interpolateLinear(
    interpolator: PathInterpolatorComponent,
    ticksElapsed: number
  ): { x: number; y: number } {
    return predictPosition(interpolator.prediction, interpolator.basePosition, ticksElapsed);
  }

  /**
   * Interpolate wander movement
   *
   * Implements full wander simulation with deterministic RNG to match server behavior.
   * Uses entity ID as seed for deterministic randomness.
   */
  private interpolateWander(
    interpolator: PathInterpolatorComponent,
    ticksElapsed: number,
    entityId: string
  ): { x: number; y: number } {
    const wander = interpolator.prediction as WanderPath;

    // Use seed from prediction if available, otherwise hash entity ID
    const seed = wander.seed !== undefined ? wander.seed : this.hashString(entityId);

    // Initialize RNG with seed
    let rngState = seed;

    // Start with current position and velocity
    let currentPos = { ...interpolator.basePosition };
    let currentVelocity = { ...wander.currentVelocity };

    // Get wander parameters
    const wanderRadius = wander.wanderRadius || 5;
    const wanderDistance = wander.wanderDistance || 10;
    const wanderJitter = wander.wanderJitter || 0.1;

    // Initialize wander angle from velocity direction
    let wanderAngle = Math.atan2(currentVelocity.y, currentVelocity.x);

    // Simulate each tick of wander behavior
    for (let tick = 0; tick < ticksElapsed; tick++) {
      // Jitter the wander angle using seeded RNG
      const jitterValue = this.seededRandom(rngState) - 0.5;
      rngState = this.nextRngState(rngState);
      wanderAngle += jitterValue * wanderJitter;

      // Calculate speed from current velocity
      const speed = Math.sqrt(currentVelocity.x * currentVelocity.x + currentVelocity.y * currentVelocity.y);

      // Calculate circle center (ahead of agent)
      let circleCenterX: number;
      let circleCenterY: number;

      if (speed > 0) {
        circleCenterX = currentPos.x + (currentVelocity.x / speed) * wanderDistance;
        circleCenterY = currentPos.y + (currentVelocity.y / speed) * wanderDistance;
      } else {
        circleCenterX = currentPos.x;
        circleCenterY = currentPos.y + wanderDistance;
      }

      // Calculate target on circle
      const targetX = circleCenterX + Math.cos(wanderAngle) * wanderRadius;
      const targetY = circleCenterY + Math.sin(wanderAngle) * wanderRadius;

      // Calculate desired velocity (seek toward target)
      const desiredX = targetX - currentPos.x;
      const desiredY = targetY - currentPos.y;
      const desiredDist = Math.sqrt(desiredX * desiredX + desiredY * desiredY);

      if (desiredDist > 0) {
        // Normalize and scale to speed
        const normalizedDesiredX = (desiredX / desiredDist) * speed;
        const normalizedDesiredY = (desiredY / desiredDist) * speed;

        // Update velocity (simplified steering - directly use desired velocity)
        currentVelocity.x = normalizedDesiredX;
        currentVelocity.y = normalizedDesiredY;
      }

      // Update position
      currentPos.x += currentVelocity.x;
      currentPos.y += currentVelocity.y;
    }

    return currentPos;
  }

  /**
   * Seeded random number generator (Linear Congruential Generator)
   * Returns a number between 0 and 1
   */
  private seededRandom(seed: number): number {
    const value = ((seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    return value;
  }

  /**
   * Get next RNG state
   */
  private nextRngState(seed: number): number {
    return (seed * 1103515245 + 12345) & 0x7fffffff;
  }

  /**
   * Hash a string to a number for use as RNG seed
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Interpolate steering movement
   *
   * Simulates arrival steering - slow down as approaching target.
   */
  private interpolateSteering(
    interpolator: PathInterpolatorComponent,
    ticksElapsed: number
  ): { x: number; y: number } {
    const steering = interpolator.prediction as SteeringPath;

    let current = { ...interpolator.basePosition };

    // Simulate steering for each tick
    for (let i = 0; i < ticksElapsed; i++) {
      const dx = steering.target.x - current.x;
      const dy = steering.target.y - current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 0.1) break; // Arrived

      // Calculate speed (slow down near target)
      let speed = steering.maxSpeed;
      if (distance < steering.arrivalRadius) {
        speed = steering.maxSpeed * (distance / steering.arrivalRadius);
      }

      // Move toward target
      const vx = (dx / distance) * speed;
      const vy = (dy / distance) * speed;

      current.x += vx;
      current.y += vy;
    }

    return current;
  }
}
