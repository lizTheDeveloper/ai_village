import type { World } from '../ecs/World.js';
import type { System } from '../ecs/System.js';
import type { Entity } from '../ecs/Entity.js';
import type { PlantComponent, PlantStage } from '../components/PlantComponent.js';
import type { RenderableComponent } from '../components/RenderableComponent.js';

/**
 * PlantVisualsSystem - Computes visual metadata for plants based on growth stage and genetics
 *
 * Updates renderable.sizeMultiplier and renderable.alpha based on:
 * - Plant growth stage (seed=small, mature=full size, dead=shriveled)
 * - Plant genetics (matureHeight for size variation)
 * - Health state (dying plants fade out)
 *
 * Priority: 300 (runs after PlantGrowthSystem at 200, before rendering)
 */
export class PlantVisualsSystem implements System {
  id = 'plant_visuals' as const;
  name = 'plant_visuals';
  priority = 300;
  requiredComponents = ['plant', 'renderable'] as const;

  /**
   * Calculate size multiplier based on plant stage and genetics
   */
  private calculateSizeMultiplier(plant: PlantComponent): number {
    // Base size from growth stage
    const stageSizeMap: Record<PlantStage, number> = {
      seed: 0.2,
      germinating: 0.3,
      sprout: 0.5,
      vegetative: 0.75,
      flowering: 1.0,
      fruiting: 1.0,
      mature: 1.0,
      seeding: 1.0,
      senescence: 0.9,
      decay: 0.6,
      dead: 0.3,
    };

    let sizeMultiplier = stageSizeMap[plant.stage] ?? 1.0;

    // Apply genetics if present and plant is in mature stages
    if (
      plant.genetics?.matureHeight &&
      ['flowering', 'fruiting', 'mature', 'seeding'].includes(plant.stage)
    ) {
      // matureHeight is in voxels (tiles), acts as a direct multiplier
      // Normal plant = 1 tile = 1.0 multiplier
      // Tall tree = 4-12 tiles = 4.0-12.0 multiplier
      const geneticMultiplier = plant.genetics.matureHeight;
      sizeMultiplier *= geneticMultiplier;
    }

    // Clamp to reasonable bounds (0.1 to 10.0 as per spec)
    return Math.max(0.1, Math.min(10.0, sizeMultiplier));
  }

  /**
   * Calculate alpha (opacity) based on plant stage
   */
  private calculateAlpha(plant: PlantComponent): number {
    const stageAlphaMap: Record<PlantStage, number> = {
      seed: 1.0,
      germinating: 1.0,
      sprout: 1.0,
      vegetative: 1.0,
      flowering: 1.0,
      fruiting: 1.0,
      mature: 1.0,
      seeding: 0.9, // Slightly faded as seeds disperse
      senescence: 0.7, // Dying
      decay: 0.5, // Rotting
      dead: 0.3, // Ghost/remnant
    };

    return stageAlphaMap[plant.stage] ?? 1.0;
  }

  update(world: World, _entities: readonly Entity[], _deltaTime: number): void {
    // Query entities with plant and renderable components
    const plantEntities = world
      .query()
      .with('plant')
      .with('renderable')
      .executeEntities();

    for (const entity of plantEntities) {
      const plant = entity.getComponent('plant') as PlantComponent;
      const renderable = entity.getComponent('renderable') as RenderableComponent;

      if (!plant || !renderable) {
        continue;
      }

      const newSize = this.calculateSizeMultiplier(plant);
      const newAlpha = this.calculateAlpha(plant);

      // Only update if changed (avoid unnecessary mutations)
      if (renderable.sizeMultiplier !== newSize || renderable.alpha !== newAlpha) {
        renderable.sizeMultiplier = newSize;
        renderable.alpha = newAlpha;
      }
    }
  }
}
