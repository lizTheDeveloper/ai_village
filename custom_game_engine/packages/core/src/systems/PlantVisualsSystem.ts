import type { World } from '../ecs/World.js';
import type { System } from '../ecs/System.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { PlantComponent, PlantStage } from '../components/PlantComponent.js';
import type { RenderableComponent } from '../components/RenderableComponent.js';
import { createRenderableComponent } from '../components/RenderableComponent.js';

/**
 * PlantVisualsSystem - Computes visual metadata for plants based on growth stage and genetics
 *
 * Ensures all plants have a renderable component with:
 * - spriteId based on plant species/category
 * - sizeMultiplier based on growth stage and genetics
 * - alpha based on plant stage (dying plants fade out)
 *
 * Priority: 300 (runs after PlantGrowthSystem at 200, before rendering)
 */
export class PlantVisualsSystem implements System {
  id = 'plant_visuals' as const;
  name = 'plant_visuals';
  priority = 300;
  // Only require 'plant' - we'll add 'renderable' if missing
  requiredComponents = ['plant'] as const;

  /**
   * Map plant species to sprite IDs
   * Species ID -> sprite ID (matching SpriteRenderer's MAP_OBJECT_SPRITES)
   */
  private static readonly SPECIES_SPRITE_MAP: Record<string, string> = {
    // Trees - each species gets its distinct sprite
    'tree': 'oak-tree',           // Generic tree → oak
    'oak_tree': 'oak-tree',
    'oak': 'oak-tree',
    'pine_tree': 'pine-tree',
    'pine': 'pine-tree',
    'birch_tree': 'birch-tree',
    'birch': 'birch-tree',
    'maple_tree': 'maple-tree',
    'maple': 'maple-tree',
    'willow_tree': 'willow-tree',
    'willow': 'willow-tree',
    'willow_bark': 'willow-tree', // Medicinal willow
    // Berry bushes - specific types
    'berry_bush': 'blueberry-bush', // Legacy fallback to blueberry
    'blueberry-bush': 'blueberry-bush',
    'raspberry-bush': 'raspberry-bush',
    'blackberry-bush': 'blackberry-bush',
    'blueberry': 'blueberry-bush',
    'raspberry': 'raspberry-bush',
    'blackberry': 'blackberry-bush',
    // Grains
    'wheat': 'wheat',
    'corn': 'corn',
    'barley': 'wheat',
    // Root crops
    'carrot': 'carrot',
    'potato': 'potato',
    'tomato': 'tomato',
    // Wild plants
    'grass': 'grass',
    'wildflower': 'wildflower',
    'rose': 'wildflower',
    'sunflower': 'wildflower',
    'daisy': 'wildflower',
    // Medicinal herbs
    'chamomile': 'chamomile',
    'lavender': 'lavender',
    'feverfew': 'feverfew',
    'valerian': 'valerian',
    // Magical plants (use pixellab folder names)
    'moonpetal': 'moonpetal',
    'whisperleaf': 'whisperleaf',
    'sunburst_flower': 'sunburst_flower',
    'frostbloom': 'frostbloom',
    'shadowcap': 'shadowcap',
    // Tropical plants (use pixellab folder names)
    'strangler_vine': 'strangler_vine',
    'serpent_liana': 'serpent_liana',
    'poison_orchid': 'poison_orchid',
    'dream_lotus': 'dream_lotus',
    'luminous_toadstool': 'luminous_toadstool',
    'fever_fungus': 'fever_fungus',
    // Wetland plants (use pixellab folder names)
    'drowning_pitcher': 'drowning_pitcher',
    'snap_maw': 'snap_maw',
    'marsh_mallow': 'marsh_mallow',
    'fever_bulrush': 'fever_bulrush',
    'will_o_wisp_bloom': 'will_o_wisp_bloom',
    'memory_reed': 'memory_reed',
    // Fungi fallback
    'mushroom': 'mushroom',
  };

  /**
   * Map plant categories to default sprite IDs
   */
  private static readonly CATEGORY_SPRITE_MAP: Record<string, string> = {
    'tree': 'oak-tree',
    'shrub': 'blueberry-bush',
    'crop': 'wheat',
    'grain': 'corn',
    'flower': 'wildflower',
    'herb': 'chamomile',
    'magical_herb': 'moonpetal',
    'magical': 'moonpetal',
    'grass': 'grass',
    'weed': 'grass',
    'vine': 'strangler-vine',
    'fern': 'whisperleaf',
    'fungus': 'mushroom',
    'moss': 'grass',
    'lichen': 'grass',
    'aquatic': 'dream-lotus',
    'succulent': 'wildflower',
    'cactus': 'wildflower',
    'carnivorous': 'drowning-pitcher',
    'reed': 'fever-bulrush',
    'tropical': 'poison-orchid',
    'wetland': 'marsh-mallow',
  };

  /**
   * Get sprite ID for a plant based on its species and category
   */
  private getSpriteIdForPlant(plant: PlantComponent): string {
    // First, try species ID mapping
    const speciesSprite = PlantVisualsSystem.SPECIES_SPRITE_MAP[plant.speciesId];
    if (speciesSprite) {
      return speciesSprite;
    }

    // Try to match by category if we have it stored
    // The category would typically come from the species definition
    // For now, infer from species ID patterns
    const speciesLower = plant.speciesId.toLowerCase();

    // Trees - check for specific species first
    if (speciesLower.includes('oak')) {
      return 'oak-tree';
    }
    if (speciesLower.includes('pine')) {
      return 'pine-tree';
    }
    if (speciesLower.includes('birch')) {
      return 'birch-tree';
    }
    if (speciesLower.includes('maple')) {
      return 'maple-tree';
    }
    if (speciesLower.includes('willow')) {
      return 'willow-tree';
    }
    // Generic tree fallback
    if (speciesLower.includes('tree')) {
      return 'oak-tree';
    }
    // Berry bushes - check specific types first
    if (speciesLower.includes('blueberry')) {
      return 'blueberry-bush';
    }
    if (speciesLower.includes('raspberry')) {
      return 'raspberry-bush';
    }
    if (speciesLower.includes('blackberry')) {
      return 'blackberry-bush';
    }
    // Generic berry/bush/shrub fallback
    if (speciesLower.includes('berry') || speciesLower.includes('bush') ||
        speciesLower.includes('shrub')) {
      return 'blueberry-bush';
    }
    if (speciesLower.includes('corn')) {
      return 'corn';
    }
    if (speciesLower.includes('wheat') || speciesLower.includes('grain') ||
        speciesLower.includes('barley')) {
      return 'wheat';
    }
    if (speciesLower.includes('carrot')) {
      return 'carrot';
    }
    if (speciesLower.includes('potato')) {
      return 'potato';
    }
    if (speciesLower.includes('tomato')) {
      return 'tomato';
    }
    if (speciesLower.includes('grass') || speciesLower.includes('reed')) {
      return 'grass';
    }
    if (speciesLower.includes('chamomile')) {
      return 'chamomile';
    }
    if (speciesLower.includes('lavender')) {
      return 'lavender';
    }
    if (speciesLower.includes('mushroom') || speciesLower.includes('fungus') ||
        speciesLower.includes('toadstool')) {
      return 'mushroom';
    }
    if (speciesLower.includes('flower') || speciesLower.includes('rose') ||
        speciesLower.includes('daisy') || speciesLower.includes('tulip')) {
      return 'wildflower';
    }

    // Default fallback based on genetics height (trees are tall)
    if (plant.genetics?.matureHeight && plant.genetics.matureHeight >= 3) {
      return 'oak-tree';
    }

    // Final fallback
    return 'wildflower';
  }

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
    // Query ALL entities with plant component (including those without renderable)
    const plantEntities = world
      .query()
      .with('plant')
      .executeEntities();

    for (const entity of plantEntities) {
      const plant = entity.getComponent('plant') as PlantComponent;

      if (!plant) {
        continue;
      }

      // Get or create renderable component
      let renderable = entity.getComponent('renderable') as RenderableComponent | undefined;

      if (!renderable) {
        // Create renderable component with sprite based on plant species
        const spriteId = this.getSpriteIdForPlant(plant);
        renderable = createRenderableComponent(spriteId, 'object', true);
        // Add the component to the entity
        (entity as EntityImpl).addComponent(renderable);
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
