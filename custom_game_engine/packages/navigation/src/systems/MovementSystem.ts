import type {
  SystemId,
  ComponentType,
  World,
  MovementComponent,
  PositionComponent,
  PhysicsComponent,
  BuildingComponent,
  VelocityComponent,
  CircadianComponent,
  NeedsComponent,
  SteeringComponent,
  SpatialMemoryComponent,
  EventBus,
  Entity,
} from '@ai-village/core';
import { BaseSystem, type SystemContext, ComponentType as CT, EntityImpl, recordChunkVisit } from '@ai-village/core';

interface TimeComponent {
  speedMultiplier?: number;
}

interface BuildingCollisionData {
  x: number;
  y: number;
  blocksMovement: boolean;
}

/**
 * MovementSystem - Handles entity movement, collision detection, and position updates
 *
 * Dependencies:
 * @see TimeSystem (priority 3) - Provides time acceleration multiplier for movement speed
 */
export class MovementSystem extends BaseSystem {
  public readonly id: SystemId = CT.Movement;
  public readonly priority: number = 20; // Run after AI
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [
    CT.Movement,
    CT.Position,
  ];

  // Performance: Cache building positions to avoid querying every frame
  private buildingCollisionCache: BuildingCollisionData[] | null = null;
  private cacheValidUntilTick = 0;
  private readonly CACHE_DURATION_TICKS = 20; // Cache for 1 second at 20 TPS

  // Performance: Cache time entity ID to avoid querying every tick
  private timeEntityId: string | null = null;

  /**
   * Initialize event listeners to invalidate cache on building changes
   */
  protected onInitialize(_world: World, eventBus: EventBus): void {
    // Invalidate cache when buildings change
    eventBus.subscribe('building:complete', () => {
      this.buildingCollisionCache = null;
    });

    eventBus.subscribe('building:destroyed', () => {
      this.buildingCollisionCache = null;
    });

    eventBus.subscribe('building:placement:confirmed', () => {
      this.buildingCollisionCache = null;
    });
  }

  /**
   * Get building collision data with caching
   * Performance: Returns cached data if valid, otherwise rebuilds cache
   */
  private getBuildingCollisions(world: World): BuildingCollisionData[] {
    // Return cached data if still valid
    if (this.buildingCollisionCache && world.tick < this.cacheValidUntilTick) {
      return this.buildingCollisionCache;
    }

    // Rebuild cache
    const buildings = world.query().with(CT.Position).with(CT.Building).executeEntities();
    this.buildingCollisionCache = [];

    for (const building of buildings) {
      const impl = building as EntityImpl;
      const pos = impl.getComponent<PositionComponent>(CT.Position);
      const buildingComp = impl.getComponent<BuildingComponent>(CT.Building);

      if (pos && buildingComp) {
        this.buildingCollisionCache.push({
          x: pos.x,
          y: pos.y,
          blocksMovement: buildingComp.blocksMovement,
        });
      }
    }

    // Cache valid for 1 second
    this.cacheValidUntilTick = world.tick + this.CACHE_DURATION_TICKS;

    return this.buildingCollisionCache;
  }

  protected onUpdate(ctx: SystemContext): void {
    // Get time acceleration multiplier from TimeComponent (cached)
    let timeSpeedMultiplier = 1.0;

    if (!this.timeEntityId) {
      const timeEntities = ctx.world.query().with(CT.Time).executeEntities();
      if (timeEntities.length > 0) {
        this.timeEntityId = timeEntities[0]!.id;
      }
    }

    if (this.timeEntityId) {
      const timeEntity = ctx.world.getEntity(this.timeEntityId);
      if (timeEntity) {
        const timeComp = (timeEntity as EntityImpl).getComponent(CT.Time) as TimeComponent | undefined;
        if (timeComp && timeComp.speedMultiplier) {
          timeSpeedMultiplier = timeComp.speedMultiplier;
        }
      } else {
        // Time entity was destroyed, clear cache
        this.timeEntityId = null;
      }
    }

    // Entities already filtered by requiredComponents - iterate directly
    for (const entity of ctx.activeEntities) {
      const impl = entity;

      // Performance: Get all components once at start
      const movement = impl.getComponent<MovementComponent>(CT.Movement)!;
      const position = impl.getComponent<PositionComponent>(CT.Position)!;
      const velocity = impl.getComponent<VelocityComponent>(CT.Velocity);
      const steering = impl.getComponent(CT.Steering) as { behavior?: string } | undefined;
      const circadian = impl.getComponent<CircadianComponent>(CT.Circadian);
      const needs = impl.getComponent<NeedsComponent>(CT.Needs);

      // Sync velocity component to movement component (for SteeringSystem integration)
      // Only sync when steering is active - when steering is 'none', behaviors control velocity directly
      const steeringActive = steering && steering.behavior && steering.behavior !== 'none';

      if (steeringActive && velocity && (velocity.vx !== undefined || velocity.vy !== undefined)) {
        impl.updateComponent<MovementComponent>(CT.Movement, (current) => ({
          ...current,
          velocityX: velocity.vx ?? current.velocityX,
          velocityY: velocity.vy ?? current.velocityY,
        }));
        // Re-get movement after update
        const updatedMovement = impl.getComponent<MovementComponent>(CT.Movement)!;
        Object.assign(movement, updatedMovement);
      }

      // Skip if sleeping - agents cannot move while asleep
      if (circadian && circadian.isSleeping) {
        // Force velocity to 0 while sleeping
        if (movement.velocityX !== 0 || movement.velocityY !== 0) {
          impl.updateComponent<MovementComponent>(CT.Movement, (current) => ({
            ...current,
            velocityX: 0,
            velocityY: 0,
          }));
          // Also sync to VelocityComponent
          if (velocity) {
            impl.updateComponent<VelocityComponent>(CT.Velocity, (current) => ({
              ...current,
              vx: 0,
              vy: 0,
            }));
          }
        }
        continue;
      }

      // Skip if not moving
      if (movement.velocityX === 0 && movement.velocityY === 0) {
        continue;
      }

      // Apply fatigue penalty based on energy level
      let speedMultiplier = 1.0;
      if (needs && needs.energy !== undefined) {
        const energy = needs.energy;

        // Per work order:
        // Energy 100-70: No penalty
        // Energy 70-50: -10% movement for work, no movement penalty
        // Energy 50-30: -20% movement speed
        // Energy 30-10: -40% movement speed
        // Energy 10-0: -60% movement speed

        if (energy < 10) {
          speedMultiplier = 0.4; // -60% speed
        } else if (energy < 30) {
          speedMultiplier = 0.6; // -40% speed
        } else if (energy < 50) {
          speedMultiplier = 0.8; // -20% speed
        }
        // else: no penalty (100%)
      }

      // Calculate new position using deltaTime and time acceleration
      // Velocity is in tiles/second, deltaTime is in seconds
      // Apply both fatigue penalty and time acceleration
      const deltaX = movement.velocityX * speedMultiplier * ctx.deltaTime * timeSpeedMultiplier;
      const deltaY = movement.velocityY * speedMultiplier * ctx.deltaTime * timeSpeedMultiplier;
      const newX = position.x + deltaX;
      const newY = position.y + deltaY;

      // Check for hard collisions (buildings) - these block completely
      if (this.hasHardCollision(ctx.world, entity.id, newX, newY)) {
        // Try perpendicular directions to slide along walls
        const perpX1 = -deltaY;
        const perpY1 = deltaX;
        const perpX2 = deltaY;
        const perpY2 = -deltaX;

        const alt1X = position.x + perpX1;
        const alt1Y = position.y + perpY1;
        const alt2X = position.x + perpX2;
        const alt2Y = position.y + perpY2;

        if (!this.hasHardCollision(ctx.world, entity.id, alt1X, alt1Y)) {
          this.updatePosition(impl, alt1X, alt1Y, ctx.world);
        } else if (!this.hasHardCollision(ctx.world, entity.id, alt2X, alt2Y)) {
          this.updatePosition(impl, alt2X, alt2Y, ctx.world);
        } else {
          // Completely blocked by buildings - stop
          this.stopEntity(impl, velocity);
        }
      } else {
        // Check for soft collisions (other agents) - these slow but don't block
        const softCollisionPenalty = this.getSoftCollisionPenalty(ctx.world, entity.id, newX, newY);

        // Apply soft collision penalty (agents can push through each other, just slower)
        const adjustedDeltaX = deltaX * softCollisionPenalty;
        const adjustedDeltaY = deltaY * softCollisionPenalty;
        const adjustedNewX = position.x + adjustedDeltaX;
        const adjustedNewY = position.y + adjustedDeltaY;

        // Final check that adjusted position doesn't hit a building
        if (!this.hasHardCollision(ctx.world, entity.id, adjustedNewX, adjustedNewY)) {
          this.updatePosition(impl, adjustedNewX, adjustedNewY, ctx.world);
        } else {
          // The adjusted position would hit a building - try original with penalty
          this.updatePosition(impl, newX, newY, ctx.world);
        }
      }
    }
  }

  private updatePosition(impl: EntityImpl, x: number, y: number, world: World): void {
    // Check for containment bounds and clamp position if necessary
    const steering = impl.getComponent<SteeringComponent>(CT.Steering);
    let clampedX = x;
    let clampedY = y;

    if (steering?.containmentBounds) {
      const bounds = steering.containmentBounds;
      clampedX = Math.max(bounds.minX, Math.min(bounds.maxX, x));
      clampedY = Math.max(bounds.minY, Math.min(bounds.maxY, y));
    }

    const newChunkX = Math.floor(clampedX / 32);
    const newChunkY = Math.floor(clampedY / 32);

    // Track chunk visits for agents with spatial memory
    const currentPos = impl.getComponent<PositionComponent>(CT.Position);
    const oldChunkX = currentPos?.chunkX;
    const oldChunkY = currentPos?.chunkY;

    // Record chunk visit if we entered a new chunk
    if (oldChunkX !== newChunkX || oldChunkY !== newChunkY) {
      const spatialMemory = impl.getComponent<SpatialMemoryComponent>(CT.SpatialMemory);
      if (spatialMemory) {
        recordChunkVisit(spatialMemory, newChunkX, newChunkY, world.tick);
        impl.updateComponent<SpatialMemoryComponent>(CT.SpatialMemory, (current) => current);
      }
    }

    impl.updateComponent<PositionComponent>(CT.Position, (current) => ({
      ...current,
      x: clampedX,
      y: clampedY,
      chunkX: newChunkX,
      chunkY: newChunkY,
    }));
  }

  private stopEntity(impl: EntityImpl, velocity: VelocityComponent | undefined): void {
    impl.updateComponent<MovementComponent>(CT.Movement, (current) => ({
      ...current,
      velocityX: 0,
      velocityY: 0,
    }));
    if (velocity) {
      impl.updateComponent<VelocityComponent>(CT.Velocity, (current) => ({
        ...current,
        vx: 0,
        vy: 0,
      }));
    }
  }

  /**
   * Check for hard collisions (buildings, water, steep elevation changes, and tile walls/doors) - these block movement completely
   * Performance: Uses cached building positions, skips ungenerated chunks to avoid expensive terrain generation
   */
  private hasHardCollision(
    world: World,
    entityId: string,
    x: number,
    y: number
  ): boolean {
    // Extended world interface with tile access
    const worldWithTerrain = world as {
      getTerrainAt?: (x: number, y: number) => string | null;
      getTileAt?: (x: number, y: number) => {
        elevation?: number;
        wall?: { constructionProgress?: number };
        door?: { state: 'open' | 'closed' | 'locked'; constructionProgress?: number };
        window?: { constructionProgress?: number };
      } | undefined;
      getChunkManager?: () => {
        getChunk: (x: number, y: number) => { generated?: boolean } | undefined;
      } | undefined;
    };

    // Performance: Skip tile checks for ungenerated chunks to avoid triggering expensive terrain generation
    const chunkManager = typeof worldWithTerrain.getChunkManager === 'function'
      ? worldWithTerrain.getChunkManager()
      : undefined;
    if (chunkManager) {
      const CHUNK_SIZE = 32;
      const chunkX = Math.floor(x / CHUNK_SIZE);
      const chunkY = Math.floor(y / CHUNK_SIZE);
      const chunk = chunkManager.getChunk(chunkX, chunkY);
      if (!chunk?.generated) {
        // Chunk not generated - skip tile collision checks (no invisible walls)
        // Still check building collisions below
        return this.checkBuildingCollision(world, x, y);
      }
    }

    // Check for water terrain (blocks land-based movement)
    if (typeof worldWithTerrain.getTerrainAt === 'function') {
      const terrain = worldWithTerrain.getTerrainAt(Math.floor(x), Math.floor(y));
      if (terrain === 'water' || terrain === 'deep_water') {
        return true;
      }
    }

    // Check tile-based walls, doors, and windows
    if (typeof worldWithTerrain.getTileAt === 'function') {
      const targetTile = worldWithTerrain.getTileAt(Math.floor(x), Math.floor(y));

      if (targetTile) {
        // Check for walls - block if construction >= 50% (per VOXEL_BUILDING_SPEC.md)
        if (targetTile.wall) {
          const progress = targetTile.wall.constructionProgress ?? 100;
          if (progress >= 50) {
            return true;
          }
        }

        // Check for windows - always block movement (even partially built)
        if (targetTile.window) {
          const progress = targetTile.window.constructionProgress ?? 100;
          if (progress >= 50) {
            return true;
          }
        }

        // Check for doors - block if closed or locked (open doors allow passage)
        if (targetTile.door) {
          const progress = targetTile.door.constructionProgress ?? 100;
          if (progress >= 50) {
            if (targetTile.door.state === 'closed' || targetTile.door.state === 'locked') {
              return true;
            }
            // Open doors allow passage
          }
        }
      }

      // Check for steep elevation changes - entities cannot climb/fall more than 2 elevation levels
      const entity = world.entities.get(entityId);
      if (entity) {
        const currentPos = (entity as EntityImpl).getComponent<PositionComponent>(CT.Position);
        if (currentPos) {
          const currentTile = worldWithTerrain.getTileAt(Math.floor(currentPos.x), Math.floor(currentPos.y));

          if (currentTile && targetTile &&
              currentTile.elevation !== undefined &&
              targetTile.elevation !== undefined) {
            const elevationDiff = Math.abs(targetTile.elevation - currentTile.elevation);

            // Block movement if elevation change is too steep (more than 2 levels)
            // This prevents entities from falling into deep basins or climbing cliffs
            if (elevationDiff > 2) {
              return true;
            }
          }
        }
      }
    }

    // Check for building collisions (legacy entity-based buildings)
    return this.checkBuildingCollision(world, x, y);
  }

  /**
   * Check only building collisions (legacy entity-based buildings)
   * Used when chunk is not generated to avoid expensive tile checks
   */
  private checkBuildingCollision(world: World, x: number, y: number): boolean {
    const buildings = this.getBuildingCollisions(world);

    for (const building of buildings) {
      if (!building.blocksMovement) {
        continue;
      }

      const dx = building.x - x;
      const dy = building.y - y;
      // Use squared distance to avoid sqrt
      const distanceSquared = dx * dx + dy * dy;

      if (distanceSquared < 0.25) { // 0.5 * 0.5 = 0.25
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate soft collision penalty from nearby agents/physics entities.
   * Returns a multiplier between 0.2 (very crowded) and 1.0 (no collision).
   * Agents can push through each other but move slower when overlapping.
   *
   * Performance: Uses chunk-based spatial lookup instead of querying all physics entities.
   * Only checks entities in current and adjacent chunks (9 chunks max).
   */
  private getSoftCollisionPenalty(
    world: World,
    entityId: string,
    x: number,
    y: number
  ): number {
    let penalty = 1.0;
    const softCollisionRadius = 0.8; // Start slowing at this distance
    const minPenalty = 0.2; // Never slow below 20% speed
    const CHUNK_SIZE = 32;

    // Calculate current chunk
    const chunkX = Math.floor(x / CHUNK_SIZE);
    const chunkY = Math.floor(y / CHUNK_SIZE);

    // Check current chunk and adjacent chunks (3x3 grid = 9 chunks)
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const nearbyEntityIds = world.getEntitiesInChunk(chunkX + dx, chunkY + dy);

        for (const nearbyId of nearbyEntityIds) {
          if (nearbyId === entityId) {
            continue;
          }

          const nearbyEntity = world.entities.get(nearbyId);
          if (!nearbyEntity) continue;

          const impl = nearbyEntity as EntityImpl;
          const pos = impl.getComponent<PositionComponent>(CT.Position);
          const physics = impl.getComponent<PhysicsComponent>(CT.Physics);

          if (!pos || !physics || !physics.solid) {
            continue;
          }

          // Manhattan distance early exit (fast)
          const manhattanDist = Math.abs(pos.x - x) + Math.abs(pos.y - y);
          if (manhattanDist > softCollisionRadius * 2) {
            continue;
          }

          // Squared distance for precision (avoid sqrt)
          const dx = pos.x - x;
          const dy = pos.y - y;
          const distanceSquared = dx * dx + dy * dy;
          const radiusSquared = softCollisionRadius * softCollisionRadius;

          // Apply graduated slowdown based on proximity
          if (distanceSquared < radiusSquared) {
            // Only compute sqrt when we need the actual distance for interpolation
            const distance = Math.sqrt(distanceSquared);
            const proximityFactor = distance / softCollisionRadius;
            const thisPenalty = minPenalty + (1 - minPenalty) * proximityFactor;
            penalty = Math.min(penalty, thisPenalty);
          }
        }
      }
    }

    return penalty;
  }
}
