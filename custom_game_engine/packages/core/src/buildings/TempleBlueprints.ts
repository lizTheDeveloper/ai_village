/**
 * TempleBlueprints - Building blueprints for religious/sacred buildings
 *
 * Religious Infrastructure & Faith Systems
 * Creates blueprints for temples and sacred sites that generate belief,
 * facilitate prayer, and serve as gathering places for worshippers.
 *
 * Per CLAUDE.md: No silent fallbacks - all required fields must be provided.
 */

import type { BuildingBlueprint } from './BuildingBlueprintRegistry.js';

/**
 * Temple/Religious building blueprints
 * These buildings serve as sacred sites for deities and believers.
 */
export const TEMPLE_BLUEPRINTS: BuildingBlueprint[] = [
  {
    id: 'shrine',
    name: 'Shrine',
    description: 'Small sacred site. Believers can pray here. Generates modest belief for deities. Marks the start of organized faith',
    category: 'religious',
    width: 2,
    height: 2,
    resourceCost: [
      { resourceId: 'wood', amountRequired: 20 },
      { resourceId: 'stone', amountRequired: 10 },
    ],
    techRequired: [],
    terrainRequired: ['grass', 'dirt'],
    terrainForbidden: ['water', 'deep_water'],
    skillRequired: { skill: 'building', level: 1 },
    unlocked: true,
    buildTime: 120, // 2 hours at 1 second = 1 minute game time
    tier: 1,
    functionality: [
      {
        type: 'prayer_site',
        beliefMultiplier: 1.2, // 20% bonus belief generation when praying here
        prayerCapacity: 3, // Max 3 people can pray simultaneously
      },
    ],
    canRotate: true,
    rotationAngles: [0, 90, 180, 270],
    snapToGrid: true,
    requiresFoundation: false,
  },
  {
    id: 'temple',
    name: 'Temple',
    description: 'Formal place of worship. Significantly boosts belief generation. Can host rituals and ceremonies. Allows priest designation',
    category: 'religious',
    width: 4,
    height: 4,
    resourceCost: [
      { resourceId: 'wood', amountRequired: 100 },
      { resourceId: 'stone', amountRequired: 80 },
      { resourceId: 'cloth', amountRequired: 30 },
    ],
    techRequired: [],
    terrainRequired: ['grass', 'dirt'],
    terrainForbidden: ['water', 'deep_water'],
    skillRequired: { skill: 'building', level: 5 },
    unlocked: true,
    buildTime: 600, // 10 hours
    tier: 2,
    functionality: [
      {
        type: 'prayer_site',
        beliefMultiplier: 2.0, // 100% bonus belief generation
        prayerCapacity: 10, // Max 10 people can pray simultaneously
      },
      {
        type: 'ritual_site',
        ritualTypes: ['blessing', 'ceremony', 'sermon'],
      },
      {
        type: 'priest_quarters',
        priestCapacity: 2, // Can support 2 priests
      },
    ],
    canRotate: true,
    rotationAngles: [0, 90, 180, 270],
    snapToGrid: true,
    requiresFoundation: false,
  },
  {
    id: 'grand-temple',
    name: 'Grand Temple',
    description: 'Magnificent house of worship. Massive belief generation. Center of religious life. Allows multiple priests and grand ceremonies. Becomes a pilgrimage destination',
    category: 'religious',
    width: 6,
    height: 6,
    resourceCost: [
      { resourceId: 'wood', amountRequired: 200 },
      { resourceId: 'stone', amountRequired: 300 },
      { resourceId: 'cloth', amountRequired: 100 },
      { resourceId: 'iron', amountRequired: 50 },
    ],
    techRequired: [],
    terrainRequired: ['grass', 'dirt'],
    terrainForbidden: ['water', 'deep_water'],
    skillRequired: { skill: 'building', level: 5 },
    unlocked: true,
    buildTime: 1200, // 20 hours
    tier: 3,
    functionality: [
      {
        type: 'prayer_site',
        beliefMultiplier: 3.0, // 200% bonus belief generation
        prayerCapacity: 30, // Max 30 people can pray simultaneously
      },
      {
        type: 'ritual_site',
        ritualTypes: ['blessing', 'ceremony', 'sermon', 'mass', 'festival'],
      },
      {
        type: 'priest_quarters',
        priestCapacity: 5, // Can support 5 priests
      },
      {
        type: 'pilgrimage_site',
        attractionRadius: 100, // Attracts believers from far away
      },
    ],
    canRotate: true,
    rotationAngles: [0, 90, 180, 270],
    snapToGrid: true,
    requiresFoundation: false,
  },
  {
    id: 'meditation-garden',
    name: 'Meditation Garden',
    description: 'Peaceful outdoor sanctuary. Increases vision clarity and meditation effectiveness. Believers find peace and clarity here',
    category: 'religious',
    width: 3,
    height: 3,
    resourceCost: [
      { resourceId: 'wood', amountRequired: 40 },
      { resourceId: 'stone', amountRequired: 60 },
    ],
    techRequired: [],
    terrainRequired: ['grass'],
    terrainForbidden: ['water', 'deep_water', 'dirt'],
    skillRequired: { skill: 'building', level: 3 },
    unlocked: true,
    buildTime: 240, // 4 hours
    tier: 1,
    functionality: [
      {
        type: 'meditation_site',
        visionClarityBonus: 0.3, // 30% clearer visions
        meditationSpeedBonus: 1.5, // 50% faster meditation
      },
      {
        type: 'prayer_site',
        beliefMultiplier: 1.1, // 10% bonus belief
        prayerCapacity: 5,
      },
    ],
    canRotate: true,
    rotationAngles: [0, 90, 180, 270],
    snapToGrid: true,
    requiresFoundation: false,
  },
  {
    id: 'sacred-grove',
    name: 'Sacred Grove',
    description: 'Ancient trees dedicated to nature deities. Natural sacred site. Especially powerful for nature, harvest, and earth deities',
    category: 'religious',
    width: 5,
    height: 5,
    resourceCost: [
      { resourceId: 'wood', amountRequired: 10 }, // Minimal - mostly natural
      { resourceId: 'stone', amountRequired: 20 },
    ],
    techRequired: [],
    terrainRequired: ['grass', 'forest'],
    terrainForbidden: ['water', 'deep_water', 'dirt', 'stone'],
    skillRequired: { skill: 'building', level: 2 },
    unlocked: true,
    buildTime: 180, // 3 hours
    tier: 1,
    functionality: [
      {
        type: 'prayer_site',
        beliefMultiplier: 2.5, // 150% bonus for nature deities
        prayerCapacity: 8,
        domainBonus: ['nature', 'harvest', 'earth'], // Domains that get extra benefit
      },
      {
        type: 'ritual_site',
        ritualTypes: ['harvest_festival', 'nature_blessing'],
      },
    ],
    canRotate: true,
    rotationAngles: [0, 90, 180, 270],
    snapToGrid: false, // Natural site, doesn't snap to grid
    requiresFoundation: false,
  },
];

/**
 * Register temple blueprints with the building system
 */
export function registerTempleBlueprints(registry: any): void {
  for (const blueprint of TEMPLE_BLUEPRINTS) {
    registry.registerBlueprint(blueprint);
  }
}
