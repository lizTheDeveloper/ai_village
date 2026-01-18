/**
 * Path Prediction System (Worker-Side)
 *
 * Tracks entity movement and creates path predictions.
 * Detects when actual movement deviates from prediction,
 * triggering delta updates to windows.
 *
 * This system runs ONLY in the SharedWorker, not in windows.
 */

import type { World, Entity } from '@ai-village/core';
import { EntityImpl, BaseSystem, type SystemContext } from '@ai-village/core';
import type {
  PathPrediction,
  PathPredictionComponent,
  LinearPath,
  WanderPath,
  SteeringPath,
  StationaryPath,
} from './path-prediction-types.js';
import { calculateDeviation, predictPosition } from './path-prediction-types.js';

/**
 * Component added to entities that need delta sync
 */
interface DirtyForSyncComponent {
  type: 'dirty_for_sync';
  version: number;
  reason: 'new' | 'path_changed' | 'forced';
}

/**
 * Path Prediction System
 *
 * Priority: 50 (after movement systems, before rendering)
 */
export class PathPredictionSystem extends BaseSystem {
  public readonly id = 'path_prediction' as const;
  public readonly priority = 50;
  public readonly requiredComponents = ['position'] as const;
  protected readonly throttleInterval = 200; // VERY_SLOW - 10 seconds

  protected onUpdate(ctx: SystemContext): void {
    for (const entity of ctx.activeEntities) {
      this.updatePrediction(entity as EntityImpl, ctx.world);
    }
  }

  /**
   * Update path prediction for an entity
   */
  private updatePrediction(entity: EntityImpl, world: World): void {
    const position = entity.getComponent('position');
    if (!position) return;

    // Check if entity has prediction component
    let prediction = entity.getComponent('path_prediction') as PathPredictionComponent | undefined;

    if (!prediction) {
      // New entity - create initial prediction
      const newPrediction = this.createPrediction(entity, world);
      if (newPrediction) {
        entity.addComponent(newPrediction);
        this.markDirty(entity, 'new');
      }
      return;
    }

    // Check if movement deviates from prediction
    const ticksElapsed = world.tick - prediction.lastSentTick;
    const predictedPos = predictPosition(
      prediction.prediction,
      prediction.lastSentPosition,
      ticksElapsed
    );

    const deviation = calculateDeviation(position as any, predictedPos);

    if (deviation > prediction.deviationThreshold) {
      // Movement changed significantly - update prediction
      const newPrediction = this.createPrediction(entity, world);
      if (newPrediction) {
        entity.addComponent(newPrediction);
        this.markDirty(entity, 'path_changed');
      }
    }

    // Also update if prediction duration expired
    if (ticksElapsed > this.getPredictionDuration(prediction.prediction)) {
      const newPrediction = this.createPrediction(entity, world);
      if (newPrediction) {
        entity.addComponent(newPrediction);
        this.markDirty(entity, 'path_changed');
      }
    }
  }

  /**
   * Create path prediction for an entity based on its components
   */
  private createPrediction(entity: EntityImpl, world: World): PathPredictionComponent | null {
    const position = entity.getComponent('position');
    const velocity = entity.getComponent('velocity');

    if (!position) return null;

    // Check for wander behavior
    const wander = entity.getComponent('wander');
    if (wander && velocity) {
      return this.createWanderPrediction(entity, position, velocity, wander, world);
    }

    // Check for steering behavior
    const steering = entity.getComponent('steering');
    if (steering && (steering as any).target) {
      return this.createSteeringPrediction(entity, position, velocity, steering, world);
    }

    // Check for velocity (linear movement)
    if (velocity && (Math.abs((velocity as any).x) > 0.01 || Math.abs((velocity as any).y) > 0.01)) {
      return this.createLinearPrediction(entity, position, velocity, world);
    }

    // Default: stationary
    return this.createStationaryPrediction(entity, position, world);
  }

  /**
   * Create linear path prediction
   */
  private createLinearPrediction(
    entity: EntityImpl,
    position: any,
    velocity: any,
    world: World
  ): PathPredictionComponent {
    const prediction: LinearPath = {
      type: 'linear',
      velocity: { x: (velocity as any).x, y: (velocity as any).y },
      duration: 100, // Re-sync every 5 seconds (100 ticks at 20 TPS)
    };

    return {
      type: 'path_prediction',
      version: 1,
      prediction,
      lastSentPosition: { x: (position as any).x, y: (position as any).y },
      lastSentTick: world.tick,
      deviationThreshold: 1.0, // 1 pixel deviation triggers update
    };
  }

  /**
   * Create wander path prediction
   */
  private createWanderPrediction(
    entity: EntityImpl,
    position: any,
    velocity: any,
    wander: any,
    world: World
  ): PathPredictionComponent {
    const prediction: WanderPath = {
      type: 'wander',
      currentVelocity: { x: (velocity as any).x, y: (velocity as any).y },
      wanderRadius: (wander as any).wanderRadius || 3.0,
      wanderDistance: (wander as any).wanderDistance || 6.0,
      wanderJitter: (wander as any).wanderJitter || 1.0,
      seed: this.hashEntityId(entity.id), // Deterministic seed from entity ID
    };

    return {
      type: 'path_prediction',
      version: 1,
      prediction,
      lastSentPosition: { x: (position as any).x, y: (position as any).y },
      lastSentTick: world.tick,
      deviationThreshold: 2.0, // Wander is less predictable, higher threshold
    };
  }

  /**
   * Create steering path prediction
   */
  private createSteeringPrediction(
    entity: EntityImpl,
    position: any,
    velocity: any,
    steering: any,
    world: World
  ): PathPredictionComponent {
    const prediction: SteeringPath = {
      type: 'steering',
      target: { x: (steering as any).target.x, y: (steering as any).target.y },
      maxSpeed: (steering as any).maxSpeed || 2.0,
      arrivalRadius: (steering as any).arrivalRadius || 5.0,
      currentVelocity: velocity ? { x: (velocity as any).x, y: (velocity as any).y } : undefined,
    };

    return {
      type: 'path_prediction',
      version: 1,
      prediction,
      lastSentPosition: { x: (position as any).x, y: (position as any).y },
      lastSentTick: world.tick,
      deviationThreshold: 1.0, // Steering is predictable
    };
  }

  /**
   * Create stationary path prediction
   */
  private createStationaryPrediction(
    entity: EntityImpl,
    position: any,
    world: World
  ): PathPredictionComponent {
    const prediction: StationaryPath = {
      type: 'stationary',
      duration: 200, // Re-sync every 10 seconds to check if still stationary
    };

    return {
      type: 'path_prediction',
      version: 1,
      prediction,
      lastSentPosition: { x: (position as any).x, y: (position as any).y },
      lastSentTick: world.tick,
      deviationThreshold: 0.1, // Very small threshold - stationary means stationary
    };
  }

  /**
   * Mark entity as dirty (needs sync to windows)
   */
  private markDirty(entity: EntityImpl, reason: DirtyForSyncComponent['reason']): void {
    const dirty: DirtyForSyncComponent = {
      type: 'dirty_for_sync',
      version: 1,
      reason,
    };
    entity.addComponent(dirty);
  }

  /**
   * Get expected duration of a prediction
   */
  private getPredictionDuration(prediction: PathPrediction): number {
    switch (prediction.type) {
      case 'linear':
        return prediction.duration;
      case 'wander':
        return 50; // Wander changes frequently
      case 'steering':
        return 100; // Steering paths last until target reached
      case 'stationary':
        return prediction.duration || 200;
      default:
        return 100;
    }
  }

  /**
   * Hash entity ID to deterministic seed for wander
   */
  private hashEntityId(id: string): number {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      const char = id.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}
