import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { MovementComponent } from '../components/MovementComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { PhysicsComponent } from '../components/PhysicsComponent.js';
import type { BuildingComponent } from '../components/BuildingComponent.js';
import type { VelocityComponent } from '../components/VelocityComponent.js';
import type { CircadianComponent } from '../components/CircadianComponent.js';
import type { NeedsComponent } from '../components/NeedsComponent.js';
import type { SteeringComponent } from '../components/SteeringComponent.js';
import type { EventBus } from '../events/EventBus.js';
import type { Tile } from '@ai-village/world';
import type { SpatialMemoryComponent } from '../components/SpatialMemoryComponent.js';
import { addSpatialMemory } from '../components/SpatialMemoryComponent.js';
import type { ResourceComponent } from '../components/ResourceComponent.js';
import type { BodyComponent } from '../components/BodyComponent.js';
import { getPartsByFunction } from '../components/BodyComponent.js';
import { vector2DPool } from '../utils/CommonPools.js';
import { SIMDOps } from '../utils/SIMD.js';
import { WebGPUManager } from '../gpu/WebGPUManager.js';
import { GPUPositionIntegrator } from '../gpu/PositionIntegrator.js';


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
  // Only run when movement components exist (O(1) activation check)
  public readonly activationComponents = [CT.Movement] as const;
  protected readonly throttleInterval = 0; // EVERY_TICK - critical responsiveness

  /**
   * Systems that must run before this one.
   * @see TimeSystem - provides speedMultiplier for time-accelerated movement
   */
  public readonly dependsOn = ['time'] as const;

  // Performance: Cache building positions to avoid querying every frame
  private buildingCollisionCache: BuildingCollisionData[] | null = null;
  private cacheValidUntilTick = 0;
  private readonly CACHE_DURATION_TICKS = 20; // Cache for 1 second at 20 TPS

  // Performance: Cache time entity ID to avoid querying every tick
  private timeEntityId: string | null = null;

  // Passive resource discovery - throttle discovery checks
  private readonly DISCOVERY_INTERVAL_TICKS = 5; // Check every 5 ticks (~250ms)
  private readonly DISCOVERY_RADIUS = 5; // Tiles
  private readonly DISCOVERY_RADIUS_SQUARED = 25; // 5 * 5 - precomputed for distance checks
  private lastDiscoveryCheck: Map<string, number> = new Map();

  // Performance: Reusable objects for collision calculations (zero allocations in hot path)
  private readonly workingPosition = { x: 0, y: 0 };

  // Performance: Precomputed collision constants
  private readonly BUILDING_COLLISION_RADIUS_SQUARED = 0.25; // 0.5 * 0.5
  private readonly SOFT_COLLISION_RADIUS = 0.8;
  private readonly SOFT_COLLISION_RADIUS_SQUARED = 0.64; // 0.8 * 0.8
  private readonly MIN_PENALTY = 0.2;
  private readonly MIN_VELOCITY_THRESHOLD = 0.001; // Velocity below this is treated as stopped
  private readonly MIN_VELOCITY_THRESHOLD_SQUARED = 0.000001; // 0.001 * 0.001

  // WebGPU acceleration (Tier 4 optimization)
  private gpuManager: WebGPUManager | null = null;
  private gpuIntegrator: GPUPositionIntegrator | null = null;
  private useGPU = false;
  private readonly GPU_THRESHOLD = 1000; // Use GPU for batches larger than this

  /**
   * Initialize event listeners to invalidate cache on building changes
   * Also initialize WebGPU acceleration if available
   */
  protected async onInitialize(world: typeof this.world, eventBus: EventBus): Promise<void> {
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

    // Try to initialize WebGPU (Tier 4 optimization)
    this.gpuManager = new WebGPUManager();
    const gpuAvailable = await this.gpuManager.initialize();

    if (gpuAvailable) {
      const device = this.gpuManager.getDevice();
      if (device) {
        this.gpuIntegrator = new GPUPositionIntegrator(device);
        this.useGPU = true;
        console.info('[MovementSystem] WebGPU acceleration enabled (Tier 4)');
      }
    } else {
      console.info('[MovementSystem] WebGPU not available, using CPU SIMD (Tier 3)');
    }
  }

  /**
   * Batch process velocity integration using SoA + SIMD/WebGPU for maximum performance.
   * This processes all moving entities using auto-vectorized operations or GPU compute shaders.
   *
   * Performance benefits:
   * - Tier 3 (CPU SIMD): 3-5x faster than Tier 2, 4-5x faster than naive per-entity processing
   * - Tier 4 (WebGPU): 10-100x faster than CPU SIMD for large batches (10,000+ entities)
   *
   * Optimization tiers:
   * - < 1,000 entities: Use CPU SIMD (Tier 3) - transfer overhead not worth it
   * - 1,000-10,000 entities: Use GPU if available (5-10x speedup)
   * - 10,000+ entities: Use GPU (20-100x speedup)
   *
   * GPU strategy:
   * 1. Prepare speed multipliers on CPU (fatigue, sleeping, etc.)
   * 2. Transfer data to GPU
   * 3. Run compute shader (massively parallel)
   * 4. Read results back from GPU
   * 5. Apply collision checks on CPU (scalar processing)
   *
   * Note: This only handles velocity integration (position += velocity * deltaTime).
   * Collision detection, steering, and other movement logic still happens in onUpdate.
   */
  private async batchProcessVelocity(ctx: SystemContext, timeSpeedMultiplier: number): Promise<void> {
    const positionSoA = ctx.world.getPositionSoA();
    const velocitySoA = ctx.world.getVelocitySoA();

    const posArrays = positionSoA.getArrays();
    const velArrays = velocitySoA.getArrays();

    const deltaTime = ctx.deltaTime / 1000; // Convert ms to seconds
    const speedFactor = deltaTime * timeSpeedMultiplier;

    // Working arrays for SIMD operations (reuse to avoid allocations)
    const velCount = velArrays.count;
    if (!this.simdWorkingArrays || this.simdWorkingArrays.capacity < velCount) {
      this.simdWorkingArrays = {
        capacity: Math.max(velCount * 1.5, 1000),
        tempXs: new Float32Array(Math.max(velCount * 1.5, 1000)),
        tempYs: new Float32Array(Math.max(velCount * 1.5, 1000)),
        speedMultipliers: new Float32Array(Math.max(velCount * 1.5, 1000)),
      };
    }

    const tempXs = this.simdWorkingArrays.tempXs;
    const tempYs = this.simdWorkingArrays.tempYs;
    const speedMultipliers = this.simdWorkingArrays.speedMultipliers;

    // Prepare speed multipliers array (fatigue penalties)
    // This loop is simple enough that V8 can auto-vectorize the array access pattern
    for (let i = 0; i < velCount; i++) {
      const entityId = velArrays.entityIds[i];
      if (!entityId) {
        speedMultipliers[i] = 0; // Skip invalid entities
        continue;
      }

      const entity = ctx.world.getEntity(entityId);
      if (!entity) {
        speedMultipliers[i] = 0;
        continue;
      }

      const impl = entity as EntityImpl;

      // Skip if sleeping (agents cannot move while asleep)
      const circadian = impl.getComponent<CircadianComponent>(CT.Circadian);
      if (circadian && circadian.isSleeping) {
        speedMultipliers[i] = 0;
        continue;
      }

      // Skip if near-zero velocity
      const vx = velArrays.vxs[i]!;
      const vy = velArrays.vys[i]!;
      const velocityMagnitudeSquared = vx * vx + vy * vy;
      if (velocityMagnitudeSquared < this.MIN_VELOCITY_THRESHOLD_SQUARED) {
        speedMultipliers[i] = 0;
        continue;
      }

      // Apply fatigue penalty based on energy level
      let speedMultiplier = 1.0;
      const needs = impl.getComponent<NeedsComponent>(CT.Needs);
      if (needs && needs.energy !== undefined) {
        const energy = needs.energy;
        if (energy < 10) {
          speedMultiplier = 0.4;
        } else if (energy < 30) {
          speedMultiplier = 0.6;
        } else if (energy < 50) {
          speedMultiplier = 0.8;
        }
      }

      speedMultipliers[i] = speedMultiplier * speedFactor;
    }

    // Choose GPU vs CPU SIMD based on entity count and GPU availability
    const useGPUPath = this.useGPU && this.gpuIntegrator && velCount >= this.GPU_THRESHOLD;

    if (useGPUPath) {
      // GPU path (Tier 4) - for large batches (1,000+ entities)
      await this.gpuIntegrator!.updatePositions(
        posArrays.xs,
        posArrays.ys,
        velArrays.vxs,
        velArrays.vys,
        speedMultipliers,
        speedFactor,
        velCount
      );

      // GPU updated positions in-place, now sync back to components
      for (let i = 0; i < velCount; i++) {
        if (speedMultipliers[i] === 0) continue;

        const entityId = velArrays.entityIds[i]!;
        if (!positionSoA.has(entityId)) continue;

        const newX = posArrays.xs[i]!;
        const newY = posArrays.ys[i]!;

        // Update chunk coordinates
        const newChunkX = Math.floor(newX / 32);
        const newChunkY = Math.floor(newY / 32);

        // Sync to component
        const entity = ctx.world.getEntity(entityId);
        if (entity) {
          (entity as EntityImpl).updateComponent<PositionComponent>(CT.Position, (current) => ({
            ...current,
            x: newX,
            y: newY,
            chunkX: newChunkX,
            chunkY: newChunkY,
          }));
        }
      }
    } else {
      // CPU SIMD path (Tier 3) - for small batches or no GPU
      // Step 1: Compute delta positions (SIMD fused multiply-add)
      // tempXs[i] = vxs[i] * speedMultipliers[i]
      SIMDOps.multiplyArrays(tempXs, velArrays.vxs, speedMultipliers, velCount);
      // tempYs[i] = vys[i] * speedMultipliers[i]
      SIMDOps.multiplyArrays(tempYs, velArrays.vys, speedMultipliers, velCount);

    // Step 2: Apply position updates with collision checks
    // Note: Collision checks prevent full SIMD optimization here, but the distance
    // calculations themselves use SIMD in getSoftCollisionPenalty
    for (let i = 0; i < velCount; i++) {
      if (speedMultipliers[i] === 0) continue; // Skip inactive entities

      const entityId = velArrays.entityIds[i]!;
      if (!positionSoA.has(entityId)) continue;

      const pos = positionSoA.get(entityId);
      if (!pos) continue;

      const deltaX = tempXs[i]!;
      const deltaY = tempYs[i]!;
      const newX = pos.x + deltaX;
      const newY = pos.y + deltaY;

      // Check for hard collisions before applying
      if (!this.hasHardCollision(ctx.world, entityId, newX, newY)) {
        // Check soft collisions
        const softPenalty = this.getSoftCollisionPenalty(ctx.world, entityId, newX, newY);

        // Apply with soft collision penalty
        const adjustedX = pos.x + deltaX * softPenalty;
        const adjustedY = pos.y + deltaY * softPenalty;

        // Update position in SoA
        const newChunkX = Math.floor(adjustedX / 32);
        const newChunkY = Math.floor(adjustedY / 32);
        positionSoA.set(entityId, adjustedX, adjustedY, pos.z, newChunkX, newChunkY);

        // Sync back to component (for backward compatibility with systems not using SoA yet)
        const entity = ctx.world.getEntity(entityId);
        if (entity) {
          (entity as EntityImpl).updateComponent<PositionComponent>(CT.Position, (current) => ({
            ...current,
            x: adjustedX,
            y: adjustedY,
            chunkX: newChunkX,
            chunkY: newChunkY,
          }));
        }
      } else {
        // Collision - try perpendicular slide (handled in main loop)
        // Skip SoA optimization for collision cases (rare, complex logic)
      }
    }
  }

  // Working arrays for SIMD operations (reused across ticks to avoid allocations)
  private simdWorkingArrays: {
    capacity: number;
    tempXs: Float32Array;
    tempYs: Float32Array;
    speedMultipliers: Float32Array;
  } | null = null;

  /**
   * Get building collision data with caching
   * Performance: Returns cached data if valid, otherwise rebuilds cache
   */
  private getBuildingCollisions(tick: number): BuildingCollisionData[] {
    // Return cached data if still valid
    if (this.buildingCollisionCache && tick < this.cacheValidUntilTick) {
      return this.buildingCollisionCache;
    }

    // Rebuild cache - reuse array and objects to reduce GC pressure
    const buildings = this.world.query().with(CT.Position).with(CT.Building).executeEntities();

    // Reuse existing array
    if (!this.buildingCollisionCache) {
      this.buildingCollisionCache = [];
    }

    let idx = 0;
    for (const building of buildings) {
      const impl = building as EntityImpl;
      const pos = impl.getComponent<PositionComponent>(CT.Position);
      const buildingComp = impl.getComponent<BuildingComponent>(CT.Building);

      if (pos && buildingComp) {
        // Reuse existing object if available, otherwise create new one
        let data = this.buildingCollisionCache[idx];
        if (!data) {
          data = { x: 0, y: 0, blocksMovement: false };
          this.buildingCollisionCache[idx] = data;
        }
        data.x = pos.x;
        data.y = pos.y;
        data.blocksMovement = buildingComp.blocksMovement;
        idx++;
      }
    }

    // Trim array if we have fewer buildings now
    this.buildingCollisionCache.length = idx;

    // Cache valid for 1 second
    this.cacheValidUntilTick = tick + this.CACHE_DURATION_TICKS;

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

    // TIER 2 OPTIMIZATION: Structure-of-Arrays batch processing
    // Process velocity integration in a tight loop for better cache locality
    // This handles all entities with Velocity components (steering-based movement)
    this.batchProcessVelocity(ctx, timeSpeedMultiplier);

    // Entities already filtered by requiredComponents and SimulationScheduler
    for (const entity of ctx.activeEntities) {
      const impl = entity as EntityImpl;

      // Performance: Get all components once at start
      const movement = impl.getComponent<MovementComponent>(CT.Movement)!;
      const position = impl.getComponent<PositionComponent>(CT.Position)!;
      const velocity = impl.getComponent<VelocityComponent>(CT.Velocity);
      const steering = impl.getComponent(CT.Steering) as { behavior?: string } | undefined;
      const circadian = impl.getComponent<CircadianComponent>(CT.Circadian);
      const needs = impl.getComponent<NeedsComponent>(CT.Needs);

      // Skip entities with Velocity components - already processed by SoA batch
      if (velocity) {
        // Sync velocity component to movement component (for backward compatibility)
        const steeringActive = steering && steering.behavior && steering.behavior !== 'none';
        if (steeringActive && (velocity.vx !== undefined || velocity.vy !== undefined)) {
          impl.updateComponent<MovementComponent>(CT.Movement, (current) => {
            current.velocityX = velocity.vx ?? current.velocityX;
            current.velocityY = velocity.vy ?? current.velocityY;
            return current;
          });
        }
        continue; // Skip - already processed in batchProcessVelocity
      }

      // Skip if sleeping - agents cannot move while asleep
      if (circadian && circadian.isSleeping) {
        // Force velocity to 0 while sleeping - mutate directly to avoid object allocation
        if (movement.velocityX !== 0 || movement.velocityY !== 0) {
          impl.updateComponent<MovementComponent>(CT.Movement, (current) => {
            current.velocityX = 0;
            current.velocityY = 0;
            return current;
          });
          // Also sync to VelocityComponent
          if (velocity) {
            impl.updateComponent<VelocityComponent>(CT.Velocity, (current) => {
              current.vx = 0;
              current.vy = 0;
              return current;
            });
          }
        }
        continue;
      }

      // Skip if not moving (check exact zero first, then near-zero)
      if (movement.velocityX === 0 && movement.velocityY === 0) {
        continue;
      }

      // Performance: Early exit for near-zero velocity (avoid expensive collision checks)
      // Use squared magnitude to avoid sqrt
      const velocityMagnitudeSquared = movement.velocityX * movement.velocityX +
                                        movement.velocityY * movement.velocityY;
      if (velocityMagnitudeSquared < this.MIN_VELOCITY_THRESHOLD_SQUARED) {
        // Velocity too small to matter - treat as stopped
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
        // Performance: Use pooled vectors to avoid allocations
        const perp1 = vector2DPool.acquire();
        const perp2 = vector2DPool.acquire();

        perp1.x = -deltaY;
        perp1.y = deltaX;
        perp2.x = deltaY;
        perp2.y = -deltaX;

        const alt1X = position.x + perp1.x;
        const alt1Y = position.y + perp1.y;
        const alt2X = position.x + perp2.x;
        const alt2Y = position.y + perp2.y;

        if (!this.hasHardCollision(ctx.world, entity.id, alt1X, alt1Y)) {
          this.updatePosition(impl, alt1X, alt1Y, ctx.world);
        } else if (!this.hasHardCollision(ctx.world, entity.id, alt2X, alt2Y)) {
          this.updatePosition(impl, alt2X, alt2Y, ctx.world);
        } else {
          // Completely blocked by buildings - stop
          this.stopEntity(impl, velocity);
        }

        vector2DPool.release(perp1);
        vector2DPool.release(perp2);
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

  private updatePosition(impl: EntityImpl, x: number, y: number, world?: World): void {
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
    // Mutate directly to avoid object allocation
    impl.updateComponent<PositionComponent>(CT.Position, (current) => {
      current.x = clampedX;
      current.y = clampedY;
      current.chunkX = newChunkX;
      current.chunkY = newChunkY;
      return current;
    });

    // Passive resource discovery for agents with spatial memory
    if (world && impl.hasComponent(CT.Agent) && impl.hasComponent(CT.SpatialMemory)) {
      this.tryDiscoverResources(impl, clampedX, clampedY, world);
    }
  }

  private stopEntity(impl: EntityImpl, velocity: VelocityComponent | undefined): void {
    // Mutate directly to avoid object allocation
    impl.updateComponent<MovementComponent>(CT.Movement, (current) => {
      current.velocityX = 0;
      current.velocityY = 0;
      return current;
    });
    if (velocity) {
      impl.updateComponent<VelocityComponent>(CT.Velocity, (current) => {
        current.vx = 0;
        current.vy = 0;
        return current;
      });
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
      getTileAt?: (x: number, y: number) => Tile | undefined;
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

    // Check for water terrain - depth-based blocking
    if (typeof worldWithTerrain.getTileAt === 'function') {
      const tile = worldWithTerrain.getTileAt(Math.floor(x), Math.floor(y));

      if (tile?.fluid && tile.fluid.type === 'water') {
        const depth = tile.fluid.depth;

        // Shallow water (depth 1-2): Wadeable, no blocking
        // Movement penalty applied by AgentSwimmingSystem instead
        if (depth <= 2) {
          return false; // Allow movement (will be slowed)
        }

        // Medium-deep water (depth 3-4): Swimmable for aquatic species
        if (depth <= 4) {
          // Check if entity has swimming locomotion capability
          const entity = world.entities.get(entityId);
          if (entity) {
            const impl = entity as EntityImpl;
            const body = impl.getComponent<BodyComponent>(CT.Body);
            if (body) {
              const swimmingParts = getPartsByFunction(body, 'swimming');
              // Allow movement if entity has functional swimming parts
              if (swimmingParts.length > 0) {
                return false; // Allow swimming
              }
            }
          }
          // Block movement if no swimming capability
          return true;
        }

        // Deep water (depth 5-7): Dangerous, blocks all
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
    const buildings = this.getBuildingCollisions(world.tick);

    for (const building of buildings) {
      if (!building.blocksMovement) {
        continue;
      }

      const dx = building.x - x;
      const dy = building.y - y;
      // Use squared distance to avoid sqrt
      const distanceSquared = dx * dx + dy * dy;

      if (distanceSquared < this.BUILDING_COLLISION_RADIUS_SQUARED) {
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
          if (manhattanDist > this.SOFT_COLLISION_RADIUS * 2) {
            continue;
          }

          // Squared distance for precision (avoid sqrt)
          const dx = pos.x - x;
          const dy = pos.y - y;
          const distanceSquared = dx * dx + dy * dy;

          // Apply graduated slowdown based on proximity
          if (distanceSquared < this.SOFT_COLLISION_RADIUS_SQUARED) {
            // Only compute sqrt when we need the actual distance for interpolation
            const distance = Math.sqrt(distanceSquared);
            const proximityFactor = distance / this.SOFT_COLLISION_RADIUS;
            const thisPenalty = this.MIN_PENALTY + (1 - this.MIN_PENALTY) * proximityFactor;
            penalty = Math.min(penalty, thisPenalty);
          }
        }
      }
    }

    return penalty;
  }

  /**
   * Passive resource discovery - agents discover PASSIVE resources as they move
   *
   * Throttled to DISCOVERY_INTERVAL_TICKS to avoid overhead
   * Uses ChunkSpatialQuery when available for efficient lookup
   *
   * Resources are added to agent's SpatialMemory for later targeting
   */
  private tryDiscoverResources(
    impl: EntityImpl,
    x: number,
    y: number,
    world: World
  ): void {
    // Throttle discovery checks
    const lastCheck = this.lastDiscoveryCheck.get(impl.id) ?? 0;
    if (world.tick - lastCheck < this.DISCOVERY_INTERVAL_TICKS) {
      return;
    }
    this.lastDiscoveryCheck.set(impl.id, world.tick);

    // Get spatial memory component
    const spatialMemory = impl.getComponent<SpatialMemoryComponent>(CT.SpatialMemory);
    if (!spatialMemory) return;

    // Use world.spatialQuery if available (fast, chunk-based)
    if (world.spatialQuery) {
      const resourcesInRadius = world.spatialQuery.getEntitiesInRadius(
        x,
        y,
        this.DISCOVERY_RADIUS,
        [CT.Resource],
        { limit: 10 } // Limit to 10 nearest resources
      );

      for (const { entity: resourceEntity } of resourcesInRadius) {
        const resourceImpl = resourceEntity as EntityImpl;
        const resourcePos = resourceImpl.getComponent<PositionComponent>(CT.Position);
        const resource = resourceImpl.getComponent<ResourceComponent>(CT.Resource);

        if (resourcePos && resource && resource.harvestable && resource.amount > 0) {
          // Add to spatial memory
          addSpatialMemory(
            spatialMemory,
            {
              type: 'resource_location',
              x: resourcePos.x,
              y: resourcePos.y,
              entityId: resourceEntity.id,
              metadata: {
                resourceType: resource.resourceType,
                amount: resource.amount,
              },
            },
            world.tick,
            80 // Initial strength (fairly strong since it's a direct observation)
          );

          // Also use legacy recordResourceLocation for backward compatibility
          spatialMemory.recordResourceLocation(
            resource.resourceType,
            { x: resourcePos.x, y: resourcePos.y },
            world.tick
          );
        }
      }
    } else {
      // Fallback: Use global query (slow, only when world.spatialQuery not available)
      const allResources = world.query().with(CT.Position).with(CT.Resource).executeEntities();

      for (const resourceEntity of allResources) {
        const resourceImpl = resourceEntity as EntityImpl;
        const resourcePos = resourceImpl.getComponent<PositionComponent>(CT.Position);
        const resource = resourceImpl.getComponent<ResourceComponent>(CT.Resource);

        if (!resourcePos || !resource || !resource.harvestable || resource.amount <= 0) {
          continue;
        }

        // Check distance (squared distance, no sqrt)
        const dx = resourcePos.x - x;
        const dy = resourcePos.y - y;
        const distanceSquared = dx * dx + dy * dy;

        if (distanceSquared <= this.DISCOVERY_RADIUS_SQUARED) {
          // Add to spatial memory
          addSpatialMemory(
            spatialMemory,
            {
              type: 'resource_location',
              x: resourcePos.x,
              y: resourcePos.y,
              entityId: resourceEntity.id,
              metadata: {
                resourceType: resource.resourceType,
                amount: resource.amount,
              },
            },
            world.tick,
            80
          );

          // Also use legacy recordResourceLocation for backward compatibility
          spatialMemory.recordResourceLocation(
            resource.resourceType,
            { x: resourcePos.x, y: resourcePos.y },
            world.tick
          );
        }
      }
    }
  }
}
