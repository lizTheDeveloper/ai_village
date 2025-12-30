/**
 * FarmBlueprints - Building definitions for farming structures
 *
 * Implements Phase 9 farming buildings including:
 * - Scarecrow (pest deterrent)
 * - Sprinkler (irrigation)
 * - Compost Bin (fertilizer production)
 * - Beehive (pollination)
 * - Cold Frame (climate control)
 * - Seed Storage (specialized storage)
 * - Tool Shed (tool storage + maintenance)
 */

import type { BuildingBlueprint } from './BuildingBlueprintRegistry.js';

/**
 * Get all farming building blueprints
 */
export function getFarmBlueprints(): BuildingBlueprint[] {
  return [
    // Scarecrow - Deters birds and some pests
    {
      id: 'scarecrow',
      name: 'Scarecrow',
      description: 'A straw figure that deters birds and some pests from nearby crops',
      category: 'farming',
      width: 1,
      height: 1,
      resourceCost: [
        { resourceId: 'wood', amountRequired: 10 },
        { resourceId: 'plant_fiber', amountRequired: 15 },
        { resourceId: 'cloth', amountRequired: 5 }
      ],
      techRequired: [],
      terrainRequired: ['grass', 'dirt', 'tilled'],
      terrainForbidden: ['water', 'deep_water'],
      skillRequired: { skill: 'farming', level: 1 },
      unlocked: true,
      buildTime: 30,
      tier: 1,
      functionality: [
        {
          type: 'pest_deterrent',
          pestTypes: ['birds', 'rodents'],
          radius: 5,
          effectiveness: 0.7
        }
      ],
      canRotate: true,
      rotationAngles: [0, 90, 180, 270],
      snapToGrid: true,
      requiresFoundation: false
    },

    // Sprinkler - Waters nearby plants automatically
    {
      id: 'sprinkler',
      name: 'Sprinkler',
      description: 'An automated water system that keeps nearby crops hydrated',
      category: 'farming',
      width: 1,
      height: 1,
      resourceCost: [
        { resourceId: 'iron', amountRequired: 10 },
        { resourceId: 'wood', amountRequired: 5 }
      ],
      techRequired: ['agriculture_ii'],
      terrainRequired: ['grass', 'dirt', 'tilled'],
      terrainForbidden: ['water', 'deep_water'],
      skillRequired: { skill: 'farming', level: 2 },
      unlocked: false,
      buildTime: 45,
      tier: 2,
      functionality: [
        {
          type: 'irrigation',
          waterRate: 20, // Hydration points per day
          radius: 3
        }
      ],
      canRotate: false,
      rotationAngles: [0],
      snapToGrid: true,
      requiresFoundation: false
    },

    // Quality Sprinkler - Better range and water rate
    {
      id: 'quality_sprinkler',
      name: 'Quality Sprinkler',
      description: 'An improved sprinkler with extended range and better water distribution',
      category: 'farming',
      width: 1,
      height: 1,
      resourceCost: [
        { resourceId: 'iron', amountRequired: 15 },
        { resourceId: 'gold', amountRequired: 2 },
        { resourceId: 'wood', amountRequired: 5 }
      ],
      techRequired: ['agriculture_iii'],
      terrainRequired: ['grass', 'dirt', 'tilled'],
      terrainForbidden: ['water', 'deep_water'],
      skillRequired: { skill: 'farming', level: 3 },
      unlocked: false,
      buildTime: 60,
      tier: 3,
      functionality: [
        {
          type: 'irrigation',
          waterRate: 35,
          radius: 5
        }
      ],
      canRotate: false,
      rotationAngles: [0],
      snapToGrid: true,
      requiresFoundation: false
    },

    // Compost Bin - Produces fertilizer over time
    {
      id: 'compost_bin',
      name: 'Compost Bin',
      description: 'Converts organic waste into nutrient-rich fertilizer',
      category: 'farming',
      width: 1,
      height: 1,
      resourceCost: [
        { resourceId: 'wood', amountRequired: 20 }
      ],
      techRequired: [],
      terrainRequired: ['grass', 'dirt'],
      terrainForbidden: ['water', 'deep_water'],
      skillRequired: { skill: 'farming', level: 1 },
      unlocked: true,
      buildTime: 45,
      tier: 1,
      functionality: [
        {
          type: 'fertilizer_production',
          outputRate: 1, // Fertilizer units per day
          capacity: 10
        }
      ],
      canRotate: false,
      rotationAngles: [0],
      snapToGrid: true,
      requiresFoundation: false
    },

    // Large Compost Bin - Higher capacity and output
    {
      id: 'large_compost_bin',
      name: 'Large Compost Bin',
      description: 'A larger composting system with higher output and capacity',
      category: 'farming',
      width: 2,
      height: 1,
      resourceCost: [
        { resourceId: 'wood', amountRequired: 40 },
        { resourceId: 'stone', amountRequired: 10 }
      ],
      techRequired: ['agriculture_ii'],
      terrainRequired: ['grass', 'dirt'],
      terrainForbidden: ['water', 'deep_water'],
      skillRequired: { skill: 'farming', level: 2 },
      unlocked: false,
      buildTime: 75,
      tier: 2,
      functionality: [
        {
          type: 'fertilizer_production',
          outputRate: 3,
          capacity: 30
        }
      ],
      canRotate: true,
      rotationAngles: [0, 90],
      snapToGrid: true,
      requiresFoundation: false
    },

    // Beehive - Pollination bonus for nearby crops
    {
      id: 'beehive',
      name: 'Beehive',
      description: 'A home for bees that pollinate nearby crops, improving yield',
      category: 'farming',
      width: 1,
      height: 1,
      resourceCost: [
        { resourceId: 'wood', amountRequired: 15 },
        { resourceId: 'plant_fiber', amountRequired: 10 }
      ],
      techRequired: ['agriculture_i'],
      terrainRequired: ['grass'],
      terrainForbidden: ['water', 'deep_water', 'stone'],
      skillRequired: { skill: 'animal_handling', level: 1 },
      unlocked: false,
      buildTime: 60,
      tier: 2,
      functionality: [
        {
          type: 'pollination',
          radius: 4,
          yieldBonus: 0.15 // +15% yield for nearby flowering crops
        }
      ],
      canRotate: false,
      rotationAngles: [0],
      snapToGrid: true,
      requiresFoundation: false
    },

    // Apiary - Multiple beehives with honey production
    {
      id: 'apiary',
      name: 'Apiary',
      description: 'A managed bee colony that produces honey and greatly improves pollination',
      category: 'farming',
      width: 2,
      height: 2,
      resourceCost: [
        { resourceId: 'wood', amountRequired: 40 },
        { resourceId: 'plant_fiber', amountRequired: 20 },
        { resourceId: 'cloth', amountRequired: 10 }
      ],
      techRequired: ['agriculture_ii'],
      terrainRequired: ['grass'],
      terrainForbidden: ['water', 'deep_water', 'stone'],
      skillRequired: { skill: 'animal_handling', level: 2 },
      unlocked: false,
      buildTime: 120,
      tier: 3,
      functionality: [
        {
          type: 'pollination',
          radius: 8,
          yieldBonus: 0.25 // +25% yield
        },
        {
          type: 'crafting',
          recipes: ['honey', 'beeswax'],
          speed: 1.0
        }
      ],
      canRotate: true,
      rotationAngles: [0, 90, 180, 270],
      snapToGrid: true,
      requiresFoundation: false
    },

    // Cold Frame - Extends growing season
    {
      id: 'cold_frame',
      name: 'Cold Frame',
      description: 'A glass-covered bed that protects plants from frost and extends the growing season',
      category: 'farming',
      width: 2,
      height: 1,
      resourceCost: [
        { resourceId: 'wood', amountRequired: 15 },
        { resourceId: 'glass', amountRequired: 10 }
      ],
      techRequired: ['agriculture_ii'],
      terrainRequired: ['grass', 'dirt', 'tilled'],
      terrainForbidden: ['water', 'deep_water'],
      skillRequired: { skill: 'farming', level: 2 },
      unlocked: false,
      buildTime: 60,
      tier: 2,
      functionality: [
        {
          type: 'climate_control',
          temperatureModifier: 10, // +10 degrees
          radius: 0 // Only plants inside
        }
      ],
      canRotate: true,
      rotationAngles: [0, 90],
      snapToGrid: true,
      requiresFoundation: false
    },

    // Seed Vault - Specialized seed storage
    {
      id: 'seed_vault',
      name: 'Seed Vault',
      description: 'Climate-controlled storage that preserves seed viability for years',
      category: 'farming',
      width: 2,
      height: 2,
      resourceCost: [
        { resourceId: 'stone', amountRequired: 30 },
        { resourceId: 'wood', amountRequired: 20 },
        { resourceId: 'iron', amountRequired: 10 }
      ],
      techRequired: ['agriculture_ii'],
      terrainRequired: ['grass', 'dirt'],
      terrainForbidden: ['water', 'deep_water'],
      skillRequired: { skill: 'farming', level: 3 },
      unlocked: false,
      buildTime: 90,
      tier: 2,
      functionality: [
        {
          type: 'storage',
          itemTypes: ['seeds'],
          capacity: 200
        },
        {
          type: 'climate_control',
          temperatureModifier: -5, // Cool storage
          radius: 0
        }
      ],
      canRotate: true,
      rotationAngles: [0, 90, 180, 270],
      snapToGrid: true,
      requiresFoundation: true
    },

    // Tool Shed - Farming tool storage and repair
    {
      id: 'tool_shed',
      name: 'Tool Shed',
      description: 'A shed for storing and maintaining farming tools',
      category: 'farming',
      width: 2,
      height: 2,
      resourceCost: [
        { resourceId: 'wood', amountRequired: 35 }
      ],
      techRequired: [],
      terrainRequired: ['grass', 'dirt'],
      terrainForbidden: ['water', 'deep_water'],
      skillRequired: { skill: 'building', level: 1 },
      unlocked: true,
      buildTime: 60,
      tier: 1,
      functionality: [
        {
          type: 'storage',
          itemTypes: ['tools', 'farming_supplies'],
          capacity: 30
        },
        {
          type: 'crafting',
          recipes: ['repair_tools'],
          speed: 1.0
        }
      ],
      canRotate: true,
      rotationAngles: [0, 90, 180, 270],
      snapToGrid: true,
      requiresFoundation: false
    },

    // Pest Trap - Catches and controls pests
    {
      id: 'pest_trap',
      name: 'Pest Trap',
      description: 'A humane trap for catching destructive pests',
      category: 'farming',
      width: 1,
      height: 1,
      resourceCost: [
        { resourceId: 'wood', amountRequired: 10 },
        { resourceId: 'iron', amountRequired: 5 }
      ],
      techRequired: [],
      terrainRequired: ['grass', 'dirt', 'tilled'],
      terrainForbidden: ['water', 'deep_water'],
      skillRequired: { skill: 'farming', level: 1 },
      unlocked: true,
      buildTime: 20,
      tier: 1,
      functionality: [
        {
          type: 'pest_deterrent',
          pestTypes: ['rodents', 'slugs', 'beetles'],
          radius: 2,
          effectiveness: 0.5
        }
      ],
      canRotate: false,
      rotationAngles: [0],
      snapToGrid: true,
      requiresFoundation: false
    },

    // Disease Prevention Station
    {
      id: 'fumigation_station',
      name: 'Fumigation Station',
      description: 'A station for treating and preventing plant diseases',
      category: 'farming',
      width: 1,
      height: 1,
      resourceCost: [
        { resourceId: 'stone', amountRequired: 20 },
        { resourceId: 'iron', amountRequired: 10 }
      ],
      techRequired: ['agriculture_ii'],
      terrainRequired: ['grass', 'dirt'],
      terrainForbidden: ['water', 'deep_water'],
      skillRequired: { skill: 'farming', level: 2 },
      unlocked: false,
      buildTime: 75,
      tier: 2,
      functionality: [
        {
          type: 'disease_prevention',
          diseaseTypes: ['blight', 'powdery_mildew', 'rust'],
          radius: 4,
          effectiveness: 0.6
        }
      ],
      canRotate: false,
      rotationAngles: [0],
      snapToGrid: true,
      requiresFoundation: false
    },

    // Drying Rack - For preserving harvests
    {
      id: 'drying_rack',
      name: 'Drying Rack',
      description: 'A wooden rack for drying herbs, fruits, and other produce',
      category: 'farming',
      width: 2,
      height: 1,
      resourceCost: [
        { resourceId: 'wood', amountRequired: 20 }
      ],
      techRequired: [],
      terrainRequired: ['grass', 'dirt'],
      terrainForbidden: ['water', 'deep_water'],
      skillRequired: { skill: 'farming', level: 1 },
      unlocked: true,
      buildTime: 30,
      tier: 1,
      functionality: [
        {
          type: 'crafting',
          recipes: ['dried_herbs', 'dried_fruit', 'dried_meat'],
          speed: 0.5 // Slow natural drying
        }
      ],
      canRotate: true,
      rotationAngles: [0, 90],
      snapToGrid: true,
      requiresFoundation: false
    },

    // Root Cellar - Underground storage for produce
    {
      id: 'root_cellar',
      name: 'Root Cellar',
      description: 'An underground storage area that keeps produce fresh longer',
      category: 'farming',
      width: 2,
      height: 2,
      resourceCost: [
        { resourceId: 'stone', amountRequired: 40 },
        { resourceId: 'wood', amountRequired: 20 }
      ],
      techRequired: ['agriculture_i'],
      terrainRequired: ['grass', 'dirt'],
      terrainForbidden: ['water', 'deep_water', 'stone'],
      skillRequired: { skill: 'building', level: 2 },
      unlocked: false,
      buildTime: 120,
      tier: 2,
      functionality: [
        {
          type: 'storage',
          itemTypes: ['vegetables', 'fruit', 'root_crops'],
          capacity: 100
        },
        {
          type: 'climate_control',
          temperatureModifier: -8, // Cool underground
          radius: 0
        }
      ],
      canRotate: false,
      rotationAngles: [0],
      snapToGrid: true,
      requiresFoundation: true
    },

    // Trellis - Support for climbing plants
    {
      id: 'trellis',
      name: 'Trellis',
      description: 'A support structure for climbing plants like beans and grapes',
      category: 'farming',
      width: 1,
      height: 2,
      resourceCost: [
        { resourceId: 'wood', amountRequired: 15 }
      ],
      techRequired: [],
      terrainRequired: ['grass', 'dirt', 'tilled'],
      terrainForbidden: ['water', 'deep_water'],
      skillRequired: { skill: 'farming', level: 1 },
      unlocked: true,
      buildTime: 25,
      tier: 1,
      functionality: [
        {
          type: 'gathering_boost',
          resourceTypes: ['vine_crops', 'grapes', 'beans'],
          radius: 1
        }
      ],
      canRotate: true,
      rotationAngles: [0, 90],
      snapToGrid: true,
      requiresFoundation: false
    }
  ];
}

/**
 * Register all farm blueprints with a registry
 */
export function registerFarmBlueprints(registry: {
  register: (blueprint: BuildingBlueprint) => void;
}): void {
  for (const blueprint of getFarmBlueprints()) {
    registry.register(blueprint);
  }
}
