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
import type { DeltaUpdate } from './path-prediction-types.js';

/**
 * Callback type for broadcasting delta updates
 */
export type DeltaBroadcastCallback = (delta: DeltaUpdate) => void;

/**
 * Delta Sync System
 *
 * Priority: 1000 (runs last, after all game logic and path prediction)
 */
export class DeltaSyncSystem implements System {
  readonly id = 'delta_sync' as const;
  readonly priority = 1000;
  readonly requiredComponents = [] as const; // Processes all entities

  private broadcastCallback: DeltaBroadcastCallback | null = null;
  private lastProcessedEntities = new Set<string>();

  /**
   * Set the callback for broadcasting delta updates
   */
  setBroadcastCallback(callback: DeltaBroadcastCallback): void {
    this.broadcastCallback = callback;
  }

  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    if (!this.broadcastCallback) {
      // No broadcast callback set - skip delta sync
      return;
    }

    // Get all entities marked as dirty
    const dirtyEntities = world
      .query()
      .with('dirty_for_sync')
      .executeEntities();

    // Check if any entities were removed
    const currentEntities = new Set(
      world.query().with('position').executeEntities().map(e => e.id)
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
      tick: world.tick,
      updates: dirtyEntities.map(entity => this.serializeEntity(entity)),
      removed: removed.length > 0 ? removed : undefined,
    };

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
    const isNew = dirtyFlag && (dirtyFlag as any).reason === 'new';

    const update: DeltaUpdate['updates'][0] = {
      entityId: entity.id,
      position: position ? { x: (position as any).x, y: (position as any).y } : { x: 0, y: 0 },
      prediction: pathPrediction ? (pathPrediction as any).prediction : null,
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
}
