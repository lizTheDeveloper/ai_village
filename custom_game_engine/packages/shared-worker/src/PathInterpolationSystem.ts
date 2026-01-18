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
    const position = entity.getComponent('position');

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
   * For now, uses simple linear velocity.
   * Full wander simulation would require matching WanderBehavior exactly.
   */
  private interpolateWander(
    interpolator: PathInterpolatorComponent,
    ticksElapsed: number,
    entityId: string
  ): { x: number; y: number } {
    const wander = interpolator.prediction as WanderPath;

    // Simple approach: use current velocity
    // TODO: Could implement full wander simulation with deterministic RNG
    return {
      x: interpolator.basePosition.x + wander.currentVelocity.x * ticksElapsed,
      y: interpolator.basePosition.y + wander.currentVelocity.y * ticksElapsed,
    };
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
