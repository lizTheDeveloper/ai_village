/**
 * MidwiferyBlueprints - Building blueprints for maternal care facilities
 *
 * Maternal Health Infrastructure
 * Creates blueprints for buildings that support pregnancy, labor, and infant care.
 * These buildings provide bonuses to birth outcomes and midwife effectiveness.
 *
 * Per CLAUDE.md: No silent fallbacks - all required fields must be provided.
 */

import type { BuildingBlueprint } from './BuildingBlueprintRegistry.js';
import type { BuildingBlueprintRegistry } from './BuildingBlueprintRegistry.js';

/**
 * Midwifery building blueprints (Maternal health infrastructure)
 * These buildings support pregnancy, labor, delivery, and infant care.
 */
export const MIDWIFERY_BLUEPRINTS: BuildingBlueprint[] = [
  {
    id: 'birthing-hut',
    name: 'Birthing Hut',
    description: 'A dedicated space for labor and delivery. Provides safety bonuses during birth, reduces complication severity, and offers privacy for mothers. Must be staffed by a midwife for full benefits.',
    category: 'community',
    width: 3,
    height: 3,
    resourceCost: [
      { resourceId: 'wood', amountRequired: 40 },
      { resourceId: 'cloth', amountRequired: 20 },
      { resourceId: 'straw', amountRequired: 30 },
    ],
    techRequired: [],
    terrainRequired: ['grass', 'dirt'],
    terrainForbidden: ['water', 'deep_water'],
    skillRequired: { skill: 'building', level: 2 },
    unlocked: true,
    buildTime: 180, // 3 hours
    tier: 1,
    functionality: [
      {
        type: 'healing',
        healingRate: 0.05,
        conditions: ['postpartum'],
      },
    ],
    canRotate: true,
    rotationAngles: [0, 90, 180, 270],
    snapToGrid: true,
    requiresFoundation: false,
  },
  {
    id: 'nursery',
    name: 'Nursery',
    description: 'A warm, safe space for infants and nursing mothers. Improves infant health, supports wet nursing, and provides a gathering place for new mothers. Requires Birthing Hut.',
    category: 'community',
    width: 4,
    height: 3,
    resourceCost: [
      { resourceId: 'wood', amountRequired: 60 },
      { resourceId: 'cloth', amountRequired: 40 },
      { resourceId: 'straw', amountRequired: 20 },
    ],
    techRequired: [],
    terrainRequired: ['grass', 'dirt'],
    terrainForbidden: ['water', 'deep_water'],
    skillRequired: { skill: 'building', level: 3 },
    unlocked: true,
    buildTime: 240, // 4 hours
    tier: 2,
    functionality: [
      {
        type: 'mood_aura',
        moodBonus: 5,
        radius: 5,
      },
    ],
    canRotate: true,
    rotationAngles: [0, 90, 180, 270],
    snapToGrid: true,
    requiresFoundation: false,
  },
  {
    id: 'maternity-clinic',
    name: 'Maternity Clinic',
    description: 'Advanced maternal care facility with prenatal checkup capabilities. Provides early detection of pregnancy complications and improves birth outcomes. Requires Health Clinic and Birthing Hut. Must be staffed by skilled midwife.',
    category: 'community',
    width: 4,
    height: 4,
    resourceCost: [
      { resourceId: 'wood', amountRequired: 100 },
      { resourceId: 'stone', amountRequired: 50 },
      { resourceId: 'cloth', amountRequired: 60 },
      { resourceId: 'iron', amountRequired: 10 },
    ],
    techRequired: [],
    terrainRequired: ['grass', 'dirt'],
    terrainForbidden: ['water', 'deep_water'],
    skillRequired: { skill: 'building', level: 4 },
    unlocked: true,
    buildTime: 480, // 8 hours
    tier: 3,
    functionality: [
      {
        type: 'healing',
        healingRate: 0.1,
        conditions: ['pregnancy', 'postpartum', 'infant'],
      },
    ],
    canRotate: true,
    rotationAngles: [0, 90, 180, 270],
    snapToGrid: true,
    requiresFoundation: false,
  },
];

/**
 * Register midwifery blueprints with the blueprint registry.
 * Called during initialization to make midwifery buildings available.
 *
 * @param registry - The BuildingBlueprintRegistry to register blueprints with
 * @throws Error if blueprint validation fails or if blueprint already exists
 */
export function registerMidwiferyBlueprints(registry: BuildingBlueprintRegistry): void {
  for (const blueprint of MIDWIFERY_BLUEPRINTS) {
    registry.register(blueprint);
  }
}
