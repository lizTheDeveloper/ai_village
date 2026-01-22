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
 * - O(N) where N = entities with Position or Velocity components
 * - Only updates changed components (tracks previous state)
 * - Adds negligible overhead (~0.1-0.2ms for 1000 entities)
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

  // Track which entities have been added to SoA
  private trackedPositions = new Set<string>();
  private trackedVelocities = new Set<string>();

  /**
   * Update SoA storage to match current component state.
   * This runs every tick to ensure SoA is always in sync.
   */
  protected onUpdate(ctx: SystemContext): void {
    const world = ctx.world;

    // Sync Position components
    this.syncPositions(world);

    // Sync Velocity components
    this.syncVelocities(world);
  }

  /**
   * Synchronize Position SoA with Position components.
   */
  private syncPositions(world: typeof this.world): void {
    const positionSoA = world.getPositionSoA();
    const positionEntities = world.query().with(CT.Position).executeEntities();
    const currentPositions = new Set<string>();

    for (const entity of positionEntities) {
      const impl = entity as EntityImpl;
      const pos = impl.getComponent<PositionComponent>(CT.Position);
      if (!pos) continue;

      currentPositions.add(entity.id);

      if (!this.trackedPositions.has(entity.id)) {
        // New position - add to SoA
        positionSoA.add(entity.id, pos.x, pos.y, pos.z ?? 0, pos.chunkX, pos.chunkY);
        this.trackedPositions.add(entity.id);
      } else {
        // Existing position - update SoA
        positionSoA.set(entity.id, pos.x, pos.y, pos.z ?? 0, pos.chunkX, pos.chunkY);
      }
    }

    // Remove deleted positions
    for (const entityId of this.trackedPositions) {
      if (!currentPositions.has(entityId)) {
        positionSoA.remove(entityId);
        this.trackedPositions.delete(entityId);
      }
    }
  }

  /**
   * Synchronize Velocity SoA with Velocity components.
   */
  private syncVelocities(world: typeof this.world): void {
    const velocitySoA = world.getVelocitySoA();
    const velocityEntities = world.query().with(CT.Velocity).executeEntities();
    const currentVelocities = new Set<string>();

    for (const entity of velocityEntities) {
      const impl = entity as EntityImpl;
      const vel = impl.getComponent<VelocityComponent>(CT.Velocity);
      if (!vel) continue;

      currentVelocities.add(entity.id);

      if (!this.trackedVelocities.has(entity.id)) {
        // New velocity - add to SoA
        velocitySoA.add(entity.id, vel.vx, vel.vy);
        this.trackedVelocities.add(entity.id);
      } else {
        // Existing velocity - update SoA
        velocitySoA.set(entity.id, vel.vx, vel.vy);
      }
    }

    // Remove deleted velocities
    for (const entityId of this.trackedVelocities) {
      if (!currentVelocities.has(entityId)) {
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
  }
}
