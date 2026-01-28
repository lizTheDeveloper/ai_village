/**
 * SpatialGridMaintenanceSystem - Keep spatial grid synchronized with entity positions
 *
 * Priority: 15 (early infrastructure, after TimeSystem at 5, before AgentBrainSystem at 50)
 *
 * This system maintains the SpatialGrid index by:
 * 1. Adding newly created entities with Position components
 * 2. Updating entities when their positions change
 * 3. Removing destroyed entities from the grid
 *
 * Performance characteristics:
 * - Runs every tick (positions change frequently)
 * - Uses DirtyTracker for O(dirty_entities) instead of O(all_entities)
 * - Only processes entities whose Position components changed this tick
 * - Full sync on first tick, incremental sync thereafter
 *
 * Dependencies:
 * - TimeSystem (priority 5): Must run after time tick is updated
 * - DirtyTracker: Requires dirty tracking to be active
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import { EntityImpl } from '../ecs/Entity.js';

export class SpatialGridMaintenanceSystem extends BaseSystem {
  public readonly id: SystemId = 'spatial-grid-maintenance';
  public readonly priority: number = 15;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];
  protected readonly throttleInterval = 0; // EVERY_TICK - spatial must stay in sync
  public readonly activationComponents = [CT.Position] as const;

  // Track previous positions to detect actual changes (not just dirty flags)
  private entityPositions = new Map<string, { x: number; y: number }>();

  // Track which entities are in the spatial grid
  private trackedEntities = new Set<string>();

  // Flag for initial full sync
  private needsFullSync = true;

  protected onUpdate(ctx: SystemContext): void {
    const world = ctx.world;

    // On first run or after reset, do full sync
    if (this.needsFullSync) {
      this.fullSync(ctx);
      this.needsFullSync = false;
      return;
    }

    // Incremental sync - only process dirty entities
    this.incrementalSync(ctx);
  }

  /**
   * Full sync on first tick - index all entities with Position components.
   */
  private fullSync(ctx: SystemContext): void {
    const world = ctx.world;
    const positionEntities = world.query().with(CT.Position).executeEntities();

    this.entityPositions.clear();
    this.trackedEntities.clear();

    for (const entity of positionEntities) {
      const impl = entity as EntityImpl;
      const pos = impl.getComponent<PositionComponent>(CT.Position);
      if (!pos) continue;

      world.spatialGrid.insert(entity.id, pos.x, pos.y);
      this.entityPositions.set(entity.id, { x: pos.x, y: pos.y });
      this.trackedEntities.add(entity.id);
    }
  }

  /**
   * Incremental sync - only process entities with dirty Position components.
   */
  private incrementalSync(ctx: SystemContext): void {
    const world = ctx.world;
    const dirtyTracker = world.dirtyTracker;

    // Get entities with dirty position components this tick
    const dirtyPositions = dirtyTracker.getDirtyByComponent(CT.Position);

    // Also check removed entities
    const removedEntities = dirtyTracker.getRemovedEntities();

    // Process dirty positions
    for (const entityId of dirtyPositions) {
      const entity = world.getEntity(entityId);
      if (!entity) {
        // Entity was removed - clean up
        if (this.trackedEntities.has(entityId)) {
          world.spatialGrid.remove(entityId);
          this.entityPositions.delete(entityId);
          this.trackedEntities.delete(entityId);
        }
        continue;
      }

      const impl = entity as EntityImpl;
      const pos = impl.getComponent<PositionComponent>(CT.Position);

      if (!pos) {
        // Position component was removed
        if (this.trackedEntities.has(entityId)) {
          world.spatialGrid.remove(entityId);
          this.entityPositions.delete(entityId);
          this.trackedEntities.delete(entityId);
        }
        continue;
      }

      const prev = this.entityPositions.get(entityId);

      if (!prev) {
        // New entity - add to spatial grid
        world.spatialGrid.insert(entityId, pos.x, pos.y);
        this.entityPositions.set(entityId, { x: pos.x, y: pos.y });
        this.trackedEntities.add(entityId);
      } else if (prev.x !== pos.x || prev.y !== pos.y) {
        // Position actually changed - update in spatial grid
        world.spatialGrid.update(entityId, prev.x, prev.y, pos.x, pos.y);
        prev.x = pos.x;
        prev.y = pos.y;
      }
      // If position hasn't actually changed, dirty flag was from a no-op update
    }

    // Clean up removed entities
    for (const entityId of removedEntities) {
      if (this.trackedEntities.has(entityId)) {
        world.spatialGrid.remove(entityId);
        this.entityPositions.delete(entityId);
        this.trackedEntities.delete(entityId);
      }
    }
  }

  /**
   * Reset tracking on world clear (for save/load).
   */
  protected onShutdown(): void {
    this.entityPositions.clear();
    this.trackedEntities.clear();
    this.needsFullSync = true;
  }
}
