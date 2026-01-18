/**
 * SeekWarmthBehavior - Find warmth when cold
 *
 * Agent moves toward heat sources (campfires, warm buildings) when cold.
 * Handles:
 * - Finding heat sources in range
 * - Moving toward heat sources
 * - Staying near heat to warm up
 *
 * Part of the AISystem decomposition (work-order: ai-system-refactor)
 */

import type { Entity, EntityImpl } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import type { MovementComponent } from '../../components/MovementComponent.js';
import type { PositionComponent } from '../../components/PositionComponent.js';
import type { BuildingComponent } from '../../components/BuildingComponent.js';
import type { TemperatureComponent } from '../../components/TemperatureComponent.js';
import { BaseBehavior, type BehaviorResult } from './BaseBehavior.js';
import { ComponentType, ComponentType as CT } from '../../types/ComponentType.js';
import type { BehaviorContext, BehaviorResult as ContextBehaviorResult } from '../BehaviorContext.js';

/**
 * SeekWarmthBehavior - Find a heat source to warm up
 */
export class SeekWarmthBehavior extends BaseBehavior {
  readonly name = 'seek_warmth' as const;

  // Performance: Cache search results and throttle expensive searches
  private readonly SEARCH_INTERVAL = 100; // Re-search every 5 seconds (100 ticks at 20 TPS)

  execute(entity: EntityImpl, world: World): BehaviorResult | void {
    const position = entity.getComponent<PositionComponent>(ComponentType.Position)!;
    const movement = entity.getComponent<MovementComponent>(ComponentType.Movement)!;
    const temperature = entity.getComponent<TemperatureComponent>(ComponentType.Temperature);

    if (!temperature) {
      // No temperature component
      this.complete(entity);
      return { complete: true, reason: 'No temperature component' };
    }

    // Disable steering so we can control velocity directly
    this.disableSteering(entity);

    // Check if we're already warm enough
    if (temperature.state === 'comfortable') {
      this.stopAllMovement(entity);
      this.complete(entity);
      return { complete: true, reason: 'Already warm enough' };
    }

    // Performance: Throttle expensive heat source searches
    // Only search every SEARCH_INTERVAL ticks, otherwise use cached source
    const state = this.getState(entity);
    const lastSearchTick = (state.lastSearchTick as number) ?? 0;
    const cachedSource = state.cachedHeatSource as { entity: Entity; distance: number } | undefined;

    let heatSource: { entity: Entity; distance: number } | null;
    if (world.tick - lastSearchTick >= this.SEARCH_INTERVAL || !cachedSource) {
      // Time to search for new heat source
      heatSource = this.findNearestHeatSource(world, position);
      this.updateState(entity, {
        lastSearchTick: world.tick,
        cachedHeatSource: heatSource,
      });
    } else {
      // Use cached source
      heatSource = cachedSource;
    }

    if (!heatSource) {
      // No heat source found (maybe build a campfire?)
      this.complete(entity);
      return { complete: true, reason: 'No heat source found' };
    }

    const heatSourceImpl = heatSource.entity as EntityImpl;

    // Validate cached entity is still valid (might be deleted/deserialized)
    if (!heatSourceImpl || typeof heatSourceImpl.getComponent !== 'function') {
      // Cached entity is invalid - invalidate cache and re-search next tick
      this.updateState(entity, {
        lastSearchTick: 0,
        cachedHeatSource: null,
      });
      return; // Continue behavior, will re-search next tick
    }

    const heatSourcePos = heatSourceImpl.getComponent<PositionComponent>(ComponentType.Position);
    const heatSourceComp = heatSourceImpl.getComponent<BuildingComponent>(ComponentType.Building);

    // Double-check components exist (entity might have lost components)
    if (!heatSourcePos || !heatSourceComp) {
      // Entity lost required components - invalidate cache
      this.updateState(entity, {
        lastSearchTick: 0,
        cachedHeatSource: null,
      });
      return; // Continue behavior, will re-search next tick
    }

    // Check if we're in heat range
    const inHeatRange = heatSourceComp.providesHeat && heatSource.distance <= heatSourceComp.heatRadius;
    const inWarmInterior = heatSourceComp.interior && heatSource.distance <= heatSourceComp.interiorRadius;

    if (inHeatRange || inWarmInterior) {
      // In heat range - stay and wait to warm up
      // Note: Temperature state will be updated by TemperatureSystem, and we'll complete on next tick
      this.stopAllMovement(entity);
    } else {
      // Move towards the heat source
      const dx = heatSourcePos.x - position.x;
      const dy = heatSourcePos.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const velocityX = (dx / distance) * movement.speed;
      const velocityY = (dy / distance) * movement.speed;

      this.setVelocity(entity, velocityX, velocityY);
    }
  }

  private findNearestHeatSource(
    world: World,
    position: PositionComponent
  ): { entity: Entity; distance: number } | null {
    const buildings = world.query().with(ComponentType.Building).with(ComponentType.Position).executeEntities();
    let bestHeatSource: Entity | null = null;
    let nearestDistance = Infinity;

    for (const building of buildings) {
      const buildingImpl = building as EntityImpl;
      const buildingComp = buildingImpl.getComponent<BuildingComponent>(ComponentType.Building);
      const buildingPos = buildingImpl.getComponent<PositionComponent>(ComponentType.Position);

      if (!buildingComp || !buildingPos || !buildingComp.isComplete) continue;

      // Check if building provides heat (campfire) or has warm interior
      const providesWarmth = buildingComp.providesHeat ||
                             (buildingComp.interior && buildingComp.baseTemperature > 0);

      if (providesWarmth) {
        const distance = this.distance(position, buildingPos);

        if (distance < nearestDistance) {
          nearestDistance = distance;
          bestHeatSource = building;
        }
      }
    }

    return bestHeatSource ? { entity: bestHeatSource, distance: nearestDistance } : null;
  }
}

/**
 * Standalone function for use with BehaviorRegistry (legacy).
 * @deprecated Use seekWarmthBehaviorWithContext for new code
 */
export function seekWarmthBehavior(entity: EntityImpl, world: World): void {
  const behavior = new SeekWarmthBehavior();
  behavior.execute(entity, world);
}

// ============================================================================
// Modern BehaviorContext Version
// ============================================================================

const SEARCH_INTERVAL = 100; // Re-search every 5 seconds (100 ticks at 20 TPS)

/**
 * Modern version using BehaviorContext.
 * @example registerBehaviorWithContext('seek_warmth', seekWarmthBehaviorWithContext);
 */
export function seekWarmthBehaviorWithContext(ctx: BehaviorContext): ContextBehaviorResult | void {
  const temperature = ctx.getComponent<TemperatureComponent>(CT.Temperature);

  if (!temperature) {
    return ctx.complete('No temperature component');
  }

  // Check if we're already warm enough
  if (temperature.state === 'comfortable') {
    ctx.stopMovement();
    return ctx.complete('Already warm enough');
  }

  // Performance: Throttle expensive heat source searches
  const lastSearchTick = ctx.getState<number>('lastSearchTick') ?? 0;
  const cachedSource = ctx.getState<{ entityId: string; distance: number }>('cachedHeatSource');

  let heatSource: { entity: Entity; distance: number } | null;
  if (ctx.tick - lastSearchTick >= SEARCH_INTERVAL || !cachedSource) {
    // Time to search for new heat source
    heatSource = findNearestHeatSource(ctx);
    ctx.updateState({
      lastSearchTick: ctx.tick,
      cachedHeatSource: heatSource ? { entityId: heatSource.entity.id, distance: heatSource.distance } : null,
    });
  } else if (cachedSource) {
    // Use cached source - re-fetch entity
    const cachedEntity = ctx.getEntity(cachedSource.entityId);
    if (cachedEntity) {
      heatSource = { entity: cachedEntity, distance: cachedSource.distance };
    } else {
      // Cached entity no longer exists
      heatSource = null;
      ctx.updateState({ lastSearchTick: 0, cachedHeatSource: null });
    }
  } else {
    heatSource = null;
  }

  if (!heatSource) {
    return ctx.complete('No heat source found');
  }

  const heatSourceImpl = heatSource.entity as EntityImpl;

  // Validate cached entity is still valid
  if (!heatSourceImpl || typeof heatSourceImpl.getComponent !== 'function') {
    ctx.updateState({ lastSearchTick: 0, cachedHeatSource: null });
    return; // Continue behavior, will re-search next tick
  }

  const heatSourcePos = heatSourceImpl.getComponent<PositionComponent>(CT.Position);
  const heatSourceComp = heatSourceImpl.getComponent<BuildingComponent>(CT.Building);

  if (!heatSourcePos || !heatSourceComp) {
    ctx.updateState({ lastSearchTick: 0, cachedHeatSource: null });
    return;
  }

  // Check if we're in heat range
  const inHeatRange = heatSourceComp.providesHeat && heatSource.distance <= heatSourceComp.heatRadius;
  const inWarmInterior = heatSourceComp.interior && heatSource.distance <= heatSourceComp.interiorRadius;

  if (inHeatRange || inWarmInterior) {
    // In heat range - stay and wait to warm up
    // Note: Temperature state will be updated by TemperatureSystem, and we'll complete on next tick
    ctx.stopMovement();
  } else {
    // Move towards the heat source
    ctx.moveToward(heatSourcePos);
  }
}

function findNearestHeatSource(ctx: BehaviorContext): { entity: Entity; distance: number } | null {
  const buildings = ctx.getEntitiesInRadius(200, [CT.Building]);
  let bestHeatSource: { entity: Entity; distance: number } | null = null;

  for (const { entity: building, distance } of buildings) {
    const buildingImpl = building as EntityImpl;
    const buildingComp = buildingImpl.getComponent<BuildingComponent>(CT.Building);

    if (!buildingComp || !buildingComp.isComplete) continue;

    // Check if building provides heat (campfire) or has warm interior
    const providesWarmth = buildingComp.providesHeat ||
                           (buildingComp.interior && buildingComp.baseTemperature > 0);

    if (providesWarmth) {
      if (!bestHeatSource || distance < bestHeatSource.distance) {
        bestHeatSource = { entity: building, distance };
      }
    }
  }

  return bestHeatSource;
}
