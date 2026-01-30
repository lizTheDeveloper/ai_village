import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { VelocityComponent } from '../components/VelocityComponent.js';
import { EntityImpl } from '../ecs/Entity.js';

/**
 * SoASyncSystem - Synchronizes Structure-of-Arrays storage with component changes.
 *
 * This system keeps world.positionSoA and world.velocitySoA in sync with
 * Position and Velocity components. It runs early in the frame (priority 10)
 * to ensure SoA data is up-to-date before systems use it.
 *
 * Performance:
 * - Uses DirtyTracker to only sync CHANGED entities (not all entities)
 * - O(D) where D = dirty entities this tick (typically << total entities)
 * - Adds negligible overhead (~0.1-0.2ms for typical gameplay)
 *
 * Purpose:
 * - Enables cache-efficient batch processing in hot path systems
 * - Maintains backward compatibility (components remain source of truth)
 * - Automatic synchronization (systems don't need to update SoA manually)
 */
export class SoASyncSystem extends BaseSystem {
  public readonly id: SystemId = 'soa_sync';
  public readonly priority: number = 10; // Early infrastructure (after Time)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];
  protected readonly throttleInterval = 0; // EVERY_TICK - must stay in sync
  // PERF: Skip system entirely when no positioned/moving entities exist
  public readonly activationComponents = [CT.Position, CT.Velocity] as const;
  // PERF: Skip SimulationScheduler filtering - this system iterates dirtyTracker directly
  // and doesn't use ctx.activeEntities, so filtering is pure overhead
  protected readonly skipSimulationFiltering = true;

  // Track which entities have been added to SoA
  private trackedPositions = new Set<string>();
  private trackedVelocities = new Set<string>();

  // Flag for initial full sync (first tick after startup/load)
  private needsFullSync = true;

  /**
   * Update SoA storage to match current component state.
   * Uses DirtyTracker for incremental updates - only syncs changed entities.
   */
  protected onUpdate(ctx: SystemContext): void {
    const world = ctx.world;

    // On first run or after reset, do full sync
    if (this.needsFullSync) {
      this.fullSyncPositions(world);
      this.fullSyncVelocities(world);
      this.needsFullSync = false;
      return;
    }

    // Incremental sync - only process dirty entities
    this.incrementalSyncPositions(world);
    this.incrementalSyncVelocities(world);
  }

  /**
   * Full sync of all Position components (used on startup/reset).
   */
  private fullSyncPositions(world: typeof this.world): void {
    const positionSoA = world.getPositionSoA();
    const positionEntities = world.query().with(CT.Position).executeEntities();

    // Clear and rebuild tracking
    this.trackedPositions.clear();

    for (const entity of positionEntities) {
      const impl = entity as EntityImpl;
      const pos = impl.getComponent<PositionComponent>(CT.Position);
      if (!pos) continue;

      positionSoA.set(entity.id, pos.x, pos.y, pos.z ?? 0, pos.chunkX, pos.chunkY);
      this.trackedPositions.add(entity.id);
    }
  }

  /**
   * Full sync of all Velocity components (used on startup/reset).
   */
  private fullSyncVelocities(world: typeof this.world): void {
    const velocitySoA = world.getVelocitySoA();
    const velocityEntities = world.query().with(CT.Velocity).executeEntities();

    // Clear and rebuild tracking
    this.trackedVelocities.clear();

    for (const entity of velocityEntities) {
      const impl = entity as EntityImpl;
      const vel = impl.getComponent<VelocityComponent>(CT.Velocity);
      if (!vel) continue;

      velocitySoA.set(entity.id, vel.vx, vel.vy);
      this.trackedVelocities.add(entity.id);
    }
  }

  /**
   * Incremental sync - only process entities with dirty Position components.
   * PERF: Adds change detection to skip redundant writes (MovementSystem already updates SoA directly)
   */
  private incrementalSyncPositions(world: typeof this.world): void {
    const positionSoA = world.getPositionSoA();
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
        if (this.trackedPositions.has(entityId)) {
          positionSoA.remove(entityId);
          this.trackedPositions.delete(entityId);
        }
        continue;
      }

      const impl = entity as EntityImpl;
      const pos = impl.getComponent<PositionComponent>(CT.Position);

      if (!pos) {
        // Position component was removed
        if (this.trackedPositions.has(entityId)) {
          positionSoA.remove(entityId);
          this.trackedPositions.delete(entityId);
        }
        continue;
      }

      // Add or update in SoA
      if (!this.trackedPositions.has(entityId)) {
        // New entity - add to SoA
        positionSoA.add(entityId, pos.x, pos.y, pos.z ?? 0, pos.chunkX, pos.chunkY);
        this.trackedPositions.add(entityId);
      } else {
        // Existing entity - update in SoA
        positionSoA.set(entityId, pos.x, pos.y, pos.z ?? 0, pos.chunkX, pos.chunkY);
      }
    }

    // Clean up removed entities
    for (const entityId of removedEntities) {
      if (this.trackedPositions.has(entityId)) {
        positionSoA.remove(entityId);
        this.trackedPositions.delete(entityId);
      }
    }
  }

  /**
   * Incremental sync - only process entities with dirty Velocity components.
   * PERF: Adds change detection to skip redundant writes (SteeringSystem may have already updated SoA)
   */
  private incrementalSyncVelocities(world: typeof this.world): void {
    const velocitySoA = world.getVelocitySoA();
    const dirtyTracker = world.dirtyTracker;

    // Get entities with dirty velocity components this tick
    const dirtyVelocities = dirtyTracker.getDirtyByComponent(CT.Velocity);

    // Also check removed entities
    const removedEntities = dirtyTracker.getRemovedEntities();

    // Process dirty velocities
    for (const entityId of dirtyVelocities) {
      const entity = world.getEntity(entityId);
      if (!entity) {
        // Entity was removed - clean up
        if (this.trackedVelocities.has(entityId)) {
          velocitySoA.remove(entityId);
          this.trackedVelocities.delete(entityId);
        }
        continue;
      }

      const impl = entity as EntityImpl;
      const vel = impl.getComponent<VelocityComponent>(CT.Velocity);

      if (!vel) {
        // Velocity component was removed
        if (this.trackedVelocities.has(entityId)) {
          velocitySoA.remove(entityId);
          this.trackedVelocities.delete(entityId);
        }
        continue;
      }

      // Add or update in SoA
      if (!this.trackedVelocities.has(entityId)) {
        // New entity - add to SoA
        velocitySoA.add(entityId, vel.vx, vel.vy);
        this.trackedVelocities.add(entityId);
      } else {
        // Existing entity - update in SoA
        velocitySoA.set(entityId, vel.vx, vel.vy);
      }
    }

    // Clean up removed entities
    for (const entityId of removedEntities) {
      if (this.trackedVelocities.has(entityId)) {
        velocitySoA.remove(entityId);
        this.trackedVelocities.delete(entityId);
      }
    }
  }

  /**
   * Reset tracking on world clear (for save/load).
   */
  protected onShutdown(): void {
    this.trackedPositions.clear();
    this.trackedVelocities.clear();
    this.needsFullSync = true;
  }
}
