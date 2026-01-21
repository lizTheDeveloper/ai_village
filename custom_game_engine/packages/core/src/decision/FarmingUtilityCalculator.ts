/**
 * FarmingUtilityCalculator - Context-aware utility calculations for farming decisions
 *
 * Analyzes game state and calculates utility weights for farming actions:
 * - Till: Should we prepare more soil?
 * - Plant: Should we plant seeds?
 * - Water: Should we water plants?
 * - Harvest: Should we harvest mature plants?
 *
 * Factors considered:
 * - Agent inventory (seeds, capacity)
 * - Nearby tilled soil availability
 * - Plant conditions (hydration, maturity)
 * - Season/weather (future)
 */

import type { EntityImpl } from '../ecs/Entity.js';
import type { World } from '../ecs/World.js';
import type { InventoryComponent } from '../components/InventoryComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { PlantComponent } from '../components/PlantComponent.js';
import { ComponentType } from '../types/ComponentType.js';

/**
 * Farming utility scores for each possible action
 */
export interface FarmingUtilities {
  till: number;      // 0-1, utility of tilling new soil
  plant: number;     // 0-1, utility of planting seeds
  water: number;     // 0-1, utility of watering plants
  harvest: number;   // 0-1, utility of harvesting mature plants
  gather_seeds: number; // 0-1, utility of gathering seeds from plants
}

/**
 * Information about seeds in inventory
 */
export interface SeedInventory {
  itemId: string;      // e.g., "seed:wheat"
  speciesId: string;   // e.g., "wheat"
  quantity: number;
}

/**
 * Context about the farming situation
 */
export interface FarmingContext {
  // Inventory state
  hasSeed: boolean;
  seedCount: number;
  seedInventory: SeedInventory[]; // Detailed breakdown of which seeds agent has
  inventoryFull: boolean;
  inventoryUsage: number; // 0-1, how full is inventory

  // Nearby tiles
  tilledTileCount: number;
  untilledGrassCount: number;
  plantableTileCount: number; // Tilled with plantability > 0 and no plant

  // Nearby plants
  plantCount: number;
  dryPlantCount: number; // Plants with hydration < 50
  criticallyDryCount: number; // Plants with hydration < 20
  harvestableCount: number;
  seedableCount: number; // Plants with seeds to gather
}

/**
 * Calculate farming context for an agent
 */
export function calculateFarmingContext(
  entity: EntityImpl,
  world: World
): FarmingContext {
  const position = entity.getComponent<PositionComponent>(ComponentType.Position);
  const inventory = entity.getComponent<InventoryComponent>(ComponentType.Inventory);

  // Default context if missing components
  if (!position) {
    return {
      hasSeed: false,
      seedCount: 0,
      seedInventory: [],
      inventoryFull: true,
      inventoryUsage: 1,
      tilledTileCount: 0,
      untilledGrassCount: 0,
      plantableTileCount: 0,
      plantCount: 0,
      dryPlantCount: 0,
      criticallyDryCount: 0,
      harvestableCount: 0,
      seedableCount: 0,
    };
  }

  // Calculate inventory state with detailed seed breakdown
  let seedCount = 0;
  let usedSlots = 0;
  const seedInventory: SeedInventory[] = [];

  if (inventory?.slots) {
    for (const slot of inventory.slots) {
      if (slot.itemId && slot.quantity > 0) {
        usedSlots++;
        if (slot.itemId.startsWith('seed:') || slot.itemId.includes('_seed')) {
          seedCount += slot.quantity;

          // Extract species ID
          let speciesId = slot.itemId;
          if (slot.itemId.startsWith('seed:')) {
            speciesId = slot.itemId.slice(5);
          } else if (slot.itemId.endsWith('_seed')) {
            speciesId = slot.itemId.slice(0, -5);
          }

          // Check if we already have this seed type
          const existing = seedInventory.find(s => s.itemId === slot.itemId);
          if (existing) {
            existing.quantity += slot.quantity;
          } else {
            seedInventory.push({
              itemId: slot.itemId,
              speciesId,
              quantity: slot.quantity,
            });
          }
        }
      }
    }
  }
  const inventoryFull = inventory ? usedSlots >= inventory.slots.length : true;
  const inventoryUsage = inventory ? usedSlots / inventory.slots.length : 1;

  // Calculate tile context
  let tilledTileCount = 0;
  let untilledGrassCount = 0;
  let plantableTileCount = 0;

  const SEARCH_RADIUS = 10;

  if (world.getTileAt) {
    for (let dx = -SEARCH_RADIUS; dx <= SEARCH_RADIUS; dx++) {
      for (let dy = -SEARCH_RADIUS; dy <= SEARCH_RADIUS; dy++) {
        const checkX = Math.floor(position.x) + dx;
        const checkY = Math.floor(position.y) + dy;

        const tile = world.getTileAt(checkX, checkY);
        if (!tile) continue;

        if (tile.tilled) {
          tilledTileCount++;
          if (tile.plantability > 0) {
            // Check if there's already a plant here
            const hasPlant = hasPlantAt(world, checkX, checkY);
            if (!hasPlant) {
              plantableTileCount++;
            }
          }
        } else if (tile.terrain === 'grass' || tile.terrain === 'dirt') {
          untilledGrassCount++;
        }
      }
    }
  }

  // Calculate plant context
  let plantCount = 0;
  let dryPlantCount = 0;
  let criticallyDryCount = 0;
  let harvestableCount = 0;
  let seedableCount = 0;

  const plants = world.query().with(ComponentType.Plant).with(ComponentType.Position).executeEntities();
  const PLANT_SEARCH_RADIUS = 15;
  const HARVESTABLE_STAGES = ['mature', 'seeding', 'fruiting'];

  for (const plantEntity of plants) {
    const plantImpl = plantEntity as EntityImpl;
    const plant = plantImpl.getComponent<PlantComponent>(ComponentType.Plant);
    const plantPos = plantImpl.getComponent<PositionComponent>(ComponentType.Position);

    if (!plant || !plantPos) continue;

    // Check distance
    const dx = plantPos.x - position.x;
    const dy = plantPos.y - position.y;
    const distanceSquared = dx * dx + dy * dy;
    if (distanceSquared > PLANT_SEARCH_RADIUS * PLANT_SEARCH_RADIUS) continue;

    // Skip dead plants
    if (plant.stage === 'dead' || plant.stage === 'decay') continue;

    plantCount++;

    // Check hydration (use public getter, not private _hydration)
    const hydration = plant.hydration;
    if (hydration < 50) {
      dryPlantCount++;
      if (hydration < 20) {
        criticallyDryCount++;
      }
    }

    // Check harvestable
    if (HARVESTABLE_STAGES.includes(plant.stage)) {
      if (plant.fruitCount > 0 || plant.seedsProduced > 0) {
        harvestableCount++;
      }
    }

    // Check seedable
    if (['mature', 'seeding', 'senescence'].includes(plant.stage)) {
      if (plant.seedsProduced > 0) {
        seedableCount++;
      }
    }
  }

  return {
    hasSeed: seedCount > 0,
    seedCount,
    seedInventory,
    inventoryFull,
    inventoryUsage,
    tilledTileCount,
    untilledGrassCount,
    plantableTileCount,
    plantCount,
    dryPlantCount,
    criticallyDryCount,
    harvestableCount,
    seedableCount,
  };
}

/**
 * Check if there's a plant at a specific tile
 */
function hasPlantAt(world: World, x: number, y: number): boolean {
  const plants = world.query().with(ComponentType.Plant).with(ComponentType.Position).executeEntities();
  for (const plantEntity of plants) {
    const plantImpl = plantEntity as EntityImpl;
    const plantPos = plantImpl.getComponent<PositionComponent>(ComponentType.Position);
    if (plantPos && Math.floor(plantPos.x) === x && Math.floor(plantPos.y) === y) {
      return true;
    }
  }
  return false;
}

/**
 * Calculate farming utilities based on context
 *
 * Returns normalized utility scores (0-1) for each farming action.
 * Higher scores indicate higher priority.
 */
export function calculateFarmingUtilities(context: FarmingContext): FarmingUtilities {
  const utilities: FarmingUtilities = {
    till: 0,
    plant: 0,
    water: 0,
    harvest: 0,
    gather_seeds: 0,
  };

  // === TILL UTILITY ===
  // Till if:
  // - We have seeds but no plantable soil
  // - We have very few plantable tiles
  if (context.hasSeed && context.plantableTileCount === 0 && context.untilledGrassCount > 0) {
    utilities.till = 0.9; // High priority - have seeds but nowhere to plant
  } else if (context.hasSeed && context.plantableTileCount < 3 && context.untilledGrassCount > 0) {
    utilities.till = 0.5; // Medium priority - running low on space
  } else if (context.plantableTileCount === 0 && context.untilledGrassCount > 0) {
    utilities.till = 0.3; // Low priority - just maintaining some tilled area
  }

  // === PLANT UTILITY ===
  // Plant if:
  // - We have seeds AND plantable tiles
  if (context.hasSeed && context.plantableTileCount > 0) {
    // Scale with how many seeds we have and how much space is available
    const seedFactor = Math.min(1, context.seedCount / 5);
    const spaceFactor = Math.min(1, context.plantableTileCount / 3);
    utilities.plant = 0.8 * seedFactor * spaceFactor;

    // Bonus if we have lots of seeds and space
    if (context.seedCount >= 10 && context.plantableTileCount >= 5) {
      utilities.plant = 0.95;
    }
  }

  // === WATER UTILITY ===
  // Water if:
  // - Plants are dry, especially if critically dry
  if (context.criticallyDryCount > 0) {
    utilities.water = 0.95; // Critical priority
  } else if (context.dryPlantCount > 0) {
    // Scale with number of dry plants
    utilities.water = Math.min(0.8, 0.3 + (context.dryPlantCount * 0.15));
  }

  // === HARVEST UTILITY ===
  // Harvest if:
  // - Plants are ready AND inventory not full
  if (context.harvestableCount > 0 && !context.inventoryFull) {
    // Scale with number of harvestable plants
    const harvestFactor = Math.min(1, context.harvestableCount / 3);
    utilities.harvest = 0.7 * harvestFactor;

    // Lower priority if inventory is getting full
    if (context.inventoryUsage > 0.7) {
      utilities.harvest *= 0.5;
    }
  }

  // === GATHER SEEDS UTILITY ===
  // Gather seeds if:
  // - Low on seeds AND plants have seeds to gather AND inventory not full
  if (!context.hasSeed && context.seedableCount > 0 && !context.inventoryFull) {
    utilities.gather_seeds = 0.85; // High priority if we need seeds
  } else if (context.seedCount < 5 && context.seedableCount > 0 && !context.inventoryFull) {
    utilities.gather_seeds = 0.6; // Medium priority to stock up
  }

  // === PRIORITY BALANCING ===
  // Ensure critically dry plants always get attention
  if (context.criticallyDryCount > 0) {
    // Water is already 0.95, but ensure it beats other actions
    utilities.till = Math.min(utilities.till, 0.3);
    utilities.plant = Math.min(utilities.plant, 0.3);
    utilities.harvest = Math.min(utilities.harvest, 0.4);
  }

  return utilities;
}

/**
 * Get the highest utility farming action
 */
export function getBestFarmingAction(
  utilities: FarmingUtilities
): { action: keyof FarmingUtilities; utility: number } | null {
  let best: { action: keyof FarmingUtilities; utility: number } | null = null;

  for (const [action, utility] of Object.entries(utilities) as [keyof FarmingUtilities, number][]) {
    if (utility > 0 && (!best || utility > best.utility)) {
      best = { action, utility };
    }
  }

  return best;
}

/**
 * Should the agent engage in farming at all?
 *
 * Returns true if any farming action has meaningful utility.
 */
export function shouldFarm(utilities: FarmingUtilities): boolean {
  return (
    utilities.till > 0.3 ||
    utilities.plant > 0.3 ||
    utilities.water > 0.3 ||
    utilities.harvest > 0.3 ||
    utilities.gather_seeds > 0.3
  );
}

/**
 * Choose which seed to plant based on inventory and priorities.
 *
 * Selection strategy:
 * 1. Food crops (wheat, carrot, potato, tomato, corn) - highest priority
 * 2. Trees that provide resources (apple, berry_bush) - medium priority
 * 3. Other seeds - lowest priority
 *
 * Within each category, prefer seeds with more quantity (plant what we have most of).
 */
export function chooseSeedToPlant(seedInventory: SeedInventory[]): SeedInventory | null {
  if (seedInventory.length === 0) {
    return null;
  }

  // Priority categories (lower number = higher priority)
  const FOOD_CROPS = ['wheat', 'carrot', 'potato', 'tomato', 'corn', 'pumpkin'];
  const FRUIT_PLANTS = ['apple', 'berry_bush', 'blueberry-bush', 'raspberry-bush', 'blackberry-bush'];
  const DECORATIVE = ['sunflower', 'grass', 'wildflower'];

  function getPriority(speciesId: string): number {
    if (FOOD_CROPS.includes(speciesId)) return 1;
    if (FRUIT_PLANTS.includes(speciesId)) return 2;
    if (DECORATIVE.includes(speciesId)) return 4;
    return 3; // Default priority for unknown crops
  }

  // Sort by priority, then by quantity (plant what we have most of)
  const sorted = [...seedInventory].sort((a, b) => {
    const priorityDiff = getPriority(a.speciesId) - getPriority(b.speciesId);
    if (priorityDiff !== 0) return priorityDiff;
    return b.quantity - a.quantity; // More quantity = higher priority
  });

  return sorted[0] || null;
}

/**
 * Get a summary of seed inventory for logging/display
 */
export function getSeedInventorySummary(seedInventory: SeedInventory[]): string {
  if (seedInventory.length === 0) {
    return 'No seeds';
  }

  return seedInventory
    .map(s => `${s.quantity}x ${s.speciesId}`)
    .join(', ');
}
