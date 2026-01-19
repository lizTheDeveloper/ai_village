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
 * - O(entities_with_position) per tick
 * - Tracks previous positions to detect changes
 * - Only updates grid when positions actually change
 *
 * Dependencies:
 * - TimeSystem (priority 5): Must run after time tick is updated
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { PositionComponent } from '../components/PositionComponent.js';

export class SpatialGridMaintenanceSystem extends BaseSystem {
  public readonly id: SystemId = 'spatial-grid-maintenance';
  public readonly priority: number = 15;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Position];
  public readonly activationComponents = [CT.Position] as const;

  // Track previous positions to detect changes
  private entityPositions = new Map<string, { x: number; y: number }>();

  protected onUpdate(ctx: SystemContext): void {
    const world = ctx.world;
    const entities = ctx.activeEntities;

    // Process all entities with positions
    for (const entity of entities) {
      const pos = entity.getComponent<PositionComponent>(CT.Position);
      if (!pos) continue;

      const prev = this.entityPositions.get(entity.id);

      if (!prev) {
        // New entity - add to spatial grid
        world.spatialGrid.insert(entity.id, pos.x, pos.y);
        this.entityPositions.set(entity.id, { x: pos.x, y: pos.y });
      } else if (prev.x !== pos.x || prev.y !== pos.y) {
        // Position changed - update in spatial grid
        world.spatialGrid.update(entity.id, prev.x, prev.y, pos.x, pos.y);
        prev.x = pos.x;
        prev.y = pos.y;
      }
    }

    // Clean up removed entities
    // Build set of current entity IDs for O(1) lookups
    const currentEntityIds = new Set(entities.map(e => e.id));

    for (const [entityId, _] of this.entityPositions) {
      if (!currentEntityIds.has(entityId)) {
        // Entity was removed - clean up spatial grid and tracking
        world.spatialGrid.remove(entityId);
        this.entityPositions.delete(entityId);
      }
    }
  }
}
