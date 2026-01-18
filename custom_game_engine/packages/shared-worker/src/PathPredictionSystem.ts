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

    const positionData = position as { x: number; y: number };
    const deviation = calculateDeviation(positionData, predictedPos);

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
    if (steering && 'target' in steering && steering.target) {
      return this.createSteeringPrediction(entity, position, velocity, steering, world);
    }

    // Check for velocity (linear movement)
    const velocityData = velocity as { vx: number; vy: number } | undefined;
    if (velocityData && (Math.abs(velocityData.vx) > 0.01 || Math.abs(velocityData.vy) > 0.01)) {
      return this.createLinearPrediction(entity, position, velocityData, world);
    }

    // Default: stationary
    return this.createStationaryPrediction(entity, position, world);
  }

  /**
   * Create linear path prediction
   */
  private createLinearPrediction(
    entity: EntityImpl,
    position: unknown,
    velocity: { vx: number; vy: number },
    world: World
  ): PathPredictionComponent {
    const posData = position as { x: number; y: number };
    const prediction: LinearPath = {
      type: 'linear',
      velocity: { x: velocity.vx, y: velocity.vy },
      duration: 100, // Re-sync every 5 seconds (100 ticks at 20 TPS)
    };

    return {
      type: 'path_prediction',
      version: 1,
      prediction,
      lastSentPosition: { x: posData.x, y: posData.y },
      lastSentTick: world.tick,
      deviationThreshold: 1.0, // 1 pixel deviation triggers update
    };
  }

  /**
   * Create wander path prediction
   */
  private createWanderPrediction(
    entity: EntityImpl,
    position: unknown,
    velocity: unknown,
    wander: unknown,
    world: World
  ): PathPredictionComponent {
    const posData = position as { x: number; y: number };
    const velData = velocity as { vx: number; vy: number };
    const wanderData = wander as { wanderRadius?: number; wanderDistance?: number; wanderJitter?: number };

    const prediction: WanderPath = {
      type: 'wander',
      currentVelocity: { x: velData.vx, y: velData.vy },
      wanderRadius: wanderData.wanderRadius ?? 3.0,
      wanderDistance: wanderData.wanderDistance ?? 6.0,
      wanderJitter: wanderData.wanderJitter ?? 1.0,
      seed: this.hashEntityId(entity.id), // Deterministic seed from entity ID
    };

    return {
      type: 'path_prediction',
      version: 1,
      prediction,
      lastSentPosition: { x: posData.x, y: posData.y },
      lastSentTick: world.tick,
      deviationThreshold: 2.0, // Wander is less predictable, higher threshold
    };
  }

  /**
   * Create steering path prediction
   */
  private createSteeringPrediction(
    entity: EntityImpl,
    position: unknown,
    velocity: unknown,
    steering: unknown,
    world: World
  ): PathPredictionComponent {
    const posData = position as { x: number; y: number };
    const velData = velocity ? (velocity as { vx: number; vy: number }) : undefined;
    const steeringData = steering as { target: { x: number; y: number }; maxSpeed?: number; arrivalRadius?: number };

    const prediction: SteeringPath = {
      type: 'steering',
      target: { x: steeringData.target.x, y: steeringData.target.y },
      maxSpeed: steeringData.maxSpeed ?? 2.0,
      arrivalRadius: steeringData.arrivalRadius ?? 5.0,
      currentVelocity: velData ? { x: velData.vx, y: velData.vy } : undefined,
    };

    return {
      type: 'path_prediction',
      version: 1,
      prediction,
      lastSentPosition: { x: posData.x, y: posData.y },
      lastSentTick: world.tick,
      deviationThreshold: 1.0, // Steering is predictable
    };
  }

  /**
   * Create stationary path prediction
   */
  private createStationaryPrediction(
    entity: EntityImpl,
    position: unknown,
    world: World
  ): PathPredictionComponent {
    const posData = position as { x: number; y: number };
    const prediction: StationaryPath = {
      type: 'stationary',
      duration: 200, // Re-sync every 10 seconds to check if still stationary
    };

    return {
      type: 'path_prediction',
      version: 1,
      prediction,
      lastSentPosition: { x: posData.x, y: posData.y },
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
