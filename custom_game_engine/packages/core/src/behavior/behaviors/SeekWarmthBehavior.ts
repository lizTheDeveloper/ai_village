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
import { BaseBehavior, type BehaviorResult } from './BaseBehavior.js';
import { ComponentType } from '../../types/ComponentType.js';

/**
 * SeekWarmthBehavior - Find a heat source to warm up
 */
export class SeekWarmthBehavior extends BaseBehavior {
  readonly name = 'seek_warmth' as const;

  execute(entity: EntityImpl, world: World): BehaviorResult | void {
    const position = entity.getComponent<PositionComponent>(ComponentType.Position)!;
    const movement = entity.getComponent<MovementComponent>(ComponentType.Movement)!;
    const temperature = entity.getComponent(ComponentType.Temperature) as any;

    if (!temperature) {
      // No temperature component, switch to wandering
      this.switchTo(entity, 'wander', {});
      return { complete: true, reason: 'No temperature component' };
    }

    // Check if we're already warm enough
    if (temperature.state === 'comfortable' ||
        (temperature.state === 'cold' && temperature.currentTemp >= temperature.comfortMin - 1)) {
      this.switchTo(entity, 'wander', {});
      return { complete: true, reason: 'Already warm enough' };
    }

    // Find heat sources (campfires and warm buildings)
    const heatSource = this.findNearestHeatSource(world, position);

    if (!heatSource) {
      // No heat source found, wander (maybe build a campfire?)
      this.switchTo(entity, 'wander', {});
      return { complete: true, reason: 'No heat source found' };
    }

    const heatSourceImpl = heatSource.entity as EntityImpl;
    const heatSourcePos = heatSourceImpl.getComponent<PositionComponent>(ComponentType.Position)!;
    const heatSourceComp = heatSourceImpl.getComponent<BuildingComponent>(ComponentType.Building)!;

    // Check if we're in heat range
    const inHeatRange = heatSourceComp.providesHeat && heatSource.distance <= heatSourceComp.heatRadius;
    const inWarmInterior = heatSourceComp.interior && heatSource.distance <= heatSourceComp.interiorRadius;

    if (inHeatRange || inWarmInterior) {
      // Stay near the heat source
      this.stopMovement(entity);
    } else {
      // Move towards the heat source
      const dx = heatSourcePos.x - position.x;
      const dy = heatSourcePos.y - position.y;
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
 * Standalone function for use with BehaviorRegistry.
 */
export function seekWarmthBehavior(entity: EntityImpl, world: World): void {
  const behavior = new SeekWarmthBehavior();
  behavior.execute(entity, world);
}
