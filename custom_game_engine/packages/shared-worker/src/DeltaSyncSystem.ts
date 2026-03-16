/**
 * Delta Synchronization System (Worker-Side)
 *
 * Collects entities marked as dirty and broadcasts delta updates
 * instead of full state to all connected windows.
 *
 * Works with PathPredictionSystem to achieve 95-99% bandwidth reduction.
 *
 * This system runs ONLY in the SharedWorker, not in windows.
 */

import type { World, Entity } from '@ai-village/core';
import { EntityImpl, BaseSystem, type SystemContext } from '@ai-village/core';
import type { DeltaUpdate, PathPrediction } from './path-prediction-types.js';

/**
 * Callback type for broadcasting delta updates
 */
export type DeltaBroadcastCallback = (delta: DeltaUpdate) => void;

/**
 * Delta Sync System
 *
 * Priority: 1000 (runs last, after all game logic and path prediction)
 */
export class DeltaSyncSystem extends BaseSystem {
  public readonly id = 'delta_sync' as const;
  public readonly priority = 1000;
  public readonly requiredComponents: string[] = [] as const;
  protected readonly throttleInterval = 200; // VERY_SLOW - 10 seconds // Processes all entities

  private broadcastCallback: DeltaBroadcastCallback | null = null;
  private lastProcessedEntities = new Set<string>();
  private GLOBALS_SYNC_INTERVAL = 20; // Sync globals every 20 ticks (1 second at 20 TPS)
  private lastGlobalsSync = 0;

  /**
   * Set the callback for broadcasting delta updates
   */
  setBroadcastCallback(callback: DeltaBroadcastCallback): void {
    this.broadcastCallback = callback;
  }

  protected onUpdate(ctx: SystemContext): void {
    if (!this.broadcastCallback) {
      // No broadcast callback set - skip delta sync
      return;
    }

    // Get all entities marked as dirty
    const dirtyEntities = ctx.world
      .query()
      .with('dirty_for_sync')
      .executeEntities();

    // Check if any entities were removed
    const currentEntities = new Set(
      ctx.world.query().with('position').executeEntities().map(e => e.id)
    );

    const removed: string[] = [];
    for (const entityId of this.lastProcessedEntities) {
      if (!currentEntities.has(entityId)) {
        removed.push(entityId);
      }
    }

    // If nothing changed, skip broadcast
    if (dirtyEntities.length === 0 && removed.length === 0) {
      return;
    }

    // Build delta update
    const delta: DeltaUpdate = {
      tick: ctx.world.tick,
      updates: dirtyEntities.map(entity => this.serializeEntity(entity)),
      removed: removed.length > 0 ? removed : undefined,
    };

    // Periodically include globals (time, weather) in delta updates
    if (ctx.world.tick - this.lastGlobalsSync >= this.GLOBALS_SYNC_INTERVAL) {
      delta.globals = this.serializeGlobals(ctx.world);
      this.lastGlobalsSync = ctx.world.tick;
    }

    // Broadcast delta to all windows
    this.broadcastCallback(delta);

    // Clear dirty flags
    for (const entity of dirtyEntities) {
      (entity as EntityImpl).removeComponent('dirty_for_sync');
    }

    // Update last processed entities set
    this.lastProcessedEntities = currentEntities;
  }

  /**
   * Serialize an entity for delta update
   */
  private serializeEntity(entity: Entity): DeltaUpdate['updates'][0] {
    const position = entity.getComponent('position');
    const pathPrediction = entity.getComponent('path_prediction');
    const dirtyFlag = entity.getComponent('dirty_for_sync');

    // Determine if we need to send full component data
    const dirtyData = dirtyFlag as { reason: 'new' | 'path_changed' | 'forced' } | undefined;
    const isNew = dirtyData && dirtyData.reason === 'new';

    const posData = position as { x: number; y: number } | undefined;
    const predictionData = pathPrediction as { prediction: PathPrediction } | undefined;

    const update: DeltaUpdate['updates'][0] = {
      entityId: entity.id,
      position: posData ? { x: posData.x, y: posData.y } : { x: 0, y: 0 },
      prediction: predictionData ? predictionData.prediction : null,
    };

    // For new entities or forced updates, include full component data
    if (isNew) {
      update.components = this.getEssentialComponents(entity);
    }

    return update;
  }

  /**
   * Get essential components for an entity
   *
   * Only include components needed for rendering and basic display
   */
  private getEssentialComponents(entity: Entity): Record<string, any> {
    const components: Record<string, any> = {};

    // Essential components for all entities
    const essentialTypes = [
      'position',
      'renderable',  // CRITICAL: Needed for entity rendering
      'velocity',
      'sprite',
      'identity',
      'agent',
      'animal',
      'plant',
      'building',
      'needs',
      'health',
    ];

    for (const type of essentialTypes) {
      const component = entity.getComponent(type);
      if (component) {
        components[type] = { ...component };
      }
    }

    return components;
  }

  /**
   * Serialize global state (time, weather, etc.)
   */
  private serializeGlobals(world: World): { time?: any; weather?: any } {
    const globals: { time?: any; weather?: any } = {};

    // Serialize time entity
    const timeEntities = world.query().with('time').executeEntities();
    if (timeEntities.length > 0) {
      const timeEntity = timeEntities[0];
      if (timeEntity) {
        globals.time = timeEntity.getComponent('time');
      }
    }

    // Serialize weather entity
    const weatherEntities = world.query().with('weather').executeEntities();
    if (weatherEntities.length > 0) {
      const weatherEntity = weatherEntities[0];
      if (weatherEntity) {
        globals.weather = weatherEntity.getComponent('weather');
      }
    }

    return globals;
  }
}
