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

  execute(entity: EntityImpl, world: World): BehaviorResult | void {
    const position = entity.getComponent<PositionComponent>(ComponentType.Position)!;
    const movement = entity.getComponent<MovementComponent>(ComponentType.Movement)!;
    const temperature = entity.getComponent(ComponentType.Temperature) as any;

    if (!temperature) {
      // No temperature component, switch to wandering
      this.switchTo(entity, 'wander', {});
      return { complete: true, reason: 'No temperature component' };
    }

    // Check if we're already cool enough
    if (temperature.state === 'comfortable' ||
        (temperature.state === 'hot' && temperature.currentTemp <= temperature.comfortMax + 1)) {
      this.switchTo(entity, 'wander', {});
      return { complete: true, reason: 'Already cool enough' };
    }

    // Find cooling sources (prioritize water > shade > interiors)
    const coolingSource = this.findBestCoolingSource(world, position);

    if (!coolingSource) {
      // No cooling source found - try to move away from heat sources
      this.fleeHeatSources(entity, world, position, movement);
      return; // Continue behavior
    }

    // Check if we're already in the cooling zone
    const inCoolingRange = this.isInCoolingRange(coolingSource, position);

    if (inCoolingRange) {
      // Stay in the cool area
      this.stopMovement(entity);
    } else {
      // Move towards the cooling source
      const dx = coolingSource.position.x - position.x;
      const dy = coolingSource.position.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const velocityX = (dx / distance) * movement.speed;
      const velocityY = (dy / distance) * movement.speed;

      entity.updateComponent<MovementComponent>(ComponentType.Movement, (current) => ({
        ...current,
        velocityX,
        velocityY,
      }));
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

    // Check buildings for shade
    const buildings = world.query().with(ComponentType.Building).with(ComponentType.Position).executeEntities();

    for (const building of buildings) {
      const buildingImpl = building as EntityImpl;
      const buildingComp = buildingImpl.getComponent<BuildingComponent>(ComponentType.Building);
      const buildingPos = buildingImpl.getComponent<PositionComponent>(ComponentType.Position);

      if (!buildingComp || !buildingPos || !buildingComp.isComplete) continue;

      const distance = this.distance(position, buildingPos);

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

      // Check if plant provides shade (e.g., tall trees)
      if (plantComp.providesShade && plantComp.shadeRadius > 0) {
        const distance = this.distance(position, plantPos);

        sources.push({
          type: 'shade',
          position: { x: plantPos.x, y: plantPos.y },
          distance,
          entity: plant,
        });
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
    const buildings = world.query().with(ComponentType.Building).with(ComponentType.Position).executeEntities();
    let totalAvoidanceX = 0;
    let totalAvoidanceY = 0;
    let heatSourceCount = 0;

    for (const building of buildings) {
      const buildingImpl = building as EntityImpl;
      const buildingComp = buildingImpl.getComponent<BuildingComponent>(ComponentType.Building);
      const buildingPos = buildingImpl.getComponent<PositionComponent>(ComponentType.Position);

      if (!buildingComp || !buildingPos || !buildingComp.providesHeat) continue;

      const distance = this.distance(position, buildingPos);

      // If within heat radius, move away
      if (distance <= buildingComp.heatRadius) {
        const dx = position.x - buildingPos.x;
        const dy = position.y - buildingPos.y;

        // Weight by inverse distance (closer = stronger push away)
        const weight = 1 - (distance / buildingComp.heatRadius);

        totalAvoidanceX += dx * weight;
        totalAvoidanceY += dy * weight;
        heatSourceCount++;
      }
    }

    if (heatSourceCount > 0) {
      // Normalize and apply movement
      const magnitude = Math.sqrt(totalAvoidanceX * totalAvoidanceX + totalAvoidanceY * totalAvoidanceY);

      if (magnitude > 0) {
        const velocityX = (totalAvoidanceX / magnitude) * movement.speed;
        const velocityY = (totalAvoidanceY / magnitude) * movement.speed;

        entity.updateComponent<MovementComponent>(ComponentType.Movement, (current) => ({
          ...current,
          velocityX,
          velocityY,
        }));
      }
    } else {
      // No heat sources nearby, just wander
      this.switchTo(entity, 'wander', {});
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
