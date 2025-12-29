/**
 * ShopBlueprints - Building blueprints for shop/trade buildings
 *
 * Phase 12.4: Shop Buildings
 * Creates blueprints for various shop types that provide trading functionality.
 *
 * Per CLAUDE.md: No silent fallbacks - all required fields must be provided.
 */

import type { BuildingBlueprint } from './BuildingBlueprintRegistry.js';
import type { BuildingBlueprintRegistry } from './BuildingBlueprintRegistry.js';

/**
 * Shop building blueprints (Tier 2 commercial buildings)
 */
export const SHOP_BLUEPRINTS: BuildingBlueprint[] = [
  {
    id: 'general_store',
    name: 'General Store',
    description: 'A general store that buys and sells common goods and supplies',
    category: 'commercial',
    width: 3,
    height: 3,
    resourceCost: [
      { resourceId: 'wood', amountRequired: 30 },
      { resourceId: 'stone', amountRequired: 20 },
    ],
    techRequired: [],
    terrainRequired: ['grass', 'dirt'],
    terrainForbidden: ['water', 'deep_water'],
    skillRequired: { skill: 'building', level: 3 },
    unlocked: true,
    buildTime: 150,
    tier: 2,
    functionality: [
      {
        type: 'shop',
        shopType: 'general',
      },
    ],
    canRotate: true,
    rotationAngles: [0, 90, 180, 270],
    snapToGrid: true,
    requiresFoundation: false,
  },
  {
    id: 'blacksmith',
    name: 'Blacksmith Shop',
    description: 'A blacksmith shop specializing in metal tools, weapons, and armor',
    category: 'commercial',
    width: 3,
    height: 3,
    resourceCost: [
      { resourceId: 'wood', amountRequired: 25 },
      { resourceId: 'stone', amountRequired: 35 },
      { resourceId: 'iron', amountRequired: 15 },
    ],
    techRequired: [],
    terrainRequired: ['grass', 'dirt'],
    terrainForbidden: ['water', 'deep_water'],
    skillRequired: { skill: 'building', level: 4 },
    unlocked: true,
    buildTime: 180,
    tier: 2,
    functionality: [
      {
        type: 'shop',
        shopType: 'blacksmith',
      },
    ],
    canRotate: true,
    rotationAngles: [0, 90, 180, 270],
    snapToGrid: true,
    requiresFoundation: false,
  },
  {
    id: 'farm_supply_shop',
    name: 'Farm Supply Shop',
    description: 'A shop specializing in seeds, farming tools, and agricultural supplies',
    category: 'commercial',
    width: 2,
    height: 3,
    resourceCost: [
      { resourceId: 'wood', amountRequired: 35 },
      { resourceId: 'stone', amountRequired: 15 },
    ],
    techRequired: [],
    terrainRequired: ['grass', 'dirt'],
    terrainForbidden: ['water', 'deep_water'],
    skillRequired: { skill: 'building', level: 3 },
    unlocked: true,
    buildTime: 120,
    tier: 2,
    functionality: [
      {
        type: 'shop',
        shopType: 'farm_supply',
      },
    ],
    canRotate: true,
    rotationAngles: [0, 90, 180, 270],
    snapToGrid: true,
    requiresFoundation: false,
  },
  {
    id: 'tavern',
    name: 'Tavern',
    description: 'A cozy tavern selling food, drinks, and providing a place for social gatherings',
    category: 'commercial',
    width: 4,
    height: 3,
    resourceCost: [
      { resourceId: 'wood', amountRequired: 40 },
      { resourceId: 'stone', amountRequired: 25 },
    ],
    techRequired: [],
    terrainRequired: ['grass', 'dirt'],
    terrainForbidden: ['water', 'deep_water'],
    skillRequired: { skill: 'building', level: 4 },
    unlocked: true,
    buildTime: 200,
    tier: 2,
    functionality: [
      {
        type: 'shop',
        shopType: 'tavern',
      },
      {
        type: 'mood_aura',
        moodBonus: 10,
        radius: 5,
      },
    ],
    canRotate: true,
    rotationAngles: [0, 90, 180, 270],
    snapToGrid: true,
    requiresFoundation: false,
  },
];

/**
 * Register shop blueprints with the blueprint registry.
 * Called during initialization to make shop buildings available.
 *
 * @param registry - The BuildingBlueprintRegistry to register blueprints with
 * @throws Error if blueprint validation fails or if blueprint already exists
 */
export function registerShopBlueprints(registry: BuildingBlueprintRegistry): void {
  for (const blueprint of SHOP_BLUEPRINTS) {
    registry.register(blueprint);
  }
}
