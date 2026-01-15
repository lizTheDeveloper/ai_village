/**
 * SeekCoolingBehavior - Find cooling when hot
 *
 * Agent moves toward cooling sources when overheating:
 * - Water tiles (prioritize shallow water that can be waded into)
 * - Shaded buildings
 * - Cool building interiors
 * - Away from heat sources as last resort
 *
 * Handles:
 * - Finding water tiles and checking depth
 * - Finding shade buildings
 * - Moving toward cooling sources
 * - Fleeing heat sources when no cooling available
 * - Staying in cool areas to lower temperature
 *
 * Complement to SeekWarmthBehavior
 */

import type { Entity, EntityImpl } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import type { MovementComponent } from '../../components/MovementComponent.js';
import type { PositionComponent } from '../../components/PositionComponent.js';
import type { BuildingComponent } from '../../components/BuildingComponent.js';
import { BaseBehavior, type BehaviorResult } from './BaseBehavior.js';
import { ComponentType } from '../../types/ComponentType.js';

// Chunk spatial query injection for efficient nearby entity lookups
let chunkSpatialQuery: any | null = null;

export function injectChunkSpatialQueryToSeekCooling(spatialQuery: any): void {
  chunkSpatialQuery = spatialQuery;
  console.log('[SeekCoolingBehavior] ChunkSpatialQuery injected for efficient cooling source lookups');
}

interface CoolingSource {
  type: 'water' | 'shade' | 'interior';
  position: { x: number; y: number };
  distance: number;
  entity?: Entity;
  waterDepth?: number;
}

/**
 * SeekCoolingBehavior - Find a cooling source to cool down
 */
export class SeekCoolingBehavior extends BaseBehavior {
  readonly name = 'seek_cooling' as const;
  private readonly SEARCH_RADIUS = 50; // tiles
  private readonly WATER_COOLING_RANGE = 3; // tiles near water that are cooler
  private readonly SHALLOW_WATER_MAX_DEPTH = 2; // depth 1-2 can be waded into

  // Performance: Cache search results and throttle expensive searches
  private readonly SEARCH_INTERVAL = 100; // Re-search every 5 seconds (100 ticks at 20 TPS)

  execute(entity: EntityImpl, world: World): BehaviorResult | void {
    const position = entity.getComponent<PositionComponent>(ComponentType.Position)!;
    const movement = entity.getComponent<MovementComponent>(ComponentType.Movement)!;
    const temperature = entity.getComponent(ComponentType.Temperature) as any;

    if (!temperature) {
      // No temperature component
      this.complete(entity);
      return { complete: true, reason: 'No temperature component' };
    }

    // Disable steering so we can control velocity directly
    this.disableSteering(entity);

    // Only complete when actually comfortable - keep fleeing while hot
    if (temperature.state === 'comfortable') {
      this.stopAllMovement(entity);
      this.complete(entity);
      return { complete: true, reason: 'Already cool enough' };
    }

    // Performance: Throttle expensive cooling source searches
    // Only search every SEARCH_INTERVAL ticks, otherwise use cached source
    const state = this.getState(entity);
    const lastSearchTick = (state.lastSearchTick as number) ?? 0;
    const cachedSource = state.cachedCoolingSource as CoolingSource | undefined;

    let coolingSource: CoolingSource | null;
    if (world.tick - lastSearchTick >= this.SEARCH_INTERVAL || !cachedSource) {
      // Time to search for new cooling source
      coolingSource = this.findBestCoolingSource(world, position);
      this.updateState(entity, {
        lastSearchTick: world.tick,
        cachedCoolingSource: coolingSource,
      });
    } else {
      // Use cached source
      coolingSource = cachedSource;
    }

    if (!coolingSource) {
      // No cooling source found - try to move away from heat sources
      this.fleeHeatSources(entity, world, position, movement);
      return; // Continue behavior
    }

    // Check if we're already in the cooling zone
    const inCoolingRange = this.isInCoolingRange(coolingSource, position);

    if (inCoolingRange && temperature.state === 'comfortable') {
      // Actually comfortable - stay in the cool area and complete
      this.stopAllMovement(entity);
      this.complete(entity);
      return { complete: true, reason: 'Cooled down in cooling range' };
    } else if (inCoolingRange) {
      // In "cooling range" but still hot - the shade isn't enough, flee heat sources
      this.fleeHeatSources(entity, world, position, movement);
    } else {
      // Move towards the cooling source
      const dx = coolingSource.position.x - position.x;
      const dy = coolingSource.position.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const velocityX = (dx / distance) * movement.speed;
      const velocityY = (dy / distance) * movement.speed;

      this.setVelocity(entity, velocityX, velocityY);
    }
  }

  private findBestCoolingSource(
    world: World,
    position: PositionComponent
  ): CoolingSource | null {
    const waterSources = this.findWaterSources(world, position);
    const shadeSources = this.findShadeSources(world, position);

    // Combine and sort by priority: shallow water > water edge > shade > interior
    const allSources = [...waterSources, ...shadeSources];

    if (allSources.length === 0) {
      return null;
    }

    // Sort by priority (water depth matters), then distance
    allSources.sort((a, b) => {
      // Prioritize shallow water you can wade into
      if (a.type === 'water' && a.waterDepth && a.waterDepth <= this.SHALLOW_WATER_MAX_DEPTH) {
        if (b.type !== 'water' || !b.waterDepth || b.waterDepth > this.SHALLOW_WATER_MAX_DEPTH) {
          return -1; // a wins
        }
      }
      if (b.type === 'water' && b.waterDepth && b.waterDepth <= this.SHALLOW_WATER_MAX_DEPTH) {
        return 1; // b wins
      }

      // Otherwise prioritize by distance
      return a.distance - b.distance;
    });

    return allSources[0] ?? null;
  }

  private findWaterSources(world: World, position: PositionComponent): CoolingSource[] {
    const sources: CoolingSource[] = [];
    const chunks = (world as any).chunkManager;

    if (!chunks) return sources;

    // Search in a radius around the agent
    const searchRadius = this.SEARCH_RADIUS;
    const minX = Math.floor((position.x - searchRadius) / 16);
    const maxX = Math.floor((position.x + searchRadius) / 16);
    const minY = Math.floor((position.y - searchRadius) / 16);
    const maxY = Math.floor((position.y + searchRadius) / 16);

    for (let chunkX = minX; chunkX <= maxX; chunkX++) {
      for (let chunkY = minY; chunkY <= maxY; chunkY++) {
        const chunk = chunks.getChunk(chunkX, chunkY);
        if (!chunk) continue;

        // Check tiles in this chunk
        for (let tileX = 0; tileX < 16; tileX++) {
          for (let tileY = 0; tileY < 16; tileY++) {
            const tile = chunk.getTile(tileX, tileY);
            const worldX = chunkX * 16 + tileX;
            const worldY = chunkY * 16 + tileY;

            // Check if tile is water or has fluid
            const isWater = tile.terrain === 'water' || (tile.fluid && tile.fluid.type === 'water');

            if (isWater) {
              const distance = this.distance(position, { x: worldX, y: worldY });

              if (distance <= searchRadius) {
                const waterDepth = tile.fluid?.depth ?? 7; // Default to deep if terrain is water

                sources.push({
                  type: 'water',
                  position: { x: worldX, y: worldY },
                  distance,
                  waterDepth,
                });
              }
            }
          }
        }
      }
    }

    return sources;
  }

  private findShadeSources(world: World, position: PositionComponent): CoolingSource[] {
    const sources: CoolingSource[] = [];

    if (chunkSpatialQuery) {
      // Use ChunkSpatialQuery for efficient nearby lookups
      const buildingsInRadius = chunkSpatialQuery.getEntitiesInRadius(
        position.x,
        position.y,
        this.SEARCH_RADIUS,
        [ComponentType.Building]
      );

      for (const { entity: building, distance } of buildingsInRadius) {
        const buildingImpl = building as EntityImpl;
        const buildingComp = buildingImpl.getComponent<BuildingComponent>(ComponentType.Building);
        const buildingPos = buildingImpl.getComponent<PositionComponent>(ComponentType.Position);

        if (!buildingComp || !buildingPos || !buildingComp.isComplete) continue;

        // Check if building provides shade
        if (buildingComp.providesShade) {
          sources.push({
            type: 'shade',
            position: { x: buildingPos.x, y: buildingPos.y },
            distance,
            entity: building,
          });
        }

        // Check if building has cool interior
        if (buildingComp.interior && buildingComp.baseTemperature < 0) {
          sources.push({
            type: 'interior',
            position: { x: buildingPos.x, y: buildingPos.y },
            distance,
            entity: building,
          });
        }
      }

      // Check plants (trees) for shade using ChunkSpatialQuery
      const plantsInRadius = chunkSpatialQuery.getEntitiesInRadius(
        position.x,
        position.y,
        this.SEARCH_RADIUS,
        [ComponentType.Plant]
      );

      for (const { entity: plant, distance } of plantsInRadius) {
        const plantImpl = plant as EntityImpl;
        const plantComp = plantImpl.getComponent(ComponentType.Plant) as any;
        const plantPos = plantImpl.getComponent<PositionComponent>(ComponentType.Position);

        if (!plantComp || !plantPos) continue;

        // Check if plant provides shade (e.g., tall trees)
        if (plantComp.providesShade && plantComp.shadeRadius > 0) {
          sources.push({
            type: 'shade',
            position: { x: plantPos.x, y: plantPos.y },
            distance,
            entity: plant,
          });
        }
      }
    } else {
      // Fallback to global queries
      const buildings = world.query().with(ComponentType.Building).with(ComponentType.Position).executeEntities();

      for (const building of buildings) {
        const buildingImpl = building as EntityImpl;
        const buildingComp = buildingImpl.getComponent<BuildingComponent>(ComponentType.Building);
        const buildingPos = buildingImpl.getComponent<PositionComponent>(ComponentType.Position);

        if (!buildingComp || !buildingPos || !buildingComp.isComplete) continue;

        const distance = this.distance(position, buildingPos);

        // Only consider buildings within search radius
        if (distance > this.SEARCH_RADIUS) continue;

        // Check if building provides shade
        if (buildingComp.providesShade) {
          sources.push({
            type: 'shade',
            position: { x: buildingPos.x, y: buildingPos.y },
            distance,
            entity: building,
          });
        }

        // Check if building has cool interior
        if (buildingComp.interior && buildingComp.baseTemperature < 0) {
          sources.push({
            type: 'interior',
            position: { x: buildingPos.x, y: buildingPos.y },
            distance,
            entity: building,
          });
        }
      }

      // Check plants (trees) for shade
      const plants = world.query().with(ComponentType.Plant).with(ComponentType.Position).executeEntities();

      for (const plant of plants) {
        const plantImpl = plant as EntityImpl;
        const plantComp = plantImpl.getComponent(ComponentType.Plant) as any;
        const plantPos = plantImpl.getComponent<PositionComponent>(ComponentType.Position);

        if (!plantComp || !plantPos) continue;

        const distance = this.distance(position, plantPos);

        // Only consider plants within search radius
        if (distance > this.SEARCH_RADIUS) continue;

        // Check if plant provides shade (e.g., tall trees)
        if (plantComp.providesShade && plantComp.shadeRadius > 0) {
          sources.push({
            type: 'shade',
            position: { x: plantPos.x, y: plantPos.y },
            distance,
            entity: plant,
          });
        }
      }
    }

    return sources;
  }

  private isInCoolingRange(source: CoolingSource, _position: PositionComponent): boolean {
    if (source.type === 'water') {
      // Near water or in shallow water
      return source.distance <= this.WATER_COOLING_RANGE;
    }

    if (source.type === 'shade' && source.entity) {
      const entityImpl = source.entity as EntityImpl;

      // Check if it's a building with shade
      const buildingComp = entityImpl.getComponent<BuildingComponent>(ComponentType.Building);
      if (buildingComp) {
        return !!(buildingComp && source.distance <= buildingComp.shadeRadius);
      }

      // Check if it's a plant (tree) with shade
      const plantComp = entityImpl.getComponent(ComponentType.Plant) as any;
      if (plantComp && plantComp.providesShade) {
        return !!(plantComp.shadeRadius && source.distance <= plantComp.shadeRadius);
      }

      return false;
    }

    if (source.type === 'interior' && source.entity) {
      const buildingImpl = source.entity as EntityImpl;
      const buildingComp = buildingImpl.getComponent<BuildingComponent>(ComponentType.Building);
      return !!(buildingComp && source.distance <= buildingComp.interiorRadius);
    }

    return false;
  }

  private fleeHeatSources(
    entity: EntityImpl,
    world: World,
    position: PositionComponent,
    movement: MovementComponent
  ): void {
    // Find nearby heat sources and move away from them
    const HEAT_DETECTION_RADIUS = 30; // Limit search for performance
    let totalAvoidanceX = 0;
    let totalAvoidanceY = 0;
    let heatSourceCount = 0;
    let heatSourceCenterX = 0;
    let heatSourceCenterY = 0;

    if (chunkSpatialQuery) {
      // Use ChunkSpatialQuery for efficient nearby lookups
      const buildingsInRadius = chunkSpatialQuery.getEntitiesInRadius(
        position.x,
        position.y,
        HEAT_DETECTION_RADIUS,
        [ComponentType.Building]
      );

      for (const { entity: building, distance } of buildingsInRadius) {
        const buildingImpl = building as EntityImpl;
        const buildingComp = buildingImpl.getComponent<BuildingComponent>(ComponentType.Building);
        const buildingPos = buildingImpl.getComponent<PositionComponent>(ComponentType.Position);

        if (!buildingComp || !buildingPos || !buildingComp.providesHeat) continue;

        // If within heat radius (or very close regardless), move away
        // Use a minimum detection distance of 2 tiles even if heatRadius is smaller
        const effectiveRadius = Math.max(buildingComp.heatRadius, 2);
        if (distance <= effectiveRadius) {
          const dx = position.x - buildingPos.x;
          const dy = position.y - buildingPos.y;

          // Weight by inverse distance (closer = stronger push away)
          // Add 0.1 to avoid division issues when standing exactly on the source
          const weight = 1 - (distance / (effectiveRadius + 0.1));

          totalAvoidanceX += dx * weight;
          totalAvoidanceY += dy * weight;

          // Track center of mass of heat sources for fallback escape direction
          heatSourceCenterX += buildingPos.x;
          heatSourceCenterY += buildingPos.y;
          heatSourceCount++;
        }
      }
    } else {
      // Fallback to global query
      const buildings = world.query().with(ComponentType.Building).with(ComponentType.Position).executeEntities();

      for (const building of buildings) {
        const buildingImpl = building as EntityImpl;
        const buildingComp = buildingImpl.getComponent<BuildingComponent>(ComponentType.Building);
        const buildingPos = buildingImpl.getComponent<PositionComponent>(ComponentType.Position);

        if (!buildingComp || !buildingPos || !buildingComp.providesHeat) continue;

        const distance = this.distance(position, buildingPos);

        // Only consider buildings within detection radius for performance
        if (distance > HEAT_DETECTION_RADIUS) continue;

        // If within heat radius (or very close regardless), move away
        // Use a minimum detection distance of 2 tiles even if heatRadius is smaller
        const effectiveRadius = Math.max(buildingComp.heatRadius, 2);
        if (distance <= effectiveRadius) {
          const dx = position.x - buildingPos.x;
          const dy = position.y - buildingPos.y;

          // Weight by inverse distance (closer = stronger push away)
          // Add 0.1 to avoid division issues when standing exactly on the source
          const weight = 1 - (distance / (effectiveRadius + 0.1));

          totalAvoidanceX += dx * weight;
          totalAvoidanceY += dy * weight;

          // Track center of mass of heat sources for fallback escape direction
          heatSourceCenterX += buildingPos.x;
          heatSourceCenterY += buildingPos.y;
          heatSourceCount++;
        }
      }
    }

    // Minimum distance to travel before picking a new escape direction (in tiles)
    // Increased from 8 to 20 to prevent oscillation in large campfire clusters
    const MIN_ESCAPE_DISTANCE = 20;

    if (heatSourceCount > 0) {
      // Normalize and apply movement
      const magnitude = Math.sqrt(totalAvoidanceX * totalAvoidanceX + totalAvoidanceY * totalAvoidanceY);

      // Minimum magnitude threshold - if vectors mostly cancel out (e.g., equidistant from multiple fires),
      // use persistent escape direction to break symmetry and prevent twitching in place
      const MIN_MAGNITUDE_THRESHOLD = 0.5;

      if (magnitude >= MIN_MAGNITUDE_THRESHOLD) {
        // Clear direction - move that way and save it as escape direction
        const velocityX = (totalAvoidanceX / magnitude) * movement.speed;
        const velocityY = (totalAvoidanceY / magnitude) * movement.speed;
        this.setVelocity(entity, velocityX, velocityY);

        // Save escape direction and starting position for distance-based persistence
        this.updateState(entity, {
          escapeAngle: Math.atan2(velocityY, velocityX),
          escapeStartX: position.x,
          escapeStartY: position.y
        });
      } else {
        // Vectors cancelled out (equidistant from multiple heat sources)
        // Calculate center of mass of heat sources and flee in opposite direction
        // This prevents random wandering that could lead back into the heat cluster
        const state = this.getState(entity);
        let escapeAngle = state.escapeAngle as number | undefined;
        const escapeStartX = state.escapeStartX as number | undefined;
        const escapeStartY = state.escapeStartY as number | undefined;

        // Calculate distance traveled since escape started
        let distanceTraveled = 0;
        if (escapeStartX !== undefined && escapeStartY !== undefined) {
          distanceTraveled = this.distance(position, { x: escapeStartX, y: escapeStartY });
        }

        // Pick new direction if: no escape direction set, or traveled far enough
        if (escapeAngle === undefined || distanceTraveled >= MIN_ESCAPE_DISTANCE) {
          // Calculate center of mass of all heat sources
          const centerX = heatSourceCenterX / heatSourceCount;
          const centerY = heatSourceCenterY / heatSourceCount;

          // Escape direction is away from center of mass
          const dx = position.x - centerX;
          const dy = position.y - centerY;
          const distFromCenter = Math.sqrt(dx * dx + dy * dy);

          if (distFromCenter > 0.1) {
            // Clear direction away from center - use it
            escapeAngle = Math.atan2(dy, dx);
          } else {
            // Standing exactly at center (unlikely) - pick random direction
            escapeAngle = Math.random() * Math.PI * 2;
          }

          this.updateState(entity, {
            escapeAngle,
            escapeStartX: position.x,
            escapeStartY: position.y
          });
        }

        // Move in the escape direction
        this.setVelocity(entity,
          Math.cos(escapeAngle) * movement.speed,
          Math.sin(escapeAngle) * movement.speed
        );
      }
    } else {
      // No heat sources detected but still hot - just move in a random direction
      // This handles cases where heat comes from non-building sources
      const temperature = entity.getComponent(ComponentType.Temperature) as any;
      if (temperature && (temperature.state === 'dangerously_hot' || temperature.state === 'hot')) {
        // Use persistent escape direction here too
        const state = this.getState(entity);
        let escapeAngle = state.escapeAngle as number | undefined;
        const escapeStartX = state.escapeStartX as number | undefined;
        const escapeStartY = state.escapeStartY as number | undefined;

        // Calculate distance traveled since escape started
        let distanceTraveled = 0;
        if (escapeStartX !== undefined && escapeStartY !== undefined) {
          distanceTraveled = this.distance(position, { x: escapeStartX, y: escapeStartY });
        }

        if (escapeAngle === undefined || distanceTraveled >= MIN_ESCAPE_DISTANCE) {
          escapeAngle = Math.random() * Math.PI * 2;
          this.updateState(entity, {
            escapeAngle,
            escapeStartX: position.x,
            escapeStartY: position.y
          });
        }

        this.setVelocity(entity,
          Math.cos(escapeAngle) * movement.speed,
          Math.sin(escapeAngle) * movement.speed
        );
      } else {
        // Actually cooled down, stop moving
        this.stopAllMovement(entity);
      }
    }
  }
}

/**
 * Standalone function for use with BehaviorRegistry.
 */
export function seekCoolingBehavior(entity: EntityImpl, world: World): void {
  const behavior = new SeekCoolingBehavior();
  behavior.execute(entity, world);
}
